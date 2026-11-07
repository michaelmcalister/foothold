// Foothold Wrapped: the pure maths behind the year in review. Year bounds in
// Sydney time, the year's totals, the map film's weekly frames, the favourite
// loop, the rival, the best month and streak, the year's bests, and which
// slides to show. No UI, no storage, no network, so it is unit tested.

import { sydneyMidnight } from './engine/seasons.js'
import { weekOf, nextWeek, WEEK_TZ } from './engine/weeks.js'
import { weeklyStreak } from './engine/streaks.js'
import { BEST_EFFORTS } from './engine/bests.js'
import { distance } from './engine/geo.js'

export const WRAPPED_TZ = WEEK_TZ
export const MAX_FILM_ACTIVITIES = 300 // tracks we read for the map film, most recent first
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

let fmt = null
// Sydney calendar parts for an instant: { year, month (1 to 12), day }
function wall(t) {
  fmt ||= new Intl.DateTimeFormat('en-CA', { timeZone: WRAPPED_TZ, year: 'numeric', month: 'numeric', day: 'numeric' })
  const p = {}
  for (const { type, value } of fmt.formatToParts(t)) if (type !== 'literal') p[type] = Number(value)
  return p
}

/** The year an instant falls in, Sydney time */
export const yearOf = (t = Date.now()) => wall(t).year

/** 1 January to 31 December in Sydney time: { year, start, end } in epoch ms (end is exclusive) */
export function yearBounds(year) {
  return { year, start: sydneyMidnight(year, 1, 1), end: sydneyMidnight(year + 1, 1, 1) }
}

/**
 * Which Wrapped to show right now. The full year shows from 1 December
 * (Sydney time); before that it is "your year so far".
 */
export function wrappedFor(now = Date.now()) {
  const { year, month } = wall(now)
  const full = month === 12
  return {
    ...yearBounds(year),
    full,
    title: full ? `Your ${year} in Foothold` : 'Your year so far',
    entry: `Your ${year} in Foothold`,
  }
}

/** True in December, when the "Your Wrapped is ready" card can show */
export const isWrappedSeason = (now = Date.now()) => wrappedFor(now).full

/** Your counted activities in the year, newest first */
export function yearActivities(activities, bounds) {
  return (activities || [])
    .filter((a) => a && !a.rejected && Number.isFinite(a.startedAt) && a.startedAt >= bounds.start && a.startedAt < bounds.end)
    .sort((a, b) => b.startedAt - a.startedAt)
}

/**
 * The big numbers. hexes is the distinct hexes from the map film when we
 * have them, otherwise the sum of what each activity claimed and took.
 * Climb uses each activity's stored elevGainM only.
 */
export function yearTotals(acts, hexes = null) {
  let m = 0
  let climb = 0
  let claimed = 0
  const modes = { run: 0, walk: 0, ride: 0 }
  for (const a of acts) {
    m += a.distanceM || 0
    if (Number.isFinite(a.elevGainM) && a.elevGainM > 0) climb += a.elevGainM
    claimed += (a.claimed || 0) + (a.taken || 0)
    if (a.mode in modes) modes[a.mode]++
  }
  return {
    km: Math.round(m / 100) / 10,
    activities: acts.length,
    hexes: hexes != null ? hexes : claimed,
    climbM: Math.round(climb),
    modes,
  }
}

/** Your biggest month by distance (ties go to the month with more outings): { month, name, km, count } or null */
export function bestMonth(acts) {
  const by = new Map()
  for (const a of acts) {
    const { month } = wall(a.startedAt)
    const r = by.get(month) || { month, m: 0, count: 0 }
    r.m += a.distanceM || 0
    r.count++
    by.set(month, r)
  }
  let best = null
  for (const r of by.values()) {
    if (!best || r.m > best.m || (r.m === best.m && r.count > best.count)) best = r
  }
  if (!best || best.count === 0) return null
  return { month: best.month, name: MONTHS[best.month - 1], km: Math.round(best.m / 100) / 10, count: best.count }
}

