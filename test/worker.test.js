// Worker tests: every route against a fake D1 (Node's built-in SQLite with
// every migration applied), with FormTrack's MCP endpoint mocked.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker from '../worker/index.js'
import { runCron } from '../worker/cron.js'
import { readinessFrom, extractToken } from '../worker/formtrack.js'
import { encryptSecret, decryptSecret } from '../worker/crypto.js'
import { offset, levelFor } from '../src/lib/engine/index.js'

const ORIGIN = { lat: -33.9, lng: 151.15 } // inner west Sydney
const DAY = 86400000

// ---- a D1 lookalike: prepare().bind().first()/all()/run() and batch() ----
function fakeD1() {
  const db = new DatabaseSync(':memory:')
  // Every migration, in order, as the live database gets them
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  const stmt = (sql, args = []) => ({
    bind: (...a) => {
      if (a.some((v) => v === undefined)) throw new Error('D1_TYPE_ERROR: undefined bound')
      return stmt(sql, a)
    },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args), success: true }),
    run: async () => {
      const r = db.prepare(sql).run(...args)
      return { success: true, meta: { changes: Number(r.changes) } }
    },
    _exec: () => db.prepare(sql).run(...args),
  })
  return {
    db,
    prepare: (sql) => stmt(sql),
    batch: async (list) => {
      db.exec('BEGIN')
      try {
        const out = list.map((s) => s._exec())
        db.exec('COMMIT')
        return out.map((r) => ({ success: true, meta: { changes: Number(r.changes) } }))
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
}

// A rectangular loop of w x h metres, one point a second (as in engine.test.js)
function rectRun({ w = 600, h = 400, kmh = 11, start = ORIGIN, t0 = Date.now() - 3 * 3600000 } = {}) {
  const corners = [[0, 0], [w, 0], [w, h], [0, h], [0, 0]]
  const mps = kmh / 3.6
  const pts = []
  let t = t0
  for (let c = 0; c < corners.length - 1; c++) {
    const [x0, y0] = corners[c]
    const [x1, y1] = corners[c + 1]
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / mps))
    for (let k = 0; k < n; k++) {
      const f = k / n
      pts.push({ ...offset(start, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f), t })
      t += 1000
    }
  }
  pts.push({ ...offset(start, 0, 0), t })
  return pts
}

