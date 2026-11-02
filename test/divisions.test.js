// Weekly divisions: scoring, grouping, late joiner seats, ranking and promotion (src/lib/engine/divisions.js), and the practice map's division (src/lib/social/divisionPractice.js).
import { describe, it, expect } from 'vitest'
import {
  TIERS, weekScore, groupPlayers, divisionsFor, pickDivision, rankDivision, tierFrom, tierOut, daysLeftIn, placedText, promotedText,
  DIVISION_MAX, weekFor,
} from '../src/lib/engine/index.js'
import { practiceDivision, PRACTICE_SIZE } from '../src/lib/social/divisionPractice.js'

const DASH = /[–—]|--/

describe('tiers and words', () => {
  it('has six tiers with original names', () => {
    expect(TIERS.map((t) => t.name)).toEqual(['Scout', 'Pathfinder', 'Ranger', 'Warden', 'Sentinel', 'Marshal'])
    expect(tierOut(1).next.name).toBe('Ranger')
    expect(tierOut(5).next).toBe(null)
    expect(tierOut(99).index).toBe(5)
  })
  it('speaks kindly, never of dropping or falling behind', () => {
    expect(placedText(1)).toBe("You're in a new Pathfinder division this week. Top 5 move up.")
    expect(promotedText(2)).toBe('You moved up to Ranger.')
    for (const s of [placedText(0), promotedText(5)]) {
      expect(s).not.toMatch(DASH)
      expect(s).not.toMatch(/drop|behind|lose|demot/i)
    }
  })
})

describe('weekScore', () => {
  it('counts ground gained plus 10 an outing, up to five outings', () => {
    expect(weekScore([])).toEqual({ hexes: 0, outings: 0, score: 0 })
    expect(weekScore([{ claimed: 30, taken: 5 }, { claimed: 0, taken: 0 }])).toEqual({ hexes: 35, outings: 2, score: 55 })
    const seven = Array.from({ length: 7 }, () => ({ claimed: 1 }))
    expect(weekScore(seven)).toEqual({ hexes: 7, outings: 7, score: 57 })
  })
  it('leaves out rejected activities', () => {
    expect(weekScore([{ claimed: 50, rejected: true }]).score).toBe(0)
  })
  it('lets frequent short outings beat one big loop', () => {
    const big = weekScore([{ claimed: 45 }])
    const often = weekScore(Array.from({ length: 5 }, () => ({ claimed: 2 })))
    expect(often.score).toBeGreaterThan(big.score)
  })
})

describe('groupPlayers', () => {
  const make = (n, extra = {}) => Array.from({ length: n }, (_, i) => ({ userId: `u${String(i).padStart(3, '0')}`, tier: 0, form: i * 3, city: null, ...extra }))

  it('makes divisions of about 20, never over the cap', () => {
    expect(divisionsFor(0)).toBe(0)
    expect(divisionsFor(3)).toBe(1)
    expect(divisionsFor(20)).toBe(1)
    expect(divisionsFor(29)).toBe(2)
    expect(divisionsFor(100)).toBe(5)
    const groups = groupPlayers(make(87))
    expect(groups.length).toBe(4)
    for (const g of groups) {
      expect(g.members.length).toBeGreaterThanOrEqual(15)
      expect(g.members.length).toBeLessThanOrEqual(DIVISION_MAX)
    }
    expect(groups.flatMap((g) => g.members).length).toBe(87)
  })
  it('keeps tiers apart', () => {
    const groups = groupPlayers([...make(10), ...make(10, { tier: 2 }).map((p) => ({ ...p, userId: 'b' + p.userId }))])
    expect(groups.map((g) => g.tier)).toEqual([0, 2])
    expect(groups[1].members.every((id) => id.startsWith('b'))).toBe(true)
  })
  it('groups by form so each division is evenly matched', () => {
    const groups = groupPlayers(make(40))
    const form = (id) => Number(id.slice(1)) * 3
    const lo = Math.min(...groups[0].members.map(form))
    const hi = Math.max(...groups[1].members.map(form))
    expect(lo).toBeGreaterThan(hi) // the busiest 20 together, then the next 20
  })
  it('prefers players from the same city', () => {
    const syd = make(20, { city: 'syd' }).map((p) => ({ ...p, userId: 's' + p.userId }))
    const mel = make(20, { city: 'mel' }).map((p) => ({ ...p, userId: 'm' + p.userId }))
    const groups = groupPlayers([...mel, ...syd])
    expect(groups.length).toBe(2)
    for (const g of groups) expect(new Set(g.members.map((id) => id[0])).size).toBe(1)
    expect(groups.map((g) => g.city).sort()).toEqual(['mel', 'syd'])
  })
  it('pools small cities together and names the division after the biggest', () => {
    const groups = groupPlayers([...make(6, { city: 'a' }), ...make(3, { city: 'b' }).map((p) => ({ ...p, userId: 'b' + p.userId }))])
    expect(groups.length).toBe(1)
    expect(groups[0].members.length).toBe(9)
    expect(groups[0].city).toBe('a')
  })
})

