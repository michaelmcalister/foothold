// Tests for the thriller missions (Ember Run, The Night Job): the cast and
// script rules, the engine passing speakers and effects through, the lines
// gathered before a run, the server's cast voices, and the soundscape
// (scenes, effects and the score) on a fake AudioContext.
import { describe, it, expect } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { MISSIONS, SAGAS, CHAINS, missionById, unlockedBy, sagaById } from '../src/lib/missions/scripts.js'
import { THRILLERS } from '../src/lib/missions/thrillers.js'
import { createMission, lineText, surgeCount } from '../src/lib/missions/engine.js'
import { CAST, isCast, stripTags } from '../src/lib/missions/cast.js'
import { trainingPaces } from '../src/lib/coach/paces.js'
import { THEMES, scheduleIntro, scheduleOutro, INTRO_S, SCENES, STINGS, SCORES, musicStep, stepSeconds, spotTimes, rng, startScene, scheduleSting, createSoundscape, intensityFor } from '../src/lib/audio/soundscape.js'
import { handleTts, STORY_MODEL } from '../worker/tts.js'

const paces = trainingPaces(30 * 60)

// Minimal D1 stand-in for the rate limiter (as in tts.test.js)
function fakeDb() {
  const db = new DatabaseSync(':memory:')
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  return { prepare: (sql) => ({ bind: (...a) => ({ first: async () => db.prepare(sql).get(...a) ?? null, run: async () => db.prepare(sql).run(...a), all: async () => ({ results: db.prepare(sql).all(...a) }) }) }) }
}

function run(script, { paceS = 360, surge = 1.2 } = {}) {
  const m = createMission(script, { paces })
  const lines = []
  const events = []
  let dist = 0
  for (let t = 0; t <= script.beats.at(-1).at + 900; t++) {
    const out = m.update({ elapsedS: t, distanceM: dist, toStartM: 2000 })
    lines.push(...out.lines)
    events.push(...out.events)
    dist += 1000 / (m.view().kind === 'surge' ? paceS / surge : paceS)
  }
  return { m, lines, events }
}

// every line in a script, with the speaker it ends up with
function speakers(m) {
  const out = []
  const add = (l, who) => l && out.push({ text: typeof l === 'string' ? l : l.text, who: (typeof l === 'object' && l.who) || who || null })
  add(m.loop); add(m.early)
  for (const b of m.beats) { add(b.say, b.who); for (const k of ['success', 'okay', 'half', 'easyNudge']) add(b[k], b.who) }
  return out
}

describe('thriller scripts', () => {
  it('has two four episode series that unlock in order', () => {
    for (const id of ['ember', 'heist']) {
      const eps = MISSIONS.filter((m) => m.saga === id)
      expect(eps).toHaveLength(4)
      expect(CHAINS[id]).toEqual(eps.map((m) => m.id))
      expect(unlockedBy(eps[0].id)).toBe(null)
      expect(unlockedBy(eps[2].id).id).toBe(eps[1].id)
      expect(eps.at(-1).minutes).toBeGreaterThan(eps[0].minutes) // they build up
    }
    expect(sagaById('ember').note).toMatch(/fire service/) // a real world reminder
  })

  it('every speaker is in the cast, and every effect and scene exists', () => {
    for (const m of THRILLERS) {
      const narrator = sagaById(m.saga).narrator
      expect(isCast(narrator)).toBe(true)
      for (const l of speakers(m)) expect(isCast(l.who || narrator), `${m.id}: ${l.text}`).toBe(true)
      for (const b of m.beats) {
        if (b.fx) expect(STINGS[b.fx], `${m.id} ${b.at} ${b.fx}`).toBeTruthy()
        if (b.scene) expect(SCENES[b.scene], `${m.id} ${b.at} ${b.scene}`).toBeTruthy()
      }
      expect(m.beats[0].scene, `${m.id} sets a scene at the start`).toBeTruthy()
    }
  })

  it('only uses performance cues the expressive voice knows, and lines fit the server limit', () => {
    const known = new Set(['whispers', 'laughs', 'sighs', 'excited', 'curious', 'sarcastic', 'mischievously'])
    for (const m of THRILLERS) {
      for (const l of speakers(m)) {
        for (const [, tag] of l.text.matchAll(/\[([^\]]+)\]/g)) expect(known.has(tag), `${tag} in ${l.text}`).toBe(true)
        expect(l.text.length).toBeLessThanOrEqual(300)
        expect(stripTags(l.text)).not.toMatch(/\[|\]/)
      }
    }
  })

  it('keeps it kind: slow surges are never judged, and each series ends somewhere safe', () => {
    for (const m of THRILLERS) {
      for (const b of m.beats.filter((x) => x.kind === 'surge')) expect(lineText(b.okay)).toMatch(/made it|got there|clear|that is what counts/i)
    }
    expect(lineText(missionById('ember-dawn').beats.at(-1).say)).toMatch(/made it through/)
    expect(lineText(missionById('ember-dawn').beats.find((b) => b.at === 1800).say)).toMatch(/Every person in Wattle Creek is safe/)
  })

  it('every cast member has a voice and a phone fallback', () => {
    for (const [key, c] of Object.entries(CAST)) {
      expect(c.voiceId, key).toMatch(/^[A-Za-z0-9]{20}$/)
      expect(c.pitch).toBeGreaterThan(0.5)
      expect(c.rate).toBeGreaterThan(0.5)
    }
    expect(stripTags('[whispers] Go. [laughs] Now.')).toBe('Go. Now.')
  })
})

