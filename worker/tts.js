// The voice coach's Australian voice: POST /api/tts turns a short line into
// speech with ElevenLabs, so the API key stays on the server. Answers are
// cached by voice and text (most lines repeat: "1 kilometre."), and fresh
// lines are rate limited per address so nobody can run up the bill.
import { hit } from './db.js'

// Australian voices the app may ask for. Charlie is ElevenLabs' own
// Australian voice; Brenna sits in the Foothold ElevenLabs account.
export const VOICES = {
  charlie: { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', about: 'Australian man, upbeat' },
  brenna: { id: 'L4bD71zGAYHMT7a6MLwc', name: 'Brenna', about: 'Australian woman, calm' },
}
export const DEFAULT_VOICE = 'charlie'
const MODEL = 'eleven_flash_v2_5' // fast enough to speak a split as it happens
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
  const voiceKey = VOICES[body?.voice] ? body.voice : DEFAULT_VOICE
  if (!text) return json({ error: 'Nothing to say.', code: 'bad_request' }, 400)
  if (text.length > MAX_CHARS) return json({ error: 'That line is too long to speak.', code: 'bad_request' }, 400)

  // Same line, same voice: serve the copy we already made
  const key = new Request(`https://tts.foothold.cache/${voiceKey}/${await sha(text)}.mp3`)
  const cached = cache ? await cache.match(key) : null
  if (cached) return cached

  const ip = req.headers.get('cf-connecting-ip') || 'unknown'
  const r = await hit(env, 'tts', ip)
  if (!r.ok) return json({ error: 'The coach needs a breather. Updates will use the phone voice for a bit.', code: 'rate_limited' }, 429, { 'retry-after': String(r.retryAfter || 600) })

  const res = await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voiceKey].id}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, language_code: 'en', voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, speed: 1.05 } }),
  })
  if (!res.ok) {
    console.error('tts', res.status) // never log the text or the key
    return json({ error: "The voice didn't answer. Using the phone voice instead.", code: 'tts_failed' }, 502)
  }
  const audio = await res.arrayBuffer()
  const out = new Response(audio, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=2592000' } })
  if (cache) await cache.put(key, out.clone())
  return out
}
