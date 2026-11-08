// Tests for story missions: the engine against simulated runs (surges that
// succeed or go okay, pauses, finishing early, slow and fast runners, lines
// never crowding each other), the script lint (lengths, house rules, every
// event has its words), unlocking, and the coach's mission suggestion.
import { describe, it, expect, beforeEach } from 'vitest'
import { createMission, MIN_GAP, BRISK_MIN, lineSeconds, surgeCount } from '../src/lib/missions/engine.js'
import { MISSIONS, CHAIN, CHAINS, missionById } from '../src/lib/missions/scripts.js'
import { unlockedIds, recordTry, loadProgress, saveResult, resultFor } from '../src/lib/missions/progress.js'
import { suggestMission, missionHeadline, missionMeta } from '../src/lib/missions/index.js'
import { trainingPaces } from '../src/lib/coach/paces.js'

const paces = trainingPaces(30 * 60)

// Run a mission second by second. surge: speed multiplier while a surge is on.
function sim(script, { paceS = 360, surge = 1.2, until = null, pauses = [], step = 1, paceAt = null } = {}) {
  const m = createMission(script, { paces })
  const said = []
  const events = []
  let elapsed = 0
  let dist = 0
  let wall = 0
  const end = until ?? (script.beats.at(-1).at + 900)
  while (elapsed <= end) {
    const p = pauses.find((x) => wall >= x.at && wall < x.at + x.for)
    if (p) {
      if (wall === p.at) m.pause({ elapsedS: elapsed, distanceM: dist })
      m.update({ elapsedS: elapsed, distanceM: dist, toStartM: 2000 }) // updates while paused do nothing
      wall += step
      if (wall === p.at + p.for) m.resume()
      continue
    }
    const out = m.update({ elapsedS: elapsed, distanceM: dist, toStartM: 2000 })
    for (const l of out.lines) said.push({ t: elapsed, line: l })
    for (const e of out.events) events.push({ t: elapsed, ...e })
    const v = m.view()
    const pace = paceAt ? paceAt(elapsed, v) : v.kind === 'surge' ? paceS / surge : paceS
    elapsed += step
    wall += step
    dist += (step * 1000) / pace
  }
  return { m, said, events }
}

