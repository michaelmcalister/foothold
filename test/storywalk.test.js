// A Story Maker story played out on a run (src/lib/storyMaker/walk.js): it
// sends you to each landmark, greets you on arrival, asks where next, picks
// for you if you don't answer, and ends when you're back where you began.
import { describe, it, expect } from 'vitest'
import { createWalk } from '../src/lib/storyMaker/walk.js'
import { openingStops } from '../src/lib/storyMaker/session.js'

const HOME = { lat: -33.7331, lng: 150.7214 }
const at = (dLatM, dLngM) => ({ lat: HOME.lat + dLatM / 111320, lng: HOME.lng + dLngM / (111320 * Math.cos((HOME.lat * Math.PI) / 180)) })
const P = {
  mill: { id: 'mill', name: 'Old Mill', ...at(600, 0) },
  park: { id: 'park', name: 'Ridge Park', ...at(600, 600) },
  look: { id: 'look', name: 'Lookout Hill', ...at(0, 700) },
}
const chapter = (stop, next) => ({
  stop,
  go: [`Run to ${stop.name}.`],
  arrive: [`Welcome to ${stop.name}.`],
  ...(next.length ? { ask: { question: 'Where next?', options: next.map((p, i) => ({ key: 'AB'[i], label: p.name, stop: p.id })) } } : { home: ['Head back to where you began.'], finale: ['The end. Well run.'] }),
})

function runner(walk) {
  let t = 0, d = 0
  const heard = []
  const events = []
  const step = (here, metres = 100) => {
    t += 30; d += metres
    const out = walk.update({ elapsedS: t, distanceM: d, here, accuracyM: 8 })
    heard.push(...out.lines)
    events.push(...out.events.map((e) => e.type))
    return out
  }
  return { step, heard, events, at: () => t }
}

describe('a Story Maker story on a run', () => {
  it('guides, arrives, asks, follows the choice and ends back home', async () => {
    const asked = []
    const legs = []
    const walk = createWalk({
      story: { id: 's1', title: 'The Riddle', targetKm: 3, places: Object.values(P), yours: true },
      chapter: chapter(P.mill, [P.park, P.look]),
      fetchChapter: async (ids, next) => { asked.push({ ids, next }); return chapter(P[ids.at(-1)], []) },
      onLeg: (from, to) => legs.push(to.name || 'home'),
    })
    const r = runner(walk)
    r.step(HOME, 0)
    expect(r.heard).toEqual(['Run to Old Mill.', 'Old Mill: 600 metres north.'])
    expect(legs).toEqual(['Old Mill'])
    expect(walk.view().toGo).toBeGreaterThan(500)
    r.step(at(300, 0), 300)
    r.step(at(590, 0), 300) // within 40 m
    expect(r.heard).toContain('Welcome to Old Mill.')
    expect(r.events).toContain('ask')
    expect(walk.view().ask.options.map((o) => o.label)).toEqual(['Ridge Park', 'Lookout Hill'])

    const ans = walk.answer('B')
    expect(ans.lines[0]).toBe('Lookout Hill it is.')
    expect(legs.at(-1)).toBe('Lookout Hill')
    await new Promise((r) => setTimeout(r))
    expect(asked[0].ids).toEqual(['mill', 'look'])
    r.step(at(300, 350), 400)
    expect(r.heard).toContain('Run to Lookout Hill.')
    r.step(at(5, 695), 400)
    expect(r.heard).toContain('Welcome to Lookout Hill.')
    expect(r.heard).toContain('Head back to where you began.')
    expect(walk.view().chapter).toBe('Back to where you began')
    r.step(at(0, 300), 400)
    r.step(at(10, 10), 400)
    expect(r.heard.at(-1)).toBe('The end. Well run.')
    expect(r.events).toContain('finale')
    const { summary } = walk.finish()
    expect(summary).toMatchObject({ made: true, completed: true, stops: 2, storyId: 's1', yours: true })
  })

  it('picks for you when you don’t answer, and carries on when the next chapter can’t be had', async () => {
    const walk = createWalk({
      story: { id: 's2', title: 'T', targetKm: 3, places: Object.values(P) },
      chapter: chapter(P.mill, [P.park, P.look]),
      fetchChapter: async () => { throw new Error('offline') },
    })
    const r = runner(walk)
    r.step(HOME, 0)
    r.step(at(600, 0), 600)
    for (let i = 0; i < 2; i++) r.step(at(600, 0), 0) // 60 seconds standing there
    expect(r.heard).toContain('No answer, so the story picks for you.')
    expect(r.heard).toContain('Ridge Park it is.')
    await new Promise((r) => setTimeout(r))
    r.step(at(600, 600), 600)
    expect(r.heard).toContain('You made it to Ridge Park.')
  })

  it('opens with a first stop and a choice after it', () => {
    const open = openingStops(HOME, Object.values(P), 3)
    expect(open.first).toBeTruthy()
    expect(open.next.length).toBeGreaterThan(0)
    expect(open.next.map((p) => p.id)).not.toContain(open.first.id)
  })
})
