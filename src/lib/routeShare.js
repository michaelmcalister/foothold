// Sending planned routes to your crew and putting a day and time on them: the shared rules (planned time check, notice wording, day and time label) and the one-event .ics for "Add to calendar". Used by the app and the Worker.

import { reminderIcs, downloadIcs } from './calendar.js'
import { FALLBACK_PACE } from './planner.js'

const DAY = 86400000
export const MAX_SHARE_TO = 20 // recipients in one send
export const ALARM_MINUTES = 60 // the calendar reminder goes off an hour before
const EARLIEST = Date.UTC(2020, 0, 1)

/** A planned time from a request: null to clear, else epoch ms from 2020 to two years out. Throws a plain message. */
export function cleanPlannedAt(v, now = Date.now()) {
  if (v == null || v === '') return null
  if (typeof v !== 'number' || !Number.isFinite(v) || v < EARLIEST || v > now + 730 * DAY) {
    throw new Error('plannedAt must be a time in epoch milliseconds, or null.')
  }
  return Math.round(v)
}

/** "Sat 8 Nov, 7:00 am" in the given time zone (the device's when left out) */
export function whenLabel(t, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone,
  }).formatToParts(new Date(t)).map((p) => [p.type, p.value]))
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} ${String(parts.dayPeriod || '').toLowerCase()}`.trim()
}

/** The recipient's notification: "Sam sent you a route: Park loop", plus " for Sat 8 Nov, 7:00 am" when planned */
export function shareNotice(fromName, routeName, plannedAt, timeZone = 'Australia/Sydney') {
  const base = `${fromName || 'Someone'} sent you a route: ${routeName || 'A route'}`
  return plannedAt == null ? base : `${base} for ${whenLabel(plannedAt, timeZone)}`
}

/** About how long the route takes at an easy pace, in minutes (15 to 360), for the calendar event */
export function routeMinutes({ distanceM = 0, mode = 'run' } = {}) {
  const pace = FALLBACK_PACE[mode] || FALLBACK_PACE.run
  return Math.min(360, Math.max(15, Math.round((distanceM / 1000) * pace / 60)))
}

const NOUN = { run: 'run', walk: 'walk', ride: 'ride' }

/** One calendar event for a planned route, with an alarm an hour before */
export function routeIcs({ id, name, mode = 'run', distanceM = 0, plannedAt, fromName = null, now = Date.now() }) {
  if (plannedAt == null) throw new Error('Pick a day and time first.')
  const km = (distanceM / 1000).toFixed(1)
  const lines = [`${km} km ${NOUN[mode] || 'run'}.`]
  if (fromName) lines.push(`Sent by ${fromName}.`)
  lines.push('Open Foothold to follow the route.')
  return reminderIcs({
    start: plannedAt,
    minutes: routeMinutes({ distanceM, mode }),
    alarmMinutes: ALARM_MINUTES,
    title: `Foothold: ${name || 'Planned route'}`,
    description: lines.join(' '),
    uid: `route-${id || 'new'}-${plannedAt}@foothold`,
    now,
  })
}

export const icsFilename = (name) => `${String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'foothold-route'}.ics`

/** Hand the phone a calendar event for this route (it needs plannedAt) */
export function addRouteToCalendar(route) {
  downloadIcs(routeIcs(route), icsFilename(route.name))
}
