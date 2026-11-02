// Weekly divisions: the six tiers, the week's score, grouping active players into divisions of about 20, ranking and who moves up.
//
// Kinder than most leagues on purpose: the top 5 move up a tier each week and
// nobody ever moves down. A week without an outing just leaves you where you
// are. Shared by the app (practice map) and the Worker. Rules: docs/ENGINE.md.
//
// Bots: there are none on the server yet. When they arrive, leave them out of
// groupPlayers() (filter on is_bot before calling it) and fill spare seats in
// small divisions afterwards, so a bot never takes a real player's promotion.

export const TIERS = [
  { id: 'scout', name: 'Scout' },
  { id: 'pathfinder', name: 'Pathfinder' },
  { id: 'ranger', name: 'Ranger' },
  { id: 'warden', name: 'Warden' },
  { id: 'sentinel', name: 'Sentinel' },
  { id: 'marshal', name: 'Marshal' },
]
export const TOP_TIER = TIERS.length - 1
export const DIVISION_SIZE = 20 // what grouping aims for
export const DIVISION_MAX = 25 // never more than this, late joiners included
export const CITY_MIN = 15 // a city with this many players at a tier gets divisions of its own
export const PROMOTE_TOP = 5
export const PER_HEX = 1
export const PER_OUTING = 10
export const MAX_OUTINGS = 5 // outings that score in a week
export const ACTIVE_DAYS = 14 // an outing in this many days puts you in next week's division

const DAY = 86400000

export const clampTier = (n) => Math.max(0, Math.min(TOP_TIER, Math.round(Number(n) || 0)))

/** { index, id, name, next } for a tier number */
export function tierOut(n) {
  const i = clampTier(n)
  return { index: i, id: TIERS[i].id, name: TIERS[i].name, next: i < TOP_TIER ? { index: i + 1, id: TIERS[i + 1].id, name: TIERS[i + 1].name } : null }
}

/** The week's score from that week's activities: 1 a hex claimed or taken, 10 an outing (up to 5) */
export function weekScore(activities) {
  let hexes = 0
  let outings = 0
  for (const a of activities || []) {
    if (a.rejected) continue
    hexes += (a.claimed || 0) + (a.taken || 0)
    outings++
  }
  return { hexes, outings, score: hexes * PER_HEX + Math.min(outings, MAX_OUTINGS) * PER_OUTING }
}

/** Whole days left in the week, today included (1 on Sunday) */
export const daysLeftIn = (week, now = Date.now()) => Math.max(0, Math.ceil((week.end - now) / DAY))

// Split a sorted list into n runs of near equal size, keeping neighbours together
function chunk(list, n) {
  const out = []
  let at = 0
  for (let i = 0; i < n; i++) {
    const size = Math.floor(list.length / n) + (i < list.length % n ? 1 : 0)
    out.push(list.slice(at, at + size))
    at += size
  }
  return out.filter((g) => g.length)
}

/** How many divisions a group of n players needs: about 20 each, never over the cap */
export const divisionsFor = (n) => (n <= 0 ? 0 : Math.max(1, Math.round(n / DIVISION_SIZE), Math.ceil(n / DIVISION_MAX)))

const byForm = (a, b) => (b.form || 0) - (a.form || 0) || String(a.userId).localeCompare(String(b.userId))

/**
 * Group players into divisions.
 *   players: [{ userId, tier, form (recent weekly score), city (any key, or null) }]
 * Returns [{ tier, city, members: [userId] }]. Same tier only. Within a tier,
 * a city with enough players gets its own divisions; everyone else shares.
 * Players are sorted by form first, so each division is evenly matched.
 */
export function groupPlayers(players) {
  const tiers = new Map()
  for (const p of players || []) {
    const t = clampTier(p.tier)
    if (!tiers.has(t)) tiers.set(t, [])
    tiers.get(t).push(p)
  }
  const out = []
  for (const t of [...tiers.keys()].sort((a, b) => a - b)) {
    const list = tiers.get(t)
    const cities = new Map()
    for (const p of list) {
      const c = p.city ?? null
      if (!cities.has(c)) cities.set(c, [])
      cities.get(c).push(p)
    }
    const pooled = []
    for (const [city, ps] of [...cities].sort((a, b) => b[1].length - a[1].length || String(a[0]).localeCompare(String(b[0])))) {
      if (city == null || ps.length < CITY_MIN) { pooled.push(...ps); continue }
      ps.sort(byForm)
      for (const g of chunk(ps, divisionsFor(ps.length))) out.push({ tier: t, city, members: g.map((p) => p.userId) })
    }
    pooled.sort(byForm)
    for (const g of chunk(pooled, divisionsFor(pooled.length))) {
      // Name the division after its most common city, for late joiners
      const count = new Map()
      for (const p of g) if (p.city != null) count.set(p.city, (count.get(p.city) || 0) + 1)
      const city = [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      out.push({ tier: t, city, members: g.map((p) => p.userId) })
    }
  }
  return out
}

/**
 * Where a late joiner goes: a division of their tier with spare room, their
 * city first, then the smallest. divisions: [{ id, tier, city, size }]. Null means start a new one.
 */
export function pickDivision(divisions, tier, city = null) {
  const open = (divisions || []).filter((d) => d.tier === clampTier(tier) && d.size < DIVISION_MAX)
  if (!open.length) return null
  open.sort((a, b) => (b.city != null && b.city === city) - (a.city != null && a.city === city) || a.size - b.size || String(a.id).localeCompare(String(b.id)))
  return open[0]
}

/**
 * The division table: [{ userId, score, outings, hexes, ... }] ranked.
 * Ties share a rank (two on 40 points are both 3rd). Anyone ranked in the top
 * 5 who scored moves up, so a tie for 5th moves everyone on it up.
 */
export function rankDivision(rows, tier = 0) {
  const sorted = (rows || []).slice().sort((a, b) => b.score - a.score || b.outings - a.outings || String(a.name ?? a.userId).localeCompare(String(b.name ?? b.userId)))
  const canMove = clampTier(tier) < TOP_TIER
  return sorted.map((r) => {
    const rank = 1 + sorted.filter((x) => x.score > r.score).length
    const top = rank <= PROMOTE_TOP && r.score > 0
    return { ...r, rank, top, promotes: top && canMove }
  })
}

/** A player's tier now and their best, from their finished weeks [{ tier, promoted }] in any order */
export function tierFrom(history) {
  let now = 0
  let best = 0
  let latest = -Infinity
  for (const h of history || []) {
    const after = clampTier(h.tier + (h.promoted ? 1 : 0))
    if (after > best) best = after
    const at = h.weekStart ?? Date.parse(String(h.week) + 'T00:00:00Z')
    if (at >= latest) { latest = at; now = after }
  }
  return { tier: now, best: Math.max(best, now) }
}

/** Friendly words. Never about dropping or falling behind: there is no dropping. */
export const placedText = (tier) => `You're in a new ${tierOut(tier).name} division this week. Top ${PROMOTE_TOP} move up.`
export const promotedText = (tier) => `You moved up to ${tierOut(tier).name}.`
