// Tests for street loops and directions: the server's turn by turn steps from
// each router, tidying and wording them, following them during a run, the
// loop builder choosing and resizing loops, and Spotify's "Restriction
// violated" answer on the music test.
import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { latLngToCell, gridDisk } from 'h3-js'
import { handleRoute, osrmSteps, orsSteps, googleSteps } from '../worker/routing.js'
import { cleanSteps, stepText, stepShort, sayName, inWords, placeSteps, createNavigator } from '../src/lib/directions.js'
import { buildStreetLoops, viaPoints, loopNote, trimSpurs } from '../src/lib/loopBuilder.js'
import { offset, distance } from '../src/lib/engine/geo.js'
import { lineLength } from '../src/lib/planner.js'

function fakeDB() {
  const db = new DatabaseSync(':memory:')
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  return { prepare: (sql) => ({ bind: (...a) => ({ first: async () => db.prepare(sql).get(...a) ?? null, run: async () => db.prepare(sql).run(...a), all: async () => ({ results: db.prepare(sql).all(...a) }) }) }) }
}

// A 500 m square loop from Penrith station: east, north, west, south
const START = { lat: -33.7506, lng: 150.6944 }
const corner = (e, n) => { const p = offset(START, e, n); return [p.lng, p.lat] }
function square(side = 500, step = 25) {
  const line = []
  const legs = [[1, 0], [0, 1], [-1, 0], [0, -1]]
  let e = 0, n = 0
  for (const [de, dn] of legs) for (let k = 0; k < side / step; k++) { line.push(corner(e, n)); e += de * step; n += dn * step }
  line.push(corner(0, 0))
  return line
}
const RAW = [
  { turn: 'depart', name: 'Station St', distanceM: 500, at: corner(0, 0) },
  { turn: 'left', name: 'High St', distanceM: 500, at: corner(500, 0) },
  { turn: 'straight', name: 'High Street Mall', distanceM: 0, at: corner(500, 250) }, // a name change
  { turn: 'arrive', name: '', distanceM: 0, at: corner(500, 500) }, // a via point
  { turn: 'depart', name: 'High St', distanceM: 0, at: corner(500, 500) },
  { turn: 'left', name: 'Lawson St', distanceM: 500, at: corner(500, 500) },
  { turn: 'left', name: 'Belmore St', distanceM: 500, at: corner(0, 500) },
  { turn: 'arrive', name: '', distanceM: 0, at: corner(0, 0) },
]

