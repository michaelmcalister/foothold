// Habit features: weekly streaks with banked rest weeks, the guided first week, and the .ics reminder.
import { describe, it, expect } from 'vitest'
import { weeklyStreak, streakMilestoneNote, streakLine, MAX_BANKED, STRIP_WEEKS } from '../src/lib/engine/streaks.js'
import { firstWeek, firstLoopKm, stepsDoneBy, secondOutingAt, FIRST_LOOP_KM } from '../src/lib/engine/firstweek.js'
import { reminderIcs } from '../src/lib/calendar.js'

const DAY = 86400000
// Sydney local times, with the offset written out (AEDT +11 from early October, AEST +10 from early April)
const syd = (s, off = '+11:00') => Date.parse(`${s}${off}`)
const NOW = syd('2026-11-04T12:00:00') // a Wednesday; this week starts Monday 2 November
const act = (t, extra = {}) => ({ id: `a${t}`, startedAt: t, ...extra })
// An outing on the Tuesday of the week `back` weeks before this one
const weeksAgo = (back, extra) => act(NOW - back * 7 * DAY - DAY, extra)
const DASHES = /[—–]|--/

describe('weekly streaks', () => {
  it('starts empty, with this week in progress', () => {
    const s = weeklyStreak({ activities: [], now: NOW })
    expect(s).toMatchObject({ current: 0, longest: 0, banked: 0, active: false, thisWeek: { key: '2026-11-02', out: false } })
    expect(s.weeks).toHaveLength(STRIP_WEEKS)
    expect(s.weeks.at(-1)).toMatchObject({ key: '2026-11-02', state: 'now' })
    expect(s.weeks.slice(0, -1).every((w) => w.state === 'before')).toBe(true)
  })

  it('counts this week once it has an outing, and banks nothing until the week ends', () => {
    const s = weeklyStreak({ activities: [act(NOW - 3600000)], now: NOW })
    expect(s).toMatchObject({ current: 1, banked: 0, active: true, startKey: '2026-11-02', thisWeek: { out: true } })
    expect(s.weeks.at(-1).state).toBe('now')
  })

  it('treats the current week as in progress, never missed', () => {
    const s = weeklyStreak({ activities: [weeksAgo(1), weeksAgo(2), weeksAgo(3)], now: NOW })
    expect(s.current).toBe(3)
    expect(s.banked).toBe(3)
    expect(s.weeks.at(-1).state).toBe('now')
    expect(s.weeks.slice(-4, -1).map((w) => w.state)).toEqual(['out', 'out', 'out'])
  })

  it('banks one rest week per finished week, up to three', () => {
    const s = weeklyStreak({ activities: [1, 2, 3, 4, 5, 6].map((b) => weeksAgo(b)), now: NOW })
    expect(s.current).toBe(6)
    expect(s.banked).toBe(MAX_BANKED)
  })

  it('spends a banked rest week on a quiet week and keeps the streak', () => {
    // out, out, quiet, out (oldest first), then this week still open
    const s = weeklyStreak({ activities: [weeksAgo(4), weeksAgo(3), weeksAgo(1)], now: NOW })
    expect(s.weeks.slice(-5).map((w) => w.state)).toEqual(['out', 'out', 'rested', 'out', 'now'])
    expect(s.current).toBe(4) // rest weeks count towards the streak
    expect(s.banked).toBe(2) // 1, 2, spent to 1, back to 2
  })

  it('says so kindly straight after a rest week', () => {
    const s = weeklyStreak({ activities: [weeksAgo(3), weeksAgo(2)], now: NOW })
    expect(s.weeks.slice(-4).map((w) => w.state)).toEqual(['out', 'out', 'rested', 'now'])
    expect(s.lastRested).toBe(true)
    expect(streakLine(s)).toBe('Rest week used. Streak kept.')
  })

  it('ends only when a quiet week finds nothing banked, and a new streak starts with none banked', () => {
    // out (banks 1), quiet (spends it), quiet (none left: ends), out, out
    const s = weeklyStreak({ activities: [weeksAgo(6), weeksAgo(3), weeksAgo(2)], now: NOW })
    expect(s.weeks.slice(-7).map((w) => w.state)).toEqual(['out', 'rested', 'missed', 'out', 'out', 'rested', 'now'])
    expect(s.longest).toBe(3)
    expect(s.current).toBe(3)
    expect(s.startKey).toBe('2026-10-12')
    expect(s.banked).toBe(1) // the new streak banked 2, then spent 1
  })

  it('keeps the longest streak after one ends', () => {
    const old = [20, 19, 18, 17, 16, 15, 14, 13].map((b) => weeksAgo(b)) // 8 weeks, banks 3
    const s = weeklyStreak({ activities: [...old, weeksAgo(0)], now: NOW })
    expect(s.longest).toBe(11) // 8 out + 3 rest weeks
    expect(s.current).toBe(1)
    expect(s.weeks.filter((w) => w.state === 'missed').length).toBeGreaterThan(0)
  })

  it('uses Sydney weeks: Sunday night and Monday morning fall in different weeks', () => {
    const sunday = syd('2026-10-25T23:30:00') // Sunday 12:30 UTC
    const monday = syd('2026-10-26T00:10:00') // still Sunday in UTC
    const s1 = weeklyStreak({ activities: [act(sunday)], now: NOW })
    const s2 = weeklyStreak({ activities: [act(monday)], now: NOW })
    expect(s1.weeks.find((w) => w.out).key).toBe('2026-10-19')
    expect(s2.weeks.find((w) => w.out).key).toBe('2026-10-26')
  })

  it('handles the weeks the clocks change in', () => {
    // Daylight saving starts Sunday 4 October 2026 and ends Sunday 5 April 2026
    const springSun = syd('2026-10-04T23:30:00', '+11:00')
    const springMon = syd('2026-10-05T00:15:00', '+11:00')
    const s = weeklyStreak({ activities: [act(springSun), act(springMon)], now: syd('2026-10-07T12:00:00') })
    expect(s.weeks.slice(-2).map((w) => [w.key, w.state])).toEqual([['2026-09-28', 'out'], ['2026-10-05', 'now']])
    expect(s.current).toBe(2)

    const autumnSun = syd('2026-04-05T23:30:00', '+10:00')
    const autumnMon = syd('2026-04-06T00:15:00', '+10:00')
    const a = weeklyStreak({ activities: [act(autumnSun), act(autumnMon)], now: syd('2026-04-15T12:00:00', '+10:00') })
    expect(a.weeks.slice(-3).map((w) => [w.key, w.state])).toEqual([['2026-03-30', 'out'], ['2026-04-06', 'out'], ['2026-04-13', 'now']])
    expect(a.current).toBe(2)
  })

  it('back-fills weeks from imported old runs', () => {
    const recent = [weeksAgo(1), weeksAgo(0)]
    expect(weeklyStreak({ activities: recent, now: NOW }).current).toBe(2)
    const imported = [weeksAgo(9), weeksAgo(8), weeksAgo(6), weeksAgo(5), weeksAgo(4), weeksAgo(2)].map((a) => ({ ...a, source: 'import' }))
    const s = weeklyStreak({ activities: [...recent, ...imported], now: NOW })
    expect(s.current).toBe(10) // week 7 and week 3 were rest weeks
    expect(s.weeks.slice(-11).map((w) => w.state)).toEqual(['before', 'out', 'out', 'rested', 'out', 'out', 'out', 'rested', 'out', 'out', 'now'])
  })

  it('ignores rejected activities and future times', () => {
    const s = weeklyStreak({ activities: [weeksAgo(1, { rejected: true }), act(NOW + 9 * DAY)], now: NOW })
    expect(s.current).toBe(0)
  })

  it('celebrates milestones only, once per streak and milestone', () => {
    const three = weeklyStreak({ activities: [3, 2, 1].map((b) => weeksAgo(b)), now: NOW })
    expect(streakMilestoneNote(three)).toBeNull()
    const four = weeklyStreak({ activities: [3, 2, 1, 0].map((b) => weeksAgo(b)), now: NOW })
    const note = streakMilestoneNote(four)
    expect(note).toMatchObject({ weeks: 4, key: `streak:${four.startKey}:4` })
    expect(four.nextMilestone).toBe(8)
    const year = weeklyStreak({ activities: Array.from({ length: 53 }, (_, b) => weeksAgo(b)), now: NOW })
    expect(streakMilestoneNote(year).weeks).toBe(52)
    for (const n of [note, streakMilestoneNote(year)]) {
      expect(n.text).not.toMatch(DASHES)
      expect(n.text.toLowerCase()).not.toMatch(/lose|don't|miss|break/)
    }
  })

  it('never uses loss framing in its lines', () => {
    const cases = [[], [weeksAgo(1)], [weeksAgo(2), weeksAgo(1)], [weeksAgo(0)], [weeksAgo(3), weeksAgo(2)], [weeksAgo(9)]]
    for (const c of cases) {
      const line = streakLine(weeklyStreak({ activities: c, now: NOW }))
      expect(line).not.toMatch(DASHES)
      expect(line.toLowerCase()).not.toMatch(/lose|losing|don't|break|last chance/)
    }
  })
})

describe('first week journey', () => {
  const joined = NOW - 2 * DAY
  it('starts at step 1 for a new player', () => {
    const j = firstWeek({ activities: [], createdAt: joined, now: NOW })
    expect(j).toMatchObject({ eligible: true, active: true, complete: false, stepsDone: 0, badge: null })
    expect(j.current).toMatchObject({ n: 1, id: 'plant', title: 'Plant your first flag', state: 'current' })
    expect(j.steps.map((s) => s.state)).toEqual(['current', 'upcoming', 'upcoming'])
  })

  it('needs a closed loop for step 1, and says so gently', () => {
    const j = firstWeek({ activities: [act(NOW - DAY, { loops: 0 })], createdAt: joined, now: NOW })
    expect(j.stepsDone).toBe(0)
    expect(j.current.body).toMatch(/Close a loop this time/)
  })

  it('moves to step 2 after the first loop, aiming for four days', () => {
    const first = act(NOW - DAY, { id: 'one', loops: 1 })
    const j = firstWeek({ activities: [first], createdAt: joined, now: NOW })
    expect(j.steps[0]).toMatchObject({ done: true, activityId: 'one', cheer: 'Flag planted. Step 1 of 3 done.' })
    expect(j.current).toMatchObject({ n: 2, stretched: false, dueAt: first.startedAt + 4 * DAY })
    expect(stepsDoneBy(j, 'one').map((s) => s.n)).toEqual([1])
  })

  it('quietly stretches a missed step instead of failing it', () => {
    const j = firstWeek({ activities: [act(NOW - 6 * DAY, { loops: 1 })], createdAt: NOW - 7 * DAY, now: NOW })
    expect(j.active).toBe(true)
    expect(j.current).toMatchObject({ n: 2, stretched: true, body: "No rush. Whenever you're ready." })
  })

  it('counts any distance for steps 2 and 3, then earns the badge', () => {
    const acts = [act(NOW - 40 * 3600000, { id: 'one', loops: 1 }), act(NOW - 20 * 3600000, { id: 'two', loops: 0 }), act(NOW - 3600000, { id: 'three', loops: 0, reinforced: 4 })]
    const j = firstWeek({ activities: acts, createdAt: joined, now: NOW })
    expect(j).toMatchObject({ complete: true, active: false, stepsDone: 3, current: null })
    expect(j.badge).toMatchObject({ id: 'founding', name: 'Founding foothold', at: acts[2].startedAt })
    expect(j.steps[2].reinforced).toBe(true)
  })

  it('skips players who brought plenty of history with them', () => {
    const old = [60, 50, 40, 30].map((d) => act(joined - d * DAY, { loops: 1, source: 'import' }))
    const j = firstWeek({ activities: [...old, act(NOW - DAY, { loops: 1 }), act(NOW - 3600000)], createdAt: joined, now: NOW })
    expect(j).toMatchObject({ eligible: false, active: false, badge: null })
  })

  it('steps aside after the first fortnight', () => {
    const j = firstWeek({ activities: [], createdAt: NOW - 15 * DAY, now: NOW })
    expect(j.active).toBe(false)
  })

  it('keeps a badge already earned, whatever happens later', () => {
    const j = firstWeek({ activities: [], createdAt: NOW - 30 * DAY, now: NOW, foundingAt: NOW - 20 * DAY })
    expect(j.badge.at).toBe(NOW - 20 * DAY)
  })

  it('ignores rejected activities', () => {
    const j = firstWeek({ activities: [act(NOW - DAY, { loops: 1, rejected: true })], createdAt: joined, now: NOW })
    expect(j.stepsDone).toBe(0)
  })

  it('sizes the first loop for the mode', () => {
    expect(firstLoopKm('walk')).toBe(1.5)
    expect(firstLoopKm('run')).toBe(2.5)
    expect(firstLoopKm('walk', 5)).toBe(2)
    expect(firstLoopKm('walk', 0.4)).toBe(1.2)
    expect(firstLoopKm('run', 2.8)).toBe(2.8)
    for (const [m, [lo, hi]] of Object.entries(FIRST_LOOP_KM)) {
      const km = firstLoopKm(m)
      expect(km).toBeGreaterThanOrEqual(lo)
      expect(km).toBeLessThanOrEqual(hi)
    }
  })

  it('writes every line without dashes or guilt', () => {
    const variants = [
      firstWeek({ activities: [], createdAt: joined, now: NOW }),
      firstWeek({ activities: [act(NOW - DAY, { loops: 0 })], createdAt: joined, now: NOW }),
      firstWeek({ activities: [act(NOW - 6 * DAY, { loops: 1 })], createdAt: NOW - 7 * DAY, now: NOW }),
    ]
    for (const j of variants) for (const s of j.steps) {
      for (const t of [s.title, s.body, s.cheer]) {
        expect(t).not.toMatch(DASHES)
        expect(t.toLowerCase()).not.toMatch(/\b(fail|failed|missed|lose|late|behind)\b/)
      }
    }
  })

  it('picks the same time of day two days later for the reminder', () => {
    const t = Date.parse('2026-11-04T07:35:20')
    const r = new Date(secondOutingAt(t))
    const d = new Date(t)
    expect([r.getHours(), r.getMinutes(), r.getSeconds()]).toEqual([d.getHours(), d.getMinutes(), 0])
    expect(r.getDate()).toBe(6)
  })
})

describe('calendar reminder', () => {
  it('makes one event with a 15 minute alarm', () => {
    const start = Date.UTC(2026, 10, 6, 20, 30)
    const ics = reminderIcs({ start, title: 'Foothold: second outing', description: 'Any distance counts, even a short one.', uid: 'x@foothold', now: Date.UTC(2026, 10, 4) })
    expect(ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(ics).toContain('DTSTART:20261106T203000Z')
    expect(ics).toContain('DTEND:20261106T210000Z')
    expect(ics).toContain('SUMMARY:Foothold: second outing')
    expect(ics).toContain('DESCRIPTION:Any distance counts\\, even a short one.')
    expect(ics).toContain('TRIGGER:-PT15M')
    expect(ics).toContain('UID:x@foothold')
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75)
  })

  it('needs a start time', () => {
    expect(() => reminderIcs({ title: 'x' })).toThrow()
  })
})
