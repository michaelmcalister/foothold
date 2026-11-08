// Tests for sounds placed around you: the spatial sounds and their paths,
// the scenes' and the map's lists of them, spacing so they never pile up,
// radio static, and reading a park or a main road off the map.
import { describe, it, expect } from 'vitest'
import { SPATIAL, playSpatial, placeFor, radioStatic, spot } from '../src/lib/audio/spatial.js'
import { AROUND, NEARBY, SCENES, aroundTimes, rng, createSoundscape } from '../src/lib/audio/soundscape.js'
import { SFX } from '../src/lib/audio/library.js'
import { surroundingsFrom } from '../src/lib/surroundings.js'
import { THRILLERS } from '../src/lib/missions/thrillers.js'
import { GAMESHOW } from '../src/lib/missions/gameshow.js'

function fakeCtx({ panner = true } = {}) {
  const log = { started: 0, moves: 0 }
  const param = () => {
    const p = { value: 0 }
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) {
      p[m] = (v, t) => {
        if (m === 'exponentialRampToValueAtTime' && !(v > 0)) throw new Error('exp ramp to ' + v)
        if (m !== 'cancelScheduledValues' && !Number.isFinite(t)) throw new Error('bad time ' + m)
        if (m === 'linearRampToValueAtTime') log.moves++
      }
    }
    return p
  }
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra })
  const src = (extra) => node({ start() { log.started++ }, stop() {}, ...extra })
  const ctx = {
    currentTime: 5, sampleRate: 8000, destination: node(), log,
    createOscillator: () => src({ type: 'sine', frequency: param(), detune: param() }),
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(), Q: param() }),
    createBufferSource: () => src({ buffer: null, loop: false }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createStereoPanner: () => node({ pan: param() }),
  }
  if (panner) ctx.createPanner = () => node({ positionX: param(), positionY: param(), positionZ: param() })
  return ctx
}

describe('spatial sounds', () => {
  it('every spatial sound plays, moving along its path, with or without a 3D panner', () => {
    for (const panner of [true, false]) {
      for (const name of Object.keys(SPATIAL)) {
        const ctx = fakeCtx({ panner })
        const end = playSpatial(ctx, ctx.destination, name, 5, { r: rng(2) })
        if (SPATIAL[name].synth) {
          expect(end - 5, name).toBeCloseTo(SPATIAL[name].dur, 5)
          expect(ctx.log.started, name).toBeGreaterThan(0)
        } else {
          expect(end, `${name} waits for its recording`).toBe(5)
        }
      }
    }
    const ctx = fakeCtx()
    playSpatial(ctx, ctx.destination, 'helicopter', 5, { r: rng(1) })
    expect(ctx.log.moves).toBeGreaterThan(20) // it flies across, it doesn't sit still
  })

  it('every recorded one-shot a sound asks for is in the library', () => {
    for (const d of Object.values(SPATIAL)) if (d.recorded) expect(SFX[d.recorded], d.recorded).toBeTruthy()
    for (const [id, x] of Object.entries(SFX)) {
      expect(x.seconds, id).toBeGreaterThanOrEqual(2)
      expect(x.seconds, id).toBeLessThanOrEqual(30)
    }
  })

  it('places birds up in the trees and kids across the park', () => {
    const r = rng(5)
    for (let i = 0; i < 20; i++) {
      const t = placeFor('trees', r)
      expect(t.y).toBeGreaterThan(5)
      expect(Math.abs(t.x)).toBeGreaterThanOrEqual(6)
      expect(Math.abs(placeFor('park', r).x)).toBeGreaterThanOrEqual(20)
    }
    expect(spot(fakeCtx(), fakeCtx().destination).input).toBeTruthy()
  })

  it('scene and map sounds all exist, and never pile up', () => {
    for (const name of Object.keys(SCENES)) expect(AROUND[name], name).toBeTruthy()
    for (const list of [...Object.values(AROUND), ...Object.values(NEARBY)]) for (const a of list) expect(SPATIAL[a.name], a.name).toBeTruthy()
    const times = aroundTimes([{ name: 'car', rate: 2 }, { name: 'bird', rate: 2 }], 0, 120, rng(4), { gap: 5 })
    expect(times.length).toBeGreaterThan(5)
    for (let i = 1; i < times.length; i++) expect(times[i].at - times[i - 1].at).toBeGreaterThanOrEqual(5)
  })

  it('radio static runs as long as the line, then squelches off', () => {
    const ctx = fakeCtx()
    expect(radioStatic(ctx, ctx.destination, 5, 3, rng(9))).toBe(8)
    expect(ctx.log.started).toBeGreaterThan(10) // the hiss and plenty of crackles
  })

  it('the soundscape takes a beat’s spatial sound and the map’s surroundings', () => {
    const ctx = fakeCtx()
    const s = createSoundscape(ctx, ctx.destination, { score: 'heist', seed: 3 })
    s.start()
    s.setScene('city')
    const before = ctx.log.started
    s.spatial('helicopter')
    expect(ctx.log.started).toBeGreaterThan(before)
    s.setSurroundings({ park: true, road: false })
    expect(s.surroundings).toEqual({ park: true, road: false, shops: false })
    s.radio(2)
    s.stop(0.01)
  })

  it('every story beat with a spatial sound names a real one', () => {
    for (const m of [...THRILLERS, ...GAMESHOW]) for (const b of m.beats) if (b.spatial) expect(SPATIAL[b.spatial], `${m.id} ${b.at}`).toBeTruthy()
    expect(THRILLERS.every((m) => m.beats.some((b) => b.spatial))).toBe(true)
  })
})

describe('reading the map around you', () => {
  const f = (sourceLayer, cls) => ({ sourceLayer, properties: { class: cls } })
  it('finds parks, main roads and shops in the map’s own features', () => {
    expect(surroundingsFrom([f('park', 'national_park')])).toMatchObject({ park: true })
    expect(surroundingsFrom([f('landuse', 'playground')]).park).toBe(true)
    expect(surroundingsFrom([f('landcover', 'grass')]).park).toBe(true)
    expect(surroundingsFrom([f('transportation', 'primary')]).road).toBe(true)
    expect(surroundingsFrom([f('transportation', 'minor'), f('transportation', 'path')]).road).toBe(false)
    expect(surroundingsFrom([f('poi', 'cafe')]).shops).toBe(false) // one cafe isn't a strip of shops
    expect(surroundingsFrom([f('poi', 'cafe'), f('poi', 'bakery')]).shops).toBe(true)
    expect(surroundingsFrom([])).toEqual({ park: false, road: false, shops: false })
  })
})
