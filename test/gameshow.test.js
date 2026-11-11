// Tests for Run Your Mouth, the game show: points for quick answers, sprints
// that pay more the harder you push, a hill bonus that ignores GPS wobble, a
// final score read out at the end, and the questions themselves.
import { describe, it, expect } from 'vitest'
import { GAMESHOW } from '../src/lib/missions/gameshow.js'
import { missionById, sagaById, CHAINS, MISSIONS } from '../src/lib/missions/scripts.js'
const MISSIONS_ALL = () => MISSIONS
import { createMission, lineText } from '../src/lib/missions/engine.js'
import { missionHeadline } from '../src/lib/missions/index.js'
import { isCast } from '../src/lib/missions/cast.js'
import { trainingPaces } from '../src/lib/coach/paces.js'
import { STINGS, SCENES, SCORES, THEMES } from '../src/lib/audio/soundscape.js'

const paces = trainingPaces(30 * 60)
const show = missionById('quiz-1')

// step a mission until a test says stop; pace in s/km, alt in metres (or a function of t)
function play(m, { from = 0, to, pace = 360, alt = null, onAsk = null, surgeFaster = 1.2 }) {
  const lines = [], events = []
  let dist = play.dist || 0
  for (let t = from; t <= to; t++) {
    const v = m.view()
    dist += 1000 / (v.kind === 'surge' ? pace / surgeFaster : pace)
    const out = m.update({ elapsedS: t, distanceM: dist, toStartM: 2000, altM: typeof alt === 'function' ? alt(t) : alt })
    lines.push(...out.lines); events.push(...out.events)
    const ask = m.view().ask
    if (ask && onAsk) { const a = onAsk(ask, t); if (a) { const o = m.answer(a); lines.push(...o.lines); events.push(...o.events) } }
  }
  play.dist = dist
  return { lines, events }
}

describe('Run Your Mouth', () => {
  it('is a three show series with its own cast, set and sounds', () => {
    expect(CHAINS.quiz).toEqual(['quiz-1', 'quiz-2', 'quiz-3', 'quiz-4', 'quiz-5'])
    expect(sagaById('quiz').title).toBe('Run Your Mouth')
    for (const k of ['tex', 'milly', 'announcer']) expect(isCast(k)).toBe(true)
    expect(SCENES.showfloor && SCORES.quiz && THEMES.quiz && STINGS.bonk && STINGS.cash).toBeTruthy()
    expect(SCENES.showfloor.spots).toEqual([]) // no random applause: only right answers and the host get a clap
    expect(SCORES.quiz.drone).toBe(null) // no hum under the quiz
    expect(THEMES.quiz.jingle).toBe(true) // opens with a jingle, not the cinematic cold open
    expect(STINGS.applause).toBeTruthy()
  })

  it('a quick right answer is worth more than a slow one', () => {
    const scores = []
    for (const delay of [1, 18]) {
      play.dist = 0
      const m = createMission(show, { paces })
      let asked = null
      play(m, { to: 400, onAsk: (ask, t) => { if (asked == null) asked = t; return t - asked >= delay ? 'B' : null } })
      scores.push(m.view().score)
    }
    expect(scores[0]).toBeGreaterThan(scores[1])
    expect(scores[0]).toBeGreaterThanOrEqual(900)
  })

  it('sprints pay more the harder you push', () => {
    const got = []
    for (const faster of [1.05, 1.12, 1.3]) {
      play.dist = 0
      const m = createMission(show, { paces })
      const { events } = play(m, { to: 700, onAsk: () => null, surgeFaster: faster })
      got.push(events.find((e) => e.type === 'surge-end').points)
    }
    expect(got[0]).toBeLessThan(got[1])
    expect(got[1]).toBeLessThan(got[2])
    expect(got[0]).toBeGreaterThan(0) // never nothing for having a go
  })

  it('climbing earns points, and GPS wobble on the flat earns nothing', () => {
    play.dist = 0
    const flat = createMission(show, { paces })
    play(flat, { to: 600, alt: (t) => 40 + 2.5 * Math.sin(t / 7) })
    expect(flat.view().climbM).toBe(0) // the score so far is all sprint points

    play.dist = 0
    const hill = createMission(show, { paces })
    const { lines, events } = play(hill, { to: 600, alt: (t) => 40 + Math.min(30, t / 10) })
    expect(hill.view().climbM).toBeGreaterThanOrEqual(27)
    expect(hill.view().score - flat.view().score).toBeGreaterThanOrEqual(27 * show.climbPoints - 10)
    expect(events.filter((e) => e.type === 'climb').length).toBeGreaterThan(3)
    expect(lines.some((l) => show.hillLines.includes(lineText(l)))).toBe(true)
  })

  it('reads out the final score at the end', () => {
    play.dist = 0
    const m = createMission(show, { paces })
    const { lines } = play(m, { to: 1700, onAsk: (ask) => ask.options[0].key })
    const last = lineText(lines.at(-1))
    const s = m.finish().summary
    expect(last).toMatch(new RegExp(`You got ${s.quizRight} of ${s.quizTotal} right and finished on ${s.score.toLocaleString('en-AU')} points`))
    expect(s.closing).toBe(last)
    expect(missionHeadline(s)).toMatch(/points$/)
  })

  it('every question has a right answer, and a wrong answer always tells you it, kindly', () => {
    for (const m of GAMESHOW) {
      const qs = m.beats.filter((b) => b.kind === 'quiz')
      expect(qs.length, m.id).toBeGreaterThanOrEqual(7)
      for (const b of qs) {
        const answer = b.options.find((o) => o.key === b.answer).label
        const key = answer.replace(/^(The|First) /, '').split(' ')[0]
        expect(lineText(b.wrong), b.say).toMatch(new RegExp(key, 'i'))
        expect(lineText(b.wrong)).not.toMatch(/\b(stupid|dumb|idiot|loser|terrible|wrong)\b/i)
        expect(b.points).toBeGreaterThanOrEqual(500)
      }
      expect(m.beats.filter((b) => b.kind === 'surge').every((b) => b.points > 0)).toBe(true)
    }
  })
})

