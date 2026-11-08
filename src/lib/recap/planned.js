// A flyover of a route you haven't done yet: turns a planned route (from the
// loop finder or the planner, plannedRoute.js) into a pretend track at an
// easy pace for the mode, so the recap can fly it in 3D before you go. Pure.
import { distance } from '../engine/index.js'

export const PREVIEW_PACE = { run: 360, walk: 720, ride: 150 } // seconds per km

/** { activity, track } for a planned route, or null if it is too short. */
export function plannedRun(route, now = Date.now()) {
  const ring = route?.ring
  if (!Array.isArray(ring) || ring.length < 2) return null
  const mode = route.mode || 'run'
  const pace = PREVIEW_PACE[mode] || PREVIEW_PACE.run
  const pts = ring.map(([lng, lat]) => ({ lat, lng }))
  const track = []
  let t = now
  let d = 0
  pts.forEach((p, i) => {
    if (i) {
      const prev = pts[i - 1]
      const step = distance(prev, p)
      // a point every 10 m or so, so the camera has something smooth to follow
      const n = Math.max(1, Math.round(step / 10))
      for (let k = 1; k <= n; k++) {
        const f = k / n
        t += (step / n / 1000) * pace * 1000
        track.push({ lat: prev.lat + (p.lat - prev.lat) * f, lng: prev.lng + (p.lng - prev.lng) * f, t: Math.round(t) })
      }
      d += step
    } else track.push({ ...p, t })
  })
  if (d < 100) return null
  const durationS = Math.round((d / 1000) * pace)
  return {
    activity: { id: 'planned', mode, planned: true, name: route.name || 'Planned route', startedAt: now, distanceM: Math.round(d), durationS, movingS: durationS, paceSPerKm: pace },
    track,
  }
}
