// Foothold's recorded sounds: GET /api/audio/ambience/:id and
// GET /api/audio/track/:id. Each sound in src/lib/audio/library.js is made
// once with ElevenLabs (sound effects for the ambience loops, music for the
// tracks), stored in R2 (binding AUDIO) and served from there to everyone
// after that, with long browser caching. Nothing about the listener is sent:
// the prompts are fixed. The key needs ElevenLabs' Sound Effects and Music
// permissions; without them this answers 503 and the app keeps its
// synthesised sound.
import { hit } from './db.js'
import { AMBIENCE, TRACKS, isAmbience, isTrack } from '../src/lib/audio/library.js'

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
const PENDING_MS = 4 * 60 * 1000 // someone else is making this one; ask again shortly
const SFX_MODELS = ['eleven_text_to_sound_v2'] // supports seamless loops
const MUSIC_MODELS = ['music_v1']

const audioHeaders = { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=31536000, immutable' }

async function makeAmbience(env, fetcher, id) {
  for (const model of SFX_MODELS) {
    const res = await fetcher('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: AMBIENCE[id], loop: true, duration_seconds: 30, prompt_influence: 0.45, model_id: model }),
    })
    if (res.ok) return res.arrayBuffer()
    console.error('ambience', id, res.status) // never log the key
    if (res.status === 401 || res.status === 403) throw Object.assign(new Error('not allowed'), { status: res.status })
  }
  return null
}

async function makeTrack(env, fetcher, id) {
  const t = TRACKS[id]
  for (const model of MUSIC_MODELS) {
    const res = await fetcher('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ prompt: t.prompt, music_length_ms: t.seconds * 1000, model_id: model, force_instrumental: true }),
    })
    if (res.ok) return res.arrayBuffer()
    console.error('track', id, res.status)
    if (res.status === 401 || res.status === 403) throw Object.assign(new Error('not allowed'), { status: res.status })
  }
  return null
}

/** kind: 'ambience' | 'track'. */
export async function handleAudio(req, env, kind, id, { fetcher = fetch } = {}) {
  const known = kind === 'ambience' ? isAmbience(id) : kind === 'track' ? isTrack(id) : false
  if (!known) return json({ error: 'No sound by that name.', code: 'not_found' }, 404)
  if (!env.AUDIO) return json({ error: 'Recorded sound is not set up.', code: 'audio_off' }, 503)
  const key = `${kind}/${id}.mp3`
  const have = await env.AUDIO.get(key)
  if (have) return new Response(have.body, { headers: audioHeaders })
  if (!env.ELEVENLABS_API_KEY) return json({ error: 'Recorded sound is not set up.', code: 'audio_off' }, 503)

  // Someone else is making it right now
  const pending = await env.AUDIO.head(`${key}.pending`)
  if (pending && Date.now() - pending.uploaded.getTime() < PENDING_MS) return json({ error: 'Being made now.', code: 'pending' }, 202, { 'retry-after': '30' })

  const r = await hit(env, 'audio', req.headers.get('cf-connecting-ip') || 'unknown')
  if (!r.ok) return json({ error: 'Too many new sounds at once.', code: 'rate_limited' }, 429, { 'retry-after': String(r.retryAfter || 600) })

  await env.AUDIO.put(`${key}.pending`, '1')
  let audio = null
  try {
    audio = kind === 'ambience' ? await makeAmbience(env, fetcher, id) : await makeTrack(env, fetcher, id)
  } catch (e) {
    await env.AUDIO.delete(`${key}.pending`)
    return json({ error: 'The sound service said no.', code: 'audio_not_allowed' }, 503)
  }
  await env.AUDIO.delete(`${key}.pending`)
  if (!audio) return json({ error: 'That sound could not be made right now.', code: 'audio_failed' }, 502)
  await env.AUDIO.put(key, audio, { httpMetadata: { contentType: 'audio/mpeg' } })
  return new Response(audio, { headers: audioHeaders })
}
