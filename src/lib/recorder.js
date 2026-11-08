// Records an activity with the phone's GPS. Keeps the screen awake while
// recording (browsers pause GPS when the screen locks), supports pause,
// and reports live distance, pace and distance back to the start so the
// player knows when their loop will close.
// Phones still stop GPS when the screen locks or another app comes to the
// front, so the recording is saved on the device as it goes (a closed page
// can be finished later), gaps are noticed and explained, and a gap is
// joined with a straight line when the run is saved.

import { reactive } from 'vue'
import { distance, summarise } from './engine/geo.js'

export const rec = reactive({
  status: 'idle', // idle | acquiring | recording | paused | error
  mode: 'run',
  points: [],
  startedAt: null,
  elapsedS: 0,
  distanceM: 0,
  paceSPerKm: null,
  toStartM: null,
  accuracy: null,
  error: null,
  wakeLock: false,
  lastFixAt: null, // when the last usable GPS point arrived
  notice: null, // a plain explanation after GPS went quiet
})

const SAVE_KEY = 'fh-recording'
const GAP_MS = 15000 // quiet for this long counts as a gap worth mentioning
let hiddenAt = null

let watchId = null
let timer = null
let lock = null
let pausedAt = null
let pausedTotal = 0

async function keepAwake() {
  try {
    if ('wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen')
      rec.wakeLock = true
      lock.addEventListener('release', () => { rec.wakeLock = false })
    }
  } catch { rec.wakeLock = false }
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  const active = rec.status === 'recording' || rec.status === 'paused'
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
  if (active && (!lock || lock.released)) keepAwake()
  if (rec.status === 'recording' && hiddenAt && Date.now() - hiddenAt > GAP_MS) {
    rec.notice = `GPS stopped for ${gapText(Date.now() - hiddenAt)} while Foothold was off screen. We'll join the gap with a straight line. Locking the phone stops GPS, so use Pocket mode instead.`
  }
  hiddenAt = null
})

const gapText = (ms) => (ms < 90000 ? `${Math.round(ms / 1000)} seconds` : `${Math.round(ms / 60000)} minutes`)

// The recording so far, kept on the device in case the page is closed
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ mode: rec.mode, startedAt: rec.startedAt, points: rec.points, savedAt: Date.now() }))
  } catch { /* storage full or private mode */ }
}
function forget() {
  try { localStorage.removeItem(SAVE_KEY) } catch { /* nothing to remove */ }
}

/** A recording that was never finished (the page closed mid-run), or null. */
export function unfinished() {
  if (rec.status !== 'idle') return null
  try {
    const u = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
    return u?.points?.length > 1 ? u : null
  } catch { return null }
}
export const forgetUnfinished = forget

/**
 * Joins gaps in a track with straight lines, a point every `stepM` metres,
 * times shared out evenly. Used when saving, so a stretch with the screen
 * off still counts and a loop can still close.
 */
// Fastest believable speed across a gap, metres a second. Anything quicker is
// a GPS jump, left as it is for the cheat checks to judge.
const MAX_GAP_SPEED = { run: 9, walk: 4, ride: 22 }

export function bridgeGaps(points, { gapM = 25, stepM = 10, mode = 'run' } = {}) {
  const out = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const prev = out[out.length - 1]
    if (prev) {
      const d = distance(prev, p)
      const secs = (p.t - prev.t) / 1000
      if (d > gapM && secs > 0 && d / secs <= (MAX_GAP_SPEED[mode] || 9)) {
        const n = Math.floor(d / stepM)
        for (let k = 1; k < n; k++) {
          const f = k / n
          out.push({ lat: prev.lat + (p.lat - prev.lat) * f, lng: prev.lng + (p.lng - prev.lng) * f, t: Math.round(prev.t + (p.t - prev.t) * f), joined: true })
        }
      }
    }
    out.push(p)
  }
  return out
}

function onPosition(pos) {
  const { latitude: lat, longitude: lng, accuracy, altitude } = pos.coords
  rec.accuracy = Math.round(accuracy)
  rec.error = null // a fix came through, so any earlier GPS trouble is over
  if (rec.status === 'acquiring' && accuracy <= 35) {
    rec.status = 'recording'
    rec.startedAt = Date.now()
  }
  if (rec.status !== 'recording') return
  const now = Date.now()
  // Prefer sharp fixes, but after 15 s with none, take a rougher one rather than lose the stretch
  if (accuracy > 100 || (accuracy > 50 && rec.lastFixAt && now - rec.lastFixAt < GAP_MS)) return
  if (rec.lastFixAt && now - rec.lastFixAt > GAP_MS && !rec.notice) {
    rec.notice = `No GPS for ${gapText(now - rec.lastFixAt)}. We'll join the gap with a straight line.`
  }
  rec.lastFixAt = now
  const p = { lat, lng, t: pos.timestamp || now, acc: accuracy }
  if (altitude != null) p.alt = altitude
  const last = rec.points[rec.points.length - 1]
  if (last) {
    const d = distance(last, p)
    if (d < 3) return // standing still
    rec.distanceM += d
  }
  rec.points.push(p)
  if (rec.points.length % 5 === 1) persist()
  rec.toStartM = rec.points.length > 1 ? Math.round(distance(rec.points[0], p)) : null
  const s = summarise(rec.points.slice(-60))
  rec.paceSPerKm = s.paceSPerKm
}

function onError(err) {
  rec.error = err.code === 1
    ? 'Foothold needs your location to record. Allow location for this site in your browser settings, then try again.'
    : "We can't get a GPS fix. Head outside with a clear view of the sky and try again."
  if (rec.status === 'acquiring' && err.code === 1) rec.status = 'error'
}

export function start(mode = 'run') {
  if (!('geolocation' in navigator)) {
    rec.status = 'error'
    rec.error = "This browser can't share your location, so it can't record."
    return
  }
  Object.assign(rec, { status: 'acquiring', mode, points: [], startedAt: null, elapsedS: 0, distanceM: 0, paceSPerKm: null, toStartM: null, error: null, lastFixAt: null, notice: null })
  forget()
  pausedTotal = 0
  watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 })
  timer = setInterval(() => {
    if (rec.status === 'recording' && rec.startedAt) rec.elapsedS = Math.round((Date.now() - rec.startedAt - pausedTotal) / 1000)
  }, 1000)
  keepAwake()
}

export function pause() {
  if (rec.status !== 'recording') return
  rec.status = 'paused'
  pausedAt = Date.now()
}

export function resume() {
  if (rec.status !== 'paused') return
  pausedTotal += Date.now() - pausedAt
  rec.status = 'recording'
}

export function stop() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId)
  clearInterval(timer)
  watchId = null
  try { lock?.release() } catch { /* already released */ }
  const points = rec.points.slice()
  const out = { mode: rec.mode, points, startedAt: rec.startedAt, distanceM: rec.distanceM }
  if (points.length > 1) persist() // kept until it's saved or discarded, in case saving fails
  Object.assign(rec, { status: 'idle', points: [], elapsedS: 0, distanceM: 0, toStartM: null, paceSPerKm: null, notice: null, lastFixAt: null })
  return out
}

export function discard() {
  stop()
  forget()
}

// One-off position, for centring the map.
export function whereAmI() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  })
}