/** The longest weekly streak inside the year (engine/streaks.js rules, rest weeks and all) */
export function yearStreak(acts, bounds, now = Date.now()) {
  if (!acts.length) return 0
  const s = weeklyStreak({ activities: acts, now: Math.min(now, bounds.end - 1) })
  return s.longest
}

/**
 * The film's frames: one per week of the year from your first hex to the
 * last, each with the hexes that were new that week.
 *   entries: [{ startedAt, hexes: [h3] }]
 * Returns [{ key, label, start, added: [h3], total }].
 */
export function filmFrames(entries, bounds) {
  const list = (entries || []).filter((e) => e.hexes?.length && e.startedAt >= bounds.start && e.startedAt < bounds.end)
    .sort((a, b) => a.startedAt - b.startedAt)
  if (!list.length) return []
  const seen = new Set()
  const frames = []
  let i = 0
  const last = weekOf(list[list.length - 1].startedAt, WRAPPED_TZ)
  for (let w = weekOf(list[0].startedAt, WRAPPED_TZ); w.key <= last.key; w = nextWeek(w, WRAPPED_TZ)) {
    const added = []
    while (i < list.length && list[i].startedAt < w.end) {
      for (const h of list[i].hexes) if (!seen.has(h)) { seen.add(h); added.push(h) }
      i++
    }
    const [, mm, dd] = w.key.split('-').map(Number)
    frames.push({ key: w.key, label: `${dd} ${SHORT[mm - 1]}`, start: w.start, added, total: seen.size })
  }
  return frames
}

// Centre of a [lng, lat] ring
function centreOf(ring) {
  let lat = 0
  let lng = 0
  const n = Math.max(1, ring.length - 1) // the last point repeats the first
  for (let k = 0; k < n; k++) { lng += ring[k][0]; lat += ring[k][1] }
  return { lat: lat / n, lng: lng / n }
}

export const LOOP_NEAR_M = 250 // two loops are "the same" when their centres are this close
export const LOOP_SIZE_RATIO = 0.25 // and their lengths are within a quarter of each other

/**
 * Your most repeated loop. Loops group together when their centres sit
 * within LOOP_NEAR_M of each other and their lengths match within
 * LOOP_SIZE_RATIO, which catches the same block run either way round.
 *   loops: [{ activityId, startedAt, ring: [[lng, lat]], perimeterM }]
 * Returns { times, ring, perimeterM, activityIds, first, last } or null when
 * nothing was run twice.
 */
export function favouriteLoop(loops) {
  const groups = []
  const sorted = (loops || []).filter((l) => l?.ring?.length >= 4 && l.perimeterM > 0).sort((a, b) => a.startedAt - b.startedAt)
  for (const l of sorted) {
    const c = centreOf(l.ring)
    const g = groups.find((x) => distance(x.centre, c) <= LOOP_NEAR_M && Math.abs(x.perimeterM - l.perimeterM) <= LOOP_SIZE_RATIO * Math.max(x.perimeterM, l.perimeterM))
    if (g) {
      g.items.push(l)
      g.activities.add(l.activityId)
    } else {
      groups.push({ centre: c, perimeterM: l.perimeterM, items: [l], activities: new Set([l.activityId]) })
    }
  }
  let best = null
  for (const g of groups) {
    if (!best || g.items.length > best.items.length || (g.items.length === best.items.length && g.items[g.items.length - 1].startedAt > best.items[best.items.length - 1].startedAt)) best = g
  }
  if (!best || best.items.length < 2) return null
  const latest = best.items[best.items.length - 1]
  const avg = best.items.reduce((s, l) => s + l.perimeterM, 0) / best.items.length
  return {
    times: best.items.length,
    ring: latest.ring,
    perimeterM: Math.round(avg),
    activityIds: [...best.activities],
    first: best.items[0].startedAt,
    last: latest.startedAt,
  }
}

/**
 * The person you swapped the most ground with this year.
 *   rivals: [{ userId, name, colour, crest, tookFromThem, tookFromYou }]
 * Ties go to the closer contest, then by name. null when no ground changed hands.
 */
