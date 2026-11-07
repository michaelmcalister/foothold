// King of the hill: the steepest climbs in an area become hills, and the
// fastest time up each one (run, walk and ride kept apart) holds it.
// Pure functions shared by the app (practice map) and the Worker:
//   findClimbs   climbs in one activity, from heights along the track
//   findEfforts  passes over hills we already know, from the track alone
//   detectHills  both together: new hills to make and efforts to record
//   hillBoard    the leaderboard, the holder and your best
//   hillGlow     the hexes around a hill that glow the holder's colour
// The data calls the fastest person the holder; the app says King of the hill.

import { latLngToCell, gridDisk, cellToLatLng } from 'h3-js'
import { distance } from './geo.js'
import { inZone } from './privacy.js'
import { RES as HEX_RES } from './territory.js'
import { simplify } from '../planner.js'

export const HILL = {
  minGainM: 20, // a climb needs at least this much height...
  minLengthM: 250, // ...over at least this distance...
  minGrade: 0.04, // ...at an average grade of 4% or more
  dipM: 3, // dips smaller than this don't end a climb
  res: 9, // hill keys use coarser hexes than the territory map (about 350 m across)
  snapM: 60, // a climb whose ends are this close to a known hill's ends is that hill
  nearM: 40, // a pass must come this close to a hill's start and end
  lengthTol: 0.25, // and cover its length give or take a quarter
  glowM: 80, // hexes this close to a hill line glow the holder's colour
  maxLinePoints: 60,
  maxProfilePoints: 48,
}

const round1 = (v) => Math.round(v * 10) / 10

/**
 * Climbs in one activity. `samples` come from sampleByDistance (each has d,
 * lat, lng and t), `alts` is one height per sample (null for a gap).
 * Returns [{ start, end, gainM, lengthM, grade, seconds }] where start and
 * end are sample indexes and seconds is null when the track has no times.
 */
export function findClimbs(samples, alts, opts = {}) {
  const o = { ...HILL, ...opts }
  const out = []
  const n = Math.min(samples?.length || 0, alts?.length || 0)
  let lo = -1 // lowest point of the climb so far
  let hi = -1 // highest point since lo
  const close = () => {
    if (lo < 0 || hi <= lo) return
    // Trim flat ground off both ends so the grade is the climb's own
    let s = lo
    while (s + 1 < hi && alts[s + 1] <= alts[lo] + 1) s++
    let e = hi
    while (e - 1 > s && alts[e - 1] >= alts[hi] - 1) e--
    const gainM = alts[e] - alts[s]
    const lengthM = samples[e].d - samples[s].d
    if (!(lengthM > 0)) return
    const grade = gainM / lengthM
    if (gainM < o.minGainM || lengthM < o.minLengthM || grade < o.minGrade) return
    const t0 = samples[s].t
    const t1 = samples[e].t
    const seconds = Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0 ? Math.round((t1 - t0) / 1000) : null
    out.push({ start: s, end: e, gainM: Math.round(gainM), lengthM: Math.round(lengthM), grade: Math.round(grade * 1000) / 1000, seconds })
  }
  for (let i = 0; i < n; i++) {
    const a = alts[i]
    if (!Number.isFinite(a)) { close(); lo = hi = -1; continue }
    if (lo < 0) { lo = hi = i; continue }
    if (a > alts[hi]) { hi = i; continue }
    if (a < alts[lo] && hi === lo) { lo = hi = i; continue }
    if (alts[hi] - a > o.dipM) {
      // The climb is over: score it, then start looking again from here
      close()
      lo = hi = i
    } else if (a < alts[lo]) {
      // Below where it started (only after a tiny rise): start again
      lo = hi = i
    }
  }
  close()
  return out
}

const pt = (s) => ({ lat: s.lat, lng: s.lng })

/** The hill key: start hex and end hex at a coarse resolution, by mode. */
export function hillKey(start, end, mode = 'run', res = HILL.res) {
  return `${mode}:${latLngToCell(start.lat, start.lng, res)}>${latLngToCell(end.lat, end.lng, res)}`
}

