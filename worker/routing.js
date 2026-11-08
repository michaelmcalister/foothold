// Paths between points for the route planner: POST /api/route snaps a
// drawn route to footpaths and streets you can run (or roads and bike paths
// for rides). Providers, first one set up wins:
//   ORS_API_KEY        Openrouteservice (free tier, OpenStreetMap paths)
//   GOOGLE_ROUTES_KEY  Google Routes API (a server key, not the browser maps key)
//   neither            the FOSSGIS OpenStreetMap router, fine for testing only
// Answers are cached, fresh lookups are rate limited per address, and a route
// that would take a ferry is refused (you can't run across the harbour).
// With { steps: true } the answer also has turn by turn steps, the same shape
// from every provider: { turn, name, distanceM, at: [lng, lat] }.
import { hit } from './db.js'
import { decodePolyline } from '../src/lib/engine/strongholds.js'

export const MAX_POINTS = 25
export const MAX_SPAN_M = 20000 // between two points in a row
const PROFILES = {
  ors: { run: 'foot-walking', walk: 'foot-walking', ride: 'cycling-regular' },
  google: { run: 'WALK', walk: 'WALK', ride: 'BICYCLE' },
  osrm: { run: ['routed-foot', 'foot'], walk: ['routed-foot', 'foot'], ride: ['routed-bike', 'bike'] },
}

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

function metres(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export const providerFor = (env) => (env.ORS_API_KEY ? 'ors' : env.GOOGLE_ROUTES_KEY ? 'google' : 'osrm')

// ---- turn by turn steps, made the same shape whichever router answered ----
const ORS_TURNS = { 0: 'left', 1: 'right', 2: 'sharp left', 3: 'sharp right', 4: 'slight left', 5: 'slight right', 6: 'straight', 7: 'roundabout', 8: 'roundabout', 9: 'uturn', 10: 'arrive', 11: 'depart', 12: 'keep left', 13: 'keep right' }
const cleanName = (n) => (n && n !== '-' ? String(n).slice(0, 80) : '')

export function orsSteps(feature) {
  const line = feature.geometry.coordinates
  const out = []
  for (const seg of feature.properties?.segments || []) {
    for (const st of seg.steps || []) {
      const at = line[st.way_points?.[0] ?? 0] || line[0]
      out.push({ turn: ORS_TURNS[st.type] || 'straight', name: cleanName(st.name), distanceM: Math.round(st.distance || 0), at: [at[0], at[1]] })
    }
  }
  return out
}

export function osrmSteps(route) {
  const out = []
  for (const leg of route.legs || []) {
    for (const st of leg.steps || []) {
      const m = st.maneuver || {}
      let turn = m.modifier || 'straight'
      if (m.type === 'depart' || m.type === 'arrive') turn = m.type
      else if (m.type === 'roundabout' || m.type === 'rotary') turn = 'roundabout'
      else if (m.type === 'fork' || m.type === 'merge') turn = /left/.test(m.modifier || '') ? 'keep left' : /right/.test(m.modifier || '') ? 'keep right' : 'straight'
      else if (m.type === 'new name' || m.type === 'continue') turn = /left|right|uturn/.test(m.modifier || '') ? m.modifier : 'straight'
      out.push({ turn, name: cleanName(st.name), distanceM: Math.round(st.distance || 0), at: m.location || [0, 0] })
    }
  }
  return out
}

const GOOGLE_TURNS = {
  DEPART: 'depart', TURN_LEFT: 'left', TURN_RIGHT: 'right', TURN_SLIGHT_LEFT: 'slight left', TURN_SLIGHT_RIGHT: 'slight right',
  TURN_SHARP_LEFT: 'sharp left', TURN_SHARP_RIGHT: 'sharp right', UTURN_LEFT: 'uturn', UTURN_RIGHT: 'uturn', STRAIGHT: 'straight',
  NAME_CHANGE: 'straight', MERGE: 'straight', FORK_LEFT: 'keep left', FORK_RIGHT: 'keep right', RAMP_LEFT: 'keep left', RAMP_RIGHT: 'keep right',
  ROUNDABOUT_LEFT: 'roundabout', ROUNDABOUT_RIGHT: 'roundabout', ROUNDABOUT_CLOCKWISE: 'roundabout', ROUNDABOUT_COUNTERCLOCKWISE: 'roundabout',
}
export function googleSteps(route) {
  const out = []
  for (const leg of route.legs || []) {
    for (const st of leg.steps || []) {
      const ni = st.navigationInstruction || {}
      const name = /onto ([^,]+)/i.exec(ni.instructions || '')?.[1] || /on ([^,]+)/i.exec(ni.instructions || '')?.[1] || ''
      const ll = st.startLocation?.latLng || {}
      out.push({ turn: GOOGLE_TURNS[ni.maneuver] || 'straight', name: cleanName(name), distanceM: Math.round(st.distanceMeters || 0), at: [ll.longitude || 0, ll.latitude || 0] })
    }
  }
  if (out.length) out.push({ turn: 'arrive', name: '', distanceM: 0, at: out[0].at }) // Google has no arrive step
  return out
}

/** Checks the body; returns { mode, points } or { error }. */
export function readRouteBody(body) {
  const mode = ['run', 'walk', 'ride'].includes(body?.mode) ? body.mode : 'run'
  const pts = body?.points
  if (!Array.isArray(pts) || pts.length < 2) return { error: 'A route needs at least two points.' }
  if (pts.length > MAX_POINTS) return { error: `Up to ${MAX_POINTS} points at a time.` }
  const points = []
  for (const p of pts) {
    if (!Array.isArray(p) || p.length !== 2) return { error: 'Each point needs a longitude and latitude.' }
    const [lng, lat] = p.map(Number)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: 'A point is out of range.' }
    points.push([Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5])
  }
  for (let i = 1; i < points.length; i++) {
    if (metres(points[i - 1], points[i]) > MAX_SPAN_M) return { error: 'Two points are too far apart. Add one in between.' }
  }
  return { mode, points, steps: body?.steps === true }
}

