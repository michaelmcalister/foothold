// Flyover reels, the pure part: the short 9:16 timeline, the camera for any
// moment of it, the ground to show (privacy zones respected), the overlay
// words, the video type to record and a simple camera projection. No DOM or
// map code here, so it is unit tested; reel.js does the drawing and recording.
import { cellToBoundary } from 'h3-js'
import { findLoops, cellsForLoops, publicTrack, hexIsPrivate, offset } from '../engine/index.js'
import { planRecap, turn, ease, cruise, smoothAlong } from './plan.js'
import { km, pace, duration, speedKmh, plural, dateLong } from '../format.js'

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
const lerp = (a, b, f) => a + (b - a) * f
const toRad = (d) => (d * Math.PI) / 180

export const REEL_FPS = 30
export const REEL_MIN_MS = 15000
export const REEL_MAX_MS = 20000

/**
 * The reel's sections. The follow shot grows a little with distance but the
 * whole reel stays between 15 and 20 seconds, however long the run.
 */
export function reelTimeline(kmRun = 0) {
  const followMs = Math.round(clamp(7000 + (Number(kmRun) || 0) * 350, 7500, 9600))
  const sections = [
    { id: 'flyin', ms: 2200 },
    { id: 'follow', ms: followMs },
    { id: 'orbit', ms: 3600 },
    { id: 'overview', ms: 1600 },
    { id: 'end', ms: 2400 },
  ]
  let at = 0
  for (const s of sections) { s.start = at; at += s.ms }
  return { sections, total: at }
}

/** Which section is playing at `t` ms, and how far through it (0 to 1). */
export function sectionAt(timeline, t) {
  const x = clamp(t, 0, timeline.total)
  const list = timeline.sections
  let s = list[list.length - 1]
  for (const c of list) { if (x < c.start + c.ms) { s = c; break } }
  return { id: s.id, u: clamp((x - s.start) / s.ms, 0, 1), section: s }
}

/** Blend two cameras: heading the short way round, height on a log scale. */
export function blendCam(a, b, u) {
  const f = clamp(u, 0, 1)
  return {
    lat: lerp(a.lat, b.lat, f),
    lng: lerp(a.lng, b.lng, f),
    alt: lerp(a.alt || 0, b.alt || 0, f),
    heading: (((a.heading + turn(a.heading, b.heading) * f) % 360) + 360) % 360,
    tilt: lerp(a.tilt, b.tilt, f),
    range: Math.exp(lerp(Math.log(a.range), Math.log(b.range), f)),
  }
}

const sine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1))

/**
 * The ground for a reel: the track with the ends inside privacy zones trimmed
 * (the same rule other players get), and the hexes taken with any inside a
 * zone left out. Returns null when there's too little to fly over.
 *   hexCount: the number to print (from the recap); else worked out the way
 *   the recap does (claimed plus taken, or the hexes found for the demo).
 */
export function reelGround(track, { zones = [], mode = 'run', hexCount, activity } = {}) {
  const full = (track || []).filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
  const all = cellsForLoops(findLoops(full))
  const cells = all.filter((h) => !hexIsPrivate(h, zones))
  const shown = publicTrack(full, zones)
  const hexRings = cells.map((h) => cellToBoundary(h, true))
  const plan = planRecap(shown, { mode, hexRings, aspect: 9 / 16 })
  if (!plan) return null
  const count = Number.isFinite(hexCount) ? hexCount
    : activity && !activity.demo && activity.claimed != null ? (activity.claimed || 0) + (activity.taken || 0) : all.length
  return { plan, track: shown, hexRings, hexCount: count }
}

/**
 * Plan a reel from a recap plan: the timeline and a calmer camera course for
 * the fast follow (headings smoothed over about a second of screen time).
 */
