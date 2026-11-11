// Tests for the ten Australia wide series (missions/series/tiger.js and
// friends, laid out by compose.js): five episodes each, chained in order,
// recapped and teased, set in real places, full of trivia whose replies name
// the answer, one choice per episode sending each branch to its own surge,
// speakers and sounds that exist, kind surge lines, and a cover each.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, sagaById, unlockedBy } from '../src/lib/missions/scripts.js'
import { CAST } from '../src/lib/missions/cast.js'
import { STINGS, SCENES } from '../src/lib/audio/soundscape.js'
import { SPATIAL } from '../src/lib/audio/spatial.js'
import { coverSvg, SAGA_LOOK } from '../src/lib/missions/covers.js'
import { SERIES } from '../src/lib/missions/series/index.js'
import { compose, say, quiz, dash, steady, choice, line } from '../src/lib/missions/series/compose.js'

const AUSTRALIA = ['tiger', 'mahogany', 'catalpa', 'minmin', 'opal', 'tunnels', 'canberra', 'panther', 'hawkesbury', 'nugget']
const live = AUSTRALIA.filter((id) => SERIES.some((s) => s.SAGA.id === id))
const eps = (saga) => MISSIONS.filter((m) => m.saga === saga)

describe('compose.js', () => {
  it('lays out a story in order, with the finale near the end', () => {
    const r = { success: line('g', 'Yes'), okay: line('g', 'You made it'), half: line('g', 'Half') }
    const m = compose({ id: 'x', guide: 'g', results: r, easy: line('g', 'Easy'), open: { scene: 'bush', chapter: 'A', text: 'Go.' },
      steps: [say(null, 'One'), quiz('g', 'Q?', ['Right', 'No', 'Nah'], 'Fact.'), dash(30, 'Run!'), steady('Steady.'),
        choice('g', 'c', 'Which?', { label: 'A', line: 'a', dash: 'A!', after: 'After A' }, { label: 'B', line: 'b', dash: 'B!', after: 'After B' }, 'A then')],
      finale: 'Done.' })
    const at = m.beats.map((b) => b.at)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    expect(m.beats[0]).toMatchObject({ kind: 'recover', scene: 'bush' })
    const q = m.beats.find((b) => b.kind === 'quiz')
    expect(q.options.find((o) => o.key === q.answer).label).toBe('Right')
    expect(q.right.text).toContain('Right')
    expect(q.wrong.text).toContain('Right')
    const end = m.beats.at(-1)
    expect(end.kind).toBe('finale')
    expect(end.at).toBeGreaterThan(m.minutes * 60 - 180)
    expect(end.at).toBeLessThanOrEqual(m.minutes * 60 + 60)
    expect(m.beats.filter((b) => b.kind === 'surge' && (b.if === 'c-a' || b.unless === 'c-a'))).toHaveLength(2)
  })
})

describe('the Australia wide series', () => {
  it('are on their way', () => expect(live.length).toBeGreaterThan(0))

  for (const saga of live) {
    describe(saga, () => {
      it('has five episodes, chained in order, each recapped and teased', () => {
        const list = eps(saga)
        expect(list).toHaveLength(5)
        expect(CHAINS[saga]).toEqual(list.map((m) => m.id))
        expect(unlockedBy(list[0].id)).toBe(null)
        for (let i = 1; i < 5; i++) expect(unlockedBy(list[i].id).id).toBe(list[i - 1].id)
        const title = sagaById(saga).title
        for (const m of list.slice(1)) expect(m.previously, m.id).toMatch(new RegExp(`^Previously on ${title}`))
        for (const m of list.slice(0, 4)) expect(m.next, m.id).toMatch(new RegExp(`^Next time on ${title}`))
        for (const m of list) expect(m.place?.lat, m.id).toBeTypeOf('number')
        expect(sagaById(saga)).toMatchObject({ isNew: true })
        expect(SAGA_LOOK[saga]).toBeTruthy()
      })

      it('is full of trivia, every reply names the answer, and labels fit', () => {
        for (const m of eps(saga)) {
          const qs = m.beats.filter((b) => b.kind === 'quiz')
          expect(qs.length, m.id).toBeGreaterThanOrEqual(4)
          for (const q of qs) {
            for (const o of q.options) expect(o.label.length, o.label).toBeLessThanOrEqual(28)
            const label = q.options.find((o) => o.key === q.answer).label.toLowerCase()
            expect(q.right.text.toLowerCase()).toContain(label)
            expect(q.wrong.text.toLowerCase()).toContain(label)
          }
        }
      })

      it('sends each choice to exactly one surge, and uses real speakers and sounds', () => {
        for (const m of eps(saga)) {
          const c = m.beats.find((b) => b.kind === 'choice')
          for (const o of c.options) expect(o.label.length).toBeLessThanOrEqual(28)
          expect(m.beats.filter((b) => b.kind === 'surge' && (b.if === c.options[0].flag || b.unless === c.options[0].flag))).toHaveLength(2)
          expect(m.beats.filter((b) => b.kind === 'surge').length).toBeGreaterThanOrEqual(3)
          expect(m.beats.some((b) => b.spatial), m.id).toBe(true)
          for (const b of m.beats) {
            if (b.who) expect(CAST[b.who], `${m.id} ${b.who}`).toBeTruthy()
            if (b.fx) expect(STINGS[b.fx], `${m.id} ${b.fx}`).toBeTruthy()
            if (b.scene) expect(SCENES[b.scene], `${m.id} ${b.scene}`).toBeTruthy()
            if (b.spatial) expect(SPATIAL[b.spatial], `${m.id} ${b.spatial}`).toBeTruthy()
          }
          expect(coverSvg(m)).toContain('<svg')
        }
      })
    })
  }
})