describe('mission engine', () => {
  const supply = missionById('supply-line')

  it('plays a whole mission: every beat, every surge, then the finale', () => {
    const { m, said, events } = sim(supply)
    const lines = said.map((s) => s.line)
    for (const b of supply.beats) expect(lines, b.say).toContain(b.say)
    expect(events.filter((e) => e.type === 'surge-start')).toHaveLength(surgeCount(supply))
    expect(events.filter((e) => e.type === 'surge-end')).toHaveLength(surgeCount(supply))
    expect(events.some((e) => e.type === 'finale')).toBe(true)
    const s = m.finish().summary
    expect(s).toMatchObject({ id: 'supply-line', completed: true, surgesDone: 3, surgesTotal: 3, closing: supply.beats.at(-1).say })
  })

  it('a quicker surge succeeds', () => {
    const { m, events } = sim(supply, { surge: 1.2 })
    const ends = events.filter((e) => e.type === 'surge-end')
    expect(ends.every((e) => e.result === 'success')).toBe(true)
    expect(m.summary().surgesWon).toBe(3)
  })

  it('a surge that is only a little quicker is okay, and said kindly', () => {
    const { said, events } = sim(supply, { surge: 1.05 })
    expect(events.filter((e) => e.type === 'surge-end').every((e) => e.result === 'okay')).toBe(true)
    expect(said.map((s) => s.line)).toContain('You got away anyway. Nice work. Ease right back now.')
  })

  it('judges against your own pace before the surge, not a fixed number', () => {
    for (const paceS of [300, 480, 600]) {
      const { events } = sim(supply, { paceS, surge: 1.15 })
      const ends = events.filter((e) => e.type === 'surge-end')
      expect(ends.every((e) => e.result === 'success'), String(paceS)).toBe(true)
      expect(ends[0].beforeS).toBeGreaterThan(paceS - 5)
      expect(ends[0].beforeS).toBeLessThan(paceS + 5)
    }
  })

  it('starts an easy recover straight after each surge', () => {
    const { events } = sim(supply)
    events.forEach((e, i) => {
      if (e.type === 'surge-end') expect(events[i + 1]).toMatchObject({ type: 'recover-start', t: e.t })
    })
  })

  it('a surge\u2019s recovery always runs in full, even when a slow surge runs long', () => {
    for (const id of ['hilltop-crown', 'magpie-season']) {
      const script = missionById(id)
      const { events } = sim(script, { paceS: 600 })
      let rec = null
      for (const e of events) {
        if (e.type === 'recover-start' && rec === null) rec = e
        if (e.type === 'surge-start' && rec) expect(e.t - rec.t, id).toBeGreaterThanOrEqual(rec.seconds)
        if (e.type === 'surge-start') rec = null
        if (e.type === 'surge-end') rec = null
      }
    }
  })

  it('timed surges last their time for slow and fast runners alike', () => {
    for (const paceS of [270, 540]) {
      const { events } = sim(supply, { paceS })
      const starts = events.filter((e) => e.type === 'surge-start')
      const ends = events.filter((e) => e.type === 'surge-end')
      starts.forEach((s, i) => expect(ends[i].t - s.t).toBeGreaterThanOrEqual(40))
      starts.forEach((s, i) => expect(ends[i].t - s.t).toBeLessThanOrEqual(40 + MIN_GAP))
    }
  })

  it('metre surges take longer for slower runners, and the story slides along to fit', () => {
    const hill = missionById('hilltop-crown')
    const fast = sim(hill, { paceS: 270 })
    const slow = sim(hill, { paceS: 540 })
    const firstEnd = (r) => r.events.find((e) => e.type === 'surge-end').t - r.events.find((e) => e.type === 'surge-start').t
    expect(firstEnd(slow)).toBeGreaterThan(firstEnd(fast) * 1.6)
    for (const r of [fast, slow]) {
      expect(r.events.filter((e) => e.type === 'surge-end')).toHaveLength(surgeCount(hill))
      expect(r.m.summary().completed).toBe(true)
    }
    const finale = (r) => r.events.find((e) => e.type === 'finale').t
    expect(finale(slow)).toBeGreaterThan(finale(fast))
    expect(finale(slow)).toBeLessThan(hill.beats.at(-1).at + 600) // still about the right length
  })

  it('a metre surge never runs on forever', () => {
    const hill = missionById('hilltop-crown')
    const { events } = sim(hill, { paceAt: (t, v) => (v.kind === 'surge' ? 3000 : 360) }) // nearly stopped
    const s = events.find((e) => e.type === 'surge-start')
    const e = events.find((x) => x.type === 'surge-end')
    expect(e.t - s.t).toBeLessThanOrEqual(240 + MIN_GAP)
    expect(e.result).toBe('okay')
  })

  it('never lets two lines crowd each other, in any mission, for any runner', () => {
    for (const script of MISSIONS) {
      for (const paceS of [270, 420, 600]) {
        const { said } = sim(script, { paceS })
        for (let i = 1; i < said.length; i++) {
          // a brisk show (the game show) waits for the last line to finish instead
          const prev = said[i - 1].line
          const need = script.brisk ? Math.max(BRISK_MIN, lineSeconds(typeof prev === 'string' ? prev : prev.text) + (prev.fx ? 2 : 0) + 1) - 1 : MIN_GAP
          expect(said[i].t - said[i - 1].t, `${script.id} ${paceS}: ${JSON.stringify(said[i].line)}`).toBeGreaterThanOrEqual(need)
        }
      }
    }
  })

  it('says nothing but its own lines during a surge', () => {
    const { said, events } = sim(missionById('magpie-season'))
    const surges = []
    events.forEach((e) => { if (e.type === 'surge-start') surges.push([e.t]); if (e.type === 'surge-end') surges.at(-1).push(e.t) })
    const script = missionById('magpie-season')
    const own = new Set(script.beats.filter((b) => b.kind === 'surge').flatMap((b) => [b.say, b.half, b.success, b.okay]))
    for (const { t, line } of said) {
      if (surges.some(([a, b]) => t > a && t <= b)) expect(own.has(line), line).toBe(true)
    }
  })

  it('pausing pauses the mission, even if the clock outside keeps going', () => {
    const plain = sim(supply)
    const paused = sim(supply, { pauses: [{ at: 250, for: 120 }] }) // during the first surge
    const t = (r, type) => r.events.find((e) => e.type === type).t
    expect(t(paused, 'finale')).toBe(t(plain, 'finale'))
    expect(paused.m.summary().surgesWon).toBe(3)

    // elapsed and distance that move while paused don't count
    const m = createMission(supply, { paces })
    m.update({ elapsedS: 0, distanceM: 0 })
    m.update({ elapsedS: 100, distanceM: 300 })
    m.pause({ elapsedS: 100, distanceM: 300 })
    expect(m.update({ elapsedS: 500, distanceM: 900 }).lines).toEqual([])
    expect(m.view().paused).toBe(true)
    m.resume()
    m.update({ elapsedS: 500, distanceM: 900 })
    expect(m.summary().clockS).toBe(100)
  })

  it('finishing early ends the story kindly and keeps the count', () => {
    const { m } = sim(supply, { until: 600 })
    const out = m.finish()
    expect(out.lines).toEqual([supply.early])
    expect(out.summary).toMatchObject({ completed: false, surgesDone: 2, surgesTotal: 3, closing: supply.early })
    expect(m.update({ elapsedS: 700, distanceM: 2000 }).lines).toEqual([]) // nothing after the finish
  })

  it('finishing mid surge counts that surge without judging it out loud', () => {
    const { m, events } = sim(supply, { until: 260 })
    expect(m.view().kind).toBe('surge')
    const out = m.finish()
    expect(out.lines).toEqual([supply.early])
    expect(out.summary.surgesDone).toBe(1)
    expect(events.length).toBeGreaterThan(0)
  })

  it('after the finale, finishing adds no extra line', () => {
    const { m } = sim(supply)
    expect(m.finish().lines).toEqual([])
  })

  it('says the loop line once, after a kilometre, when the start is close', () => {
    const m = createMission(supply, { paces })
    const said = []
    for (let t = 0; t < 900; t++) {
      const d = (t / 360) * 1000
      const toStart = t > 400 && t < 460 ? 120 : 2000
      said.push(...m.update({ elapsedS: t, distanceM: d, toStartM: toStart }).lines)
    }
    expect(said.filter((l) => l === supply.loop)).toHaveLength(1)
    const early = createMission(supply, { paces })
    const said2 = []
    for (let t = 0; t < 300; t++) said2.push(...early.update({ elapsedS: t, distanceM: t * 2.5, toStartM: 100 }).lines)
    expect(said2).not.toContain(supply.loop) // under a kilometre
  })

  it('a steady stretch gives one gentle word if you are rushing it', () => {
    const scout = missionById('steady-scout')
    const fast = sim(scout, { paceS: 240 })
    expect(fast.said.filter((s) => s.line === scout.beats[0].easyNudge)).toHaveLength(1)
    const easy = sim(scout, { paceS: paces.easy[1] })
    expect(easy.said.some((s) => s.line === scout.beats[0].easyNudge)).toBe(false)
  })

  it('the strip shows the chapter and a counting surge timer', () => {
    const m = createMission(supply, { paces })
    for (let t = 0; t <= 250; t++) m.update({ elapsedS: t, distanceM: t * 3 })
    const v = m.view()
    expect(v).toMatchObject({ title: 'Supply Line', chapter: 'The corner shop', kind: 'surge', surgesTotal: 3 })
    expect(v.remainingS).toBe(30)
    expect(v.progress).toBeCloseTo(0.25, 1)
  })
})

