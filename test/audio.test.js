// Tests for the synthesised sounds and recap score: note maths, envelopes,
// every effect building cleanly on a fake AudioContext, the result screen's
// running order, and the score's sections and patterns.
import { describe, it, expect } from 'vitest'
import { midiToFreq, noteToMidi, note, envelope, envelopeAt, envelopeEnd, dbToGain, gainToDb, SILENT } from '../src/lib/audio/synth.js'
import { EFFECTS, scheduleEffect, planSequence, claimNotes, resultSounds, firstTime } from '../src/lib/audio/sfx.js'
import { stepEvents, createScore, PROGRESSION, MELODY, LOOP_STEPS, stepSeconds, BPM } from '../src/lib/audio/score.js'
import { DEFAULTS } from '../src/lib/audio/settings.js'

// ---- a fake AudioContext that records what gets scheduled ----
function fakeParam(log, value = 0) {
  const p = { value, events: [] }
  for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues', 'cancelAndHoldAtTime']) {
    p[m] = (v, t) => {
      if (m === 'exponentialRampToValueAtTime' && !(v > 0)) throw new Error('exp ramp to ' + v)
      if (m !== 'cancelScheduledValues' && m !== 'cancelAndHoldAtTime' && !Number.isFinite(t)) throw new Error('bad time')
      p.events.push([m, v, t])
      log.automation++
    }
  }
  return p
}
function fakeCtx({ currentTime = 0 } = {}) {
  const log = { osc: [], gain: [], noise: [], filter: [], automation: 0, connections: 0 }
  const node = (extra) => ({ connect: () => { log.connections++ }, disconnect: () => {}, ...extra })
  const ctx = {
    currentTime, sampleRate: 8000, state: 'running', destination: node({}), log,
    createOscillator: () => {
      const o = node({ type: 'sine', frequency: fakeParam(log, 440), detune: fakeParam(log), start(t) { o.t0 = t }, stop(t) { o.t1 = t } })
      log.osc.push(o)
      return o
    },
    createGain: () => { const g = node({ gain: fakeParam(log, 1) }); log.gain.push(g); return g },
    createBiquadFilter: () => { const f = node({ type: 'lowpass', frequency: fakeParam(log), Q: fakeParam(log), gain: fakeParam(log) }); log.filter.push(f); return f },
    createBufferSource: () => { const b = node({ start(t) { b.t0 = t }, stop(t) { b.t1 = t } }); log.noise.push(b); return b },
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
  }
  return ctx
}

describe('notes and levels', () => {
  it('turns notes into the right frequencies', () => {
    expect(midiToFreq(69)).toBe(440)
    expect(noteToMidi('C4')).toBe(60)
    expect(noteToMidi('F#4')).toBe(66)
    expect(noteToMidi('Bb3')).toBe(58)
    expect(note('A5')).toBeCloseTo(880, 6)
    expect(note('D4')).toBeCloseTo(293.66, 1)
    expect(() => noteToMidi('H2')).toThrow()
  })

  it('converts decibels', () => {
    expect(dbToGain(-12)).toBeCloseTo(0.251, 3)
    expect(gainToDb(0.5)).toBeCloseTo(-6.02, 2)
  })
})

describe('envelopes', () => {
  it('starts silent, rises softly to the peak, holds, then fades away', () => {
    const env = envelope(1, { attack: 0.01, hold: 0.1, decay: 0.5, peak: 0.3 })
    expect(env[0]).toEqual(['set', 0, 1])
    expect(envelopeAt(env, 1)).toBe(0)
    expect(envelopeAt(env, 1.005)).toBeCloseTo(0.15, 6)
    expect(envelopeAt(env, 1.05)).toBeCloseTo(0.3, 6)
    expect(envelopeAt(env, 1.3)).toBeLessThan(0.3)
    expect(envelopeEnd(env)).toBeCloseTo(1.61, 6)
    expect(envelopeAt(env, 2)).toBe(SILENT)
  })

  it('never ramps exponentially to zero and never has an instant attack', () => {
    const env = envelope(0, { attack: 0, decay: 0, peak: 0 })
    expect(env[1][2]).toBeGreaterThan(0) // at least 2 ms, so no click
    for (const [kind, v] of env) if (kind === 'exp') expect(v).toBeGreaterThan(0)
  })
})

