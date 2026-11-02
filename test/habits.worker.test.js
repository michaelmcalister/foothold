// Worker routes for habit features: GET /api/streak, streak milestone celebrations in the cron, and the Founding foothold badge on the profile.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller, rectRun } from './fakes.js'
import { runCron } from '../worker/cron.js'
import { weekOf } from '../src/lib/engine/index.js'

const DAY = 86400000
const WEEK = 7 * DAY
let env
const call = caller(() => env)
const A = 'device-aaaa-aaaa-aaaa-0001'
const B = 'device-bbbb-bbbb-bbbb-0002'

beforeEach(() => { env = makeEnv() })

// Put an outing in the database at a given time without the full activity pipeline
async function outingAt(device, t, rejected = 0) {
  const { user } = (await call(device, 'GET', '/api/me')).body
  env.DB.db.prepare(`INSERT INTO activities (id, user_id, mode, source, started_at, distance_m, duration_s, moving_s, rejected, created_at)
    VALUES (?, ?, 'run', 'import', ?, 3000, 1200, 1200, ?, ?)`).run(`x-${device.slice(-4)}-${t}-${rejected}`, user.id, t, rejected, Date.now())
  return user
}

describe('GET /api/streak', () => {
  it('starts at nothing with this week in progress', async () => {
    const r = await call(A, 'GET', '/api/streak')
    expect(r.status).toBe(200)
    expect(r.body.streak).toMatchObject({ current: 0, longest: 0, banked: 0, maxBanked: 3, active: false })
    expect(r.body.streak.weeks).toHaveLength(16)
    expect(r.body.streak.weeks.at(-1).state).toBe('now')
  })

  it('counts a recorded activity this week', async () => {
    expect((await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })).status).toBe(200)
    const s = (await call(A, 'GET', '/api/streak')).body.streak
    expect(s).toMatchObject({ current: 1, active: true, thisWeek: { out: true } })
  })

  it('works from start times: weeks back, rest weeks and rejected runs', async () => {
    const now = Date.now()
    for (const back of [4, 3, 1]) await outingAt(A, now - back * WEEK)
    await outingAt(A, now - 2 * WEEK, 1) // rejected: doesn't count
    const s = (await call(A, 'GET', '/api/streak')).body.streak
    expect(s.weeks.slice(-5).map((w) => w.state)).toEqual(['out', 'out', 'rested', 'out', 'now'])
    expect(s.current).toBe(4)
    // Only your own runs
    expect((await call(B, 'GET', '/api/streak')).body.streak.current).toBe(0)
  })
})

describe('streak milestones in the cron', () => {
  it('celebrates reaching four weeks once, and never sends anything else about streaks', async () => {
    const now = Date.now()
    for (const back of [3, 2, 1]) await outingAt(A, now - back * WEEK)
    await outingAt(B, now - WEEK) // one week: nothing to celebrate
    expect((await runCron(env, now)).streaks).toBe(0)
    await outingAt(A, Math.min(now, weekOf(now).start + 60000)) // this week
    expect((await runCron(env, now)).streaks).toBe(1)
    await runCron(env, now + 3600000)
    const notes = (await call(A, 'GET', '/api/notifications')).body.items.filter((n) => n.kind === 'streak')
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe('4 weeks in a row. Your ground has a regular now. Nice work.')
    expect((await call(B, 'GET', '/api/notifications')).body.items.filter((n) => n.kind === 'streak')).toHaveLength(0)
  })
})

describe('Founding foothold badge', () => {
  it('can be set once and never moved or cleared', async () => {
    expect((await call(A, 'GET', '/api/me')).body.user.foundingAt).toBeNull()
    const at = Date.now() - DAY
    expect((await call(A, 'PUT', '/api/me', { foundingAt: at })).body.user.foundingAt).toBe(at)
    expect((await call(A, 'PUT', '/api/me', { foundingAt: Date.now() })).body.user.foundingAt).toBe(at)
    expect((await call(A, 'PUT', '/api/me', { foundingAt: 'soon' })).status).toBe(400)
    expect((await call(A, 'PUT', '/api/me', { foundingAt: null })).status).toBe(400)
    expect((await call(A, 'GET', '/api/me')).body.user.foundingAt).toBe(at)
  })
})