let env
const call = async (device, method, path, body) => {
  const headers = { 'content-type': 'application/json' }
  if (device) headers['x-device-id'] = device
  const res = await worker.fetch(new Request('https://foothold.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env)
  return { status: res.status, body: await res.json() }
}
const A = 'device-aaaa-aaaa-aaaa-0001'
const B = 'device-bbbb-bbbb-bbbb-0002'
const C = 'device-cccc-cccc-cccc-0003'

beforeEach(() => {
  env = { DB: fakeD1(), ALLOW_DEVICE_IDS: '1', TOKEN_KEY: 'test-key-123', FORMTRACK_URL: 'https://ft.test', APP_URL: 'https://foothold.test', ASSETS: { fetch: async () => new Response('app') } }
})
afterEach(() => vi.unstubAllGlobals())

describe('users', () => {
  it('makes a player on first request with a device id', async () => {
    const r = await call(A, 'GET', '/api/me')
    expect(r.status).toBe(200)
    expect(r.body.user.name).toMatch(/^\w+ \w+$/)
    expect(r.body.user.colour).toMatch(/^#[0-9A-F]{6}$/i)
    expect(r.body.user.formtrack).toEqual({ linked: false, linkedAt: null })
    const again = await call(A, 'GET', '/api/me')
    expect(again.body.user.id).toBe(r.body.user.id)
  })
  it('refuses device ids unless ALLOW_DEVICE_IDS is on', async () => {
    env.ALLOW_DEVICE_IDS = '0'
    expect((await call(A, 'GET', '/api/me')).status).toBe(401)
  })
  it('updates the profile', async () => {
    const r = await call(A, 'PUT', '/api/me', { name: 'Michael', colour: '#112233', mode: 'walk' })
    expect(r.body.user).toMatchObject({ name: 'Michael', colour: '#112233', mode: 'walk' })
  })
  it('serves /api/config without sign-in', async () => {
    expect((await call(null, 'GET', '/api/config')).body).toEqual({})
    Object.assign(env, { AUTH0_DOMAIN: 'https://ft.au.auth0.com/', AUTH0_CLIENT_ID: 'cid', AUTH0_AUDIENCE: 'aud' })
    expect((await call(null, 'GET', '/api/config')).body).toEqual({ auth0: { domain: 'ft.au.auth0.com', clientId: 'cid', audience: 'aud' } })
    env.GOOGLE_MAPS_KEY = 'browser-key'
    expect((await call(null, 'GET', '/api/config')).body.maps).toEqual({ googleKey: 'browser-key' })
    delete env.GOOGLE_MAPS_KEY
    env.SPOTIFY_CLIENT_ID = 'spot-id'
    expect((await call(null, 'GET', '/api/config')).body.spotify).toEqual({ clientId: 'spot-id' })
    delete env.SPOTIFY_CLIENT_ID
  })
  it('hands other paths to the static app', async () => {
    const res = await worker.fetch(new Request('https://foothold.test/map'), env)
    expect(await res.text()).toBe('app')
  })
})

describe('activities and territory', () => {
  it('claims hexes with a loop, then a stronger rival takes them and a battle starts', async () => {
    await call(A, 'PUT', '/api/me', { name: 'Ava' })
    const first = await call(A, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: rectRun() })
    expect(first.status).toBe(200)
    expect(first.body.activity.loops).toBe(1)
    expect(first.body.diff.claimed.length).toBeGreaterThan(10)
    expect(first.body.hexesBefore).toBe(0)
    expect(first.body.hexesAfter).toBe(first.body.diff.claimed.length)
    expect(first.body.load).toHaveProperty('level')

    // B runs a bigger, longer loop around the same block
    await call(B, 'PUT', '/api/me', { name: 'Ben' })
    const big = rectRun({ w: 1500, h: 1000, start: offset(ORIGIN, -300, -300) })
    const second = await call(B, 'POST', '/api/activities', { mode: 'run', source: 'watch', points: big })
    expect(second.status).toBe(200)
    expect(second.body.diff.taken.length).toBeGreaterThan(0)
    expect(second.body.battles).toHaveLength(1)
    expect(second.body.battles[0]).toMatchObject({ attackerName: 'Ben', defenderName: 'Ava' })

    const notes = await call(A, 'GET', '/api/notifications')
    const n = notes.body.items.find((i) => i.kind === 'taken')
    expect(n.text).toMatch(new RegExp(`^Ben took ${second.body.diff.taken.length} of your hexes in a run\\. Will you take them back this week\\?$`))
    expect(n.text).not.toMatch(/[\u2013\u2014]/)

    const battles = await call(A, 'GET', '/api/battles')
    expect(battles.body.live).toHaveLength(1)
    expect(battles.body.live[0].score.leader).toBe(second.body.activity.userId)
    const rivals = await call(A, 'GET', '/api/rivals')
    expect(rivals.body.rivals[0].name).toBe('Ben')

    // Leaderboard: Ben holds more than Ava now
    const lb = await call(A, 'GET', `/api/leaderboard?mode=run&scope=local&lat=${ORIGIN.lat}&lng=${ORIGIN.lng}`)
    expect(lb.body.rows.map((r) => r.name)).toEqual(['Ben', 'Ava'])
    expect(lb.body.rows[1].me).toBe(true)
    expect(lb.body.rows[0].hexes).toBeGreaterThan(lb.body.rows[1].hexes)
    const far = await call(A, 'GET', '/api/leaderboard?mode=run&scope=local&lat=-37.8&lng=144.9')
    expect(far.body.rows.map((r) => r.name)).toEqual(['Ava'])

    // Track: owner gets it all, others get the public track
    const id = first.body.activity.id
    expect((await call(A, 'GET', `/api/activities/${id}`)).body.track.length).toBeGreaterThan(100)
    expect((await call(B, 'GET', `/api/activities/${id}`)).body.activity.start).toBeUndefined()

    // Stats use the engine's level ladder
    const st = await call(B, 'GET', '/api/stats?mode=run')
    expect(st.body.hexes).toBe(second.body.hexesAfter)
    expect(st.body.level?.id ?? null).toBe(levelFor(st.body.hexes).level?.id ?? null)
    expect(st.body.weekKm).toHaveLength(5)

    // Kudos toggles
    expect((await call(B, 'POST', `/api/activities/${id}/kudos`)).body.kudos).toBe(1)
    expect((await call(B, 'POST', `/api/activities/${id}/kudos`)).body.kudos).toBe(0)
    expect((await call(B, 'GET', '/api/feed')).body.items.length).toBe(2)
  })

  it("leaves others' private hexes out of the territory", async () => {
    await call(C, 'PUT', '/api/me', { zones: [{ ...offset(ORIGIN, 300, 200), radiusM: 300, label: 'Home' }] })
    const r = await call(C, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    const bbox = [151.13, -33.92, 151.17, -33.88].join(',')
    const mine = await call(C, 'GET', `/api/territory?mode=run&bbox=${bbox}`)
    expect(mine.body.cells.length).toBe(r.body.diff.claimed.length)
    const theirs = await call(A, 'GET', `/api/territory?mode=run&bbox=${bbox}`)
    expect(theirs.body.cells.length).toBeGreaterThan(0)
    expect(theirs.body.cells.length).toBeLessThan(mine.body.cells.length)
    expect(theirs.body.cells.every((c) => !c.mine && c.strength > 0)).toBe(true)
  })

  it('drops wild hexes from the territory', async () => {
    await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    env.DB.db.exec('UPDATE cells SET last_visit = last_visit - 400 * 86400000, claimed_at = claimed_at - 400 * 86400000')
    const t = await call(A, 'GET', '/api/territory?mode=run&bbox=151.13,-33.92,151.17,-33.88')
    expect(t.body.cells).toHaveLength(0)
  })

  it('rejects bad input with a 400 and a message', async () => {
    const cases = [
      { mode: 'swim', points: rectRun() },
      { mode: 'run', points: 'nope' },
      { mode: 'run', points: [] },
      { mode: 'run', points: rectRun().map((p, i) => (i === 5 ? { ...p, lat: 123 } : p)) },
      { mode: 'run', points: rectRun().map((p, i) => (i === 5 ? { ...p, t: 'soon' } : p)) },
      { mode: 'run', source: 'car', points: rectRun() },
      { mode: 'run', points: new Array(50001).fill({ lat: 0, lng: 0, t: Date.now() }) },
    ]
    for (const body of cases) {
      const r = await call(A, 'POST', '/api/activities', body)
      expect(r.status).toBe(400)
      expect(typeof r.body.error).toBe('string')
    }
    expect((await call(A, 'GET', '/api/territory?bbox=1,2,3')).status).toBe(400)
    expect((await call(A, 'PUT', '/api/me', { colour: 'blue' })).status).toBe(400)
    expect((await call(A, 'POST', '/api/feedback', { kind: 'rant', text: 'x' })).status).toBe(400)
  })
})

describe('cron', () => {
  it('ends battles past their end and sends one fading notice a day', async () => {
    await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    await call(B, 'POST', '/api/activities', { mode: 'run', points: rectRun({ w: 1500, h: 1000, start: offset(ORIGIN, -300, -300) }) })
    const later = Date.now() + 8 * DAY
    expect((await runCron(env, later)).ended).toBe(1)
    const past = await call(A, 'GET', '/api/battles')
    expect(past.body.past).toHaveLength(1)
    expect(past.body.past[0].winner).toBe(past.body.past[0].attacker)

    // Push everything to near wild
    env.DB.db.exec(`UPDATE cells SET wild_at = ${Date.now() + DAY}`)
    await runCron(env)
    await runCron(env)
    const notes = (await call(B, 'GET', '/api/notifications')).body.items.filter((i) => i.kind === 'fade')
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toMatch(/\?$/)
  })
})

describe('FormTrack', () => {
  const ftk = 'ftk_abcdefghijklmnopqrstuvwxyz012345'
  function mockFormtrack({ unknownCardio = true } = {}) {
    const calls = []
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      const msg = JSON.parse(init.body)
      calls.push({ url: String(url), name: msg.params?.name, args: msg.params?.arguments })
      if (!String(url).endsWith('/mcp/' + ftk)) return new Response(JSON.stringify({ error: 'Invalid or revoked token' }), { status: 401 })
      const data = {
        get_summary: { name: 'M', todaySession: { title: 'Legs', exercises: ['Squat 5x5'] } },
        get_wellbeing: { wearable: [{ day: '2026-11-01', sleep_min: 480, hrv: 60, resting_hr: 50 }, { day: '2026-10-31', sleep_min: 420, hrv: 50, resting_hr: 52 }] },
        list_workouts: [{ date: new Date().toISOString().slice(0, 19).replace('T', ' ') }, { date: '2020-01-01 10:00:00' }],
      }[msg.params.name]
      if (msg.params.name === 'log_cardio' && unknownCardio) return new Response(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'Unknown tool log_cardio' } }))
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: JSON.stringify(data ?? 'ok') }] } }))
    }))
    return calls
  }

  it('links with a valid token, stores it encrypted and summarises', async () => {
    const calls = mockFormtrack()
    const r = await call(A, 'POST', '/api/integrations/formtrack', { token: `https://ft.test/mcp/${ftk}` })
    expect(r.status).toBe(200)
    expect(r.body.linked).toBe(true)
    expect(r.body.summary.today.title).toBe('Legs')
    expect(r.body.summary.readiness).toBeGreaterThan(50)
    expect(calls[0]).toMatchObject({ url: `https://ft.test/mcp/${ftk}`, name: 'get_summary' })
    const row = env.DB.db.prepare('SELECT formtrack_token_enc AS t FROM users').get()
    expect(row.t).not.toContain(ftk)
    expect(await decryptSecret(env.TOKEN_KEY, row.t)).toBe(ftk)
    expect(JSON.stringify(r.body)).not.toContain(ftk)

    const me = await call(A, 'GET', '/api/me')
    expect(me.body.user.formtrack.linked).toBe(true)
    const s = await call(A, 'GET', '/api/integrations/formtrack/summary')
    expect(s.body).toMatchObject({ today: { title: 'Legs' }, strengthThisWeek: 1 })
    expect((await call(A, 'DELETE', '/api/integrations/formtrack')).body).toEqual({ linked: false })
    expect((await call(A, 'GET', '/api/me')).body.user.formtrack.linked).toBe(false)
  })

  it('refuses a token FormTrack does not know, and junk', async () => {
    mockFormtrack()
    const r = await call(A, 'POST', '/api/integrations/formtrack', { token: 'ftk_wrongwrongwrongwrongwrong' })
    expect(r.status).toBe(400)
    expect(r.body.code).toBe('formtrack_token')
    expect((await call(A, 'POST', '/api/integrations/formtrack', { token: 'hello' })).status).toBe(400)
  })

  it('logs cardio in FormTrack after an activity when linked, and not otherwise', async () => {
    const calls = mockFormtrack()
    await call(B, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    expect(calls.some((c) => c.name === 'log_cardio')).toBe(false)

    await call(A, 'POST', '/api/integrations/formtrack', { token: ftk })
    const r = await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun({ start: offset(ORIGIN, 3000, 3000) }) })
    expect(r.status).toBe(200) // "Unknown tool" from FormTrack doesn't fail the activity
    const c = calls.find((x) => x.name === 'log_cardio')
    expect(c.args).toMatchObject({ kind: 'run', foothold_id: r.body.activity.id, hexes: r.body.activity.claimed + r.body.activity.taken })
    expect(c.args.started_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(Number.isInteger(c.args.distance_m) && Number.isInteger(c.args.duration_s)).toBe(true)
  })

  it('scores readiness from what is there, or null', () => {
    expect(readinessFrom(null)).toBeNull()
    expect(readinessFrom({ wearable: [] })).toBeNull()
    expect(readinessFrom({ wearable: [{ day: '2026-11-01', sleep_min: 480 }] })).toBe(100)
    expect(extractToken('see https://x/mcp/ftk_abcdefghijklmnopqrst ok')).toBe('ftk_abcdefghijklmnopqrst')
  })

  it('round trips the token encryption', async () => {
    const s = await encryptSecret('k', 'secret')
    expect(await decryptSecret('k', s)).toBe('secret')
    expect(await decryptSecret('other', s)).toBeNull()
  })
})

