// Privacy zones. Hexes near a player's home or work are never shown as
// theirs to anyone else, and runs that start inside a zone hide the start.

import { distance } from './geo.js'
import { cellCentre } from './territory.js'

export const DEFAULT_RADIUS_M = 400

export function inZone(point, zones) {
  return (zones || []).some((z) => distance(point, z) <= (z.radiusM || DEFAULT_RADIUS_M))
}

export function hexIsPrivate(h3, zones) {
  return zones?.length ? inZone(cellCentre(h3), zones) : false
}

// What other players see of a track: the start and end inside a zone go,
// and so do the first and last END_TRIM_M metres either way, so a run
// from your front door never shows the door, zone or no zone. The full
// track stays with the owner.
export const END_TRIM_M = 200

export function trimEnds(points, metres = END_TRIM_M) {
  if (!points?.length) return []
  let a = 0
  let gone = 0
  while (a < points.length - 1 && gone < metres) { gone += distance(points[a], points[a + 1]); a++ }
  let b = points.length - 1
  gone = 0
  while (b > a && gone < metres) { gone += distance(points[b - 1], points[b]); b-- }
  return b > a ? points.slice(a, b + 1) : []
}

export function publicTrack(points, zones) {
  let a = 0
  let b = points.length - 1
  if (zones?.length) {
    while (a <= b && inZone(points[a], zones)) a++
    while (b >= a && inZone(points[b], zones)) b--
  }
  return trimEnds(points.slice(a, b + 1))
}

// Where activities usually start: a likely home. Used to suggest a zone
// on the first run, never set without the player saying yes.
export function suggestZone(activities, { minRuns = 1 } = {}) {
  const starts = activities.map((a) => a.start).filter(Boolean)
  if (starts.length < minRuns) return null
  let best = null
  let bestCount = 0
  for (const s of starts) {
    const n = starts.filter((o) => distance(s, o) < 250).length
    if (n > bestCount) { best = s; bestCount = n }
  }
  return best ? { lat: best.lat, lng: best.lng, radiusM: DEFAULT_RADIUS_M, label: 'Home' } : null
}
