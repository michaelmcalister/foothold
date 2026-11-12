// Story progress with the account (worker/missions.js, missions/progress.js):
// tries are saved and merged without doubling, a new phone gets them back,
// the continue list finds the next episode, and the weekly nudge is kind and
// goes once.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller } from './fakes.js'
import { mergeProgress, continueList } from '../src/lib/missions/progress.js'
import { storyNudges, nextEpisodes, storyNudgeText } from '../worker/missions.js'
import { CHAINS } from '../src/lib/missions/scripts.js'

const P = 'device-0000-story-prog-0001'
const tiger = CHAINS.tiger

describe('story progress', () => {
  let env
  const call = caller(() => env)
  beforeEach(() => { env = makeEnv() })

  it('saves tries, merges a whole phone once, and never doubles', async () => {
    await call(P, 'POST', '/api/missions/progress', { id: tiger[0], add: true, completed: 1, lastAt: 1000 })
    await call(P, 'POST', '/api/missions/progress', { id: tiger[0], add: true, completed: 0, lastAt: 2000 })
    let { progress } = (await call(P, 'GET', '/api/missions/progress')).body
    expect(progress[tiger[0]]).toEqual({ tries: 2, completed: 1, lastAt: 2000 })
    const items = [{ id: tiger[0], tries: 1, completed: 1, lastAt: 500 }, { id: tiger[1], tries: 3, completed: 2, lastAt: 3000 }]
    await call(P, 'POST', '/api/missions/progress', { items })
    progress = (await call(P, 'POST', '/api/missions/progress', { items })).body.progress
    expect(progress[tiger[0]].tries).toBe(2)
    expect(progress[tiger[1]]).toEqual({ tries: 3, completed: 2, lastAt: 3000 })
    expect((await call(P, 'POST', '/api/missions/progress', { id: 'not-a-story' })).status).toBe(400)
  })

  it('merges two maps, keeping the larger counts', () => {
    expect(mergeProgress({ a: { tries: 2, completed: 0, lastAt: 5 } }, { a: { tries: 1, completed: 1, lastAt: 9 }, b: { tries: 1, completed: 0, lastAt: 1 } }))
      .toEqual({ a: { tries: 2, completed: 1, lastAt: 9 }, b: { tries: 1, completed: 0, lastAt: 1 } })
  })

  it('finds the next episode of each started series, newest first', () => {
    const p = { [tiger[0]]: { tries: 1, lastAt: 10 }, [CHAINS.opal[0]]: { tries: 1, lastAt: 20 }, [CHAINS.opal[1]]: { tries: 1, lastAt: 30 } }
    const list = continueList(p)
    expect(list.map((x) => x.mission.id)).toEqual([CHAINS.opal[2], tiger[1]])
    expect(nextEpisodes(p).map((x) => x.mission.id)).toEqual([CHAINS.opal[2], tiger[1]])
    expect(storyNudgeText(list[0])).toMatch(/^Episode 3 of Opal Town is waiting: .+\. Fancy a run\?$/)
  })

  it('nudges a quiet player once a week, never someone out running', async () => {
    const now = Date.parse('2026-11-12T06:00:00Z')
    await call(P, 'POST', '/api/missions/progress', { id: tiger[0], add: true, lastAt: now - 5 * 86400000 })
    expect(await storyNudges(env, now)).toBe(1)
    expect(await storyNudges(env, now + 3600000)).toBe(1) // tried again: the daily key stops a repeat
    const n = env.DB.db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE kind = 'story'").get().n
    expect(n).toBe(1)
  })
})
