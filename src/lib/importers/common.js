// Shared helpers for the watch and app importers: cadence units, sport names and the final tidy up.

// Watches store running cadence per foot (strides per minute). Foothold shows
// steps per minute, so per-foot values are doubled. Rides stay in rpm.
export function toSpm(v, mode) {
  if (!Number.isFinite(v) || v <= 0) return undefined
  if (mode === 'ride') return Math.round(v)
  const perFoot = mode === 'walk' ? v < 75 : v < 125
  const spm = Math.round(perFoot ? v * 2 : v)
  return spm > 0 && spm <= 300 ? spm : undefined
}

// Turn a sport name from any app into a Foothold mode.
export function modeFromSport(sport) {
  const s = String(sport || '').toLowerCase()
  if (/ride|cycl|bik/.test(s)) return 'ride'
  if (/walk|hik/.test(s)) return 'walk'
  return 'run'
}

// Drop unusable points, fix cadence units and sort by time.
export function finish(raw, mode, format) {
  const points = []
  for (const p of raw) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng) || !Number.isFinite(p.t)) continue
    if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180 || (p.lat === 0 && p.lng === 0)) continue
    const q = { lat: p.lat, lng: p.lng, t: p.t }
    if (Number.isFinite(p.alt) && p.alt >= -500 && p.alt <= 9000) q.alt = Math.round(p.alt * 10) / 10
    if (Number.isFinite(p.hr) && p.hr >= 20 && p.hr <= 250) q.hr = Math.round(p.hr)
    const cad = p.cadRaw != null ? toSpm(p.cadRaw, mode) : undefined
    if (cad != null) q.cad = cad
    points.push(q)
  }
  if (!points.length) throw new Error("No GPS points found in that file. Indoor and treadmill sessions can't claim ground.")
  points.sort((a, b) => a.t - b.t)
  return { points, mode, startedAt: points[0].t, format }
}
