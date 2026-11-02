// Season, hot spot and crest tests: Sydney season dates, the soft reset, ground gained, flips and crest picks.
import { describe, it, expect } from 'vitest'
import { latLngToCell } from 'h3-js'
import {
  seasonFor, seasonId, seasonById, previousSeason, nextSeason, daysLeft, sydneyMidnight, softenCell, softReset, needsReset,
  seasonGains, rankIn, seasonBadge, seasonSummary, showSummary, SEASON_FLOOR, applyClaim, currentStrength,
  heatOf, flipped, hotAreas, whereFrom, offset, WILD_BELOW,
} from '../src/lib/engine/index.js'
import { CRESTS, crestFor, isCrest } from '../src/lib/crests.js'

const DAY = 86400000
const DASHES = /[–—]|--/

describe('seasons', () => {
  it('follows the Australian seasons in Sydney time', () => {
    const s = seasonFor(Date.parse('2026-11-02T00:00:00Z'))
    expect(s).toMatchObject({ id: '2026-09', key: 'spring', name: 'Spring 2026', label: 'Spring season, Sep to Nov' })
    // Spring started at midnight on 1 September in Sydney (AEST, +10)
    expect(new Date(s.startsAt).toISOString()).toBe('2026-08-31T14:00:00.000Z')
    // and ends at midnight on 1 December (AEDT, +11)
    expect(new Date(s.endsAt).toISOString()).toBe('2026-11-30T13:00:00.000Z')
  })

  it('rolls over at Sydney midnight, not UTC midnight', () => {
    // 1 Dec 2026, 00:30 in Sydney is still 30 November in UTC
    expect(seasonId(Date.parse('2026-11-30T13:30:00Z'))).toBe('2026-12')
    expect(seasonId(Date.parse('2026-11-30T12:59:59Z'))).toBe('2026-09')
  })

  it('names summer across the new year, with no dashes', () => {
    const s = seasonFor(Date.parse('2027-01-15T00:00:00Z'))
    expect(s.id).toBe('2026-12')
    expect(s.name).toBe('Summer 2026/27')
    expect(s.label).toBe('Summer season, Dec to Feb')
    expect(new Date(s.endsAt).toISOString()).toBe('2027-02-28T13:00:00.000Z')
    for (const t of ['2026-04-10', '2026-07-10', '2026-10-10', '2027-01-10']) {
      const x = seasonFor(Date.parse(t))
      expect(x.name + x.label).not.toMatch(DASHES)
    }
  })

  it('walks back and forward, and parses ids', () => {
    const s = seasonFor(Date.parse('2027-01-15T00:00:00Z'))
    expect(previousSeason(s).id).toBe('2026-09')
    expect(nextSeason(s).id).toBe('2027-03')
    expect(seasonById('2026-12')).toEqual(s)
    expect(seasonById('2026-11')).toBeNull()
    expect(seasonById('nope')).toBeNull()
  })

  it('counts days left, including today', () => {
    const s = seasonFor(Date.parse('2026-11-02T00:00:00Z'))
    expect(daysLeft(s, s.endsAt - 1000)).toBe(1)
    expect(daysLeft(s, s.endsAt + DAY)).toBe(0)
    expect(daysLeft(s, s.startsAt)).toBe(91)
  })

  it('finds Sydney midnight either side of daylight saving', () => {
    expect(new Date(sydneyMidnight(2026, 6, 1)).toISOString()).toBe('2026-05-31T14:00:00.000Z')
    expect(new Date(sydneyMidnight(2026, 12, 1)).toISOString()).toBe('2026-11-30T13:00:00.000Z')
  })
})

describe('soft reset', () => {
  const season = seasonFor(Date.parse('2026-12-01T02:00:00Z'))
  const now = season.startsAt + 3600000
  const cell = (strength, idleDays = 2, extra = {}) => ({ h3: 'x' + strength + idleDays, owner: 'me', strength, visits: 3, lastVisit: now - idleDays * DAY, claimedAt: now - 40 * DAY, ...extra })

  it('halves strong ground', () => {
    expect(softenCell(cell(80), now).strength).toBe(40)
  })
  it('never takes ground under the floor, and leaves weak ground alone', () => {
    expect(softenCell(cell(16), now).strength).toBe(SEASON_FLOOR)
    expect(softenCell(cell(8), now).strength).toBe(8)
    expect(currentStrength(softenCell(cell(8), now), now)).toBeGreaterThan(WILD_BELOW)
  })
  it('keeps the fade going from the same last visit', () => {
    const old = cell(80, 35) // past the grace period, already faded
    const before = currentStrength(old, now)
    const after = currentStrength(softenCell(old, now), now)
    expect(after).toBeCloseTo(Math.max(SEASON_FLOOR, before / 2), 5)
    expect(softenCell(old, now).lastVisit).toBe(old.lastVisit)
  })
  it('skips wild ground, ground visited this season and ground already reset', () => {
    expect(softenCell(cell(80, 400), now)).toBeNull()
    expect(needsReset(cell(80, 0, { lastVisit: season.startsAt + 1 }), season, now)).toBe(false)
    expect(needsReset(cell(80, 2, { seasonReset: season.id }), season, now)).toBe(false)
  })
  it('runs once per season over a map', () => {
    const cells = new Map([['a', cell(80)], ['b', cell(60, 1, { lastVisit: season.startsAt + 60000 })]])
    const first = softReset(cells, season, now)
    expect([...first.keys()]).toEqual(['a'])
    expect(first.get('a')).toMatchObject({ strength: 40, seasonReset: season.id })
    for (const [h, c] of first) cells.set(h, c)
    expect(softReset(cells, season, now).size).toBe(0)
  })
})

