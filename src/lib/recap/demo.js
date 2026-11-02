// A sample run for the demo recap (#/app/recap/demo): about 4.5 km around
// Sydney Harbour from Circular Quay, past the Opera House, along Farm Cove to
// Mrs Macquarie's Chair and back through the Domain. Lets people see a recap
// before they've recorded anything. Waypoints are smoothed and spaced every
// few metres at an easy 5:40 per km.
import { distance, summarise } from '../engine/index.js'

const WAYPOINTS = [
  [-33.8609, 151.2129], // Circular Quay, east side
  [-33.8597, 151.2133],
  [-33.8586, 151.2138], // Opera House forecourt
  [-33.8576, 151.2146],
  [-33.8573, 151.2153],
  [-33.8579, 151.2158],
  [-33.8590, 151.2160],
  [-33.8599, 151.2162], // Botanic Garden gate
  [-33.8608, 151.2166],
  [-33.8616, 151.2173], // Farm Cove seawall
  [-33.8621, 151.2183],
  [-33.8622, 151.2195],
  [-33.8616, 151.2206],
  [-33.8606, 151.2214],
  [-33.8598, 151.2222], // Mrs Macquarie's Chair
  [-33.8602, 151.2231],
  [-33.8614, 151.2233],
  [-33.8628, 151.2228],
  [-33.8643, 151.2222], // Mrs Macquaries Road
  [-33.8657, 151.2212],
  [-33.8670, 151.2197],
  [-33.8681, 151.2180], // Art Gallery
  [-33.8684, 151.2163],
  [-33.8679, 151.2148], // The Domain
  [-33.8668, 151.2137],
  [-33.8655, 151.2130], // Macquarie Street
  [-33.8640, 151.2127],
  [-33.8625, 151.2126],
  [-33.8614, 151.2127],
  [-33.8609, 151.2129], // back to the Quay
]

// Catmull-Rom through the waypoints so corners are curves, not kinks
function smooth(pts, per = 8) {
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ lat: f(p0[0], p1[0], p2[0], p3[0]), lng: f(p0[1], p1[1], p2[1], p3[1]) })
    }
  }
  out.push({ lat: pts[pts.length - 1][0], lng: pts[pts.length - 1][1] })
  return out
}

export function demoRun(now = Date.now()) {
  const pace = 340 // seconds per km
  const start = now - 2 * 3600000
  const pts = smooth(WAYPOINTS)
  let t = start
  const track = pts.map((p, i) => {
    if (i) t += (distance(pts[i - 1], p) / 1000) * pace * 1000
    return { ...p, t: Math.round(t), alt: 5 }
  })
  const s = summarise(track)
  return {
    activity: {
      id: 'demo',
      mode: 'run',
      startedAt: start,
      distanceM: s.distanceM,
      durationS: s.durationS,
      movingS: s.movingS ?? s.durationS,
      paceSPerKm: s.paceSPerKm ?? pace,
      demo: true,
    },
    track,
  }
}
