// Tests for moving practice runs to a new account (src/lib/carryOver.js).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const practice = { activities: vi.fn(), activity: vi.fn() }
const server = { activities: vi.fn(), postActivity: vi.fn() }
vi.mock('../src/lib/api/index.js', () => ({ practiceApi: practice, api: server }))
const { movablePractice, movePractice } = await import('../src/lib/carryOver.js')

const track = Array.from({ length: 20 }, (_, i) => ({ lat: -33.75 + i * 1e-4, lng: 150.69, t: i * 1000 }))

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  practice.activities.mockResolvedValue({ activities: [
    { id: 'a', mode: 'run', startedAt: 3000 },
    { id: 'b', mode: 'run', startedAt: 1000, simulated: true },
    { id: 'c', mode: 'walk', startedAt: 2000 },
    { id: 'd', mode: 'run', startedAt: 4000, rejected: true },
  ] })
  practice.activity.mockImplementation(async (id) => ({ activity: { id }, track }))
  server.activities.mockResolvedValue({ activities: [{ startedAt: 2000 }] })
  server.postActivity.mockReset().mockResolvedValue({ activity: { id: 'x' } })
})

describe('moving practice runs', () => {
  it('offers real runs only, never made-up loops or rejected ones', async () => {
    expect((await movablePractice()).map((a) => a.id)).toEqual(['a', 'c'])
  })

  it('moves oldest first, skips one already on the server, and only once', async () => {
    const list = await movablePractice()
    const r = await movePractice(list)
    expect(r).toEqual({ moved: 1, skipped: 1, failed: 0 })
    expect(server.postActivity).toHaveBeenCalledTimes(1)
    expect(server.postActivity.mock.calls[0][0]).toMatchObject({ mode: 'run', source: 'import', startedAt: 3000 })
    expect(await movablePractice()).toEqual([])
  })

  it('stops at the daily import limit and keeps the rest for later', async () => {
    server.activities.mockResolvedValue({ activities: [] })
    server.postActivity.mockRejectedValue(new Error("That's a lot of imports for one day. The rest can come across tomorrow."))
    const r = await movePractice(await movablePractice())
    expect(r.failed).toBe(1)
    expect((await movablePractice()).length).toBe(2)
  })
})
