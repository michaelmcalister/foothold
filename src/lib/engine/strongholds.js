// Strongholds: named landmark loops. Finds whether a track ran one (either
// way round, joining it anywhere on a closed loop), and works out who holds
// the crown: most efforts in the last 90 days, a tie going to the most recent.
// Pure functions, shared by the app (local mode) and the Worker.

import { distance, pathLength } from './geo.js'
import { clock } from './bests.js'

export const STRONGHOLD = {
  sampleM: 25, // check the route every 25 m
  toleranceM: 30, // the track must pass within 30 m of a check point
  need: 0.9, // and hit at least 90% of them, in order
  windowDays: 90, // the crown counts efforts in the last 90 days
}
const DAY = 86400000

// Google encoded polyline, 5 decimal places
export function decodePolyline(str) {
  const out = []
  let i = 0, lat = 0, lng = 0
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20 && i < str.length)
      const d = result & 1 ? ~(result >> 1) : result >> 1
      if (which === 0) lat += d
      else lng += d
    }
    out.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return out
}

// Points every `step` metres along a route (interpolated, so evenly spaced)
export function samplePath(route, step = STRONGHOLD.sampleM) {
  if (!route?.length) return []
  const out = [{ lat: route[0].lat, lng: route[0].lng }]
  let carry = 0
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i]
    const seg = distance(a, b)
    let d = step - carry
    while (d <= seg) {
      const f = d / seg
      out.push({ lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f })
      d += step
    }
    carry = seg - (d - step)
  }
  const end = route[route.length - 1]
  if (distance(out[out.length - 1], end) > step / 3) out.push({ lat: end.lat, lng: end.lng })
  return out
}

// Everything matching needs about a stronghold, worked out once
export function prepareStronghold({ id, name, route, line }) {
  const pts = route || decodePolyline(line)
  const closed = pts.length > 2 && distance(pts[0], pts[pts.length - 1]) < 50
  const samples = samplePath(pts)
  // A closed loop's last sample is its first; keep one copy for rotating
  if (closed && samples.length > 2 && distance(samples[0], samples[samples.length - 1]) < STRONGHOLD.sampleM) samples.pop()
  let w = 180, s = 90, e = -180, n = -90
  for (const p of pts) { w = Math.min(w, p.lng); e = Math.max(e, p.lng); s = Math.min(s, p.lat); n = Math.max(n, p.lat) }
  return { id, name, route: pts, closed, samples, bbox: [w, s, e, n], distanceM: Math.round(pathLength(pts)), start: pts[0] }
}

// Cheap grid of track points, about 60 m cells, for "is any point near here"
function grid(points) {
  const cell = 0.0006
  const m = new Map()
  points.forEach((p, i) => {
    const k = `${Math.floor(p.lat / cell)},${Math.floor(p.lng / cell)}`
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(i)
  })
  return {
    near(q, tol) {
      const out = []
      const r = Math.ceil(tol / 60)
      const cy = Math.floor(q.lat / cell), cx = Math.floor(q.lng / cell)
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
        for (const i of m.get(`${y},${x}`) || []) if (distance(points[i], q) <= tol) out.push(i)
      }
      return out.sort((a, b) => a - b)
    },
  }
}

// Walk the samples in order along the track from index `from`. Each sample
// must be met a little further on (within what the route says plus slack).
function follow(track, D, samples, from, tol, need) {
  const maxMiss = Math.floor(samples.length * (1 - need))
  let p = from
  let gap = 0
  let misses = 0
  let first = null, last = null
  for (let k = 0; k < samples.length; k++) {
    gap += STRONGHOLD.sampleM
    const q = samples[k]
    let hit = -1
    for (let j = p; j < track.length && D[j] - D[p] <= gap * 1.5 + 150; j++) {
      if (distance(track[j], q) <= tol) { hit = j; break }
    }
    if (hit < 0) {
      if (++misses > maxMiss) return null
      continue
    }
    // Settle on the closest point as the runner passes the check point
    while (hit + 1 < track.length && distance(track[hit + 1], q) < distance(track[hit], q)) hit++
    if (first == null) first = hit
    last = hit
    p = hit
    gap = 0
  }
  if (first == null || last <= first) return null
  return { from: first, to: last, hit: (samples.length - misses) / samples.length }
}