describe('pickDivision (late joiners)', () => {
  const divs = [
    { id: 'd1', tier: 0, city: 'syd', size: 20 },
    { id: 'd2', tier: 0, city: 'mel', size: 18 },
    { id: 'd3', tier: 1, city: 'syd', size: 3 },
    { id: 'd4', tier: 0, city: 'syd', size: DIVISION_MAX },
  ]
  it('finds a division of the same tier with room, their city first', () => {
    expect(pickDivision(divs, 0, 'syd').id).toBe('d1')
    expect(pickDivision(divs, 0, 'per').id).toBe('d2') // no Perth one: the smallest
    expect(pickDivision(divs, 1, null).id).toBe('d3')
  })
  it('says start a new one when every division is full', () => {
    expect(pickDivision(divs, 2, 'syd')).toBe(null)
    expect(pickDivision([{ id: 'x', tier: 0, city: null, size: DIVISION_MAX }], 0)).toBe(null)
  })
})

describe('rankDivision', () => {
  const rows = (scores) => scores.map((s, i) => ({ userId: `p${i}`, name: `P${i}`, score: s, outings: s ? 1 : 0, hexes: s }))

  it('moves the top 5 up, and only those who scored', () => {
    const t = rankDivision(rows([90, 80, 70, 60, 50, 40, 30, 0]), 1)
    expect(t.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(t.filter((r) => r.promotes).map((r) => r.score)).toEqual([90, 80, 70, 60, 50])
    const quiet = rankDivision(rows([20, 10, 0, 0, 0, 0]), 0)
    expect(quiet.filter((r) => r.promotes).length).toBe(2) // nobody moves up for not getting out
  })
  it('shares a rank on a tie, so a tie for 5th moves both up', () => {
    const t = rankDivision(rows([90, 80, 70, 60, 50, 50, 10]), 0)
    expect(t.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 5, 7])
    expect(t.filter((r) => r.promotes).length).toBe(6)
  })
  it('has nowhere higher than Marshal, but still marks the top 5', () => {
    const t = rankDivision(rows([9, 8, 7, 6, 5, 4]), 5)
    expect(t.some((r) => r.promotes)).toBe(false)
    expect(t.filter((r) => r.top).length).toBe(5)
  })
})

describe('tierFrom and days left', () => {
  it('climbs with promotions and never drops', () => {
    expect(tierFrom([])).toEqual({ tier: 0, best: 0 })
    const h = [
      { week: '2026-10-12', tier: 0, promoted: true },
      { week: '2026-10-19', tier: 1, promoted: true },
      { week: '2026-10-26', tier: 2, promoted: false },
    ]
    expect(tierFrom(h)).toEqual({ tier: 2, best: 2 })
    expect(tierFrom([...h, { week: '2026-11-02', tier: 2, promoted: true }])).toEqual({ tier: 3, best: 3 })
  })
  it('counts today as a day left', () => {
    const w = weekFor('2026-11-02')
    expect(daysLeftIn(w, w.start + 3600000)).toBe(7)
    expect(daysLeftIn(w, w.end - 3600000)).toBe(1)
  })
})

describe('practice division', () => {
  const week = weekFor('2026-11-02')
  const rivals = [{ id: 'r-sam', name: 'Sam', colour: '#E8A817', crest: 'sun' }, { id: 'r-mei', name: 'Mei', colour: '#D6418E', crest: 'star' }]
  const me = { userId: 'me-1', name: 'You', colour: '#2E55E6', crest: null, hexes: 12, outings: 2 }

  it('fills a division of 20 with the rivals, practice players and you', () => {
    const d = practiceDivision({ week, tier: 1, seed: 's', rivals, me, now: week.start + 3 * 86400000 })
    expect(d.length).toBe(PRACTICE_SIZE)
    expect(PRACTICE_SIZE).toBe(20)
    expect(d.filter((r) => r.me)).toEqual([expect.objectContaining({ userId: 'me-1', score: 32 })])
    expect(d.some((r) => r.userId === 'r-sam')).toBe(true)
    expect(new Set(d.map((r) => r.userId)).size).toBe(20)
    for (const r of d) expect(r.name).not.toMatch(DASH)
  })
  it('is the same table for the same week, and scores grow as the week goes on', () => {
    const at = (t) => practiceDivision({ week, tier: 0, seed: 's', rivals, me, now: t })
    const mon = at(week.start + 8 * 3600000)
    const thu = at(week.start + 3.5 * 86400000)
    const sun = at(week.end - 1)
    expect(at(week.start + 8 * 3600000)).toEqual(mon)
    const total = (d) => d.filter((r) => !r.me).reduce((s, r) => s + r.score, 0)
    expect(total(mon)).toBeLessThan(total(thu))
    expect(total(thu)).toBeLessThan(total(sun))
    expect(total(mon)).toBeGreaterThan(0) // lively from day one
  })
})
