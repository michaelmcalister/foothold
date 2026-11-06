// Worker routes for sending routes to your crew (GET /api/crew, POST /api/routes/:id/share, GET and DELETE /api/routes/shared) and a day and time on a route (plannedAt).
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller } from './fakes.js'
import { LIMITS } from '../worker/db.js'

const DAY = 86400000
let env
const call = caller(() => env)
const A = 'device-aaaa-aaaa-aaaa-0001'
const B = 'device-bbbb-bbbb-bbbb-0002'
const C = 'device-cccc-cccc-cccc-0003'
const D = 'device-dddd-dddd-dddd-0004'
const ring = [[151.15, -33.9], [151.155, -33.9], [151.155, -33.896], [151.15, -33.896], [151.15, -33.9]]

beforeEach(() => { env = makeEnv() })

async function named(device, name) {
  return (await call(device, 'PUT', '/api/me', { name })).body.user
}
async function saveRoute(device, body = {}) {
  const r = await call(device, 'POST', '/api/routes', { name: 'Park loop', mode: 'run', ring, ...body })
  expect(r.status).toBe(200)
  return r.body.route
}
// A and B share a club; A and C share a league; D is a stranger
async function crewWorld() {
  const a = await named(A, 'Alex')
  const b = await named(B, 'Bea')
  const c = await named(C, 'Cam')
  const d = await named(D, 'Dee')
  const club = (await call(A, 'POST', '/api/clubs', { name: 'Marrickville Milers' })).body.club
  await call(B, 'POST', `/api/clubs/${club.id}/join`)
  const league = (await call(A, 'POST', '/api/leagues', { name: 'Sunday crew' })).body.league
  await call(C, 'POST', '/api/leagues/join', { code: league.code })
  return { a, b, c, d }
}

describe('a day and time on a route', () => {
  it('saves plannedAt, returns it, and keeps it when an update leaves it out', async () => {
    const at = Date.now() + 2 * DAY
    const r = await saveRoute(A, { plannedAt: at })
    expect(r.plannedAt).toBe(at)
    // An older app saving without plannedAt keeps the time
    const up = await call(A, 'POST', '/api/routes', { id: r.id, name: 'Park loop, longer', ring })
    expect(up.body.route).toMatchObject({ name: 'Park loop, longer', plannedAt: at })
    const cleared = await call(A, 'POST', '/api/routes', { id: r.id, name: 'Park loop', ring, plannedAt: null })
    expect(cleared.body.route.plannedAt).toBeNull()
    expect((await call(A, 'GET', '/api/routes')).body.routes[0].plannedAt).toBeNull()
  })

  it('starts with no time, and refuses one it cannot use', async () => {
    expect((await saveRoute(A)).plannedAt).toBeNull()
    expect((await call(A, 'POST', '/api/routes', { ring, plannedAt: 'Saturday' })).status).toBe(400)
    expect((await call(A, 'POST', '/api/routes', { ring, plannedAt: Date.now() + 5000 * DAY })).body.error).toMatch(/plannedAt/)
  })
})

describe('GET /api/crew', () => {
  it('lists people in your club and leagues, once each, without you or strangers', async () => {
    const { a, b, c } = await crewWorld()
    // B is also in the league: still listed once
    const code = (await call(A, 'GET', '/api/leagues')).body.leagues[0].code
    await call(B, 'POST', '/api/leagues/join', { code })
    const crew = (await call(A, 'GET', '/api/crew')).body.crew
    expect(crew).toEqual([
      { id: b.id, name: 'Bea', colour: b.colour, crest: null },
      { id: c.id, name: 'Cam', colour: c.colour, crest: null },
    ])
    expect(crew.some((x) => x.id === a.id)).toBe(false)
    // C only knows A (through the league), not B's club
    expect((await call(C, 'GET', '/api/crew')).body.crew.map((x) => x.name)).toEqual(['Alex', 'Bea'])
    expect((await call(D, 'GET', '/api/crew')).body.crew).toEqual([])
  })
})

