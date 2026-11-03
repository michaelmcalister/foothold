// Run stats for the end of an activity: the track sampled by distance for the
// elevation, pace and heart rate charts, splits per kilometre with the height
// change, and the summary numbers (elapsed and stopped time, fastest km,
// climb, highest point, heart rate, cadence). Pure functions, unit tested.
import { distance, climb } from './engine/geo.js'
import { bestEfforts } from './engine/bests.js'

const num = (v) => (Number.isFinite(v) ? v : null)

/** The track with the distance covered so far on every point (metres, `d`). */
export function withDistance(track) {
  const out = []
  let d = 0
  for (const p of track || []) {
    if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) continue
    if (out.length) d += distance(out[out.length - 1], p)
    out.push({ ...p, d })
  }
  return out
}

// A value between two points, or the nearer one when only one side has it
function mix(a, b, f) {
  if (a == null) return f >= 0.5 ? b : null
  if (b == null) return f < 0.5 ? a : null
  return a + (b - a) * f
}

/**
 * `n` points evenly spaced by distance, each { d, lat, lng, t, alt, hr, cad }
 * interpolated from the two fixes either side. Charts and the height lookup
 * use these, so a 2-hour ride costs the same to draw as a 2 km walk.
 */
export function sampleByDistance(pts, n = 240) {
  if (pts.length < 2) return []
  const total = pts[pts.length - 1].d
  if (!(total > 0)) return []
  const out = []
  let j = 1
  for (let i = 0; i < n; i++) {
    const d = (total * i) / (n - 1)
    while (j < pts.length - 1 && pts[j].d < d) j++
    const a = pts[j - 1]
    const b = pts[j]
    const seg = b.d - a.d
    const f = seg > 0 ? Math.min(1, Math.max(0, (d - a.d) / seg)) : 0
    out.push({
      d,
      lat: a.lat + (b.lat - a.lat) * f,
      lng: a.lng + (b.lng - a.lng) * f,
      t: mix(num(a.t), num(b.t), f),
      alt: mix(num(a.alt), num(b.alt), f),
      hr: mix(num(a.hr), num(b.hr), f),
      cad: mix(num(a.cad), num(b.cad), f),
    })
  }
  return out
}

/** How many of the points carry a value for `key` (0 to 1). */
export const coverage = (pts, key) => (pts.length ? pts.filter((p) => Number.isFinite(p[key])).length / pts.length : 0)

/** A centred moving average over `windowM` metres. Gaps (null) stay gaps. */
export function smoothByDistance(values, ds, windowM) {
  const half = windowM / 2
  const out = []
  let lo = 0
  let hi = 0
  let sum = 0
  let cnt = 0
  for (let i = 0; i < values.length; i++) {
    while (hi < values.length && ds[hi] <= ds[i] + half) {
      if (Number.isFinite(values[hi])) { sum += values[hi]; cnt++ }
      hi++
    }
    while (ds[lo] < ds[i] - half) {
      if (Number.isFinite(values[lo])) { sum -= values[lo]; cnt-- }
      lo++
    }
    out.push(Number.isFinite(values[i]) && cnt ? sum / cnt : null)
  }
  return out
}

/**
 * Pace (seconds per km) at each sample, over the last `windowM` metres so a
 * single wobbly fix doesn't spike the line. Standing still shows as a gap,
 * not as a pace of 40 minutes per km.
 */
export function paceSeries(samples, { windowM = 250, slowest = 1200 } = {}) {
  // A stretch between two samples slower than `slowest` is a stop (lights, a
  // drink). Any window that holds one shows as a gap rather than averaging it in.
  const stopUpTo = [0]
  for (let k = 1; k < samples.length; k++) {
    const dd = samples[k].d - samples[k - 1].d
    const dt = samples[k].t != null && samples[k - 1].t != null ? (samples[k].t - samples[k - 1].t) / 1000 : null
    stopUpTo.push(stopUpTo[k - 1] + (dd > 0 && dt != null && dt / (dd / 1000) > slowest ? 1 : 0))
  }
  const out = []
  let j = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    while (j < i && samples[j + 1].d <= s.d - windowM) j++
    const from = samples[j]
    const dd = s.d - from.d
    const dt = s.t != null && from.t != null ? (s.t - from.t) / 1000 : null
    if (i === 0 || dd < windowM * 0.5 || !(dt > 0) || stopUpTo[i] > stopUpTo[j]) { out.push(null); continue }
    const p = dt / (dd / 1000)
    out.push(p <= slowest ? p : null)
  }
  // The first stretch has no window behind it yet: borrow the first real value
  const first = out.find((v) => v != null)
  return out.map((v, i) => (v == null && first != null && samples[i].d < windowM ? first : v))
}

