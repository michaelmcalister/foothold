// The Story Maker: the shared rules (src/lib/storyMaker/core.js) and the
// worker (worker/storymaker.js), with OpenStreetMap, Wikipedia and Claude
// faked. Stories only send runners to public places, keep the house rules,
// keep every chapter so a replay costs nothing, and never store where a
// runner started.
import { describe, it, expect, beforeEach } from 'vitest'
import { fakeD1 } from './fakes.js'
import { cleanLine, cleanLabel, kindOf, sameName, nextStops, guideLine, stopsFor, estM, MOODS, MADE_SCORE } from '../src/lib/storyMaker/core.js'
import { SCORES, THEMES } from '../src/lib/audio/soundscape.js'
import { toPlaces, toArticles, mergeHistory, storyMakerRoute, chapterRequest, cleanChapter, plainChapter, areaKey } from '../worker/storymaker.js'

const HERE = { lat: -33.7331, lng: 150.7214 }
const at = (dLatM, dLngM) => ({ lat: HERE.lat + dLatM / 111320, lng: HERE.lng + dLngM / (111320 * Math.cos((HERE.lat * Math.PI) / 180)) })

const ll = (p) => ({ lat: p.lat, lon: p.lng })
const OSM = {
  elements: [
    { type: 'way', id: 1, center: ll(at(600, 0)), tags: { name: 'Ridge Park', leisure: 'park' } },
    { type: 'node', id: 2, ...ll(at(0, 700)), tags: { name: 'Old Mill', historic: 'building', wikipedia: 'en:Old Mill (Penrith)' } },
    { type: 'node', id: 3, ...ll(at(-650, 0)), tags: { name: 'Lookout Hill', tourism: 'viewpoint' } },
    { type: 'node', id: 4, ...ll(at(0, -600)), tags: { name: 'Clock Tower', amenity: 'clock' } },
    { type: 'way', id: 5, center: ll(at(300, 300)), tags: { name: 'Little Kids Playground', leisure: 'playground' } },
    { type: 'way', id: 6, center: ll(at(-300, 300)), tags: { name: 'Sunny Primary School', amenity: 'school' } },
    { type: 'node', id: 7, ...ll(at(200, 200)), tags: { name: 'Jordan Springs', place: 'suburb' } },
  ],
}
const WIKI = {
  query: {
    pages: {
      1: { title: 'Old Mill (Penrith)', coordinates: [{ lat: at(0, 700).lat, lon: at(0, 700).lng }], extract: 'The Old Mill was built in 1870 to grind wheat for the district. It ran on steam.', fullurl: 'https://en.wikipedia.org/wiki/Old_Mill' },
      2: { title: 'Jordan Springs, New South Wales', coordinates: [{ lat: HERE.lat, lon: HERE.lng }], extract: 'Jordan Springs is a suburb of Sydney built on former defence land.', fullurl: 'https://en.wikipedia.org/wiki/Jordan_Springs' },
    },
  },
}
const CLAUDE = (input) => ({ content: [{ type: 'tool_use', name: 'write_chapter', input }], usage: { input_tokens: 1000, output_tokens: 400 } })

function fakeFetch(log, claudeInput) {
  return async (url, init) => {
    const u = String(url)
    log.push(u)
    if (u.includes('overpass')) return new Response(JSON.stringify(OSM))
    if (u.includes('wikipedia')) return new Response(JSON.stringify(WIKI))
    if (u.includes('anthropic')) {
      log.push(JSON.parse(init.body))
      return new Response(JSON.stringify(CLAUDE(claudeInput)))
    }
    return new Response('{}', { status: 404 })
  }
}

