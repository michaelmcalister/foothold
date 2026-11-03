// Tests for the run recap planner: shots, follow camera and smoothing.
import { describe, it, expect } from 'vitest'
import { offset } from '../src/lib/engine/geo.js'
import { planRecap, bearing, turn, smoother, eyeOf, zoomForRange, cruise } from '../src/lib/recap/plan.js'

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
      expect(distance(cam, here)).toBeLessThan(30) // eased round corners, never far off
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

describe('follow speed', () => {
  it('moves at a steady speed between short ease in and out', () => {
    const ms = 30000
    expect(cruise(0, ms)).toBe(0)
    expect(cruise(ms, ms)).toBeCloseTo(1, 9)
    const speeds = []
    for (let t = 1500; t < ms - 1500; t += 500) speeds.push(cruise(t + 500, ms) - cruise(t, ms))
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeLessThan(1e-9)
    let last = 0
    for (let t = 0; t <= ms; t += 100) { const f = cruise(t, ms); expect(f).toBeGreaterThanOrEqual(last); last = f }
  })
  it('gives longer runs a longer clip, so ground speed stays similar', () => {
    const lap = (km) => {
      const pts = []
      for (let m = 0; m <= km * 1000; m += 10) pts.push({ ...offset({ lat: -33.85, lng: 151.2 }, m, 0), t: m * 300 })
      const p = planRecap(pts)
      return p.total / p.timeline.find((s) => s.id === 'follow').ms
    }
    expect(lap(10) / lap(4)).toBeLessThan(1.5)
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

  it('settles on a new heading without overshooting or snapping', () => {
    const s = smoother()
    s.reset({ lat: 0, lng: 0, heading: 0, tilt: 60, range: 200 })
    const seen = []
    for (let k = 0; k < 120; k++) seen.push(s.step({ lat: 0, lng: 0, heading: 90, tilt: 60, range: 200 }, 16).heading)
    const steps = seen.map((h, i) => (i ? h - seen[i - 1] : h))
    expect(Math.max(...steps)).toBeLessThan(60 * 0.016 + 0.001) // never faster than the limit
    expect(Math.max(...seen)).toBeLessThanOrEqual(90.5) // no overshoot
    expect(seen[seen.length - 1]).toBeGreaterThan(85) // gets there
  })

  it('plans a course with no sudden heading changes, even through a hairpin', () => {
    // Out 600 m east, a tight turn, back 600 m west a few metres north
    const pts = []
    for (let m = 0; m <= 600; m += 10) pts.push({ ...offset({ lat: -33.85, lng: 151.2 }, m, 0), t: m * 300 })
    for (let m = 600; m >= 0; m -= 10) pts.push({ ...offset({ lat: -33.85, lng: 151.2 }, m, 40), t: (1200 - m) * 300 })
    const p = planRecap(pts)
    let worst = 0
    for (let f = 0; f < 1; f += 0.002) worst = Math.max(worst, Math.abs(turn(p.followCamera(f).heading, p.followCamera(f + 0.002).heading)))
    expect(worst).toBeLessThan(6) // degrees per 0.2% of the route
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
