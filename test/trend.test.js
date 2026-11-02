// Fitness trend tests: weekly rolling 5K, easy pace and heart rate, volume, readiness, the kind headline and race confidence.
import { describe, it, expect } from 'vitest'
import { fitnessTrend, fiveKSeries, headline, isEasyRun, trackHr, racePanel, estimateFitness, toMs, addDays } from '../src/lib/coach/index.js'

const DAY = 86400000
const NOW = toMs('2026-11-04') + 10 * 3600000 // a Wednesday
// A run d days ago: km at paceS per km
const run = (d, km, paceS, extra = {}) => ({ id: `r${d}-${km}`, mode: 'run', startedAt: NOW - d * DAY, distanceM: km * 1000, movingS: km * paceS, ...extra })

describe('fitnessTrend', () => {
  it('gives 26 Monday weeks, oldest first, ending with this week', () => {
    const t = fitnessTrend({ activities: [], now: NOW })
    expect(t.weeks).toHaveLength(26)
    expect(t.weeks[25].start).toBe('2026-11-02')
    expect(t.weeks[0].start).toBe(addDays('2026-11-02', -25 * 7))
    expect(t.current).toBeNull()
    expect(t.headline.tone).toBe('none')
    expect(t.races).toEqual([])
  })

  it('sums weekly km and leaves weeks with nothing to go on empty, not a default', () => {
    const t = fitnessTrend({ activities: [run(1, 5, 360), run(2, 8, 380), run(9, 6, 370)], now: NOW })
    expect(t.weeks[25].km).toBe(13)
    expect(t.weeks[24].km).toBe(6)
    expect(t.weeks[10].fiveKS).toBeNull()
    expect(t.weeks[10].km).toBe(0)
  })

  it('ignores walks, rides and rejected runs', () => {
    const t = fitnessTrend({ activities: [run(1, 5, 360, { mode: 'walk' }), run(1, 5, 300, { rejected: true }), run(2, 20, 120, { mode: 'ride' })], now: NOW })
    expect(t.weeks[25].km).toBe(0)
    expect(t.current).toBeNull()
  })

  it("rolls the 5K so one great run doesn't spike it, and it drops out after 8 weeks", () => {
    const steady = [3, 10, 17, 24, 31].map((d) => run(d, 5, 330)) // 27:30 5Ks
    const t1 = fitnessTrend({ activities: steady, now: NOW })
    const one = [...steady, run(5, 5, 270)] // a lucky 22:30
    const t2 = fitnessTrend({ activities: one, now: NOW })
    // averaged with the next best, so it moves about half way, not all the way
    expect(t2.current.fiveKS).toBeGreaterThan(1300)
    expect(t2.current.fiveKS).toBeLessThan(t1.current.fiveKS)
    // 9 weeks later the lucky run has left the window
    const later = fitnessTrend({ activities: [...one.map((a) => ({ ...a, startedAt: a.startedAt - 63 * DAY })), ...steady], now: NOW })
    expect(later.current.fiveKS).toBe(t1.current.fiveKS)
  })

  it('tracks easy run pace and heartbeats per km when tracks have heart rate', () => {
    const hrTrack = (bpm) => Array.from({ length: 40 }, (_, i) => ({ lat: 0, lng: 0, t: i * 1000, hr: bpm }))
    const acts = [run(1, 5, 300), run(2, 6, 390), run(3, 8, 400), run(4, 5, 305), run(5, 5, 310)]
    const tracks = { [acts[1].id]: hrTrack(140), [acts[2].id]: hrTrack(150) }
    const t = fitnessTrend({ activities: acts, tracks, now: NOW })
    const w = t.weeks[25].start === '2026-11-02' ? t.weeks[25] : null
    const prev = t.weeks[24]
    // runs 1 to 2 days ago are this week; 3 to 5 days ago last week
    expect(w.easyRuns).toBe(1)
    expect(w.easyPaceS).toBe(390)
    expect(w.easyHr).toBe(140)
    expect(w.beatsPerKm).toBe(Math.round((140 * 390) / 60))
    expect(prev.easyPaceS).toBe(400)
    expect(t.hasHr).toBe(true)
  })

  it('averages daily readiness snapshots into weeks', () => {
    const t = fitnessTrend({ activities: [run(1, 5, 330)], readiness: { '2026-11-02': 60, '2026-11-03': 80, '2026-10-27': 50 }, now: NOW })
    expect(t.weeks[25].readiness).toBe(70)
    expect(t.weeks[24].readiness).toBe(50)
    expect(t.hasReadiness).toBe(true)
    expect(fitnessTrend({ activities: [run(1, 5, 330)], now: NOW }).hasReadiness).toBe(false)
  })
})

