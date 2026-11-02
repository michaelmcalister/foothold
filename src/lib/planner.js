// Route planner logic: turns tapped waypoints into a line, checks it closes a loop the engine would count, and previews which hexes it would take.
import { distance, ringArea, toRad } from './engine/geo.js'
import { findLoops, LOOP_DEFAULTS } from './engine/loops.js'
import { cellsForLoops, effortGain, applyClaim, MODES } from './engine/territory.js'

// Usual pace when there is no history to go on, in seconds per km
export const FALLBACK_PACE = { run: 360, walk: 720, ride: 150 }
export const MAX_ROUTE_POINTS = 2000
export const MAX_ROUTES = 200

const ll = ([lng, lat]) => ({ lat, lng })
const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1]

// The line you'd run: the waypoints, back to the first one when the loop is closed.
export function routeLine(waypoints, closed = true) {
  const pts = (waypoints || []).map((p) => [p[0], p[1]])
  if (closed && pts.length >= 3 && !same(pts[0], pts[pts.length - 1])) pts.push(pts[0].slice())
  return pts
}

export function lineLength(line) {
  let d = 0
  for (let i = 1; i < line.length; i++) d += distance(ll(line[i - 1]), ll(line[i]))
  return d
}

// Straight segments between taps, filled in every few metres so the loop
// finder sees it the way it sees a GPS track.
export function densify(line, stepM = LOOP_DEFAULTS.step / 2) {
  if (line.length < 2) return line.map(ll)
  const out = [ll(line[0])]
  for (let i = 1; i < line.length; i++) {
    const a = ll(line[i - 1])
    const b = ll(line[i])
    const n = Math.max(1, Math.ceil(distance(a, b) / stepM))
    for (let k = 1; k <= n; k++) out.push({ lat: a.lat + ((b.lat - a.lat) * k) / n, lng: a.lng + ((b.lng - a.lng) * k) / n })
  }
  return out
}

// Your usual pace for a mode: the median of recent activities, or a sensible default.
export function usualPace(activities = [], mode = 'run') {
  const paces = activities
    .filter((a) => a && a.mode === mode && !a.rejected && Number.isFinite(a.paceSPerKm) && a.paceSPerKm > 0)
    .map((a) => a.paceSPerKm)
    .sort((x, y) => x - y)
  if (!paces.length) return FALLBACK_PACE[mode] ?? FALLBACK_PACE.run
  const mid = Math.floor(paces.length / 2)
  return paces.length % 2 ? paces[mid] : (paces[mid - 1] + paces[mid]) / 2
}

// Why a shape won't take ground, in plain words. Uses the same thresholds as findLoops.
function whyNot(waypoints, closed, line) {
  const o = LOOP_DEFAULTS
  if (waypoints.length < 3) return { code: 'few', text: 'Add a few more points to make a loop.' }
  const end = line[line.length - 1]
  if (!closed && distance(ll(line[0]), ll(end)) > o.closeM) {
    return { code: 'open', text: 'This route ends away from the start, so it won’t take ground. Turn on Close the loop, or finish back where you began.' }
  }
  const ring = routeLine(waypoints, true)
  const perim = lineLength(ring)
  if (perim < o.minPerimeterM) return { code: 'short', text: `This loop is ${Math.round(perim)} m. Loops need at least ${o.minPerimeterM} m to count, so make it a little bigger.` }
  const area = ringArea(ring)
  if (area < o.minAreaM2) return { code: 'small', text: 'This loop doesn’t hold much ground yet. Spread it out a little.' }
  if ((4 * Math.PI * area) / (perim * perim) < o.minCompactness) return { code: 'thin', text: 'This loop is very thin, like an out and back. Widen it so it holds ground.' }
  return { code: 'shape', text: 'This shape might not count as a loop. Try a rounder one.' }
}