describe('sound effects', () => {
  const names = ['claim', 'take', 'levelUp', 'pr', 'quest', 'crown', 'start', 'pause', 'resume', 'finish', 'loopReady', 'kudos', 'tap']

  it('has every effect, short ones under a second and celebrations about 1.5 s', () => {
    for (const n of names) {
      expect(EFFECTS[n], n).toBeTruthy()
      expect(EFFECTS[n].dur).toBeLessThanOrEqual(EFFECTS[n].celebration ? 1.6 : 1.0)
    }
  })

  it('builds each effect from scheduled nodes that start and stop inside its time', () => {
    for (const n of names) {
      const ctx = fakeCtx()
      const end = scheduleEffect(ctx, ctx.destination, n, 2, { hexes: 20 })
      const sources = [...ctx.log.osc, ...ctx.log.noise]
      expect(sources.length, n).toBeGreaterThan(0)
      for (const s of sources) {
        expect(s.t0).toBeGreaterThanOrEqual(2)
        expect(s.t1).toBeGreaterThan(s.t0)
        expect(s.t1 - 2, n).toBeLessThanOrEqual(EFFECTS[n].dur + 0.35) // tails ring a touch past the queue slot
      }
      expect(end).toBeGreaterThan(2)
      // no single voice is loud enough to clip on its own (big values are FM depths in Hz, not levels)
      for (const g of ctx.log.gain) for (const [, v] of g.gain.events) if (v <= 10) expect(v).toBeLessThan(0.5)
    }
  })

  it('makes the claim figure bigger for more ground', () => {
    expect(claimNotes(2)).toEqual(['D5', 'F#5', 'A5'])
    expect(claimNotes(10)).toHaveLength(4)
    expect(claimNotes(40)).toHaveLength(5)
  })

  it('rejects unknown effects', () => {
    expect(() => scheduleEffect(fakeCtx(), {}, 'boom', 0)).toThrow()
  })

  it('plays a result in a sensible order, one after another', () => {
    const r = {
      activity: { id: 'a', loops: 1 },
      diff: { claimed: ['x', 'y'], taken: [{ h3: 'z' }] },
      prs: [{ key: '5k' }],
      strongholds: [{ holds: true, tookFrom: 'Sam', efforts: 3 }],
    }
    const list = resultSounds(r, true)
    expect(list.map((x) => x.name)).toEqual(['claim', 'take', 'crown', 'pr', 'levelUp'])
    expect(list[0].hexes).toBe(3)
    const seq = planSequence(list, 0.2)
    expect(seq[0].at).toBe(0)
    for (let i = 1; i < seq.length; i++) expect(seq[i].at).toBeCloseTo(seq[i - 1].at + EFFECTS[seq[i - 1].name].dur + 0.2, 6)
  })

  it('stays quiet for rejected runs, runs with no loop, and old results', () => {
    expect(resultSounds({ activity: { loops: 1, rejected: true }, diff: { claimed: [], taken: [] } })).toEqual([])
    expect(resultSounds({ activity: { loops: 0 }, diff: { claimed: [], taken: [] } })).toEqual([])
    expect(resultSounds({ activity: { loops: 1 }, diff: null })).toEqual([])
    expect(resultSounds({ activity: { loops: 1 }, diff: { claimed: [], taken: [] }, strongholds: [{ holds: true, efforts: 5 }] }).map((x) => x.name)).toEqual(['claim'])
  })

  it('plays a result once per visit', () => {
    expect(firstTime('t1')).toBe(true)
    expect(firstTime('t1')).toBe(false)
  })

  it('defaults: effects and recap music on, tap tick off', () => {
    expect(DEFAULTS.sfx).toBe(true)
    expect(DEFAULTS.sfxVolume).toBe(0.6)
    expect(DEFAULTS.recapMusic).toBe(true)
    expect(DEFAULTS.tapSound).toBe(false)
  })
})

