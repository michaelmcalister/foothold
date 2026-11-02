// Weekly divisions on the Worker with the fake D1: the routes, the Monday grouping, finishing a week (top 5 up, nobody down) and late joiners.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeEnv, caller, rectRun, ORIGIN } from './fakes.js'
import { runCron } from '../worker/cron.js'
import { weekFor } from '../src/lib/engine/index.js'

const DAY = 86400000
const HOUR = 3600000
const W = weekFor('2026-11-02') // Monday 2 November 2026, Sydney
const PREV = weekFor('2026-10-26')
const WED = W.start + 2 * DAY + 10 * HOUR
const NEXT_MON = W.end + 30 * 60000

let env
const call = caller(() => env)
const rows = (sql, ...a) => env.DB.db.prepare(sql).all(...a)
let n = 0
// An activity row straight into the table, so each player's week is exactly what we want
function act(userId, at, claimed = 0, taken = 0, rejected = 0) {
  env.DB.db.prepare('INSERT INTO activities (id, user_id, mode, source, started_at, claimed, taken, rejected, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(`act-${++n}`, userId, 'run', 'watch', at, claimed, taken, rejected, ORIGIN.lat, ORIGIN.lng, at)
}
async function player(i, name) {
  const dev = `device-dddd-dddd-dddd-${String(i).padStart(4, '0')}`
  const res = await call(dev, 'PUT', '/api/me', { name })
  if (!res.body.user) throw new Error(JSON.stringify(res))
  const me = res.body.user
  return { dev, id: me.id }
}
const tierOf = (id, week) => rows('SELECT tier, promoted, rank, score FROM division_members WHERE user_id = ? AND week = ?', id, week)[0]

beforeEach(() => {
  env = makeEnv()
  vi.useFakeTimers({ toFake: ['Date'], now: WED })
})
afterEach(() => vi.useRealTimers())

describe('GET /api/division', () => {
  it('asks a new player to get out first, then seats them after an outing', async () => {
    const A = await player(1, 'Ava')
    const r = await call(A.dev, 'GET', '/api/division')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ active: false, division: null, table: [], tier: { name: 'Scout' }, bestTier: { name: 'Scout' }, daysLeft: 5 })
    expect(r.body.week.key).toBe('2026-11-02')
    expect(r.body.scoring).toMatchObject({ perHex: 1, perOuting: 10, maxOutings: 5, promoteTop: 5 })

    const run = await call(A.dev, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: rectRun({ t0: WED - 3 * HOUR }) })
    const gained = run.body.activity.claimed + run.body.activity.taken
    const d = await call(A.dev, 'GET', '/api/division')
    expect(d.body.active).toBe(true)
    expect(d.body.division).toMatchObject({ tier: { name: 'Scout' }, size: 1, promoteTop: 5 })
    expect(d.body.table).toEqual([expect.objectContaining({ userId: A.id, name: 'Ava', me: true, rank: 1, score: gained + 10, hexes: gained, outings: 1, promotes: true })])
    expect(d.body.you).toMatchObject({ rank: 1, score: gained + 10 })
    expect(d.body.table[0]).not.toHaveProperty('city')
    // The cached score is stored
    expect(tierOf(A.id, W.key).score).toBe(gained + 10)
    const notes = (await call(A.dev, 'GET', '/api/notifications')).body.items.filter((x) => x.kind === 'division')
    expect(notes.map((x) => x.text)).toEqual(["You're in a new Scout division this week. Top 5 move up."])
  })

  it('serves history, and is in the export and the delete', async () => {
    const A = await player(1, 'Ava')
    act(A.id, WED - HOUR, 20)
    await call(A.dev, 'GET', '/api/division')
    const h = await call(A.dev, 'GET', '/api/division/history')
    expect(h.body.history).toEqual([expect.objectContaining({ week: W.key, tier: expect.objectContaining({ name: 'Scout' }), finalised: false, promoted: false })])
    const ex = await call(A.dev, 'GET', '/api/me/export')
    expect(ex.body.division_members.length).toBe(1)
    await call(A.dev, 'DELETE', '/api/me')
    expect(rows('SELECT * FROM division_members WHERE user_id = ?', A.id)).toEqual([])
  })
})

