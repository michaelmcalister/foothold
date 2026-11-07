// Terrain height grid maths, shared by the app (src/lib/elevation.js) and the
// server (worker/hills.js): which corners of a 100 m grid to look up around a
// route, and how to blend those corner heights back onto each point. Pure,
// with no storage or network, so the Worker can import it.
import { smoothByDistance, coverage } from './runStats.js'

export const GRIDS = [0.001, 0.002, 0.004] // degrees; about 100, 200 and 400 m
export const MAX_NODES = 1000

const snap = (v, g) => Math.round(Math.round(v / g) * g * 1e6) / 1e6

/**
 * Grid corners around each sample: { grid, nodes: [[lat, lng]], cells: [{ i: [4 node indexes], fx, fy }] }.
 * Picks the finest grid that stays under MAX_NODES. Null if the route is too big.
 */
export function gridPlan(samples) {
  for (const g of GRIDS) {
    const index = new Map()
    const nodes = []
    const node = (lat, lng) => {
      const k = `${lat},${lng}`
      if (!index.has(k)) { index.set(k, nodes.length); nodes.push([lat, lng]) }
      return index.get(k)
    }
    const cells = samples.map((s) => {
      const lat0 = snap(Math.floor(s.lat / g) * g, g)
      const lng0 = snap(Math.floor(s.lng / g) * g, g)
      const lat1 = snap(lat0 + g, g)
      const lng1 = snap(lng0 + g, g)
      return {
        i: [node(lat0, lng0), node(lat0, lng1), node(lat1, lng0), node(lat1, lng1)],
        fx: Math.min(1, Math.max(0, (s.lng - lng0) / g)),
        fy: Math.min(1, Math.max(0, (s.lat - lat0) / g)),
      }
    })
    if (nodes.length <= MAX_NODES) return { grid: g, nodes, cells }
  }
  return null
}

/** Blend the corner heights for each sample (bilinear). */
export function blend(plan, elev) {
  return plan.cells.map(({ i, fx, fy }) => {
    const [a, b, c, d] = i.map((k) => elev[k])
    if (![a, b, c, d].every(Number.isFinite)) return null
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
  })
}

/**
 * Terrain heights for each sample from the looked up corners, eased over
 * 80 m (the model has 90 m cells). Null when too many corners are missing.
 */
export function terrainAlts(plan, elev, samples) {
  if (!Array.isArray(elev) || elev.length !== plan.nodes.length) return null
  const alts = smoothByDistance(blend(plan, elev), samples.map((s) => s.d), 80)
  return coverage(alts.map((alt) => ({ alt })), 'alt') > 0.9 ? alts : null
}