describe('the engine with a cast', () => {
  it('passes speakers, effects and scenes through', () => {
    const ep = missionById('heist-gala')
    const { m, lines, events } = run(ep)
    const reg = lines.find((l) => typeof l === 'object' && l.who === 'reg')
    expect(reg.text).toMatch(/Reg, night security/)
    expect(lines.some((l) => l.fx === 'alarm' && l.who === 'viv')).toBe(true)
    expect(events.filter((e) => e.type === 'scene').map((e) => e.scene)).toEqual(['city', 'tower', 'gala', 'tower', 'city'])
    // surge results keep their own speaker; narrator lines have none (the app fills it in)
    expect(lines.some((l) => l.who === 'viv' && /Clean getaway|Bit close/.test(l.text))).toBe(true)
    expect(lines.some((l) => l.who === null && /^The study/.test(l.text))).toBe(true)
    const s = m.finish().summary
    expect(s.completed).toBe(true)
    expect(s.surgesDone).toBe(surgeCount(ep))
    expect(s.closing).not.toMatch(/\[/) // the result screen shows words, not cues
  })

  it('finishing early says the series goodbye in a character voice', () => {
    const ep = missionById('ember-wind')
    const m = createMission(ep, { paces })
    m.update({ elapsedS: 0, distanceM: 0 })
    m.update({ elapsedS: 100, distanceM: 300 })
    const out = m.finish()
    expect(out.lines.at(-1)).toEqual({ text: ep.early.text, who: 'jo', fx: null })
    expect(out.summary.closing).toBe(ep.early.text)
  })

  it('the old missions still speak plain text', () => {
    const { lines } = run(missionById('first-steps'))
    expect(lines.every((l) => typeof l === 'string')).toBe(true)
  })
})

describe('server cast voices', () => {
  const env = { ELEVENLABS_API_KEY: 'k', DB: null }
  const req = (body) => new Request('https://x/api/tts', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '9.9.9.9' }, body: JSON.stringify(body) })
  it('speaks a cast line with its own voice and the expressive model', async () => {
    const calls = []
    const fetcher = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response(new Uint8Array([1, 2, 3]), { status: 200 }) }
    const res = await handleTts(req({ text: '[whispers] Swap them.', voice: 'viv' }), { ...env, DB: fakeDb() }, { fetcher, cache: null })
    expect(res.status).toBe(200)
    expect(calls[0].url).toContain(CAST.viv.voiceId)
    expect(calls[0].body).toMatchObject({ model_id: STORY_MODEL, text: '[whispers] Swap them.' })
  })

  it('falls back to the steady model, without the cues, if the expressive one says no', async () => {
    const calls = []
    const fetcher = async (url, init) => {
      calls.push(JSON.parse(init.body))
      return calls.length === 1 ? new Response('no', { status: 400 }) : new Response(new Uint8Array([1]), { status: 200 })
    }
    const res = await handleTts(req({ text: '[laughs] Beauty.', voice: 'bluey' }), { ...env, DB: fakeDb() }, { fetcher, cache: null })
    expect(res.status).toBe(200)
    expect(calls[1]).toMatchObject({ model_id: 'eleven_multilingual_v2', text: 'Beauty.' })
  })

  it('an unknown voice is the coach voice, never a cast member', async () => {
    const calls = []
    const fetcher = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response(new Uint8Array([1]), { status: 200 }) }
    await handleTts(req({ text: 'Hi.', voice: 'toString' }), { ...env, DB: fakeDb() }, { fetcher, cache: null })
    expect(calls[0].body.model_id).not.toBe(STORY_MODEL)
  })
})