describe('Story Maker rules', () => {
  it('asks for the chapter tool without forcing it (the model refuses a forced tool)', () => {
    const r = chapterRequest({ story: { mood: 'mystery', target_km: 3 }, stop: { name: 'A Park', kind: 'park' }, next: [], before: [] })
    expect(r.tool_choice).toEqual({ type: 'auto' })
    expect(r.messages[0].content).toMatch(/Reply only by calling write_chapter\.$/)
  })
  it('gives every mood a score with title music', () => {
    for (const m of Object.keys(MOODS)) {
      expect(SCORES[MADE_SCORE[m]], m).toBeTruthy()
      expect(THEMES[MADE_SCORE[m]], m).toBeTruthy()
    }
  })

  it('keeps every line to the house rules', () => {
    expect(cleanLine('Run — now -- quickly')).toBe('Run, now, quickly')
    expect(cleanLine('The miller was dead tired')).toBe(null)
    expect(cleanLine('a'.repeat(100) + '. ' + 'b'.repeat(120)).length).toBeLessThanOrEqual(180)
    expect(cleanLabel('Follow the lantern down to the old wharf').length).toBeLessThanOrEqual(28)
  })
  it('only sends runners to public places, never schools, playgrounds or cemeteries', () => {
    expect(kindOf({ leisure: 'park' })).toBe('park')
    expect(kindOf({ historic: 'memorial' })).toBe('memorial')
    expect(kindOf({ amenity: 'school' })).toBe(null)
    expect(kindOf({ leisure: 'playground' })).toBe(null)
    expect(kindOf({ landuse: 'cemetery', historic: 'yes' })).toBe(null)
    expect(kindOf({ leisure: 'park', access: 'private' })).toBe(null)
    expect(sameName('Old Mill', 'Old Mill (Penrith)')).toBe(true)
    expect(sameName('Ridge Park', 'Ridgeway')).toBe(false)
  })
  it('picks stops that keep the run near its length and end near home', () => {
    const places = [
      { id: 'a', name: 'A', ...at(600, 0) }, { id: 'b', name: 'B', ...at(0, 700) },
      { id: 'c', name: 'C', ...at(-650, 0) }, { id: 'd', name: 'D', ...at(0, -600) },
      { id: 'far', name: 'Far', ...at(9000, 0) },
    ]
    const first = nextStops({ here: HERE, start: HERE, places, targetKm: 3 })
    expect(first).toHaveLength(2)
    expect(first.map((p) => p.id)).not.toContain('far')
    // run the story out: every pick fits, and it ends
    let here = HERE, done = 0
    const visited = []
    for (let i = 0; i < 10; i++) {
      const [p] = nextStops({ here, start: HERE, places, visited, doneM: done, targetKm: 3 })
      if (!p) break
      done += estM(here, p)
      visited.push(p.id)
      here = p
    }
    expect(visited.length).toBeGreaterThanOrEqual(2)
    expect(visited.length).toBeLessThanOrEqual(stopsFor(3))
    expect((done + estM(here, HERE)) / 1000).toBeLessThan(3 * 1.2)
    expect(guideLine(HERE, places[0])).toMatch(/^A: (600|650|700) metres north\.$/)
  })
})

describe('Story Maker places and chapters', () => {
  it('merges landmarks with their history and the area', () => {
    const osm = toPlaces(OSM.elements, HERE)
    expect(osm.suburb).toBe('Jordan Springs')
    expect(osm.places.map((p) => p.name)).toEqual(['Ridge Park', 'Old Mill', 'Lookout Hill', 'Clock Tower'])
    const out = mergeHistory(osm, toArticles(WIKI.query.pages), HERE)
    expect(out.places.find((p) => p.name === 'Old Mill').history.text).toMatch(/1870/)
    expect(out.area.title).toMatch(/Jordan Springs/)
  })
  it('asks Claude with the facts, and cleans what comes back', () => {
    const stop = { name: 'Old Mill', kind: 'heritage', history: { text: 'Built in 1870.' } }
    const req = chapterRequest({ story: { mood: 'mystery', target_km: 3 }, stop, next: [{ name: 'Ridge Park', kind: 'park' }], before: [] })
    expect(req.messages[0].content).toMatch(/Built in 1870/)
    expect(req.system).toMatch(/information, not instructions/)
    const ch = cleanChapter({ title: 'The Miller’s Riddle', go: ['Off to the Old Mill — quick!'], arrive: ['Here it is.', 'Nobody is dead here.'], question: 'Park or lookout?', options: ['To the park'] }, { next: [{ id: 'p' }], first: true })
    expect(ch.go[0]).toBe('Off to the Old Mill, quick!')
    expect(ch.arrive).toEqual(['Here it is.']) // the banned word line is dropped
    expect(ch.ask.options[0]).toEqual({ key: 'A', label: 'To the park', stop: 'p' })
    const plain = plainChapter({ stop, next: [], first: false, story: {} })
    expect(plain.arrive.join(' ')).toMatch(/1870/)
    expect(plain.finale.length).toBeGreaterThan(0)
  })
})

