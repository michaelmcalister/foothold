// Where each story is set, and how far that is from you: "Stories near you"
// in the mission browser. An episode can name its own place (the local
// stories do); otherwise its series' place below is used. Stories set in
// made up places (Wattle Creek, the game show) have none. Your position is
// only ever used on your phone to work out distances; it isn't sent.
import { CATALOGUE as MISSIONS } from './catalogue.js'

// The series set in one real place
export const SAGA_PLACES = {
  deepcover: { name: 'Melbourne city', lat: -37.8183, lng: 144.9671 },
  heist: { name: 'Sydney Harbour', lat: -33.8610, lng: 151.2100 },
  velocity: { name: 'Kangaroo Point, Brisbane', lat: -27.4710, lng: 153.0350 },
  signal: { name: 'The Parkes dish', lat: -32.9984, lng: 148.2635 },
}

/** Where a story is set: { name, lat, lng }, or null for made up places. */
export function placeOf(m) {
  return m?.place || SAGA_PLACES[m?.saga] || null
}

/** Kilometres between two { lat, lng } points (haversine). */
export function kmBetween(a, b) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const DIRS = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west']
/** Roughly which way a place is from you: "north east". */
export function directionTo(from, to) {
  const rad = (d) => (d * Math.PI) / 180
  const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat))
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng))
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  return DIRS[Math.round(deg / 45) % 8]
}

/** "Under a kilometre away", "3.2 km north east", "6,240 km north west". */
export function distanceLabel(from, to) {
  const km = kmBetween(from, to)
  if (km < 1) return 'Under a kilometre away'
  const n = km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString('en-AU')
  return `${n} km ${directionTo(from, to)}`
}

/**
 * Every story with a real place, nearest first: [{ mission, place, km, label }].
 * One card per place: when a series has several episodes in one spot, the
 * first one shows.
 */
export function storiesNear(here, missions = MISSIONS) {
  const seen = new Set()
  const out = []
  for (const m of missions) {
    const place = placeOf(m)
    if (!place) continue
    const key = `${place.lat},${place.lng}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ mission: m, place, km: here ? kmBetween(here, place) : null, label: here ? distanceLabel(here, place) : null })
  }
  return here ? out.sort((a, b) => a.km - b.km) : out
}

/** Where you are, once, from the phone (null if it says no or can't tell). */
export function locateMe({ timeoutMs = 12000, geo = globalThis.navigator?.geolocation } = {}) {
  return new Promise((resolve) => {
    if (!geo) return resolve(null)
    const timer = setTimeout(() => resolve(null), timeoutMs + 1000)
    geo.getCurrentPosition(
      (p) => { clearTimeout(timer); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }) },
      () => { clearTimeout(timer); resolve(null) },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
    )
  })
}