describe('steps from each router, the same shape', () => {
  it('OSRM', () => {
    const r = { legs: [{ steps: [
      { name: 'Station Street', distance: 120, maneuver: { type: 'depart', location: [1, 2] } },
      { name: 'High Street', distance: 80, maneuver: { type: 'turn', modifier: 'left', location: [3, 4] } },
      { name: 'High Street', distance: 50, maneuver: { type: 'roundabout', modifier: 'right', location: [5, 6] } },
      { name: '', distance: 0, maneuver: { type: 'arrive', location: [7, 8] } },
    ] }] }
    expect(osrmSteps(r).map((s) => s.turn)).toEqual(['depart', 'left', 'roundabout', 'arrive'])
    expect(osrmSteps(r)[1]).toEqual({ turn: 'left', name: 'High Street', distanceM: 80, at: [3, 4] })
  })
  it('Openrouteservice', () => {
    const f = { geometry: { coordinates: [[0, 0], [1, 1], [2, 2]] }, properties: { segments: [{ steps: [
      { type: 11, name: 'Station St', distance: 100, way_points: [0, 1] },
      { type: 0, name: '-', distance: 90, way_points: [1, 2] },
      { type: 10, name: '-', distance: 0, way_points: [2, 2] },
    ] }] } }
    expect(orsSteps(f)).toEqual([
      { turn: 'depart', name: 'Station St', distanceM: 100, at: [0, 0] },
      { turn: 'left', name: '', distanceM: 90, at: [1, 1] },
      { turn: 'arrive', name: '', distanceM: 0, at: [2, 2] },
    ])
  })
  it('Google', () => {
    const r = { legs: [{ steps: [
      { distanceMeters: 100, startLocation: { latLng: { latitude: 2, longitude: 1 } }, navigationInstruction: { maneuver: 'DEPART', instructions: 'Head east on Station St' } },
      { distanceMeters: 60, startLocation: { latLng: { latitude: 4, longitude: 3 } }, navigationInstruction: { maneuver: 'TURN_LEFT', instructions: 'Turn left onto High St' } },
    ] }] }
    const out = googleSteps(r)
    expect(out.map((s) => [s.turn, s.name])).toEqual([['depart', 'Station St'], ['left', 'High St'], ['arrive', '']])
  })
  it('the route lookup asks for steps only when wanted, and caches them apart', async () => {
    const urls = []
    const fetcher = async (url) => {
      urls.push(url)
      return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 640, geometry: { coordinates: [[150.69, -33.75], [150.695, -33.751]] }, legs: [{ steps: [{ mode: 'walking', name: 'A St', distance: 640, maneuver: { type: 'depart', location: [150.69, -33.75] } }, { mode: 'walking', name: '', distance: 0, maneuver: { type: 'arrive', location: [150.695, -33.751] } }] }] }] }))
    }
    const m = new Map()
    const cache = { match: async (k) => m.get(k.url)?.clone() || null, put: async (k, r) => { m.set(k.url, r) } }
    const post = (body) => new Request('https://x/api/route', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.1.1.1' }, body: JSON.stringify(body) })
    const env = { DB: fakeDB() }
    const plain = await (await handleRoute(post({ points: [[150.69, -33.75], [150.695, -33.751]] }), env, { fetcher, cache })).json()
    expect(plain.steps).toBeUndefined()
    const withSteps = await (await handleRoute(post({ points: [[150.69, -33.75], [150.695, -33.751]], steps: true }), env, { fetcher, cache })).json()
    expect(withSteps.steps.map((s) => s.turn)).toEqual(['depart', 'arrive'])
    expect(urls).toHaveLength(2) // a different cache entry
  })
})

