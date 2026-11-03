// Ground heights for the elevation chart: POST /api/elevation looks up
// terrain heights (Copernicus 90 m model, through Open-Meteo) for corners of
// a 100 m grid the app sends. The app never sends the route itself, and the
// lookup service sees our server, not the runner. Answers are cached by
// batch, and fresh lookups are rate limited per address.
import { hit } from './db.js'

export const GRIDS = [0.001, 0.002, 0.004]
export const MAX_NODES = 1000
const BATCH = 100 // Open-Meteo takes up to 100 points a call

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const onGrid = (v, g) => Math.abs(v / g - Math.round(v / g)) < 1e-6

/** Checks the body; returns { grid, nodes } or an error message. */
export function readBody(body) {
  const grid = Number(body?.grid)
  if (!GRIDS.includes(grid)) return { error: 'Unknown grid size.' }
  const nodes = body?.nodes
  if (!Array.isArray(nodes) || !nodes.length) return { error: 'No points to look up.' }
  if (nodes.length > MAX_NODES) return { error: 'That route is too big to look up in one go.' }
  for (const n of nodes) {
    if (!Array.isArray(n) || n.length !== 2) return { error: 'Each point needs a latitude and longitude.' }
    const [lat, lng] = n
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: 'A point is out of range.' }
    if (!onGrid(lat, grid) || !onGrid(lng, grid)) return { error: 'Points must sit on the grid.' }
  }
  return { grid, nodes }
}

function lookupUrl(env, batch) {
  const lat = batch.map((n) => n[0]).join(',')
  const lng = batch.map((n) => n[1]).join(',')
  // A paid Open-Meteo key (for commercial use) goes to its customer endpoint
  return env.OPEN_METEO_KEY
    ? `https://customer-api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}&apikey=${encodeURIComponent(env.OPEN_METEO_KEY)}`
    : `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`
}

export async function handleElevation(req, env, { fetcher = fetch, cache = globalThis.caches?.default } = {}) {
  const body = await req.json().catch(() => null)
  const parsed = readBody(body)
  if (parsed.error) return json({ error: parsed.error, code: 'bad_request' }, 400)
  const { nodes } = parsed

  const out = []
  let limited = false
  for (let i = 0; i < nodes.length; i += BATCH) {
    const batch = nodes.slice(i, i + BATCH)
    const key = new Request(`https://elevation.foothold.cache/${await sha(JSON.stringify(batch))}.json`)
    const cached = cache ? await cache.match(key) : null
    if (cached) { out.push(...(await cached.json()).elevation); continue }

    // Only fresh lookups count towards the limit, once per request
    if (!limited) {
      const ip = req.headers.get('cf-connecting-ip') || 'unknown'
      const r = await hit(env, 'elevation', ip)
      if (!r.ok) return json({ error: 'Too many height lookups for now. Try again a bit later.', code: 'rate_limited' }, 429, { 'retry-after': String(r.retryAfter || 600) })
      limited = true
    }
    const res = await fetcher(lookupUrl(env, batch))
    if (!res.ok) {
      console.error('elevation', res.status) // never log the points
      return json({ error: "Heights aren't available right now.", code: 'elevation_failed' }, 502)
    }
    const data = await res.json().catch(() => null)
    const elevation = Array.isArray(data?.elevation) && data.elevation.length === batch.length
      ? data.elevation.map((e) => (Number.isFinite(e) ? Math.round(e * 10) / 10 : null))
      : null
    if (!elevation) return json({ error: "Heights aren't available right now.", code: 'elevation_failed' }, 502)
    if (cache) await cache.put(key, new Response(JSON.stringify({ elevation }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=2592000' } }))
    out.push(...elevation)
  }
  return json({ elev: out })
}
