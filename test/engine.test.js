// Engine tests: loop detection, claims, fading, battles, anti-cheat, load.
import { describe, it, expect } from 'vitest'
import {
  offset, summarise, findLoops, cellsForLoops, effortGain, applyClaim, currentStrength,
  checkActivity, loadCheck, processActivity, openBattles, battleScore, levelFor, daysUntilWild,
} from '../src/lib/engine/index.js'

const ORIGIN = { lat: -33.9, lng: 151.15 } // inner west Sydney
const DAY = 86400000

// A rectangular loop of w x h metres at a given speed, one point a second.
function rectRun({ w = 600, h = 400, kmh = 11, start = ORIGIN, t0 = Date.UTC(2026, 10, 1, 20), closeGap = 0 } = {}) {
  const corners = [[0, 0], [w, 0], [w, h], [0, h], [0, closeGap]]
  const mps = kmh / 3.6
  const pts = []
  let t = t0
  for (let c = 0; c < corners.length - 1; c++) {
    const [x0, y0] = corners[c]
    const [x1, y1] = corners[c + 1]
    const len = Math.hypot(x1 - x0, y1 - y0)
    const n = Math.max(1, Math.round(len / mps))
    for (let k = 0; k < n; k++) {
      const f = k / n
      pts.push({ ...offset(start, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f), t })
      t += 1000
    }
  }
  pts.push({ ...offset(start, 0, closeGap), t })
  return pts
}

function outAndBack(km = 3, kmh = 11) {
  const mps = kmh / 3.6
  const pts = []
  let t = Date.UTC(2026, 10, 1, 20)
  const n = Math.round((km * 500) / mps)
  for (let k = 0; k <= n; k++) { pts.push({ ...offset(ORIGIN, k * mps, 0), t }); t += 1000 }
  for (let k = n; k >= 0; k--) { pts.push({ ...offset(ORIGIN, k * mps, 15), t }); t += 1000 }
  return pts
}

describe('loops', () => {
  it('finds one loop in a block run', () => {
    const loops = findLoops(rectRun())
    expect(loops).toHaveLength(1)
    expect(loops[0].areaM2).toBeGreaterThan(200000)
    expect(loops[0].areaM2).toBeLessThan(260000)
  })
  it('closes a loop that finishes within 30 m of the start', () => {
    expect(findLoops(rectRun({ closeGap: 25 }))).toHaveLength(1)
  })
  it('does not count an out-and-back on the same street as a loop', () => {
    expect(findLoops(outAndBack())).toHaveLength(0)
  })
  it('summarises distance and pace', () => {
    const s = summarise(rectRun({ kmh: 12 }))
    expect(s.distanceM).toBeGreaterThan(1950)
    expect(s.distanceM).toBeLessThan(2050)
    expect(s.paceSPerKm).toBeGreaterThan(280)
    expect(s.paceSPerKm).toBeLessThan(320)
  })
})

