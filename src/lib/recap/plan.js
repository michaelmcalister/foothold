// Run recap planner: turns a recorded track into camera shots (fly in, follow
// the runner, orbit the ground taken, overview). Pure maths with no map code,
// so the same plan drives Google's 3D map or the MapLibre fallback.
// Cameras are { lat, lng, alt, heading, tilt, range }: look at lat/lng/alt
// from `range` metres away, `tilt` degrees from straight down, facing `heading`.
import { distance, resample, offset } from '../engine/index.js'

const toDeg = (r) => (r * 180) / Math.PI
const toRad = (d) => (d * Math.PI) / 180
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
const lerp = (a, b, f) => a + (b - a) * f

// How the camera behaves for each mode: rides cover more ground, so sit higher.
// Run camera is about 230 m up, above most city towers in the 3D map.
const FOLLOW = {
  run: { range: 420, tilt: 57, lookAheadM: 80 },
  walk: { range: 380, tilt: 58, lookAheadM: 60 },
  ride: { range: 620, tilt: 55, lookAheadM: 160 },
}

export function bearing(a, b) {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// Smallest signed turn from heading a to heading b, in degrees (-180..180)
export const turn = (a, b) => ((((b - a) % 360) + 540) % 360) - 180

// Gaussian smoothing of values spaced along a route by distance (metres)
export function smoothAlong(values, along, sigma) {
  if (!(sigma > 0)) return values.slice()
  const out = []
  let lo = 0
  for (let i = 0; i < values.length; i++) {
    while (along[lo] < along[i] - sigma * 2.5) lo++
    let sum = 0, wsum = 0
    for (let j = lo; j < values.length && along[j] <= along[i] + sigma * 2.5; j++) {
      const z = (along[j] - along[i]) / sigma
      const w = Math.exp(-0.5 * z * z)
      sum += values[j] * w
      wsum += w
    }
    out.push(sum / wsum)
  }
  return out
}

// Middle value, ignoring missing ones
function median(xs) {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  return v.length ? v[Math.floor(v.length / 2)] : null
}

/**
 * Build the recap for a track.
 *   points: [{ lat, lng, t?, alt? }] in order
 *   opts: { mode, hexRings: [[[lng,lat]...]], aspect: screen width / height }
 * Returns null when there is too little to show.
 */
export function planRecap(points, { mode = 'run', hexRings = [], aspect = 0.5 } = {}) {
  const raw = (points || []).filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
  if (raw.length < 2) return null
  const path = resample(raw, 8)
  const along = [0]
  for (let i = 1; i < path.length; i++) along.push(along[i - 1] + distance(path[i - 1], path[i]))
  const total = along[along.length - 1]
  if (total < 50) return null

  // Ground height to aim at. GPS height is close enough to stop the camera
  // ending up under a hill; flat country falls back to sea level.
  const alt = median(raw.map((p) => p.alt)) ?? 0

  // Middle of everything shown (track and hexes) and how far it spreads
  const all = [...path, ...hexRings.flat().map(([lng, lat]) => ({ lat, lng }))]
  const lats = all.map((p) => p.lat)
  const lngs = all.map((p) => p.lng)
  const centre = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 }
  const radius = Math.max(150, ...all.map((p) => distance(centre, p)))

  const follow = FOLLOW[mode] || FOLLOW.run
  // One clip length whatever the distance: longer runs just move faster
  const km = total / 1000
  // (slow enough for the 3D imagery to load as the camera moves)
  const followMs = Math.round(clamp(10000 + km * 1800, 12000, 26000))
  // Longer routes move faster on screen, so the follow camera sits higher and
  // flatter: it keeps up, and clears city towers (Sydney's CBD tops 250 m)
  const lift = clamp(km / 5, 1, 1.7)
  const followRange = follow.range * lift
  const followTilt = Math.max(50, follow.tilt - (lift - 1) * 10)
  // Fit the whole area with some room around it. The map's field of view is
  // about 35 degrees top to bottom; on a portrait phone the narrow side is
  // across, so fit to whichever is tighter.
  const vHalf = toRad(35 / 2)
  const hHalf = Math.atan(Math.tan(vHalf) * clamp(aspect, 0.3, 3))
  const fitRange = clamp((radius * 1.2) / Math.tan(Math.min(vHalf, hHalf)), 500, 40000)

  // Point and distance at a fraction of the way round
  function at(f) {
    const d = clamp(f, 0, 1) * total
    let i = 1
    while (i < along.length - 1 && along[i] < d) i++
    const seg = along[i] - along[i - 1] || 1
    const k = clamp((d - along[i - 1]) / seg, 0, 1)
    return { lat: lerp(path[i - 1].lat, path[i].lat, k), lng: lerp(path[i - 1].lng, path[i].lng, k), i, d }
  }

  // The camera's course, worked out once for the whole route. Headings are
  // taken across a wide stretch (wider on longer routes, which play faster),
  // unwrapped so 359 to 1 degree isn't a full spin, then smoothed along the
  // route. The point the camera looks at is smoothed too, so corners, stairs
  // and GPS wobble become one gentle curve. The runner and trail stay exact.
  const win = clamp(total * 0.035, follow.lookAheadM * 2, 650)
  const atD = (d) => at(d / total)
  const rawH = []
  for (let i = 0; i < path.length; i++) {
    const a = atD(along[i] - win / 2)
    const b = atD(along[i] + win / 2)
    rawH.push(distance(a, b) < 5 ? null : bearing(a, b))
  }
  const firstH = rawH.find((h) => h != null) ?? 0
  const unwrapped = []
  let prevH = firstH
  for (const h of rawH) {
    const v = h == null ? prevH : prevH + turn(prevH, h)
    unwrapped.push(v)
    prevH = v
  }
  const course = {
    heading: smoothAlong(unwrapped, along, win * 0.6),
    lat: smoothAlong(path.map((q) => q.lat), along, win * 0.2),
    lng: smoothAlong(path.map((q) => q.lng), along, win * 0.2),
  }
  // A value from the course at a fraction of the way round
  function courseAt(key, f) {
    const p = at(f)
    const i = p.i
    const seg = along[i] - along[i - 1] || 1
    const k = clamp((p.d - along[i - 1]) / seg, 0, 1)
    return lerp(course[key][i - 1], course[key][i], k)
  }
  const headingAt = (f) => ((courseAt('heading', f) % 360) + 360) % 360

  const startHeading = headingAt(0)
  const shots = {
    // Opening wide and straight down over the whole area
    wide: { lat: centre.lat, lng: centre.lng, alt, heading: 0, tilt: 0, range: clamp(fitRange * 2, 1500, 80000) },
    // Over the shoulder at the start line
    start: followCamera(0),
    // Swinging around the ground taken
    orbit: { lat: centre.lat, lng: centre.lng, alt, heading: startHeading, tilt: 58, range: fitRange },
    // Finish: straight down over everything
    // (aimed a little south so the loop sits above the summary card)
    overview: { ...offset(centre, 0, -radius * 0.45), alt, heading: 0, tilt: 0, range: fitRange * 1.25 },
  }

  function followCamera(f) {
    return { lat: courseAt('lat', f), lng: courseAt('lng', f), alt, heading: headingAt(f), tilt: followTilt, range: followRange }
  }

  return {
    mode,
    total,
    km,
    alt,
    centre,
    radius,
    path,
    along,
    hexRings,
    shots,
    timeline: [
      { id: 'flyin', label: 'Fly in', ms: 3800 },
      { id: 'follow', label: 'Follow', ms: followMs },
      { id: 'orbit', label: 'Orbit', ms: 14000 },
      { id: 'overview', label: 'Overview', ms: 3200 },
    ],
    at,
    headingAt,
    followCamera,
    // Track drawn so far, ending exactly at the runner
    trailTo(f) {
      const p = at(f)
      return [...path.slice(0, p.i), { lat: p.lat, lng: p.lng }]
    },
  }
}