// ---- a fake AudioContext ----
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

describe('soundscape', () => {
  it('every scene and effect builds cleanly', () => {
    for (const name of Object.keys(SCENES)) {
      const ctx = fakeCtx()
      const sc = startScene(ctx, ctx.destination, name, 5)
      expect(ctx.log.started, name).toBeGreaterThan(0)
      sc.stop(10, 2)
      expect(ctx.log.stopped, name).toBe(ctx.log.started) // nothing left running
    }
    for (const name of Object.keys(STINGS)) {
      const ctx = fakeCtx()
      const end = scheduleSting(ctx, ctx.destination, name, 5)
      expect(end - 5, name).toBeLessThanOrEqual(STINGS[name].dur + 0.01)
    }
  })

  it('scene spots come at about their rate, from a repeatable random source', () => {
    const a = spotTimes('fire', 0, 60, rng(3))
    const b = spotTimes('fire', 0, 60, rng(3))
    expect(a).toEqual(b)
    const crackles = a.filter((s) => s.name === 'crackle').length
    expect(crackles).toBeGreaterThan(200)
    expect(crackles).toBeLessThan(400)
    expect(a.every((s) => s.at >= 0 && s.at <= 60)).toBe(true)
    expect(spotTimes('nowhere', 0, 10, rng(1))).toEqual([])
  })

  it('the score builds from a drone to a chase and back', () => {
    for (const score of Object.keys(SCORES)) {
      const bar = (lvl) => Array.from({ length: 64 }, (_, i) => musicStep(score, lvl, i)).flat()
      const calm = bar(0), tense = bar(1), chase = bar(2), lift = bar(3)
      expect(calm.every((n) => n.inst === 'pad')).toBe(true)
      expect(tense.some((n) => n.inst === 'bass')).toBe(true)
      expect(chase.length).toBeGreaterThan(tense.length * 1.8)
      expect(chase.some((n) => n.inst === 'run')).toBe(true)
      expect(lift.some((n) => n.inst === 'bell')).toBe(true)
      expect(stepSeconds(score, 2)).toBeLessThan(stepSeconds(score, 1)) // the chase is faster
      for (const n of chase) expect(n.peak).toBeLessThan(0.25) // the score stays under the voice
    }
  })

  it('surges drive the score, and it settles after', () => {
    let lvl = 0
    const seq = ['chapter', 'surge-start', 'surge-end', 'recover-start', 'steady-start', 'finale'].map((e) => (lvl = intensityFor(e, lvl)))
    expect(seq).toEqual([1, 2, 1, 0, 1, 3])
  })

  it('plays, ducks under the voice and fades out', async () => {
    const ctx = fakeCtx()
    const s = createSoundscape(ctx, ctx.destination, { score: 'heist', seed: 2 })
    s.start()
    s.setScene('gala')
    s.setIntensity(2)
    s.duck(true)
    expect(s.state).toEqual({ scene: 'gala', intensity: 2, ducked: true })
    s.duck(false)
    s.setScene('nowhere') // ignored
    expect(s.state.scene).toBe('gala')
    s.stop(0.01)
    expect(ctx.log.started).toBeGreaterThan(5) // the scene beds and the opening drone
  })

  it('opens each episode with title music and closes it with the end theme', () => {
    for (const name of Object.keys(THEMES)) {
      const ctx = fakeCtx()
      const voiceAt = scheduleIntro(ctx, ctx.destination, name, 5)
      expect(voiceAt - 5).toBeGreaterThan(4) // the narrator comes in after the big hit
      expect(voiceAt - 5).toBeLessThan(INTRO_S)
      const end = scheduleOutro(ctx, ctx.destination, name, 5)
      expect(end - 5).toBeGreaterThan(5)
      expect(end - 5).toBeLessThan(15)
    }
  })

  it('the score holds off while the title music plays', async () => {
    const ctx = fakeCtx()
    const s = createSoundscape(ctx, ctx.destination, { score: 'ember', seed: 3 })
    s.start()
    const before = ctx.log.started
    const p = s.intro()
    expect(ctx.log.started).toBeGreaterThan(before + 20) // the whole cold open is scheduled at once
    s.stop(0.01)
    await Promise.race([p, new Promise((r) => setTimeout(r, 10))])
  })
})

