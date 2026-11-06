// Tests for routes that follow paths, auto-built loops and tracing ground (src/lib/planner.js, src/lib/coach/routes.js).
import { describe, it, expect } from 'vitest'
import { latLngToCell, gridDisk } from 'h3-js'
import { pathLine, routePairs, pairKey, simplify, pointsFor, groundOutline, areaKm2, cleanRoute, planRoute, lineLength } from '../src/lib/planner.js'
import { loopOptions } from '../src/lib/coach/routes.js'
import { offset } from '../src/lib/engine/geo.js'
import { RES } from '../src/lib/engine/territory.js'

const C = { lat: -33.75, lng: 150.69 }
const P = (e, n) => { const p = offset(C, e, n); return [p.lng, p.lat] }

describe('routes along paths', () => {
  const wps = [P(0, 0), P(400, 0), P(400, 400), P(0, 400)]
  it('uses the path for a pair when known and a straight line when not', () => {
    const pairs = routePairs(wps, true)
    expect(pairs).toHaveLength(4)
    const bend = [wps[0], P(200, -60), wps[1]]
    const paths = new Map([[pairKey(wps[0], wps[1], 'run'), bend]])
    const line = pathLine(wps, true, 'run', paths)
    expect(line[1]).toEqual(bend[1])
    expect(line[line.length - 1]).toEqual(wps[0])
    expect(lineLength(line)).toBeGreaterThan(1600)
    // the plan reads the same line
    expect(planRoute({ waypoints: wps, closed: true, paths }).line).toEqual(line)
  })
  it('keeps the shape of a long line with a handful of draggable points', () => {
    const line = []
    for (let i = 0; i <= 400; i++) { const a = (i / 400) * 2 * Math.PI; line.push(P(Math.cos(a) * 500, Math.sin(a) * 500)) }
    expect(simplify(line, 1).length).toBeLessThan(line.length)
    const pts = pointsFor(line, 12)
    expect(pts.length).toBeLessThanOrEqual(12)
    expect(pts.length).toBeGreaterThanOrEqual(6)
  })
  it('saves the drawn points and climb with a route', () => {
    const r = cleanRoute({ name: 'Lake', ring: [P(0, 0), P(100, 0)], waypoints: [P(0, 0), P(100, 0)], climbM: 41.6 })
    expect(r.waypoints).toHaveLength(2)
    expect(r.climbM).toBe(42)
    expect(cleanRoute({ ring: [P(0, 0), P(100, 0)], climbM: -5 }).climbM).toBeNull()
  })
})

describe('auto-build', () => {
  it('offers many different loops, best first', () => {
    const opts = loopOptions({ start: C, targetKm: 4 })
    expect(opts.length).toBe(24)
    expect(new Set(opts.map((o) => `${o.headingDeg}:${o.km}`)).size).toBe(24)
  })
})

describe('take it back', () => {
  it("traces the edge of a rival's patch, not their whole map", () => {
    const centre = latLngToCell(C.lat, C.lng, RES)
    const patch = gridDisk(centre, 2)
    const far = gridDisk(latLngToCell(C.lat + 0.05, C.lng, RES), 1)
    const cells = [...patch.map((h3) => ({ h3, owner: 'sam' })), ...far.map((h3) => ({ h3, owner: 'sam' })), { h3: gridDisk(centre, 3).find((h) => !patch.includes(h)), owner: 'kim' }]
    const out = groundOutline(cells, centre)
    expect(out.hexes).toHaveLength(patch.length)
    expect(out.ring.length).toBeGreaterThan(6)
    expect(areaKm2(out.hexes)).toBeGreaterThan(0)
    expect(groundOutline(cells, 'nope')).toBeNull()
  })
})
