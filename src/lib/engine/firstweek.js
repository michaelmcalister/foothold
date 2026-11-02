// The guided first week for new players: three steps (plant a flag, come back, hold your ground) worked out from real activities, plus the "Founding foothold" badge.

const DAY = 86400000

export const FIRST_WEEK_DAYS = 14 // the journey shows for this long after joining
export const STEP2_DAYS = 4 // a second outing within this many days of the first loop
export const STEP3_DAYS = 10 // a third outing within the first this many days
export const FOUNDING_BADGE = { id: 'founding', name: 'Founding foothold', detail: 'Finished the first week journey: a flag planted, back for more, ground held.' }

// Loop sizes for the first suggested loop, by mode: [shortest, longest, default] in km
export const FIRST_LOOP_KM = { walk: [1.2, 2, 1.5], run: [2, 3, 2.5], ride: [4, 8, 5] }

/** A first loop sized to them: their usual distance pulled into a friendly range, or a gentle default */
export function firstLoopKm(mode = 'run', usualKm = null) {
  const [lo, hi, def] = FIRST_LOOP_KM[mode] || FIRST_LOOP_KM.run
  const km = Number.isFinite(usualKm) && usualKm > 0 ? Math.min(hi, Math.max(lo, usualKm)) : def
  return Math.round(km * 10) / 10
}

const RESTING = "No rush. Whenever you're ready."

/**
 * Where a player is on the first week journey.
 *   activities: the player's own [{ id, startedAt, loops, reinforced, rejected }]
 *   createdAt: when the account (or practice map) started
 *   foundingAt: when the badge was earned, if already saved (it stays for good)
 * Steps:
 *   1 plant: the first outing that closes a loop
 *   2 again: any outing after that (aim: within STEP2_DAYS)
 *   3 hold:  any outing after step 2 (aim: within the first STEP3_DAYS)
 * A missed aim never fails a step: it quietly stretches.
 * Only for new players: fewer than 3 outings from before they joined (imports).
 */
export function firstWeek({ activities = [], createdAt, now = Date.now(), foundingAt = null } = {}) {
  const joined = Number.isFinite(createdAt) ? createdAt : now
  const outings = activities.filter((a) => a && !a.rejected && Number.isFinite(a.startedAt)).sort((a, b) => a.startedAt - b.startedAt)
  const before = outings.filter((a) => a.startedAt < joined - DAY) // imported history from before they joined
  const since = outings.filter((a) => a.startedAt >= joined - DAY)
  const eligible = before.length < 3

  const s1 = since.find((a) => (a.loops || 0) > 0) || null
  const s2 = s1 ? since.find((a) => a.startedAt > s1.startedAt) || null : null
  const s3 = s2 ? since.find((a) => a.startedAt > s2.startedAt) || null : null
  const done = [s1, s2, s3]
  const due = [null, s1 ? s1.startedAt + STEP2_DAYS * DAY : null, joined + STEP3_DAYS * DAY]
  const at = done.findIndex((d) => !d) // the step under way, or -1 when all done

  const copy = [
    {
      id: 'plant', title: 'Plant your first flag',
      todo: since.length && !s1 ? 'Close a loop this time: finish where you started and the hexes inside are yours.' : 'Start from home, loop a few blocks and finish where you started. The hexes inside are yours.',
      done: 'Your first ground is on the map.',
      cheer: 'Flag planted. Step 1 of 3 done.',
    },
    {
      id: 'again', title: 'Come back for more',
      todo: 'Get out again in the next few days. Any distance counts.',
      done: 'Back for more. That is how a foothold grows.',
      cheer: 'Back for more. Step 2 of 3 done.',
    },
    {
      id: 'hold', title: 'Hold your ground',
      todo: 'A third outing in your first 10 days. Running back over your first hexes makes them stronger.',
      done: 'Your ground is holding.',
      cheer: 'Founding foothold earned. All three steps done.',
    },
  ]

  const steps = copy.map((c, i) => {
    const d = done[i]
    const state = d ? 'done' : i === at ? 'current' : 'upcoming'
    const stretched = state === 'current' && due[i] != null && now > due[i]
    return {
      n: i + 1,
      id: c.id,
      title: c.title,
      state,
      done: !!d,
      doneAt: d ? d.startedAt : null,
      activityId: d ? d.id : null,
      dueAt: due[i],
      stretched,
      body: d ? c.done : stretched ? RESTING : c.todo,
      cheer: c.cheer,
      reinforced: d ? (d.reinforced || 0) > 0 : false,
    }
  })

  const complete = at === -1
  const earnedAt = foundingAt ?? (complete && eligible ? s3.startedAt : null)
  const ageDays = (now - joined) / DAY
  return {
    eligible,
    active: eligible && !complete && ageDays < FIRST_WEEK_DAYS && ageDays >= -1,
    complete: eligible && complete,
    stepsDone: done.filter(Boolean).length,
    current: at === -1 ? null : steps[at],
    steps,
    badge: earnedAt != null ? { ...FOUNDING_BADGE, at: earnedAt } : null,
    endsAt: joined + FIRST_WEEK_DAYS * DAY,
  }
}

/** Steps a given activity completed (for the result screen and celebrations) */
export function stepsDoneBy(journey, activityId) {
  return (journey?.steps || []).filter((s) => s.activityId && s.activityId === activityId)
}

/** The default time for the "second outing" reminder: the same time of day, two days after `at` (local time) */
export function secondOutingAt(at = Date.now()) {
  const d = new Date(at)
  d.setDate(d.getDate() + 2)
  d.setSeconds(0, 0)
  return d.getTime()
}
