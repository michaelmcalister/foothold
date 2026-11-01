// Synthetic tracks for the demo world and the "simulate a run" button,
// plus GPX import for runs recorded on a watch or another app.

import { offset } from './engine/geo.js'

// Seeded random so the demo world is the same every time for a place.
export function rng(seed) {
  let s = typeof seed === 'number' ? seed : [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A wobbly loop around a centre, like a real run around a few blocks.
// perimeterKm sets the size; kmh the speed. Points are spaced evenly in
// distance (one every 2 seconds at that speed), like a real GPS watch.
export function loopTrack({ centre, perimeterKm = 3, kmh = 10.5, startAt = Date.now(), seed = 1, stretch = 1, rotate = 0 }) {
  const rand = rng(seed)
  const rx = ((perimeterKm * 1000) / (2 * Math.PI)) * Math.sqrt(stretch)
  const ry = (perimeterKm * 1000) / (2 * Math.PI) / Math.sqrt(stretch)
  const wobble = Array.from({ length: 5 }, () => rand() * 0.1)
  const phase = Array.from({ length: 5 }, () => rand() * Math.PI * 2)
  const cr = Math.cos(rotate), sr = Math.sin(rotate)

  // 1. Dense outline in local metres
  const N = 720
  const outline = []
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2
    let r = 1
    for (let w = 0; w < wobble.length; w++) r += wobble[w] * Math.sin((w + 2) * a + phase[w])
    // Square it off a little: suburban streets are a grid
    const sx = Math.cos(a), sy = Math.sin(a)
    const gx = Math.sign(sx) * Math.pow(Math.abs(sx), 0.7)
    const gy = Math.sign(sy) * Math.pow(Math.abs(sy), 0.7)
    const x = gx * rx * r, y = gy * ry * r
    outline.push([x * cr - y * sr, x * sr + y * cr])
  }
  // 2. Walk it at a steady speed with a little pace variation
  const step = (kmh / 3.6) * 2
  const pts = []
  let t = startAt
  let seg = 0, along = 0
  let [px, py] = outline[0]
  const push = (x, y) => {
    const p = offset(centre, x + (rand() - 0.5) * 3, y + (rand() - 0.5) * 3)
    pts.push({ lat: p.lat, lng: p.lng, t, acc: 5 })
    t += 2000
  }
  push(px, py)
  while (seg < outline.length - 1) {
    const want = step * (0.9 + rand() * 0.2)
    along = 0
    while (along < want && seg < outline.length - 1) {
      const [nx, ny] = outline[seg + 1]
      const d = Math.hypot(nx - px, ny - py)
      if (along + d <= want) { along += d; px = nx; py = ny; seg++ }
      else { const f = (want - along) / d; px += (nx - px) * f; py += (ny - py) * f; along = want }
    }
    push(px, py)
  }
  // Finish where we started (the loop closes)
  push(outline[0][0], outline[0][1])
  return pts
}

// Parse a GPX file (Garmin, COROS, Strava exports) into track points.
export function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error("That file isn't a GPX file we can read.")
  const pts = []
  for (const el of doc.querySelectorAll('trkpt, rtept')) {
    const lat = parseFloat(el.getAttribute('lat'))
    const lng = parseFloat(el.getAttribute('lon'))
    const time = el.querySelector('time')?.textContent
    const ele = el.querySelector('ele')?.textContent
    const hr = el.getElementsByTagNameNS('*', 'hr')[0]?.textContent
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    pts.push({ lat, lng, t: time ? Date.parse(time) : null, alt: ele ? parseFloat(ele) : undefined, hr: hr ? parseInt(hr, 10) : undefined })
  }
  if (!pts.length) throw new Error('No GPS points found in that file.')
  if (pts.some((p) => !Number.isFinite(p.t))) throw new Error('That file has no timestamps, so we can’t check pace. Export the activity with times included.')
  const type = doc.querySelector('trk > type')?.textContent?.toLowerCase() || ''
  const mode = /ride|cycl|bik/.test(type) ? 'ride' : /walk|hik/.test(type) ? 'walk' : 'run'
  return { points: pts, mode }
}

export function toGpx(points, name = 'Foothold activity') {
  const pts = points.map((p) => `<trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">${p.alt != null ? `<ele>${p.alt}</ele>` : ''}<time>${new Date(p.t).toISOString()}</time></trkpt>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Foothold" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name><trkseg>${pts}</trkseg></trk></gpx>`
}