describe('the weekly cron', () => {
  it('groups once a week, finishes the week, moves the top 5 up and nobody down', async () => {
    // Eight players out this week with different scores, one out only last week, one quiet for a month
    const ps = []
    for (let i = 0; i < 10; i++) ps.push(await player(i, `Player ${i}`))
    const scores = [80, 70, 60, 50, 40, 30, 20, 10]
    scores.forEach((s, i) => act(ps[i].id, W.start + HOUR, s))
    act(ps[8].id, PREV.start + DAY, 25) // active (last 14 days), but no outing this week
    act(ps[9].id, W.start - 30 * DAY, 99) // not active: not placed
    // Player 7 was a Ranger already: their own division, and they stay Ranger
    env.DB.db.prepare("INSERT INTO divisions (id, week, tier, mode, created_at, finalised_at) VALUES ('old', ?, 1, 'all', 0, 1)").run(PREV.key)
    env.DB.db.prepare("INSERT INTO division_members (division_id, user_id, week, tier, promoted, joined_at, updated_at) VALUES ('old', ?, ?, 1, 1, 0, 0)").run(ps[7].id, PREV.key)

    const monday = W.start + 5 * 60000
    vi.setSystemTime(monday)
    const first = await runCron(env, monday)
    expect(first.divisions.grouped).toBe(9)
    const again = await runCron(env, monday + HOUR)
    expect(again.divisions).toEqual({ promoted: 0, grouped: 0, late: 0 })
    expect(rows('SELECT * FROM division_weeks').length).toBe(1)
    expect(rows('SELECT d.tier, COUNT(*) AS n FROM division_members m JOIN divisions d ON d.id = m.division_id WHERE d.week = ? GROUP BY d.tier', W.key))
      .toEqual([{ tier: 0, n: 8 }, { tier: 2, n: 1 }])
    expect(tierOf(ps[9].id, W.key)).toBeUndefined()
    const placed = rows("SELECT user_id FROM notifications WHERE kind = 'division' AND day_key = ?", `division:${W.key}`)
    expect(placed.length).toBe(9) // once each, even with the cron running twice

    // Sunday night passes: the first run after midnight finishes the week
    vi.setSystemTime(NEXT_MON)
    const end = await runCron(env, NEXT_MON)
    expect(end.divisions.promoted).toBe(6) // the top 5 Scouts, and player 7 alone at Ranger
    for (let i = 0; i < 5; i++) expect(tierOf(ps[i].id, W.key)).toMatchObject({ promoted: 1, rank: i + 1 })
    expect(tierOf(ps[5].id, W.key)).toMatchObject({ promoted: 0, rank: 6 })
    expect(tierOf(ps[8].id, W.key)).toMatchObject({ promoted: 0, score: 0 }) // didn't get out: stays put
    expect(tierOf(ps[7].id, W.key)).toMatchObject({ tier: 2, promoted: 1, rank: 1 }) // alone at Ranger, scored, moves up

    // Running it again changes nothing
    expect((await runCron(env, NEXT_MON + HOUR)).divisions.promoted).toBe(0)
    const ups = rows("SELECT text FROM notifications WHERE user_id = ? AND kind = 'division' AND day_key = ?", ps[0].id, `promoted:${W.key}`)
    expect(ups).toEqual([{ text: 'You moved up to Pathfinder.' }])

    // Next week: the top 5 are Pathfinders, the rest stay Scouts (player 8 stays active from last week)
    const NW = weekFor('2026-11-09')
    expect(tierOf(ps[0].id, NW.key).tier).toBe(1)
    expect(tierOf(ps[5].id, NW.key).tier).toBe(0)
    expect(tierOf(ps[7].id, NW.key).tier).toBe(3)
    const d = await call(ps[0].dev, 'GET', '/api/division')
    expect(d.body.tier.name).toBe('Pathfinder')
    expect(d.body.bestTier.name).toBe('Pathfinder')
    expect(d.body.promotion).toEqual({ week: W.key, tier: expect.objectContaining({ name: 'Pathfinder' }) })
    expect(d.body.last).toMatchObject({ rank: 1, promoted: true, size: 8 })
    const six = await call(ps[5].dev, 'GET', '/api/division')
    expect(six.body.tier.name).toBe('Scout')
    expect(six.body.promotion).toBe(null)
    // No message ever talks about dropping
    const all = rows("SELECT text FROM notifications WHERE kind = 'division'").map((r) => r.text).join(' ')
    expect(all).not.toMatch(/drop|behind|demot|[–—]|--/i)
  })

  it('seats a late joiner in a division of their tier with room', async () => {
    const ps = []
    for (let i = 0; i < 4; i++) ps.push(await player(i, `Player ${i}`))
    for (const p of ps.slice(0, 3)) act(p.id, PREV.start + DAY, 10)
    vi.setSystemTime(W.start + 10 * 60000)
    expect((await runCron(env, W.start + 10 * 60000)).divisions.grouped).toBe(3)
    const div = tierOf(ps[0].id, W.key) && rows('SELECT division_id FROM division_members WHERE user_id = ?', ps[0].id)[0].division_id

    // Player 3 gets out for the first time on Wednesday
    act(ps[3].id, WED - HOUR, 15)
    vi.setSystemTime(WED)
    expect((await runCron(env, WED)).divisions.late).toBe(1)
    expect(rows('SELECT division_id FROM division_members WHERE user_id = ?', ps[3].id)[0].division_id).toBe(div)
    expect((await runCron(env, WED + HOUR)).divisions.late).toBe(0)
    const t = await call(ps[3].dev, 'GET', '/api/division')
    expect(t.body.table.length).toBe(4)
    expect(t.body.you).toMatchObject({ rank: 1, score: 25 })
  })

  it('catches up from a request if the cron missed Monday', async () => {
    const A = await player(1, 'Ava')
    const B = await player(2, 'Ben')
    act(A.id, PREV.start + DAY, 10)
    act(B.id, PREV.start + DAY, 30)
    const r = await call(A.dev, 'GET', '/api/division')
    expect(r.body.table.length).toBe(2)
    expect(rows('SELECT * FROM division_weeks').length).toBe(1)
    expect((await runCron(env, WED)).divisions.grouped).toBe(0)
  })
})
