// Tests for the recorder's gap joining (src/lib/recorder.js).
import { describe, it, expect } from 'vitest'
import { bridgeGaps } from '../src/lib/recorder.js'
import { offset, distance } from '../src/lib/engine/geo.js'
import { findLoops } from '../src/lib/engine/index.js'

const C = { lat: -33.75, lng: 150.69 }

describe('joining GPS gaps', () => {
  it('fills a long quiet stretch with evenly timed points', () => {
    const a = { ...C, t: 0 }
    const b = { ...offset(C, 300, 0), t: 240000 }
    const out = bridgeGaps([a, b])
    expect(out.length).toBeGreaterThan(25)
    for (let i = 1; i < out.length; i++) {
      expect(distance(out[i - 1], out[i])).toBeLessThanOrEqual(10.5)
      expect(out[i].t).toBeGreaterThan(out[i - 1].t)
    }
    expect(out[0]).toBe(a)
    expect(out[out.length - 1]).toBe(b)
  })

  it('leaves a GPS jump alone (too quick to be a gap you walked)', () => {
    const a = { ...C, t: 0 }
    const b = { ...offset(C, 800, 0), t: 20000 } // 40 m a second
    expect(bridgeGaps([a, b], { mode: 'walk' })).toHaveLength(2)
  })

  it('leaves a normal track alone', () => {
    const pts = Array.from({ length: 30 }, (_, i) => ({ ...offset(C, i * 8, 0), t: i * 3000 }))
    expect(bridgeGaps(pts)).toEqual(pts)
  })

  it('turns a lap of a lake with only a few fixes into a loop that counts', () => {
    // About 1 km round, but only 6 fixes came through (the screen was off)
    const corners = [[0, 0], [250, 0], [250, 250], [0, 250], [-5, 120], [3, 4]]
    const pts = corners.map(([e, n], i) => ({ ...offset(C, e, n), t: i * 150000 }))
    const out = bridgeGaps(pts)
    expect(out.length).toBeGreaterThan(80)
    expect(findLoops(out).length).toBe(1)
  })
})

describe('testing from a pretend spot', () => {
  it('starts at the spot, moves with your real steps and is never kept', async () => {
    let send = null
    const store = new Map()
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { watchPosition: (fn) => { send = fn; return 1 }, clearWatch: () => {} } } })
    const { start, stop, rec, isSim } = await import('../src/lib/recorder.js')
    const real = { lat: -33.70, lng: 150.70 }
    const there = { lat: -42.88, lng: 147.33 } // Hobart
    start('run', { at: there })
    expect(isSim()).toBe(true)
    const fix = (p) => send({ coords: { latitude: p.lat, longitude: p.lng, accuracy: 5 }, timestamp: Date.now() })
    fix(real)
    const moved = offset(real, 0, 100) // 100 m north for real
    fix(moved)
    expect(distance(rec.points[0], there)).toBeLessThan(1)
    expect(rec.distanceM).toBeGreaterThan(95)
    expect(rec.distanceM).toBeLessThan(105)
    const out = stop()
    expect(out.simulated).toBe(true)
    expect([...store.keys()].some((k) => /unfinished|recording/i.test(k))).toBe(false)
  })
})
