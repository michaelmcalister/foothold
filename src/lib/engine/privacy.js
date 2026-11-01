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

// Trim the start and end of a track that sit inside a zone, for anything
// other players see. The full track stays with the owner.
export function publicTrack(points, zones) {
  if (!zones?.length) return points
  let a = 0
  let b = points.length - 1
  while (a <= b && inZone(points[a], zones)) a++
  while (b >= a && inZone(points[b], zones)) b--
  return points.slice(a, b + 1)
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
