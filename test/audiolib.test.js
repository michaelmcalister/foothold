// Tests for Foothold's recorded sounds: the catalogue (original, described by
// feel, never a real song), and the server making each sound once, storing it
// in R2 and serving it from there after that.
import { describe, it, expect } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { AMBIENCE, TRACKS, RUN_PLAYLIST, CHASE_TRACK, shuffled } from '../src/lib/audio/library.js'
import { SCENES } from '../src/lib/audio/soundscape.js'
import { handleAudio } from '../worker/audioLibrary.js'

function fakeDB() {
  const db = new DatabaseSync(':memory:')
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  return { prepare: (sql) => ({ bind: (...a) => ({ first: async () => db.prepare(sql).get(...a) ?? null, run: async () => db.prepare(sql).run(...a), all: async () => ({ results: db.prepare(sql).all(...a) }) }) }) }
}
function fakeR2() {
  const m = new Map()
  return {
    m,
    get: async (k) => (m.has(k) ? { body: m.get(k).v } : null),
    head: async (k) => (m.has(k) ? { uploaded: m.get(k).at } : null),
    put: async (k, v) => { m.set(k, { v, at: new Date() }) },
    delete: async (k) => { m.delete(k) },
  }
}
const req = (ip = '1.2.3.4') => new Request('https://x/api/audio', { headers: { 'cf-connecting-ip': ip } })

describe('the sound catalogue', () => {
  it('has a recorded loop for every mission scene', () => {
    expect(Object.keys(AMBIENCE).sort()).toEqual(Object.keys(SCENES).sort())
    for (const p of Object.values(AMBIENCE)) expect(p).toMatch(/no voices|no clear/i)
  })

  it('every track is original, instrumental and described by feel, not by a real song', () => {
    for (const [id, t] of Object.entries(TRACKS)) {
      expect(t.prompt, id).toMatch(/^Original /)
      expect(t.prompt, id).toMatch(/No vocals\.$/)
      expect(t.prompt, id).not.toMatch(/mission impossible|tiger|survivor|rocky|bond|schifrin|in the style of/i)
      expect(t.seconds).toBeGreaterThanOrEqual(60)
      expect(t.title).toBeTruthy()
    }
    for (const id of [...RUN_PLAYLIST, ...Object.values(CHASE_TRACK)]) expect(TRACKS[id], id).toBeTruthy()
  })

  it('shuffles without losing or repeating a track', () => {
    let x = 0.3
    const s = shuffled(RUN_PLAYLIST, () => (x = (x * 9301 + 49297) % 233280 / 233280))
    expect(s.slice().sort()).toEqual(RUN_PLAYLIST.slice().sort())
  })
})

describe('GET /api/audio', () => {
  it('makes a sound once, then serves it from storage', async () => {
    const env = { ELEVENLABS_API_KEY: 'k', AUDIO: fakeR2(), DB: fakeDB() }
    const calls = []
    const fetcher = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response(new Uint8Array([1, 2, 3]), { status: 200 }) }
    const a = await handleAudio(req(), env, 'ambience', 'bush', { fetcher })
    expect(a.status).toBe(200)
    expect(a.headers.get('cache-control')).toMatch(/immutable/)
    expect(calls[0].url).toMatch(/sound-generation/)
    expect(calls[0].body).toMatchObject({ loop: true, duration_seconds: 30, text: AMBIENCE.bush })
    const b = await handleAudio(req(), env, 'ambience', 'bush', { fetcher })
    expect(b.status).toBe(200)
    expect(calls).toHaveLength(1) // from storage the second time
    expect(env.AUDIO.m.has('ambience/bush.mp3')).toBe(true)
    expect(env.AUDIO.m.has('ambience/bush.mp3.pending')).toBe(false)
  })

  it('makes tracks with the music model, instrumental only', async () => {
    const env = { ELEVENLABS_API_KEY: 'k', AUDIO: fakeR2(), DB: fakeDB() }
    let body = null
    const fetcher = async (url, init) => { body = { url, ...JSON.parse(init.body) }; return new Response(new Uint8Array([1]), { status: 200 }) }
    expect((await handleAudio(req(), env, 'track', 'spy-chase', { fetcher })).status).toBe(200)
    expect(body.url).toMatch(/\/v1\/music/)
    expect(body).toMatchObject({ force_instrumental: true, music_length_ms: TRACKS['spy-chase'].seconds * 1000 })
  })

  it('refuses unknown sounds, says when one is being made, and steps aside without permission', async () => {
    const env = { ELEVENLABS_API_KEY: 'k', AUDIO: fakeR2(), DB: fakeDB() }
    expect((await handleAudio(req(), env, 'ambience', 'nope')).status).toBe(404)
    expect((await handleAudio(req(), env, 'tracks', 'spy-chase')).status).toBe(404)
    await env.AUDIO.put('track/arena-anthem.mp3.pending', '1')
    expect((await handleAudio(req(), env, 'track', 'arena-anthem')).status).toBe(202)
    const no = await handleAudio(req(), env, 'ambience', 'rain', { fetcher: async () => new Response('missing permission', { status: 401 }) })
    expect(no.status).toBe(503)
    expect(await no.text()).not.toMatch(/missing permission/)
    expect(env.AUDIO.m.has('ambience/rain.mp3.pending')).toBe(false)
    expect((await handleAudio(req(), { DB: fakeDB() }, 'ambience', 'rain')).status).toBe(503) // no storage set up
  })
})