describe('pacing', () => {
  it('each show runs about as long as the picker says, answering promptly', () => {
    for (const m of GAMESHOW) {
      const mm = createMission(m, { paces })
      let d = 0, asked = null, t = 0
      for (; t < 3000 && !mm.view().done; t++) {
        d += 1000 / (mm.view().kind === 'surge' ? 300 : 360)
        mm.update({ elapsedS: t, distanceM: d, toStartM: 2000 })
        const a = mm.view().ask
        if (a) { if (asked == null) asked = t; if (t - asked >= 8) { mm.answer(a.options[0].key); asked = null } }
      }
      expect(Math.abs(t / 60 - m.minutes), m.id).toBeLessThanOrEqual(3)
    }
  })

  it('someone is talking at least every 45 seconds when you answer promptly', () => {
    for (const m of GAMESHOW) {
      play.dist = 0
      const mm = createMission(m, { paces })
      const said = []
      let asked = null
      let t = 0
      for (; t <= m.beats.at(-1).at + 300; t++) {
        play.dist += 1000 / (mm.view().kind === 'surge' ? 300 : 360)
        const out = mm.update({ elapsedS: t, distanceM: play.dist, toStartM: 2000 })
        if (out.lines.length) said.push(t)
        const ask = mm.view().ask
        if (ask) {
          if (asked == null) asked = t
          if (t - asked >= 6) { if (mm.answer(ask.options[0].key).lines.length) said.push(t); asked = null }
        }
        if (mm.view().done) break
      }
      const gaps = said.slice(1).map((x, i) => x - said[i])
      // a sprint is the only long quiet stretch, and it has a timer on screen
      const quiet = gaps.filter((g) => g > 45)
      expect(quiet.length, `${m.id}: ${gaps.join(',')}`).toBeLessThanOrEqual(m.beats.filter((b) => b.kind === 'surge').length)
      expect(Math.max(...gaps), m.id).toBeLessThanOrEqual(110)
    }
  })
})

describe('the next episode', async () => {
  const { nextEpisode } = await import('../src/lib/audio/runAudio.js')
  it('knows what comes next in each series, and that a finale has nothing after it', () => {
    expect(nextEpisode('quiz-1').id).toBe('quiz-2')
    expect(nextEpisode('ember-tower').id).toBe('ember-dawn')
    expect(nextEpisode('heist-ferry').id).toBe('heist-vivid')
    expect(nextEpisode('heist-vivid')).toBe(null)
    expect(nextEpisode('first-steps').id).toBe('supply-line')
    expect(nextEpisode('steady-scout')).toBe(null)
  })
})

describe('the ad break clock', () => {
  it('ticks through every ad break, beeps the last ten seconds, and Tex calls ten seconds', () => {
    const m = createMission(show, { paces: trainingPaces(30 * 60) })
    play.dist = 0
    const seen = []
    let said = null
    for (let t = 0; t <= 600; t++) {
      const v = m.view()
      const out = m.update({ elapsedS: t, distanceM: (play.dist += v.kind === 'surge' ? 4 : 3), toStartM: 2000 })
      const now = m.view()
      if (now.kind === 'surge') seen.push({ t, left: now.remainingS, clock: now.clock })
      for (const l of out.lines) if (lineText(l) === 'Ten seconds! Give it everything!') said = { t, left: m.view().remainingS }
      const ask = m.view().ask
      if (ask) m.answer(ask.options[0].key)
    }
    expect(seen.length).toBeGreaterThan(20)
    expect(seen.every((s) => s.clock)).toBe(true)
    expect(said).toBeTruthy()
    expect(said.left).toBeLessThanOrEqual(11)
    expect(said.left).toBeGreaterThanOrEqual(7)
  })

  it('picks the right sound for each second', async () => {
    const { clockSound } = await import('../src/lib/audio/runAudio.js')
    expect(clockSound(30)).toBe('tick')
    expect(clockSound(11)).toBe('tick')
    expect(clockSound(10)).toBe('countbeep')
    expect(clockSound(4)).toBe('countbeep')
    expect(clockSound(3)).toBe('countfinal')
    expect(clockSound(1)).toBe('countfinal')
    expect(clockSound(0)).toBe(null)
    for (const n of ['tick', 'countbeep', 'countfinal']) expect(STINGS[n]).toBeTruthy()
  })

  it('only the game show ad breaks tick, not story surges', () => {
    const story = MISSIONS_ALL().find((x) => x.id === 'penrith-emuhall')
    expect(story.beats.filter((b) => b.kind === 'surge').some((b) => b.clock)).toBe(false)
  })
})
