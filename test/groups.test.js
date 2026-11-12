// Group runs (worker/groups.js): make, join by code, start together, report
// surges, vote at choices, and the crew's pick. Never shares where anyone is.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller } from './fakes.js'
import { crewPick, MAX_MEMBERS, clearOldGroups } from '../worker/groups.js'
import { MISSIONS } from '../src/lib/missions/scripts.js'

const mission = MISSIONS.find((m) => m.beats.some((b) => b.kind === 'choice'))
const choice = mission.beats.find((b) => b.kind === 'choice')
const choiceId = choice.id || String(choice.at)
const dev = (n) => `device-0000-grup-grup-${String(n).padStart(4, '0')}`

describe('group runs', () => {
  let env
  const call = caller(() => env)
  beforeEach(() => { env = makeEnv() })

  it('picks the most votes, and keeps the fallback on no votes', () => {
    expect(crewPick({ a: 1, b: 2 })).toBe('b')
    expect(crewPick({ a: 2, b: 2 })).toBe('a')
    expect(crewPick({}, 'x')).toBe('x')
  })

  it('makes, joins, starts, counts and votes', async () => {
    const host = dev(1)
    const made = (await call(host, 'POST', '/api/groups', { missionId: mission.id })).body
    expect(made.code).toMatch(/^[A-Z0-9]{6}$/)
    expect(made.host).toBe(true)
    expect((await call(host, 'POST', '/api/groups', { missionId: 'nope' })).status).toBe(400)

    const friend = dev(2)
    const joined = (await call(friend, 'POST', '/api/groups/join', { code: made.code.toLowerCase() })).body
    expect(joined.members).toHaveLength(2)
    expect(joined.host).toBe(false)
    expect((await call(friend, 'POST', '/api/groups/join', { code: 'ZZZZZZ' })).status).toBe(404)

    expect((await call(friend, 'POST', `/api/groups/${made.id}/start`)).status).toBe(403)
    const started = (await call(host, 'POST', `/api/groups/${made.id}/start`)).body
    expect(started.startAt).toBeGreaterThan(started.now)

    await call(friend, 'POST', `/api/groups/${made.id}/progress`, { surges: 3 })
    await call(friend, 'POST', `/api/groups/${made.id}/progress`, { surges: 1 }) // never goes backwards
    const [k1, k2] = choice.options.map((o) => o.key)
    await call(host, 'POST', `/api/groups/${made.id}/vote`, { choiceId, pick: k1 })
    await call(friend, 'POST', `/api/groups/${made.id}/vote`, { choiceId, pick: k2 })
    await call(friend, 'POST', `/api/groups/${made.id}/vote`, { choiceId, pick: k1 }) // first vote stands
    expect((await call(friend, 'POST', `/api/groups/${made.id}/vote`, { choiceId, pick: 'nope' })).status).toBe(400)

    const g = (await call(host, 'GET', `/api/groups/${made.id}`)).body
    expect(g.members.find((m) => !m.you).surges).toBe(3)
    expect(g.votes[choiceId].counts).toEqual({ [k1]: 1, [k2]: 1 })
    expect(g.votes[choiceId].mine).toBe(k1)
    expect(JSON.stringify(g)).not.toMatch(/"(lat|lng|user_id|email)"/)

    expect((await call(dev(9), 'GET', `/api/groups/${made.id}`)).status).toBe(404) // not a member
    await call(friend, 'POST', `/api/groups/${made.id}/leave`)
    expect((await call(friend, 'GET', `/api/groups/${made.id}`)).status).toBe(404)
  })

  it('holds six runners at most, and clears old groups', async () => {
    const made = (await call(dev(1), 'POST', '/api/groups', { missionId: mission.id })).body
    for (let i = 2; i <= MAX_MEMBERS; i++) expect((await call(dev(i), 'POST', '/api/groups/join', { code: made.code })).status).toBe(200)
    expect((await call(dev(7), 'POST', '/api/groups/join', { code: made.code })).status).toBe(409)
    await clearOldGroups(env, Date.now() + 25 * 3600 * 1000)
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM run_group_members').get().n).toBe(0)
  })
})
