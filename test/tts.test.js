// Tests for the voice coach's server voice (worker/tts.js): key handling,
// caching of repeated lines (edge cache and R2), limits and failures.
import { describe, it, expect } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
const yes = async () => true // a signed-in player
import { handleTts, ttsConfig, VOICES, isScriptLine } from '../worker/tts.js'
import { missionById } from '../src/lib/missions/index.js'
import { LIMITS } from '../worker/db.js'

// Minimal D1 stand-in for the rate limiter
function fakeDB() {
  const db = new DatabaseSync(':memory:')
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  const prep = (sql) => ({
    bind: (...a) => ({ first: async () => db.prepare(sql).get(...a) ?? null, run: async () => db.prepare(sql).run(...a), all: async () => ({ results: db.prepare(sql).all(...a) }) }),
  })
  return { prepare: prep }
}
function fakeCache() {
  const m = new Map()
  return { match: async (k) => m.get(k.url)?.clone() || null, put: async (k, r) => { m.set(k.url, r) }, size: () => m.size }
}
const req = (body, ip = '1.2.3.4') => new Request('https://x/api/tts', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) })

describe('server voice', () => {
  it('is off without a key, and says so in config', async () => {
    expect(ttsConfig({})).toBeNull()
    const r = await handleTts(req({ text: 'Hi' }), {}, { isSignedIn: yes, cache: null })
    expect(r.status).toBe(503)
    expect(ttsConfig({ ELEVENLABS_API_KEY: 'k' }).voices.map((v) => v.key)).toEqual(Object.keys(VOICES))
  })

  it('speaks with the chosen Australian voice, caches repeats and never sends the key anywhere else', async () => {
    const calls = []
    const fetcher = async (url, init) => { calls.push({ url, init }); return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } }) }
    const env = { ELEVENLABS_API_KEY: 'secret', DB: fakeDB() }
    const cache = fakeCache()
    const a = await handleTts(req({ text: '1 kilometre.', voice: 'brenna' }), env, { isSignedIn: yes, fetcher, cache })
    expect(a.status).toBe(200)
    expect(a.headers.get('content-type')).toBe('audio/mpeg')
    expect(calls[0].url).toContain(VOICES.brenna.id)
    expect(calls[0].url.startsWith('https://api.elevenlabs.io/')).toBe(true)
    expect(calls[0].init.headers['xi-api-key']).toBe('secret')
    const b = await handleTts(req({ text: '  1   kilometre. ', voice: 'brenna' }), env, { isSignedIn: yes, fetcher, cache })
    expect(new Uint8Array(await b.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect(calls).toHaveLength(1) // the repeat came from the cache
    // Unknown voices fall back to the default, they don't reach ElevenLabs as given
    await handleTts(req({ text: 'Hello', voice: 'not-a-voice' }), env, { isSignedIn: yes, fetcher, cache })
    expect(calls[1].url).toContain(VOICES.charlie.id)
  })

  it('keeps every line in R2, so it is paid for once and reused everywhere', async () => {
    const calls = []
    const fetcher = async (url) => { calls.push(url); return new Response(new Uint8Array([4, 5, 6])) }
    const m = new Map()
    const AUDIO = { get: async (k) => (m.has(k) ? { arrayBuffer: async () => m.get(k) } : null), put: async (k, v) => { m.set(k, v) } }
    const env = { ELEVENLABS_API_KEY: 'k', DB: fakeDB(), AUDIO }
    const a = await handleTts(req({ text: 'Two kilometres.', voice: 'emily' }), env, { isSignedIn: yes, fetcher, cache: fakeCache() })
    expect(a.status).toBe(200)
    const [stored] = [...m.keys()]
    expect(stored).toMatch(new RegExp(`^tts/${VOICES.emily.id}/[0-9a-f]{64}\\.mp3$`))
    // A different server location (empty edge cache) gets it from R2, with no new charge
    const b = await handleTts(req({ text: 'Two kilometres.', voice: 'emily' }, '7.7.7.7'), env, { isSignedIn: yes, fetcher, cache: fakeCache() })
    expect(new Uint8Array(await b.arrayBuffer())).toEqual(new Uint8Array([4, 5, 6]))
    expect(b.headers.get('content-type')).toBe('audio/mpeg')
    expect(calls).toHaveLength(1)
    // Lines that name something personal stay out of R2
    await handleTts(req({ text: "Music's playing on Sam's iPhone.", voice: 'emily', keep: false }), env, { isSignedIn: yes, fetcher, cache: null })
    expect(m.size).toBe(1)
  })

  it('lets a whole episode be made at once: script lines in a story voice skip the per-address limit', async () => {
    const env = { ELEVENLABS_API_KEY: 'k', DB: fakeDB() }
    const ok = async () => new Response(new Uint8Array([7]))
    const line = missionById('signal-contact').beats[3].say
    expect(isScriptLine(line)).toBe(true)
    for (let i = 0; i < LIMITS.tts.max; i++) await handleTts(req({ text: `filler ${i}` }, '3.3.3.3'), env, { isSignedIn: yes, fetcher: ok, cache: null })
    expect((await handleTts(req({ text: 'not in any script', voice: 'anika' }, '3.3.3.3'), env, { isSignedIn: yes, fetcher: ok, cache: null })).status).toBe(429)
    expect((await handleTts(req({ text: line, voice: 'anika' }, '3.3.3.3'), env, { isSignedIn: yes, fetcher: ok, cache: null })).status).toBe(200)
    // The coach voice reading a script line still counts
    expect((await handleTts(req({ text: line, voice: 'charlie' }, '3.3.3.3'), env, { isSignedIn: yes, fetcher: ok, cache: null })).status).toBe(429)
  })

  it('refuses empty or long lines', async () => {
    const env = { ELEVENLABS_API_KEY: 'k', DB: fakeDB() }
    expect((await handleTts(req({ text: '' }), env, { isSignedIn: yes, cache: null })).status).toBe(400)
    expect((await handleTts(req({ text: 'x'.repeat(301) }), env, { isSignedIn: yes, cache: null })).status).toBe(400)
  })

  it('limits fresh lines per address, and reports a failed voice without leaking details', async () => {
    const env = { ELEVENLABS_API_KEY: 'k', DB: fakeDB() }
    const ok = async () => new Response(new Uint8Array([9]))
    for (let i = 0; i < LIMITS.tts.max; i++) expect((await handleTts(req({ text: `line ${i}` }), env, { isSignedIn: yes, fetcher: ok, cache: null })).status).toBe(200)
    expect((await handleTts(req({ text: 'one more' }), env, { isSignedIn: yes, fetcher: ok, cache: null })).status).toBe(429)
    expect((await handleTts(req({ text: 'one more' }, '5.6.7.8'), env, { isSignedIn: yes, fetcher: ok, cache: null })).status).toBe(200)
    const bad = await handleTts(req({ text: 'oops' }, '9.9.9.9'), env, { isSignedIn: yes, fetcher: async () => new Response('quota', { status: 401 }), cache: null })
    expect(bad.status).toBe(502)
    expect(await bad.text()).not.toContain('quota')
  })

  it('needs a signed-in player for a fresh line that is not in a script', async () => {
    let calls = 0
    const env = { ELEVENLABS_API_KEY: 'k' }
    const res = await handleTts(req({ text: 'You are flying today.' }), env, { fetcher: async () => { calls++; return new Response('x') }, cache: null })
    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe('signin')
    expect(calls).toBe(0)
  })
})

describe('paid limits', () => {
  it('fail closed when the limits table is missing, other limits fail open', async () => {
    const { hit } = await import('../worker/db.js')
    const broken = { DB: { prepare: () => { throw new Error('no table') } } }
    expect((await hit(broken, 'tts', '1.2.3.4')).ok).toBe(false)
    expect((await hit(broken, 'aiPlanUser', 'u1')).ok).toBe(false)
    expect((await hit(broken, 'comment', 'u1')).ok).toBe(true)
  })
})
