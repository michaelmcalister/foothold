// Route planner tests: loop checks, capture preview, pace, off route distance, GPX points and route validation.
import { describe, it, expect } from 'vitest'
import { offset, LOOP_DEFAULTS, cellsForLoops } from '../src/lib/engine/index.js'
import {
  routeLine, lineLength, densify, usualPace, planRoute, rivalLine, previewGroups, offRouteM,
  routeTrackPoints, cleanRoute, escapeXml, FALLBACK_PACE,
} from '../src/lib/planner.js'

const ORIGIN = { lat: -33.9, lng: 151.15 }
const NOW = Date.UTC(2026, 10, 2, 8)
const pt = (e, n) => { const p = offset(ORIGIN, e, n); return [p.lng, p.lat] }
const rect = (w, h) => [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)]

describe('route line', () => {
  it('closes back to the start only when asked', () => {
    const wp = rect(400, 300)
    expect(routeLine(wp, true)).toHaveLength(5)
    expect(routeLine(wp, true)[4]).toEqual(wp[0])
    expect(routeLine(wp, false)).toHaveLength(4)
    expect(Math.round(lineLength(routeLine(wp, true)))).toBeCloseTo(1400, -1)
  })
  it('fills in straight segments every few metres', () => {
    const d = densify([pt(0, 0), pt(100, 0)])
    expect(d.length).toBeGreaterThanOrEqual(100 / (LOOP_DEFAULTS.step / 2))
  })
})

describe('usual pace', () => {
  it('uses the median of recent activities in that mode', () => {
    const acts = [{ mode: 'run', paceSPerKm: 300 }, { mode: 'run', paceSPerKm: 330 }, { mode: 'run', paceSPerKm: 900, rejected: true }, { mode: 'walk', paceSPerKm: 700 }, { mode: 'run', paceSPerKm: 360 }]
    expect(usualPace(acts, 'run')).toBe(330)
    expect(usualPace(acts, 'walk')).toBe(700)
  })
  it('falls back to 6:00 a km for runs, and by mode otherwise', () => {
    expect(usualPace([], 'run')).toBe(360)
    expect(usualPace([], 'ride')).toBe(FALLBACK_PACE.ride)
  })
})

describe('planRoute', () => {
  it('counts a good loop and claims what the engine would claim', () => {
    const p = planRoute({ waypoints: rect(500, 400), mode: 'run', now: NOW })
    expect(p.counts).toBe(true)
    expect(p.warning).toBeNull()
    expect(p.timeS).toBeCloseTo((p.distanceM / 1000) * 360, 0)
    expect(p.capture.total).toBe(cellsForLoops(p.loops.map((ring) => ({ ring }))).length)
    expect(p.capture.wild.length).toBe(p.capture.total)
  })

  it('warns kindly about loops under 400 m', () => {
    const p = planRoute({ waypoints: rect(100, 80), now: NOW })
    expect(p.counts).toBe(false)
    expect(p.warning.code).toBe('short')
    expect(p.warning.text).toMatch(/400 m/)
    expect(p.warning.text).not.toMatch(/[–—]|--/)
  })

  it('warns about slivers that findLoops would not count', () => {
    const p = planRoute({ waypoints: [pt(0, 0), pt(800, 0), pt(800, 12), pt(0, 12)], now: NOW })
    expect(p.counts).toBe(false)
    expect(['thin', 'small']).toContain(p.warning.code)
  })

  it('asks you to close an open route', () => {
    const p = planRoute({ waypoints: rect(500, 400), closed: false, now: NOW })
    expect(p.counts).toBe(false)
    expect(p.warning.code).toBe('open')
  })

  it('splits hexes into wild, yours and rivals, with the same take rule as a real claim', () => {
    const first = planRoute({ waypoints: rect(600, 500), now: NOW })
    const hexes = [...first.capture.wild]
    const cells = new Map()
    const at = NOW - 86400000
    hexes.slice(0, 5).forEach((h3) => cells.set(h3, { h3, owner: 'me', strength: 40, lastVisit: at, visits: 1 }))
    hexes.slice(5, 12).forEach((h3) => cells.set(h3, { h3, owner: 'r-sam', strength: 10, lastVisit: at, visits: 1 }))
    hexes.slice(12, 15).forEach((h3) => cells.set(h3, { h3, owner: 'r-priya', strength: 99, lastVisit: at, visits: 1 }))
    const names = new Map([['r-sam', { name: 'Sam', colour: '#E8A817' }], ['r-priya', { name: 'Priya', colour: '#E5604D' }]])
    const p = planRoute({ waypoints: rect(600, 500), cells, me: 'me', names, now: NOW })
    expect(p.capture.mine).toHaveLength(5)
    expect(p.capture.wild).toHaveLength(hexes.length - 15)
    const sam = p.capture.rivals.find((r) => r.id === 'r-sam')
    const priya = p.capture.rivals.find((r) => r.id === 'r-priya')
    expect(sam).toMatchObject({ name: 'Sam', total: 7, beats: true })
    expect(sam.take).toHaveLength(7)
    expect(priya).toMatchObject({ total: 3, beats: false })
    expect(priya.hold).toHaveLength(3)
    expect(rivalLine(sam)).toBe("7 of Sam's. Your effort beats their hold, so you'd take them.")
    expect(rivalLine(priya)).toMatch(/^3 of Priya's\. Their hold is stronger/)
    const groups = previewGroups(p.capture)
    expect(groups.map((g) => g.kind).sort()).toEqual(['hold', 'mine', 'take', 'wild'])
    expect(groups.find((g) => g.kind === 'take').colour).toBe('#E8A817')
  })
})

describe('off route', () => {
  it('measures the distance to the nearest segment', () => {
    const line = routeLine(rect(400, 300), true)
    const on = offset(ORIGIN, 200, 0)
    expect(offRouteM(on, line)).toBeLessThan(1)
    const off = offset(ORIGIN, 200, -50)
    expect(offRouteM(off, line)).toBeCloseTo(50, 0)
    expect(offRouteM(null, line)).toBeNull()
  })
})

describe('GPX points', () => {
  it('times each point at your pace', () => {
    const line = [pt(0, 0), pt(1000, 0)]
    const pts = routeTrackPoints(line, { paceSPerKm: 300, startAt: 0 })
    expect(pts[0].t).toBe(0)
    expect(pts[1].t).toBeCloseTo(300000, -3)
    expect(escapeXml('Tom & <Mei>')).toBe('Tom &amp; &lt;Mei&gt;')
  })
})

describe('cleanRoute', () => {
  it('accepts a route and fills in a name', () => {
    const r = cleanRoute({ ring: routeLine(rect(400, 300)), mode: 'walk', name: '  Park   loop ' })
    expect(r).toMatchObject({ name: 'Park loop', mode: 'walk' })
    expect(r.distanceM).toBeGreaterThan(1300)
    expect(cleanRoute({ ring: [pt(0, 0), pt(10, 0)] }).name).toBe('My route')
  })
  it('refuses junk', () => {
    expect(() => cleanRoute({ ring: [] })).toThrow(/two points/)
    expect(() => cleanRoute({ ring: [[0, 0], [200, 0]] })).toThrow(/longitude/)
    expect(() => cleanRoute({ ring: [[0, 0], ['a', 0]] })).toThrow(/longitude/)
    expect(() => cleanRoute({ ring: [[0, 0], [0, 0.001]], mode: 'swim' })).toThrow(/Mode/)
  })
})
