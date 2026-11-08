// Tests for Deep Cover (missions/series/deepcover.js and its sound kit): five
// episodes that unlock in order and build up, every effect, scene and
// spatial sound exists, every speaker is in the cast, the writing rules, and
// the kit's stings and scenes build cleanly on a fake AudioContext.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, unlockedBy, sagaById } from '../src/lib/missions/scripts.js'
import { lineText } from '../src/lib/missions/engine.js'
import { CAST, isCast } from '../src/lib/missions/cast.js'
import { STINGS, SCENES, AROUND, THEMES, SCORES, startScene, scheduleSting, spotTimes, rng, SPOTS } from '../src/lib/audio/soundscape.js'
import { SPATIAL, playSpatial } from '../src/lib/audio/spatial.js'
import { AMBIENCE, SFX, TRACKS, CHASE_TRACK } from '../src/lib/audio/library.js'
import { coverSvg, SAGA_LOOK } from '../src/lib/missions/covers.js'
import * as series from '../src/lib/missions/series/deepcover.js'
import { KIT } from '../src/lib/audio/kits/deepcover.js'

const eps = MISSIONS.filter((m) => m.saga === 'deepcover')

// every line in an episode, with the speaker it ends up with
function lines(m) {
  const out = []
  const add = (l, who) => l && out.push({ text: typeof l === 'string' ? l : l.text, who: (typeof l === 'object' && l.who) || who || null })
  add(m.loop); add(m.early)
  for (const b of m.beats) {
    add(b.say, b.who)
    for (const k of ['success', 'okay', 'half', 'easyNudge', 'right', 'wrong', 'timeout']) add(b[k], b.who)
    for (const o of b.options || []) add(o.say, b.who)
  }
  return out
}

// ---- a fake AudioContext (as in thrillers.test.js) ----
function fakeCtx() {
  const log = { started: 0, stopped: 0 }
  const param = () => {
    const p = { value: 0 }
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) {
      p[m] = (v, t) => {
        if (m === 'exponentialRampToValueAtTime' && !(v > 0)) throw new Error('exp ramp to ' + v)
        if (m !== 'cancelScheduledValues' && !Number.isFinite(t)) throw new Error('bad time ' + m)
      }
    }
    return p
  }
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra })
  const src = (extra) => node({ start() { log.started++ }, stop() { log.stopped++ }, ...extra })
  return {
    currentTime: 5, sampleRate: 8000, destination: node(), log,
    createOscillator: () => src({ type: 'sine', frequency: param(), detune: param() }),
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(), Q: param() }),
    createBufferSource: () => src({ buffer: null, loop: false }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
  }
}

