// The voice coach's Australian voice: POST /api/tts turns a short line into
// speech with ElevenLabs, so the API key stays on the server. Answers are
// cached by voice and text (most lines repeat: "1 kilometre."), and fresh
// lines are rate limited per address so nobody can run up the bill.
import { hit } from './db.js'
import { CAST, isCast, stripTags } from '../src/lib/missions/cast.js'

// Australian voices you can pick for the coach (Music and voice settings).
// All sit in the Foothold ElevenLabs account; Charlie is ElevenLabs' own.
// Keys are saved on phones, so keep them: add new ones, never rename.
export const VOICES = {
  charlie: { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', about: 'Australian man, upbeat' },
  brenna: { id: 'L4bD71zGAYHMT7a6MLwc', name: 'Brenna', about: 'Australian woman, calm' },
  amelia: { id: 'nBoLwpO4PAjQaQwVKPI1', name: 'Amelia', about: 'young Australian woman, crisp' },
  emily: { id: 'zMK1eWY5DTw3Jjb8efU8', name: 'Emily', about: 'Australian woman, calm and clear' },
  eva: { id: 'rQXSFvSjxR8Agb8vn1VY', name: 'Eva', about: 'Australian woman, warm and confident' },
  ruby: { id: 'b8gbDO0ybjX1VA89pBdX', name: 'Ruby', about: 'Australian woman, sunny and cheerful' },
  julieanne: { id: '8WaMCGQzWsKvf7sGPqjE', name: 'Julieanne', about: 'older Australian woman, confident' },
  lucas: { id: 'HhZz3hiP5lrqMIJOxTVX', name: 'Lucas', about: 'young Australian man, deep and friendly' },
  william: { id: 'dh3YdvdCYZdqFjtSFNTx', name: 'William', about: 'Australian man, warm and steady' },
  lee: { id: 'abRFZIdN4pvo8ZPmGxHP', name: 'Lee', about: 'Australian man, mature and friendly' },
  simon: { id: 'zcIk2xc7SGwlywr4TzZu', name: 'Simon', about: 'Australian man, strong and motivating' },
  blake: { id: 'M4FiuEOcSLrYgftiXoq9', name: 'Blake', about: 'Australian man, deep and confident' },
  jimbo: { id: 'YLbQE9U7P1K6rBNJWNSv', name: 'Jimbo', about: 'broad Aussie accent, loves a bit of slang' },
  scotty: { id: 'gZR4sGJmJaoBOVzKgZ8j', name: 'Scotty', about: 'Australian man, big TV promo energy' },
}
export const DEFAULT_VOICE = 'charlie'
const MODEL = 'eleven_flash_v2_5' // fast enough to speak a split as it happens
// Story lines are made before the run, so they can use the expressive model
// (it reads cues like [whispers]). If it says no, the steady model reads them.
export const STORY_MODEL = 'eleven_v3'
const STORY_FALLBACK = 'eleven_multilingual_v2'
const MAX_CHARS = 300

export const ttsOn = (env) => !!env.ELEVENLABS_API_KEY

/** What /api/config tells the app */
export function ttsConfig(env) {
  return ttsOn(env) ? { voices: Object.entries(VOICES).map(([key, v]) => ({ key, name: v.name, about: v.about })), default: DEFAULT_VOICE } : null
}

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function handleTts(req, env, { fetcher = fetch, cache = globalThis.caches?.default } = {}) {
  if (!ttsOn(env)) return json({ error: "The voice isn't set up yet.", code: 'tts_off' }, 503)
  const body = await req.json().catch(() => null)
  const text = String(body?.text || '').replace(/\s+/g, ' ').trim()
  const story = isCast(body?.voice)
  const voiceKey = story ? body.voice : Object.hasOwn(VOICES, body?.voice) ? body.voice : DEFAULT_VOICE
  const voiceId = story ? CAST[voiceKey].voiceId : VOICES[voiceKey].id
  if (!text) return json({ error: 'Nothing to say.', code: 'bad_request' }, 400)
  if (text.length > MAX_CHARS) return json({ error: 'That line is too long to speak.', code: 'bad_request' }, 400)

  // Same line, same voice: serve the copy we already made
  const key = new Request(`https://tts.foothold.cache/${voiceKey}/${await sha(text)}.mp3`)
  const cached = cache ? await cache.match(key) : null
  if (cached) return cached

  const ip = req.headers.get('cf-connecting-ip') || 'unknown'
  const r = await hit(env, 'tts', ip)
  if (!r.ok) return json({ error: 'The coach needs a breather. Updates will use the phone voice for a bit.', code: 'rate_limited' }, 429, { 'retry-after': String(r.retryAfter || 600) })

  const ask = (model, words, settings) => fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: words, model_id: model, language_code: 'en', voice_settings: settings }),
  })
  let res
  if (story) {
    res = await ask(STORY_MODEL, text, { stability: 0.5, similarity_boost: 0.8 })
    if (!res.ok && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) {
      res = await ask(STORY_FALLBACK, stripTags(text), { stability: 0.45, similarity_boost: 0.8, style: 0.35 })
    }
  } else {
    res = await ask(MODEL, text, { stability: 0.5, similarity_boost: 0.8, style: 0.2, speed: 1.05 })
  }
  if (!res.ok) {
    console.error('tts', res.status) // never log the text or the key
    return json({ error: "The voice didn't answer. Using the phone voice instead.", code: 'tts_failed' }, 502)
  }
  const audio = await res.arrayBuffer()
  const out = new Response(audio, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=2592000' } })
  if (cache) await cache.put(key, out.clone())
  return out
}