export function planReel(plan, { distanceM } = {}) {
  if (!plan) return null
  const timeline = reelTimeline(plan.km)
  const followMs = timeline.sections[1].ms
  const N = 240
  const fs = Array.from({ length: N + 1 }, (_, i) => i / N)
  const raw = fs.map((f) => plan.followCamera(f))
  // Unwrap headings so 359 to 1 degree isn't a full spin, then smooth by time
  const unwrapped = []
  let prev = raw[0].heading
  for (const c of raw) { prev += turn(prev, c.heading); unwrapped.push(prev) }
  const sigmaF = 1100 / followMs // about 1.1 s of screen time
  const heading = smoothAlong(unwrapped, fs, sigmaF)
  const lat = raw.map((c) => c.lat) // the plan has already smoothed where it looks
  const lng = raw.map((c) => c.lng)
  // The reel moves much faster than the recap, so sit higher to keep it calm
  const fitRange = plan.shots.orbit.range
  const range = clamp(plan.total * 0.04, 300, Math.max(300, fitRange * 0.35))
  const tilt = 52
  const followAt = (f) => {
    const x = clamp(f, 0, 1) * N
    const i = Math.min(N - 1, Math.floor(x))
    const k = x - i
    return {
      lat: lerp(lat[i], lat[i + 1], k),
      lng: lerp(lng[i], lng[i + 1], k),
      alt: plan.alt,
      heading: ((lerp(heading[i], heading[i + 1], k) % 360) + 360) % 360,
      tilt,
      range,
    }
  }
  const start = followAt(0)
  const endFollow = followAt(1)
  const orbitFrom = { ...plan.shots.orbit, heading: endFollow.heading }
  const orbitTo = { ...orbitFrom, heading: (endFollow.heading + 80) % 360, range: fitRange * 1.05 }
  const overview = overviewCam(plan, orbitTo.heading)
  const metresTotal = distanceM > 0 ? distanceM : plan.total
  return { plan, timeline, followAt, metresTotal, cams: { wide: plan.shots.wide, start, endFollow, orbitFrom, orbitTo, overview } }
}

// Where the route and hexes sit on screen at the end, between the words at
// the top and the end card (fractions of the 9:16 frame's height and width)
export const OVERVIEW_BAND = { top: 0.19, bottom: 0.57, width: 0.86 }

/**
 * The closing camera: straight down, facing `heading`, with the whole route
 * and its hexes fitted into OVERVIEW_BAND so the end card doesn't cover them.
 */
export function overviewCam(plan, heading = 0, fovDeg = 36.87, aspect = 9 / 16) {
  const c = plan.centre
  const mLng = 111320 * Math.cos(toRad(c.lat))
  const h = toRad(heading)
  const fx = Math.sin(h), fy = Math.cos(h) // screen up, on the ground
  const pts = [...plan.path, ...plan.hexRings.flat().map(([lng, lat]) => ({ lat, lng }))]
  let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity
  for (const p of pts) {
    const x = (p.lng - c.lng) * mLng
    const y = (p.lat - c.lat) * 110540
    const right = x * fy - y * fx
    const up = x * fx + y * fy
    r0 = Math.min(r0, right); r1 = Math.max(r1, right)
    u0 = Math.min(u0, up); u1 = Math.max(u1, up)
  }
  const perRange = 2 * Math.tan(toRad(fovDeg) / 2) // ground seen top to bottom, per metre of range
  const band = OVERVIEW_BAND
  const range = clamp(Math.max(
    Math.max(u1 - u0, 80) / ((band.bottom - band.top) * perRange),
    Math.max(r1 - r0, 80) / (band.width * perRange * aspect),
  ), 400, 60000)
  const seen = range * perRange
  // The box's middle shows above the frame's middle by this much (metres)
  const lift = (0.5 - (band.top + band.bottom) / 2) * seen
  const midR = (r0 + r1) / 2
  const midU = (u0 + u1) / 2 - lift
  const east = midR * fy + midU * fx
  const north = -midR * fx + midU * fy
  return { ...offset(c, east, north), alt: plan.alt, heading: ((heading % 360) + 360) % 360, tilt: 0, range }
}

/**
 * Everything to draw at `t` ms into the reel:
 *   { id, u, cam, f (trail drawn, 0 to 1), metres, hexes (0 to 1 shown),
 *     counter (0 to 1 shown), end (0 to 1 end card) }
 */
export function reelFrame(reel, t) {
  const { timeline, cams, plan } = reel
  const { id, u, section } = sectionAt(timeline, t)
  let cam, f = 1, hexes = 1, counter = 0, end = 0
  if (id === 'flyin') {
    cam = blendCam(cams.wide, cams.start, ease(u))
    f = 0; hexes = 0; counter = clamp((u - 0.7) / 0.3, 0, 1)
  } else if (id === 'follow') {
    f = cruise(u * section.ms, section.ms, 900)
    cam = reel.followAt(f)
    hexes = 0; counter = 1
  } else if (id === 'orbit') {
    const move = blendCam(cams.endFollow, cams.orbitFrom, ease(clamp(u / 0.4, 0, 1)))
    const spin = blendCam(cams.orbitFrom, cams.orbitTo, sine(u))
    cam = { ...move, heading: spin.heading, range: u < 0.4 ? move.range : blendCam(cams.orbitFrom, cams.orbitTo, (u - 0.4) / 0.6).range }
    hexes = ease(clamp((u - 0.1) / 0.45, 0, 1)); counter = 1
  } else if (id === 'overview') {
    cam = blendCam(cams.orbitTo, cams.overview, ease(u))
    counter = 1 - clamp(u / 0.5, 0, 1)
  } else {
    cam = { ...cams.overview }
    counter = 0; end = ease(clamp(u / 0.3, 0, 1))
  }
  if (id === 'overview') end = ease(clamp((u - 0.6) / 0.4, 0, 1)) * 0.6
  return { id, u, cam, f, metres: f * (reel.metresTotal || plan.total), hexes, counter, end }
}

