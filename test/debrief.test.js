// Coach's notes tests: each branch of the rule-based debrief (plan, splits, heart rate, cadence, load, ground, next time).
import { describe, it, expect } from 'vitest'
import { debrief, kmSplits, plannedFor, toMs } from '../src/lib/coach/index.js'
import { offset, summarise } from '../src/lib/engine/geo.js'

const NOW = toMs('2026-11-01') + 20 * 3600000
const DAY = 86400000
const ORIGIN = { lat: -33.9, lng: 151.15 }

// A straight run north with the given seconds for each km, a point every 10 m.
function track(splits, { hr = null, cad = null } = {}) {
  const pts = []
  let t = NOW - splits.reduce((s, x) => s + x, 0) * 1000 - 3600000
  let m = 0
  splits.forEach((secs, k) => {
    for (let j = 0; j < 100; j++) {
      const p = { ...offset(ORIGIN, 0, m), t: Math.round(t) }
      if (hr) p.hr = typeof hr === 'function' ? hr(k, splits.length) : hr
      if (cad) p.cad = cad
      pts.push(p)
      m += 10
      t += (secs / 100) * 1000
    }
  })
  pts.push({ ...offset(ORIGIN, 0, m), t: Math.round(t), ...(hr ? { hr: typeof hr === 'function' ? hr(splits.length - 1, splits.length) : hr } : {}), ...(cad ? { cad } : {}) })
  return pts
}
const TRACKS = new WeakMap()
function activity(pts, extra = {}) {
  const a = { id: 'a1', mode: 'run', startedAt: pts[0].t, ...summarise(pts), loops: 1, claimed: 0, taken: 0, reinforced: 0, ...extra }
  TRACKS.set(a, pts)
  return a
}
const easy = { type: 'easy', title: 'Easy 5 km', distanceKm: 5, paceRange: [360, 395], status: 'planned' }
const notes = (o) => debrief({ now: NOW, track: (o.activity && TRACKS.get(o.activity)) || [], ...o })
const kinds = (ns) => ns.map((n) => n.kind)

describe('debrief basics', () => {
  it('returns nothing for a rejected activity', () => {
    expect(notes({ activity: { rejected: true } })).toEqual([])
    expect(notes({})).toEqual([])
  })
  it('always gives 2 to 4 notes, ending with one for next time, with no dashes', () => {
    const cases = [
      { activity: activity(track([300, 300])) },
      { activity: activity(track([360, 365, 370, 368, 372]), { mode: 'walk' }) },
      { activity: activity(track([150, 150, 150]), { mode: 'ride' }) },
      { activity: activity(track([330, 340, 380, 400], { hr: (k) => 140 + k * 8, cad: 80 })), planned: easy, recent: [] },
    ]
    for (const c of cases) {
      const ns = notes(c)
      expect(ns.length).toBeGreaterThanOrEqual(2)
      expect(ns.length).toBeLessThanOrEqual(4)
      expect(ns[ns.length - 1].kind).toBe('next')
      for (const n of ns) expect(n.text).not.toMatch(/[–—]|--/)
    }
  })
})