describe('sending a route', () => {
  it('copies the route to each person and tells them, with the time when planned', async () => {
    const { a, b, c } = await crewWorld()
    const at = Date.UTC(2026, 10, 7, 20, 0) // 7 am Sunday 8 Nov in Sydney
    const r = await saveRoute(A, { name: 'Cooks River loop' })
    const res = await call(A, 'POST', `/api/routes/${r.id}/share`, { to: [b.id, c.id, b.id], plannedAt: at })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, sent: [b.id, c.id], plannedAt: at })

    const got = (await call(B, 'GET', '/api/routes/shared')).body.shared
    expect(got).toHaveLength(1)
    expect(got[0]).toMatchObject({
      route: { name: 'Cooks River loop', mode: 'run', ring, distanceM: r.distanceM },
      from: { id: a.id, name: 'Alex', colour: a.colour, crest: null },
      plannedAt: at,
    })
    expect(typeof got[0].id).toBe('string')
    expect(got[0].sharedAt).toBeGreaterThan(0)

    const notes = (await call(B, 'GET', '/api/notifications')).body.items.filter((n) => n.kind === 'route')
    expect(notes.map((n) => n.text)).toEqual(['Alex sent you a route: Cooks River loop for Sun 8 Nov, 7:00 am'])
    expect((await call(C, 'GET', '/api/notifications')).body.items.some((n) => n.kind === 'route')).toBe(true)
    // Nothing shared with the sender
    expect((await call(A, 'GET', '/api/routes/shared')).body.shared).toEqual([])
  })

  it('leaves the time out of the notice when there is none, and uses the route time when not sent', async () => {
    const { b, c } = await crewWorld()
    const r = await saveRoute(A, { name: 'Easy one' })
    await call(A, 'POST', `/api/routes/${r.id}/share`, { to: [b.id] })
    expect((await call(B, 'GET', '/api/notifications')).body.items.find((n) => n.kind === 'route').text).toBe('Alex sent you a route: Easy one')
    expect((await call(B, 'GET', '/api/routes/shared')).body.shared[0].plannedAt).toBeNull()

    const at = Date.now() + DAY
    const planned = await saveRoute(A, { name: 'Planned one', plannedAt: at })
    await call(A, 'POST', `/api/routes/${planned.id}/share`, { to: [c.id] })
    expect((await call(C, 'GET', '/api/routes/shared')).body.shared[0].plannedAt).toBe(at)
  })

  it('keeps the copy as it was when the sender edits or deletes the route', async () => {
    const { b } = await crewWorld()
    const r = await saveRoute(A, { name: 'Original' })
    await call(A, 'POST', `/api/routes/${r.id}/share`, { to: [b.id] })
    const other = [[151.2, -33.8], [151.21, -33.8]]
    await call(A, 'POST', '/api/routes', { id: r.id, name: 'Changed', ring: other })
    let got = (await call(B, 'GET', '/api/routes/shared')).body.shared[0]
    expect(got.route).toMatchObject({ name: 'Original', ring })
    await call(A, 'DELETE', `/api/routes/${r.id}`)
    got = (await call(B, 'GET', '/api/routes/shared')).body.shared[0]
    expect(got.route.name).toBe('Original')
  })

  it('replaces their copy when the same route is sent again, newest first overall', async () => {
    const { b } = await crewWorld()
    const r1 = await saveRoute(A, { name: 'First' })
    const r2 = await saveRoute(A, { name: 'Second' })
    await call(A, 'POST', `/api/routes/${r1.id}/share`, { to: [b.id] })
    await call(A, 'POST', `/api/routes/${r2.id}/share`, { to: [b.id] })
    env.DB.db.prepare('UPDATE route_shares SET created_at = created_at - 1000 WHERE name = ?').run('First')
    expect((await call(B, 'GET', '/api/routes/shared')).body.shared.map((s) => s.route.name)).toEqual(['Second', 'First'])
    await call(A, 'POST', `/api/routes/${r1.id}/share`, { to: [b.id], plannedAt: Date.now() + DAY })
    const list = (await call(B, 'GET', '/api/routes/shared')).body.shared
    expect(list.map((s) => s.route.name)).toEqual(['First', 'Second'])
    expect(list[0].plannedAt).not.toBeNull()
  })

  it('only sends your own route, to your crew, up to 20 at a time', async () => {
    const { b, d } = await crewWorld()
    const mine = await saveRoute(A)
    const theirs = await saveRoute(B)
    expect((await call(A, 'POST', `/api/routes/${theirs.id}/share`, { to: [b.id] })).status).toBe(404)
    expect((await call(A, 'POST', '/api/routes/nope/share', { to: [b.id] })).status).toBe(404)
    const stranger = await call(A, 'POST', `/api/routes/${mine.id}/share`, { to: [b.id, d.id] })
    expect(stranger.status).toBe(403)
    expect(stranger.body.code).toBe('not_crew')
    // Nothing went to anyone when one name was wrong
    expect((await call(B, 'GET', '/api/routes/shared')).body.shared).toEqual([])
    expect((await call(D, 'GET', '/api/routes/shared')).body.shared).toEqual([])
    const me = (await call(A, 'GET', '/api/me')).body.user
    expect((await call(A, 'POST', `/api/routes/${mine.id}/share`, { to: [me.id] })).status).toBe(403)
    expect((await call(A, 'POST', `/api/routes/${mine.id}/share`, { to: [] })).status).toBe(400)
    expect((await call(A, 'POST', `/api/routes/${mine.id}/share`, { to: 'everyone' })).status).toBe(400)
    const many = Array.from({ length: 21 }, (_, i) => `someone-${i}`)
    const tooMany = await call(A, 'POST', `/api/routes/${mine.id}/share`, { to: many })
    expect(tooMany.status).toBe(400)
    expect(tooMany.body.code).toBe('too_many_recipients')
    expect((await call(A, 'POST', `/api/routes/${mine.id}/share`, { to: [b.id], plannedAt: 'soon' })).status).toBe(400)
  })

  it('is rate limited', async () => {
    const { b } = await crewWorld()
    const r = await saveRoute(A)
    const max = LIMITS.routeShare.max
    // Fill the bucket directly so the write limit isn't what stops it
    const me = (await call(A, 'GET', '/api/me')).body.user
    const sec = LIMITS.routeShare.sec
    const now = Math.floor(Date.now() / 1000)
    env.DB.db.prepare('INSERT INTO rate_limits (bucket, key, win, count) VALUES (?, ?, ?, ?)').run('routeShare', me.id, now - (now % sec), max)
    const res = await call(A, 'POST', `/api/routes/${r.id}/share`, { to: [b.id] })
    expect(res.status).toBe(429)
    expect(res.body.code).toBe('rate_limited')
  })
})