describe('Deep Cover', () => {
  it('has five episodes in order, chained, that build up', () => {
    expect(eps.map((m) => m.id)).toEqual(series.CHAIN)
    expect(CHAINS.deepcover).toEqual(series.CHAIN)
    expect(eps.map((m) => m.episode)).toEqual([1, 2, 3, 4, 5])
    expect(eps.map((m) => m.minutes)).toEqual([20, 25, 30, 30, 35])
    expect(eps.map((m) => m.difficulty)).toEqual(['Gentle', 'Steady effort', 'Steady effort', 'Hard effort', 'Hard effort'])
    expect(unlockedBy(eps[0].id)).toBe(null)
    for (let i = 1; i < 5; i++) expect(unlockedBy(eps[i].id).id).toBe(eps[i - 1].id)
    const saga = sagaById('deepcover')
    expect(saga.title).toBe('Deep Cover')
    expect(saga.score).toBe('deepcover')
    expect(saga.narrator).toBe('dc-narrator')
    expect(SAGA_LOOK.deepcover.tag).toBe('Spy thriller')
    eps.forEach((m, i) => {
      if (i === 0) expect(m.previously).toBeUndefined()
      else expect(m.previously).toMatch(/^Previously on Deep Cover: /)
      if (i === 4) expect(m.next).toBeUndefined()
      else expect(m.next).toMatch(/^Next time on Deep Cover/)
      for (const l of [m.previously, m.next].filter(Boolean)) expect(l.length).toBeLessThanOrEqual(180)
    })
    expect(lineText(eps[4].beats.at(-1).say)).toMatch(/Lyrebird is locked away/)
  })

  it('every fx, scene and spatial sound exists, and every speaker is in the cast', () => {
    for (const m of eps) {
      expect(m.beats[0].kind, m.id).toBe('recover')
      expect(m.beats[0].scene, m.id).toBeTruthy()
      expect(m.beats.at(-1).kind, m.id).toBe('finale')
      for (const b of m.beats) {
        if (b.fx) expect(STINGS[b.fx], `${m.id} ${b.at} ${b.fx}`).toBeTruthy()
        if (b.scene) expect(SCENES[b.scene], `${m.id} ${b.at} ${b.scene}`).toBeTruthy()
        if (b.spatial) expect(SPATIAL[b.spatial], `${m.id} ${b.at} ${b.spatial}`).toBeTruthy()
      }
      for (const l of lines(m)) expect(isCast(l.who || 'dc-narrator'), `${m.id}: ${l.text}`).toBe(true)
    }
    for (const key of Object.keys(series.CAST)) expect(CAST[key], key).toBeTruthy()
    const voices = Object.values(series.CAST).map((c) => c.voiceId)
    expect(new Set(voices).size).toBe(voices.length) // each voice once in the series
  })

  it('follows the episode rules: surges, a steady, a choice and a question each time', () => {
    const surgeSecs = [30, 40, 50, 60, 60]
    eps.forEach((m, i) => {
      expect(m.beats.length, m.id).toBeGreaterThanOrEqual(25)
      expect(m.beats.length, m.id).toBeLessThanOrEqual(34)
      const surges = m.beats.filter((b) => b.kind === 'surge')
      expect(surges.length, m.id).toBeGreaterThanOrEqual(3)
      for (const s of surges) {
        expect(s.seconds, m.id).toBeLessThanOrEqual(surgeSecs[i])
        for (const k of ['half', 'success', 'okay']) expect(s[k], `${m.id} ${s.at} ${k}`).toBeTruthy()
        expect(lineText(s.okay)).toMatch(/made it|got there|clear|that is what counts/i)
      }
      expect(Math.max(...surges.map((s) => s.seconds))).toBe(surgeSecs[i])
      expect(m.beats.some((b) => b.kind === 'steady' && b.easyNudge), m.id).toBe(true)
      const choices = m.beats.filter((b) => b.kind === 'choice')
      expect(choices.length, m.id).toBeGreaterThanOrEqual(1)
      for (const c of choices) {
        expect(c.default && c.timeout, `${m.id} ${c.id}`).toBeTruthy()
        expect(c.options.some((o) => m.beats.some((b) => b.if === o.flag || b.unless === o.flag)), `${m.id} ${c.id} is followed`).toBe(true)
      }
      const asks = m.beats.filter((b) => b.kind === 'quiz' || b.kind === 'puzzle')
      expect(asks.length, m.id).toBeGreaterThanOrEqual(1)
      for (const q of asks) {
        expect(q.options).toHaveLength(3)
        expect(lineText(q.wrong)).not.toMatch(/\b(wrong|nope|failed|silly)\b/i)
        expect(lineText(q.wrong)).toMatch(new RegExp(q.options.find((o) => o.key === q.answer).label.replace(/^The /, ''), 'i'))
      }
      // beats run in time order, spanning about the episode's length
      const ats = m.beats.map((b) => b.at)
      expect(ats).toEqual([...ats].sort((a, b) => a - b))
      expect(ats.at(-1)).toBeGreaterThan(m.minutes * 60 * 0.85)
      expect(ats.at(-1)).toBeLessThanOrEqual(m.minutes * 60 + 60)
    })
  })

  it('keeps to the house style: no dashes, no harsh words, short lines, known cues', () => {
    const known = new Set(['whispers', 'laughs', 'sighs', 'excited', 'curious', 'sarcastic', 'mischievously'])
    for (const m of eps) {
      const all = [...lines(m).map((l) => l.text), m.title, m.blurb, m.previously, m.next].filter(Boolean)
      for (const t of all) {
        expect(t, t).not.toMatch(/[‒–—―]|--/)
        expect(t, t).not.toMatch(/\b(kill\w*|dead\w*|die|died|dies|scary|weak\w*|fail\w*)\b/i)
        expect(t.length, t).toBeLessThanOrEqual(300)
        for (const [, tag] of t.matchAll(/\[([^\]]+)\]/g)) expect(known.has(tag), tag).toBe(true)
      }
    }
  })

  it('brings its own recordings, with prompts that describe a feel', () => {
    for (const name of Object.keys(KIT.scenes)) {
      expect(AMBIENCE[name], name).toMatch(/no music, no voices$/)
      expect(AROUND[name], name).toBeTruthy()
    }
    for (const d of Object.values(KIT.spatial)) expect(SFX[d.recorded], d.recorded).toBeTruthy()
    expect(CHASE_TRACK.deepcover).toBe('lyrebird-run')
    expect(TRACKS['lyrebird-run'].prompt).toMatch(/^Original .*No vocals\.$/)
  })

  it('its stings, scenes and spatial sounds build cleanly', () => {
    expect(Object.keys(KIT.stings).length).toBeGreaterThanOrEqual(5)
    for (const name of Object.keys(KIT.stings)) {
      const ctx = fakeCtx()
      const end = scheduleSting(ctx, ctx.destination, name, 5)
      expect(end - 5, name).toBeGreaterThan(0.3)
      expect(end - 5, name).toBeLessThanOrEqual(STINGS[name].dur + 0.01)
      expect(ctx.log.started, name).toBeGreaterThan(0)
    }
    for (const name of Object.keys(KIT.scenes)) {
      const ctx = fakeCtx()
      const sc = startScene(ctx, ctx.destination, name, 5)
      expect(ctx.log.started, name).toBeGreaterThan(0)
      sc.stop(10, 2)
      expect(ctx.log.stopped, name).toBe(ctx.log.started)
      for (const s of spotTimes(name, 0, 120, rng(4))) SPOTS[s.name](ctx, ctx.destination, s.at + 5, rng(9))
    }
    for (const name of Object.keys(KIT.spatial)) {
      const ctx = fakeCtx()
      expect(playSpatial(ctx, ctx.destination, name, 5, { r: rng(3) }) - 5).toBeCloseTo(SPATIAL[name].dur, 5)
      expect(ctx.log.started, name).toBeGreaterThan(0)
    }
    expect(THEMES.deepcover.motif).toHaveLength(7)
    expect(SCORES.deepcover.run).toHaveLength(8)
    expect(SCORES.deepcover.bass).toHaveLength(8)
  })

  it('draws a cover for every episode, each its own', () => {
    const svgs = eps.map((m) => coverSvg(m).replace(/cv\d+/g, 'cv'))
    for (const s of svgs) {
      expect(s.startsWith('<svg')).toBe(true)
      expect(s).not.toMatch(/NaN|undefined/)
    }
    expect(new Set(svgs).size).toBe(5)
  })
})
