// Tests for Velocity (missions/series/velocity.js): five episodes that build
// up and unlock in order, every speaker, effect, scene and spatial sound
// exists, the house rules for words, and its sound kit builds cleanly on a
// fake AudioContext.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, unlockedBy, sagaById } from '../src/lib/missions/scripts.js'
import { SAGA, EPISODES, CHAIN, CAST as VCAST, LIBRARY, LOOK } from '../src/lib/missions/series/velocity.js'
import { KIT } from '../src/lib/audio/kits/velocity.js'
import { createMission, lineText } from '../src/lib/missions/engine.js'
import { CAST, isCast } from '../src/lib/missions/cast.js'
import { trainingPaces } from '../src/lib/coach/paces.js'
import { SCENES, STINGS, THEMES, SCORES, startScene, scheduleSting, scheduleIntro, scheduleOutro, musicStep } from '../src/lib/audio/soundscape.js'
import { SPATIAL, playSpatial } from '../src/lib/audio/spatial.js'
import { AMBIENCE, SFX, TRACKS, CHASE_TRACK } from '../src/lib/audio/library.js'
import { coverSvg, lookFor } from '../src/lib/missions/covers.js'

const paces = trainingPaces(30 * 60)
const eps = MISSIONS.filter((m) => m.saga === 'velocity')

// every line in an episode, with who says it
function lines(m) {
  const out = []
  const add = (l, who) => l && out.push({ text: typeof l === 'string' ? l : l.text, who: (typeof l === 'object' && l.who) || who || SAGA.narrator })
  add(m.loop); add(m.early)
  for (const b of m.beats) {
    add(b.say, b.who)
    for (const k of ['success', 'okay', 'half', 'easyNudge', 'right', 'wrong', 'timeout']) add(b[k], b.who)
    for (const o of b.options || []) add(o.say, b.who)
  }
  return out
}

// play an episode through, answering each choice with the given key
function play(m, key = null, surge = 1.2) {
  const mission = createMission(m, { paces })
  const said = []
  let dist = 0
  for (let t = 0; t <= m.beats.at(-1).at + 1200; t++) {
    said.push(...mission.update({ elapsedS: t, distanceM: dist, toStartM: 2000 }).lines.map(lineText))
    const v = mission.view()
    if (key && v.ask?.kind === 'choice') said.push(...mission.answer(key).lines.map(lineText))
    dist += 1000 / (v.kind === 'surge' ? 360 / surge : 360)
  }
  return { said, summary: mission.finish().summary }
}

