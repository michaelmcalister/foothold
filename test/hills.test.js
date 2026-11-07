// King of the hill rules (src/lib/engine/hills.js): finding climbs, matching and snapping hills, passes over known hills, the holder and the glow.
import { describe, it, expect } from 'vitest'
import {
  findClimbs, hillKey, matchHill, findEfforts, detectHills, bestPerUser, holderOf, hillBoard, holderAfter,
  hillTime, hillTakenText, hillGlow, hillName, HILL,
} from '../src/lib/engine/hills.js'
import { withDistance, sampleByDistance } from '../src/lib/runStats.js'
import { offset, distance } from '../src/lib/engine/geo.js'
import { RES } from '../src/lib/engine/territory.js'
import { getResolution } from 'h3-js'

const ORIGIN = { lat: -33.9, lng: 151.15 }

// A straight track north, `mps` metres a second, one point a second
function northTrack(lengthM, { mps = 3, start = ORIGIN, t0 = 1_700_000_000_000 } = {}) {
  const pts = []
  for (let k = 0; k * mps <= lengthM; k++) pts.push({ ...offset(start, 0, k * mps), t: t0 + k * 1000 })
  return pts
}
// Samples about every 20 m along it, with heights from `height(metres along)`
function sampled(track, height) {
  const pts = withDistance(track)
  const samples = sampleByDistance(pts, Math.round(pts[pts.length - 1].d / 20) + 1)
  return { samples, alts: samples.map((s) => height(s.d)) }
}
// Flat for `flat` metres, then a steady grade for `len`, then flat
const ramp = (flat, len, grade, base = 50) => (d) => base + Math.max(0, Math.min(len, d - flat)) * grade

describe('findClimbs', () => {
  it('finds nothing on flat ground', () => {
    const { samples, alts } = sampled(northTrack(1500), () => 42)
    expect(findClimbs(samples, alts)).toEqual([])
  })

  it('finds one clear climb with its gain, length, grade and time', () => {
    const { samples, alts } = sampled(northTrack(1000), ramp(300, 400, 0.08))
    const climbs = findClimbs(samples, alts)
    expect(climbs).toHaveLength(1)
    const c = climbs[0]
    expect(c.gainM).toBeGreaterThanOrEqual(30)
    expect(c.gainM).toBeLessThanOrEqual(32)
    expect(c.lengthM).toBeGreaterThan(360)
    expect(c.lengthM).toBeLessThan(420)
    expect(c.grade).toBeCloseTo(0.08, 2)
    // 3 m a second over about 400 m
    expect(c.seconds).toBeGreaterThan(120)
    expect(c.seconds).toBeLessThan(140)
    expect(samples[c.start].d).toBeGreaterThan(280)
  })

  it('rides through a small dip, but a big drop splits the climb', () => {
    const dip = (size) => (d) => ramp(200, 600, 0.06)(d) - (d > 480 && d < 540 ? size : 0)
    const small = sampled(northTrack(1000), dip(2))
    expect(findClimbs(small.samples, small.alts)).toHaveLength(1)
    expect(findClimbs(small.samples, small.alts)[0].gainM).toBeGreaterThanOrEqual(34)
    const big = sampled(northTrack(1000), dip(8))
    const parts = findClimbs(big.samples, big.alts)
    expect(parts.length).toBeGreaterThanOrEqual(1)
    expect(parts.every((c) => c.gainM < 34)).toBe(true)
  })

  it('ignores a short steep pitch and a long gentle drag', () => {
    const pitch = sampled(northTrack(800), ramp(300, 150, 0.15))
    expect(findClimbs(pitch.samples, pitch.alts)).toEqual([])
    const drag = sampled(northTrack(1500), ramp(200, 900, 0.03))
    expect(findClimbs(drag.samples, drag.alts)).toEqual([])
    const small = sampled(northTrack(1000), ramp(300, 300, 0.05)) // 15 m: under 20 m
    expect(findClimbs(small.samples, small.alts)).toEqual([])
  })

  it('treats missing heights as a break, and has no time without timestamps', () => {
    const { samples, alts } = sampled(northTrack(1000), ramp(300, 400, 0.08))
    const gappy = alts.map((a, i) => (i === 25 ? null : a))
    expect(findClimbs(samples, gappy).every((c) => c.gainM < 30)).toBe(true)
    const untimed = samples.map((s) => ({ ...s, t: null }))
    expect(findClimbs(untimed, alts)[0].seconds).toBeNull()
  })
})

