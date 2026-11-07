// Worker routes for King of the hill: climbs found when an activity is saved (terrain heights faked), GET /api/hills and /api/hills/:id, the crown moving with a kind notification, activity results, privacy zones, export, and the crown passing on when a holder deletes a run or their account.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeEnv, caller, ORIGIN } from './fakes.js'
import { offset } from '../src/lib/engine/index.js'

let env
const call = caller(() => env)
const A = 'device-hill-aaaa-0001'
const B = 'device-hill-bbbb-0002'
const C = 'device-hill-cccc-0003'

// The ground: flat, then a steady 8% rise for 400 m going north, then flat
const BASE = 50
const heightAt = (lat) => {
  const north = (lat - ORIGIN.lat) * 110574
  return BASE + Math.max(0, Math.min(400, north - 300)) * 0.08
}
let lookups = 0
beforeEach(() => {
  env = makeEnv()
  lookups = 0
  vi.stubGlobal('fetch', async (url) => {
    const u = new URL(String(url))
    if (!u.hostname.endsWith('open-meteo.com')) throw new Error('unexpected fetch ' + u.hostname)
    lookups++
    const lats = u.searchParams.get('latitude').split(',').map(Number)
    return new Response(JSON.stringify({ elevation: lats.map(heightAt) }))
  })
})
afterEach(() => vi.unstubAllGlobals())

// Up the hill and back down again, `kmh` the whole way, one point a second
function hillRun({ kmh = 11, t0 = Date.now() - 2 * 3600000, east = 0 } = {}) {
  const mps = kmh / 3.6
  const pts = []
  let t = t0
  const leg = (from, to) => {
    const n = Math.round(Math.abs(to - from) / mps)
    for (let k = 0; k < n; k++) { pts.push({ ...offset(ORIGIN, east, from + ((to - from) * k) / n), t }); t += 1000 }
  }
  leg(0, 1000)
  leg(1000, 0)
  pts.push({ ...offset(ORIGIN, east, 0), t })
  return pts
}
async function named(device, name) {
  return (await call(device, 'PUT', '/api/me', { name })).body.user
}
async function run(device, opts = {}, mode = 'run') {
  const r = await call(device, 'POST', '/api/activities', { mode, points: hillRun(opts) })
  expect(r.status).toBe(200)
  return r.body.activity
}
const box = () => {
  const sw = offset(ORIGIN, -500, -500)
  const ne = offset(ORIGIN, 500, 1500)
  return [sw.lng, sw.lat, ne.lng, ne.lat].map((n) => n.toFixed(5)).join(',')
}
const hillsHere = async (device, mode = 'run') => (await call(device, 'GET', `/api/hills?mode=${mode}&bbox=${box()}`)).body.hills

