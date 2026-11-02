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

  // Direction of travel, averaged over the next stretch so GPS wobble and
  // tight corners don't whip the camera around
  function headingAt(f) {
    const here = at(f)
    const ahead = at(f + follow.lookAheadM * 2 / total)
    const behind = at(f - follow.lookAheadM / total)
    if (distance(behind, ahead) < 5) return bearing(path[0], path[Math.min(path.length - 1, 3)])
    return bearing(behind, ahead)
  }

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
    const p = at(f)
    return { lat: p.lat, lng: p.lng, alt, heading: headingAt(f), tilt: follow.tilt, range: follow.range }
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
 * Chase camera that eases towards where it should be instead of snapping,
 * so heading changes read as a smooth turn. Call step(target, dtMs).
 */
export function smoother({ headingPerSec = 120 } = {}) {
  let cam = null
  return {
    reset(c) { cam = { ...c } },
    step(target, dt) {
      if (!cam) { cam = { ...target }; return cam }
      // Stay right on the runner; only the turn is eased, which is what reads as smooth
      const k = 1 - Math.exp(-dt / 350)
      const maxTurn = (headingPerSec * dt) / 1000
      const dh = clamp(turn(cam.heading, target.heading) * Math.min(1, k * 2), -maxTurn, maxTurn)
      cam = {
        ...target,
        heading: (cam.heading + dh + 360) % 360,
      }
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