describe('mission scripts', () => {
  const DASH = /[‒–—―]|--/
  const text = (l) => (typeof l === 'string' ? l : l?.text)
  const all = (m) => [m.blurb, m.loop, m.early, m.previously, m.next, ...m.beats.flatMap((b) => [b.say, b.success, b.okay, b.half, b.done, b.easyNudge, b.right, b.wrong, b.timeout, ...(b.options || []).flatMap((o) => [o.label, o.say])])].map(text).filter(Boolean)

  it('has the six Trailkeepers missions: three intro, two longer surge missions and one steady scout', () => {
    expect(MISSIONS.filter((m) => m.saga === 'trailkeepers')).toHaveLength(6)
    const intro = MISSIONS.filter((m) => m.series === 'intro')
    expect(intro).toHaveLength(3)
    for (const m of intro) expect(m.minutes).toBeGreaterThanOrEqual(15)
    for (const m of intro) expect(m.minutes).toBeLessThanOrEqual(25)
    const main = MISSIONS.filter((m) => m.series === 'main')
    expect(main).toHaveLength(2)
    for (const m of main) expect(m.minutes).toBeGreaterThanOrEqual(30)
    for (const m of main) expect(m.minutes).toBeLessThanOrEqual(40)
    expect(surgeCount(missionById('steady-scout'))).toBe(0)
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length)
  })

  it('every mission runs about as long as it says', () => {
    for (const m of MISSIONS.filter((x) => !x.brisk)) { // a brisk show moves at its own speed (gameshow.test.js times it)
      const finaleAt = m.beats.at(-1).at / 60
      expect(m.beats.at(-1).kind, m.id).toBe('finale')
      expect(finaleAt, m.id).toBeGreaterThan(m.minutes - 3)
      expect(finaleAt, m.id).toBeLessThanOrEqual(m.minutes + 1)
    }
  })

  it('every line is short, Australian and kind, with no dashes', () => {
    for (const m of MISSIONS) {
      for (const l of all(m)) {
        expect(l.length, l).toBeLessThanOrEqual(180)
        expect(l, l).not.toMatch(DASH)
        expect(l, l).not.toMatch(/\b(color|organize|favorite|center|realize|mom)\b/i)
        expect(l, l).not.toMatch(/\b(lazy|failed|failure|pathetic|should have|disappoint|kill|blood|dead|die|scary|zombie|weak)\b/i)
      }
    }
  })

  it('every event has its words', () => {
    for (const m of MISSIONS) {
      expect(m.title && m.blurb && m.loop && m.early && m.difficulty, m.id).toBeTruthy()
      let last = -1
      for (const b of m.beats) {
        expect(['story', 'surge', 'steady', 'recover', 'finale', 'choice', 'quiz', 'puzzle'], b.kind).toContain(b.kind)
        if (b.options) {
          expect(b.options.length).toBeGreaterThanOrEqual(2)
          for (const o of b.options) expect(o.label.length, o.label).toBeLessThanOrEqual(28)
          if (b.kind === 'choice') for (const o of b.options) expect(o.flag && o.say, `${m.id} ${b.at}`).toBeTruthy()
          else expect(b.options.some((o) => o.key === b.answer) && b.right && b.wrong, `${m.id} ${b.at}`).toBeTruthy()
        }
        expect(b.say, `${m.id} ${b.at}`).toBeTruthy()
        expect(b.at).toBeGreaterThan(last)
        last = b.at
        if (b.kind === 'surge') {
          expect(b.success && b.okay, `${m.id} ${b.at}`).toBeTruthy()
          expect(b.seconds || b.metres).toBeGreaterThan(0)
          expect(b.recover, 'surges are followed by a recover').toBeGreaterThanOrEqual(60)
        }
        if (b.kind === 'steady' || b.kind === 'recover') expect(b.seconds).toBeGreaterThan(0)
      }
      expect(m.beats[0].chapter, m.id).toBeTruthy()
    }
  })

  it('intro missions are gentle: short surges with plenty of recovery', () => {
    for (const m of MISSIONS.filter((x) => x.series === 'intro')) {
      for (const b of m.beats.filter((x) => x.kind === 'surge')) {
        expect(b.seconds).toBeLessThanOrEqual(45)
        expect(b.recover).toBeGreaterThanOrEqual(b.seconds * 2.5)
      }
    }
  })

  it('reuses shared lines across missions so the voice cache can help', () => {
    const counts = new Map()
    for (const m of MISSIONS) for (const l of new Set(all(m))) counts.set(l, (counts.get(l) || 0) + 1)
    expect([...counts.values()].filter((n) => n > 1).length).toBeGreaterThanOrEqual(4)
  })
})

