// Tests for personal bests (engine/bests.js) and stronghold matching and
// crowns (engine/strongholds.js), using the real Penrith area pack loops.
import { describe, it, expect } from 'vitest'
import {
  bestEfforts, mergeBests, rebuildBests, bestsList, bestMessage, continuousPieces,
  prepareStronghold, matchStronghold, strongholdsRun, standings, crownStatus, crownMessage, decodePolyline, samplePath,
  offset, distance, pathLength,
} from '../src/lib/engine/index.js'
import { LOOPS, decode } from '../src/lib/api/areas/penrith.js'
import { routeTrack, loopTrack } from '../src/lib/tracks.js'

const DAY = 86400000
const ORIGIN = { lat: -33.75, lng: 150.69 }

// A straight line east at a steady speed, one fix a second
function straight(m, kmh, { start = ORIGIN, t0 = 1_700_000_000_000 } = {}) {
  const v = kmh / 3.6
  const pts = []
  for (let s = 0; s * v <= m; s++) pts.push({ ...offset(start, s * v, 0), t: t0 + s * 1000 })
  return pts
}

describe('best efforts', () => {
  it('finds the fastest continuous stretches', () => {
    // 2 km easy at 10 km/h, then 6 km at 12 km/h
    const a = straight(2000, 10)
    const last = a[a.length - 1]
    const b = straight(6000, 12, { start: last, t0: last.t + 1000 }).slice(1)
    const b2 = bestEfforts([...a, ...b], 'run')
    expect(b2['1k']).toBeCloseTo(300, 0)
    expect(b2['5k']).toBeCloseTo(1500, 0)
    expect(b2['400m']).toBeCloseTo(120, 0)
    expect(b2.mile).toBeCloseTo(482.8, 0)
    expect(b2['10k']).toBeUndefined()
  })
  it('ignores GPS jumps and car speeds', () => {
    const a = straight(3000, 10)
    const last = a[a.length - 1]
    // a 2 km teleport in one second, then more running
    const jumped = { ...offset(last, 2000, 0), t: last.t + 1000 }
    const b = straight(3000, 10, { start: jumped, t0: jumped.t + 1000 })
    const pieces = continuousPieces([...a, jumped, ...b], 'run')
    expect(pieces.length).toBe(2)
    const best = bestEfforts([...a, jumped, ...b], 'run')
    expect(best['5k']).toBeUndefined() // no 5 km without the jump
    expect(best['1k']).toBeCloseTo(360, 0)
    // 40 km/h for 2 km is a car, not a run
    expect(bestEfforts(straight(2000, 40), 'run')['1k']).toBeUndefined()
  })
  it('keeps ride records and the longest ride', () => {
    const b = bestEfforts(straight(25000, 30), 'ride')
    expect(b['10k']).toBeCloseTo(1200, 0)
    expect(b['20k']).toBeCloseTo(2400, 0)
    expect(b['40k']).toBeUndefined()
    expect(b.longest).toBeGreaterThan(24900)
  })
  it('merges into records and says what improved', () => {
    let { records, improved } = mergeBests({}, { '1k': 300, '5k': 1500 }, 'run', { activityId: 'a1', at: 1 })
    expect(improved.map((i) => i.key)).toEqual(['1k', '5k'])
    expect(improved[1].prev).toBeNull()
    ;({ records, improved } = mergeBests(records, { '1k': 310, '5k': 1471 }, 'run', { activityId: 'a2', at: 2 }))
    expect(improved).toEqual([{ key: '5k', label: '5K', kind: 'time', value: 1471, prev: 1500 }])
    expect(records['1k'].activityId).toBe('a1')
    expect(bestMessage(improved[0])).toBe('New best 5K: 24:31, 29 seconds faster')
    expect(bestMessage({ key: '10k', label: '10K', kind: 'time', value: 3125, prev: 3200 })).toBe('New best 10K: 52:05, 1 minute 15 seconds faster')
    expect(bestMessage({ key: 'longest', label: 'Longest ride', kind: 'dist', value: 42300, prev: 37200 })).toBe('New longest ride: 42.3 km, 5.1 km further')
    expect(bestsList(records, 'run').map((r) => r.key)).toEqual(['1k', '5k'])
    const rebuilt = rebuildBests([{ id: 'a1', startedAt: 1, bests: { '1k': 300, '5k': 1500 } }], 'run')
    expect(rebuilt['5k']).toEqual({ value: 1500, activityId: 'a1', at: 1 })
  })
  it('never uses dashes in messages', () => {
    for (const m of [bestMessage({ label: '5K', kind: 'time', value: 100, prev: null }), bestMessage({ label: 'Longest ride', kind: 'dist', value: 5000, prev: null })]) {
      expect(m).not.toMatch(/[–—]|--/)
    }
  })
})

