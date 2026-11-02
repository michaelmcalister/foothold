// Loads the first week journey for the signed-in or practice player (engine/firstweek.js), keeps the badge once earned, and remembers which steps this device has celebrated.

import { api } from './api/index.js'
import { store } from './store.js'
import { firstWeek, firstLoopKm, secondOutingAt } from './engine/firstweek.js'
import { reminderIcs, downloadIcs } from './calendar.js'

const SEEN = 'fh-firstweek-cheered'
const DAY = 86400000

export async function loadJourney(now = Date.now()) {
  const { activities } = await api.activities({ limit: 100 })
  const j = firstWeek({ activities: activities.filter((a) => a.userId == null || a.userId === store.user?.id), createdAt: store.user?.createdAt, now, foundingAt: store.user?.foundingAt ?? null })
  if (j.complete && j.badge && store.user && store.user.foundingAt == null) {
    // Earned: keep it for good, even if activities are deleted later
    store.user.foundingAt = j.badge.at
    api.updateMe({ foundingAt: j.badge.at }).catch(() => {})
  }
  return { ...j, loopKm: firstLoopKm(store.mode, usualKm(activities, store.mode)) }
}

function usualKm(activities, mode) {
  const mine = activities.filter((a) => a.mode === mode && !a.rejected)
  return mine.length ? mine.reduce((s, a) => s + a.distanceM, 0) / mine.length / 1000 : null
}

function seen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN) || '[]')) } catch { return new Set() }
}
/** Steps done but not celebrated on this device yet */
export function freshSteps(journey) {
  const s = seen()
  return (journey?.steps || []).filter((x) => x.done && !s.has(x.activityId + ':' + x.id))
}
export function markCheered(steps) {
  if (!steps.length) return
  const s = seen()
  for (const x of steps) s.add(x.activityId + ':' + x.id)
  try { localStorage.setItem(SEEN, JSON.stringify([...s].slice(-30))) } catch { /* storage blocked: fine */ }
}

/** The sound for a celebration: the level up fanfare for the badge, the quest chime otherwise */
export const cheerSound = (steps) => (steps.some((x) => x.n === 3) ? 'levelUp' : 'quest')

/** Download a calendar reminder for the second outing: same time of day, two days after `from` */
export function remindSecondOuting(from = Date.now(), now = Date.now()) {
  let start = secondOutingAt(from)
  while (start < now + 3600000) start += DAY
  const ics = reminderIcs({
    start,
    minutes: 30,
    alarmMinutes: 15,
    title: 'Foothold: second outing',
    description: 'Step 2 of 3 in your first week. Any distance counts. Open Foothold and press Start.',
    now,
  })
  downloadIcs(ics, 'foothold-second-outing.ics')
  return start
}
