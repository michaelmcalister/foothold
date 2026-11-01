// Coach tests: paces, safe plan ramps, adaptation (sick, injury, edits), loop suggestions and nudges.
import { describe, it, expect } from 'vitest'
import { latLngToCell, gridDisk } from 'h3-js'
import { offset } from '../src/lib/engine/geo.js'
import { RES } from '../src/lib/engine/territory.js'
import {
  estimateFitness, riegel, generatePlan, adaptPlan, nextSession, weekSummary, suggestLoop,
  nudgeFor, nudgesFor, passesRegretTest, isQuality, isRun, diffDays, LONG_CAP_KM, toMs, allSessions,
} from '../src/lib/coach/index.js'

const TODAY = '2026-11-01' // a Sunday
const NOW = toMs(TODAY) + 12 * 3600000
const DAY = 86400000
const ORIGIN = { lat: -33.9, lng: 151.15 }

function runs(n, { km = 6, paceS = 330, everyDays = 3 } = {}) {
  return Array.from({ length: n }, (_, i) => ({ startedAt: NOW - (i + 1) * everyDays * DAY, distanceM: km * 1000, movingS: km * paceS, mode: 'run' }))
}

const base = { daysPerWeek: 4, longRunDay: 'sun', currentWeeklyKm: 20, longestRecentKm: 8, includeStrength: false, today: TODAY }
const goals = [
  { ...base, goal: '5k', raceDate: '2027-01-10' },
  { ...base, goal: '10k', raceDate: '2027-02-14', daysPerWeek: 5 },
  { ...base, goal: 'half', raceDate: '2027-03-14' },
  { ...base, goal: 'marathon', raceDate: '2027-06-13', currentWeeklyKm: 35, longestRecentKm: 14, daysPerWeek: 5 },
  { ...base, goal: 'base', daysPerWeek: 3 },
  { ...base, goal: 'half', raceDate: '2027-04-18', daysPerWeek: 6, currentWeeklyKm: 30, longestRecentKm: 12, includeStrength: true },
]
const plans = goals.map((g) => [g, generatePlan(g)])

describe('paces', () => {
  it('uses Riegel', () => {
    expect(Math.round(riegel(1500, 5000, 10000))).toBe(3127)
  })
  it('estimates from history with confidence', () => {
    const f = estimateFitness(runs(8, { km: 6, paceS: 300 }), { now: NOW })
    expect(f.confidence).toBe('high')
    expect(f.paces.easy[0]).toBeLessThan(f.paces.easy[1])
    expect(f.paces.intervals[0]).toBeLessThan(f.paces.tempo[0])
    expect(f.paces.tempo[0]).toBeLessThan(f.paces.easy[0])
    for (const k of ['easy', 'long', 'tempo', 'intervals', 'recovery']) expect(f.paces[k]).toHaveLength(2)
    expect(f.predictions['10k']).toBeGreaterThan(f.predictions['5k'] * 2)
    expect(Object.keys(f.predictions)).toEqual(['5k', '10k', 'half', 'marathon'])
  })
  it('falls back to self report then a conservative default', () => {
    const self = estimateFitness([], { now: NOW, recent5kS: 25 * 60 })
    expect(self.confidence).toBe('low')
    expect(self.fiveKS).toBeGreaterThan(25 * 60) // self-ratings are slowed a touch
    const none = estimateFitness([], { now: NOW })
    expect(none.confidence).toBe('low')
    expect(none.fiveKS).toBeGreaterThanOrEqual(30 * 60)
  })
})

