// Tests for The Nobbys Signal (missions/series/nobbys.js), a series still
// being written one episode at a time: its episodes chain in order, are
// teased and recapped, sit in real places, carry trivia whose replies name
// the answer, send the choice to one surge per branch, and use speakers,
// sounds and a cover that exist. When it reaches five episodes, move it into
// the AUSTRALIA list in australia.test.js.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, sagaById, unlockedBy } from '../src/lib/missions/scripts.js'
import { CAST } from '../src/lib/missions/cast.js'
import { SCENES, canSting } from '../src/lib/audio/soundscape.js'
import { SPATIAL } from '../src/lib/audio/spatial.js'
import { coverSvg, SAGA_LOOK } from '../src/lib/missions/covers.js'

const eps = MISSIONS.filter((m) => m.saga === 'nobbys')
const title = 'The Nobbys Signal'

describe('The Nobbys Signal', () => {
  it('starts with Three Flashes, chained in order, teased and recapped', () => {
    expect(eps[0]).toMatchObject({ id: 'nobbys-flashes', episode: 1, title: 'Three Flashes' })
    expect(CHAINS.nobbys).toEqual(eps.map((m) => m.id))
    expect(unlockedBy(eps[0].id)).toBe(null)
    for (let i = 1; i < eps.length; i++) {
      expect(unlockedBy(eps[i].id).id).toBe(eps[i - 1].id)
      expect(eps[i].previously, eps[i].id).toMatch(new RegExp(`^Previously on ${title}`))
    }
    for (const m of eps.slice(0, -1)) expect(m.next, m.id).toMatch(new RegExp(`^Next time on ${title}`))
    for (const m of eps) expect(m.place?.lat, m.id).toBeTypeOf('number')
    expect(eps[0].next).toMatch(new RegExp(`^Next time on ${title}`))
    expect(sagaById('nobbys')).toMatchObject({ title, isNew: true })
    expect(SAGA_LOOK.nobbys).toBeTruthy()
  })

  it('is full of trivia, every reply names the answer, and labels fit', () => {
    for (const m of eps) {
      const qs = m.beats.filter((b) => b.kind === 'quiz')
      expect(qs.length, m.id).toBeGreaterThanOrEqual(4)
      expect(qs.length, m.id).toBeLessThanOrEqual(6)
      for (const q of qs) {
        for (const o of q.options) expect(o.label.length, o.label).toBeLessThanOrEqual(28)
        const label = q.options.find((o) => o.key === q.answer).label.toLowerCase()
        expect(q.right.text.toLowerCase()).toContain(label)
        expect(q.wrong.text.toLowerCase()).toContain(label)
      }
    }
  })

  it('sends the choice to one surge per branch, and uses real speakers, sounds and a cover', () => {
    for (const m of eps) {
      const c = m.beats.find((b) => b.kind === 'choice')
      for (const o of c.options) expect(o.label.length).toBeLessThanOrEqual(28)
      expect(m.beats.filter((b) => b.kind === 'surge' && (b.if === c.options[0].flag || b.unless === c.options[0].flag))).toHaveLength(2)
      expect(m.beats.filter((b) => b.kind === 'surge').length).toBeGreaterThanOrEqual(3)
      expect(m.beats.some((b) => b.spatial), m.id).toBe(true)
      for (const b of m.beats) {
        if (b.who) expect(CAST[b.who], `${m.id} ${b.who}`).toBeTruthy()
        if (b.fx) expect(canSting(b.fx), `${m.id} ${b.fx}`).toBeTruthy()
        if (b.scene) expect(SCENES[b.scene], `${m.id} ${b.scene}`).toBeTruthy()
        if (b.spatial) expect(SPATIAL[b.spatial], `${m.id} ${b.spatial}`).toBeTruthy()
      }
      expect(coverSvg(m)).toContain('<svg')
    }
  })

  it('keeps every line short and kind', () => {
    const banned = /\b(kill|blood|dead|die|scary|lazy|failed|failure|pathetic|should have|disappoint\w*|zombie|weak)\b/i
    for (const m of eps) {
      const texts = m.beats.flatMap((b) => [b.say, b.right?.text, b.wrong?.text, b.success?.text, b.okay?.text, b.half?.text, b.timeout?.text,
        ...(b.options || []).map((o) => o.say?.text)]).filter(Boolean)
      texts.push(m.blurb, m.next, m.loop?.text, m.early?.text)
      for (const t of texts.filter(Boolean)) {
        expect(t.length, t).toBeLessThanOrEqual(180)
        expect(banned.test(t), t).toBe(false)
        expect(/[–—]|--/.test(t), t).toBe(false)
      }
    }
  })
})
