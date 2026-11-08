// Tests for Time Runners (missions/series/timerunners.js and its sound kit):
// five episodes that unlock in order and build up, every sound and speaker
// they name exists, each episode opens and closes on the time warp jump, the
// cast uses each voice once, the kit's stings, scenes and spatial sounds
// build cleanly on a fake AudioContext, and the covers and recordings are in.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, sagaById, unlockedBy } from '../src/lib/missions/scripts.js'
import { CAST, isCast } from '../src/lib/missions/cast.js'
import { lineText } from '../src/lib/missions/engine.js'
import { SAGA, EPISODES, CHAIN, CAST as TR_CAST, LIBRARY } from '../src/lib/missions/series/timerunners.js'
import { KIT } from '../src/lib/audio/kits/timerunners.js'
import { STINGS, SCENES, AROUND, THEMES, SCORES, startScene, scheduleSting, scheduleIntro, scheduleOutro, spotTimes, rng } from '../src/lib/audio/soundscape.js'
import { SPATIAL, playSpatial } from '../src/lib/audio/spatial.js'
import { AMBIENCE, SFX, TRACKS, CHASE_TRACK } from '../src/lib/audio/library.js'
import { coverSvg, SAGA_LOOK } from '../src/lib/missions/covers.js'

// ---- a fake AudioContext (as in thrillers.test.js, with a panner) ----
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
    createPanner: () => node({ positionX: param(), positionY: param(), positionZ: param() }),
  }
}

