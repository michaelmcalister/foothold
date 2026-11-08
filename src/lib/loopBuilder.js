// Builds loops that follow real streets, close to a distance you ask for, and
// picks the ones that do the most for you: new ground, rivals' ground you can
// take, and streets you've never run.
//
// 1. Sketch ovals in every direction from the start (coach/routes.js) and
//    rank them on the map as it stands.
// 2. Send the best few, as a handful of points, to the route lookup, which
//    returns the real streets (and turn by turn steps).
// 3. A loop that came out too long or short is redrawn bigger or smaller and
//    looked up again, once.
// 4. Score each street loop the way a real run is scored (planner.planRoute
//    and the claim rules), plus a bonus for streets new to you, and keep the
//    best. Ties go to the one closest to the distance asked for.
import { loopRing, loopOptions } from './coach/routes.js'
import { planRoute } from './planner.js'
import { visitedCells } from './engine/explore.js'

const ROAD_FACTOR = 1.25 // the same guess loopOptions makes
const POINTS = 6 // points round each oval for the lookup (more makes spurs)
const CLOSE_ENOUGH = 0.12 // within 12% of the distance asked for

/** The points sent to the route lookup: start, a few round the oval, start again. */
export function viaPoints(ring, n = POINTS) {
  const inner = ring.slice(1, -1)
  const pts = [ring[0]]
  for (let k = 1; k <= n; k++) pts.push(inner[Math.min(inner.length - 1, Math.round((k * inner.length) / (n + 1)))])
  pts.push(ring[0])
  return pts.map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5])
}

/** How much a street loop is worth. Pure. */
export function scoreStreetLoop(line, { targetKm, cells, me, mode, names, explored = null, paceSPerKm, now = Date.now() }) {
  const plan = planRoute({ waypoints: line, closed: false, mode, paceSPerKm, cells, me, names, now })
  const cap = plan.capture
  const take = cap ? cap.rivals.reduce((s, r) => s + r.take.length, 0) : 0
  const hold = cap ? cap.rivals.reduce((s, r) => s + r.hold.length, 0) : 0
  const wild = cap ? cap.wild.length : 0
  const mine = cap ? cap.mine.length : 0
  let fresh = 0
  if (explored) {
    for (const h of visitedCells(line.map(([lng, lat]) => ({ lat, lng })))) if (!explored.has(h)) fresh++
  }
  const km = plan.distanceM / 1000
  const rel = targetKm > 0 ? (km - targetKm) / targetKm : 0
  const closeness = Math.exp(-4 * rel * rel) // 10% off keeps 96%, 25% off keeps 78%
  const raw = wild + 1.4 * take + 0.3 * hold + 0.1 * mine + 0.5 * fresh
  return { score: (plan.counts ? raw : raw * 0.2) * closeness, km, wild, take, hold, mine, fresh, plan, closes: plan.counts }
}

/** The one line summary: "5.2 km heading north east. 34 new hexes, 6 of Sam's and 18 streets you haven't run." */
export function loopNote(c, heading) {
  const bits = []
  if (c.wild) bits.push(`${c.wild} new ${c.wild === 1 ? 'hex' : 'hexes'}`)
  const rivals = (c.plan.capture?.rivals || []).filter((r) => r.take.length)
  if (rivals.length === 1) bits.push(`${rivals[0].take.length} of ${rivals[0].name}'s`)
  else if (rivals.length > 1) bits.push(`${c.take} from ${rivals.length} rivals`)
  if (c.fresh >= 3) bits.push(`${c.fresh} hexes of streets you haven't run`)
  const list = bits.length > 1 ? `${bits.slice(0, -1).join(', ')} and ${bits.at(-1)}` : bits[0]
  const head = `${c.km.toFixed(1)} km on the streets, heading ${heading}.`
  if (!c.closes) return `${head} It doesn't quite close a loop, so try another.`
  return list ? `${head} Takes ${list}.` : `${head} Mostly your own ground, which keeps it strong.`
}

/**
 * Street loops from a start, best first.
 *   route(points, mode) -> Promise<{ line, distanceM, steps } | null>
 *   explored: Set of hexes your tracks have passed through (or null)
 *   skip: heading degrees already shown (for "Try another")
 * Returns [{ line, distanceM, steps, km, heading, headingDeg, score, note, ... }].
 */
export async function buildStreetLoops({ start, targetKm = 5, cells = new Map(), me = null, mode = 'run', names = new Map(), explored = null, paceSPerKm, route, tries = 4, skip = [], now = Date.now() } = {}) {
  if (!start || !route) return []
  // 1. ovals, best first, a spread of directions not shown already
  const sketches = loopOptions({ start, targetKm, cells, me, now, mode, headings: 8 })
  const picked = []
  for (const o of sketches) {
    if (picked.length >= tries) break
    const used = [...skip, ...picked.map((p) => p.headingDeg)]
    if (used.some((d) => Math.abs(((o.headingDeg - d + 540) % 360) - 180) < 30)) continue
    picked.push(o)
  }
  const perimeter0 = (targetKm * 1000) / ROAD_FACTOR

  // 2 and 3. real streets, redrawn once if the distance is off
  const built = await Promise.all(picked.map(async (o) => {
    let r = await route(viaPoints(o.ring), mode)
    if (!r) return null
    const off = r.distanceM / (targetKm * 1000)
    if (Math.abs(off - 1) > CLOSE_ENOUGH) {
      const again = await route(viaPoints(loopRing(start, perimeter0 / off, o.headingDeg)), mode)
      if (again && Math.abs(again.distanceM / (targetKm * 1000) - 1) < Math.abs(off - 1)) r = again
    }
    return { o, r }
  }))

  // 4. score them like a real run
  const out = []
  for (const b of built) {
    if (!b) continue
    const c = scoreStreetLoop(b.r.line, { targetKm, cells, me, mode, names, explored, paceSPerKm, now })
    out.push({
      line: b.r.line, distanceM: c.plan.distanceM, steps: b.r.steps || [], km: c.km,
      heading: b.o.heading, headingDeg: b.o.headingDeg, score: c.score, closes: c.closes,
      wild: c.wild, take: c.take, hold: c.hold, mine: c.mine, fresh: c.fresh,
      capture: c.plan.capture, timeS: c.plan.timeS, note: loopNote(c, b.o.heading),
    })
  }
  return out.sort((a, b) => b.score - a.score || Math.abs(a.km - targetKm) - Math.abs(b.km - targetKm))
}
