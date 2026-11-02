// Personal bests: the fastest continuous 400 m, 1K, mile and so on inside a
// track (and the longest ride), plus merging them into a player's records.
// Pure functions, shared by the app (local mode) and the Worker.

import { distance } from './geo.js'
import { LIMITS } from './anticheat.js'

// Distances we keep records for, per mode. kind 'time' is fastest over the
// distance; kind 'dist' is the longest single activity.
const FOOT = [
  { key: '400m', label: '400 m', m: 400 },
  { key: '1k', label: '1K', m: 1000 },
  { key: 'mile', label: '1 mile', m: 1609.344 },
  { key: '5k', label: '5K', m: 5000 },
  { key: '10k', label: '10K', m: 10000 },
  { key: 'half', label: 'Half marathon', m: 21097.5 },
  { key: 'marathon', label: 'Marathon', m: 42195 },
]
export const BEST_EFFORTS = {
  run: FOOT,
  walk: FOOT,
  ride: [
    { key: '10k', label: '10 km', m: 10000 },
    { key: '20k', label: '20 km', m: 20000 },
    { key: '40k', label: '40 km', m: 40000 },
    { key: 'longest', label: 'Longest ride', kind: 'dist' },
  ],
}
const JUMP_M = 250 // a gap this big between two fixes is a GPS jump or a cut-out part

export const bestDef = (mode, key) => (BEST_EFFORTS[mode] || BEST_EFFORTS.run).find((d) => d.key === key)

// Split a track into stretches with no impossible moves between fixes, so a
// GPS jump or a section anti-cheat cut out can never make an effort faster.
export function continuousPieces(points, mode = 'run') {
  const lim = LIMITS[mode] || LIMITS.run
  const pieces = []
  let cur = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (!Number.isFinite(p?.t)) continue
    const last = cur[cur.length - 1]
    if (last) {
      const d = distance(last, p)
      const dt = (p.t - last.t) / 1000
      if (dt <= 0 || d > JUMP_M || (d > 20 && (d / dt) * 3.6 > lim.burstKmh)) {
        if (cur.length > 1) pieces.push(cur)
        cur = []
      }
    }
    cur.push(p)
  }
  if (cur.length > 1) pieces.push(cur)
  return pieces
}

// Fastest time over exactly `target` metres inside one piece, interpolating
// the start inside a segment. Returns seconds or null.
function fastestOver(piece, target) {
  const D = [0]
  for (let i = 1; i < piece.length; i++) D.push(D[i - 1] + distance(piece[i - 1], piece[i]))
  if (D[D.length - 1] < target) return null
  let best = Infinity
  let i = 0
  for (let j = 1; j < piece.length; j++) {
    const from = D[j] - target
    if (from < 0) continue
    while (i + 1 < j && D[i + 1] <= from) i++
    const seg = D[i + 1] - D[i]
    const f = seg > 0 ? (from - D[i]) / seg : 0
    const tStart = piece[i].t + (piece[i + 1].t - piece[i].t) * f
    const s = (piece[j].t - tStart) / 1000
    if (s > 0 && s < best) best = s
  }
  return Number.isFinite(best) ? best : null
}

// Best efforts for one cleaned track: { key: seconds } (and longest: metres).
// Any effort averaging faster than the mode's sustained ceiling is ignored.
export function bestEfforts(points, mode = 'run') {
  const defs = BEST_EFFORTS[mode] || BEST_EFFORTS.run
  const lim = LIMITS[mode] || LIMITS.run
  const pieces = continuousPieces(points || [], mode)
  const out = {}
  for (const d of defs) {
    if (d.kind === 'dist') {
      let total = 0
      for (const p of pieces) for (let i = 1; i < p.length; i++) total += distance(p[i - 1], p[i])
      if (total >= 1000) out[d.key] = Math.round(total)
      continue
    }
    let best = null
    for (const p of pieces) {
      const s = fastestOver(p, d.m)
      if (s != null && (best == null || s < best)) best = s
    }
    if (best != null && (d.m / best) * 3.6 <= lim.sustainedKmh) out[d.key] = Math.round(best * 10) / 10
  }
  return out
}

const better = (def, a, b) => (def.kind === 'dist' ? a > b : a < b)

// Fold one activity's bests into a player's records for that mode.
// records: { key: { value, activityId, at } }. Returns the new records and
// what improved: [{ key, label, kind, value, prev }] (prev null on a first).
export function mergeBests(records, bests, mode, { activityId, at }) {
  const next = { ...(records || {}) }
  const improved = []
  for (const def of BEST_EFFORTS[mode] || BEST_EFFORTS.run) {
    const v = bests?.[def.key]
    if (v == null) continue
    const old = next[def.key]
    if (!old || better(def, v, old.value)) {
      next[def.key] = { value: v, activityId, at }
      improved.push({ key: def.key, label: def.label, kind: def.kind || 'time', value: v, prev: old ? old.value : null })
    }
  }
  return { records: next, improved }
}

// Rebuild records from scratch (after an activity is deleted).
// activities: [{ id, startedAt, bests }]
export function rebuildBests(activities, mode) {
  let records = {}
  for (const a of [...activities].sort((x, y) => x.startedAt - y.startedAt)) {
    if (a.bests) records = mergeBests(records, a.bests, mode, { activityId: a.id, at: a.startedAt }).records
  }
  return records
}

// Records as a list in distance order, for the You screen and the API
export function bestsList(records, mode) {
  return (BEST_EFFORTS[mode] || BEST_EFFORTS.run)
    .filter((d) => records?.[d.key])
    .map((d) => ({ key: d.key, label: d.label, kind: d.kind || 'time', value: records[d.key].value, activityId: records[d.key].activityId, at: records[d.key].at }))
}

export function clock(s) {
  s = Math.max(0, Math.round(s))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

function gapWords(s) {
  s = Math.round(s)
  if (s < 60) return `${s} ${s === 1 ? 'second' : 'seconds'}`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m} ${m === 1 ? 'minute' : 'minutes'}${r ? ` ${r} ${r === 1 ? 'second' : 'seconds'}` : ''}`
}

// "New best 5K: 24:31, 18 seconds faster"
export function bestMessage(b) {
  if (b.kind === 'dist') {
    const km = (b.value / 1000).toFixed(1)
    const more = b.prev != null ? (b.value - b.prev) / 1000 : 0
    return b.prev != null && more >= 0.05 ? `New ${b.label.toLowerCase()}: ${km} km, ${more.toFixed(1)} km further` : `New ${b.label.toLowerCase()}: ${km} km`
  }
  const gap = b.prev != null ? b.prev - b.value : 0
  if (b.prev == null) return `New best ${b.label}: ${clock(b.value)}, your first on record`
  return gap >= 1 ? `New best ${b.label}: ${clock(b.value)}, ${gapWords(gap)} faster` : `New best ${b.label}: ${clock(b.value)}, just faster`
}
