// Tests for ghost runs (src/lib/ghost.js).
import { describe, it, expect } from 'vitest'
import { makeGhost, ghostAt, ghostTimeAt, progressAlong, gapSeconds, gapLine, gapShort, raceResult, ghostChoices } from '../src/lib/ghost.js'
import { offset } from '../src/lib/engine/geo.js'

const C = { lat: -33.75, lng: 150.69 }
// A 2 km out-and-back at 5:00 /km (300 s per km)
const track = []
for (let m = 0; m <= 1000; m += 10) track.push({ ...offset(C, m, 0), t: m * 300 })
for (let m = 990; m >= 0; m -= 10) track.push({ ...offset(C, m, 30), t: (2000 - m) * 300 })

describe('ghosts', () => {
  const g = makeGhost(track)
  it('moves along its line on its own clock', () => {
    expect(g.totalS).toBeCloseTo(600, 0)
    expect(g.totalM).toBeGreaterThan(1990)
    const at = ghostAt(g, 150)
    expect(at.d).toBeCloseTo(500, 0)
    expect(Math.abs(ghostTimeAt(g, 1500) - 450)).toBeLessThan(10) // the turn adds a few metres
    expect(ghostAt(g, 9999).done).toBe(true)
  })
  it('a route ghost holds the pace you pick', () => {
    const r = makeGhost(track.map(({ lat, lng }) => ({ lat, lng })), { paceSPerKm: 360 })
    expect(r.totalS).toBeCloseTo(r.totalM * 0.36, 0)
  })
  it('follows you along the line, and a loop past its start does not jump to the finish', () => {
    const near = { ...offset(C, 400, 5) }
    const p = progressAlong(g, near, 0)
    expect(p.d).toBeCloseTo(400, -1)
    expect(p.offM).toBeLessThan(10)
    // on the way back, near the start: from a late index it stays late
    const back = progressAlong(g, offset(C, 20, 30), 180)
    expect(back.d).toBeGreaterThan(1900)
    const early = progressAlong(g, offset(C, 20, 30), 0)
    expect(early.d).toBeLessThan(100)
  })
  it('says ahead, behind or level in plain words', () => {
    expect(gapSeconds(g, 500, 140)).toBeCloseTo(10, 0)
    expect(gapLine(10)).toBe('10 seconds ahead of your ghost.')
    expect(gapLine(-12)).toMatch(/^12 seconds behind your ghost/)
    expect(gapLine(1)).toBe('Level with your ghost.')
    expect(gapShort(-125)).toBe('2:05 behind')
    expect(raceResult(g, { reachedEnd: true, myS: 580 }).text).toBe('You beat your ghost by 20 seconds.')
    expect(raceResult(g, { reachedEnd: true, myS: 640 }).beat).toBe(false)
    expect(raceResult(g, { reachedEnd: false }).finished).toBe(false)
  })
  it('offers your own runs from near here, quickest first', () => {
    const acts = [
      { id: 'a', mode: 'run', start: C, distanceM: 3000, paceSPerKm: 330 },
      { id: 'b', mode: 'run', start: C, distanceM: 3000, paceSPerKm: 300 },
      { id: 'c', mode: 'run', start: offset(C, 2000, 0), distanceM: 3000, paceSPerKm: 280 },
      { id: 'd', mode: 'walk', start: C, distanceM: 3000, paceSPerKm: 600 },
      { id: 'e', mode: 'run', start: C, distanceM: 3000, paceSPerKm: 250, simulated: true },
    ]
    expect(ghostChoices(acts, C, 'run').map((a) => a.id)).toEqual(['b', 'a'])
  })
})