// Smooth step for camera moves: slow out, slow in
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/**
 * Chase camera: the heading follows its target like a damped spring, so a
 * turn starts gently, carries through and settles without a snap, and never
 * swings faster than `headingPerSec`. Position follows the target directly
 * (the plan has already smoothed it). Call step(target, dtMs).
 */
export function smoother({ headingPerSec = 60, settleMs = 450 } = {}) {
  let cam = null
  let rate = 0 // degrees per second
  return {
    reset(c) { cam = { ...c }; rate = 0 },
    step(target, dt) {
      if (!cam) { cam = { ...target }; return cam }
      const s = Math.min(dt, 100) / 1000 // a dropped frame shouldn't fling the camera
      const w = 2 / (settleMs / 1000) // critically damped spring
      const err = turn(cam.heading, target.heading)
      rate += (w * w * err - 2 * w * rate) * s
      rate = clamp(rate, -headingPerSec, headingPerSec)
      cam = { ...target, heading: (cam.heading + rate * s + 360) % 360 }
      return cam
    },
  }
}

// Camera position for a given look-at camera (where the eye actually is)
export function eyeOf(cam) {
  const ground = cam.range * Math.sin(toRad(cam.tilt))
  const up = cam.range * Math.cos(toRad(cam.tilt))
  const back = offset(cam, -ground * Math.sin(toRad(cam.heading)), -ground * Math.cos(toRad(cam.heading)))
  return { lat: back.lat, lng: back.lng, alt: (cam.alt || 0) + up }
}

// Google-style range (metres from the eye to the target) to a MapLibre zoom.
// MapLibre's default field of view is about 36.9 degrees across the height.
export function zoomForRange(range, lat, heightPx) {
  const visibleM = 2 * range * Math.tan((36.87 / 2) * Math.PI / 180)
  const metresPerPx = visibleM / Math.max(200, heightPx)
  return Math.log2((156543.03 * Math.cos(lat * Math.PI / 180)) / metresPerPx)
}
