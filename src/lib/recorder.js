// Records an activity with the phone's GPS. Keeps the screen awake while
// recording (browsers pause GPS when the screen locks), supports pause,
// and reports live distance, pace and distance back to the start so the
// player knows when their loop will close.

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
})

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
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (rec.status === 'recording' || rec.status === 'paused') && (!lock || lock.released)) keepAwake()
})

function onPosition(pos) {
  const { latitude: lat, longitude: lng, accuracy, altitude } = pos.coords
  rec.accuracy = Math.round(accuracy)
  if (rec.status === 'acquiring' && accuracy <= 35) {
    rec.status = 'recording'
    rec.startedAt = Date.now()
  }
  if (rec.status !== 'recording') return
  if (accuracy > 40) return
  const p = { lat, lng, t: pos.timestamp || Date.now(), acc: accuracy }
  if (altitude != null) p.alt = altitude
  const last = rec.points[rec.points.length - 1]
  if (last) {
    const d = distance(last, p)
    if (d < 3) return // standing still
    rec.distanceM += d
  }
  rec.points.push(p)
  rec.toStartM = rec.points.length > 1 ? Math.round(distance(rec.points[0], p)) : null
  const s = summarise(rec.points.slice(-60))
  rec.paceSPerKm = s.paceSPerKm
}

function onError(err) {
  rec.error = err.code === 1
    ? 'Foothold needs your location to record. Allow location for this site in your browser settings, then try again.'
    : "We can't get a GPS fix. Head outside with a clear view of the sky and try again."
  if (rec.status === 'acquiring') rec.status = 'error'
}

export function start(mode = 'run') {
  if (!('geolocation' in navigator)) {
    rec.status = 'error'
    rec.error = "This browser can't share your location, so it can't record."
    return
  }
  Object.assign(rec, { status: 'acquiring', mode, points: [], startedAt: null, elapsedS: 0, distanceM: 0, paceSPerKm: null, toStartM: null, error: null })
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
  const out = { mode: rec.mode, points, startedAt: rec.startedAt }
  Object.assign(rec, { status: 'idle', points: [], elapsedS: 0, distanceM: 0, toStartM: null, paceSPerKm: null })
  return out
}

export function discard() {
  stop()
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
