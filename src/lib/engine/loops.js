// Finds closed loops in a track. A loop closes when the route comes back
// within `closeM` metres of an earlier point after covering at least
// `minPerimeterM` metres. Each loop is returned as a [lng, lat] ring.

import { distance, pathLength, resample, ringArea } from './geo.js'

export const LOOP_DEFAULTS = {
  closeM: 30,
  minPerimeterM: 400,
  minAreaM2: 8000,
  // 4πA/P²: 1 for a circle, 0.79 for a square. Slivers (out-and-back on
  // both sides of a street) score near 0 and don't count.
  minCompactness: 0.1,
  step: 10,
}

export function findLoops(points, opts = {}) {
  const o = { ...LOOP_DEFAULTS, ...opts }
  const pts = resample(points, o.step)
  if (pts.length < 4) return []

  // Running distance along the track, so path length between any two
  // indices is a subtraction.
  const along = [0]
  for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + distance(pts[i - 1], pts[i]))

  // Spatial hash of earlier points in ~closeM cells for fast neighbour lookups.
  const cellDeg = o.closeM / 111000
  const key = (p) => `${Math.floor(p.lat / cellDeg)}:${Math.floor(p.lng / cellDeg)}`
  const grid = new Map()
  const add = (i) => {
    const k = key(pts[i])
    if (!grid.has(k)) grid.set(k, [])
    grid.get(k).push(i)
  }

  const loops = []
  let floor = 0 // earliest index a new loop may start from (no overlapping loops)
  const lag = Math.ceil(o.minPerimeterM / o.step / 2) // points too close in time to count

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const ci = Math.floor(p.lat / cellDeg)
    const cj = Math.floor(p.lng / cellDeg)
    let best = -1
    for (let di = -1; di <= 1 && best < 0; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const bucket = grid.get(`${ci + di}:${cj + dj}`)
        if (!bucket) continue
        for (const j of bucket) {
          if (j < floor || i - j < lag) continue
          if (along[i] - along[j] < o.minPerimeterM) continue
          if (distance(pts[j], p) > o.closeM) continue
          if (best < 0 || j < best) best = j // widest loop wins
        }
      }
    }
    if (best >= 0) {
      const ring = pts.slice(best, i + 1).map((q) => [q.lng, q.lat])
      ring.push(ring[0])
      const area = ringArea(ring)
      const perim = along[i] - along[best]
      const compact = (4 * Math.PI * area) / (perim * perim)
      if (area >= o.minAreaM2 && compact >= o.minCompactness) {
        loops.push({
          ring,
          startIndex: best,
          endIndex: i,
          perimeterM: along[i] - along[best],
          areaM2: Math.round(area),
        })
        floor = i
        grid.clear()
      }
    }
    if (i >= floor) add(i)
  }
  return loops
}

// Total length of the path that wasn't part of any loop. Used to judge
// whether a run was mostly an out-and-back.
export function looseDistance(points, loops) {
  const total = pathLength(points)
  return Math.max(0, total - loops.reduce((s, l) => s + l.perimeterM, 0))
}
