// Input checks for what players send: GPS points, privacy zones and map boxes.
import { DAY, MAX_POINTS, bad, isNum } from './http.js'


export function cleanPoints(points) {
  if (!Array.isArray(points)) bad('Send the activity as a list of GPS points.')
  if (points.length < 10) bad('That activity is too short to save.')
  if (points.length > MAX_POINTS) bad(`That activity has more than ${MAX_POINTS.toLocaleString('en-AU')} points. Split it into shorter ones.`)
  const tMin = Date.UTC(2015, 0, 1)
  const tMax = Date.now() + DAY
  const out = new Array(points.length)
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const where = `Point ${i + 1}`
    if (!p || typeof p !== 'object') bad(`${where} isn't a GPS point.`)
    if (!isNum(p.lat, -90, 90) || !isNum(p.lng, -180, 180)) bad(`${where} has a latitude or longitude out of range.`)
    if (!isNum(p.t, tMin, tMax)) bad(`${where} has a time that isn't epoch milliseconds between 2015 and now.`)
    const q = { lat: p.lat, lng: p.lng, t: p.t }
    if (p.alt != null) { if (!isNum(p.alt, -500, 9000)) bad(`${where} has an altitude out of range.`); q.alt = p.alt }
    if (p.acc != null) { if (!isNum(p.acc, 0, 100000)) bad(`${where} has an accuracy out of range.`); q.acc = p.acc }
    if (p.hr != null) { if (!isNum(p.hr, 20, 250)) bad(`${where} has a heart rate out of range.`); q.hr = p.hr }
    if (p.cad != null) { if (!isNum(p.cad, 0, 300)) bad(`${where} has a cadence out of range.`); q.cad = p.cad }
    out[i] = q
  }
  return out
}

export function cleanZones(zones) {
  if (!Array.isArray(zones)) bad('Privacy zones must be a list.')
  if (zones.length > 5) bad('You can have up to five privacy zones.')
  return zones.map((z) => {
    if (!z || !isNum(z.lat, -90, 90) || !isNum(z.lng, -180, 180)) bad('Each privacy zone needs a valid latitude and longitude.')
    const radiusM = z.radiusM == null ? 400 : z.radiusM
    if (!isNum(radiusM, 100, 2000)) bad('A privacy zone radius must be between 100 and 2000 metres.')
    return { lat: z.lat, lng: z.lng, radiusM: Math.round(radiusM), label: String(z.label || 'Private').trim().slice(0, 30) || 'Private' }
  })
}

export function bboxOf(points) {
  let w = 180, s = 90, e = -180, n = -90
  for (const p of points) {
    if (p.lng < w) w = p.lng
    if (p.lng > e) e = p.lng
    if (p.lat < s) s = p.lat
    if (p.lat > n) n = p.lat
  }
  return [w, s, e, n]
}
export function pad([w, s, e, n], m) {
  const dLat = m / 111320
  const dLng = m / (111320 * Math.max(0.05, Math.cos(((s + n) / 2) * Math.PI / 180)))
  return [w - dLng, s - dLat, e + dLng, n + dLat]
}
export function parseBbox(v) {
  if (v == null || v === '') return null
  const b = String(v).split(',').map(Number)
  if (b.length !== 4 || !isNum(b[0], -180, 180) || !isNum(b[2], -180, 180) || !isNum(b[1], -90, 90) || !isNum(b[3], -90, 90) || b[0] >= b[2] || b[1] >= b[3]) {
    bad('bbox must be west,south,east,north in degrees.')
  }
  return b
}

/**
 * A fingerprint of a track's line: 24 points spaced evenly along its length,
 * to about 10 m, hashed. The same file uploaded twice matches; two runs of
 * the same loop on different days don't (GPS never lands twice in the same
 * spots). Times aren't part of it, so shifting a copy in time still matches.
 */
export async function trackPrint(points) {
  let total = 0
  const at = [0]
  for (let i = 1; i < points.length; i++) {
    const dLat = (points[i].lat - points[i - 1].lat) * 111320
    const dLng = (points[i].lng - points[i - 1].lng) * 111320 * Math.cos((points[i].lat * Math.PI) / 180)
    total += Math.hypot(dLat, dLng)
    at.push(total)
  }
  const marks = []
  let j = 0
  for (let k = 0; k <= 24; k++) {
    const want = (total * k) / 24
    while (j < at.length - 1 && at[j] < want) j++
    marks.push(`${points[j].lat.toFixed(4)},${points[j].lng.toFixed(4)}`)
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(marks.join(';')))
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('')
}
