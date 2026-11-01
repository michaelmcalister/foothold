// Date helpers for the coach: plain YYYY-MM-DD strings in UTC so plans read the same on every device.
export const DAY_MS = 86400000
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const DAY_LABEL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function toISO(x) {
  if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) return x
  const d = x == null ? new Date() : new Date(x)
  return d.toISOString().slice(0, 10)
}
export function toMs(x) {
  const [y, m, d] = toISO(x).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
export const addDays = (iso, n) => new Date(toMs(iso) + n * DAY_MS).toISOString().slice(0, 10)
export const dayIndex = (iso) => (new Date(toMs(iso)).getUTCDay() + 6) % 7 // Mon = 0
export const dayName = (iso) => DAYS[dayIndex(iso)]
export const diffDays = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY_MS) // b minus a
export const mondayOf = (iso) => addDays(toISO(iso), -dayIndex(toISO(iso)))
export function mondayOnOrAfter(iso) {
  const i = dayIndex(toISO(iso))
  return i === 0 ? toISO(iso) : addDays(toISO(iso), 7 - i)
}
// "Sunday 14 March"
export function fmtDate(iso) {
  const d = new Date(toMs(iso))
  return `${DAY_LABEL[dayName(iso)]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