describe('episode framing', () => {
  it('every episode has a number, a "Previously on" from episode two and a "Next time" until the last', () => {
    for (const id of ['ember', 'heist']) {
      const eps = MISSIONS.filter((m) => m.saga === id)
      eps.forEach((m, i) => {
        expect(m.episode).toBe(i + 1)
        if (i === 0) expect(m.previously).toBeUndefined()
        else expect(m.previously).toMatch(new RegExp(`^Previously on ${sagaById(id).title}: `))
        if (i === eps.length - 1) expect(m.next).toBeUndefined()
        else expect(m.next).toMatch(new RegExp(`^Next time on ${sagaById(id).title}`))
        for (const l of [m.previously, m.next].filter(Boolean)) {
          expect(l.length).toBeLessThanOrEqual(180)
          expect(l).not.toMatch(/[‒–—―]|--/)
        }
      })
    }
  })

  it('reads the title card and teasers in the narrator voice, ready before the run', async () => {
    const { episodeLines, missionLines } = await import('../src/lib/audio/runAudio.js')
    const ep = missionById('heist-cross')
    const saga = sagaById('heist')
    expect(episodeLines(ep, saga).title).toBe('The Night Job. Episode 3. The Double Cross.')
    const lines = missionLines(ep, saga.narrator, saga)
    expect(lines.slice(0, 3).map((l) => l.who)).toEqual(['heist-narrator', 'heist-narrator', 'heist-narrator'])
    expect(lines.some((l) => l.text === ep.next)).toBe(true)
    expect(episodeLines(missionById('first-steps'), sagaById('trailkeepers')).title).toBe(null)
  })
})


describe('choices, quizzes and puzzles', () => {
  // run until the first question is up, then hand back control
  function upTo(script, kind) {
    const m = createMission(script, { paces })
    let t = 0, dist = 0
    const lines = []
    while (t < 4000) {
      const out = m.update({ elapsedS: t, distanceM: dist, toStartM: 2000 })
      lines.push(...out.lines)
      if (m.view().ask?.kind === kind) break
      t++
      dist += 1000 / 360
    }
    return { m, t, dist, lines }
  }

  it('a choice changes what comes next', () => {
    const ep = missionById('heist-recruit')
    for (const [key, want, not] of [['B', /Observatory Hill and through the park/, /Argyle Cut and down the steps/], ['A', /Argyle Cut and down the steps/, /Observatory Hill and through the park/]]) {
      let { m, t, dist } = upTo(ep, 'choice')
      expect(m.view().ask.options.map((o) => o.label)).toEqual(['The Argyle Cut', 'Observatory Hill'])
      const ans = m.answer(key)
      expect(ans.events[0]).toMatchObject({ type: 'answer', kind: 'choice', key, timedOut: false })
      const later = []
      for (; t < 1000; t++) { dist += 1000 / 300; later.push(...m.update({ elapsedS: t, distanceM: dist, toStartM: 2000 }).lines.map(lineText)) }
      expect(later.some((l) => want.test(l))).toBe(true)
      expect(later.some((l) => not.test(l))).toBe(false)
    }
  })

  it('the story waits for an answer, then answers for you and carries on', () => {
    const ep = missionById('ember-smoke')
    let { m, t, dist } = upTo(ep, 'choice')
    const asked = t
    let said = null
    for (; t < asked + 60; t++) {
      dist += 1000 / 360
      const out = m.update({ elapsedS: t, distanceM: dist, toStartM: 2000 })
      if (out.lines.length && !said) said = { t, line: out.lines[0] }
      if (t < asked + 29) expect(m.view().ask).toBeTruthy()
    }
    expect(said.t - asked).toBeGreaterThanOrEqual(30)
    expect(lineText(said.line)).toMatch(/radioed Bluey myself/) // the default, said kindly
    expect(m.finish().summary.choices).toEqual([{ id: 'chooks', key: 'B', label: 'Radio Bluey', timedOut: true }])
  })

  it('quizzes and puzzles keep score, and both answers are kind', () => {
    const ep = missionById('heist-gala')
    let { m } = upTo(ep, 'puzzle')
    expect(m.view().ask.question).toMatch(/yacht is called Regal/)
    const out = m.answer('A')
    expect(out.events[0]).toMatchObject({ kind: 'puzzle', right: true })
    expect(lineText(out.lines[0])).toMatch(/Lager/)
    expect(m.answer('A').lines).toEqual([]) // nothing open now
    const s = m.finish().summary
    expect(s).toMatchObject({ quizRight: 1, quizTotal: 1 })
    for (const mm of THRILLERS) for (const b of mm.beats.filter((x) => x.kind !== 'choice' && x.options)) {
      expect(lineText(b.wrong)).not.toMatch(/\b(wrong|no{1}pe|failed|silly)\b/i)
      expect(lineText(b.wrong)).toMatch(new RegExp(b.options.find((o) => o.key === b.answer).label.replace(/^The /, ''), 'i')) // it tells you the answer
    }
  })

  it('every thriller episode asks at least one thing, and every flag a beat needs can be set', () => {
    for (const m of THRILLERS) {
      expect(m.beats.some((b) => b.options), m.id).toBe(true)
      const flags = new Set(m.beats.flatMap((b) => (b.options || []).map((o) => o.flag)).filter(Boolean))
      for (const b of m.beats) for (const f of [b.if, b.unless].filter(Boolean)) expect(flags.has(f), `${m.id} ${b.at} ${f}`).toBe(true)
    }
  })
})