class NoPath extends Error {}

async function viaOrs(env, fetcher, mode, points, steps) {
  const res = await fetcher(`https://api.openrouteservice.org/v2/directions/${PROFILES.ors[mode]}/geojson`, {
    method: 'POST',
    headers: { authorization: env.ORS_API_KEY, 'content-type': 'application/json', accept: 'application/geo+json' },
    body: JSON.stringify({ coordinates: points, instructions: !!steps, options: { avoid_features: ['ferries'] } }),
  })
  if (res.status === 404 || res.status === 400) throw new NoPath()
  if (!res.ok) throw new Error(`ors ${res.status}`)
  const f = (await res.json()).features?.[0]
  if (!f) throw new NoPath()
  return { line: f.geometry.coordinates.map(([x, y]) => [x, y]), distanceM: f.properties?.summary?.distance ?? null, steps: steps ? orsSteps(f) : null }
}

async function viaGoogle(env, fetcher, mode, points, steps) {
  const ll = ([lng, lat]) => ({ location: { latLng: { latitude: lat, longitude: lng } } })
  const res = await fetcher('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GOOGLE_ROUTES_KEY, 'x-goog-fieldmask': 'routes.polyline.encodedPolyline,routes.distanceMeters' + (steps ? ',routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.startLocation' : '') },
    body: JSON.stringify({ origin: ll(points[0]), destination: ll(points[points.length - 1]), intermediates: points.slice(1, -1).map(ll), travelMode: PROFILES.google[mode], routeModifiers: { avoidFerries: true } }),
  })
  if (!res.ok) throw new Error(`google ${res.status}`)
  const r = (await res.json()).routes?.[0]
  if (!r) throw new NoPath()
  return { line: decodePolyline(r.polyline.encodedPolyline).map((p) => [p.lng, p.lat]), distanceM: r.distanceMeters ?? null, steps: steps ? googleSteps(r) : null }
}

async function viaOsrm(env, fetcher, mode, points, steps) {
  const [host, profile] = PROFILES.osrm[mode]
  const res = await fetcher(`https://routing.openstreetmap.de/${host}/route/v1/${profile}/${points.map((p) => p.join(',')).join(';')}?overview=full&geometries=geojson&steps=true`, { headers: { 'user-agent': 'Foothold route planner' } })
  if (!res.ok) throw new Error(`osrm ${res.status}`)
  const j = await res.json()
  const r = j.routes?.[0]
  if (j.code !== 'Ok' || !r) throw new NoPath()
  if (r.legs.some((l) => l.steps.some((s) => s.mode === 'ferry'))) throw new NoPath()
  return { line: r.geometry.coordinates, distanceM: r.distance, steps: steps ? osrmSteps(r) : null }
}

const VIA = { ors: viaOrs, google: viaGoogle, osrm: viaOsrm }

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function handleRoute(req, env, { fetcher = fetch, cache = globalThis.caches?.default } = {}) {
  const parsed = readRouteBody(await req.json().catch(() => null))
  if (parsed.error) return json({ error: parsed.error, code: 'bad_request' }, 400)
  const { mode, points, steps } = parsed
  const provider = providerFor(env)
  const key = new Request(`https://route.foothold.cache/${provider}/${await sha(mode + (steps ? ':steps' : '') + JSON.stringify(points))}.json`)
  const cached = cache ? await cache.match(key) : null
  if (cached) return json(await cached.json())

  const r = await hit(env, 'route', req.headers.get('cf-connecting-ip') || 'unknown')
  if (!r.ok) return json({ error: 'Lots of route changes in a row. Give it a minute.', code: 'rate_limited' }, 429, { 'retry-after': String(r.retryAfter || 60) })
  let out
  try {
    out = await VIA[provider](env, fetcher, mode, points, steps)
  } catch (e) {
    if (e instanceof NoPath) return json({ error: "There's no path between those points.", code: 'no_path' }, 422)
    console.error('route', provider, e.message) // never log the points
    return json({ error: "Paths aren't available right now. Your route uses straight lines for now.", code: 'route_failed' }, 502)
  }
  const line = out.line.map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5])
  // Keep the ends exactly where they were drawn, so pieces join up
  line[0] = points[0]
  line[line.length - 1] = points[points.length - 1]
  const distanceM = out.distanceM ?? line.reduce((s, p, i) => s + (i ? metres(line[i - 1], p) : 0), 0)
  const body = { line, distanceM: Math.round(distanceM), provider }
  if (steps) body.steps = (out.steps || []).map((st) => ({ ...st, at: [Math.round(st.at[0] * 1e5) / 1e5, Math.round(st.at[1] * 1e5) / 1e5] }))
  if (cache) await cache.put(key, new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=604800' } }))
  return json(body)
}