describe('hills from saved activities', () => {
  it('finds the climb, makes a hill and gives the crown to the first person up it', async () => {
    const a = await named(A, 'Alex')
    const act = await run(A)
    expect(lookups).toBeGreaterThan(0)
    const hills = await hillsHere(A)
    expect(hills).toHaveLength(1)
    const h = hills[0]
    expect(h).toMatchObject({ mode: 'run', name: expect.stringMatching(/^The 3\d m climb$/), holder: { userId: a.id, name: 'Alex', colour: a.colour, me: true } })
    expect(h.gainM).toBeGreaterThanOrEqual(28)
    expect(h.lengthM).toBeGreaterThan(330)
    expect(h.grade).toBeGreaterThan(0.06)
    expect(h.line.length).toBeGreaterThanOrEqual(2)
    expect(h.top).toEqual(h.end)
    // The activity knows its hills
    const got = (await call(A, 'GET', `/api/activities/${act.id}`)).body
    expect(got.hills).toEqual([{ id: h.id, name: h.name, seconds: expect.any(Number), rank: 1, tookCrown: true, holds: true }])
    expect(got.hills[0].seconds).toBeGreaterThan(110)
    expect(got.hills[0].seconds).toBeLessThan(175) // terrain heights soften the ends a little
    // Other modes have their own hills
    expect(await hillsHere(A, 'ride')).toEqual([])
  })

  it('moves the crown to a faster time, tells the old holder kindly and ranks the board', async () => {
    await named(A, 'Alex')
    const b = await named(B, 'Bea')
    await named(C, 'Cam')
    await run(A, { kmh: 10 })
    const fast = await run(B, { kmh: 13 })
    await run(C, { kmh: 9 })
    const [h] = await hillsHere(C)
    expect(h.holder).toMatchObject({ userId: b.id, name: 'Bea', me: false })

    const notes = (await call(A, 'GET', '/api/notifications')).body.items.filter((n) => n.kind === 'hill')
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toMatch(new RegExp(`^Bea took the hill on the 3\\d m climb\\. Your time to beat: \\d:\\d\\d\\. Fancy another go\\?$`))
    expect(notes[0].text).not.toMatch(/[\u2013\u2014]|--/)
    // Bea took it from nobody else, Cam took nothing: no notes for them
    expect((await call(B, 'GET', '/api/notifications')).body.items.filter((n) => n.kind === 'hill')).toEqual([])

    const page = (await call(C, 'GET', `/api/hills/${h.id}`)).body
    expect(page.board.map((r) => [r.rank, r.name])).toEqual([[1, 'Bea'], [2, 'Alex'], [3, 'Cam']])
    expect(page.board[0].seconds).toBeLessThan(page.board[1].seconds)
    expect(page.mine).toMatchObject({ rank: 3 })
    expect(page.hill.people).toBe(3)
    expect(page.hill.profile.length).toBeGreaterThan(3)
    expect((await call(B, 'GET', `/api/activities/${fast.id}`)).body.hills[0]).toMatchObject({ rank: 1, tookCrown: true, holds: true })
    expect((await call(B, 'GET', '/api/hills/nope')).status).toBe(404)
  })

  it('keeps one best per person on the board', async () => {
    const a = await named(A, 'Alex')
    await run(A, { kmh: 10 })
    await run(A, { kmh: 12, t0: Date.now() - 3600000 })
    const [h] = await hillsHere(A)
    const page = (await call(A, 'GET', `/api/hills/${h.id}`)).body
    expect(page.board).toHaveLength(1)
    expect(page.board[0]).toMatchObject({ userId: a.id, me: true })
    expect(page.hill.holder.seconds).toBe(page.board[0].seconds)
  })

  it('never makes or counts a hill from inside a privacy zone', async () => {
    await call(A, 'PUT', '/api/me', { name: 'Alex', zones: [{ ...offset(ORIGIN, 0, 250), radiusM: 200 }] })
    const act = await run(A)
    expect(await hillsHere(A)).toEqual([])
    expect((await call(A, 'GET', `/api/activities/${act.id}`)).body.hills).toEqual([])
  })

  it('counts nothing when an activity is rejected', async () => {
    await named(A, 'Alex')
    const r = await call(A, 'POST', '/api/activities', { mode: 'walk', points: hillRun({ kmh: 60 }) })
    expect(r.body.activity.rejected).toBe(true)
    expect(await hillsHere(A, 'walk')).toEqual([])
  })

  it('still saves the activity when heights are not available', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 503 }))
    await named(A, 'Alex')
    await run(A)
    expect(await hillsHere(A)).toEqual([])
  })

  it('checks the map area', async () => {
    expect((await call(A, 'GET', '/api/hills?mode=run')).status).toBe(400)
    expect((await call(A, 'GET', '/api/hills?mode=swim&bbox=1,1,2,2')).status).toBe(400)
    expect((await call(A, 'GET', '/api/hills?bbox=100,-40,140,-10')).status).toBe(400)
  })
})

describe('the crown passes on', () => {
  async function twoUp() {
    const a = await named(A, 'Alex')
    const b = await named(B, 'Bea')
    await run(A, { kmh: 10 })
    const fast = await run(B, { kmh: 13 })
    const [h] = await hillsHere(A)
    expect(h.holder.userId).toBe(b.id)
    return { a, b, h, fast }
  }

  it('to the next fastest when the holder deletes the run', async () => {
    const { a, h, fast } = await twoUp()
    expect((await call(B, 'DELETE', `/api/activities/${fast.id}`)).status).toBe(200)
    const page = (await call(A, 'GET', `/api/hills/${h.id}`)).body
    expect(page.hill.holder).toMatchObject({ userId: a.id, me: true })
    expect(page.board).toHaveLength(1)
  })

  it('to the next fastest when the holder deletes their account, and the hill stays', async () => {
    const { a, b, h } = await twoUp()
    const exp = (await call(B, 'GET', '/api/me/export')).body
    expect(exp.hill_efforts).toHaveLength(1)
    expect(exp.hills_held).toEqual([expect.objectContaining({ id: h.id, holder_user: b.id, line: expect.any(Array) })])
    expect((await call(B, 'DELETE', '/api/me')).status).toBe(200)
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM hill_efforts WHERE user_id = ?').get(b.id).n).toBe(0)
    const [still] = await hillsHere(A)
    expect(still.id).toBe(h.id)
    expect(still.holder).toMatchObject({ userId: a.id, me: true })
  })

  it('to nobody when the only person up it leaves', async () => {
    const a = await named(A, 'Alex')
    await run(A)
    await call(A, 'DELETE', '/api/me')
    const [h] = await hillsHere(B)
    expect(h.holder).toBeNull()
    expect(a.id).toBeTruthy()
  })
})
