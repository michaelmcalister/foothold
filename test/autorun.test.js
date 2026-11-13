// The admin auto run (src/lib/autoRun.js): the pretend runner's path, along
// a Story Maker leg and round an episode's loop back to the start.
import { describe, it, expect } from 'vitest'
import { along, onLoop } from '../src/lib/autoRun.js'
import { distance } from '../src/lib/engine/geo.js'

const S = { lat: -33.7331, lng: 150.7214 }

describe('auto run paths', () => {
  it('walks along a leg and stops at its end', () => {
    const line = [[S.lng, S.lat], [S.lng, S.lat + 0.009]] // about a kilometre north
    const mid = along(line, 500)
    expect(distance(S, mid)).toBeGreaterThan(480)
    expect(distance(S, mid)).toBeLessThan(520)
    expect(mid.end).toBe(false)
    expect(along(line, 5000)).toMatchObject({ lat: S.lat + 0.009, end: true })
  })
  it('goes round a loop that starts and ends at the start', () => {
    expect(distance(S, onLoop(S, 0))).toBeLessThan(1)
    const r = 450
    expect(distance(S, onLoop(S, Math.PI * r))).toBeGreaterThan(2 * r - 10) // the far side
    expect(distance(S, onLoop(S, 2 * Math.PI * r))).toBeLessThan(1)
  })
})