describe('claims', () => {
  const loops = findLoops(rectRun())
  const targets = cellsForLoops(loops)

  it('claims the hexes inside a loop', () => {
    expect(targets.length).toBeGreaterThan(10)
    const { diff } = applyClaim(new Map(), targets, 'me', 20)
    expect(diff.claimed).toHaveLength(targets.length)
  })

  it('makes long efforts worth more than short strolls', () => {
    expect(effortGain({ distanceM: 15000, movingS: 4800, mode: 'run' })).toBeGreaterThan(effortGain({ distanceM: 2000, movingS: 1500, mode: 'walk' }) * 2)
  })

  it('lets a strong claim take ground but not a weak one', () => {
    const now = Date.now()
    const { updated } = applyClaim(new Map(), targets, 'rival', 45, { now })
    const weak = applyClaim(updated, targets, 'me', 15, { now })
    expect(weak.diff.taken).toHaveLength(0)
    expect(weak.diff.held.length).toBe(targets.length)
    const strong = applyClaim(updated, targets, 'me', 50, { now })
    expect(strong.diff.taken.length).toBe(targets.length)
    expect(strong.diff.taken[0].from).toBe('rival')
  })

  it('builds strength with repeat visits, with diminishing returns', () => {
    const now = Date.now()
    let cells = new Map()
    const gains = []
    for (let i = 0; i < 4; i++) {
      const before = currentStrength(cells.get(targets[0]), now)
      cells = new Map([...cells, ...applyClaim(cells, targets, 'me', 20, { now }).updated])
      gains.push(currentStrength(cells.get(targets[0]), now) - before)
    }
    expect(gains[1]).toBeLessThan(gains[0])
    expect(gains[3]).toBeLessThan(gains[1])
  })

  it('fades ground after two weeks, and turns it wild', () => {
    const t0 = Date.now()
    const { updated } = applyClaim(new Map(), targets, 'me', 30, { now: t0 })
    const c = updated.get(targets[0])
    expect(currentStrength(c, t0 + 10 * DAY)).toBe(30)
    expect(currentStrength(c, t0 + 35 * DAY)).toBeCloseTo(15, 0)
    expect(currentStrength(c, t0 + 200 * DAY)).toBe(0)
    expect(daysUntilWild(c, t0)).toBeGreaterThan(60)
  })

  it('opens a battle when ground is taken, and scores it', () => {
    const now = Date.now()
    const base = applyClaim(new Map(), targets, 'rival', 20, { now }).updated
    const res = applyClaim(base, targets, 'me', 40, { now })
    const battles = openBattles(res.diff, 'me', { now })
    expect(battles).toHaveLength(1)
    const merged = new Map([...base, ...res.updated])
    expect(battleScore(battles[0], merged, now).leader).toBe('me')
  })

  it('climbs the ladder', () => {
    expect(levelFor(0).level).toBeNull()
    expect(levelFor(30).level.id).toBe('foothold')
    expect(levelFor(80).level.id).toBe('outpost')
    expect(levelFor(80).toNext).toBe(170)
  })
})

describe('anti-cheat', () => {
  it('passes a normal run', () => {
    const r = checkActivity(rectRun({ kmh: 12 }), 'run')
    expect(r.ok).toBe(true)
    expect(r.flags).toHaveLength(0)
  })
  it('rejects a drive logged as a run, with a reason', () => {
    const r = checkActivity(rectRun({ kmh: 50 }), 'run')
    expect(r.rejected).toBe(true)
    expect(r.reason).toMatch(/vehicle/)
  })
  it('cuts out a GPS jump but keeps the rest', () => {
    const pts = rectRun({ kmh: 11 })
    pts[300] = { ...offset(pts[300], 2000, 0), t: pts[300].t }
    const r = checkActivity(pts, 'run')
    expect(r.ok).toBe(true)
    expect(r.flags.some((f) => f.type === 'jump' || f.type === 'burst')).toBe(true)
    expect(r.cleaned.length).toBeLessThan(pts.length)
  })
  it('allows ride speeds on the ride map', () => {
    expect(checkActivity(rectRun({ kmh: 30 }), 'ride').ok).toBe(true)
  })
})

describe('load guardrail', () => {
  const now = Date.now()
  const week = (w, km) => ({ startedAt: now - w * 7 * DAY - DAY, distanceM: km * 1000, mode: 'run' })
  const history = [week(1, 20), week(2, 20), week(3, 20), week(4, 20)]
  it('is fine for a normal week', () => {
    expect(loadCheck(history, 21, now).level).toBe('ok')
  })
  it('warns when a week jumps by more than half', () => {
    expect(loadCheck(history, 32, now).level).toBe('high')
  })
})

describe('processActivity', () => {
  it('runs the whole pipeline', () => {
    const res = processActivity({ id: 'a1', userId: 'me', mode: 'run', points: rectRun() }, { cells: new Map(), zones: [], battles: [] })
    expect(res.activity.rejected).toBe(false)
    expect(res.activity.loops).toBe(1)
    expect(res.activity.claimed).toBeGreaterThan(10)
  })
  it('hides the start of a run inside a privacy zone', () => {
    const res = processActivity({ id: 'a2', userId: 'me', points: rectRun() }, { cells: new Map(), zones: [{ ...ORIGIN, radiusM: 100 }], battles: [] })
    expect(res.publicTrack.length).toBeLessThan(res.track.length)
  })
})
