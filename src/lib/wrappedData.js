// Loads Foothold Wrapped: your year from the API adapter (api.year, with a
// fallback to the older calls), then each activity's loops and hexes worked
// out on the phone from its track for the map film and the favourite loop.
// Also remembers, per device, that this year's "Wrapped is ready" card was seen.
import { api } from './api/index.js'
import { findLoops, cellsForLoops } from './engine/index.js'
import { wrappedFor, yearActivities, yearSummary, MAX_FILM_ACTIVITIES } from './wrapped.js'

const PARALLEL = 4 // tracks fetched at once from the server
const RING_POINTS = 160 // enough for the loop's shape on screen

// Every nth point of a closed ring, keeping it closed
function thin(ring, max = RING_POINTS) {
  if (ring.length <= max) return ring
  const step = Math.ceil(ring.length / max)
  const out = ring.filter((_, i) => i % step === 0)
  out.push(ring[0])
  return out
}

async function yearData(year) {
  if (typeof api.year === 'function') {
    try { return await api.year({ year }) } catch { /* an older server: build it from the other calls */ }
  }
  const [acts, riv, ...bests] = await Promise.all([
    api.activities({ limit: 200 }),
    api.rivals({}).catch(() => ({ rivals: [] })),
    ...['run', 'walk', 'ride'].map((mode) => api.bests({ mode }).catch(() => ({ bests: [] }))),
  ])
  return {
    year,
    activities: acts.activities,
    rivals: riv.rivals || [],
    bests: { run: bests[0].bests, walk: bests[1].bests, ride: bests[2].bests },
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

/**
 * Everything the Wrapped screen needs.
 *   onProgress(done, total) while tracks are read.
 * Returns { wrapped, user, summary }.
 */
export async function loadWrapped({ now = Date.now(), full = false, onProgress = () => {} } = {}) {
  const base = wrappedFor(now)
  const wrapped = full && !base.full ? { ...base, full: true, title: `Your ${base.year} in Foothold` } : base
  const [{ user }, data] = await Promise.all([api.me(), yearData(wrapped.year)])
  const acts = yearActivities(data.activities || [], wrapped)
  // Only outings that took ground have loops worth reading
  const took = acts.filter((a) => (a.loops || 0) > 0 || (a.claimed || 0) + (a.taken || 0) > 0)
  const todo = took.slice(0, MAX_FILM_ACTIVITIES)
  const film = []
  let done = 0
  onProgress(0, todo.length)
  let next = 0
  async function worker() {
    while (next < todo.length) {
      const a = todo[next++]
      try {
        const { track } = await api.activity(a.id)
        const loops = findLoops(track || [])
        if (loops.length) {
          film.push({
            activityId: a.id,
            startedAt: a.startedAt,
            hexes: cellsForLoops(loops),
            loops: loops.map((l) => ({ ring: thin(l.ring), perimeterM: l.perimeterM })),
          })
        }
      } catch { /* a missing track just leaves that outing off the film */ }
      done++
      onProgress(done, todo.length)
      await tick()
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker))
  const summary = yearSummary({ activities: acts, bounds: wrapped, film, rivals: data.rivals || [], records: data.bests || {}, now })
  return { wrapped, user, summary, capped: took.length > MAX_FILM_ACTIVITIES }
}

// ---- the "Your Wrapped is ready" card, once per year per device ----
const seenKey = (year) => `fh-wrapped-seen-${year}`
export function wrappedSeen(year) {
  try { return localStorage.getItem(seenKey(year)) === '1' } catch { return false }
}
export function markWrappedSeen(year) {
  try { localStorage.setItem(seenKey(year), '1') } catch { /* storage blocked: fine */ }
}