describe('generatePlan', () => {
  it('has the requested shape', () => {
    const [, p] = plans[2]
    expect(p.id).toBeTruthy()
    expect(p.startDate).toBe('2026-11-02')
    const s = p.weeks[0].sessions[0]
    for (const k of ['id', 'date', 'day', 'type', 'title', 'description', 'territory', 'formtrack', 'status']) expect(s).toHaveProperty(k)
    for (const w of p.weeks) for (const x of w.sessions) {
      expect(x.description).not.toMatch(/[\u2014\u2013]/)
      expect(x.title).not.toMatch(/[\u2014\u2013]/)
      expect(x.status).toBe('planned')
      if (['easy', 'long', 'recovery'].includes(x.type)) expect(x.territory).toBe(true)
      if (x.type === 'strength') expect(x.formtrack).toBe(true)
    }
  })

  it('never ramps more than 10% between non-deload weeks', () => {
    for (const [g, p] of plans) {
      let prev = null
      for (const w of p.weeks) {
        if (w.taper) break
        if (w.deload) continue
        if (prev != null) expect(w.targetKm, `${g.goal} week ${w.index + 1}`).toBeLessThanOrEqual(prev * 1.1 + 0.15)
        prev = w.targetKm
      }
    }
  })

  it('starts from actual volume, not the goal', () => {
    for (const [g, p] of plans) expect(p.weeks[0].targetKm).toBeLessThanOrEqual(Math.max(5, g.currentWeeklyKm) + 0.2)
  })

  it('trusts run history over an optimistic self-rating', () => {
    const p = generatePlan({ ...base, goal: '10k', currentWeeklyKm: 40, activities: runs(8, { km: 4, everyDays: 3 }) })
    expect(p.weeks[0].targetKm).toBeLessThan(15)
  })

  it('deloads every 4th week to about 75%', () => {
    for (const [, p] of plans) {
      p.weeks.forEach((w, i) => {
        if (w.taper) return
        expect(w.deload).toBe((i + 1) % 4 === 0)
        if (w.deload) {
          const ratio = w.targetKm / p.weeks[i - 1].targetKm
          expect(ratio).toBeGreaterThan(0.65)
          expect(ratio).toBeLessThan(0.85)
        }
      })
    }
  })

  it('has at most 2 quality sessions a week and never on consecutive days', () => {
    for (const [, p] of plans) {
      const q = allSessions(p).filter(isQuality).map((s) => s.date).sort()
      for (let i = 1; i < q.length; i++) expect(diffDays(q[i - 1], q[i])).toBeGreaterThan(1)
      for (const w of p.weeks) expect(w.sessions.filter(isQuality).length).toBeLessThanOrEqual(2)
    }
  })

  it('keeps about 80% of the running easy', () => {
    for (const [, p] of plans) {
      let hard = 0, all = 0
      for (const s of allSessions(p)) {
        if (!isRun(s) || s.type === 'race') continue
        all += s.distanceKm
        if (isQuality(s)) {
          const h = s.steps.find((x) => ['tempo', 'interval'].includes(x.kind))
          hard += ((h.repeat || 1) * h.distanceM) / 1000
        }
      }
      expect(hard / all).toBeLessThanOrEqual(0.2)
    }
  })

  it('caps the long run at 30% of the week and the goal cap', () => {
    for (const [g, p] of plans) for (const w of p.weeks) for (const s of w.sessions) {
      if (s.type !== 'long') continue
      expect(s.distanceKm).toBeLessThanOrEqual(LONG_CAP_KM[g.goal])
      expect(s.distanceKm).toBeLessThanOrEqual(w.targetKm * 0.3 + 0.15)
    }
  })

  it('tapers into race day', () => {
    for (const [g, p] of plans) {
      if (!g.raceDate) continue
      const n = { '5k': 1, '10k': 1, half: 2, marathon: 3 }[g.goal]
      const tapers = p.weeks.filter((w) => w.taper)
      expect(tapers.length).toBe(n)
      const lastBuild = p.weeks[p.weeks.length - n - 1]
      const peak = Math.max(...p.weeks.filter((w) => !w.taper).map((w) => w.targetKm))
      const race = allSessions(p).find((s) => s.type === 'race')
      expect(race.date).toBe(g.raceDate)
      for (const t of tapers) {
        const nonRace = t.sessions.filter((s) => isRun(s) && s.type !== 'race').reduce((a, s) => a + s.distanceKm, 0)
        expect(nonRace).toBeLessThan(peak * 0.85)
      }
      expect(lastBuild).toBeTruthy()
    }
  })

  it('warns when the race is too soon instead of ramping unsafely', () => {
    const p = generatePlan({ ...base, goal: 'marathon', raceDate: '2026-12-20', currentWeeklyKm: 15, longestRecentKm: 6 })
    expect(p.warnings.length).toBeGreaterThan(0)
    expect(p.warnings.join(' ')).toMatch(/too soon/)
    let prev = null
    for (const w of p.weeks.filter((x) => !x.taper && !x.deload)) {
      if (prev) expect(w.targetKm).toBeLessThanOrEqual(prev * 1.1 + 0.15)
      prev = w.targetKm
    }
    expect(Math.max(...allSessions(p).filter((s) => s.type === 'long').map((s) => s.distanceKm))).toBeLessThan(10)
    for (const w of p.warnings) expect(w).not.toMatch(/[\u2014\u2013]/)
  })

  it('return plan uses time based run/walk with no quality for 3 weeks', () => {
    const p = generatePlan({ ...base, goal: 'return', currentWeeklyKm: 0 })
    for (const w of p.weeks.slice(0, 3)) {
      expect(w.sessions.filter(isQuality)).toHaveLength(0)
      for (const s of w.sessions.filter(isRun)) {
        expect(s.durationMin).toBeGreaterThan(0)
        expect(s.runWalk).toBe(true)
        expect(s.steps[0].durationS).toBeGreaterThan(0)
      }
    }
  })

  it('base is 8 weeks of aerobic building', () => {
    const p = plans[4][1]
    expect(p.weeks).toHaveLength(8)
    expect(allSessions(p).filter(isQuality)).toHaveLength(0)
  })

  it('adds 1 or 2 FormTrack strength sessions on easy days', () => {
    const p = plans[5][1]
    for (const w of p.weeks.filter((x) => !x.taper)) {
      const st = w.sessions.filter((s) => s.type === 'strength')
      expect(st.length).toBeGreaterThanOrEqual(1)
      expect(st.length).toBeLessThanOrEqual(2)
      for (const s of st) {
        expect(s.formtrack).toBe(true)
        const same = w.sessions.filter((x) => x.date === s.date && isRun(x))
        for (const r of same) expect(isQuality(r) || r.type === 'long').toBe(false)
      }
    }
  })
})

