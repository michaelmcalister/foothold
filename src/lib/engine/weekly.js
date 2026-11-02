// The weekly recap: one week's distance, time, outings, ground taken, held and
// lost, quests done, the biggest loop, a best moment, and a kind word on how
// it compares with the week before. Pure: both adapters hand it plain data.

import { FADE_GRACE_DAYS, FADE_HALF_LIFE_DAYS, WILD_BELOW, currentStrength } from './territory.js'
import { prevWeek, weekdayOf } from './weeks.js'
import { questContext, weeklyQuests } from './quests.js'

const DAY = 86400000
export const RECAP_VISIT_CAP = 3000 // hexes sent for the week's little map

// When a hex goes wild if nobody visits (same rule as currentStrength)
export function wildAtOf(c) {
  const last = c.lastVisit ?? c.claimedAt ?? 0
  const extra = c.strength > WILD_BELOW ? FADE_HALF_LIFE_DAYS * Math.log2(c.strength / WILD_BELOW) : 0
  return last + (FADE_GRACE_DAYS + extra) * DAY
}

const kmOf = (m) => Math.round(m / 100) / 10

function totals(acts) {
  return {
    distanceM: Math.round(acts.reduce((s, a) => s + (a.distanceM || 0), 0)),
    movingS: Math.round(acts.reduce((s, a) => s + (a.movingS || 0), 0)),
    outings: acts.length,
  }
}

/** Kind words on this week against last. Never a telling-off. */
export function compareText(cur, last) {
  if (!cur.outings) return 'A quiet week. Rest counts too, and your map will be here when you are ready.'
  if (!last.outings) return 'You got out this week after a quiet one. Lovely to see.'
  const ratio = last.distanceM ? cur.distanceM / last.distanceM : 1
  if (ratio >= 1.3) return `${Math.round((ratio - 1) * 100)}% more distance than last week. A big step up, so keep the next few easy.`
  if (ratio >= 1.1) return `${Math.round((ratio - 1) * 100)}% more distance than last week. Nicely built.`
  if (ratio > 0.9) return 'About the same as last week. Steady weeks add up.'
  return 'A lighter week than last. Easy weeks help you come back stronger.'
}

const MODE_NOUN = { run: 'run', walk: 'walk', ride: 'ride' }

// One moment worth remembering, in plain words
function bestMoment(acts) {
  if (!acts.length) return null
  const day = (a) => weekdayOf(a.startedAt)
  const top = (f) => acts.reduce((b, a) => (f(a) > f(b) ? a : b), acts[0])
  const raid = top((a) => a.taken || 0)
  if ((raid.taken || 0) >= 1) {
    return { activityId: raid.id, text: `${day(raid)}’s ${MODE_NOUN[raid.mode] || 'run'} took ${raid.taken === 1 ? 'a hex' : `${raid.taken} hexes`} from rivals.` }
  }
  const claim = top((a) => a.claimed || 0)
  if ((claim.claimed || 0) >= 1) {
    return { activityId: claim.id, text: `${day(claim)}’s ${MODE_NOUN[claim.mode] || 'run'} put ${claim.claimed === 1 ? 'a new hex' : `${claim.claimed} new hexes`} on your map.` }
  }
  const long = top((a) => a.distanceM || 0)
  return { activityId: long.id, text: `Your longest outing was ${kmOf(long.distanceM || 0)} km on ${day(long)}.` }
}

/**
 * The recap for one week. Same inputs as questContext (engine/quests.js).
 * Held hexes come from today's map, so for a past week it counts ground
 * you held then and still hold now.
 */
export function weekRecap(input) {
  const { userId, week, now = Date.now(), activities = [], visits = [], cells = [], losses = [] } = input
  const until = Math.min(now, week.end)
  const live = activities.filter((a) => !a.rejected)
  const acts = live.filter((a) => a.startedAt >= week.start && a.startedAt < until).sort((a, b) => a.startedAt - b.startedAt)
  const pw = prevWeek(week)
  const lastActs = live.filter((a) => a.startedAt >= pw.start && a.startedAt < pw.end)
  const cur = totals(acts)
  const last = totals(lastActs)

  const ctx = questContext(input)
  const quests = weeklyQuests(ctx)

  const mine = cells.filter((c) => c.owner === userId)
  const held = mine.filter((c) => (c.claimedAt ?? 0) < until && currentStrength(c, until) > 0).length
  const lostTo = new Set(losses.filter((l) => l.at >= week.start && l.at < until).map((l) => `${l.mode}:${l.h3}`)).size
  const faded = mine.filter((c) => { const w = wildAtOf(c); return w >= week.start && w < until }).length

  const looped = acts.filter((a) => (a.loops || 0) > 0)
  const size = (a) => (a.claimed || 0) + (a.reinforced || 0) + (a.taken || 0) + (a.held || 0)
  const big = looped.reduce((b, a) => (!b || size(a) > size(b) ? a : b), null)

  const visited = new Set()
  const ids = new Set(acts.map((a) => a.id))
  for (const v of visits) {
    if (!ids.has(v.id)) continue
    for (const h of v.cells || []) { if (visited.size >= RECAP_VISIT_CAP) break; visited.add(h) }
  }

  const byMode = {}
  for (const a of acts) byMode[a.mode] = (byMode[a.mode] || 0) + 1

  return {
    week: { key: week.key, start: week.start, end: week.end, current: now < week.end, previous: pw.key },
    ...cur,
    byMode,
    loops: acts.reduce((s, a) => s + (a.loops || 0), 0),
    hexes: {
      taken: acts.reduce((s, a) => s + (a.claimed || 0) + (a.taken || 0), 0),
      fromRivals: acts.reduce((s, a) => s + (a.taken || 0), 0),
      held,
      lost: lostTo + faded,
      lostToRivals: lostTo,
      faded,
    },
    explored: ctx.count.explored,
    quests,
    questsDone: quests.filter((q) => q.done).length,
    biggestLoop: big ? { activityId: big.id, hexes: size(big), mode: big.mode, startedAt: big.startedAt, distanceM: Math.round(big.distanceM || 0) } : null,
    best: bestMoment(acts),
    last: { ...last, key: pw.key },
    compare: compareText(cur, last),
    visited: [...visited],
  }
}
