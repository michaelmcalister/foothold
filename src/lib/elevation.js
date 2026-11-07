// Heights along a route for the elevation chart. Where they come from, best first:
//   1. an imported watch file with its own heights (often a barometer),
//   2. terrain heights from the Foothold server (POST /api/elevation),
//   3. the phone's GPS heights, smoothed (they drift by 10 m or more),
//   4. nothing, and the chart says so.
// For terrain heights the app sends only corners of a 100 m grid around the
// route, never the route itself, then blends the four corners around each point.
import { coverage, smoothByDistance } from './runStats.js'
import { gridPlan, blend } from './terrain.js'

// The grid maths lives in terrain.js so the server can use it too
export { GRIDS, MAX_NODES, gridPlan, blend } from './terrain.js'

const RAW = import.meta.env.VITE_API_URL || ''
const API = RAW === 'self' ? '' : RAW.replace(/\/$/, '')
const CACHE_PREFIX = 'fh-elev3:' // bump when the heights change shape
const CACHE_KEEP = 30

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