// Did this track run the stronghold? Returns { from, to, elapsedS, reverse,
// coverage } for the first complete effort, or null.
export function matchStronghold(track, sh, { toleranceM = STRONGHOLD.toleranceM, need = STRONGHOLD.need } = {}) {
  if (!track?.length || !sh?.samples?.length) return null
  const [w, s, e, n] = sh.bbox
  const pad = 0.001
  const inBox = track.some((p) => p.lng >= w - pad && p.lng <= e + pad && p.lat >= s - pad && p.lat <= n + pad)
  if (!inBox) return null
  const g = grid(track)
  // Quick reject: most check points must have some track point nearby at all
  const nearAny = sh.samples.map((q) => g.near(q, toleranceM))
  const covered = nearAny.filter((l) => l.length).length / sh.samples.length
  if (covered < need) return null

  const D = [0]
  for (let i = 1; i < track.length; i++) D.push(D[i - 1] + distance(track[i - 1], track[i]))

  const N = sh.samples.length
  // Where the effort can begin: the route start, or anywhere on a closed loop
  const starts = sh.closed ? [...Array(Math.ceil(N / 8)).keys()].map((k) => k * 8) : [0]
  for (const reverse of [false, true]) {
    const base = reverse ? sh.samples.slice().reverse() : sh.samples
    for (const s0 of starts) {
      // Rotate a closed loop so it starts at s0 and finishes back there
      const seq = sh.closed ? [...base.slice(s0), ...base.slice(0, s0), base[s0]] : base
      const entries = g.near(seq[0], toleranceM)
      // Try each time the track arrives at this start (not every point in a row)
      let prev = -2
      for (const i of entries) {
        if (i === prev + 1) { prev = i; continue }
        prev = i
        const m = follow(track, D, seq, i, toleranceM, need)
        if (m) {
          const elapsedS = Math.round((track[m.to].t - track[m.from].t) / 1000)
          if (elapsedS > 0) return { from: m.from, to: m.to, elapsedS, reverse, coverage: Math.round(m.hit * 100) / 100, startedAt: track[m.from].t }
        }
      }
    }
  }
  return null
}

// Every stronghold this track completed
export function strongholdsRun(track, strongholds, opts) {
  const out = []
  for (const sh of strongholds) {
    const m = matchStronghold(track, sh, opts)
    if (m) out.push({ strongholdId: sh.id, name: sh.name, ...m })
  }
  return out
}

// The crown and both leaderboards for one stronghold.
// efforts: [{ userId, at, elapsedS, activityId? }]
export function standings(efforts, now = Date.now(), { windowDays = STRONGHOLD.windowDays } = {}) {
  const since = now - windowDays * DAY
  const per = new Map()
  for (const e of efforts) {
    const u = per.get(e.userId) || { userId: e.userId, efforts: 0, last: 0, bestS: null, bestAt: null }
    if (e.at >= since) { u.efforts++; u.last = Math.max(u.last, e.at) }
    if (u.bestS == null || e.elapsedS < u.bestS) { u.bestS = e.elapsedS; u.bestAt = e.at }
    per.set(e.userId, u)
  }
  return rankStandings([...per.values()])
}

// Rank per-player totals: [{ userId, efforts (last 90 days), last, bestS, bestAt }].
// The Worker sums these in SQL and ranks them here, so the rules match.
export function rankStandings(players) {
  const byEfforts = players.filter((u) => u.efforts > 0).sort((a, b) => b.efforts - a.efforts || b.last - a.last)
  const byTime = players.filter((u) => u.bestS != null).sort((a, b) => a.bestS - b.bestS || a.bestAt - b.bestAt)
  const top = byEfforts[0] || null
  return { holder: top ? { userId: top.userId, efforts: top.efforts, last: top.last } : null, byEfforts, byTime }
}

// Where a player stands: how many efforts, and what it takes to win the crown.
export function crownOf(st, userId) {
  const me = st.byEfforts.find((u) => u.userId === userId)
  const mine = me?.efforts || 0
  const holds = st.holder?.userId === userId
  // Ties go to the most recent effort, so a new effort that draws level with
  // the holder wins it: (holder - mine) more efforts takes the crown.
  const toCrown = holds || !st.holder ? 0 : Math.max(1, st.holder.efforts - mine)
  return { ...st, mine, holds, toCrown }
}

export function crownStatus(efforts, userId, now = Date.now(), opts) {
  return crownOf(standings(efforts, now, opts), userId)
}

// The line on the result screen, e.g. "You ran the Regatta Centre lap in
// 31:20. That's 3 efforts in 90 days. 2 more to take the crown from Tom."
export function crownMessage({ name, elapsedS, efforts, holds, tookFrom, holderName, toCrown }) {
  const t = clock(elapsedS)
  const count = efforts === 1 ? 'your first effort in 90 days' : `${efforts} efforts in 90 days`
  const lead = `You ran the ${name} in ${t}. That's ${count}.`
  if (holds && tookFrom) return `${lead} You took the crown from ${tookFrom}.`
  if (holds) return `${lead} You hold the crown.`
  return `${lead} ${toCrown === 1 ? 'One more' : `${toCrown} more`} to take the crown from ${holderName}.`
}
