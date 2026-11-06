// Snapping planned routes to paths you can run. Asks the Foothold server
// (POST /api/route) for the path between two points and remembers every
// answer, so moving one point only asks again for the two pieces either side
// of it. With no server (the GitHub Pages practice build), or when a lookup
// fails, the planner keeps straight lines.
import { pairKey } from './planner.js'

const RAW = import.meta.env.VITE_API_URL || ''
const API = RAW === 'self' ? '' : RAW.replace(/\/$/, '')
export const canSnap = () => !!RAW

const known = new Map() // pairKey -> line, or null for "no path, use straight"
const waiting = new Map() // pairKey -> Promise
let quietUntil = 0 // after a rate limit or outage, stop asking for a bit

export const knownPaths = () => known

async function ask(points, mode) {
  const res = await fetch(API + '/api/route', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode, points }),
  })
  if (res.status === 429 || res.status >= 500) { quietUntil = Date.now() + 60000; throw new Error('paths unavailable') }
  if (!res.ok) return null // no path between them: straight it is
  return (await res.json()).line
}

/** The path from a to b ([lng, lat] each), or null for a straight line. Cached. */
export function pathBetween(a, b, mode) {
  const k = pairKey(a, b, mode)
  if (known.has(k)) return Promise.resolve(known.get(k))
  if (waiting.has(k)) return waiting.get(k)
  if (!canSnap() || Date.now() < quietUntil) return Promise.resolve(null)
  const p = ask([a, b], mode)
    .then((line) => { known.set(k, line); return line })
    .catch(() => null) // not remembered, so it's tried again later
    .finally(() => waiting.delete(k))
  waiting.set(k, p)
  return p
}

/**
 * Finds every missing path for a set of pairs, a few at a time.
 * onEach() is called as each one arrives so the line can redraw.
 */
export async function fillPaths(pairs, mode, onEach = () => {}) {
  const todo = pairs.filter(([a, b]) => !known.has(pairKey(a, b, mode)))
  let i = 0
  const worker = async () => {
    while (i < todo.length) {
      const [a, b] = todo[i++]
      await pathBetween(a, b, mode)
      onEach()
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
}
