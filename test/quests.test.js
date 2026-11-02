// Tests for weekly quests, the explored map and the weekly recap (pure engine rules).
import { describe, it, expect } from 'vitest'
import { latLngToCell, gridDisk } from 'h3-js'
import {
  weekOf, weekFor, prevWeek, isWeekKey, weekLabel, visitedCells, mergeExplored, exploredShare, fogMask,
  weeklyQuests, questContext, weekRecap, compareText, nice, offset, QUEST_KINDS,
} from '../src/lib/engine/index.js'

const ORIGIN = { lat: -33.9, lng: 151.15 }
const DAY = 86400000
const DASHES = /[–—]|--/
const NOW = Date.parse('2026-11-04T02:00:00Z') // Wed 4 Nov, 1pm in Sydney
const WEEK = weekOf(NOW)
const h = (e, n) => { const p = offset(ORIGIN, e, n); return latLngToCell(p.lat, p.lng, 10) }

function act(id, at, extra = {}) {
  return { id, startedAt: at, mode: 'run', distanceM: 5000, movingS: 1800, loops: 1, claimed: 10, taken: 0, reinforced: 0, held: 0, rejected: false, ...extra }
}

describe('weeks', () => {
  it('runs Monday to Sunday in Sydney time', () => {
    expect(WEEK.key).toBe('2026-11-02')
    expect(new Date(WEEK.start).toISOString()).toBe('2026-11-01T13:00:00.000Z')
    expect(WEEK.end - WEEK.start).toBe(7 * DAY)
    // Monday morning in Sydney is still Sunday in UTC
    expect(weekOf(Date.parse('2026-11-01T22:00:00Z')).key).toBe('2026-11-02')
    expect(weekOf(Date.parse('2026-11-01T12:59:00Z')).key).toBe('2026-10-26')
  })
  it('handles the daylight saving change and any day of the week', () => {
    const w = weekFor('2026-10-07')
    expect(w.key).toBe('2026-10-05')
    expect(new Date(w.start).toISOString()).toBe('2026-10-04T13:00:00.000Z')
    expect(new Date(prevWeek(w).start).toISOString()).toBe('2026-09-27T14:00:00.000Z')
    expect(prevWeek(w).end).toBe(w.start)
    expect(isWeekKey('2026-1-1')).toBe(false)
    expect(weekLabel(WEEK)).toBe('Mon 2 Nov to Sun 8 Nov')
  })
})

describe('explored', () => {
  it('records every hex a track passes through, filling GPS gaps', () => {
    const track = [ORIGIN, offset(ORIGIN, 600, 0)] // two points 600 m apart
    const cells = visitedCells(track)
    expect(cells.length).toBeGreaterThanOrEqual(5)
    expect(cells[0]).toBe(latLngToCell(ORIGIN.lat, ORIGIN.lng, 10))
    // A jump of 5 km is a gap, not a route
    expect(visitedCells([ORIGIN, offset(ORIGIN, 5000, 0)])).toHaveLength(2)
  })
  it('merges visits newest first, by mode, with a cap', () => {
    const v = [
      { at: 1, mode: 'run', cells: ['a', 'b'] },
      { at: 2, mode: 'walk', cells: ['c'] },
      { at: 3, mode: 'run', cells: ['b', 'd'] },
    ]
    expect(mergeExplored(v)).toEqual({ cells: ['b', 'd', 'c', 'a'], total: 4, capped: false })
    expect(mergeExplored(v, { mode: 'run' }).cells).toEqual(['b', 'd', 'a'])
    expect(mergeExplored(v, { cap: 2 })).toMatchObject({ cells: ['b', 'd'], total: 4, capped: true })
  })
  it('works out the share of ground within 5 km', () => {
    const home = latLngToCell(ORIGIN.lat, ORIGIN.lng, 10)
    const near = gridDisk(home, 10)
    const s = exploredShare([...near, h(20000, 0)], ORIGIN)
    expect(s.total).toBeGreaterThan(5000)
    expect(s.explored).toBe(near.length)
    expect(s.pct).toBeCloseTo((near.length / s.total) * 100, 0)
  })
  it('builds a fog mask with holes where you have been', () => {
    const m = fogMask(gridDisk(h(0, 0), 2), ORIGIN)
    expect(m.features[0].geometry.coordinates.length).toBe(2) // box plus one hole
    expect(fogMask([], ORIGIN).features[0].geometry.coordinates).toHaveLength(1)
  })
})

