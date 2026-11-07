// Foothold Wrapped: the year in review maths (src/lib/wrapped.js) and the server summary, GET /api/me/year (worker/wrapped.js).
import { describe, it, expect, beforeEach } from 'vitest'
import {
  yearBounds, yearOf, wrappedFor, yearActivities, yearTotals, bestMonth, yearStreak, filmFrames,
  favouriteLoop, pickRival, rivalLine, yearBests, yearSummary, slidesFor,
} from '../src/lib/wrapped.js'
import { offset } from '../src/lib/engine/index.js'
import { makeEnv, caller, rectRun, ORIGIN } from './fakes.js'

const DAY = 86400000
// Sydney local times with the offset written out (AEDT +11 in summer, AEST +10 in winter)
const syd = (s, off = '+11:00') => Date.parse(`${s}${off}`)
const Y = yearBounds(2026)
const act = (id, at, extra = {}) => ({ id, startedAt: at, mode: 'run', distanceM: 5000, ...extra })
const DASHES = /[—–]|--/

// A square ring of side `m` metres around a centre, as [lng, lat]
function square(centre, m) {
  const pts = [[-m / 2, -m / 2], [m / 2, -m / 2], [m / 2, m / 2], [-m / 2, m / 2], [-m / 2, -m / 2]]
  return pts.map(([x, y]) => { const p = offset(centre, x, y); return [p.lng, p.lat] })
}

describe('year bounds', () => {
  it('runs from midnight on 1 January to midnight on 1 January, Sydney time', () => {
    expect(Y.start).toBe(syd('2026-01-01T00:00:00'))
    expect(Y.end).toBe(syd('2027-01-01T00:00:00'))
    // The year turns over at Sydney's midnight, not UTC's
    expect(yearOf(syd('2025-12-31T23:59:00'))).toBe(2025)
    expect(yearOf(syd('2026-01-01T00:01:00'))).toBe(2026)
    expect(yearOf(Date.parse('2025-12-31T14:00:00Z'))).toBe(2026) // 1 am on New Year's Day in Sydney
  })

  it('keeps only counted outings inside the year, newest first', () => {
    const list = yearActivities([
      act('old', syd('2025-12-31T23:30:00')),
      act('a', syd('2026-01-01T06:00:00')),
      act('b', syd('2026-12-31T20:00:00')),
      act('next', syd('2027-01-01T00:00:00')),
      act('no', syd('2026-05-01T07:00:00', '+10:00'), { rejected: true }),
    ], Y)
    expect(list.map((a) => a.id)).toEqual(['b', 'a'])
  })

  it('shows "your year so far" until 1 December, then the full year', () => {
    expect(wrappedFor(syd('2026-11-30T23:59:00'))).toMatchObject({ year: 2026, full: false, title: 'Your year so far', entry: 'Your 2026 in Foothold' })
    expect(wrappedFor(syd('2026-12-01T00:01:00'))).toMatchObject({ year: 2026, full: true, title: 'Your 2026 in Foothold' })
    expect(wrappedFor(syd('2027-01-01T08:00:00')).full).toBe(false)
  })
})

describe('totals, best month and streak', () => {
  it('adds up distance, outings, hexes and stored climb only', () => {
    const t = yearTotals([act('a', 1, { distanceM: 5200, elevGainM: 40, claimed: 10, taken: 2 }), act('b', 2, { distanceM: 3100, mode: 'walk', elevGainM: null, claimed: 3 })])
    expect(t).toMatchObject({ km: 8.3, activities: 2, hexes: 15, climbM: 40, modes: { run: 1, walk: 1, ride: 0 } })
    expect(yearTotals([act('a', 1, { claimed: 4 })], 9).hexes).toBe(9) // distinct hexes from the film win
  })

  it('picks the month with the most distance, in Sydney time', () => {
    const acts = [
      act('a', syd('2026-03-02T07:00:00'), { distanceM: 8000 }),
      act('b', syd('2026-03-20T07:00:00'), { distanceM: 8000 }),
      act('c', syd('2026-07-05T07:00:00', '+10:00'), { distanceM: 12000 }),
      // 10:30 pm UTC on 31 May is 8:30 am on 1 June in Sydney
      act('d', Date.parse('2026-05-31T22:30:00Z'), { distanceM: 3000 }),
    ]
    expect(bestMonth(acts)).toEqual({ month: 3, name: 'March', km: 16, count: 2 })
    expect(bestMonth([acts[3]]).name).toBe('June')
    expect(bestMonth([])).toBeNull()
  })

  it('finds the longest weekly streak inside the year', () => {
    const weekly = [0, 1, 2, 3, 5].map((w) => act(`w${w}`, syd('2026-02-03T07:00:00') + w * 7 * DAY))
    // Four weeks out, a banked rest week, one more out, then three banked rest weeks before it ends (rest weeks count)
    expect(yearStreak(weekly, Y, syd('2026-11-04T12:00:00'))).toBe(9)
    // Only this year's outings count towards it
    expect(yearStreak(yearActivities([...weekly, act('old', syd('2025-06-01T07:00:00', '+10:00'))], Y), Y, syd('2026-11-04T12:00:00'))).toBe(9)
    expect(yearStreak([], Y)).toBe(0)
  })
})