// Everything the planner shows for a set of waypoints.
//   cells: Map h3 -> { owner, strength, lastVisit } for this mode
//   me: your user id; names: Map id -> { name, colour }
export function planRoute({ waypoints = [], closed = true, mode = 'run', paceSPerKm, cells = new Map(), me = null, names = new Map(), now = Date.now() } = {}) {
  const line = routeLine(waypoints, closed)
  const distanceM = lineLength(line)
  const pace = paceSPerKm || FALLBACK_PACE[mode] || FALLBACK_PACE.run
  const timeS = (distanceM / 1000) * pace
  const gain = effortGain({ distanceM, movingS: timeS, mode })
  const loops = line.length >= 4 ? findLoops(densify(line)) : []
  const out = { line, distanceM, timeS, paceSPerKm: pace, gain, loops: loops.map((l) => l.ring), counts: loops.length > 0, warning: null, capture: null }
  if (!out.counts) {
    if (waypoints.length) out.warning = whyNot(waypoints, closed, line)
    return out
  }
  const hexes = cellsForLoops(loops)
  // The same rule a real activity uses: applyClaim decides wild, yours, taken or held
  const { diff } = applyClaim(cells, hexes, me, gain, { now })
  const rivals = new Map()
  const rival = (id) => {
    if (!rivals.has(id)) {
      const p = names.get(id) || {}
      rivals.set(id, { id, name: p.name || 'Someone', colour: p.colour || '#888888', take: [], hold: [] })
    }
    return rivals.get(id)
  }
  for (const t of diff.taken) rival(t.from).take.push(t.h3)
  for (const h of diff.held) rival(h.owner).hold.push(h.h3)
  out.capture = {
    total: hexes.length,
    wild: diff.claimed,
    mine: diff.reinforced,
    rivals: [...rivals.values()]
      .map((r) => ({ ...r, total: r.take.length + r.hold.length, beats: r.hold.length === 0 }))
      .sort((a, b) => b.total - a.total),
  }
  return out
}

// One line per rival for the sheet, e.g. "12 of Sam's. You'd take them all."
export function rivalLine(r) {
  const head = `${r.total} of ${r.name}'s`
  if (!r.hold.length) return `${head}. Your effort beats their hold, so you'd take ${r.total === 1 ? 'it' : 'them'}.`
  if (!r.take.length) return `${head}. Their hold is stronger for now, so it weakens instead.`
  return `${head}. You'd take ${r.take.length}; the rest are stronger and weaken instead.`
}

// Hex shapes for the map preview, grouped by what would happen to them.
export function previewGroups(capture) {
  if (!capture) return []
  const groups = [
    { kind: 'wild', colour: '#2E55E6', hexes: capture.wild },
    { kind: 'mine', colour: '#2E55E6', hexes: capture.mine },
  ]
  for (const r of capture.rivals) {
    groups.push({ kind: 'take', colour: r.colour, hexes: r.take })
    groups.push({ kind: 'hold', colour: r.colour, hexes: r.hold })
  }
  return groups.filter((g) => g.hexes.length)
}

// How far a point is from the planned line, in metres.
export function offRouteM(point, line) {
  if (!point || !line || !line.length) return null
  if (line.length === 1) return distance(point, ll(line[0]))
  const kx = 6371008.8 * Math.cos(toRad(point.lat)) * (Math.PI / 180)
  const ky = 6371008.8 * (Math.PI / 180)
  const xy = ([lng, lat]) => [(lng - point.lng) * kx, (lat - point.lat) * ky]
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = xy(line[i - 1])
    const [bx, by] = xy(line[i])
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return best
}

// Points with times at your usual pace, for toGpx (watches want times on a course).
export function routeTrackPoints(line, { paceSPerKm = FALLBACK_PACE.run, startAt = Date.now() } = {}) {
  let along = 0
  return line.map((p, i) => {
    if (i) along += distance(ll(line[i - 1]), ll(p))
    return { lat: p[1], lng: p[0], t: Math.round(startAt + (along / 1000) * paceSPerKm * 1000) }
  })
}

export const escapeXml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])

// Checks a route before it is saved. Same rules on the phone and the server.
// Throws an Error with a plain message when something is wrong.
export function cleanRoute(body) {
  const b = body && typeof body === 'object' ? body : {}
  const name = typeof b.name === 'string' ? b.name.replace(/\s+/g, ' ').trim().slice(0, 60) : ''
  const mode = b.mode == null ? 'run' : b.mode
  if (!MODES.includes(mode)) throw new Error('Mode must be run, walk or ride.')
  const ring = b.ring
  if (!Array.isArray(ring) || ring.length < 2) throw new Error('A route needs at least two points.')
  if (ring.length > MAX_ROUTE_POINTS) throw new Error(`Keep a route under ${MAX_ROUTE_POINTS} points.`)
  const clean = []
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2) throw new Error('Each point must be [longitude, latitude].')
    const [lng, lat] = p
    if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new Error('Each point must be [longitude, latitude].')
    }
    clean.push([Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6])
  }
  const distanceM = Math.round(lineLength(clean))
  if (distanceM > 300000) throw new Error('That route is longer than 300 km. Try a shorter one.')
  return { name: name || 'My route', mode, ring: clean, distanceM }
}
