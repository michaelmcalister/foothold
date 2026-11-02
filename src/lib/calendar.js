// Builds a one-off calendar reminder as an .ics file (one VEVENT with an alarm) and hands it to the phone to add, so reminders need no server push.

const pad = (n) => String(n).padStart(2, '0')
const stamp = (t) => {
  const d = new Date(t)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}
// RFC 5545 text: escape backslashes, semicolons, commas and newlines
const text = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
// Lines longer than 75 octets fold onto the next line with a leading space
function fold(line) {
  const out = []
  let s = line
  while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74) }
  out.push(s)
  return out.join('\r\n')
}

/**
 * An .ics file with one event.
 *   start: epoch ms; minutes: length; alarmMinutes: reminder before the start
 */
export function reminderIcs({ start, minutes = 30, alarmMinutes = 15, title, description = '', uid, now = Date.now() }) {
  if (!Number.isFinite(start)) throw new Error('A reminder needs a start time.')
  const id = uid || `${start.toString(36)}-${Math.random().toString(36).slice(2, 10)}@foothold`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Foothold//Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${id}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + minutes * 60000)}`,
    `SUMMARY:${text(title)}`,
    ...(description ? [`DESCRIPTION:${text(description)}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${text(title)}`,
    `TRIGGER:-PT${Math.max(0, Math.round(alarmMinutes))}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Download an .ics so the phone offers to add it to the calendar */
export function downloadIcs(ics, filename = 'foothold-reminder.ics') {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