describe('answering out loud', async () => {
  const { matchAnswer, optionsPrompt } = await import('../src/lib/audio/listen.js')
  const two = [{ key: 'A', label: 'The fire trail' }, { key: 'B', label: 'The main road' }]
  const years = [{ key: 'A', label: '1923' }, { key: 'B', label: '1932' }, { key: 'C', label: '1942' }]

  it('hears letters, order and the words of an option', () => {
    expect(matchAnswer('A', two)).toBe('A')
    expect(matchAnswer('bee', two)).toBe('B')
    expect(matchAnswer('option b please', two)).toBe('B')
    expect(matchAnswer('the second one', two)).toBe('B')
    expect(matchAnswer('fire trail', two)).toBe('A')
    expect(matchAnswer("let's take the main road", two)).toBe('B')
    expect(matchAnswer('1932', years)).toBe('B')
    expect(matchAnswer('I think it was 1932', years)).toBe('B')
    expect(matchAnswer('see', years)).toBe('C')
  })

  it("doesn't guess when it isn't clear", () => {
    expect(matchAnswer('', two)).toBe(null)
    expect(matchAnswer('the road or the trail', two)).toBe(null)
    expect(matchAnswer('banana', two)).toBe(null)
  })

  it('reads the options out plainly', () => {
    expect(optionsPrompt(two)).toBe('Say A for the fire trail, or B for the main road.')
    expect(optionsPrompt([{ key: 'A', label: 'Radio Bluey' }, { key: 'B', label: 'Carry the cage' }])).toBe('Say A for radio Bluey, or B for carry the cage.')
  })
})

describe('listening keeps going', async () => {
  const { listenFor, listening, listenProblem } = await import('../src/lib/audio/listen.js')
  it('starts again when the phone stops listening early, and hears the answer the second time', async () => {
    let n = 0
    class FakeRecognition {
      start() {
        n++
        const me = this
        setTimeout(() => (n === 1 ? me.onend?.() : me.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: 'option b' }], { isFinal: true })] })), 5)
      }
      abort() {}
    }
    globalThis.window = { SpeechRecognition: FakeRecognition }
    const key = await listenFor([{ key: 'A', label: 'Yes' }, { key: 'B', label: 'No' }], { timeoutMs: 2000 })
    expect(key).toBe('B')
    expect(n).toBe(2)
    expect(listening.value).toBe(false)
  })
  it('explains when the phone won’t allow it', async () => {
    class Refused { start() { setTimeout(() => this.onerror?.({ error: 'not-allowed' }), 5) } abort() {} }
    globalThis.window = { SpeechRecognition: Refused }
    expect(await listenFor([{ key: 'A', label: 'Yes' }, { key: 'B', label: 'No' }], { timeoutMs: 2000 })).toBe(null)
    expect(listenProblem.value).toMatch(/Microphone and Speech Recognition/)
    delete globalThis.window
  })
})
