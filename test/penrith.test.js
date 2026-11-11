// Tests for River Town (missions/series/penrith.js): the Emu Hall Mystery is
// in the missions list with its cover and look, every sound, scene and voice
// it names exists, the trivia answers are spelt out in every reply, the
// choice leads to exactly one surge, and nobody is hurt in the end.
import { describe, it, expect } from 'vitest'
import { MISSIONS, CHAINS, sagaById } from '../src/lib/missions/scripts.js'
import { SAGA, EPISODES, CHAIN, CAST } from '../src/lib/missions/series/penrith.js'
import { STINGS, SCENES } from '../src/lib/audio/soundscape.js'
import { SPATIAL } from '../src/lib/audio/spatial.js'
import { coverSvg, SAGA_LOOK } from '../src/lib/missions/covers.js'

const ep = () => MISSIONS.find((m) => m.id === 'penrith-emuhall')

describe('River Town: the Emu Hall Mystery', () => {
  it('is listed, chained and new', () => {
    expect(ep()).toBeTruthy()
    expect(CHAINS.penrith).toEqual(CHAIN)
    expect(EPISODES.map((m) => m.id)).toEqual(CHAIN)
    expect(sagaById('penrith')).toMatchObject({ title: 'River Town', narrator: 'penrith-narrator', isNew: true })
    expect(SAGA_LOOK.penrith).toBeTruthy()
    expect(coverSvg(ep())).toContain('<svg')
  })

  it('only uses sounds, scenes and speakers that exist', () => {
    for (const b of ep().beats) {
      if (b.fx) expect(STINGS[b.fx], b.fx).toBeTruthy()
      if (b.scene) expect(SCENES[b.scene], b.scene).toBeTruthy()
      if (b.spatial) expect(SPATIAL[b.spatial], b.spatial).toBeTruthy()
      if (b.who) expect(CAST[b.who], b.who).toBeTruthy()
    }
    expect(new Set(Object.values(CAST).map((c) => c.voiceId)).size).toBe(Object.keys(CAST).length)
  })

  it('has plenty of local trivia, each reply naming the answer', () => {
    const qs = ep().beats.filter((b) => b.kind === 'quiz' || b.kind === 'puzzle')
    expect(qs.length).toBeGreaterThanOrEqual(5)
    for (const q of qs) {
      const label = q.options.find((o) => o.key === q.answer).label.toLowerCase()
      expect(q.right.text.toLowerCase()).toContain(label)
      expect(q.wrong.text.toLowerCase()).toContain(label)
    }
  })

  it('the choice leads to exactly one surge either way', () => {
    const forks = ep().beats.filter((b) => b.if === 'river' || b.unless === 'river')
    expect(forks).toHaveLength(2)
    expect(forks.map((b) => b.kind)).toEqual(['surge', 'surge'])
  })

  it('beats run in order and it ends kindly', () => {
    const at = ep().beats.map((b) => b.at)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    const last = ep().beats.at(-1)
    expect(last.kind).toBe('finale')
    expect(last.say).toMatch(/Nobody was harmed/)
  })
})
