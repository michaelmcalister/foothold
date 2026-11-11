// Tests for Two Cities (missions/series/twocities.js and its sound kit): two
// episodes that unlock in order, every sound, scene and speaker they name
// exists, the trivia replies name the answer, each choice leads to exactly
// one surge, the kit builds on a fake AudioContext, and the cover, look and
// recordings are all in.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, sagaById, unlockedBy } from '../src/lib/missions/scripts.js'
import { SAGA, EPISODES, CHAIN, CAST } from '../src/lib/missions/series/twocities.js'
import { KIT } from '../src/lib/audio/kits/twocities.js'
import { STINGS, SCENES, SCORES, THEMES, scheduleSting } from '../src/lib/audio/soundscape.js'
import { SPATIAL, playSpatial } from '../src/lib/audio/spatial.js'
import { AMBIENCE, SFX, TRACKS } from '../src/lib/audio/library.js'
import { coverSvg, SAGA_LOOK } from '../src/lib/missions/covers.js'

function fakeCtx() {
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
  const src = (extra) => node({ start() {}, stop() {}, ...extra })
  return {
    currentTime: 5, sampleRate: 8000, destination: node(),
    createOscillator: () => src({ type: 'sine', frequency: param(), detune: param() }),
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(), Q: param() }),
    createBufferSource: () => src({ buffer: null, loop: false }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createPanner: () => node({ positionX: param(), positionY: param(), positionZ: param() }),
  }
}

const eps = () => MISSIONS.filter((m) => m.saga === 'twocities')

describe('Two Cities: the episodes', () => {
  it('has two episodes in order, Kuala Lumpur then Manila', () => {
    expect(eps().map((m) => m.id)).toEqual(CHAIN)
    expect(EPISODES.map((m) => m.id)).toEqual(CHAIN)
    expect(CHAINS.twocities).toEqual(CHAIN)
    expect(unlockedBy(CHAIN[0])).toBe(null)
    expect(unlockedBy(CHAIN[1]).id).toBe(CHAIN[0])
    expect(sagaById('twocities')).toMatchObject({ title: 'Two Cities', narrator: 'twocities-narrator', score: 'twocities', isNew: true })
    expect(eps()[0].next).toMatch(/^Next time on Two Cities/)
    expect(eps()[1].previously).toMatch(/^Previously on Two Cities/)
  })

  it('only uses sounds, scenes and speakers that exist', () => {
    for (const m of eps()) for (const b of m.beats) {
      if (b.fx) expect(STINGS[b.fx], b.fx).toBeTruthy()
      if (b.scene) expect(SCENES[b.scene], b.scene).toBeTruthy()
      if (b.spatial) expect(SPATIAL[b.spatial], b.spatial).toBeTruthy()
      if (b.who) expect(CAST[b.who], b.who).toBeTruthy()
    }
    expect(new Set(Object.values(CAST).map((c) => c.voiceId)).size).toBe(Object.keys(CAST).length)
  })

  it('is full of trivia, and every reply names the answer', () => {
    for (const m of eps()) {
      const qs = m.beats.filter((b) => b.kind === 'quiz' || b.kind === 'puzzle')
      expect(qs.length, m.id).toBeGreaterThanOrEqual(5)
      for (const q of qs) {
        const label = q.options.find((o) => o.key === q.answer).label.toLowerCase()
        expect(q.right.text.toLowerCase()).toContain(label)
        expect(q.wrong.text.toLowerCase()).toContain(label)
      }
    }
  })

  it('each choice leads to exactly one surge either way', () => {
    for (const [m, flag] of [[eps()[0], 'square'], [eps()[1], 'walls']]) {
      const forks = m.beats.filter((b) => b.kind === 'surge' && (b.if === flag || b.unless === flag))
      expect(forks).toHaveLength(2)
    }
  })

  it('beats run in order', () => {
    for (const m of eps()) {
      const at = m.beats.map((b) => b.at)
      expect([...at].sort((a, b) => a - b)).toEqual(at)
    }
  })
})

describe('Two Cities: sounds and cover', () => {
  it('the kit is merged in, and its stings and spatial sounds build cleanly', () => {
    expect(SCORES.twocities).toBeTruthy()
    expect(THEMES.twocities).toBeTruthy()
    for (const id of Object.keys(KIT.stings)) { const c = fakeCtx(); expect(() => scheduleSting(c, c.destination, id, 5)).not.toThrow() }
    for (const id of Object.keys(KIT.spatial)) { const c = fakeCtx(); expect(() => playSpatial(c, c.destination, id, 5, { r: () => 0.5 })).not.toThrow() }
  })

  it('records local ambience for every new scene, and the passing sounds', () => {
    for (const id of Object.keys(KIT.scenes)) expect(AMBIENCE[id], id).toMatch(/no music|no clear words/)
    for (const s of Object.values(KIT.spatial)) expect(SFX[s.recorded], s.recorded).toBeTruthy()
    expect(TRACKS['twocities-chase'].prompt).toMatch(/No vocals/)
  })

  it('has a cover and a look', () => {
    expect(SAGA_LOOK.twocities).toBeTruthy()
    for (const m of eps()) expect(coverSvg(m)).toContain('<svg')
  })
})