describe('hiding a shared route', () => {
  it('hides it for the recipient only', async () => {
    const { b } = await crewWorld()
    const r = await saveRoute(A)
    await call(A, 'POST', `/api/routes/${r.id}/share`, { to: [b.id] })
    const [s] = (await call(B, 'GET', '/api/routes/shared')).body.shared
    expect((await call(A, 'DELETE', `/api/routes/shared/${s.id}`)).status).toBe(404)
    expect((await call(B, 'DELETE', `/api/routes/shared/${s.id}`)).body).toEqual({ ok: true })
    expect((await call(B, 'GET', '/api/routes/shared')).body.shared).toEqual([])
    expect((await call(B, 'DELETE', `/api/routes/shared/${s.id}`)).status).toBe(404)
  })
})

describe('export and delete', () => {
  it('exports shares sent and received, and deleting an account removes both', async () => {
    const { a, b } = await crewWorld()
    const ra = await saveRoute(A, { name: 'From Alex' })
    const rb = await saveRoute(B, { name: 'From Bea' })
    await call(A, 'POST', `/api/routes/${ra.id}/share`, { to: [b.id] })
    await call(B, 'POST', `/api/routes/${rb.id}/share`, { to: [a.id] })

    const ex = (await call(A, 'GET', '/api/me/export')).body
    expect(ex.route_shares_sent).toHaveLength(1)
    expect(ex.route_shares_sent[0]).toMatchObject({ from_user: a.id, to_user: b.id, name: 'From Alex', ring })
    expect(ex.route_shares_received).toHaveLength(1)
    expect(ex.route_shares_received[0]).toMatchObject({ from_user: b.id, to_user: a.id, name: 'From Bea' })

    expect((await call(A, 'DELETE', '/api/me')).body).toEqual({ ok: true })
    const left = env.DB.db.prepare('SELECT COUNT(*) AS n FROM route_shares WHERE from_user = ? OR to_user = ?').get(a.id, a.id)
    expect(left.n).toBe(0)
    // Bea no longer has Alex's copy
    expect((await call(B, 'GET', '/api/routes/shared')).body.shared).toEqual([])
  })
})
