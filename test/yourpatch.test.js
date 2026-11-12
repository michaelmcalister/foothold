// Stories on your own streets (missions/local.js, worker/nearby.js,
// series/yourpatch.js): names from OpenStreetMap, nearest first; tokens
// filled everywhere a player hears them; plain words when nothing's near;
// the position rounded before it leaves the worker.
import { describe, it, expect } from 'vitest'
import { personalise, wordsFrom, TOKENS } from '../src/lib/missions/local.js'
import { sortPlaces, handleNearby, overpassQuery } from '../worker/nearby.js'
import { MISSIONS } from '../src/lib/missions/scripts.js'

const patch = MISSIONS.filter((m) => m.saga === 'yourpatch')
const strings = (v, out = []) => {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out))
  return out
}

describe('your own streets', () => {
  it('has three local episodes that use the tokens', () => {
    expect(patch.map((m) => m.id)).toEqual(['yourpatch-kite', 'yourpatch-bell', 'yourpatch-capsule'])
    for (const m of patch) expect(m.local).toBe(true)
    const used = new Set(strings(patch).flatMap((s) => [...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1])))
    for (const t of used) expect(TOKENS, t).toContain(t)
  })

  it('fills every token, keeps ids and flags, and stays a sensible length', () => {
    const long = 'Abcdefghijklmnopqrstuvwxyzabcdefghij'
    const words = wordsFrom({ suburb: long, parks: [long, long], streets: [long, long], landmarks: [long], water: [long] })
    for (const m of patch) {
      const p = personalise(m, words)
      expect(p.id).toBe(m.id)
      for (const s of strings(p.beats)) expect(s).not.toMatch(/\{\w+\}/)
      for (const b of p.beats) if (b.say && typeof b.say === 'string') expect(b.say.length, b.say).toBeLessThanOrEqual(260)
      const c = p.beats.find((b) => b.kind === 'choice')
      expect(c.options[0].flag).toBe(m.beats.find((b) => b.kind === 'choice').options[0].flag)
    }
  })

  it('uses plain words when nothing is near', () => {
    const p = personalise(patch[0], wordsFrom({}))
    expect(p.beats[0].say).toContain('your suburb')
  })

  it('sorts OpenStreetMap places, nearest first, names only', () => {
    const here = { lat: -33.71, lng: 150.74 }
    const out = sortPlaces([
      { tags: { name: 'Far Park', leisure: 'park' }, center: { lat: -33.72, lon: 150.75 } },
      { tags: { name: 'Near Park', leisure: 'park' }, center: { lat: -33.7101, lon: 150.7401 } },
      { tags: { name: 'Banksia Street', highway: 'residential' }, center: { lat: -33.711, lon: 150.741 } },
      { tags: { name: 'Banksia Street', highway: 'residential' }, center: { lat: -33.712, lon: 150.741 } },
      { tags: { name: 'Jordan Springs', place: 'suburb' }, lat: -33.71, lon: 150.73 },
      { tags: { name: 'South Creek', waterway: 'creek' }, center: { lat: -33.70, lon: 150.75 } },
      { tags: { name: 'Town Library', amenity: 'library' }, lat: -33.709, lon: 150.74 },
    ], here)
    expect(out).toEqual({ suburb: 'Jordan Springs', parks: ['Near Park', 'Far Park'], streets: ['Banksia Street'], landmarks: ['Town Library'], water: ['South Creek'] })
  })

  it('rounds the position before asking OpenStreetMap', async () => {
    let body
    const fetcher = async (url, init) => { body = decodeURIComponent(init.body); return new Response(JSON.stringify({ elements: [] })) }
    await handleNearby(new URL('https://x/api/nearby?lat=-33.712345&lng=150.745678'), { fetcher, cache: null })
    expect(body).toContain('-33.71,150.75')
    expect(body).not.toContain('712345')
    expect(overpassQuery(-33.71, 150.75)).toContain('around:1500,-33.71,150.75')
    expect((await handleNearby(new URL('https://x/api/nearby?lat=abc'), { fetcher, cache: null })).status).toBe(400)
  })
})
