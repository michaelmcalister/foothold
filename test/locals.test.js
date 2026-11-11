// Tests for the Sydney local stories: River Town's episodes 2 and 3 (Glenbrook
// and St Marys), Breakers at Bondi and The Major's Hill at Mount Druitt, and
// their shared sound kit (audio/kits/locals.js). Each one is listed and
// chained, names only sounds, scenes and speakers that exist, is full of
// trivia whose replies name the answer, sends each choice to exactly one
// surge, records its new sounds, and has a cover and a look.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, sagaById, unlockedBy } from '../src/lib/missions/scripts.js'
import { CAST } from '../src/lib/missions/cast.js'
import { KIT } from '../src/lib/audio/kits/locals.js'
import { STINGS, SCENES, SCORES, THEMES, scheduleSting } from '../src/lib/audio/soundscape.js'
import { SPATIAL, playSpatial } from '../src/lib/audio/spatial.js'
import { AMBIENCE, SFX } from '../src/lib/audio/library.js'
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

const NEW = ['penrith-zigzag', 'penrith-duration', 'penrith-orphans', 'penrith-whitewater', 'bondi-breakers', 'druitt-relay', 'sydney-stjames', 'sydney-sub', 'sydney-barracks', 'sydney-qstation', 'sydney-pinchgut']
const ep = (id) => MISSIONS.find((m) => m.id === id)

describe('the Sydney local stories', () => {
  it('are all listed and chained', () => {
    for (const id of NEW) expect(ep(id), id).toBeTruthy()
    expect(CHAINS.penrith).toEqual(['penrith-emuhall', 'penrith-zigzag', 'penrith-duration', 'penrith-orphans', 'penrith-whitewater'])
    expect(unlockedBy('penrith-orphans').id).toBe('penrith-duration')
    expect(unlockedBy('penrith-zigzag').id).toBe('penrith-emuhall')
    expect(unlockedBy('penrith-duration').id).toBe('penrith-zigzag')
    expect(ep('penrith-emuhall').next).toMatch(/^Next time on River Town/)
    expect(ep('penrith-duration').previously).toMatch(/^Previously on River Town/)
    expect(sagaById('bondi')).toMatchObject({ title: 'Breakers', score: 'locals' })
    expect(sagaById('druitt')).toMatchObject({ title: 'The Major’s Hill', score: 'locals' })
  })

  it('only use sounds, scenes and speakers that exist', () => {
    for (const id of NEW) for (const b of ep(id).beats) {
      if (b.fx) expect(STINGS[b.fx], `${id} ${b.fx}`).toBeTruthy()
      if (b.scene) expect(SCENES[b.scene], `${id} ${b.scene}`).toBeTruthy()
      if (b.spatial) expect(SPATIAL[b.spatial], `${id} ${b.spatial}`).toBeTruthy()
      if (b.who) expect(CAST[b.who], `${id} ${b.who}`).toBeTruthy()
    }
  })

  it('are full of trivia, and every reply names the answer', () => {
    for (const id of NEW) {
      const qs = ep(id).beats.filter((b) => b.kind === 'quiz' || b.kind === 'puzzle')
      expect(qs.length, id).toBeGreaterThanOrEqual(4)
      for (const q of qs) {
        const label = q.options.find((o) => o.key === q.answer).label.toLowerCase()
        expect(q.right.text.toLowerCase(), q.say).toContain(label)
        expect(q.wrong.text.toLowerCase(), q.say).toContain(label)
      }
    }
  })

  it('send each choice to exactly one surge, and run in order', () => {
    for (const id of NEW) {
      const m = ep(id)
      const choice = m.beats.find((b) => b.kind === 'choice')
      const flag = choice.options[0].flag
      expect(m.beats.filter((b) => b.kind === 'surge' && (b.if === flag || b.unless === flag)), id).toHaveLength(2)
      const at = m.beats.map((b) => b.at)
      expect([...at].sort((a, b) => a - b)).toEqual(at)
      expect(m.beats.at(-1).kind).toBe('finale')
    }
  })

  it('have a sound kit that builds, recordings for every new sound, and covers', () => {
    expect(SCORES.locals).toBeTruthy()
    expect(THEMES.locals).toBeTruthy()
    for (const id of Object.keys(KIT.stings)) { const c = fakeCtx(); expect(() => scheduleSting(c, c.destination, id, 5)).not.toThrow() }
    for (const id of Object.keys(KIT.spatial)) { const c = fakeCtx(); expect(() => playSpatial(c, c.destination, id, 5, { r: () => 0.5 })).not.toThrow() }
    for (const id of Object.keys(KIT.scenes)) expect(AMBIENCE[id], id).toMatch(/no music|no clear words/)
    for (const s of Object.values(KIT.spatial)) expect(SFX[s.recorded], s.recorded).toBeTruthy()
    for (const saga of ['bondi', 'druitt', 'sydney']) expect(SAGA_LOOK[saga]).toBeTruthy()
    expect(sagaById('sydney')).toMatchObject({ title: 'Sydney After Dark' })
    for (const id of NEW) expect(coverSvg(ep(id))).toContain('<svg')
  })
})