describe('directions', () => {
  it('tidies steps: one start, one finish, no chatter', () => {
    const c = cleanSteps(RAW)
    expect(c.map((s) => `${s.turn} ${s.name}`)).toEqual(['depart Station St', 'left High St', 'left Lawson St', 'left Belmore St', 'arrive '])
    expect(c[1].distanceM).toBe(500) // the name change folded in
  })

  it('words them plainly, saying street types in full', () => {
    expect(stepText({ turn: 'left', name: 'High St' })).toBe('Turn left onto High Street.')
    expect(stepText({ turn: 'slight right', name: '' })).toBe('Bear right.')
    expect(stepText({ turn: 'depart', name: 'Station St' })).toBe('Head off along Station Street.')
    expect(stepText({ turn: 'arrive' })).toBe("You're back at the start. Loop closed.")
    expect(stepText({ turn: 'roundabout', name: 'Mulgoa Rd' })).toBe('At the roundabout, take the exit onto Mulgoa Road.')
    expect(sayName('St Marys Rd')).toBe('St Marys Road')
    expect(sayName('The Crescent')).toBe('The Crescent')
    expect(stepShort({ turn: 'right', name: 'Lawson St' })).toBe('Right onto Lawson St')
    expect(inWords(148)).toBe('In 150 metres')
    expect(inWords(1240)).toBe('In 1.2 kilometres')
    for (const st of RAW) expect(stepText(st)).not.toMatch(/[‒–—―]|--/)
  })

  it('places each turn along the line', () => {
    const placed = placeSteps(square(), RAW)
    expect(placed.map((p) => Math.round(p.d / 50) * 50)).toEqual([0, 500, 1000, 1500, 2000])
  })

  it('ignores footpath jogs and piles of steps at one corner, and works out the real turn', () => {
    const line = square()
    // a little sideways jog 250 m along the first side, where the path crosses a side street
    const jog = line.findIndex((p) => p[0] >= corner(250, 0)[0])
    line.splice(jog, 1, corner(240, 0), corner(244, 6), corner(256, 6), corner(260, 0))
    const raw = [
      RAW[0],
      { turn: 'left', name: '', distanceM: 4, at: corner(244, 6) },
      { turn: 'right', name: '', distanceM: 12, at: corner(256, 6) },
      { turn: 'right', name: '', distanceM: 2, at: corner(500, 0) }, // the router's words disagree with the shape
      { turn: 'left', name: 'High St', distanceM: 500, at: corner(501, 1) },
      ...RAW.slice(5),
    ]
    const placed = placeSteps(line, raw)
    expect(placed.map((p) => `${p.turn} ${p.name}`)).toEqual(['depart Station St', 'left High St', 'left Lawson St', 'left Belmore St', 'arrive '])
  })

  it('talks you round: a heads up, the turn, and the finish', () => {
    const line = square()
    const nav = createNavigator(line, placeSteps(line, RAW))
    const said = []
    let t = 0
    for (const [lng, lat] of square(500, 5)) {
      const out = nav.update({ lat, lng }, t++)
      said.push(...out.say)
    }
    expect(said).toEqual([
      'In 150 metres, turn left onto High Street.',
      'Turn left onto High Street.',
      'In 150 metres, turn left onto Lawson Street.',
      'Turn left onto Lawson Street.',
      'In 150 metres, turn left onto Belmore Street.',
      'Turn left onto Belmore Street.',
      "In 150 metres, you're back at the start. Loop closed.",
      "You're back at the start. Loop closed.",
    ])
  })

  it('says once when you leave the route, holds the turns, and welcomes you back', () => {
    const line = square()
    const nav = createNavigator(line, placeSteps(line, RAW))
    const said = []
    let t = 0
    const go = (e, n) => { const p = offset(START, e, n); said.push(...nav.update(p, t++).say) }
    for (let e = 0; e <= 200; e += 10) go(e, 0)
    for (let k = 0; k < 10; k++) go(200, -150) // a detour well off the line
    for (let e = 200; e <= 400; e += 10) go(e, 0)
    expect(said.filter((s) => /left the route/.test(s))).toHaveLength(1)
    expect(said).toContain("You're back on the route.")
    expect(said.filter((s) => /High Street/.test(s))).toEqual(['In 150 metres, turn left onto High Street.'])
  })
})

