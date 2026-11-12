// Group runs on the phone (src/lib/groupRun.js): the crew's pick, the lobby
// line, the shared countdown, and voting then waiting for the crew.
import { describe, it, expect, vi } from 'vitest'

const votes = { counts: { A: 1, B: 2 } }
vi.mock('../src/lib/api/index.js', () => ({
  api: {
    groupVote: async () => null,
    group: async () => ({ id: 'g', startAt: 1, members: [{ you: true }, { name: 'Sam' }, { name: 'Jo' }], votes: { c1: votes } }),
  },
}))
const { crewPick, lobbyLine, countdown, crewLine, voteAndWait, crew } = await import('../src/lib/groupRun.js')

describe('group run helpers', () => {
  it('works out the crew pick', () => {
    expect(crewPick({ A: 1, B: 2 }, 'A')).toBe('B')
    expect(crewPick(undefined, 'A')).toBe('A')
  })
  it('says who is in, and counts down', () => {
    expect(lobbyLine({ members: [{ you: true }] })).toMatch(/Just you/)
    expect(lobbyLine({ members: [{ you: true }, { name: 'Sam' }, { name: 'Jo' }] })).toBe('Sam and Jo are in.')
    expect(countdown({ startAt: 10_000 }, 4_100)).toBe(6)
    expect(countdown({ startAt: null }, 0)).toBe(null)
    expect(crewLine({ members: [{ you: true }, { name: 'Sam', surges: 3 }] }, 2)).toMatch(/Sam is a surge ahead/)
  })
  it('votes, waits, and returns the crew pick when it differs', async () => {
    crew.group = { id: 'g', startAt: 1, members: [{ you: true }, { name: 'Sam' }] }
    expect(await voteAndWait('c1', 'A', { sleep: async () => {} })).toBe('B')
    expect(await voteAndWait('c1', 'B', { sleep: async () => {} })).toBe(null)
    crew.group = null
    expect(await voteAndWait('c1', 'A', { sleep: async () => {} })).toBe(null)
  })
})
