// Tests for the run recap planner: shots, follow camera and smoothing.
import { describe, it, expect } from 'vitest'
import { planRecap, bearing, turn, smoother, eyeOf, zoomForRange } from '../src/lib/recap/plan.js'

import { loopTrack } from '../src/lib/tracks.js'
import { distance } from '../src/lib/engine/index.js'

const centre = { lat: -33.9, lng: 151.15 }
const loop = () => loopTrack({ centre, perimeterKm: 3.2, seed: 7 })

describe('recap plan', () => {
  it('returns null for nothing or a stroll to the letterbox', () => {
    expect(planRecap([])).toBeNull()
    expect(planRecap([centre, { lat: centre.lat + 0.0001, lng: centre.lng }])).toBeNull()
  })

  it('plans four shots in order with a follow length that suits the distance', () => {
    const p = planRecap(loop(), { mode: 'run' })
    expect(p.timeline.map((s) => s.id)).toEqual(['flyin', 'follow', 'orbit', 'overview'])
    expect(p.km).toBeGreaterThan(2.5)
    const follow = p.timeline[1].ms
    expect(follow).toBeGreaterThanOrEqual(12000)
    expect(follow).toBeLessThanOrEqual(26000)
    const long = planRecap(loopTrack({ centre, perimeterKm: 12, seed: 3 }))
    expect(long.timeline[1].ms).toBeGreaterThan(follow)
  })

  it('frames the whole loop: centre inside it, overview high enough to see it all', () => {
    const p = planRecap(loop())
    expect(distance(p.centre, centre)).toBeLessThan(1200)
    expect(p.shots.overview.tilt).toBe(0)
    expect(p.shots.overview.range).toBeGreaterThan(p.radius * 2)
    expect(p.shots.wide.range).toBeGreaterThan(p.shots.overview.range)
  })

  it('follow camera sits on the track and faces along it', () => {
    const p = planRecap(loop())
    for (const f of [0.1, 0.4, 0.75]) {
      const cam = p.followCamera(f)
      const here = p.at(f)
      expect(distance(cam, here)).toBeLessThan(1)
      const ahead = p.at(f + 40 / p.total)
      expect(Math.abs(turn(cam.heading, bearing(here, ahead)))).toBeLessThan(60)
    }
  })

  it('trail ends exactly at the runner and grows', () => {
    const p = planRecap(loop())
    const a = p.trailTo(0.3)
    const b = p.trailTo(0.6)
    expect(b.length).toBeGreaterThan(a.length)
    const end = a[a.length - 1]
    expect(distance(end, p.at(0.3))).toBeLessThan(0.5)
  })

  it('aims at the ground height the GPS recorded so the camera stays above hills', () => {
    const hilly = loop().map((pt) => ({ ...pt, alt: 1010 }))
    expect(planRecap(hilly).alt).toBe(1010)
    expect(planRecap(loop()).alt).toBe(0)
    const eye = eyeOf(planRecap(hilly).shots.start)
    expect(eye.alt).toBeGreaterThan(1010)
  })

  it('fits the loop across a narrow portrait screen, not just top to bottom', () => {
    const portrait = planRecap(loop(), { aspect: 390 / 844 })
    const landscape = planRecap(loop(), { aspect: 16 / 9 })
    expect(portrait.shots.overview.range).toBeGreaterThan(landscape.shots.overview.range)
    const halfAcross = Math.atan(Math.tan((17.5 * Math.PI) / 180) * (390 / 844))
    expect(portrait.shots.overview.range * Math.tan(halfAcross)).toBeGreaterThanOrEqual(portrait.radius)
  })

  it('includes the hexes taken in the frame', () => {
    const far = [[151.2, -33.9], [151.201, -33.9], [151.201, -33.901], [151.2, -33.9]]
    const p = planRecap(loop(), { hexRings: [far] })
    expect(p.radius).toBeGreaterThan(planRecap(loop()).radius)
  })

  it('rides get a higher follow camera than runs', () => {
    expect(planRecap(loop(), { mode: 'ride' }).shots.start.range).toBeGreaterThan(planRecap(loop(), { mode: 'run' }).shots.start.range)
  })
})

describe('camera smoothing', () => {
  it('turns the short way round and never faster than the limit', () => {
    const s = smoother({ headingPerSec: 70 })
    s.reset({ lat: 0, lng: 0, heading: 350, tilt: 60, range: 200 })
    const c = s.step({ lat: 0, lng: 0, heading: 10, tilt: 60, range: 200 }, 100)
    expect(turn(350, c.heading)).toBeGreaterThan(0)
    expect(Math.abs(turn(350, c.heading))).toBeLessThanOrEqual(7.001)
  })
})

describe('MapLibre zoom from range', () => {
  it('closer cameras zoom in further', () => {
    expect(zoomForRange(250, -33.9, 800)).toBeGreaterThan(zoomForRange(2500, -33.9, 800))
    const z = zoomForRange(250, -33.9, 800)
    expect(z).toBeGreaterThan(15)
    expect(z).toBeLessThan(19.5)
  })
})

describe('demo run', () => {
  it('is a closed harbour run over the bridge that takes hexes', async () => {
    const { demoRun } = await import('../src/lib/recap/demo.js')
    const { findLoops, cellsForLoops, checkActivity } = await import('../src/lib/engine/index.js')
    const { activity, track } = demoRun(Date.parse('2026-11-02T05:00:00Z'))
    expect(activity.distanceM).toBeGreaterThan(3500)
    expect(activity.distanceM).toBeLessThan(12000)
    expect(distance(track[0], track[track.length - 1])).toBeLessThan(30)
    expect(cellsForLoops(findLoops(track)).length).toBeGreaterThan(20)
    expect(checkActivity(track, 'run').flags || []).toEqual([])
    expect(planRecap(track, { aspect: 0.46 })).not.toBeNull()
  })
})