describe('quests', () => {
  const base = { userId: 'me', week: WEEK, now: NOW }

  it('gives three quests, the same ones every time for a player and week', () => {
    const a = weeklyQuests({ ...base })
    expect(a).toHaveLength(3)
    expect(weeklyQuests({ ...base })).toEqual(a)
    expect(new Set(a.map((q) => q.kind)).size).toBe(3)
    for (const q of a) {
      expect(QUEST_KINDS).toContain(q.kind)
      expect(q.title).not.toMatch(DASHES)
      expect(q.detail).not.toMatch(DASHES)
      expect(q.done).toBe(false)
    }
    // Different players and weeks get different mixes over time
    const mixes = new Set()
    for (let i = 0; i < 12; i++) mixes.add(weeklyQuests({ ...base, userId: `p${i}` }).map((q) => q.kind).sort().join())
    expect(mixes.size).toBeGreaterThan(1)
  })

  it('sizes targets to the last four weeks, so they are within reach', () => {
    const busy = []
    for (let w = 1; w <= 4; w++) for (let k = 0; k < 4; k++) busy.push(act(`b${w}${k}`, WEEK.start - w * 7 * DAY + k * DAY, { claimed: 15, loops: 2 }))
    const light = [act('l1', WEEK.start - 3 * DAY, { claimed: 5, loops: 1 })]
    const cb = questContext({ ...base, activities: busy })
    const cl = questContext({ ...base, activities: light })
    expect(cb.base.outings).toBe(4)
    expect(cb.base.newHexes).toBe(60)
    expect(cl.base.outings).toBe(1)
    const target = (ctx, kind) => {
      for (let i = 0; i < 40; i++) {
        const q = weeklyQuests({ ...ctx, userId: `u${i}` }).find((x) => x.kind === kind)
        if (q) return q.target
      }
      return null
    }
    expect(target(cb, 'take')).toBeGreaterThan(target(cl, 'take'))
    expect(target(cb, 'outings')).toBeGreaterThanOrEqual(4)
    expect(target(cl, 'outings')).toBe(1)
    expect(target(cl, 'take')).toBeGreaterThanOrEqual(5)
    expect(target(cl, 'take')).toBeLessThanOrEqual(6)
  })

  it('counts progress from this week only, and marks quests done', () => {
    const acts = [act('old', WEEK.start - DAY, { loops: 3, claimed: 50 }), act('w1', WEEK.start + DAY, { loops: 2, claimed: 30, taken: 4 })]
    const ctx = questContext({ ...base, activities: acts })
    expect(ctx.count).toMatchObject({ outings: 1, loops: 2, newHexes: 34, taken: 4 })
    const qs = weeklyQuests(ctx)
    for (const q of qs) {
      expect(q.progress).toBeLessThanOrEqual(q.target)
      if (q.count >= q.target && q.kind !== 'hold') expect(q.done).toBe(true)
    }
    // A rejected activity never counts
    expect(questContext({ ...base, activities: [act('r', WEEK.start + DAY, { rejected: true })] }).count.outings).toBe(0)
  })

  it('counts new ground explored against everything before the week', () => {
    const before = { id: 'a', at: WEEK.start - 2 * DAY, mode: 'run', cells: ['x1', 'x2', 'x3'] }
    const mostlyNew = { id: 'b', at: WEEK.start + DAY, mode: 'run', cells: ['x1', ...Array.from({ length: 20 }, (_, i) => `n${i}`)] }
    const sameOld = { id: 'c', at: WEEK.start + 2 * DAY, mode: 'run', cells: ['x1', 'x2', 'n1'] }
    const ctx = questContext({ ...base, visits: [before, mostlyNew, sameOld] })
    expect(ctx.count.explored).toBe(20)
    expect(ctx.count.newGround).toBe(1)
  })

  it('offers take-back only after a loss, and counts hexes won back', () => {
    const lost = h(0, 0)
    const losses = [{ h3: lost, mode: 'run', at: WEEK.start - 3 * DAY }]
    const cells = [{ h3: lost, mode: 'run', owner: 'me', strength: 40, lastVisit: WEEK.start + DAY, claimedAt: WEEK.start + DAY }]
    const ctx = questContext({ ...base, losses, cells })
    expect(ctx.base.lostRecently).toBe(1)
    expect(ctx.count.wonBack).toBe(1)
    expect(questContext({ ...base, cells }).base.lostRecently).toBe(0)
    // With a loss on the books, take-back turns up for some players
    let seen = false
    for (let i = 0; i < 30 && !seen; i++) seen = weeklyQuests({ ...ctx, userId: `t${i}` }).some((q) => q.kind === 'takeback' && q.done)
    expect(seen).toBe(true)
  })

  it('settles a hold quest only when the week is over', () => {
    const acts = [act('c', WEEK.start - 5 * DAY, { claimed: 40 })]
    const cellsOf = (owner) => Array.from({ length: 30 }, (_, i) => ({ h3: `c${i}`, mode: 'run', owner, strength: 50, lastVisit: WEEK.start - 5 * DAY, claimedAt: WEEK.start - 5 * DAY }))
    let during = null
    let after = null
    for (let i = 0; i < 40 && !during; i++) {
      const cells = cellsOf(`h${i}`)
      during = weeklyQuests({ ...base, userId: `h${i}`, activities: acts, cells }).find((q) => q.kind === 'hold') || null
      if (during) after = weeklyQuests({ ...base, now: WEEK.end + 1, userId: `h${i}`, activities: acts, cells }).find((q) => q.kind === 'hold')
    }
    expect(during).toMatchObject({ pending: true, done: false, count: 30, target: 20 })
    expect(after).toMatchObject({ pending: false, done: true })
  })

  it('rounds to friendly numbers', () => {
    expect([nice(0.4), nice(7.4), nice(13), nice(57), nice(123)]).toEqual([1, 7, 15, 55, 120])
  })
})

