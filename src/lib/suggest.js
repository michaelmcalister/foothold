// Suggests a loop from where you are that captures the most ground for
// today's distance (the plan's next session, or your usual run), or a
// distance asked for (the first week's gentle first loop).
// streetLoopsFor builds loops on real streets (loopBuilder.js); suggestLoopFor
// is the rough oval, used when streets can't be looked up.

import { api } from './api/index.js'
import { store } from './store.js'
import { suggestLoop, nextSession, toISO } from './coach/index.js'
import { buildStreetLoops } from './loopBuilder.js'
import { routeVia, canSnap } from './paths.js'
import { usualPace } from './planner.js'
import { placeSteps } from './directions.js'

/** The distance to offer first: today's planned session, or your usual. */
export async function loopKmFor(mode = 'run') {
  try {
    const { plan } = await api.plan()
    const next = plan ? nextSession(plan, toISO(Date.now())) : null
    const planned = next && next.date === toISO(Date.now()) ? (next.session?.distanceKm || next.distanceKm) : null
    if (planned) return Math.round(planned * 2) / 2
    const { activities } = await api.activities({ limit: 20 })
    const runs = activities.filter((a) => a.mode === mode && !a.rejected && a.distanceM > 500)
    if (runs.length) return Math.max(1, Math.round((runs.reduce((s, a) => s + a.distanceM, 0) / runs.length / 1000) * 2) / 2)
  } catch { /* fall through */ }
  return { run: 5, walk: 3, ride: 15 }[mode] || 5
}

async function mapAround(centre, mode, km) {
  let cells = await api.cellsMap(mode)
  let names = new Map()
  if (!cells) {
    // Server mode: the map around you, as far as the loop could reach
    const pad = Math.min(0.08, 0.01 + km * 0.004)
    const { cells: list } = await api.territory({ mode, bbox: [centre.lng - pad, centre.lat - pad, centre.lng + pad, centre.lat + pad] })
    cells = new Map(list.map((c) => [c.h3, { h3: c.h3, owner: c.mine ? store.user.id : c.owner, strength: c.strength, lastVisit: Date.now(), visits: 1 }]))
    names = new Map(list.filter((c) => !c.mine).map((c) => [c.owner, { name: c.ownerName, colour: c.ownerColour }]))
  }
  return { cells, names }
}

/**
 * Loops on real streets from `centre`, about `km` long, best first, each
 * with directions. Returns { loops, streets } where streets is false when
 * the street lookup isn't there (practice mode or it failed) and loops are
 * the rough ovals instead. `skip`: headings already shown.
 */
export async function streetLoopsFor(centre, mode, km, { skip = [] } = {}) {
  const [{ cells, names }, explored, acts] = await Promise.all([
    mapAround(centre, mode, km),
    api.explored({ mode }).then((r) => new Set(r.cells)).catch(() => null),
    api.activities({ limit: 30 }).then((r) => r.activities).catch(() => []),
  ])
  if (canSnap()) {
    const loops = await buildStreetLoops({
      start: centre, targetKm: km, cells, me: store.user.id, mode, names, explored,
      paceSPerKm: usualPace(acts, mode), route: routeVia, skip,
    })
    if (loops.length) return { streets: true, loops: loops.map((l) => ({ ...l, directions: placeSteps(l.line, l.steps) })) }
  }
  const s = suggestLoop({ start: centre, targetKm: km, cells, me: store.user.id, now: Date.now() })
  return { streets: false, loops: [{ line: s.ring, km: s.distanceKm, note: `${s.note} Street matching isn't available right now, so this is a rough shape to follow.`, directions: [], headingDeg: s.headingDeg }] }
}

export async function suggestLoopFor(centre, mode = 'run', { targetKm: askedKm = null } = {}) {
  const { plan } = await api.plan()
  const next = plan ? nextSession(plan, toISO(Date.now())) : null
  const { activities } = await api.activities({ limit: 20 })
  const runs = activities.filter((a) => a.mode === mode && !a.rejected)
  const usual = runs.length ? runs.reduce((s, a) => s + a.distanceM, 0) / runs.length / 1000 : { run: 4, walk: 3, ride: 12 }[mode]
  const targetKm = askedKm ?? Math.round(((next?.session?.distanceKm || next?.distanceKm) ?? usual) * 10) / 10
  let cells = await api.cellsMap(mode)
  if (!cells) {
    // Server mode: build a map from what's on screen around you
    const pad = 0.04
    const { cells: list } = await api.territory({ mode, bbox: [centre.lng - pad, centre.lat - pad, centre.lng + pad, centre.lat + pad] })
    cells = new Map(list.map((c) => [c.h3, { h3: c.h3, owner: c.mine ? store.user.id : c.owner, strength: c.strength, lastVisit: Date.now(), visits: 1 }]))
  }
  const s = suggestLoop({ start: centre, targetKm, cells, me: store.user.id, now: Date.now() })
  return { ...s, targetKm }
}