export function pickRival(rivals) {
  const list = (rivals || [])
    .map((r) => ({ ...r, tookFromThem: r.tookFromThem || 0, tookFromYou: r.tookFromYou || 0 }))
    .map((r) => ({ ...r, total: r.tookFromThem + r.tookFromYou }))
    .filter((r) => r.total > 0)
  list.sort((a, b) => b.total - a.total || Math.abs(a.tookFromThem - a.tookFromYou) - Math.abs(b.tookFromThem - b.tookFromYou) || String(a.name).localeCompare(String(b.name)))
  return list[0] || null
}

/** A friendly line about the rivalry. Never frames you as the loser. */
export function rivalLine(r, year = yearOf()) {
  if (!r) return ''
  const them = r.name || 'Your rival'
  if (r.tookFromThem && r.tookFromYou) return `You took ${r.tookFromThem} from ${them}. ${them} took ${r.tookFromYou} back. Good, honest rivalry.`
  if (r.tookFromThem) return `You took ${r.tookFromThem} from ${them}. Expect a visit in ${year + 1}.`
  return `${them} took ${r.tookFromYou} from you, which means you picked ground worth having.`
}

/**
 * Your fastest efforts this year, from each activity's bests, one per
 * distance (and mode), longest distances first. pb is true when it is
 * also your all time record.
 *   acts: year activities with { id, mode, startedAt, bests }
 *   records: { mode: [{ key, activityId }] } from api.bests (optional)
 */
export function yearBests(acts, records = {}, max = 4) {
  const out = new Map()
  for (const a of acts) {
    if (!a.bests) continue
    for (const def of BEST_EFFORTS[a.mode] || []) {
      const v = a.bests[def.key]
      if (v == null) continue
      const k = `${a.mode}:${def.key}`
      const old = out.get(k)
      const better = def.kind === 'dist' ? !old || v > old.value : !old || v < old.value
      if (better) out.set(k, { mode: a.mode, key: def.key, label: def.label, kind: def.kind || 'time', value: v, activityId: a.id, at: a.startedAt, m: def.m || 0 })
    }
  }
  const list = [...out.values()].map((b) => ({ ...b, pb: !!(records[b.mode] || []).find((r) => r.key === b.key && r.activityId === b.activityId) }))
  list.sort((a, b) => Number(b.pb) - Number(a.pb) || b.m - a.m)
  return list.slice(0, max)
}

/**
 * Everything the slides need, from plain inputs.
 *   activities: your activities (any years); bounds from yearBounds
 *   film: [{ activityId, startedAt, hexes, loops: [{ ring, perimeterM }] }]
 *   rivals, records: as above
 */
export function yearSummary({ activities = [], bounds, film = null, rivals = [], records = {}, now = Date.now() }) {
  const acts = yearActivities(activities, bounds)
  const frames = film ? filmFrames(film, bounds) : []
  const hexes = frames.length ? frames[frames.length - 1].total : null
  const loops = (film || []).flatMap((f) => (f.loops || []).map((l) => ({ ...l, activityId: f.activityId, startedAt: f.startedAt })))
  return {
    year: bounds.year,
    totals: yearTotals(acts, hexes),
    frames,
    footprint: frames.flatMap((f) => f.added),
    loop: favouriteLoop(loops),
    rival: pickRival(rivals),
    month: bestMonth(acts),
    streak: yearStreak(acts, bounds, now),
    bests: yearBests(acts, records),
  }
}

/**
 * The slides to show, in order, skipping any with nothing to say. With no
 * outings at all it is a warm hello and an invitation, never a zero.
 */
export function slidesFor(sum) {
  if (!sum || !sum.totals?.activities) return ['intro', 'empty']
  const out = ['intro']
  if (sum.footprint?.length) out.push('map')
  out.push('numbers')
  if (sum.loop) out.push('loop')
  if (sum.rival) out.push('rival')
  if (sum.month) out.push('month')
  if (sum.bests?.length) out.push('bests')
  out.push('share')
  return out
}