/**
 * The known hill a climb is, or null. Ends within snapM of a hill's ends
 * snap to it. The same key counts too when the length is about the same
 * and the ends are within twice that (a parallel street is another hill).
 */
export function matchHill(climb, hills, mode = 'run', opts = {}) {
  const o = { ...HILL, ...opts }
  const key = hillKey(climb.startPt, climb.endPt, mode, o.res)
  let best = null
  let bestD = Infinity
  for (const h of hills) {
    if (h.mode !== mode) continue
    const ds = distance(climb.startPt, h.start)
    const de = distance(climb.endPt, h.end)
    const similar = Math.abs(climb.lengthM - h.lengthM) <= h.lengthM * o.lengthTol
    const ok = (ds <= o.snapM && de <= o.snapM) || (h.key === key && similar && ds <= 2 * o.snapM && de <= 2 * o.snapM)
    if (ok && ds + de < bestD) { best = h; bestD = ds + de }
  }
  return best
}

/** The canonical line for a new hill: the climb's track, simplified, as [[lng, lat]]. */
export function hillLine(samples, start, end, opts = {}) {
  const o = { ...HILL, ...opts }
  const raw = samples.slice(start, end + 1).map((s) => [Math.round(s.lng * 1e6) / 1e6, Math.round(s.lat * 1e6) / 1e6])
  let tol = 4
  let line = simplify(raw, tol)
  while (line.length > o.maxLinePoints) { tol *= 1.6; line = simplify(raw, tol) }
  return line
}

/** Heights along the climb for the hill page chart: [[metres from the start, height]]. */
export function hillProfile(samples, alts, start, end, opts = {}) {
  const o = { ...HILL, ...opts }
  const n = end - start + 1
  const step = Math.max(1, Math.ceil(n / o.maxProfilePoints))
  const out = []
  for (let k = start; k <= end; k += step) out.push([Math.round(samples[k].d - samples[start].d), round1(alts[k])])
  if (out[out.length - 1][0] !== Math.round(samples[end].d - samples[start].d)) out.push([Math.round(samples[end].d - samples[start].d), round1(alts[end])])
  return out
}

/**
 * A name for a hill. No geocoder: a street or park name when the caller
 * has one cheaply, otherwise its height ("The 32 m climb").
 */
export function hillName({ gainM, place = null }) {
  const p = String(place || '').trim().slice(0, 40)
  return p ? `The climb on ${p}` : `The ${Math.round(gainM)} m climb`
}

/** A hill name mid-sentence: "the 32 m climb". */
export const inSentence = (name) => String(name || 'a hill').replace(/^The /, 'the ')

// The sample nearest a point within a run of samples that are all close to it
function nearestRun(samples, from, p, nearM) {
  for (let i = from; i < samples.length; i++) {
    if (distance(samples[i], p) > nearM) continue
    let best = i
    let bestD = distance(samples[i], p)
    let k = i + 1
    while (k < samples.length) {
      const d = distance(samples[k], p)
      if (d > nearM) break
      if (d < bestD) { best = k; bestD = d }
      k++
    }
    return { at: best, next: k }
  }
  return null
}

// Does the track between i and j follow the hill's line (not a short cut)?
function follows(samples, i, j, line, nearM) {
  if (line.length < 3) return true
  for (const f of [0.25, 0.5, 0.75]) {
    const [lng, lat] = line[Math.round(f * (line.length - 1))]
    let ok = false
    for (let k = i; k <= j && !ok; k++) ok = distance(samples[k], { lat, lng }) <= nearM * 1.5
    if (!ok) return false
  }
  return true
}

/**
 * Passes over known hills in one activity, from the track alone (no heights
 * needed). Returns [{ hillId, seconds, start, end }], the best pass per hill.
 */