describe('adaptPlan', () => {
  const p = generatePlan({ ...base, goal: 'half', raceDate: '2027-05-16' })

  it('marks completed and eases the next quality after a much longer run', () => {
    const s = allSessions(p).find((x) => x.type === 'easy' && x.date >= '2026-11-09')
    const { plan, changes } = adaptPlan(p, { type: 'completed', sessionId: s.id, activity: { distanceM: (s.distanceKm + 4) * 1000, movingS: (s.distanceKm + 4) * 400 } }, s.date)
    expect(allSessions(plan).find((x) => x.id === s.id).status).toBe('done')
    expect(changes.join(' ')).toMatch(/easy run/)
    const nextQ = allSessions(p).find((x) => isQuality(x) && x.date > s.date)
    if (diffDays(s.date, nextQ.date) <= 4) expect(allSessions(plan).find((x) => x.id === nextQ.id).type).toBe('easy')
  })

  it('missed marks the session and does not cram', () => {
    const s = allSessions(p).find((x) => x.type === 'long')
    const { plan } = adaptPlan(p, { type: 'missed', sessionId: s.id }, s.date)
    expect(allSessions(plan).find((x) => x.id === s.id).status).toBe('missed')
    expect(allSessions(plan).filter(isRun).reduce((a, x) => a + x.distanceKm, 0)).toBeCloseTo(allSessions(p).filter(isRun).reduce((a, x) => a + x.distanceKm, 0), 5)
  })

  it('sick pauses, eases back in at about 70%, and extends the plan when there is a buffer', () => {
    const noRace = generatePlan({ ...base, goal: 'base' })
    const { plan, changes } = adaptPlan(noRace, { type: 'sick', days: 5, from: '2026-11-17' }, '2026-11-17')
    const window = allSessions(plan).filter((x) => x.date >= '2026-11-17' && x.date <= '2026-11-21' && x.type !== 'rest')
    expect(window.length).toBeGreaterThan(0)
    for (const s of window) expect(s.status).toBe('skipped')
    expect(plan.endDate > noRace.endDate).toBe(true)
    expect(plan.weeks.length).toBe(noRace.weeks.length + 1)
    const after = allSessions(plan).filter((x) => x.date > '2026-11-21' && x.date <= '2026-11-28' && isRun(x))
    expect(after.length).toBeGreaterThan(0)
    for (const x of after) {
      expect(x.original).toBeTruthy()
      expect(x.distanceKm / x.original.distanceKm).toBeLessThan(0.8)
    }
    expect(after.filter(isQuality)).toHaveLength(0)
    expect(changes.length).toBeGreaterThan(0)
    for (const c of changes) expect(c).not.toMatch(/[\u2014\u2013]/)
  })

  it('sick with a fixed race date warns instead of cramming', () => {
    const tight = generatePlan({ ...base, goal: '10k', raceDate: '2027-01-10' })
    const totalBefore = allSessions(tight).filter(isRun).reduce((a, x) => a + x.distanceKm, 0)
    const { plan, warnings } = adaptPlan(tight, { type: 'sick', days: 6, from: '2026-11-24' }, '2026-11-24')
    expect(plan.endDate).toBe(tight.endDate)
    expect(warnings.length).toBeGreaterThan(0)
    const totalAfter = allSessions(plan).filter((x) => isRun(x) && x.status === 'planned').reduce((a, x) => a + x.distanceKm, 0)
    expect(totalAfter).toBeLessThan(totalBefore)
  })

  it('niggle swaps the next quality for easy', () => {
    const q = allSessions(p).find((x) => isQuality(x))
    const { plan } = adaptPlan(p, { type: 'injury', area: 'calf', severity: 'niggle' }, TODAY)
    expect(allSessions(plan).find((x) => x.id === q.id).type).toBe('easy')
  })

  it('sore gives 5 easy days at reduced volume', () => {
    const { plan } = adaptPlan(p, { type: 'injury', area: 'knee', severity: 'sore' }, '2026-11-02')
    const win = allSessions(plan).filter((x) => x.date >= '2026-11-02' && x.date <= '2026-11-06' && isRun(x))
    for (const s of win) expect(['easy', 'recovery']).toContain(s.type)
  })

  it("injury 'hurt' removes running sessions and offers a return plan", () => {
    const { plan, warnings } = adaptPlan(p, { type: 'injury', area: 'shin', severity: 'hurt' }, TODAY)
    expect(allSessions(plan).filter((x) => isRun(x) && x.status === 'planned')).toHaveLength(0)
    expect(warnings.join(' ')).toMatch(/GP or physio/)
    expect(plan.offer.goal).toBe('return')
    expect(nextSession(plan, TODAY)?.type ?? null).not.toBe('easy')
  })

  it('edit re-checks the week load', () => {
    const w = p.weeks[5]
    const easy = w.sessions.find((x) => x.type === 'easy')
    const { plan, warnings } = adaptPlan(p, { type: 'edit', sessionId: easy.id, changes: { distanceKm: easy.distanceKm + 8 } }, TODAY)
    expect(allSessions(plan).find((x) => x.id === easy.id).distanceKm).toBe(easy.distanceKm + 8)
    expect(warnings.join(' ')).toMatch(/10%/)
    const ok = adaptPlan(p, { type: 'edit', sessionId: easy.id, changes: { distanceKm: easy.distanceKm - 1 } }, TODAY)
    expect(ok.warnings).toHaveLength(0)
  })

  it('edit warns about back to back quality days', () => {
    const w = p.weeks[5]
    const [q] = w.sessions.filter(isQuality)
    const nextDay = w.sessions.find((x) => diffDays(q.date, x.date) === 1 && isRun(x)) || w.sessions.find((x) => diffDays(q.date, x.date) === -1)
    const target = nextDay || w.sessions.find((x) => x.type === 'easy')
    const { warnings } = adaptPlan(p, { type: 'edit', sessionId: target.id, changes: { type: 'tempo', date: addOne(q.date) } }, TODAY)
    expect(warnings.join(' ')).toMatch(/back to back/)
  })

  it('holiday skips the window', () => {
    const { plan } = adaptPlan(p, { type: 'holiday', from: '2026-12-21', to: '2026-12-27' }, TODAY)
    for (const s of allSessions(plan).filter((x) => x.date >= '2026-12-21' && x.date <= '2026-12-27')) expect(s.status).toBe('skipped')
  })

  it('does not mutate the input plan', () => {
    const before = JSON.stringify(p)
    adaptPlan(p, { type: 'sick', days: 4 }, TODAY)
    expect(JSON.stringify(p)).toBe(before)
  })

  it('nextSession and weekSummary', () => {
    const n = nextSession(p, TODAY)
    expect(n.date >= TODAY).toBe(true)
    expect(n.type).not.toBe('rest')
    const sum = weekSummary(p, runs(3), '2026-11-04')
    expect(sum.weekNumber).toBe(1)
    expect(sum.targetKm).toBe(p.weeks[0].targetKm)
    expect(sum.message).not.toMatch(/[\u2014\u2013]/)
  })
})