describe('headline', () => {
  const rows = (vals) => vals.map((v, i) => ({ start: addDays('2026-08-03', i * 7), fiveKS: v, confidence: 'high' }))
  it('names the gain and the month, kindly and specifically', () => {
    const h = headline(rows([1800, 1790, null, 1750, 1700, 1690, 1680, 1660, 1650, 1640]))
    expect(h.tone).toBe('better')
    expect(h.text).toBe('Your predicted 5K is 2:40 faster than in August.')
  })
  it('holds steady when flat or slower, and never says slower', () => {
    for (const vals of [[1700, 1700, 1700, 1700, 1705], [1600, 1650, 1700, 1720, 1750]]) {
      const h = headline(rows(vals))
      expect(h.tone).toBe('steady')
      expect(h.text).toBe('Holding steady. Consistency is how fitness builds.')
      expect(h.text).not.toMatch(/slower|worse|down|lost/i)
    }
  })
  it('says early days with under 4 weeks to compare', () => {
    expect(headline(rows([null, null, 1700, 1690])).tone).toBe('early')
  })
  it('says so plainly when confidence is low', () => {
    const r = rows([1700, 1700, 1700, 1700, 1650])
    r[4].confidence = 'low'
    expect(headline(r).note).toMatch(/only a few runs/)
  })
  it('uses no dashes in any line', () => {
    const all = [headline(rows([1800, 1800, 1800, 1800, 1600])), headline(rows([1700])), headline([])]
    for (const h of all) expect(`${h.text} ${h.note || ''}`).not.toMatch(/[–—]|--/)
  })
})

describe('fiveKSeries', () => {
  it('drops thin early weeks once a trusted week exists, and keeps them otherwise', () => {
    const r = (c) => ({ label: 'x', fiveKS: 1700, confidence: c })
    expect(fiveKSeries([r('low'), r('low'), r('medium'), r('low')]).map((x) => x.value)).toEqual([null, null, 1700, 1700])
    expect(fiveKSeries([r('low'), r('low')]).map((x) => x.value)).toEqual([1700, 1700])
  })
})

describe('race predictions and helpers', () => {
  it('gives 4 races with longer ones a rougher guide', () => {
    const acts = [3, 6, 10, 14, 20, 27].map((d) => run(d, 6, 330))
    const fit = estimateFitness(acts, { now: NOW, days: 56 })
    const p = racePanel(fit, acts, NOW)
    expect(p.map((r) => r.key)).toEqual(['5k', '10k', 'half', 'marathon'])
    expect(p[0].confidence).toBe(fit.confidence)
    expect(p[3].confidence).toBe('low')
    expect(p[1].timeS).toBeGreaterThan(p[0].timeS * 2)
  })
  it('spots easy runs by pace against fitness', () => {
    expect(isEasyRun(run(1, 5, 400), 1500)).toBe(true) // 5:00 5K pace, 6:40 easy
    expect(isEasyRun(run(1, 5, 310), 1500)).toBe(false)
    expect(isEasyRun(run(1, 1.5, 400), 1500)).toBe(false)
  })
  it('needs heart rate on most of the track', () => {
    expect(trackHr([{ hr: 150 }])).toBeNull()
    expect(trackHr(Array.from({ length: 30 }, () => ({ hr: 150 })))).toBe(150)
  })
})
