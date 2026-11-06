// The shared rules for sending routes and planning them for a day and time (src/lib/routeShare.js): the planned time check, the notice, the label and the calendar event.
import { describe, it, expect } from 'vitest'
import { cleanPlannedAt, whenLabel, shareNotice, routeMinutes, routeIcs, icsFilename, ALARM_MINUTES } from '../src/lib/routeShare.js'

const DAY = 86400000
const NOW = Date.UTC(2026, 10, 6, 9, 0)

describe('cleanPlannedAt', () => {
  it('takes null, nothing or a time, and rounds it', () => {
    expect(cleanPlannedAt(null, NOW)).toBeNull()
    expect(cleanPlannedAt(undefined, NOW)).toBeNull()
    expect(cleanPlannedAt('', NOW)).toBeNull()
    expect(cleanPlannedAt(NOW + DAY + 0.4, NOW)).toBe(NOW + DAY)
  })
  it('refuses text, old times and times years away', () => {
    expect(() => cleanPlannedAt('Saturday', NOW)).toThrow(/plannedAt/)
    expect(() => cleanPlannedAt(Date.UTC(2019, 0, 1), NOW)).toThrow()
    expect(() => cleanPlannedAt(NOW + 800 * DAY, NOW)).toThrow()
    expect(() => cleanPlannedAt(Number.NaN, NOW)).toThrow()
  })
})

describe('the words', () => {
  const at = Date.UTC(2026, 10, 7, 20, 0) // 7 am Sunday 8 Nov in Sydney (daylight saving)
  it('labels a day and time without dashes', () => {
    expect(whenLabel(at, 'Australia/Sydney')).toBe('Sun 8 Nov, 7:00 am')
    expect(whenLabel(Date.UTC(2026, 10, 8, 7, 30), 'Australia/Sydney')).toBe('Sun 8 Nov, 6:30 pm')
  })
  it('writes the notice, with the time only when planned', () => {
    expect(shareNotice('Alex', 'Park loop', null)).toBe('Alex sent you a route: Park loop')
    expect(shareNotice('Alex', 'Park loop', at)).toBe('Alex sent you a route: Park loop for Sun 8 Nov, 7:00 am')
    expect(shareNotice('', '', null)).toBe('Someone sent you a route: A route')
    expect(shareNotice('Alex', 'Park loop', at)).not.toMatch(/[–—]|--/)
  })
})

describe('calendar event for a route', () => {
  it('makes one event with a one hour alarm, sized to the route', () => {
    const start = Date.UTC(2026, 10, 7, 20, 0)
    const ics = routeIcs({ id: 'abc', name: 'Park loop, Cooks River', mode: 'run', distanceM: 5000, plannedAt: start, fromName: 'Alex', now: NOW })
    expect(ALARM_MINUTES).toBe(60)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(ics).toContain('DTSTART:20261107T200000Z')
    expect(ics).toContain('DTEND:20261107T203000Z') // 5 km at 6:00 a km
    expect(ics).toContain('SUMMARY:Foothold: Park loop\\, Cooks River')
    expect(ics).toContain('DESCRIPTION:5.0 km run. Sent by Alex. Open Foothold to follow the route.')
    expect(ics).toContain('TRIGGER:-PT60M')
    expect(ics).toContain(`UID:route-abc-${start}@foothold`)
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75)
  })
  it('needs a time, and keeps the event between 15 minutes and 6 hours', () => {
    expect(() => routeIcs({ name: 'x' })).toThrow(/day and time/)
    expect(routeMinutes({ distanceM: 300, mode: 'run' })).toBe(15)
    expect(routeMinutes({ distanceM: 200000, mode: 'walk' })).toBe(360)
    expect(routeMinutes({ distanceM: 20000, mode: 'ride' })).toBe(50)
  })
  it('names the file after the route', () => {
    expect(icsFilename("Sam's park loop")).toBe('sam-s-park-loop.ics')
    expect(icsFilename('')).toBe('foothold-route.ics')
  })
})