describe('weekly recap', () => {
  it('adds up the week, finds the biggest loop and a best moment', () => {
    const acts = [
      act('m', WEEK.start + 2 * 3600000, { distanceM: 4000, claimed: 8, loops: 1 }),
      act('t', WEEK.start + DAY + 3600000, { distanceM: 6000, claimed: 20, taken: 3, loops: 1 }),
      act('x', WEEK.start + 2 * DAY, { distanceM: 3000, loops: 0, claimed: 0, rejected: true }),
      act('lw', WEEK.start - 2 * DAY, { distanceM: 8000 }),
    ]
    const visits = [{ id: 't', at: acts[1].startedAt, mode: 'run', cells: ['a', 'b'] }, { id: 'lw', at: acts[3].startedAt, mode: 'run', cells: ['z'] }]
    const losses = [{ h3: 'q', mode: 'run', at: WEEK.start + DAY }, { h3: 'q', mode: 'run', at: WEEK.start + 2 * DAY }]
    const r = weekRecap({ userId: 'me', week: WEEK, now: NOW, activities: acts, visits, losses })
    expect(r).toMatchObject({ distanceM: 10000, outings: 2, loops: 2, week: { key: '2026-11-02', current: true, previous: '2026-10-26' } })
    expect(r.hexes).toMatchObject({ taken: 31, fromRivals: 3, lostToRivals: 1 })
    expect(r.biggestLoop.activityId).toBe('t')
    expect(r.best.text).toBe('Tuesday’s run took 3 hexes from rivals.')
    expect(r.last).toMatchObject({ distanceM: 8000, outings: 1 })
    expect(r.compare).toBe('25% more distance than last week. Nicely built.')
    expect(r.visited).toEqual(['a', 'b'])
    expect(r.quests).toHaveLength(3)
  })
  it('meets a quiet week with kindness', () => {
    const r = weekRecap({ userId: 'me', week: WEEK, now: NOW, activities: [act('lw', WEEK.start - 2 * DAY)] })
    expect(r.outings).toBe(0)
    expect(r.best).toBeNull()
    expect(r.compare).toMatch(/^A quiet week\. Rest counts too/)
  })
  it('never shames in the comparison', () => {
    const texts = [[0, 0], [1, 0], [10, 5], [10, 8.5], [10, 10], [5, 10]].map(([c, l]) => compareText({ outings: c ? 1 : 0, distanceM: c * 1000 }, { outings: l ? 1 : 0, distanceM: l * 1000 }))
    for (const t of texts) {
      expect(t).not.toMatch(DASHES)
      expect(t).not.toMatch(/fail|lazy|only|miss|lost|behind/i)
    }
    expect(texts[2]).toMatch(/keep the next few easy/)
  })
})
