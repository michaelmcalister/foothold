// Heights along a route for the elevation chart. Where they come from, best first:
//   1. an imported watch file with its own heights (often a barometer),
//   2. terrain heights from the Foothold server (POST /api/elevation),
//   3. the phone's GPS heights, smoothed (they drift by 10 m or more),
//   4. nothing, and the chart says so.
// For terrain heights the app sends only corners of a 100 m grid around the
// route, never the route itself, then blends the four corners around each point.
import { coverage, smoothByDistance } from './runStats.js'

const RAW = import.meta.env.VITE_API_URL || ''
const API = RAW === 'self' ? '' : RAW.replace(/\/$/, '')
export const GRIDS = [0.001, 0.002, 0.004] // degrees; about 100, 200 and 400 m
export const MAX_NODES = 1000
const CACHE_PREFIX = 'fh-elev2:' // bump when the heights change shape
const CACHE_KEEP = 30

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

function readCache(id) {
  try { return JSON.parse(localStorage.getItem(CACHE_PREFIX + id) || 'null') } catch { return null }
}
function writeCache(id, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(value))
    // Keep only the latest few runs
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
    if (keys.length > CACHE_KEEP) {
      const dated = keys.map((k) => [k, readCache(k.slice(CACHE_PREFIX.length))?.at || 0]).sort((x, y) => x[1] - y[1])
      for (const [k] of dated.slice(0, keys.length - CACHE_KEEP)) localStorage.removeItem(k)
    }
  } catch { /* private mode or full: just ask again next time */ }
}

async function terrain(samples, fetcher) {
  if (!RAW) return null // practice build with no server
  const plan = gridPlan(samples)
  if (!plan) return null
  const res = await fetcher(API + '/api/elevation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grid: plan.grid, nodes: plan.nodes }),
  })
  if (!res.ok) return null
  const { elev } = await res.json()
  if (!Array.isArray(elev) || elev.length !== plan.nodes.length) return null
  // The terrain model has 90 m cells, so ease the steps between them
  const alts = smoothByDistance(blend(plan, elev), samples.map((s) => s.d), 80)
  return coverage(alts.map((alt) => ({ alt })), 'alt') > 0.9 ? alts : null
}

/**
 * Heights for each sample: { alts, source: 'device' | 'terrain' | 'gps' } or null.
 * `samples` come from sampleByDistance. Terrain answers are cached on the
 * device by activity id, so opening a run again doesn't ask again.
 */
export async function elevationFor(activity, samples, { fetcher = (...a) => fetch(...a) } = {}) {
  if (samples.length < 2) return null
  const own = coverage(samples, 'alt') > 0.8
  const smoothOwn = () => smoothByDistance(samples.map((s) => s.alt), samples.map((s) => s.d), 120)
  if (own && activity?.source === 'import') return { alts: smoothByDistance(samples.map((s) => s.alt), samples.map((s) => s.d), 40), source: 'device' }

  const cached = activity?.id ? readCache(activity.id) : null
  if (cached?.alts?.length === samples.length) return { alts: cached.alts, source: 'terrain' }
  try {
    const alts = await terrain(samples, fetcher)
    if (alts) {
      const rounded = alts.map((a) => (a == null ? null : Math.round(a * 10) / 10))
      if (activity?.id) writeCache(activity.id, { alts: rounded, at: Date.now() })
      return { alts: rounded, source: 'terrain' }
    }
  } catch { /* offline or the lookup failed: fall through to the phone's heights */ }
  if (own) return { alts: smoothOwn(), source: 'gps' }
  return null
}