describe('the map film', () => {
  it('makes one frame a week from the first hex to the last, adding only new hexes', () => {
    const frames = filmFrames([
      { startedAt: syd('2026-01-06T07:00:00'), hexes: ['a', 'b'] },
      { startedAt: syd('2026-01-08T07:00:00'), hexes: ['b', 'c'] },
      { startedAt: syd('2026-01-21T07:00:00'), hexes: ['c', 'd'] },
      { startedAt: syd('2025-12-30T07:00:00'), hexes: ['x'] }, // last year
    ], Y)
    expect(frames.map((f) => f.key)).toEqual(['2026-01-05', '2026-01-12', '2026-01-19'])
    expect(frames.map((f) => f.added)).toEqual([['a', 'b', 'c'], [], ['d']])
    expect(frames.map((f) => f.total)).toEqual([3, 3, 4])
    expect(frames[0].label).toBe('5 Jan')
    expect(filmFrames([], Y)).toEqual([])
  })
})

describe('favourite loop', () => {
  const home = { lat: -33.75, lng: 150.69 }
  const park = offset(home, 2000, 0)
  const loop = (id, at, centre, m) => ({ activityId: id, startedAt: at, ring: square(centre, m), perimeterM: 4 * m })

  it('groups the same block run on different days and counts it', () => {
    const fav = favouriteLoop([
      loop('a', 1, home, 500),
      loop('b', 2, offset(home, 40, -30), 520), // same block, a little wobble
      loop('c', 3, park, 500), // same size, somewhere else
      loop('d', 4, home, 900), // same place, much bigger
      loop('e', 5, offset(home, -20, 10), 480),
    ])
    expect(fav).toMatchObject({ times: 3, activityIds: ['a', 'b', 'e'], first: 1, last: 5 })
    expect(fav.perimeterM).toBe(2000)
    expect(fav.ring).toEqual(square(offset(home, -20, 10), 480)) // the latest lap's shape
  })

  it('needs at least two laps', () => {
    expect(favouriteLoop([loop('a', 1, home, 500), loop('b', 2, park, 500)])).toBeNull()
    expect(favouriteLoop([])).toBeNull()
  })
})

describe('rival', () => {
  it('picks whoever you swapped the most ground with, both ways added up', () => {
    const r = pickRival([
      { userId: 's', name: 'Sam', tookFromThem: 10, tookFromYou: 0 },
      { userId: 'p', name: 'Priya', tookFromThem: 6, tookFromYou: 7 },
      { userId: 'q', name: 'Quiet', tookFromThem: 0, tookFromYou: 0 },
    ])
    expect(r).toMatchObject({ userId: 'p', total: 13 })
  })

  it('breaks a tie with the closer contest, then the name', () => {
    expect(pickRival([{ userId: 'a', name: 'Al', tookFromThem: 9, tookFromYou: 1 }, { userId: 'b', name: 'Bo', tookFromThem: 5, tookFromYou: 5 }]).userId).toBe('b')
    expect(pickRival([{ userId: 'z', name: 'Zed', tookFromThem: 2 }, { userId: 'b', name: 'Bea', tookFromYou: 2 }]).name).toBe('Bea')
    expect(pickRival([])).toBeNull()
  })

  it('words it as friendly rivalry, never as losing', () => {
    const lines = [
      rivalLine({ name: 'Sam', tookFromThem: 4, tookFromYou: 3 }, 2026),
      rivalLine({ name: 'Sam', tookFromThem: 4, tookFromYou: 0 }, 2026),
      rivalLine({ name: 'Sam', tookFromThem: 0, tookFromYou: 9 }, 2026),
    ]
    expect(lines[1]).toContain('2027')
    for (const l of lines) expect(l).not.toMatch(/\blost\b|\blose\b|beat you/i)
    for (const l of lines) expect(DASHES.test(l)).toBe(false)
  })
})