function addOne(iso) {
  return new Date(toMs(iso) + DAY).toISOString().slice(0, 10)
}

describe('suggestLoop', () => {
  it('prefers the heading with more capturable hexes', () => {
    // Everything west of the start is mine; a weakly held rival patch sits to the east.
    const cells = new Map()
    for (let e = -2500; e <= 2500; e += 60) for (let n = -2500; n <= 2500; n += 60) {
      const p = offset(ORIGIN, e, n)
      const h = latLngToCell(p.lat, p.lng, RES)
      if (e < -100) cells.set(h, { h3: h, owner: 'me', strength: 50, visits: 3, lastVisit: NOW, claimedAt: NOW })
      else if (e > 200) cells.set(h, { h3: h, owner: 'sam', strength: 10, visits: 1, lastVisit: NOW, claimedAt: NOW })
    }
    // A strong rival block to the north east that this effort can't take.
    const ne = offset(ORIGIN, 900, 900)
    for (const h of gridDisk(latLngToCell(ne.lat, ne.lng, RES), 4)) cells.set(h, { h3: h, owner: 'kim', strength: 100, visits: 9, lastVisit: NOW, claimedAt: NOW })
    const r = suggestLoop({ start: ORIGIN, targetKm: 5, cells, me: 'me', now: NOW, names: { sam: 'Sam' } })
    expect(['east', 'south east']).toContain(r.heading)
    expect(r.estimatedHexes.rival).toBeGreaterThan(r.estimatedHexes.mine)
    expect(r.rivalOwners[0]).toBe('sam')
    expect(r.note).toMatch(/^Heading (east|south east) picks up/)
    expect(r.note).toMatch(/Sam's/)
    expect(r.ring[0]).toEqual(r.ring[r.ring.length - 1])
  })

  it('makes a loop near the target length on an empty map', () => {
    const r = suggestLoop({ start: ORIGIN, targetKm: 4, cells: new Map(), me: 'me', now: NOW })
    expect(r.estimatedHexes.wild).toBeGreaterThan(20)
    expect(r.estimatedHexes.mine).toBe(0)
    expect(r.note).toMatch(/wild hexes/)
  })
})

describe('nudges', () => {
  const next = generatePlan({ ...base, goal: '10k' }).weeks[0].sessions.find((s) => s.type === 'easy')
  const contexts = [
    { now: NOW, mode: 'run', name: 'Mia', hexes: 120, fadingSoon: 14, fadingDays: 3, streakWeeks: 4, daysSinceLast: 2, battles: [], nextSession: next, loadLevel: 'ok', firstTime: false },
    { now: NOW, mode: 'run', battles: [{ rival: 'Sam', mine: false, us: 8, them: 12, endsInDays: 2 }], loadLevel: 'ok', daysSinceLast: 1 },
    { now: NOW, mode: 'run', battles: [{ rival: 'Sam', mine: true, us: 12, them: 8, endsInDays: 5 }], loadLevel: 'ok', daysSinceLast: 1 },
    { now: NOW, mode: 'walk', daysSinceLast: 40, suburb: 'Marrickville', wildAgain: 30, loadLevel: 'ok' },
    { now: NOW, mode: 'run', daysSinceLast: 10, loadLevel: 'ok' },
    { now: NOW, mode: 'run', loadLevel: 'high', fadingSoon: 5, fadingDays: 1, daysSinceLast: 0 },
    { now: NOW, mode: 'run', loadLevel: 'caution', daysSinceLast: 1 },
    { now: NOW, mode: 'run', firstTime: true, daysSinceLast: null },
    { now: NOW, mode: 'ride', streakWeeks: 6, daysSinceLast: 3, nextSession: { ...next, type: 'strength', title: 'Strength for runners', formtrack: true, territory: false, paceRange: undefined } },
  ]

  it('are questions with no em or en dashes, and pass the regret test', () => {
    for (const c of contexts) {
      const all = nudgesFor(c)
      expect(all.length).toBeGreaterThan(0)
      for (const n of all) {
        expect(n.title.trim().endsWith('?'), n.title).toBe(true)
        for (const t of [n.title, n.body, n.cta || '']) expect(t).not.toMatch(/[\u2014\u2013]/)
        expect(passesRegretTest(n)).toBe(true)
        expect(typeof n.priority).toBe('number')
      }
    }
  })

  it('include a lapsed comeback nudge', () => {
    const n = nudgeFor(contexts[3])
    expect(n.title).toBe('Your old ground in Marrickville is wild again. Reclaim it this week?')
  })

  it('put safety first when load is high', () => {
    const n = nudgeFor(contexts[5])
    expect(n.title).toMatch(/easy/)
    expect(nudgesFor(contexts[5]).some((x) => x.id === 'fading')).toBe(false)
  })

  it('return null when there is nothing to say', () => {
    expect(nudgeFor({ now: NOW, daysSinceLast: 1, loadLevel: 'ok' })).toBeNull()
  })
})
