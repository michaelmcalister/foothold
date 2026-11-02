// Week maths for quests and weekly recaps: a week runs Monday to Sunday in Sydney time.

export const WEEK_TZ = 'Australia/Sydney'
const DAY = 86400000
const KEY = /^\d{4}-\d{2}-\d{2}$/

// How far a time zone is ahead of UTC at a given instant, in ms
function tzOffset(at, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at).map((x) => [x.type, x.value]))
  return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`) - Math.floor(at / 1000) * 1000
}

// The instant a calendar day starts in the zone
function midnight(day, tz) {
  const local = Date.parse(day + 'T00:00:00Z')
  return local - tzOffset(local - tzOffset(local, tz), tz)
}

const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)

export const isWeekKey = (s) => typeof s === 'string' && KEY.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))

/** The week holding any calendar day 'YYYY-MM-DD': { key (its Monday), start, end } in epoch ms */
export function weekFor(day, tz = WEEK_TZ) {
  if (!isWeekKey(day)) throw new Error('A week is written as YYYY-MM-DD.')
  const back = (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7
  const key = addDays(day, -back)
  return { key, start: midnight(key, tz), end: midnight(addDays(key, 7), tz) }
}

/** The week an instant falls in */
export function weekOf(at = Date.now(), tz = WEEK_TZ) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
  return weekFor(day, tz)
}

export const prevWeek = (w, tz = WEEK_TZ) => weekFor(addDays(w.key, -7), tz)
export const nextWeek = (w, tz = WEEK_TZ) => weekFor(addDays(w.key, 7), tz)

/** "Mon 26 Oct to Sun 1 Nov" */
export function weekLabel(w, tz = WEEK_TZ) {
  const f = (t) => new Intl.DateTimeFormat('en-AU', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(t).replace(',', '')
  return `${f(w.start)} to ${f(w.end - 1)}`
}

/** "Tuesday" for an instant, in the zone */
export const weekdayOf = (t, tz = WEEK_TZ) => new Intl.DateTimeFormat('en-AU', { timeZone: tz, weekday: 'long' }).format(t)
