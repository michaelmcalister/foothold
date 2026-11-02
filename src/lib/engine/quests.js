// Weekly solo quests: three goals a week picked from a pool, sized to what the
// player has done lately so they are within reach. Progress is worked out from
// activities, visited hexes, cells and the log of hexes rivals took, never
// stored counters. The same player and week always get the same three quests.
// Missing one costs nothing: next week brings a fresh set.

import { currentStrength } from './territory.js'

const DAY = 86400000
const WEEK = 7 * DAY
const VERB = { run: 'Run', walk: 'Walk', ride: 'Ride' }

// Small seeded random numbers, so a week's quests never reshuffle
function seeded(seed) {
  let s = [...String(seed)].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 2166136261)
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
// Friendly numbers: 7, 15, 40, 120
export function nice(n) {
  if (n < 10) return Math.max(1, Math.round(n))
  if (n < 100) return Math.round(n / 5) * 5
  return Math.round(n / 10) * 10
}

const live = (a) => !a.rejected

/**
 * Everything the quest rules look at, from plain data.
 *   week: { key, start, end }  (engine/weeks.js)
 *   activities: the player's own [{ id, startedAt, mode, distanceM, movingS, loops, claimed, taken, rejected }]
 *   visits: [{ id, at, mode, cells: h3[] }]  hexes each activity passed through
 *   cells: the player's own cells, any mode [{ h3, mode, owner, strength, lastVisit, claimedAt }]
 *   losses: hexes rivals took from the player [{ h3, mode, at }]
 */