describe('Velocity: the series', () => {
  it('has five episodes that build up and unlock in order', () => {
    expect(eps.map((m) => m.id)).toEqual(CHAIN)
    expect(EPISODES.map((m) => m.id)).toEqual(CHAIN)
    expect(CHAINS.velocity).toEqual(CHAIN)
    expect(unlockedBy(CHAIN[0])).toBe(null)
    for (let i = 1; i < CHAIN.length; i++) expect(unlockedBy(CHAIN[i]).id).toBe(CHAIN[i - 1])
    expect(eps.map((m) => m.minutes)).toEqual([20, 25, 30, 30, 35])
    expect(eps.map((m) => m.difficulty)).toEqual(['Gentle', 'Steady effort', 'Steady effort', 'Hard effort', 'Hard effort'])
    expect(sagaById('velocity')).toMatchObject({ title: 'Velocity', narrator: 'velocity-narrator', score: 'velocity' })
    expect(sagaById('velocity').note).toMatch(/thunder/)
    eps.forEach((m, i) => {
      expect(m.episode).toBe(i + 1)
      expect(m.series).toBe('thriller')
      if (i === 0) expect(m.previously).toBeUndefined()
      else expect(m.previously).toMatch(/^Previously on Velocity: /)
      if (i === eps.length - 1) expect(m.next).toBeUndefined()
      else expect(m.next).toMatch(/^Next time on Velocity/)
      for (const l of [m.previously, m.next].filter(Boolean)) expect(l.length).toBeLessThanOrEqual(180)
    })
    expect(lookFor('velocity')).toEqual(LOOK)
  })

  it('every episode has the shape of a thriller episode', () => {
    for (const m of eps) {
      const b = m.beats
      expect(b.length, m.id).toBeGreaterThanOrEqual(25)
      expect(b.length, m.id).toBeLessThanOrEqual(36)
      expect(b[0]).toMatchObject({ kind: 'recover' })
      expect(SCENES[b[0].scene], m.id).toBeTruthy()
      expect(b.at(-1).kind).toBe('finale')
      for (let i = 1; i < b.length; i++) expect(b[i].at, `${m.id} ${b[i].at}`).toBeGreaterThan(b[i - 1].at)
      expect(b.at(-1).at / 60, m.id).toBeGreaterThan(m.minutes - 3)
      expect(b.at(-1).at / 60, m.id).toBeLessThanOrEqual(m.minutes + 1)
      // surges: a pair that follows a choice (if/unless) is one surge
      const surges = b.filter((x) => x.kind === 'surge' && !x.unless)
      expect(surges.length, m.id).toBeGreaterThanOrEqual(3)
      expect(surges.length, m.id).toBeLessThanOrEqual(5)
      for (const s of b.filter((x) => x.kind === 'surge')) {
        expect(s.seconds).toBeGreaterThanOrEqual(30)
        expect(s.seconds).toBeLessThanOrEqual(60)
        expect(lineText(s.okay)).toMatch(/made it|got there|clear|that is what counts/i)
        expect(s.success && s.half, `${m.id} ${s.at}`).toBeTruthy()
      }
      expect(b.some((x) => x.kind === 'steady' && x.easyNudge), m.id).toBe(true)
      const choices = b.filter((x) => x.kind === 'choice')
      expect(choices.length, m.id).toBeGreaterThanOrEqual(1)
      for (const c of choices) {
        expect(c.default && c.timeout, `${m.id} ${c.id}`).toBeTruthy()
        const flags = c.options.map((o) => o.flag)
        expect(b.some((x) => flags.includes(x.if) || flags.includes(x.unless)), `${m.id} ${c.id} is followed`).toBe(true)
      }
      const asks = b.filter((x) => x.kind === 'quiz' || x.kind === 'puzzle')
      expect(asks.length, m.id).toBeGreaterThanOrEqual(1)
      for (const q of asks) {
        expect(q.options).toHaveLength(3)
        const label = q.options.find((o) => o.key === q.answer).label.replace(/^The /, '')
        expect(lineText(q.wrong).toLowerCase()).toContain(label.toLowerCase())
        expect(lineText(q.wrong)).not.toMatch(/\b(wrong|nope|failed|silly)\b/i)
      }
    }
    // the surges build from 30 seconds to a full minute
    expect(Math.max(...eps[0].beats.filter((x) => x.kind === 'surge').map((x) => x.seconds))).toBe(30)
    for (const m of eps.slice(3)) expect(Math.max(...m.beats.filter((x) => x.kind === 'surge').map((x) => x.seconds))).toBe(60)
  })

  it('every speaker is in the cast, and every effect, scene and spatial sound exists', () => {
    for (const m of eps) {
      for (const l of lines(m)) expect(isCast(l.who), `${m.id}: ${l.text}`).toBe(true)
      for (const b of m.beats) {
        if (b.fx) expect(STINGS[b.fx], `${m.id} ${b.at} ${b.fx}`).toBeTruthy()
        if (b.scene) expect(SCENES[b.scene], `${m.id} ${b.at} ${b.scene}`).toBeTruthy()
        if (b.spatial) expect(SPATIAL[b.spatial], `${m.id} ${b.at} ${b.spatial}`).toBeTruthy()
      }
    }
  })

  it('has its own cast, each with a different voice', () => {
    const ids = Object.values(VCAST).map((c) => c.voiceId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const [key, c] of Object.entries(VCAST)) {
      expect(CAST[key], key).toBe(c) // nobody else took the key
      expect(c.voiceId).toMatch(/^[A-Za-z0-9]{20}$/)
    }
    expect(VCAST['velocity-narrator']).toBeTruthy()
  })

  it('keeps to the house rules for words', () => {
    const tags = new Set(['whispers', 'laughs', 'sighs', 'excited', 'curious', 'sarcastic', 'mischievously'])
    const all = eps.flatMap((m) => [...lines(m).map((l) => l.text), m.title, m.blurb, m.previously, m.next].filter(Boolean))
    all.push(SAGA.title, SAGA.blurb, SAGA.note)
    for (const m of eps) for (const b of m.beats) for (const o of b.options || []) { all.push(o.label); expect(o.label.length, o.label).toBeLessThanOrEqual(28) }
    for (const t of all) {
      expect(t.length, t).toBeLessThanOrEqual(180)
      expect(t, t).not.toMatch(/[‒–—―]|--/)
      expect(t, t).not.toMatch(/\b(kill|killed|dead|die|died|dies|scary|weak|failed|fail)\b/i)
      for (const [, tag] of t.matchAll(/\[([^\]]+)\]/g)) expect(tags.has(tag), t).toBe(true)
    }
  })

  it('plays every episode through to the end, down both sides of each choice', () => {
    for (const m of eps) {
      for (const key of ['A', 'B']) {
        const { said, summary } = play(m, key)
        expect(summary.completed, `${m.id} ${key}`).toBe(true)
        expect(summary.surgesDone, `${m.id} ${key}`).toBeGreaterThanOrEqual(3)
        expect(said.at(-1)).toBe(lineText(m.beats.at(-1).say))
      }
    }
    // a slow surge is met kindly, and nobody is left behind
    const { said } = play(eps[0], null, 1)
    expect(said.some((l) => /that is what counts/.test(l))).toBe(true)
    expect(lineText(eps[4].beats.at(-1).say)).toMatch(/Velocity is complete/)
    expect(eps[4].beats.some((b) => /completely unharmed/.test(lineText(b.say)))).toBe(true)
  })

  it('draws a cover for every episode', () => {
    for (const m of eps) {
      const svg = coverSvg(m)
      expect(svg).not.toMatch(/NaN|undefined/)
      for (const [, id] of svg.matchAll(/id="([^"]+)"/g)) expect(id).toMatch(/^cv\d+/)
    }
  })

  it('brings its recorded sound prompts', () => {
    for (const name of Object.keys(KIT.scenes)) {
      expect(AMBIENCE[name], name).toBe(LIBRARY.ambience[name])
      expect(AMBIENCE[name]).toMatch(/no music, no voices$/)
    }
    for (const def of Object.values(KIT.spatial)) expect(SFX[def.recorded], def.recorded).toBeTruthy()
    expect(CHASE_TRACK.velocity).toBe(LIBRARY.chase)
    expect(TRACKS[LIBRARY.chase].prompt).toMatch(/^Original .*No vocals\.$/)
  })
})

