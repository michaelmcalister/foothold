// Suggests a loop from where you are that captures the most ground for
// today's distance (the plan's next session, or your usual run).

import { api } from './api/index.js'
import { store } from './store.js'
import { suggestLoop, nextSession } from './coach/index.js'

export async function suggestLoopFor(centre, mode = 'run') {
  const { plan } = await api.plan()
  const next = plan ? nextSession(plan, new Date().toISOString().slice(0, 10)) : null
  const { activities } = await api.activities({ limit: 20 })
  const runs = activities.filter((a) => a.mode === mode && !a.rejected)
  const usual = runs.length ? runs.reduce((s, a) => s + a.distanceM, 0) / runs.length / 1000 : { run: 4, walk: 3, ride: 12 }[mode]
  const targetKm = Math.round(((next?.session?.distanceKm || next?.distanceKm) ?? usual) * 10) / 10
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