export function questContext({ userId, week, now = Date.now(), activities = [], visits = [], cells = [], losses = [] }) {
  const until = Math.min(now, week.end)
  const acts = activities.filter(live)
  const inWeek = acts.filter((a) => a.startedAt >= week.start && a.startedAt < until)

  // Baseline: the four weeks before (or fewer, for someone new)
  const from = week.start - 4 * WEEK
  const before = acts.filter((a) => a.startedAt >= from && a.startedAt < week.start)
  const first = acts.reduce((m, a) => Math.min(m, a.startedAt), Infinity)
  const weeksActive = before.length ? clamp(Math.ceil((week.start - Math.max(first, from)) / WEEK), 1, 4) : 0
  const per = (f) => (weeksActive ? before.reduce((s, a) => s + f(a), 0) / weeksActive : 0)

  // Explored: what was already known before the week, and what each visit added
  const sortedVisits = [...visits].sort((a, b) => a.at - b.at)
  const known = new Set()
  let exploredBefore = 0
  for (const v of sortedVisits) {
    if (v.at >= week.start) break
    for (const h of v.cells || []) {
      if (!known.has(h)) { known.add(h); if (v.at >= from) exploredBefore++ }
    }
  }
  const weekVisits = sortedVisits.filter((v) => v.at >= week.start && v.at < until)
  const seen = new Set(known)
  let explored = 0
  let newGround = 0
  for (const v of weekVisits) {
    let fresh = 0
    for (const h of v.cells || []) if (!seen.has(h)) { seen.add(h); fresh++ }
    explored += fresh
    if (fresh >= Math.max(8, Math.ceil(0.3 * (v.cells?.length || 0)))) newGround++
  }

  // Ground held since Monday (cells change hands, so this is today's view)
  const mine = cells.filter((c) => c.owner === userId)
  const held = mine.filter((c) => (c.claimedAt ?? 0) < week.start && currentStrength(c, until) > 0).length
  const claimedLate = acts.filter((a) => a.startedAt >= week.start - 14 * DAY && a.startedAt < week.start).reduce((s, a) => s + (a.claimed || 0) + (a.taken || 0), 0)

  // Ground won back: lost earlier, yours again this week
  const lostAt = new Map()
  for (const l of losses) {
    if (l.at >= until) continue
    const k = `${l.mode}:${l.h3}`
    lostAt.set(k, Math.max(lostAt.get(k) || 0, l.at))
  }
  const lostRecently = new Set(losses.filter((l) => l.at >= from && l.at < week.start).map((l) => `${l.mode}:${l.h3}`)).size
  let wonBack = 0
  for (const c of mine) {
    const at = lostAt.get(`${c.mode}:${c.h3}`)
    if (at && c.claimedAt >= week.start && c.claimedAt < week.end && c.claimedAt > at) wonBack++
  }

  // The mode they use most lately, for the wording
  const modes = {}
  for (const a of [...before, ...inWeek]) modes[a.mode] = (modes[a.mode] || 0) + 1
  const mode = Object.entries(modes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'run'

  return {
    userId, week, now, mode, weekOver: now >= week.end, isNew: !weeksActive,
    base: {
      outings: per(() => 1),
      loops: per((a) => a.loops || 0),
      newHexes: per((a) => (a.claimed || 0) + (a.taken || 0)),
      taken: per((a) => a.taken || 0),
      explored: weeksActive ? exploredBefore / weeksActive : 0,
      claimedLate,
      lostRecently,
    },
    count: {
      outings: inWeek.length,
      loops: inWeek.reduce((s, a) => s + (a.loops || 0), 0),
      newHexes: inWeek.reduce((s, a) => s + (a.claimed || 0) + (a.taken || 0), 0),
      taken: inWeek.reduce((s, a) => s + (a.taken || 0), 0),
      explored,
      newGround,
      held,
      wonBack,
    },
  }
}

// The pool. Each quest: when it fits, how big, how far along, and its words.
const POOL = [
  {
    kind: 'take', weight: 3,
    target: (b, f, ctx) => (ctx.isNew ? 10 : clamp(nice(b.newHexes * f), 5, 80)),
    count: (c) => c.newHexes,
    title: (n) => `Take ${n} new hexes`,
    detail: 'Wild ground or a rival’s, it all counts.',
  },
  {
    kind: 'loops', weight: 2,
    target: (b, f, ctx) => (ctx.isNew ? 1 : clamp(Math.round(b.loops * f), 1, 6)),
    count: (c) => c.loops,
    title: (n) => (n === 1 ? 'Close a loop' : `Close ${n} loops`),
    detail: 'Finish within 30 m of where you started.',
  },
  {
    kind: 'outings', weight: 3,
    target: (b, f, ctx) => (ctx.isNew ? 2 : clamp(Math.round(b.outings * f), 1, 6)),
    count: (c) => c.outings,
    title: (n) => (n === 1 ? 'Get out once' : `Get out ${n} times`),
    detail: 'Any run, walk or ride counts.',
  },
  {
    kind: 'explore', weight: 2, group: 'explore',
    target: (b, f, ctx) => (ctx.isNew ? 25 : clamp(nice(b.explored * f), 10, 150)),
    count: (c) => c.explored,
    title: (n) => `Explore ${n} new hexes`,
    detail: 'Try a street your tracks have never touched.',
  },
  {
    kind: 'newground', weight: 2, group: 'explore',
    target: () => 1,
    count: (c) => c.newGround,
    title: (n, ctx) => `${VERB[ctx.mode] || 'Run'} somewhere you’ve never been`,
    detail: 'One outing that is mostly new ground.',
  },
  {
    kind: 'hold', weight: 2, waits: true,
    when: (b) => b.claimedLate >= 10,
    target: (b) => clamp(nice(b.claimedLate * 0.5), 5, 150),
    count: (c) => c.held,
    title: (n) => `Hold ${n} hexes all week`,
    detail: 'Ground you held on Monday and still hold on Sunday night.',
  },
  {
    kind: 'takeback', weight: 3, group: 'rival',
    when: (b) => b.lostRecently > 0,
    target: (b) => Math.min(3, b.lostRecently),
    count: (c) => c.wonBack,
    title: (n) => (n === 1 ? 'Take back a hex from a rival' : `Take back ${n} hexes from rivals`),
    detail: 'Ground that was yours before someone ran through it.',
  },
  {
    kind: 'raid', weight: 1, group: 'rival',
    when: (b) => b.taken > 0,
    target: (b, f) => clamp(nice(b.taken * f), 1, 30),
    count: (c) => c.taken,
    title: (n) => (n === 1 ? 'Take a hex from a rival' : `Take ${n} hexes from rivals`),
    detail: 'Your effort has to beat their hold.',
  },
]
export const QUEST_KINDS = POOL.map((q) => q.kind)

/** The week's three quests with progress: [{ id, kind, title, detail, target, count, progress, done, pending }] */
export function weeklyQuests(input) {
  const ctx = input.base ? input : questContext(input)
  const rand = seeded(`${ctx.userId}:${ctx.week.key}`)
  const open = POOL.filter((q) => !q.when || q.when(ctx.base))
  const picked = []
  const groups = new Set()
  while (picked.length < 3 && open.length) {
    const total = open.reduce((s, q) => s + q.weight, 0)
    let r = rand() * total
    let i = 0
    while (i < open.length - 1 && (r -= open[i].weight) >= 0) i++
    const q = open.splice(i, 1)[0]
    if (q.group && groups.has(q.group)) continue
    if (q.group) groups.add(q.group)
    picked.push(q)
  }
  return picked.map((q) => {
    const target = q.target(ctx.base, 1 + rand() * 0.2, ctx)
    const count = q.count(ctx.count)
    const reached = count >= target
    return {
      id: `${ctx.week.key}:${q.kind}`,
      kind: q.kind,
      title: q.title(target, ctx),
      detail: q.detail,
      target,
      count,
      progress: Math.min(count, target),
      // A hold quest is only settled when the week ends
      done: q.waits ? reached && ctx.weekOver : reached,
      pending: !!q.waits && !ctx.weekOver,
    }
  })
}