/**
 * Splits per kilometre: { n, distM, s, pace, elevDelta, hr, partial }.
 * The last piece shows too when it's at least 100 m, flagged partial.
 * `alts` (optional, one per sample in `samples`) gives the height change.
 */
export function kmSplits(pts, { samples = null, alts = null } = {}) {
  if (pts.length < 2 || !Number.isFinite(pts[0].t)) return []
  const total = pts[pts.length - 1].d
  const altAt = (d) => {
    if (!samples?.length || !alts) return null
    let k = 0
    while (k < samples.length - 1 && samples[k + 1].d <= d) k++
    const a = alts[k]
    const b = alts[Math.min(k + 1, samples.length - 1)]
    const seg = (samples[k + 1]?.d ?? samples[k].d) - samples[k].d
    const f = seg > 0 ? (d - samples[k].d) / seg : 0
    return mix(num(a), num(b), Math.min(1, Math.max(0, f)))
  }
  const timeAt = (i, d) => {
    const a = pts[i - 1]
    const b = pts[i]
    const seg = b.d - a.d
    return a.t + (b.t - a.t) * (seg > 0 ? (d - a.d) / seg : 1)
  }
  const out = []
  let startT = pts[0].t
  let startD = 0
  let next = 1000
  let hrSum = 0
  let hrN = 0
  const close = (endT, endD, partial) => {
    const s = (endT - startT) / 1000
    const distM = endD - startD
    const a0 = altAt(startD)
    const a1 = altAt(endD)
    out.push({
      n: out.length + 1,
      distM: Math.round(distM),
      s: Math.round(s * 10) / 10,
      pace: distM > 0 ? s / (distM / 1000) : null,
      elevDelta: a0 != null && a1 != null ? Math.round(a1 - a0) : null,
      hr: hrN ? Math.round(hrSum / hrN) : null,
      partial,
    })
    hrSum = 0
    hrN = 0
  }
  for (let i = 1; i < pts.length; i++) {
    if (Number.isFinite(pts[i].hr)) { hrSum += pts[i].hr; hrN++ }
    while (pts[i].d >= next) {
      const t = timeAt(i, next)
      close(t, next, false)
      startT = t
      startD = next
      next += 1000
    }
  }
  if (total - startD >= 100) close(pts[pts.length - 1].t, total, true)
  return out
}

/** Average and highest heart rate, or null when the track has none. */
export function heartRate(pts) {
  const hs = pts.map((p) => p.hr).filter(Number.isFinite)
  if (!hs.length) return null
  return { avg: Math.round(hs.reduce((s, h) => s + h, 0) / hs.length), max: Math.max(...hs) }
}

/**
 * Average cadence in steps a minute, or null. Some watches count one foot
 * only (around 85), so a running figure under 120 is doubled. Rides keep
 * their pedal rpm as is.
 */
export function cadence(pts, mode = 'run') {
  const cs = pts.map((p) => p.cad).filter((c) => Number.isFinite(c) && c > 0)
  if (cs.length < 10) return null
  const avg = cs.reduce((s, c) => s + c, 0) / cs.length
  return Math.round(mode !== 'ride' && avg < 120 ? avg * 2 : avg)
}

/** Heights summary from one height per sample: gain, loss, highest, lowest. */
export function heights(alts) {
  const xs = (alts || []).filter(Number.isFinite)
  if (xs.length < 2) return null
  return { ...climb(xs), high: Math.round(Math.max(...xs)), low: Math.round(Math.min(...xs)) }
}

/**
 * The numbers for the stats grid. Anything the track can't support comes
 * back null and the screen leaves it out.
 */
export function runSummary({ activity, pts, alts = null }) {
  const mode = activity?.mode || 'run'
  const first = pts[0]?.t
  const last = pts[pts.length - 1]?.t
  const elapsedS = Number.isFinite(first) && Number.isFinite(last) ? Math.round((last - first) / 1000) : activity?.durationS ?? null
  const movingS = activity?.movingS ?? null
  const stoppedS = elapsedS != null && movingS != null ? Math.max(0, elapsedS - Math.round(movingS)) : null
  const bests = mode === 'ride' ? {} : bestEfforts(pts, mode)
  return {
    elapsedS,
    movingS,
    stoppedS,
    fastestKmS: bests['1k'] ?? null,
    heights: heights(alts),
    heartRate: heartRate(pts),
    cadence: cadence(pts, mode),
  }
}
