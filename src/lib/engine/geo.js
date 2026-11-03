// Geometry helpers for GPS tracks. A track point is { lat, lng, t } where t is
// epoch milliseconds, plus optional alt, acc (metres), hr (bpm) and cad (spm).

const R = 6371008.8 // mean Earth radius in metres

export const toRad = (d) => (d * Math.PI) / 180

export function distance(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

export function pathLength(points, from = 0, to = points.length - 1) {
  let d = 0
  for (let i = from + 1; i <= to; i++) d += distance(points[i - 1], points[i])
  return d
}

// Drop points with poor accuracy, duplicates and out-of-order timestamps.
export function cleanTrack(points, { maxAccuracy = 40 } = {}) {
  const out = []
  for (const p of points || []) {
    if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) continue
    if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) continue
    if (p.acc != null && p.acc > maxAccuracy) continue
    const last = out[out.length - 1]
    if (last && p.t != null && last.t != null && p.t <= last.t) continue
    if (last && last.lat === p.lat && last.lng === p.lng) continue
    out.push(p)
  }
  return out
}

// Keep one point roughly every `step` metres. Loop detection works on this.
export function resample(points, step = 10) {
  if (points.length < 2) return points.slice()
  const out = [points[0]]
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    acc += distance(points[i - 1], points[i])
    if (acc >= step) {
      out.push(points[i])
      acc = 0
    }
  }
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1])
  return out
}

// Area of a [lng, lat] ring in square metres (equirectangular, fine at suburb scale).
export function ringArea(ring) {
  if (ring.length < 3) return 0
  const lat0 = toRad(ring.reduce((s, p) => s + p[1], 0) / ring.length)
  const kx = R * Math.cos(lat0) * (Math.PI / 180)
  const ky = R * (Math.PI / 180)
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * kx * (ring[i][1] * ky) - ring[i][0] * kx * (ring[j][1] * ky)
  }
  return Math.abs(a / 2)
}

export function summarise(points) {
  if (!points.length) return { distanceM: 0, durationS: 0, movingS: 0, paceSPerKm: null, elevGainM: 0 }
  const distanceM = pathLength(points)
  const durationS = points[0].t != null ? Math.max(0, (points[points.length - 1].t - points[0].t) / 1000) : 0
  let movingS = 0
  let elevGainM = 0
  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].t - points[i - 1].t) / 1000
    const d = distance(points[i - 1], points[i])
    if (dt > 0 && d / dt > 0.5) movingS += dt
  }
  elevGainM = climb(points.map((p) => p.alt)).gain
  const paceSPerKm = distanceM > 50 && movingS > 0 ? movingS / (distanceM / 1000) : null
  return { distanceM, durationS, movingS, paceSPerKm, elevGainM: Math.round(elevGainM) }
}

// Metres climbed and descended. Heights wobble by a few metres from fix to
// fix (GPS most of all), so a change only counts once it passes `threshold`;
// adding up every wobble would turn a flat park loop into a hill session.
export function climb(alts, threshold = 3) {
  let gain = 0
  let loss = 0
  let ref = null
  for (const a of alts || []) {
    if (!Number.isFinite(a)) continue
    if (ref == null) { ref = a; continue }
    if (a - ref >= threshold) { gain += a - ref; ref = a }
    else if (ref - a >= threshold) { loss += ref - a; ref = a }
  }
  return { gain: Math.round(gain), loss: Math.round(loss) }
}

export function bbox(points) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return [minLng, minLat, maxLng, maxLat]
}

// Move a point by metres east and north. Used by the demo world and tests.
export function offset({ lat, lng }, eastM, northM) {
  return {
    lat: lat + (northM / R) * (180 / Math.PI),
    lng: lng + (eastM / (R * Math.cos(toRad(lat)))) * (180 / Math.PI),
  }
}
