// Stories set on your own streets (missions/series/yourpatch.js): their lines
// carry tokens like {park} and {street}, filled in at the start of the run
// with real names from around you (worker/nearby.js asks OpenStreetMap,
// from your position rounded to about a kilometre). Missing names fall back
// to plain words ("the park"), so the story always reads well.

export const TOKENS = ['suburb', 'park', 'park2', 'street', 'street2', 'landmark', 'water']
const FALLBACK = { suburb: 'your suburb', park: 'the park', park2: 'the reserve', street: 'your street', street2: 'the next street', landmark: 'the library', water: 'the creek' }
const MAX = 28 // long names would make long lines

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, MAX)

/** The words to use, from /api/nearby's lists. Pure. */
export function wordsFrom(near = {}) {
  const [park, park2] = near.parks || []
  const [street, street2] = near.streets || []
  return {
    suburb: clean(near.suburb) || FALLBACK.suburb,
    park: clean(park) || FALLBACK.park,
    park2: clean(park2) || FALLBACK.park2,
    street: clean(street) || FALLBACK.street,
    street2: clean(street2) || FALLBACK.street2,
    landmark: clean(near.landmarks?.[0]) || FALLBACK.landmark,
    water: clean(near.water?.[0]) || FALLBACK.water,
  }
}

const fill = (text, words) => String(text).replace(/\{(\w+)\}/g, (m, k) => (k in words ? words[k] : m))

/** A copy of a mission with every token filled in. Pure. */
export function personalise(mission, words) {
  const walk = (v) => {
    if (typeof v === 'string') return fill(v, words)
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'id' || k === 'key' || k === 'flag' || k === 'if' || k === 'unless' || k === 'answer' || k === 'who' ? x : walk(x)]))
    return v
  }
  return walk(mission)
}

export { FALLBACK }