// a fake AudioContext (as in thrillers.test.js)
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

describe('Velocity: the sound kit', () => {
  it('adds at least five new stings and two or three scenes, all merged in', () => {
    expect(Object.keys(KIT.stings).length).toBeGreaterThanOrEqual(5)
    expect(Object.keys(KIT.scenes).length).toBeGreaterThanOrEqual(2)
    expect(Object.keys(KIT.scenes).length).toBeLessThanOrEqual(3)
    for (const n of Object.keys(KIT.stings)) expect(STINGS[n]).toBe(KIT.stings[n])
    for (const n of Object.keys(KIT.scenes)) expect(SCENES[n]).toBe(KIT.scenes[n])
    expect(THEMES.velocity).toBe(KIT.theme)
    expect(SCORES.velocity).toBe(KIT.score)
    expect(KIT.theme.motif).toHaveLength(7)
    expect(KIT.score.run).toHaveLength(8)
    expect(KIT.score.bass).toHaveLength(8)
  })

  it('every sting and scene builds cleanly', () => {
    for (const [name, s] of Object.entries(KIT.stings)) {
      const ctx = fakeCtx()
      const end = scheduleSting(ctx, ctx.destination, name, 5)
      expect(end - 5, name).toBeGreaterThan(0.3)
      expect(end - 5, name).toBeLessThanOrEqual(s.dur + 0.01)
      expect(ctx.log.started, name).toBeGreaterThan(0)
    }
    for (const name of Object.keys(KIT.scenes)) {
      const ctx = fakeCtx()
      const sc = startScene(ctx, ctx.destination, name, 5)
      expect(ctx.log.started, name).toBeGreaterThan(0)
      sc.stop(10, 2)
      expect(ctx.log.stopped, name).toBe(ctx.log.started)
      for (const s of KIT.scenes[name].spots || []) expect(typeof (KIT.spots[s.name] || null) === 'function' || ['drip', 'cricket', 'bird'].includes(s.name), s.name).toBe(true)
      for (const a of KIT.around[name]) expect(SPATIAL[a.name], a.name).toBeTruthy()
    }
    for (const [name, fn] of Object.entries(KIT.spots)) {
      const ctx = fakeCtx()
      fn(ctx, ctx.destination, 5, () => 0.5)
      expect(ctx.log.started, name).toBeGreaterThan(0)
    }
  })

  it('its spatial sounds play from their stand-ins', () => {
    for (const name of Object.keys(KIT.spatial)) {
      const ctx = fakeCtx()
      const end = playSpatial(ctx, ctx.destination, name, 5, { r: () => 0.4 })
      expect(end - 5, name).toBeCloseTo(KIT.spatial[name].dur)
      expect(ctx.log.started, name).toBeGreaterThan(0)
    }
  })

  it('plays its title music and its score', () => {
    const ctx = fakeCtx()
    const voiceAt = scheduleIntro(ctx, ctx.destination, 'velocity', 5)
    expect(voiceAt - 5).toBeGreaterThan(4)
    expect(scheduleOutro(ctx, ctx.destination, 'velocity', 5) - 5).toBeGreaterThan(5)
    const bar = (lvl) => Array.from({ length: 64 }, (_, i) => musicStep('velocity', lvl, i)).flat()
    expect(bar(0).every((n) => n.inst === 'pad')).toBe(true)
    expect(bar(2).some((n) => n.inst === 'run')).toBe(true)
    expect(bar(2).length).toBeGreaterThan(bar(1).length * 1.8)
  })
})