export function findEfforts(samples, hills, mode = 'run', opts = {}) {
  const o = { ...HILL, ...opts }
  const out = []
  for (const h of hills) {
    if (h.mode !== mode) continue
    let best = null
    let from = 0
    while (from < samples.length) {
      const a = nearestRun(samples, from, h.start, o.nearM)
      if (!a) break
      from = a.next
      const maxD = samples[a.at].d + h.lengthM * (1 + o.lengthTol)
      const tail = []
      for (let k = a.at + 1; k < samples.length && samples[k].d <= maxD; k++) tail.push(k)
      if (!tail.length) continue
      const b = nearestRun(samples.slice(0, tail[tail.length - 1] + 1), a.at + 1, h.end, o.nearM)
      if (!b) continue
      const len = samples[b.at].d - samples[a.at].d
      if (len < h.lengthM * (1 - o.lengthTol) || len > h.lengthM * (1 + o.lengthTol)) continue
      if (!follows(samples, a.at, b.at, h.line || [], o.nearM)) continue
      const t0 = samples[a.at].t
      const t1 = samples[b.at].t
      if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) continue
      const seconds = Math.round((t1 - t0) / 1000)
      if (!best || seconds < best.seconds) best = { hillId: h.id, seconds, start: a.at, end: b.at }
    }
    if (best) out.push(best)
  }
  return out
}

/**
 * Everything one activity does for hills.
 *   samples, alts: the track by distance and heights (alts may be null:
 *     then only known hills count, since a new hill needs heights)
 *   hills: known hills nearby [{ id, key, mode, start, end, lengthM, line }]
 *   zones: the player's privacy zones. A climb or pass that starts or ends
 *     inside one never makes a hill and never counts.
 * Returns { created: [new hill without id], efforts: [{ hillId | created index, seconds }] }.
 * A new hill is { key, name, mode, line, profile, gainM, lengthM, grade, start, end }.
 */
export function detectHills({ samples, alts = null, hills = [], mode = 'run', zones = [] }, opts = {}) {
  const o = { ...HILL, ...opts }
  const priv = (p) => zones?.length && inZone(p, zones)
  const known = hills.filter((h) => h.mode === mode)
  const efforts = findEfforts(samples, known, mode, o).filter((e) => !priv(samples[e.start]) && !priv(samples[e.end]))
  const counted = new Set(efforts.map((e) => e.hillId))
  const created = []
  for (const c of alts ? findClimbs(samples, alts, o) : []) {
    const climb = { ...c, startPt: pt(samples[c.start]), endPt: pt(samples[c.end]) }
    if (priv(climb.startPt) || priv(climb.endPt) || climb.seconds == null) continue
    const k = matchHill(climb, known, mode, o)
    if (k) {
      // A known hill the line check missed (a wobbly track): the climb's own time counts
      if (!counted.has(k.id)) { efforts.push({ hillId: k.id, seconds: climb.seconds, start: c.start, end: c.end }); counted.add(k.id) }
      continue
    }
    const fresh = created.map((h, i) => ({ ...h, id: `new:${i}` }))
    const again = matchHill(climb, fresh, mode, o)
    if (again) {
      // The same new hill twice in one outing (hill repeats): keep the faster
      const e = efforts.find((x) => x.hillId === again.id)
      if (e && climb.seconds < e.seconds) Object.assign(e, { seconds: climb.seconds, start: c.start, end: c.end })
      continue
    }
    const line = hillLine(samples, c.start, c.end, o)
    if (line.some(([lng, lat]) => priv({ lat, lng }))) continue // never draw a line through someone's zone
    created.push({
      key: hillKey(climb.startPt, climb.endPt, mode, o.res),
      name: hillName({ gainM: c.gainM }),
      mode,
      line,
      profile: hillProfile(samples, alts, c.start, c.end, o),
      gainM: c.gainM,
      lengthM: c.lengthM,
      grade: c.grade,
      start: climb.startPt,
      end: climb.endPt,
    })
    efforts.push({ hillId: `new:${created.length - 1}`, seconds: climb.seconds, start: c.start, end: c.end })
  }
  return { created, efforts }
}

