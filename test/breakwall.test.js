// Tests for The Breakwall (missions/series/breakwall.js), a treasure trail
// on the Newcastle waterfront: its episodes chained in order and teased, set
// at a real place, full of trivia whose replies name the answer, one choice
// sending each branch to its own surge, speakers and sounds that exist, a
// spatial beat, and a cover.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, sagaById, unlockedBy } from '../src/lib/missions/scripts.js'
import { CAST } from '../src/lib/missions/cast.js'
import { STINGS, SCENES } from '../src/lib/audio/soundscape.js'
import { SPATIAL } from '../src/lib/audio/spatial.js'
import { coverSvg, SAGA_LOOK } from '../src/lib/missions/covers.js'

const eps = MISSIONS.filter((m) => m.saga === 'breakwall')

describe('The Breakwall', () => {
  it('starts with The Brass Tags, chained, teased and set at the Bogey Hole', () => {
    expect(eps.map((m) => m.id)).toEqual(['breakwall-tags'])
    expect(CHAINS.breakwall).toEqual(eps.map((m) => m.id))
    expect(unlockedBy('breakwall-tags')).toBe(null)
    expect(eps[0].next).toMatch(/^Next time on The Breakwall/)
    expect(eps[0].place).toMatchObject({ name: 'The Bogey Hole, Newcastle' })
    expect(eps[0].place.lat).toBeLessThan(-32)
    expect(sagaById('breakwall')).toMatchObject({ isNew: true, title: 'The Breakwall' })
    expect(SAGA_LOOK.breakwall).toBeTruthy()
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

  it('sends the choice to exactly one surge each way, and uses real speakers and sounds', () => {
    for (const m of eps) {
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

  it('keeps the finale near the end and every line kind and short', () => {
    const banned = /\b(kill|blood|dead|die|scary|lazy|failed|failure|pathetic|should have|disappoint\w*|zombie|weak)\b/i
    for (const m of eps) {
      const end = m.beats.at(-1)
      expect(end.kind).toBe('finale')
      expect(end.at).toBeGreaterThanOrEqual(m.minutes * 60 - 180)
      expect(end.at).toBeLessThanOrEqual(m.minutes * 60 + 60)
      const texts = JSON.stringify(m.beats).match(/"(say|text)":"[^"]*"/g).map((s) => s.replace(/^"\w+":"/, '').slice(0, -1))
      for (const t of texts) {
        expect(t.length, t).toBeLessThanOrEqual(180)
        expect(t, t).not.toMatch(banned)
        expect(t, t).not.toMatch(/[‒–—―]|--/)
      }
    }
  })
})