describe('hill identity', () => {
  const start = offset(ORIGIN, 0, 300)
  const end = offset(ORIGIN, 0, 700)
  const hill = { id: 'h1', mode: 'run', key: hillKey(start, end, 'run'), start, end, lengthM: 400, line: [] }

  it('keys by coarse start and end hexes, per mode', () => {
    const key = hillKey(start, end, 'run')
    const [mode, cells] = key.split(':')
    expect(mode).toBe('run')
    expect(cells.split('>').map(getResolution)).toEqual([HILL.res, HILL.res])
    expect(HILL.res).toBeLessThan(RES)
    expect(hillKey(start, end, 'ride')).not.toBe(key)
  })

  it('snaps a climb whose ends are within about 60 m', () => {
    const climb = { startPt: offset(start, 30, -25), endPt: offset(end, -20, 35), lengthM: 410 }
    expect(matchHill(climb, [hill], 'run')).toBe(hill)
    expect(matchHill(climb, [hill], 'walk')).toBeNull()
  })

  it('does not snap a different climb nearby', () => {
    const climb = { startPt: offset(start, 150, 0), endPt: offset(end, 150, 0), lengthM: 400 }
    expect(matchHill(climb, [hill], 'run')).toBeNull()
    // Only the top half: same end, start far away
    expect(matchHill({ startPt: offset(start, 0, 200), endPt: end, lengthM: 200 }, [hill], 'run')).toBeNull()
  })

  it('names hills by height when there is no street to hand', () => {
    expect(hillName({ gainM: 31.6 })).toBe('The 32 m climb')
    expect(hillName({ gainM: 30, place: 'Jamison Rd' })).toBe('The climb on Jamison Rd')
  })
})

describe('passes over known hills', () => {
  const line = [[ORIGIN.lng, offset(ORIGIN, 0, 300).lat], [ORIGIN.lng, offset(ORIGIN, 0, 500).lat], [ORIGIN.lng, offset(ORIGIN, 0, 700).lat]]
  const hill = { id: 'h1', mode: 'run', start: offset(ORIGIN, 0, 300), end: offset(ORIGIN, 0, 700), lengthM: 400, line }

  it('times a pass from start to end, without heights', () => {
    const { samples } = sampled(northTrack(1000, { mps: 4 }), () => 0)
    const [e] = findEfforts(samples, [hill], 'run')
    expect(e.hillId).toBe('h1')
    expect(e.seconds).toBeGreaterThan(90)
    expect(e.seconds).toBeLessThan(110)
  })

  it('does not count going down it, or a short cut', () => {
    const down = sampled(northTrack(1000, { start: offset(ORIGIN, 0, 1000) }).map((p, i, all) => ({ ...all[all.length - 1 - i], t: p.t })), () => 0)
    expect(findEfforts(down.samples, [hill], 'run')).toEqual([])
    // Out east and back in: covers more than a quarter extra
    const pts = []
    let t = 0
    const leg = (a, b, n) => { for (let k = 0; k < n; k++) pts.push({ ...offset(ORIGIN, a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n), t: (t += 1000) }) }
    leg([0, 0], [0, 300], 100); leg([0, 300], [300, 500], 120); leg([300, 500], [0, 700], 120); leg([0, 700], [0, 900], 60)
    const detour = sampled(pts, () => 0)
    expect(findEfforts(detour.samples, [hill], 'run')).toEqual([])
  })

  it('detectHills counts a known hill instead of making it again', () => {
    const { samples, alts } = sampled(northTrack(1000), ramp(300, 400, 0.08))
    const out = detectHills({ samples, alts, hills: [hill], mode: 'run' })
    expect(out.created).toEqual([])
    expect(out.efforts).toHaveLength(1)
    expect(out.efforts[0].hillId).toBe('h1')
  })

  it('detectHills makes a new hill with a simplified line and a profile', () => {
    const { samples, alts } = sampled(northTrack(1000), ramp(300, 400, 0.08))
    const out = detectHills({ samples, alts, hills: [], mode: 'walk' })
    expect(out.created).toHaveLength(1)
    const h = out.created[0]
    expect(h).toMatchObject({ mode: 'walk', name: expect.stringMatching(/^The 3\d m climb$/) })
    expect(h.line.length).toBeLessThanOrEqual(HILL.maxLinePoints)
    expect(h.line.length).toBeGreaterThanOrEqual(2) // a straight climb simplifies to its ends
    expect(h.profile[0][0]).toBe(0)
    expect(h.profile[h.profile.length - 1][1] - h.profile[0][1]).toBeGreaterThan(29)
    expect(out.efforts).toEqual([expect.objectContaining({ hillId: 'new:0' })])
    // Without heights nothing new is made
    expect(detectHills({ samples, alts: null, hills: [], mode: 'walk' })).toEqual({ created: [], efforts: [] })
  })

  it('keeps climbs that start or end in a privacy zone off the map', () => {
    const { samples, alts } = sampled(northTrack(1000), ramp(300, 400, 0.08))
    const zones = [{ ...offset(ORIGIN, 0, 250), radiusM: 200 }]
    expect(detectHills({ samples, alts, hills: [], mode: 'run', zones })).toEqual({ created: [], efforts: [] })
    expect(detectHills({ samples, alts, hills: [hill], mode: 'run', zones }).efforts).toEqual([])
  })
})