describe('FormTrack week boundary', () => {
  it('counts a Monday morning session in Sydney, though it is still Sunday in UTC', async () => {
    const { mapSummary, weekStart } = await import('../worker/formtrack.js')
    const now = Date.parse('2026-11-01T23:14:00Z') // Mon 2 Nov, 10:14am in Sydney (AEDT)
    expect(new Date(weekStart(now)).toISOString()).toBe('2026-11-01T13:00:00.000Z')
    const s = mapSummary(null, null, [
      { date: '2026-11-01 22:00:00' }, // Mon 9am Sydney: this week
      { date: '2026-11-01 12:30:00' }, // Sun 11:30pm Sydney: last week
      { date: '2026-11-01T13:00:00Z' }, // exactly Monday midnight
    ], now)
    expect(s.strengthThisWeek).toBe(2)
  })

  it('finds Monday midnight across the daylight saving change', async () => {
    const { weekStart } = await import('../worker/formtrack.js')
    // Clocks went forward on Sun 4 Oct 2026; Monday 28 Sep was still AEST (+10)
    expect(new Date(weekStart(Date.parse('2026-10-04T05:00:00Z'))).toISOString()).toBe('2026-09-27T14:00:00.000Z')
    // Monday 5 Oct is AEDT (+11)
    expect(new Date(weekStart(Date.parse('2026-10-05T03:00:00Z'))).toISOString()).toBe('2026-10-04T13:00:00.000Z')
  })
})

