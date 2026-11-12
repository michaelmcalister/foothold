// Tests for the path snapping route (worker/routing.js).
import { describe, it, expect } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { handleRoute, readRouteBody, providerFor } from '../worker/routing.js'

function fakeDB() {
  const db = new DatabaseSync(':memory:')
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  const prep = (sql) => ({ bind: (...a) => ({ first: async () => db.prepare(sql).get(...a) ?? null, run: async () => db.prepare(sql).run(...a), all: async () => ({ results: db.prepare(sql).all(...a) }) }) })
  return { prepare: prep }
}
function fakeCache() {
  const m = new Map()
  return { match: async (k) => m.get(k.url)?.clone() || null, put: async (k, r) => { m.set(k.url, r) } }
}
const post = (body) => new Request('https://x/api/route', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' }, body: JSON.stringify(body) })
const A = [150.69, -33.75], B = [150.695, -33.751]

describe('path snapping', () => {
  it('picks the provider by which key is set', () => {
    expect(providerFor({})).toBe('osrm')
    expect(providerFor({ GOOGLE_ROUTES_KEY: 'g' })).toBe('google')
    expect(providerFor({ ORS_API_KEY: 'o', GOOGLE_ROUTES_KEY: 'g' })).toBe('ors')
  })

  it('refuses bad input', () => {
    expect(readRouteBody({ points: [A] }).error).toBeTruthy()
    expect(readRouteBody({ points: [A, [151.5, -33.75]] }).error).toMatch(/too far/)
    expect(readRouteBody({ points: [A, B], mode: 'swim' }).mode).toBe('run')
  })

  it('returns the path with its ends pinned, then answers repeats from the cache', async () => {
    const calls = []
    const fetcher = async (url) => {
      calls.push(url)
      return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 640, geometry: { coordinates: [[150.69001, -33.75001], [150.692, -33.7502], [150.69499, -33.75099]] }, legs: [{ steps: [{ mode: 'walking' }] }] }] }))
    }
    const env = { DB: fakeDB() }
    const cache = fakeCache()
    const r = await (await handleRoute(post({ mode: 'walk', points: [A, B] }), env, { fetcher, cache })).json()
    expect(calls[0]).toContain('routed-foot')
    expect(r.line[0]).toEqual(A)
    expect(r.line[r.line.length - 1]).toEqual(B)
    expect(r.distanceM).toBe(640)
    await handleRoute(post({ mode: 'walk', points: [A, B] }), env, { fetcher, cache })
    expect(calls).toHaveLength(1)
  })

  it("won't send you across the water on a ferry", async () => {
    const fetcher = async () => new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 2000, geometry: { coordinates: [A, B] }, legs: [{ steps: [{ mode: 'ferry' }] }] }] }))
    const res = await handleRoute(post({ points: [A, B] }), { DB: fakeDB() }, { fetcher, cache: null })
    expect(res.status).toBe(422)
  })

  it('uses Openrouteservice with the key in a header, and hides upstream errors', async () => {
    let seen
    const fetcher = async (url, init) => { seen = { url, init }; return new Response('quota secret', { status: 429 }) }
    const signedOut = await handleRoute(post({ mode: 'ride', points: [A, B] }), { DB: fakeDB(), ORS_API_KEY: 'k' }, { fetcher, cache: null, isSignedIn: async () => false })
    expect(signedOut.status).toBe(401) // a paid router needs a signed-in player
    expect(seen).toBeUndefined()
    const res = await handleRoute(post({ mode: 'ride', points: [A, B] }), { DB: fakeDB(), ORS_API_KEY: 'k' }, { fetcher, cache: null, isSignedIn: async () => true })
    expect(seen.url).toContain('cycling-regular')
    expect(seen.init.headers.authorization).toBe('k')
    expect(seen.url).not.toContain('k=')
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('secret')
  })
})
