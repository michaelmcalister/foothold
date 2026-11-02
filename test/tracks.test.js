import { describe, it, expect } from 'vitest'
import { loopTrack } from '../src/lib/tracks.js'
import { processActivity } from '../src/lib/engine/index.js'
it('practice loops pass anti-cheat and claim', () => {
  for (let seed = 1; seed < 30; seed++) {
    const pts = loopTrack({ centre: { lat: -33.91, lng: 151.15 }, perimeterKm: 2 + (seed % 7), kmh: 9 + (seed % 5), seed, stretch: 0.7 + (seed % 9) / 10, rotate: seed })
    const r = processActivity({ id: 'x', userId: 'u', points: pts }, { cells: new Map(), zones: [], battles: [] })
    expect(r.activity.flags, `seed ${seed}`).toHaveLength(0)
    expect(r.activity.loops, `seed ${seed}`).toBeGreaterThanOrEqual(1)
  }
})

describe('Penrith area pack', () => {
  it('every loop decodes to a closed route and a rival run passes anti-cheat and takes ground', async () => {
    const { LOOPS, AREA, decode } = await import('../src/lib/api/areas/penrith.js')
    const { routeTrack } = await import('../src/lib/tracks.js')
    const { checkActivity, findLoops, cellsForLoops, distance: dist } = await import('../src/lib/engine/index.js')
    expect(LOOPS.length).toBe(7)
    for (const l of LOOPS) {
      const route = decode(l.line)
      expect(dist(route[0], route[route.length - 1])).toBeLessThan(5)
      expect(dist(route[0], AREA.centre)).toBeLessThan(AREA.radiusM)
      for (const reverse of [false, true]) {
        const pts = routeTrack(route, { kmh: 11, startAt: 1_800_000_000_000, seed: 3, reverse })
        const chk = checkActivity(pts, 'run')
        expect(chk.rejected, l.id).toBe(false)
        expect(cellsForLoops(findLoops(pts)).length, l.id).toBeGreaterThan(5)
      }
    }
    for (const ids of Object.values(AREA.regulars)) for (const id of ids) expect(LOOPS.some((l) => l.id === id)).toBe(true)
  })
})