// ---- recording format ----

export const MIME_TYPES = [
  'video/mp4;codecs=avc1,mp4a.40.2', // iPhone, and what Instagram and TikTok like best
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp8',
  'video/webm',
]

/** The first video type the browser can record, or '' if none. */
export function pickMimeType(isTypeSupported) {
  if (typeof isTypeSupported !== 'function') return ''
  for (const t of MIME_TYPES) {
    try { if (isTypeSupported(t)) return t } catch { /* try the next */ }
  }
  return ''
}

/** The plain type ("video/mp4") and file extension for a recorded type. */
export function fileTypeFor(mime) {
  const base = String(mime || '').split(';')[0].trim().toLowerCase()
  if (base === 'video/mp4' || base === 'video/quicktime') return { type: 'video/mp4', ext: 'mp4' }
  return { type: 'video/webm', ext: 'webm' }
}

export function reelFileName(activity, ext) {
  const d = new Date(activity?.startedAt || Date.now())
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `foothold-${activity?.demo ? 'demo' : day}.${ext}`
}

/** 1080 x 1920 where the phone can manage it, else 720 x 1280. */
export function reelSize({ deviceMemory, cores } = {}) {
  const low = (deviceMemory && deviceMemory < 4) || (cores && cores < 4)
  return low ? { width: 720, height: 1280 } : { width: 1080, height: 1920 }
}

// ---- overlay words ----

/** The site's address without the https:// ("foothold.run"). */
export function siteLabel(origin) {
  try { return new URL(origin).host.replace(/^www\./, '') } catch { return 'foothold.run' }
}

/**
 * The words on the reel.
 *   { brand, when, name, hexLine, stats: [{ value, label }], url }
 * The name only shows when the person chose it.
 */
export function reelText({ activity = {}, hexCount = 0, name = '', showName = false, origin = '' } = {}) {
  const a = activity || {}
  const ride = a.mode === 'ride'
  const n = Math.max(0, Math.round(Number(hexCount) || 0))
  const stats = [
    { value: km(a.distanceM), label: 'km' },
    { value: duration(a.movingS || a.durationS), label: 'time' },
    ride ? { value: speedKmh(a.paceSPerKm), label: 'km/h' } : { value: pace(a.paceSPerKm), label: 'per km' },
  ]
  return {
    brand: 'FOOTHOLD',
    when: a.demo ? 'Demo run over the Harbour Bridge' : a.startedAt ? dateLong(a.startedAt) : '',
    name: showName && String(name || '').trim() ? String(name).trim().slice(0, 40) : '',
    hexLine: n ? `${plural(n, 'hex', 'hexes')} taken` : 'Ground held',
    stats,
    url: siteLabel(origin),
  }
}

/** The live distance counter ("4.20") for metres covered so far. */
export const counterText = (metres) => km(Math.max(0, metres || 0))

// ---- a simple camera, for when the street map can't draw ----

/**
 * Where a point lands on a W x H frame for a look-at camera (the same camera
 * the recap plan uses, with MapLibre's field of view). Null if behind the eye.
 */
export function projectPoint(cam, p, W, H, fovDeg = 36.87) {
  const mLat = 110540
  const mLng = 111320 * Math.cos(toRad(cam.lat))
  const dx = (p.lng - cam.lng) * mLng
  const dy = (p.lat - cam.lat) * mLat
  const h = toRad(cam.heading || 0)
  const t = toRad(clamp(cam.tilt || 0, 0, 85))
  const fx = Math.sin(h), fy = Math.cos(h) // ground direction the camera faces
  const ground = cam.range * Math.sin(t)
  const eye = [-fx * ground, -fy * ground, cam.range * Math.cos(t)]
  const d = [fx * Math.sin(t), fy * Math.sin(t), -Math.cos(t)] // view direction
  const r = [Math.cos(h), -Math.sin(h), 0] // screen right
  const up = [fx * Math.cos(t), fy * Math.cos(t), Math.sin(t)] // screen up
  const v = [dx - eye[0], dy - eye[1], -eye[2]]
  const z = v[0] * d[0] + v[1] * d[1] + v[2] * d[2]
  if (z <= 1) return null
  const focal = H / 2 / Math.tan(toRad(fovDeg) / 2)
  const x = v[0] * r[0] + v[1] * r[1]
  const y = v[0] * up[0] + v[1] * up[1] + v[2] * up[2]
  return { x: W / 2 + (x / z) * focal, y: H / 2 - (y / z) * focal, z }
}
