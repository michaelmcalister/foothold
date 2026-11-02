// Seasons: three-month rounds that follow the Australian seasons in Sydney
// time (summer Dec to Feb, autumn Mar to May, winter Jun to Aug, spring Sep
// to Nov). Each season ranks players by ground gained, and starts with a
// soft reset that weakens held ground so it is easier to take early on.

import { currentStrength } from './territory.js'

const DAY = 86400000
const TZ = 'Australia/Sydney'

// How much a held hex keeps at the start of a season, and the strength the
// soft reset never pushes it below (ground under that is left alone).
export const SEASON_SOFTEN = 0.5
export const SEASON_FLOOR = 10
// The previous season's summary shows for this long into a new season.
export const SUMMARY_DAYS = 21

const KINDS = [
  { key: 'summer', name: 'Summer', start: 12, span: 'Dec to Feb' },
  { key: 'autumn', name: 'Autumn', start: 3, span: 'Mar to May' },
  { key: 'winter', name: 'Winter', start: 6, span: 'Jun to Aug' },
  { key: 'spring', name: 'Spring', start: 9, span: 'Sep to Nov' },
]

let fmt = null
// Sydney wall clock time for an instant
function wall(t) {
  fmt ||= new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  })
  const p = {}
  for (const { type, value } of fmt.formatToParts(t)) p[type] = Number(value)
  return p
}
// Sydney's offset from UTC at an instant, in ms (+10 h or +11 h)
function offsetAt(t) {
  const w = wall(t)
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(t / 1000) * 1000
}
/** Epoch ms of midnight in Sydney on the given date (month 1 to 12) */
export function sydneyMidnight(year, month, day = 1) {
  const guess = Date.UTC(year, month - 1, day)
  const first = guess - offsetAt(guess - 10 * 3600000)
  return guess - offsetAt(first)
}

function build(startYear, startMonth) {
  const kind = KINDS.find((k) => k.start === startMonth)
  const endMonth = startMonth + 3 > 12 ? startMonth - 9 : startMonth + 3
  const endYear = startMonth + 3 > 12 ? startYear + 1 : startYear
  const name = kind.key === 'summer' ? `Summer ${startYear}/${String(startYear + 1).slice(2)}` : `${kind.name} ${startYear}`
  return {
    id: `${startYear}-${String(startMonth).padStart(2, '0')}`,
    key: kind.key,
    name,
    label: `${kind.name} season, ${kind.span}`,
    span: kind.span,
    startsAt: sydneyMidnight(startYear, startMonth),
    endsAt: sydneyMidnight(endYear, endMonth),
  }
}

/** The season a moment falls in */
export function seasonFor(t = Date.now()) {
  const { year, month } = wall(t)
  const start = month === 12 || month <= 2 ? 12 : month <= 5 ? 3 : month <= 8 ? 6 : 9
  return build(month <= 2 ? year - 1 : year, start)
}

/** Season id ('2026-12' is the summer that starts in December 2026) for a moment */
export const seasonId = (t = Date.now()) => seasonFor(t).id

/** A season from its id, or null if the id isn't one */
export function seasonById(id) {
  const m = /^(\d{4})-(03|06|09|12)$/.exec(String(id || ''))
  return m ? build(Number(m[1]), Number(m[2])) : null
}

export const previousSeason = (s) => seasonFor(s.startsAt - 1)
export const nextSeason = (s) => seasonFor(s.endsAt)

/** Whole days left in a season, counting today */
export function daysLeft(season, now = Date.now()) {
  return Math.max(0, Math.ceil((season.endsAt - now) / DAY))
}

/** The season as the API sends it */
export function seasonOut(season, now = Date.now()) {
  return { ...season, daysLeft: daysLeft(season, now) }
}

// ---- soft reset ----

/** One hex after the soft reset: half its strength, but never under the floor. Null if it's wild. */
export function softenCell(cell, now = Date.now()) {
  const cur = currentStrength(cell, now)
  if (!cur) return null
  const target = Math.max(Math.min(cur, SEASON_FLOOR), cur * SEASON_SOFTEN)
  // Scale the stored strength so fading carries on from the same last visit
  return { ...cell, strength: Math.round(cell.strength * (target / cur) * 100) / 100 }
}

/** Should the soft reset for this season touch this hex? Only ground last visited before the season, once. */
export function needsReset(cell, season, now = Date.now()) {
  if (!cell?.owner || cell.seasonReset === season.id) return false
  if ((cell.lastVisit ?? cell.claimedAt ?? 0) >= season.startsAt) return false
  return currentStrength(cell, now) > 0
}

/** The soft reset over a map of cells. Returns only the hexes that changed, each marked with the season id. */
export function softReset(cells, season, now = Date.now()) {
  const updated = new Map()
  for (const [h3, c] of cells) {
    if (!needsReset(c, season, now)) continue
    const soft = softenCell(c, now)
    if (soft) updated.set(h3, { ...soft, seasonReset: season.id })
  }
  return updated
}

// ---- ground gained ----

/** Hexes each player gained (claimed plus taken) in a season, from their activities */
export function seasonGains(activities, season) {
  const out = new Map()
  for (const a of activities) {
    if (a.rejected || a.startedAt < season.startsAt || a.startedAt >= season.endsAt) continue
    const n = (a.claimed || 0) + (a.taken || 0)
    if (n) out.set(a.userId, (out.get(a.userId) || 0) + n)
  }
  return out
}

/** Rank of one player in a gains map (1 is top; ties share a rank) */
export function rankIn(gains, userId) {
  const mine = gains.get(userId) || 0
  let above = 0
  for (const n of gains.values()) if (n > mine) above++
  return above + 1
}

// A badge for the season just played, by ground gained. Everyone who
// took part gets one; there is no badge for losing.
export const SEASON_BADGES = [
  { id: 'wanderer', name: 'Wanderer', min: 1 },
  { id: 'explorer', name: 'Explorer', min: 25 },
  { id: 'trailblazer', name: 'Trailblazer', min: 100 },
  { id: 'vanguard', name: 'Vanguard', min: 300 },
]
export function seasonBadge(gained) {
  let b = null
  for (const x of SEASON_BADGES) if (gained >= x.min) b = x
  return b
}

/** The previous season's summary for a player, or null if they didn't gain ground in it */
export function seasonSummary(gains, userId, season) {
  const gained = gains.get(userId) || 0
  if (!gained) return null
  return { season: seasonOut(season, season.endsAt), gained, rank: rankIn(gains, userId), players: Math.max(1, gains.size), badge: seasonBadge(gained) }
}

/** Show last season's summary? Once, early in the new season, if there is one */
export function showSummary(previous, season, seenId, now = Date.now()) {
  return !!previous && seenId !== season.id && now - season.startsAt < SUMMARY_DAYS * DAY
}