describe('recap score patterns', () => {
  const voices = (sec, i) => {
    const out = new Set()
    for (let s = 0; s < LOOP_STEPS; s++) for (const e of stepEvents(sec, s, i)) out.add(e.voice)
    return out
  }

  it('runs at about 100 BPM in sixteenths and loops every four bars', () => {
    expect(BPM).toBe(100)
    expect(stepSeconds()).toBeCloseTo(0.15, 6)
    expect(LOOP_STEPS).toBe(64)
    expect(stepEvents('orbit', 5, 1)).toEqual(stepEvents('orbit', 5 + LOOP_STEPS * 3, 1))
  })

  it('fly in is just the pad swell and a few bells, no drums', () => {
    expect([...voices('flyin', 1)].sort()).toEqual(['bell', 'pad'])
    expect(stepEvents('flyin', 0)[0]).toMatchObject({ voice: 'pad', attack: 2.4 })
  })

  it('follow gets busier with intensity', () => {
    const count = (i) => { let n = 0; for (let s = 0; s < LOOP_STEPS; s++) n += stepEvents('follow', s, i).length; return n }
    expect(voices('follow', 0).has('hat')).toBe(false)
    expect(voices('follow', 0).has('bass')).toBe(false)
    expect(voices('follow', 1).has('hat')).toBe(true)
    expect(voices('follow', 1).has('bass')).toBe(true)
    expect(count(1)).toBeGreaterThan(count(0) * 1.5)
  })

  it('orbit plays the full band with claps and the bell tune', () => {
    const v = voices('orbit', 1)
    for (const k of ['pad', 'arp', 'bass', 'kick', 'hat', 'clap', 'bell']) expect(v.has(k), k).toBe(true)
    expect(MELODY).toHaveLength(16)
  })

  it('keeps arpeggio and bass notes inside the chord of the bar', () => {
    for (let s = 0; s < LOOP_STEPS; s++) {
      const chord = PROGRESSION[Math.floor(s / 16)]
      for (const e of stepEvents('orbit', s, 1)) {
        if (e.voice === 'arp') expect(chord.arp).toContain(e.note)
        if (e.voice === 'bass') expect(e.note).toBe(chord.bass)
      }
    }
  })

  it('overview and unknown sections play no pattern (overview resolves instead)', () => {
    expect(stepEvents('overview', 0, 1)).toEqual([])
    expect(stepEvents('nope', 0, 1)).toEqual([])
  })
})

describe('recap score player', () => {
  function setup() {
    const ctx = fakeCtx({ currentTime: 10 })
    const out = ctx.createGain()
    const timers = { auto: false, set: () => 0, clear: () => {} }
    return { ctx, score: createScore({ getContext: () => ctx, getOut: () => out, timers }) }
  }

  it('schedules ahead on the audio clock and follows the shots', () => {
    const { ctx, score } = setup()
    expect(score.start('flyin')).toBe(true)
    score.scheduleUntil(13.8)
    const flyinOsc = ctx.log.osc.length
    expect(flyinOsc).toBeGreaterThan(0)
    for (const o of ctx.log.osc) expect(o.t0).toBeGreaterThanOrEqual(10)
    score.setSection('follow')
    score.setIntensity(0.9)
    expect(score.intensity).toBe(0.9)
    score.scheduleUntil(20)
    expect(ctx.log.osc.length).toBeGreaterThan(flyinOsc + 20)
    score.setSection('orbit')
    expect(score.intensity).toBe(1)
    const before = score.scheduled
    score.scheduleUntil(34)
    expect(score.scheduled).toBeGreaterThan(before)
    score.setSection('overview')
    expect(score.section).toBe('end')
    const n = ctx.log.osc.length
    score.scheduleUntil(40)
    expect(ctx.log.osc.length).toBe(n) // only the closing chord, no more pattern
  })

  it('skips ahead instead of bursting when it wakes up late', () => {
    const { ctx, score } = setup()
    score.start('follow')
    ctx.currentTime = 30
    score.scheduleUntil(30.2)
    for (const o of ctx.log.osc) if (o.t0 > 11) expect(o.t0).toBeGreaterThanOrEqual(29.9)
  })

  it('stops with a fade and can start again for Watch again', () => {
    const { score } = setup()
    score.start('orbit')
    score.stop({ fade: 0.3 })
    expect(score.playing).toBe(false)
    score.setSection('flyin')
    expect(score.playing).toBe(true)
    expect(score.section).toBe('flyin')
  })

  it('does nothing without an AudioContext', () => {
    const score = createScore({ getContext: () => null, getOut: () => null })
    expect(score.start()).toBe(false)
    expect(() => { score.setSection('orbit'); score.setIntensity(2); score.stop() }).not.toThrow()
  })
})
