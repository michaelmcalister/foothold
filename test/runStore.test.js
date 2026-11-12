// Keeping a recording on the phone (src/lib/runStore.js): chunked writes,
// the old format still reads, and starting again parks an unsaved run.
import { describe, it, expect } from 'vitest'
import { saveRun, loadRun, clearRun, parkRun, waitingRun, clearSlot, CHUNK } from '../src/lib/runStore.js'

function memory() {
  const m = new Map()
  let writes = 0
  return { m, get writes() { return writes }, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { writes++; m.set(k, String(v)) }, removeItem: (k) => m.delete(k) }
}
const pts = (n, t0 = 1000) => Array.from({ length: n }, (_, i) => ({ lat: -33.7 + i * 1e-5, lng: 150.7, t: t0 + i * 1000, acc: 5 }))

describe('run store', () => {
  it('writes only the newest chunk, and reads it all back', () => {
    const s = memory()
    const run = { mode: 'run', startedAt: 1, points: pts(CHUNK * 3 + 7) }
    saveRun(s, run)
    const first = s.writes
    run.points.push(...pts(5, 999999))
    saveRun(s, run)
    expect(s.writes - first).toBe(2) // one chunk and the header
    const back = loadRun(s)
    expect(back.points).toHaveLength(CHUNK * 3 + 12)
    expect(back.points[0]).toEqual(run.points[0])
    clearRun(s)
    expect(s.m.size).toBe(0)
  })

  it('reads a recording kept in the old one-piece format', () => {
    const s = memory()
    s.setItem('fh-recording', JSON.stringify({ mode: 'walk', startedAt: 5, points: pts(3) }))
    expect(waitingRun(s).points).toHaveLength(3)
  })

  it('parks an unsaved run when a new one starts', () => {
    const s = memory()
    saveRun(s, { mode: 'run', startedAt: 1, points: pts(50) })
    parkRun(s)
    const w = waitingRun(s)
    expect(w.points).toHaveLength(50)
    saveRun(s, { mode: 'run', startedAt: 2, points: pts(3) })
    expect(waitingRun(s).startedAt).toBe(2) // the newest first
    clearSlot(s, waitingRun(s).slot)
    expect(waitingRun(s).startedAt).toBe(1) // then the parked one
    clearSlot(s, waitingRun(s).slot)
    expect(waitingRun(s)).toBe(null)
  })
})