describe('against the plan', () => {
  it('flags an easy run that went too fast, gently, and suggests the range', () => {
    const ns = notes({ activity: activity(track([300, 300, 300, 300, 300])), planned: easy })
    const plan = ns.find((n) => n.kind === 'plan')
    expect(plan.fast).toBe(true)
    expect(plan.text).toMatch(/^Easy 5 km: You ran 5 km with 5 km planned\. Spot on\./)
    expect(plan.text).toMatch(/quicker than the easy range of 6:00 to 6:35 per km.*slower is the win/)
    expect(ns[ns.length - 1].text).toMatch(/aim for 6:00 to 6:35 per km/)
  })
  it('praises an easy run in range and is relaxed about a slow one', () => {
    expect(notes({ activity: activity(track([370, 370, 370, 370, 370])), planned: easy }).find((n) => n.kind === 'plan').text).toMatch(/right in your easy range/)
    expect(notes({ activity: activity(track([430, 430, 430, 430, 430])), planned: easy }).find((n) => n.kind === 'plan').text).toMatch(/slower than planned\. That's fine/)
  })
  it('compares distance: shorter needs no making up, longer earns a rest note', () => {
    const short = notes({ activity: activity(track([370, 370, 370])), planned: easy }).find((n) => n.kind === 'plan')
    expect(short.text).toMatch(/3 km of the 5 km planned\. Every run counts/)
    const ns = notes({ activity: activity(track(Array(8).fill(370))), planned: easy })
    expect(ns.find((n) => n.kind === 'plan').longer).toBe(true)
    expect(ns[ns.length - 1].text).toMatch(/stick close to the planned distance/)
  })
  it('judges tempo by the quickest km and skips splits for intervals', () => {
    const tempo = { type: 'tempo', title: 'Tempo 6 km', distanceKm: 6, paceRange: [300, 310] }
    expect(notes({ activity: activity(track([360, 305, 300, 304, 330, 360])), planned: tempo }).find((n) => n.kind === 'plan').text).toMatch(/quickest km was 5:00, right on tempo pace/)
    expect(notes({ activity: activity(track([360, 340, 345, 350, 360, 360])), planned: tempo }).find((n) => n.kind === 'plan').text).toMatch(/Tempo pace comes with time/)
    const intervals = { type: 'intervals', title: 'Intervals 5 x 800 m', distanceKm: 6, paceRange: [280, 290] }
    const ns = notes({ activity: activity(track([360, 290, 380, 285, 360, 360])), planned: intervals })
    expect(ns.find((n) => n.kind === 'plan').text).toMatch(/right on intervals pace/)
    expect(kinds(ns)).not.toContain('split')
  })
  it('handles race day and run/walk sessions', () => {
    const race = { type: 'race', title: 'Race day: 5K', distanceKm: 5, paceRange: [300, 309] }
    expect(notes({ activity: activity(track([300, 300, 300, 300, 300])), planned: race }).find((n) => n.kind === 'plan').text).toMatch(/Well done on getting to the start line/)
    const rw = { type: 'easy', runWalk: true, title: 'Run/walk 20 min', distanceKm: 3, paceRange: [420, 460] }
    const plan = notes({ activity: activity(track([300, 300, 300])), planned: rw }).find((n) => n.kind === 'plan')
    expect(plan.text).not.toMatch(/pace/)
    expect(plan.fast).toBe(false)
  })
  it('ignores a plan for walks and rides', () => {
    expect(kinds(notes({ activity: activity(track([600, 600, 600]), { mode: 'walk' }), planned: easy }))).not.toContain('plan')
  })
})

describe('splits', () => {
  const split = (s) => notes({ activity: activity(track(s)) }).find((n) => n.kind === 'split')
  it('spots negative, even and positive splits', () => {
    expect(split([360, 355, 345, 335]).split).toBe('negative')
    expect(split([340, 342, 338, 341]).split).toBe('even')
    const pos = split([320, 330, 370, 380])
    expect(pos.split).toBe('positive')
    expect(pos.text).toMatch(/about 15% slower/)
    expect(notes({ activity: activity(track([320, 330, 370, 380])) }).at(-1).text).toMatch(/first km 10 to 15 seconds slower/)
  })
  it('needs three full kilometres', () => {
    expect(split([300, 400])).toBeUndefined()
    expect(kmSplits(track([300, 310]))).toEqual([300, 310])
  })
})

describe('heart rate and cadence', () => {
  const body = (o) => notes({ activity: activity(o.pts, o.extra) }).find((n) => n.kind === 'body')
  it('says nothing without watch data', () => {
    expect(body({ pts: track([340, 340, 340]) })).toBeUndefined()
  })
  it('notes steady heart rate and a good rhythm', () => {
    const b = body({ pts: track([340, 340, 340], { hr: 145, cad: 172 }) })
    expect(b.text).toBe('Your heart rate averaged 145 bpm and stayed steady. Cadence averaged 172 steps per minute, a good rhythm.')
    expect(b.drift).toBe(false)
  })
  it('notes heart rate drift and a low cadence kindly', () => {
    const b = body({ pts: track([340, 340, 340, 340], { hr: (k) => 135 + k * 10, cad: 148 }) })
    expect(b.drift).toBe(true)
    expect(b.text).toMatch(/crept up about \d+% in the second half/)
    expect(b.text).toMatch(/Cadence averaged 148 steps per minute\. Slightly shorter, quicker steps/)
    expect(notes({ activity: activity(track([340, 340, 340, 340], { hr: (k) => 135 + k * 10 })) }).at(-1).text).toMatch(/start a little slower/)
  })
  it('leaves cadence out for rides', () => {
    const b = body({ pts: track([120, 120, 120], { hr: 130, cad: 85 }), extra: { mode: 'ride' } })
    expect(b.text).not.toMatch(/Cadence/)
  })
})

describe('load this week', () => {
  const week = (km, daysAgo) => ({ id: `r${daysAgo}`, mode: 'run', startedAt: NOW - daysAgo * DAY, distanceM: km * 1000 })
  const usual = [8, 9, 15, 16, 22, 23, 29, 30].map((d) => week(5, d)) // about 10 km a week
  it('warns when the week is well above usual and puts that first in next time', () => {
    const recent = [...usual, week(6, 1), week(6, 2)]
    const ns = notes({ activity: activity(track(Array(5).fill(340))), recent })
    const load = ns.find((n) => n.kind === 'load')
    expect(load.level).toBe('high')
    expect(load.text).toMatch(/17 km this week, about 70% above your usual 10 km/)
    expect(ns.at(-1).text).toMatch(/keep it short and easy, or take a rest day/)
  })
  it('says the week is in line when it is, and only if there is room', () => {
    const ns = notes({ activity: activity(track([340, 340, 340])), recent: usual })
    expect(ns.find((n) => n.kind === 'load').text).toMatch(/in line with your usual 10 km/)
    const busy = notes({ activity: activity(track([340, 350, 380, 400], { hr: 140 })), recent: usual, planned: easy })
    expect(kinds(busy)).not.toContain('load')
  })
  it('counts this activity once even when recent already has it', () => {
    const a = activity(track([340, 340, 340]))
    const ns = notes({ activity: a, recent: [...usual, a] })
    expect(ns.find((n) => n.kind === 'load').text).toMatch(/^That makes 3 km this week/)
  })
  it('uses a gentle cap for new runners', () => {
    const ns = notes({ activity: activity(track(Array(10).fill(340))), recent: [] })
    expect(ns.find((n) => n.kind === 'load').text).toMatch(/big week for where you're at/)
    expect(kinds(notes({ activity: activity(track([340, 340, 340])), recent: [] }))).not.toContain('load')
  })
})

describe('ground', () => {
  const ground = (o) => notes({ activity: activity(track([340, 340]), o.a), result: o.result }).find((n) => n.kind === 'territory').text
  it('highlights hexes taken from a rival', () => {
    const result = { diff: { claimed: ['a'], reinforced: [], taken: [{ h3: 'b' }, { h3: 'c' }] }, battles: [{ defenderName: 'Sam' }] }
    expect(ground({ result })).toBe('You took 2 hexes from Sam. Another run through them this week keeps them yours.')
  })
  it('covers new, strengthened and no loop, from the result or the saved activity', () => {
    expect(ground({ result: { diff: { claimed: ['a', 'b'], reinforced: [], taken: [] } } })).toMatch(/added 2 new hexes/)
    expect(ground({ a: { claimed: 1 } })).toMatch(/added 1 new hex to/)
    expect(ground({ a: { reinforced: 4 } })).toMatch(/strengthened 4 hexes/)
    expect(ground({ a: {} })).toMatch(/pushes into new streets/)
    expect(ground({ a: { loops: 0 } })).toMatch(/No loop this time/)
    expect(notes({ activity: activity(track([340, 340]), { loops: 0 }) }).at(-1).text).toMatch(/within 30 m of where you started/)
    expect(notes({ activity: activity(track([340, 340])) }).at(-1).text).toMatch(/loop next door/)
  })
})

describe('plannedFor', () => {
  const plan = { weeks: [{ sessions: [
    { id: 's1', date: '2026-11-01', type: 'strength', status: 'planned' },
    { id: 's2', date: '2026-11-01', type: 'easy', status: 'planned' },
    { id: 's3', date: '2026-11-02', type: 'long', status: 'planned' },
    { id: 's4', date: '2026-10-31', type: 'tempo', status: 'done', actual: { activityId: 'x9' } },
  ] }] }
  it('finds the run planned for the day the activity started', () => {
    const noon = (d) => new Date(2026, 10, d, 12).getTime() // local time, like the app
    expect(plannedFor(plan, { id: 'a', startedAt: noon(1) }).id).toBe('s2')
    expect(plannedFor(plan, { id: 'x9', startedAt: noon(1) - DAY }).id).toBe('s4')
    expect(plannedFor(plan, { id: 'a', startedAt: noon(1) - 5 * DAY })).toBeNull()
    expect(plannedFor(null, { id: 'a', startedAt: NOW })).toBeNull()
  })
})
