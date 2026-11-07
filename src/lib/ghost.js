// Ghost runs: race a past run of yours (it moves exactly as you did), or a
// route at a pace you choose. While you go, this works out where the ghost
// is, how far along its line you are, and how many seconds ahead or behind
// you are at the same point. Pure functions, unit tested.
import { distance } from './engine/geo.js'

/**
 * A ghost from timed points ({ lat, lng, t }) or, for a route with no times,
 * from points and a pace (seconds per km). Returns
 * { pts: [{ lat, lng, d, s }], totalM, totalS, label }.
 */
export function makeGhost(points, { paceSPerKm = null, label = 'your ghost' } = {}) {
  const src = (points || []).filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
  if (src.length < 2) return null
  const t0 = src[0].t
  const timed = !paceSPerKm && src.every((p) => Number.isFinite(p.t))
  const pts = []
  let d = 0
  for (let i = 0; i < src.length; i++) {
    if (i) d += distance(src[i - 1], src[i])
    const s = timed ? (src[i].t - t0) / 1000 : (d / 1000) * (paceSPerKm || 360)
    // time never runs backwards, even if a watch file hiccups
    pts.push({ lat: src[i].lat, lng: src[i].lng, d, s: Math.max(s, pts.length ? pts[pts.length - 1].s : 0) })
  }
  if (!(d > 50)) return null
  return { pts, totalM: d, totalS: pts[pts.length - 1].s, label }
}

const lerp = (a, b, f) => a + (b - a) * f

// The index of the last point at or before `value` of `key` (binary search)
function before(pts, key, value) {
  let lo = 0, hi = pts.length - 1
  if (value <= pts[0][key]) return 0
  if (value >= pts[hi][key]) return hi
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (pts[m][key] <= value) lo = m
    else hi = m
  }
  return lo
}

/** Where the ghost is after `elapsedS`: { lat, lng, d, done }. */
export function ghostAt(g, elapsedS) {
  const i = before(g.pts, 's', elapsedS)
  const a = g.pts[i], b = g.pts[Math.min(i + 1, g.pts.length - 1)]
  const span = b.s - a.s
  const f = span > 0 ? Math.min(1, Math.max(0, (elapsedS - a.s) / span)) : 0
  return { lat: lerp(a.lat, b.lat, f), lng: lerp(a.lng, b.lng, f), d: lerp(a.d, b.d, f), done: elapsedS >= g.totalS }
}

/** How long the ghost took to reach `d` metres along its line. */
export function ghostTimeAt(g, d) {
  const i = before(g.pts, 'd', d)
  const a = g.pts[i], b = g.pts[Math.min(i + 1, g.pts.length - 1)]
  const span = b.d - a.d
  const f = span > 0 ? Math.min(1, Math.max(0, (d - a.d) / span)) : 0
  return lerp(a.s, b.s, f)
}

/**
 * How far along the ghost's line you are, from where you are now. Searches
 * forward from `fromIdx` (the last match) so a loop that passes near its
 * own start doesn't jump to the finish. Returns { d, offM, idx }.
 */
export function progressAlong(g, here, fromIdx = 0, { lookAheadM = 400 } = {}) {
  const start = Math.max(0, fromIdx)
  const limit = g.pts[start].d + lookAheadM
  let best = { d: g.pts[start].d, offM: Infinity, idx: start }
  const kx = Math.cos((here.lat * Math.PI) / 180) * 111320
  const ky = 110540
  for (let i = start; i < g.pts.length - 1 && g.pts[i].d <= limit; i++) {
    const a = g.pts[i], b = g.pts[i + 1]
    const ax = (a.lng - here.lng) * kx, ay = (a.lat - here.lat) * ky
    const bx = (b.lng - here.lng) * kx, by = (b.lat - here.lat) * ky
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    const f = len2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0
    const off = Math.hypot(ax + f * dx, ay + f * dy)
    if (off < best.offM - 0.01) best = { d: lerp(a.d, b.d, f), offM: off, idx: i }
  }
  return best
}

/** Seconds ahead (positive) or behind (negative) the ghost at the same point. */
export const gapSeconds = (g, myD, elapsedS) => ghostTimeAt(g, myD) - elapsedS

/** What the voice coach says about the gap. */
export function gapLine(gapS, { label = 'your ghost' } = {}) {
  const s = Math.round(Math.abs(gapS))
  if (s < 3) return `Level with ${label}.`
  const amount = s >= 90 ? `${Math.round(s / 60)} ${Math.round(s / 60) === 1 ? 'minute' : 'minutes'}` : `${s} seconds`
  return gapS > 0 ? `${amount} ahead of ${label}.` : `${amount} behind ${label}. You've got this.`
}

/** The short label for the live strip: "12 s ahead", "8 s behind", "Level". */
export function gapShort(gapS) {
  const s = Math.round(Math.abs(gapS))
  if (s < 3) return 'Level'
  const v = s >= 90 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s} s`
  return gapS > 0 ? `${v} ahead` : `${v} behind`
}

/**
 * How a finished race went: did you reach the ghost's finish, and by how much
 * did you beat it (positive) or not. myS is your time to the ghost's finish.
 */
export function raceResult(g, { reachedEnd, myS }) {
  if (!reachedEnd) return { finished: false, text: `You stopped before the end of ${g.label}'s line. Next time.` }
  const diff = g.totalS - myS
  const s = Math.round(Math.abs(diff))
  const amount = s >= 90 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s} seconds`
  if (s < 2) return { finished: true, beat: false, diffS: diff, text: `A dead heat with ${g.label}. Same time to the second.` }
  return diff > 0
    ? { finished: true, beat: true, diffS: diff, text: `You beat ${g.label} by ${amount}.` }
    : { finished: true, beat: false, diffS: diff, text: `${g.label[0].toUpperCase() + g.label.slice(1)} got there ${amount} sooner. You'll have it next time.` }
}

/**
 * Past runs to race from near here: your own, same mode, starting within
 * `nearM` of where you are, best pace first.
 */
export function ghostChoices(activities, here, mode, { nearM = 300, limit = 5 } = {}) {
  return (activities || [])
    .filter((a) => a.mode === mode && !a.rejected && !a.simulated && a.start && distance(a.start, here) <= nearM && a.distanceM >= 500)
    .sort((a, b) => (a.paceSPerKm || 1e9) - (b.paceSPerKm || 1e9))
    .slice(0, limit)
}