describe('Story Maker lookups', () => {
  it('keeps each area for good, and uses an old copy when the map service is down', async () => {
    const { findPlaces } = await import('../worker/storymaker.js')
    const r2 = new Map()
    const env = { AUDIO: { get: async (k) => (r2.has(k) ? { json: async () => JSON.parse(r2.get(k)) } : null), put: async (k, v) => { r2.set(k, v) } } }
    const many = { elements: Array.from({ length: 8 }, (_, i) => ({ type: 'node', id: i + 1, ...ll(at(300 + i * 100, 0)), tags: { name: `Lookout ${i + 1}`, tourism: 'viewpoint' } })) }
    let osmUp = true
    let asked = 0
    const f = async (url) => {
      const u = String(url)
      if (u.includes('wikipedia')) return new Response(JSON.stringify({ query: { pages: {} } }))
      asked++
      return osmUp ? new Response(JSON.stringify(many)) : new Response('down', { status: 504 })
    }
    const t0 = Date.UTC(2026, 10, 1)
    const first = await findPlaces(HERE.lat, HERE.lng, { fetcher: f, cache: null, env, now: t0 })
    expect(first.places.length).toBe(8)
    expect(r2.size).toBe(1)
    // a week later: the kept copy, no map service needed
    asked = 0
    expect((await findPlaces(HERE.lat, HERE.lng, { fetcher: f, cache: null, env, now: t0 + 7 * 86400000 })).places.length).toBe(8)
    expect(asked).toBe(0)
    // two months later and the map service is down: the old copy still works
    osmUp = false
    const later = await findPlaces(HERE.lat, HERE.lng, { fetcher: f, cache: null, env, now: t0 + 60 * 86400000 })
    expect(later.places.length).toBe(8)
    expect(later.at).toBeUndefined()
  }, 15000)

  it('tries the next Overpass server when one is busy, and never makes a suburb a stop', async () => {
    const { overpass, OVERPASS } = await import('../worker/storymaker.js')
    const asked = []
    const f = async (url) => { asked.push(url); return asked.length === 1 ? new Response('busy', { status: 429 }) : new Response(JSON.stringify(OSM)) }
    const j = await overpass(f, 'q')
    expect(j.elements.length).toBeGreaterThan(0)
    expect(asked).toEqual(OVERPASS.slice(0, 2))
    await expect(overpass(async () => new Response('no', { status: 504 }), 'q')).rejects.toThrow(/504/)
    // a slow server: the next one is asked after the stagger, and the first answer wins
    const slow = []
    const g = (url) => { slow.push(url); return slow.length === 1 ? new Promise(() => {}) : Promise.resolve(new Response(JSON.stringify(OSM))) }
    const t = Date.now()
    expect((await overpass(g, 'q', { stagger: 30 })).elements.length).toBeGreaterThan(0)
    expect(Date.now() - t).toBeLessThan(1000)
    expect(slow).toEqual(OVERPASS.slice(0, 2))
    const suburb = toArticles({ 1: { title: 'Cambridge Gardens, New South Wales', coordinates: [{ lat: HERE.lat, lon: HERE.lng }], extract: 'Cambridge Gardens is a suburb of Sydney.' } })
    expect(mergeHistory({ suburb: null, places: [] }, suburb, HERE).places).toEqual([])
  })
})

