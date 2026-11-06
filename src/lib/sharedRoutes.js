// Routes your crew sent you, on the phone: copy one into your own saved routes (with its day and time), once, so "Plan it" doesn't pile up repeats.

import { api } from './api/index.js'

const sameRing = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Save a shared route as one of yours, or find the copy you already made. Returns your route. */
export async function copySharedRoute(r) {
  const { routes } = await api.routes()
  const have = routes.find((x) => x.name === r.name && x.mode === r.mode && sameRing(x.ring, r.ring))
  if (have) return have
  const { route } = await api.saveRoute({ name: r.name, mode: r.mode, ring: r.ring, plannedAt: r.plannedAt ?? null })
  return route
}