describe('planned routes', () => {
  const ring = [[151.15, -33.9], [151.155, -33.9], [151.155, -33.896], [151.15, -33.896], [151.15, -33.9]]

  it('saves, lists, updates and deletes your routes', async () => {
    const r = await call(A, 'POST', '/api/routes', { name: ' Park loop ', mode: 'run', ring })
    expect(r.status).toBe(200)
    expect(r.body.route).toMatchObject({ name: 'Park loop', mode: 'run', ring })
    expect(r.body.route.distanceM).toBeGreaterThan(1500)
    const id = r.body.route.id

    const list = await call(A, 'GET', '/api/routes')
    expect(list.body.routes.map((x) => x.id)).toEqual([id])

    const up = await call(A, 'POST', '/api/routes', { id, name: 'Park loop, longer', mode: 'walk', ring })
    expect(up.body.route).toMatchObject({ id, name: 'Park loop, longer', mode: 'walk' })
    expect((await call(A, 'GET', '/api/routes')).body.routes).toHaveLength(1)

    expect((await call(A, 'DELETE', `/api/routes/${id}`)).body).toEqual({ ok: true })
    expect((await call(A, 'GET', '/api/routes')).body.routes).toEqual([])
    expect((await call(A, 'DELETE', `/api/routes/${id}`)).status).toBe(404)
  })

  it('keeps routes private to the player who made them', async () => {
    const { body } = await call(A, 'POST', '/api/routes', { name: 'Mine', ring })
    expect((await call(B, 'GET', '/api/routes')).body.routes).toEqual([])
    expect((await call(B, 'DELETE', `/api/routes/${body.route.id}`)).status).toBe(404)
    expect((await call(B, 'POST', '/api/routes', { id: body.route.id, name: 'Taken', ring })).status).toBe(404)
    expect((await call(A, 'GET', '/api/routes')).body.routes[0].name).toBe('Mine')
  })

  it('refuses routes it cannot use', async () => {
    expect((await call(A, 'POST', '/api/routes', { ring: [[151.15, -33.9]] })).status).toBe(400)
    expect((await call(A, 'POST', '/api/routes', { ring: [[999, 0], [0, 0]] })).status).toBe(400)
    expect((await call(A, 'POST', '/api/routes', { ring, mode: 'swim' })).body.error).toMatch(/Mode/)
    expect((await call(A, 'POST', '/api/routes', { ring: 'nope' })).status).toBe(400)
  })
})