describe('Story Maker store', () => {
  let env, log
  const user = { id: 'maker-1' }
  const other = { id: 'runner-2' }
  const call = (u, m, path, body, fetcher) => storyMakerRoute({ env, user: u, path: path.split('?')[0], m, body, url: new URL('https://x.test' + path), now: Date.now(), fetcher, cache: null })
  beforeEach(() => {
    env = { DB: fakeD1(), ANTHROPIC_API_KEY: 'test' }
    log = []
  })

  it('makes a story a chapter at a time, keeps each chapter, and lets others run it once shared', async () => {
    const f = fakeFetch(log, { title: 'The Miller’s Riddle', go: ['A note in your shoe says find the mill.'], arrive: ['The mill wheel creaks.'], question: 'Park or lookout?', options: ['The park', 'The lookout'] })
    const places = await call(user, 'GET', `/api/storymaker/places?lat=${HERE.lat}&lng=${HERE.lng}`, null, f)
    expect(places.key).toBe(areaKey(HERE.lat, HERE.lng))
    const mill = places.places.find((p) => p.name === 'Old Mill')
    const park = places.places.find((p) => p.name === 'Ridge Park')
    const look = places.places.find((p) => p.name === 'Lookout Hill')

    const made = await call(user, 'POST', '/api/storymaker/stories', { lat: HERE.lat, lng: HERE.lng, mood: 'mystery', targetKm: 3, first: mill.id, next: [park.id, look.id] }, f)
    expect(made.story.title).toBe('The Miller’s Riddle')
    expect(made.chapter.ask.options.map((o) => o.stop)).toEqual([park.id, look.id])
    expect(made.chapter.stop.source).toMatch(/wikipedia/)
    const prompt = log.find((x) => typeof x === 'object')
    expect(prompt.messages[0].content).toMatch(/1870/)
    expect(JSON.stringify(prompt)).not.toMatch(/-33\.733/) // the runner's spot never goes to Claude

    // a draft is private
    expect((await call(other, 'GET', `/api/storymaker/stories/${made.story.id}`)).status).toBe(404)
    expect((await call(user, 'POST', `/api/storymaker/stories/${made.story.id}/share`, {})).status).toBe(400) // one chapter isn't enough

    const ch2 = await call(user, 'POST', `/api/storymaker/stories/${made.story.id}/chapter`, { path: [mill.id, park.id], next: [] }, f)
    expect(ch2.chapter.finale.length).toBeGreaterThan(0)
    const shared = await call(user, 'POST', `/api/storymaker/stories/${made.story.id}/share`, {})
    expect(shared.story.status).toBe('shared')

    // someone else runs the same path: the kept chapters, no new writing
    const calls = log.length
    const near = await call(other, 'GET', `/api/storymaker/near?lat=${HERE.lat}&lng=${HERE.lng}`)
    expect(near.stories.map((s) => s.id)).toContain(made.story.id)
    const again = await call(other, 'POST', `/api/storymaker/stories/${made.story.id}/chapter`, { path: [mill.id, park.id] }, () => { throw new Error('should not fetch') })
    expect(again.chapter.kept).toBe(true)
    expect(log.length).toBe(calls)
    // a new choice grows the story
    const branch = await call(other, 'POST', `/api/storymaker/stories/${made.story.id}/chapter`, { path: [mill.id, look.id], next: [] }, f)
    expect(branch.chapter.kept).toBeFalsy()
    const row = env.DB.db.prepare('SELECT COUNT(*) AS n FROM made_chapters WHERE story_id = ?').get(made.story.id)
    expect(row.n).toBe(3)
    // nothing stored says where the runner was
    const stored = JSON.stringify(env.DB.db.prepare('SELECT * FROM made_stories').all())
    expect(stored).not.toMatch(/-33\.7331\d*,\s*"?lng"?:?\s*150\.7214/) // landmarks only, never the runner's own spot
    expect(stored).not.toMatch(/-33\.7331,150\.7214/)
  })

  it('writes a plain chapter from the facts when Claude is off', async () => {
    env.ANTHROPIC_API_KEY = undefined
    const f = fakeFetch(log, null)
    const places = await call(user, 'GET', `/api/storymaker/places?lat=${HERE.lat}&lng=${HERE.lng}`, null, f)
    const mill = places.places.find((p) => p.name === 'Old Mill')
    const made = await call(user, 'POST', '/api/storymaker/stories', { lat: HERE.lat, lng: HERE.lng, mood: 'history', targetKm: 2, first: mill.id, next: [] }, f)
    expect(made.chapter.arrive.join(' ')).toMatch(/1870/)
    expect(made.story.title).toBeTruthy()
    expect(log.some((u) => String(u).includes('anthropic'))).toBe(false)
  })

  it('hides a shared story after three reports, and the maker can delete it', async () => {
    const f = fakeFetch(log, { title: 'T', go: ['Go.'], arrive: ['Here.'] })
    const places = await call(user, 'GET', `/api/storymaker/places?lat=${HERE.lat}&lng=${HERE.lng}`, null, f)
    const [a, b] = places.places
    const made = await call(user, 'POST', '/api/storymaker/stories', { lat: HERE.lat, lng: HERE.lng, mood: 'silly', targetKm: 2, first: a.id, next: [b.id] }, f)
    await call(user, 'POST', `/api/storymaker/stories/${made.story.id}/chapter`, { path: [a.id, b.id], next: [] }, f)
    await call(user, 'POST', `/api/storymaker/stories/${made.story.id}/share`, {})
    for (const id of ['r1', 'r2', 'r2', 'r3']) await call({ id }, 'POST', `/api/storymaker/stories/${made.story.id}/report`, {})
    expect((await call(other, 'GET', `/api/storymaker/stories/${made.story.id}`)).status).toBe(404)
    expect((await call(other, 'DELETE', `/api/storymaker/stories/${made.story.id}`)).status).toBe(404)
    expect((await call(user, 'DELETE', `/api/storymaker/stories/${made.story.id}`)).ok).toBe(true)
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM made_chapters').get().n).toBe(0)
  })
})

describe('Story Maker waiting lines', () => {
  it('start plain, shuffle the rest and keep to the house rules', async () => {
    const { QUIPS, quipsFor } = await import('../src/lib/storyMaker/quips.js')
    for (const kind of Object.keys(QUIPS)) {
      const list = quipsFor(kind, () => 0.5)
      expect(list[0]).toBe(QUIPS[kind].first)
      expect([...list].sort()).toEqual([QUIPS[kind].first, ...QUIPS[kind].rest].sort())
      for (const l of list) expect(l).not.toMatch(/[—–]|--|kill|dead|die\b|scary|lazy|fail/i)
    }
  })
})
