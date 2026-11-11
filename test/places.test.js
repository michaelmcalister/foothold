// Stories near you (lib/missions/places.js) and asking for a local story
// (POST /api/story-requests): where each story is set, how far away that is,
// nearest first, and what a story request saves.
import { describe, it, expect } from 'vitest'
import { placeOf, kmBetween, directionTo, distanceLabel, storiesNear, locateMe } from '../src/lib/missions/places.js'
import { missionById } from '../src/lib/missions/scripts.js'
import { storyRequestText } from '../worker/index.js'

const jordanSprings = { lat: -33.7230, lng: 150.7290 }

describe('where stories are set', () => {
  it('local episodes name their own place, older series fall back to theirs, made up places have none', () => {
    expect(placeOf(missionById('penrith-orphans')).name).toMatch(/Wianamatta/)
    expect(placeOf(missionById('bondi-breakers')).name).toBe('Bondi Beach')
    expect(placeOf(missionById('velocity-strike')).name).toMatch(/Brisbane/)
    expect(placeOf(missionById('ember-wind'))).toBe(null)
    expect(placeOf(missionById('quiz-1'))).toBe(null)
  })

  it('works out distances and directions', () => {
    const bondi = placeOf(missionById('bondi-breakers'))
    expect(kmBetween(jordanSprings, bondi)).toBeGreaterThan(50)
    expect(kmBetween(jordanSprings, bondi)).toBeLessThan(60)
    expect(directionTo(jordanSprings, bondi)).toBe('east')
    expect(distanceLabel(jordanSprings, jordanSprings)).toBe('Under a kilometre away')
    expect(distanceLabel(jordanSprings, placeOf(missionById('penrith-orphans')))).toMatch(/^1\.\d km east$/)
    expect(distanceLabel(jordanSprings, placeOf(missionById('twocities-manila')))).toMatch(/^[\d,]+ km north west$/)
  })

  it('lists stories nearest first, one per place, and the Orphan Mob is closest to Jordan Springs', () => {
    const list = storiesNear(jordanSprings)
    expect(list[0].mission.id).toBe('penrith-orphans')
    for (let i = 1; i < list.length; i++) expect(list[i].km).toBeGreaterThanOrEqual(list[i - 1].km)
    expect(new Set(list.map((n) => n.place.name)).size).toBe(list.length)
    expect(list.at(-1).place.name).toMatch(/Manila|Kuala Lumpur/)
    expect(storiesNear(null).every((n) => n.km === null)).toBe(true)
  })

  it('finding you never throws, and copes with a phone that says no', async () => {
    const yes = { getCurrentPosition: (ok) => ok({ coords: { latitude: -33.7, longitude: 150.7 } }) }
    const no = { getCurrentPosition: (_, fail) => fail(new Error('denied')) }
    expect(await locateMe({ geo: yes })).toEqual({ lat: -33.7, lng: 150.7 })
    expect(await locateMe({ geo: no })).toBe(null)
    expect(await locateMe({ geo: null })).toBe(null)
  })
})

describe('asking for a local story', () => {
  it('needs a place, keeps it short, and rounds where you are to about a kilometre', () => {
    expect(storyRequestText({}).error).toBeTruthy()
    expect(storyRequestText({ place: '   ' }).error).toBeTruthy()
    expect(storyRequestText({ place: 'Castlereagh quarry' }).text).toBe('Place: Castlereagh quarry')
    const t = storyRequestText({ place: 'Castlereagh quarry', story: 'A  ghost\\nhorse', near: { lat: -33.72345, lng: 150.72911 } }).text
    expect(t).toBe('Place: Castlereagh quarry | Story: A ghost\\nhorse | Near: -33.72, 150.73')
    expect(storyRequestText({ place: 'x'.repeat(500) }).text.length).toBeLessThan(140)
    expect(storyRequestText({ place: 'Here', near: { lat: 'nope' } }).text).toBe('Place: Here')
  })
})