// every line in an episode, with the speaker it ends up with
function speakers(m) {
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

describe('Time Runners: the episodes', () => {
  const eps = MISSIONS.filter((m) => m.saga === 'timerunners')

  it('has five episodes in order, chained, building up in length and effort', () => {
    expect(eps.map((m) => m.id)).toEqual(CHAIN)
    expect(EPISODES.map((m) => m.id)).toEqual(CHAIN)
    expect(CHAINS.timerunners).toEqual(CHAIN)
    expect(eps.map((m) => m.episode)).toEqual([1, 2, 3, 4, 5])
    expect(eps.map((m) => m.minutes)).toEqual([20, 25, 30, 30, 35])
    expect(eps.map((m) => m.difficulty)).toEqual(['Gentle', 'Steady effort', 'Steady effort', 'Hard effort', 'Hard effort'])
    expect(unlockedBy(CHAIN[0])).toBe(null)
    for (let i = 1; i < CHAIN.length; i++) expect(unlockedBy(CHAIN[i]).id).toBe(CHAIN[i - 1])
    expect(sagaById('timerunners')).toMatchObject({ title: 'Time Runners', narrator: 'timerunners-narrator', score: 'timerunners', isNew: true })
  })

  it('frames each episode: previously from two, next time until five', () => {
    eps.forEach((m, i) => {
      if (i === 0) expect(m.previously).toBeUndefined()
      else expect(m.previously).toMatch(/^Previously on Time Runners: /)
      if (i === eps.length - 1) expect(m.next).toBeUndefined()
      else expect(m.next).toMatch(/^Next time on Time Runners/)
    })
  })

  it('opens every episode with the jump and ends each one on another (the finale lands home)', () => {
    for (const m of eps) {
      expect(m.beats[0]).toMatchObject({ kind: 'recover', fx: 'timewarp' })
      expect(m.beats[0].scene).toBeTruthy()
      expect(m.beats.at(-1).kind).toBe('finale')
      if (m.episode < 5) {
        expect(m.beats.at(-1).fx, m.id).toBe('timewarp')
        expect(lineText(m.beats.at(-1).say)).toMatch(/To be continued\.$/)
      }
    }
    expect(lineText(eps[4].beats.at(-1).say)).toMatch(/Time Runners is complete/)
  })

  it('every sound, scene and speaker it names exists', () => {
    for (const m of eps) {
      for (const b of m.beats) {
        if (b.fx) expect(STINGS[b.fx], `${m.id} ${b.at} ${b.fx}`).toBeTruthy()
        if (b.scene) expect(SCENES[b.scene], `${m.id} ${b.at} ${b.scene}`).toBeTruthy()
        if (b.spatial) expect(SPATIAL[b.spatial], `${m.id} ${b.at} ${b.spatial}`).toBeTruthy()
      }
      for (const l of speakers(m)) expect(isCast(l.who || SAGA.narrator), `${m.id}: ${l.text}`).toBe(true)
    }
  })

  it('surges build from 30 to 60 seconds, with kind lines, and every episode asks something', () => {
    const longest = eps.map((m) => Math.max(...m.beats.filter((b) => b.kind === 'surge').map((b) => b.seconds)))
    expect(longest[0]).toBe(30)
    expect(longest[3]).toBe(60)
    expect(longest[4]).toBe(60)
    for (const m of eps) {
      const surges = m.beats.filter((b) => b.kind === 'surge' && !b.unless)
      expect(surges.length, m.id).toBeGreaterThanOrEqual(3)
      expect(surges.length, m.id).toBeLessThanOrEqual(5)
      for (const b of m.beats.filter((x) => x.kind === 'surge')) {
        expect(lineText(b.okay)).toMatch(/made it|got there|clear|that is what counts/i)
        expect(b.half && b.success, `${m.id} ${b.at}`).toBeTruthy()
      }
      expect(m.beats.some((b) => b.kind === 'steady' && b.easyNudge), m.id).toBe(true)
      const choice = m.beats.find((b) => b.kind === 'choice')
      expect(choice?.default && choice?.timeout, m.id).toBeTruthy()
      const flags = choice.options.map((o) => o.flag)
      expect(m.beats.some((b) => flags.includes(b.if) || flags.includes(b.unless)), m.id).toBe(true)
      const asks = m.beats.filter((b) => b.kind === 'quiz' || b.kind === 'puzzle')
      expect(asks.length, m.id).toBeGreaterThanOrEqual(1)
      for (const q of asks) {
        expect(q.options).toHaveLength(3)
        expect(lineText(q.wrong)).not.toMatch(/\b(wrong|nope|failed|silly)\b/i)
      }
    }
  })

  it('casts each voice once, with series keys that are its own', () => {
    const ids = Object.values(TR_CAST).map((c) => c.voiceId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const [key, c] of Object.entries(TR_CAST)) expect(CAST[key]).toEqual(c)
    expect(TR_CAST['tr-hattie'].radio).toBe(true) // she talks through the watch
  })
})

describe('Time Runners: the sound kit', () => {
  it('brings at least five new stings, and each builds within its length', () => {
    expect(Object.keys(KIT.stings).length).toBeGreaterThanOrEqual(5)
    for (const name of Object.keys(KIT.stings)) {
      expect(STINGS[name]).toBe(KIT.stings[name])
      const ctx = fakeCtx()
      const end = scheduleSting(ctx, ctx.destination, name, 5)
      expect(ctx.log.started, name).toBeGreaterThan(0)
      expect(end - 5, name).toBeLessThanOrEqual(KIT.stings[name].dur + 0.01)
    }
  })

  it('its scenes play, stop cleanly, have their spots, sounds around you and a recording', () => {
    for (const name of Object.keys(KIT.scenes)) {
      const ctx = fakeCtx()
      const sc = startScene(ctx, ctx.destination, name, 5)
      expect(ctx.log.started, name).toBeGreaterThan(0)
      sc.stop(10, 2)
      expect(ctx.log.stopped, name).toBe(ctx.log.started)
      const spots = spotTimes(name, 0, 120, rng(4))
      expect(spots.length, name).toBeGreaterThan(5)
      for (const s of spots) {
        const c = fakeCtx()
        expect(() => KIT.spots[s.name]?.(c, c.destination, 5, rng(1))).not.toThrow()
      }
      expect(AROUND[name], name).toBeTruthy()
      for (const a of AROUND[name]) expect(SPATIAL[a.name], a.name).toBeTruthy()
      expect(AMBIENCE[name], name).toMatch(/no music, no voices$/)
    }
    // nothing modern drives or flies past the 1850s diggings or the old crowds
    expect(AROUND.goldfield.map((a) => a.name)).not.toContain('car')
    expect(AROUND.jubilee.map((a) => a.name)).not.toContain('helicopter')
  })

  it('its spatial sounds move around you, synthesised until the recordings arrive', () => {
    for (const [name, def] of Object.entries(KIT.spatial)) {
      const ctx = fakeCtx()
      const end = playSpatial(ctx, ctx.destination, name, 5, { r: rng(2) })
      expect(end - 5, name).toBeCloseTo(def.dur, 5)
      expect(ctx.log.started, name).toBeGreaterThan(0)
      expect(SFX[def.recorded], def.recorded).toBeTruthy()
    }
  })

  it('has its own title theme, score and chase track', () => {
    expect(THEMES.timerunners).toBe(KIT.theme)
    expect(SCORES.timerunners).toBe(KIT.score)
    expect(KIT.theme.motif).toHaveLength(7)
    expect(KIT.score.run).toHaveLength(8)
    expect(KIT.score.bass).toHaveLength(8)
    const ctx = fakeCtx()
    expect(scheduleIntro(ctx, ctx.destination, 'timerunners', 5)).toBeGreaterThan(9)
    expect(scheduleOutro(ctx, ctx.destination, 'timerunners', 5) - 5).toBeLessThan(15)
    expect(CHASE_TRACK.timerunners).toBe(LIBRARY.chase)
    expect(TRACKS[LIBRARY.chase].prompt).toMatch(/^Original .*No vocals\.$/)
  })
})

describe('Time Runners: the covers', () => {
  it('draws each episode its own cover with the time ring, and has a look in the picker', () => {
    const covers = MISSIONS.filter((m) => m.saga === 'timerunners').map(coverSvg)
    const strip = (s) => s.replace(/cv\d+/g, 'cv')
    expect(new Set(covers.map(strip)).size).toBe(5)
    for (const svg of covers) {
      expect(svg).not.toMatch(/NaN|undefined/)
      expect(svg).toContain('stroke-dasharray="2 5"') // the ring's bezel
    }
    expect(SAGA_LOOK.timerunners).toMatchObject({ accent: '#FFC83D', tag: 'Time travel adventure' })
  })
})
