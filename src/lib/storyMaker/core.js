// The Story Maker's shared rules, used by the app and the worker alike:
// which places a story may send you to, how the next stops are chosen so the
// run comes out near the length asked for and ends back where it began, and
// the house rules every line must pass (the same rules as the written
// stories in test/missions.test.js). Pure functions, unit tested in
// test/storymaker.test.js.
import { kmBetween, directionTo } from '../missions/places.js'

export { kmBetween, directionTo }

export const MOODS = {
  mystery: { label: 'Mystery', about: 'Clues, a secret and a reveal' },
  adventure: { label: 'Adventure', about: 'A quest with a goal at the end' },
  history: { label: 'History', about: 'The true past of where you are' },
  silly: { label: 'Silly', about: 'Daft, light and funny' },
}
export const LENGTHS = [2, 3, 5, 8] // km
export const ARRIVE_M = 40 // close enough to count as there
export const MAX_STOPS = 6
export const ROAD_FACTOR = 1.3 // paths wind: straight line times this is a fair guess

// Lines people hear: the same house rules as the written stories
export const MAX_LINE = 180
export const MAX_LABEL = 28
export const BANNED = /\b(kill\w*|blood\w*|dead|die|dies|died|dying|scary|lazy|failed|failure|pathetic|should have|disappoint\w*|zombie\w*|weak)\b/i

/**
 * One line made fit to be heard: no dashes, no markdown, one line, at most
 * MAX_LINE characters (cut at the last full stop that fits), or null if it
 * breaks the house rules. Pure.
 */
export function cleanLine(s, max = MAX_LINE) {
  let t = String(s ?? '')
    .replace(/[–—]|\s--?\s/g, ', ')
    .replace(/[*_#`>]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .trim()
  if (!t || BANNED.test(t)) return null
  if (t.length > max) {
    const cut = t.slice(0, max)
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    t = stop > 40 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '.'
  }
  return t
}

/** A list of lines, cleaned, empties dropped, at most n. Pure. */
export const cleanLines = (list, n = 4) => (Array.isArray(list) ? list : []).map((l) => cleanLine(l)).filter(Boolean).slice(0, n)

/** An option label: short, clean. Pure. */
export function cleanLabel(s) {
  const t = cleanLine(s, 60)
  if (!t) return null
  if (t.length <= MAX_LABEL) return t.replace(/[.]$/, '')
  return t.slice(0, MAX_LABEL).replace(/\s+\S*$/, '').replace(/[,.;:]$/, '')
}

// ---- places ----

// Somewhere fine to send a runner: public, open to all, not a place where
// children gather (schools, playgrounds, childcare), not a cemetery, nothing
// private or dangerous. OpenStreetMap tags in, a kind out (or null to skip).
export function kindOf(tags = {}) {
  const t = tags
  if (t.access && /^(private|no|customers|permit)$/.test(t.access)) return null
  if (t.amenity && /school|kindergarten|childcare|college|prison|grave_yard/.test(t.amenity)) return null
  if (t.leisure === 'playground' || t.landuse === 'cemetery' || t.amenity === 'grave_yard' || t.military) return null
  if (t.historic === 'memorial' || t.historic === 'monument') return 'memorial'
  if (t.historic) return 'heritage'
  if (t.tourism === 'viewpoint') return 'lookout'
  if (t.tourism === 'artwork') return 'artwork'
  if (t.tourism === 'museum' || t.tourism === 'gallery') return 'museum'
  if (t.tourism === 'picnic_site') return 'picnic spot'
  if (t.amenity === 'library') return 'library'
  if (t.amenity === 'fountain') return 'fountain'
  if (t.amenity === 'townhall' || t.amenity === 'community_centre') return 'hall'
  if (t.amenity === 'place_of_worship') return 'church'
  if (t.amenity === 'clock') return 'clock'
  if (t.man_made && /tower|water_tower|lighthouse|windmill|obelisk/.test(t.man_made)) return 'tower'
  if (t.man_made === 'bridge' || t.bridge === 'yes') return 'bridge'
  if (t.railway === 'station' || t.public_transport === 'station') return 'station'
  if (t.natural === 'peak') return 'hilltop'
  if (t.leisure === 'nature_reserve') return 'reserve'
  if (t.leisure === 'park' || t.leisure === 'garden') return 'park'
  return null
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(the|park|reserve)\b/g, '').replace(/\s+/g, ' ').trim()

/** Do a place and a Wikipedia article name the same thing? Pure. */
export function sameName(a, b) {
  const x = norm(a)
  const y = norm(String(b || '').replace(/\s*\(.*\)$/, '').replace(/,.*$/, ''))
  return !!x && !!y && (x === y || (x.length > 6 && y.includes(x)) || (y.length > 6 && x.includes(y)))
}

// ---- choosing where to go next ----

/** Straight-line metres times ROAD_FACTOR: a fair guess at the path. Pure. */
export const estM = (a, b) => kmBetween(a, b) * 1000 * ROAD_FACTOR

/** How many stops suit a run of this length. Pure. */
export const stopsFor = (km) => Math.max(2, Math.min(MAX_STOPS, Math.round(km / 0.9)))

/**
 * The next places to offer, from `here`, given where the run began, the stops
 * already visited, metres run so far and the length asked for. Picks up to
 * two that keep the whole run near the length (there and still home), each
 * a sensible leg, and pointing different ways where it can. An empty list
 * means it's time to head home. Pure.
 */
export function nextStops({ here, start, places, visited = [], doneM = 0, targetKm, want = 2 }) {
  const budget = targetKm * 1000 * 1.15
  const stops = stopsFor(targetKm)
  if (visited.length >= stops) return []
  const leg = (targetKm * 1000) / (stops + 1) // the ideal stretch between stops
  const seen = new Set(visited)
  const fits = places
    .filter((p) => !seen.has(p.id))
    .map((p) => ({ p, there: estM(here, p), back: estM(p, start) }))
    .filter((c) => c.there >= 200 && doneM + c.there + c.back <= budget)
    // near the ideal leg, a little credit for history, and the last stop should lean home
    .map((c) => ({ ...c, score: Math.abs(c.there - leg) / leg - (c.p.history ? 0.25 : 0) + (visited.length === stops - 1 ? c.back / (leg * 2) : 0) }))
    .sort((a, b) => a.score - b.score)
  if (!fits.length) return []
  const out = [fits[0].p]
  if (want > 1) {
    const way = directionTo(here, fits[0].p)
    const other = fits.find((c) => c.p.id !== fits[0].p.id && directionTo(here, c.p) !== way) || fits[1]
    if (other) out.push(other.p)
  }
  return out
}

/** The story's place in the tree: the stops so far, as one key. Pure. */
export const pathKey = (ids) => ids.join('>')

/** "Clocktower, 600 metres north east" or "Clocktower, just ahead". Pure. */
export function guideLine(here, stop) {
  const m = kmBetween(here, stop) * 1000
  if (m < 80) return `${stop.name} is just ahead.`
  const dist = m >= 1000 ? `${(m / 1000).toFixed(1)} kilometres` : `${Math.round(m / 50) * 50} metres`
  return `${stop.name}: ${dist} ${directionTo(here, stop)}.`
}