describe('progress and suggestions', () => {
  beforeEach(() => {
    const mem = new Map()
    globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
  })

  it('unlocks the series in order, and any try counts', () => {
    // the first episode of every series is open from the start (plus Steady Scout, which is never locked)
    const firsts = Object.values(CHAINS).map((c) => c[0])
    expect(firsts).toEqual(expect.arrayContaining(['ember-smoke', 'first-steps', 'heist-recruit', 'quiz-1', 'signal-contact']))
    expect([...unlockedIds({})].sort()).toEqual([...firsts, 'steady-scout'].sort())
    recordTry({ id: 'first-steps', completed: false, surgesDone: 0 }) // a short, partial try
    expect(unlockedIds(loadProgress()).has('supply-line')).toBe(true)
    expect(unlockedIds(loadProgress()).has('lantern-night')).toBe(false)
    for (const id of CHAIN) recordTry({ id, completed: true })
    expect(unlockedIds(loadProgress()).size).toBe(6 + firsts.length - 1) // all six, plus the first episode of each other series
    expect(loadProgress()['first-steps']).toMatchObject({ tries: 2, completed: 1 })
  })

  it('keeps each run’s mission result for its result screen', () => {
    saveResult('a1', { id: 'supply-line', title: 'Supply Line', completed: true, surgesDone: 3, surgesTotal: 4 })
    expect(resultFor('a1').title).toBe('Supply Line')
    expect(resultFor('nope')).toBe(null)
    expect(missionHeadline(resultFor('a1'))).toBe('Mission complete: Supply Line, 3 of 4 surges')
    expect(missionHeadline({ title: 'Steady Scout', completed: false, surgesTotal: 0 })).toBe('Mission played: Steady Scout')
  })

  it('suggests a mission that suits today’s session', () => {
    const open = unlockedIds({})
    expect(suggestMission('easy', open)).toMatchObject({ id: 'steady-scout' })
    expect(suggestMission('tempo', open)).toMatchObject({ id: 'first-steps', text: "Today's tempo run, as a mission? Try First Steps." })
    const all = new Set(MISSIONS.map((m) => m.id))
    expect(suggestMission('intervals', all).id).toBe('hilltop-crown')
    expect(suggestMission('strength', all)).toBe(null)
    expect(suggestMission(null, all)).toBe(null)
  })

  it('describes each mission for the picker', () => {
    expect(missionMeta(missionById('supply-line'))).toBe('20 min · Gentle · 3 surges')
    expect(missionMeta(missionById('steady-scout'))).toBe('20 min · Easy · No surges')
  })
})