describe('the holder', () => {
  const efforts = [
    { userId: 'a', seconds: 120, createdAt: 1 },
    { userId: 'b', seconds: 110, createdAt: 2 },
    { userId: 'a', seconds: 105, createdAt: 3 },
    { userId: 'c', seconds: 105, createdAt: 4 },
    { userId: 'd', seconds: 140, createdAt: 5 },
  ]
  it('keeps each person’s best, fastest first, and the first to a tied time leads', () => {
    expect(bestPerUser(efforts).map((u) => [u.userId, u.seconds, u.rank])).toEqual([['a', 105, 1], ['c', 105, 2], ['b', 110, 3], ['d', 140, 4]])
    expect(holderOf(efforts)).toEqual({ userId: 'a', seconds: 105 })
    expect(holderOf([])).toBeNull()
  })

  it('builds a board of the top n plus your own row', () => {
    const b = hillBoard(efforts, 'd', 2)
    expect(b.top.map((u) => u.userId)).toEqual(['a', 'c'])
    expect(b.mine).toMatchObject({ userId: 'd', rank: 4, seconds: 140 })
    expect(hillBoard(efforts, 'nobody').mine).toBeNull()
  })

  it('moves the crown only on a faster time, and falls back when the holder goes', () => {
    expect(holderAfter({ holderUser: null }, 'a', 200)).toEqual({ holder: { userId: 'a', seconds: 200 }, tookCrown: true, from: null })
    expect(holderAfter({ holderUser: 'a', holderS: 105 }, 'b', 104)).toEqual({ holder: { userId: 'b', seconds: 104 }, tookCrown: true, from: 'a' })
    expect(holderAfter({ holderUser: 'a', holderS: 105 }, 'b', 105).tookCrown).toBe(false)
    expect(holderAfter({ holderUser: 'a', holderS: 105 }, 'a', 100)).toEqual({ holder: { userId: 'a', seconds: 100 }, tookCrown: false, from: null })
    // a leaves: the next best holds it
    expect(holderOf(efforts.filter((e) => e.userId !== 'a'))).toEqual({ userId: 'c', seconds: 105 })
  })

  it('tells the old holder kindly, with the time to beat', () => {
    expect(hillTime(102)).toBe('1:42')
    expect(hillTime(3725)).toBe('1:02:05')
    const text = hillTakenText('The 32 m climb', 'Sam', 102)
    expect(text).toBe('Sam took the hill on the 32 m climb. Your time to beat: 1:42. Fancy another go?')
    expect(text).not.toMatch(/[–—]|--/)
  })
})

describe('the glow', () => {
  it('lights territory hexes within about 80 m of the line, and no others', () => {
    const a = offset(ORIGIN, 0, 300)
    const b = offset(ORIGIN, 0, 700)
    const line = [[a.lng, a.lat], [b.lng, b.lat]]
    const hexes = hillGlow(line)
    expect(hexes.length).toBeGreaterThan(4)
    expect(hexes.every((h) => getResolution(h) === RES)).toBe(true)
    expect(hillGlow([])).toEqual([])
    const far = offset(ORIGIN, 400, 500)
    expect(distance(far, a)).toBeGreaterThan(300)
  })
})