describe('ground gained', () => {
  const season = seasonFor(Date.parse('2026-11-02T00:00:00Z'))
  const acts = [
    { userId: 'a', startedAt: season.startsAt + DAY, claimed: 30, taken: 5 },
    { userId: 'a', startedAt: season.startsAt - DAY, claimed: 500, taken: 0 }, // last season
    { userId: 'b', startedAt: season.startsAt + 2 * DAY, claimed: 10, taken: 40 },
    { userId: 'c', startedAt: season.startsAt + 3 * DAY, claimed: 99, taken: 0, rejected: true },
    { userId: 'd', startedAt: season.startsAt + 3 * DAY, claimed: 0, taken: 0 },
  ]
  it('adds claimed and taken hexes within the season only', () => {
    const g = seasonGains(acts, season)
    expect(Object.fromEntries(g)).toEqual({ a: 35, b: 50 })
    expect(rankIn(g, 'b')).toBe(1)
    expect(rankIn(g, 'a')).toBe(2)
    expect(rankIn(g, 'nobody')).toBe(3)
  })
  it('gives a badge for taking part, and a summary only when you gained ground', () => {
    expect(seasonBadge(0)).toBeNull()
    expect(seasonBadge(1).name).toBe('Wanderer')
    expect(seasonBadge(120).name).toBe('Trailblazer')
    const g = seasonGains(acts, season)
    expect(seasonSummary(g, 'a', season)).toMatchObject({ gained: 35, rank: 2, players: 2, badge: { id: 'explorer' } })
    expect(seasonSummary(g, 'd', season)).toBeNull()
  })
  it('shows the summary once, early in the next season', () => {
    const next = nextSeason(season)
    const prev = { gained: 5 }
    expect(showSummary(prev, next, null, next.startsAt + DAY)).toBe(true)
    expect(showSummary(prev, next, next.id, next.startsAt + DAY)).toBe(false)
    expect(showSummary(prev, next, null, next.startsAt + 30 * DAY)).toBe(false)
    expect(showSummary(null, next, null, next.startsAt + DAY)).toBe(false)
  })
})

describe('hot spots', () => {
  const ORIGIN = { lat: -33.9, lng: 151.15 }
  const h = latLngToCell(ORIGIN.lat, ORIGIN.lng, 10)
  const t0 = Date.UTC(2026, 10, 1)

  it('counts a flip each time a hex changes hands, and keeps it when the hex goes wild', () => {
    let cells = applyClaim(new Map(), [h], 'a', 20, { now: t0 }).updated
    expect(cells.get(h).flips ?? 0).toBe(0)
    cells = applyClaim(cells, [h], 'b', 60, { now: t0 + DAY }).updated
    expect(cells.get(h)).toMatchObject({ owner: 'b', flips: 1, recentFlips: 1, lastFlip: t0 + DAY })
    cells = applyClaim(cells, [h], 'a', 60, { now: t0 + 2 * DAY }).updated
    expect(cells.get(h)).toMatchObject({ owner: 'a', flips: 2, recentFlips: 2 })
    // Reinforcing your own ground isn't a flip
    cells = applyClaim(cells, [h], 'a', 30, { now: t0 + 3 * DAY }).updated
    expect(cells.get(h).flips).toBe(2)
    // A year later it has gone wild; claiming it keeps the history but it's cold
    cells = applyClaim(cells, [h], 'c', 30, { now: t0 + 400 * DAY }).updated
    expect(cells.get(h)).toMatchObject({ owner: 'c', flips: 2 })
    expect(heatOf(cells.get(h), t0 + 400 * DAY)).toBe(0)
  })

  it('cools off after 30 quiet days, then starts counting again', () => {
    const c = { flips: 5, recentFlips: 5, lastFlip: t0 }
    expect(heatOf(c, t0 + 10 * DAY)).toBe(5)
    expect(heatOf(c, t0 + 31 * DAY)).toBe(0)
    expect(flipped(c, t0 + 40 * DAY)).toEqual({ flips: 6, lastFlip: t0 + 40 * DAY, recentFlips: 1 })
    expect(flipped(c, t0 + 5 * DAY).recentFlips).toBe(6)
    expect(heatOf(null)).toBe(0)
  })

  it('groups hot hexes into nearby areas, hottest first', () => {
    const near = latLngToCell(...Object.values(offset(ORIGIN, 100, 0)), 10)
    const far = latLngToCell(...Object.values(offset(ORIGIN, 3000, 3000)), 10)
    const areas = hotAreas([{ h3: h, heat: 2 }, { h3: near, heat: 1 }, { h3: far, heat: 9 }, { h3: 'x', heat: 0 }], ORIGIN)
    expect(areas[0].heat).toBe(9)
    expect(areas[0].where).toMatch(/^4\.\d km north east$/)
    expect(areas.reduce((s, a) => s + a.hexes, 0)).toBe(3)
    expect(whereFrom(ORIGIN, ORIGIN)).toBe('Right around you')
    expect(whereFrom(ORIGIN, offset(ORIGIN, 0, -620))).toBe('600 m south')
  })
})

describe('crests', () => {
  it('has twelve crests with unique ids and plain names', () => {
    expect(CRESTS).toHaveLength(12)
    expect(new Set(CRESTS.map((c) => c.id)).size).toBe(12)
    for (const c of CRESTS) expect(c.name).toMatch(/^[A-Z][a-z]+$/)
  })
  it('uses the picked crest, or a steady default from the player id', () => {
    expect(crestFor('anyone', 'wave')).toBe('wave')
    expect(isCrest('logo')).toBe(false)
    expect(crestFor('player-1', 'logo')).toBe(crestFor('player-1', null))
    expect(isCrest(crestFor('player-1'))).toBe(true)
  })
})