describe('the street loop builder', () => {
  // A pretend router: the streets wander further out, so every loop comes out `factor` times as long as drawn
  const winding = (factor = 1.4) => {
    const calls = []
    const route = async (pts) => {
      calls.push(pts)
      const o = pts[0]
      const points = pts.map(([x, y]) => [o[0] + (x - o[0]) * factor, o[1] + (y - o[1]) * factor])
      const line = []
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i]
        for (let k = 0; k < 10; k++) line.push([a[0] + ((b[0] - a[0]) * k) / 10, a[1] + ((b[1] - a[1]) * k) / 10])
      }
      line.push(points.at(-1))
      return { line, distanceM: lineLength(line), steps: [{ turn: 'depart', name: 'Station St', distanceM: 10, at: points[0] }, { turn: 'arrive', name: '', distanceM: 0, at: points[0] }] }
    }
    return { route, calls }
  }

  it('sends a handful of points that start and end at the start', () => {
    const ring = Array.from({ length: 37 }, (_, i) => [i, i])
    ring[36] = ring[0]
    const v = viaPoints(ring)
    expect(v).toHaveLength(8)
    expect(v[0]).toEqual(v.at(-1))
  })

  it('redraws a loop that came out too long, so it lands near the distance asked for', async () => {
    const { route, calls } = winding(1.6)
    const loops = await buildStreetLoops({ start: START, targetKm: 5, route, tries: 2 })
    expect(loops).toHaveLength(2)
    expect(calls).toHaveLength(4) // each one looked up twice: drawn, then resized
    for (const l of loops) {
      expect(l.line[0]).toEqual(l.line.at(-1))
      expect(Math.abs(l.km / 5 - 1)).toBeLessThan(0.12)
    }
  })

  it('heads for new ground and streets you haven’t run, away from your own', async () => {
    // Everything north of the start is yours and well trodden
    const mine = new Map()
    const explored = new Set()
    const north = latLngToCell(offset(START, 0, 900).lat, START.lng, 10)
    for (const h of gridDisk(north, 14)) { mine.set(h, { h3: h, owner: 'me', strength: 3, lastVisit: Date.now(), visits: 3 }); explored.add(h) }
    const { route } = winding(1.1)
    const loops = await buildStreetLoops({ start: START, targetKm: 4, route, cells: mine, me: 'me', explored, tries: 4 })
    expect(loops[0].heading).not.toMatch(/^north/)
    expect(loops[0].wild).toBeGreaterThan(loops.at(-1).wild)
    expect(loops[0].fresh).toBeGreaterThan(0)
    expect(loops[0].note).toMatch(/^\d+\.\d km on the streets, heading .+\. Takes \d+ new hexes/)
    const away = distance(START, { lat: loops[0].line[Math.floor(loops[0].line.length / 2)][1], lng: loops[0].line[Math.floor(loops[0].line.length / 2)][0] })
    expect(away).toBeGreaterThan(300)
  })

  it('tries new directions for "Try another", and gives up quietly with no streets', async () => {
    const { route } = winding(1.25)
    const first = await buildStreetLoops({ start: START, targetKm: 3, route, tries: 2 })
    const more = await buildStreetLoops({ start: START, targetKm: 3, route, tries: 2, skip: first.map((l) => l.headingDeg) })
    for (const m of more) for (const f of first) expect(Math.abs(((m.headingDeg - f.headingDeg + 540) % 360) - 180)).toBeGreaterThanOrEqual(30)
    expect(await buildStreetLoops({ start: START, targetKm: 3, route: async () => null })).toEqual([])
  })

  it('trims dead ends where the route runs up a street and straight back', () => {
    const loop = square()
    const at = loop.findIndex((p) => p[0] === corner(500, 0)[0] && p[1] === corner(500, 0)[1])
    const spur = [corner(530, -20), corner(560, -40), corner(530, -20)] // up a cul-de-sac and back
    const withSpur = [...loop.slice(0, at + 1), ...spur, loop[at], ...loop.slice(at + 1)]
    expect(trimSpurs(withSpur)).toEqual(loop)
    expect(trimSpurs(loop)).toEqual(loop)
  })

  it('a loop that does not close says so', () => {
    expect(loopNote({ km: 4.2, closes: false, wild: 0, take: 0, fresh: 0, plan: {} }, 'east')).toMatch(/doesn't quite close/)
  })
})