describe('year bests', () => {
  it('keeps the fastest effort per distance this year and marks all time records', () => {
    const acts = [
      act('a', 1, { bests: { '1k': 290, '5k': 1600 } }),
      act('b', 2, { bests: { '1k': 280, '5k': 1650 } }),
      act('r', 3, { mode: 'ride', bests: { longest: 42000 } }),
    ]
    const list = yearBests(acts, { run: [{ key: '1k', activityId: 'b' }] })
    expect(list[0]).toMatchObject({ key: '1k', value: 280, activityId: 'b', pb: true })
    expect(list.find((b) => b.key === '5k')).toMatchObject({ value: 1600, activityId: 'a', pb: false })
    expect(list.find((b) => b.key === 'longest')).toMatchObject({ mode: 'ride', value: 42000, kind: 'dist' })
  })
})

describe('slides', () => {
  const at = syd('2026-04-10T07:00:00', '+10:00')
  it('skips slides with nothing to show', () => {
    const sum = yearSummary({ activities: [act('a', at)], bounds: Y, film: [], now: syd('2026-11-04T12:00:00') })
    expect(slidesFor(sum)).toEqual(['intro', 'numbers', 'month', 'share'])
  })

  it('shows every slide when there is something for each', () => {
    const home = { lat: -33.75, lng: 150.69 }
    const ring = square(home, 500)
    const film = [
      { activityId: 'a', startedAt: at, hexes: ['8abe6386d1b7fff'], loops: [{ ring, perimeterM: 2000 }] },
      { activityId: 'b', startedAt: at + DAY, hexes: ['8abe6386d1b7fff'], loops: [{ ring, perimeterM: 2000 }] },
    ]
    const sum = yearSummary({
      activities: [act('a', at, { bests: { '1k': 300 } }), act('b', at + DAY)],
      bounds: Y,
      film,
      rivals: [{ userId: 'r', name: 'Sam', tookFromThem: 2, tookFromYou: 1 }],
      now: syd('2026-11-04T12:00:00'),
    })
    expect(sum.totals).toMatchObject({ activities: 2, hexes: 1 })
    expect(sum.loop.times).toBe(2)
    expect(slidesFor(sum)).toEqual(['intro', 'map', 'numbers', 'loop', 'rival', 'month', 'bests', 'share'])
  })

  it('with no outings at all, says hello and invites you out', () => {
    expect(slidesFor(yearSummary({ activities: [], bounds: Y }))).toEqual(['intro', 'empty'])
    expect(slidesFor(null)).toEqual(['intro', 'empty'])
  })
})

describe('GET /api/me/year', () => {
  let env
  const call = caller(() => env)
  const A = 'device-aaaa-aaaa-aaaa-0001'
  const B = 'device-bbbb-bbbb-bbbb-0002'
  beforeEach(() => { env = makeEnv() })

  it("returns your year's activities, the rival you swapped ground with and your records, nothing of theirs", async () => {
    await call(A, 'PUT', '/api/me', { name: 'Ava' })
    await call(B, 'PUT', '/api/me', { name: 'Ben' })
    const mine = await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    const theirs = await call(B, 'POST', '/api/activities', { mode: 'run', points: rectRun({ w: 1500, h: 1000, start: offset(ORIGIN, -300, -300) }) })
    const r = await call(A, 'GET', '/api/me/year')
    expect(r.status).toBe(200)
    expect(r.body.year).toBe(yearOf())
    expect(r.body.activities.map((a) => a.id)).toEqual([mine.body.activity.id])
    expect(r.body.activities[0]).not.toHaveProperty('track')
    expect(r.body.rivals[0]).toMatchObject({ name: 'Ben', tookFromYou: theirs.body.diff.taken.length, tookFromThem: 0 })
    expect(Object.keys(r.body.rivals[0]).sort()).toEqual(['colour', 'crest', 'name', 'tookFromThem', 'tookFromYou', 'userId'])
    expect(r.body.bests.run.length).toBeGreaterThan(0)
    expect(r.body.bests.run.every((b) => b.activityId === mine.body.activity.id)).toBe(true)
  })

  it('has nothing for a year before your first outing, and turns down a bad year', async () => {
    await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    const old = await call(A, 'GET', '/api/me/year?year=2024')
    expect(old.status).toBe(200)
    expect(old.body).toMatchObject({ year: 2024, activities: [], rivals: [] })
    expect((await call(A, 'GET', '/api/me/year?year=nope')).status).toBe(400)
    expect((await call(A, 'GET', `/api/me/year?year=${yearOf() + 1}`)).status).toBe(400)
  })
})
