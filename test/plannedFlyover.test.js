// The 3D preview of a planned loop: a planned route becomes a smooth pretend track.
import { describe, it, expect } from 'vitest'
import { plannedRun, PREVIEW_PACE } from '../src/lib/recap/planned.js'

const ring = [[151.2, -33.87], [151.203, -33.87], [151.203, -33.873], [151.2, -33.873], [151.2, -33.87]]

describe('planned flyover', () => {
  it('turns a planned loop into a track at an easy pace', () => {
    const r = plannedRun({ ring, mode: 'walk', name: 'Test loop' }, 0)
    expect(r.activity).toMatchObject({ id: 'planned', planned: true, mode: 'walk' })
    expect(r.activity.distanceM).toBeGreaterThan(1100)
    expect(r.activity.durationS).toBe(Math.round((r.activity.distanceM / 1000) * PREVIEW_PACE.walk))
    expect(r.track.length).toBeGreaterThan(100) // densified
    expect(r.track.every((p, i) => !i || p.t >= r.track[i - 1].t)).toBe(true)
  })
  it('is null for nothing or a tiny route', () => {
    expect(plannedRun(null)).toBe(null)
    expect(plannedRun({ ring: [[151.2, -33.87], [151.2001, -33.87]] })).toBe(null)
  })
})