describe('Spotify start', () => {
  let calls
  const setFetch = (answers) => {
    calls = []
    globalThis.fetch = async (url, init = {}) => {
      const key = `${init.method || 'GET'} ${String(url).replace('https://api.spotify.com/v1', '').split('?')[0]}`
      calls.push(key)
      const a = answers[key]
      const r = typeof a === 'function' ? a() : a
      if (!r) return new Response(null, { status: 204 })
      return new Response(JSON.stringify(r.body), { status: r.status || 200 })
    }
  }
  beforeEach(() => {
    const mem = new Map([['fh-spotify', JSON.stringify({ access: 't', refresh: 'r', expires: Date.now() + 3600000 })]])
    globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
  })
  const phone = { id: 'p1', name: 'iPhone', type: 'Smartphone', is_active: true, supports_volume: false, volume_percent: null }

  it('plays on this phone, not the laptop or TV that played last', async () => {
    const { pickDevice } = await import('../src/lib/audio/spotify.js')
    const laptop = { id: 'm1', name: 'MacBook', type: 'Computer', is_active: true }
    const tv = { id: 't1', name: 'Lounge TV', type: 'TV', is_active: false }
    expect(pickDevice([laptop, tv, { ...phone, is_active: false }], { mobile: true }).id).toBe('p1')
    expect(pickDevice([laptop, tv, { ...phone, is_active: false }], { mobile: false }).id).toBe('m1')
    expect(pickDevice([laptop], { mobile: true }).id).toBe('m1') // no phone app open: the only one there
    expect(pickDevice([], { mobile: true })).toBe(null)
  })

  it('moves playback over to the phone when something else had it', async () => {
    const { startMusic } = await import('../src/lib/audio/spotify.js')
    let on = 'm1'
    setFetch({
      'GET /me/player/devices': { body: { devices: [{ id: 'm1', name: 'MacBook', type: 'Computer', is_active: true }, { ...phone, is_active: false }] } },
      'GET /me/player': () => ({ body: { is_playing: true, device: { id: on } } }),
      'PUT /me/player': () => { on = 'p1'; return null },
    })
    Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'iPhone' }, configurable: true })
    expect((await startMusic()).device).toBe('iPhone')
    expect(on).toBe('p1')
    expect(calls).not.toContain('PUT /me/player/play')
  })

  it('leaves music alone when it is already playing', async () => {
    const { startMusic } = await import('../src/lib/audio/spotify.js')
    setFetch({ 'GET /me/player/devices': { body: { devices: [phone] } }, 'GET /me/player': { body: { is_playing: true, device: { id: 'p1' } } } })
    expect(await startMusic()).toMatchObject({ device: 'iPhone', canVolume: false })
    expect(calls).not.toContain('PUT /me/player/play')
  })

  it('hands playback to the phone when Spotify says "Restriction violated"', async () => {
    const { startMusic } = await import('../src/lib/audio/spotify.js')
    let playing = false
    setFetch({
      'GET /me/player/devices': { body: { devices: [phone] } },
      'GET /me/player': () => ({ body: { is_playing: playing, device: { id: 'p1' } } }),
      'PUT /me/player/play': { status: 403, body: { error: { message: 'Player command failed: Restriction violated', reason: 'UNKNOWN' } } },
      'PUT /me/player': () => { playing = true; return null },
    })
    expect((await startMusic()).device).toBe('iPhone')
    expect(calls).toContain('PUT /me/player')
  })

  it('on iPhone, never pauses Spotify around the voice, and asks iOS to lower it instead', async () => {
    const { aroundSpeech } = await import('../src/lib/audio/spotify.js')
    const { asAnnouncement } = await import('../src/lib/audio/voice.js')
    const session = { type: 'auto' }
    Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'iPhone', audioSession: session }, configurable: true })
    setFetch({ 'GET /me/player': { body: { is_playing: true } } })
    let during = null
    await aroundSpeech(() => asAnnouncement(async () => { during = session.type }), { how: 'duck' })
    expect(during).toBe('transient')
    expect(session.type).toBe('auto')
    expect(calls.filter((c) => c.startsWith('PUT'))).toEqual([])
  })

  it('explains what to do when Spotify still won’t start', async () => {
    const { startMusic } = await import('../src/lib/audio/spotify.js')
    setFetch({
      'GET /me/player/devices': { body: { devices: [phone] } },
      'GET /me/player': { body: { is_playing: false } },
      'PUT /me/player/play': { status: 403, body: { error: { message: 'Player command failed: Restriction violated' } } },
    })
    await expect(startMusic()).rejects.toThrow(/pick this phone, press play/)
  })
})