describe('strongholds', () => {
  const shs = LOOPS.map((l) => prepareStronghold({ id: l.id, name: l.name, line: l.line }))
  const regatta = shs.find((s) => s.id === 'regatta')

  it('decodes the same polylines as the area pack and samples every 25 m', () => {
    expect(decodePolyline(LOOPS[1].line)).toEqual(decode(LOOPS[1].line))
    const route = decode(LOOPS[1].line)
    const s = samplePath(route)
    expect(s.length).toBeGreaterThan(pathLength(route) / 25 - 2)
    expect(regatta.closed).toBe(true)
  })

  it('matches every Penrith loop run either way round', () => {
    for (const sh of shs) {
      for (const reverse of [false, true]) {
        const track = routeTrack(sh.route, { kmh: 11, seed: 7, reverse, startAt: 1_700_000_000_000 })
        const m = matchStronghold(track, sh)
        expect(m, `${sh.id} reverse=${reverse}`).not.toBeNull()
        const expected = (sh.distanceM / (11 / 3.6))
        expect(Math.abs(m.elapsedS - expected) / expected).toBeLessThan(0.12)
      }
    }
  })

  it('matches a run that joins a loop part way round and leaves again', () => {
    const r = regatta.route
    // Start 1 km away, run in, do a lap starting at a middle point, run off
    const mid = Math.floor(r.length / 2)
    const lap = [...r.slice(mid), ...r.slice(1, mid + 1)]
    const lead = [offset(lap[0], -800, -600), lap[0]]
    const tail = [lap[lap.length - 1], offset(lap[lap.length - 1], 500, 500)]
    const track = routeTrack([...lead, ...lap.slice(1), ...tail.slice(1)], { kmh: 10, seed: 3 })
    expect(matchStronghold(track, regatta)).not.toBeNull()
  })

  it('does not match half a loop or a run somewhere else', () => {
    const r = regatta.route
    const half = routeTrack(r.slice(0, Math.floor(r.length * 0.6)), { kmh: 11, seed: 2 })
    expect(matchStronghold(half, regatta)).toBeNull()
    const elsewhere = loopTrack({ centre: regatta.start, perimeterKm: 5, seed: 4 })
    expect(strongholdsRun(elsewhere, shs)).toEqual([])
    // Same shape 200 m to the north is not the same route
    const shifted = routeTrack(r.map((p) => offset(p, 0, 200)), { kmh: 11, seed: 2 })
    expect(matchStronghold(shifted, regatta)).toBeNull()
  })

  it('finds only the strongholds the track ran', () => {
    const track = routeTrack(regatta.route, { kmh: 11, seed: 9 })
    expect(strongholdsRun(track, shs).map((x) => x.strongholdId)).toEqual(['regatta'])
  })

  it('gives the crown to most efforts in 90 days, ties to the most recent', () => {
    const now = 100 * DAY
    const efforts = [
      { userId: 'tom', at: now - 2 * DAY, elapsedS: 1900 },
      { userId: 'tom', at: now - 5 * DAY, elapsedS: 1950 },
      { userId: 'tom', at: now - 9 * DAY, elapsedS: 1850 },
      { userId: 'tom', at: now - 95 * DAY, elapsedS: 1500 }, // too old for the crown, still his best time
      { userId: 'me', at: now - 1 * DAY, elapsedS: 1700 },
    ]
    const st = standings(efforts, now)
    expect(st.holder).toMatchObject({ userId: 'tom', efforts: 3 })
    expect(st.byTime[0]).toMatchObject({ userId: 'tom', bestS: 1500 })
    const me = crownStatus(efforts, 'me', now)
    expect(me).toMatchObject({ mine: 1, holds: false, toCrown: 2 })
    expect(crownMessage({ name: 'Regatta Centre lap', elapsedS: 1700, efforts: 1, holds: false, holderName: 'Tom', toCrown: 2 }))
      .toBe("You ran the Regatta Centre lap in 28:20. That's your first effort in 90 days. 2 more to take the crown from Tom.")
    // Two more efforts: level on three, and mine is the latest
    const more = [...efforts, { userId: 'me', at: now - 0.5 * DAY, elapsedS: 1720 }, { userId: 'me', at: now, elapsedS: 1690 }]
    const after = crownStatus(more, 'me', now)
    expect(after).toMatchObject({ mine: 3, holds: true, toCrown: 0 })
    expect(crownMessage({ name: 'Regatta Centre lap', elapsedS: 1690, efforts: 3, holds: true, tookFrom: 'Tom' })).toMatch(/You took the crown from Tom\.$/)
  })
})
