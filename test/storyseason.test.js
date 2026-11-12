// The story season (lib/storySeason.js, worker/storySeason.js): weeks and
// featured series, the community total, and the finale opening on the goal
// or on finale weekend, with one notice each.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller } from './fakes.js'
import { STORY_SEASON, seasonState, finaleOpen } from '../src/lib/storySeason.js'
import { storySeason, seasonGoalNotices } from '../worker/storySeason.js'
import { MISSIONS } from '../src/lib/missions/scripts.js'

const DAY = 86400000
const start = STORY_SEASON.startsAt

describe('story season', () => {
  it('counts weeks and features a series each week', () => {
    expect(seasonState(start - DAY)).toMatchObject({ started: false, week: 0, featured: null })
    expect(seasonState(start + 1)).toMatchObject({ started: true, week: 1, featured: 'tiger' })
    expect(seasonState(start + 8 * DAY)).toMatchObject({ week: 2, featured: 'catalpa' })
    expect(seasonState(start + 43 * DAY)).toMatchObject({ over: true })
    expect(MISSIONS.some((m) => m.id === STORY_SEASON.finaleMission)).toBe(true)
  })
  it('opens the finale on the goal, or on finale weekend', () => {
    expect(finaleOpen(start + DAY, false)).toBe(false)
    expect(finaleOpen(start + DAY, true)).toBe(true)
    expect(finaleOpen(start + 41 * DAY, false)).toBe(true)
  })

  describe('on the server', () => {
    let env
    const call = caller(() => env)
    beforeEach(() => { env = makeEnv(); env.SEASON_GOAL_KM = '5' })
    it('adds up everyone’s distance, and tells them once when the goal is reached', async () => {
      const P = 'device-0000-season-ss-0001'
      const id = (await call(P, 'GET', '/api/me')).body.user.id
      const db = env.DB.db
      const put = (aid, km) => db.prepare("INSERT INTO activities (id, user_id, mode, source, started_at, distance_m, duration_s, rejected, created_at) VALUES (?, ?, 'run', 'phone', ?, ?, 600, 0, ?)").run(aid, id, start + DAY, km * 1000, start + DAY)
      put('a1', 3)
      const now = start + 2 * DAY
      let s = await storySeason(env, now, null)
      expect(s).toMatchObject({ km: 3, goalKm: 5, reached: false, finaleOpen: false, people: 1, featured: 'tiger' })
      expect(await seasonGoalNotices(env, now)).toBe(0)
      put('a2', 2.5)
      s = await storySeason(env, now, null)
      expect(s).toMatchObject({ reached: true, finaleOpen: true })
      await seasonGoalNotices(env, now)
      await seasonGoalNotices(env, now + 3600000)
      expect(db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE kind = 'season'").get().n).toBe(1)
    })
  })
})
