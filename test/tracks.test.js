import { it, expect } from 'vitest'
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