/**
 * Each person's best on one hill, fastest first: [{ userId, seconds, at, rank }].
 * efforts: [{ userId, seconds, createdAt }]. Ties go to whoever did it first.
 */
export function bestPerUser(efforts) {
  const by = new Map()
  for (const e of efforts) {
    const cur = by.get(e.userId)
    if (!cur || e.seconds < cur.seconds || (e.seconds === cur.seconds && e.createdAt < cur.at)) by.set(e.userId, { userId: e.userId, seconds: e.seconds, at: e.createdAt })
  }
  const list = [...by.values()].sort((a, b) => a.seconds - b.seconds || a.at - b.at)
  return list.map((u, i) => ({ ...u, rank: i + 1 }))
}

/** The holder from a hill's efforts: { userId, seconds } or null. */
export function holderOf(efforts) {
  const top = bestPerUser(efforts)[0]
  return top ? { userId: top.userId, seconds: top.seconds } : null
}

/** The board: { top: first n, mine: your row or null, holder }. */
export function hillBoard(efforts, userId, n = 10) {
  const list = bestPerUser(efforts)
  return { top: list.slice(0, n), mine: list.find((u) => u.userId === userId) || null, holder: list[0] ? { userId: list[0].userId, seconds: list[0].seconds } : null }
}

/**
 * What a new effort does to the hill: { holder, tookCrown, from }.
 * The crown moves only on a strictly faster time.
 */
export function holderAfter(hill, userId, seconds) {
  const had = hill.holderUser ? { userId: hill.holderUser, seconds: hill.holderS } : null
  if (!had) return { holder: { userId, seconds }, tookCrown: true, from: null }
  if (seconds < had.seconds) return { holder: { userId, seconds }, tookCrown: had.userId !== userId, from: had.userId !== userId ? had.userId : null }
  return { holder: had, tookCrown: false, from: null }
}

/** "1:42", or "12:05", or "1:02:10" for a long one. */
export function hillTime(s) {
  const v = Math.max(0, Math.round(s || 0))
  const h = Math.floor(v / 3600)
  const m = Math.floor((v % 3600) / 60)
  const sec = String(v % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** The kind note for someone whose hill was taken. */
export function hillTakenText(name, takerName, seconds) {
  return `${takerName || 'Someone'} took the hill on ${inSentence(name)}. Your time to beat: ${hillTime(seconds)}. Fancy another go?`
}

// Distance from a point to a [lng, lat] line, in metres (flat earth, fine at street scale)
function toLine(p, line) {
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180)
  const ky = 110540
  const px = p.lng * kx, py = p.lat * ky
  let best = Infinity
  for (let i = 0; i < line.length; i++) {
    const ax = line[i][0] * kx, ay = line[i][1] * ky
    const b = line[i + 1] || line[i]
    const bx = b[0] * kx, by = b[1] * ky
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
    best = Math.min(best, Math.hypot(px - ax - t * dx, py - ay - t * dy))
  }
  return best
}

/** Territory hexes (the map's resolution) whose centres are within glowM of the hill line. */
export function hillGlow(line, { glowM = HILL.glowM, res = HEX_RES } = {}) {
  if (!line?.length) return []
  const seeds = new Set()
  for (let i = 0; i < line.length; i++) {
    const [lng, lat] = line[i]
    seeds.add(latLngToCell(lat, lng, res))
    const next = line[i + 1]
    if (!next) continue
    // Fill in between points so a long straight stretch has no gaps
    const steps = Math.ceil(distance({ lat, lng }, { lat: next[1], lng: next[0] }) / 40)
    for (let k = 1; k < steps; k++) {
      const f = k / steps
      seeds.add(latLngToCell(lat + (next[1] - lat) * f, lng + (next[0] - lng) * f, res))
    }
  }
  const out = new Set()
  for (const s of seeds) {
    for (const h of gridDisk(s, 1)) {
      if (out.has(h)) continue
      const [lat, lng] = cellToLatLng(h)
      if (toLine({ lat, lng }, line) <= glowM) out.add(h)
    }
  }
  return [...out]
}