describe('quests, explored map and weekly recap', () => {
  it('keeps the hexes each run passed through and serves the explored set', async () => {
    const r = await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    expect(r.status).toBe(200)
    const row = env.DB.db.prepare('SELECT visited FROM activities WHERE id = ?').get(r.body.activity.id)
    const visited = JSON.parse(row.visited)
    expect(visited.length).toBeGreaterThan(10)
    expect(r.body.activity).not.toHaveProperty('visited') // never in the activity shape
    const all = await call(A, 'GET', '/api/explored')
    expect(all.body).toMatchObject({ total: visited.length, capped: false })
    expect(new Set(all.body.cells)).toEqual(new Set(visited))
    expect((await call(A, 'GET', '/api/explored?mode=walk')).body.cells).toEqual([])
    expect((await call(A, 'GET', '/api/explored?mode=swim')).status).toBe(400)
    // Someone else sees nothing of yours
    expect((await call(B, 'GET', '/api/explored')).body.total).toBe(0)
    // Deleting the activity takes its explored hexes with it
    await call(A, 'DELETE', `/api/activities/${r.body.activity.id}`)
    expect((await call(A, 'GET', '/api/explored')).body.total).toBe(0)
  })

  it('works out explored hexes for older activities from their tracks', async () => {
    const r = await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    env.DB.db.exec('UPDATE activities SET visited = NULL')
    expect((await call(A, 'GET', '/api/explored')).body.total).toBeGreaterThan(10)
    expect(env.DB.db.prepare('SELECT visited FROM activities WHERE id = ?').get(r.body.activity.id).visited).toBeTruthy()
  })

  it('logs lost ground and serves three quests with progress', async () => {
    await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    const big = await call(B, 'POST', '/api/activities', { mode: 'run', source: 'watch', points: rectRun({ w: 1500, h: 1000, start: offset(ORIGIN, -300, -300) }) })
    const a = (await call(A, 'GET', '/api/me')).body.user
    const losses = env.DB.db.prepare('SELECT COUNT(*) AS n FROM hex_losses WHERE user_id = ?').get(a.id).n
    expect(losses).toBe(big.body.diff.taken.length)
    const q = await call(A, 'GET', '/api/quests')
    expect(q.status).toBe(200)
    expect(q.body.week.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(q.body.quests).toHaveLength(3)
    for (const x of q.body.quests) {
      expect(x).toHaveProperty('title')
      expect(x.progress).toBeLessThanOrEqual(x.target)
      expect(x.title).not.toMatch(/[–—]/)
    }
    expect((await call(A, 'GET', '/api/quests')).body.quests).toEqual(q.body.quests)
  })

  it('serves the weekly recap for this week and a past week', async () => {
    await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    const r = await call(A, 'GET', '/api/week')
    expect(r.status).toBe(200)
    expect(r.body.recap).toMatchObject({ outings: 1, loops: 1, week: { current: true } })
    expect(r.body.recap.hexes.taken).toBeGreaterThan(10)
    expect(r.body.recap.visited.length).toBeGreaterThan(10)
    expect(r.body.recap.best.text).toMatch(/new hexes on your map\.$/)
    const past = await call(A, 'GET', `/api/week?w=${r.body.recap.week.previous}`)
    expect(past.body.recap).toMatchObject({ outings: 0, week: { current: false } })
    expect((await call(A, 'GET', '/api/week?w=soon')).status).toBe(400)
    expect((await call(A, 'GET', '/api/week?w=2099-01-05')).status).toBe(400)
  })

  it('sends one "your week is ready" notice on Monday to people who got out', async () => {
    const monday = Date.parse('2026-11-02T00:30:00Z') // Mon 11:30am in Sydney
    const lastWeek = Date.parse('2026-10-28T20:00:00Z')
    await call(A, 'POST', '/api/activities', { mode: 'run', startedAt: lastWeek, points: rectRun({ t0: lastWeek }) })
    await call(B, 'GET', '/api/me')
    expect((await runCron(env, monday - 2 * DAY)).weekly).toBe(0) // Saturday: nothing
    expect((await runCron(env, monday)).weekly).toBe(1)
    await runCron(env, monday + 3600000)
    const notes = (await call(A, 'GET', '/api/notifications')).body.items.filter((n) => n.kind === 'week')
    expect(notes.map((n) => n.text)).toEqual(['Your week in Foothold is ready. Want a look?'])
    expect((await call(B, 'GET', '/api/notifications')).body.items.filter((n) => n.kind === 'week')).toHaveLength(0)
  })
})
