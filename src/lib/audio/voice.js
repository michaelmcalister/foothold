// Spoken updates during a run. Uses the Australian ElevenLabs voice from the
// Foothold server (/api/tts) when it's set up, and the phone's built-in
// voices otherwise or whenever the server voice can't answer. Lines queue
// so they never talk over each other; speak() resolves when the line ends.

import { CAST, isCast, stripTags } from '../missions/cast.js'
import { context } from './sfx.js'

let unlocked = false
let player = null // one <audio> element, unlocked on a tap and reused (phones insist)
let serverPaused = 0 // after a refusal, use the phone voice for a while

// ---- what the server offers ----
let ttsPromise = null
/** { voices: [{ key, name, about }], default } or null */
export function serverVoices() {
  if (!ttsPromise) {
    ttsPromise = (async () => {
      try {
        const r = await fetch(import.meta.env.BASE_URL + 'api/config', { signal: AbortSignal.timeout(4000) })
        if (r.ok && (r.headers.get('content-type') || '').includes('json')) return (await r.json())?.tts || null
      } catch { /* no server (GitHub Pages) */ }
      return null
    })()
  }
  return ttsPromise
}

// ---- the phone's own voices ----
export function voices() {
  if (!('speechSynthesis' in window)) return []
  return speechSynthesis.getVoices()
}

// Australian first, then other English voices
export function australianVoices() {
  const all = voices()
  const au = all.filter((v) => /en[-_]AU/i.test(v.lang))
  const en = all.filter((v) => /^en/i.test(v.lang) && !au.includes(v))
  return [...au, ...en]
}

export function pickVoice(name = '') {
  const list = australianVoices()
  return list.find((v) => v.name === name) || list.find((v) => /en[-_]AU/i.test(v.lang)) || list[0] || null
}

// Voices load late on some browsers; resolve once they're there (or give up)
export function voicesReady() {
  if (!('speechSynthesis' in window)) return Promise.resolve([])
  if (speechSynthesis.getVoices().length) return Promise.resolve(speechSynthesis.getVoices())
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices())
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

// Phones only allow sound after a tap. Call this from the Start button.
export function unlock() {
  if (typeof Audio !== 'undefined') {
    if (!player) player = new Audio()
    player.src = import.meta.env.BASE_URL + 'silent.mp3'
    player.play().catch(() => {})
  }
  if (!unlocked && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    speechSynthesis.speak(u)
  }
  unlocked = true
  serverVoices() // warm the config
}

// ---- sharing the speaker with your music ----
// On iPhone a web page's sound normally takes over the audio, which stops
// Spotify or Apple Music (and iPhone won't let them start again from the
// background). Safari can mark a page's sound as a short announcement
// instead ('transient'): your music dips under the voice and comes back up
// after. Elsewhere, and on older iPhones, this does nothing.
// During a run the page keeps one sound mode (setRunSession): 'playback' when
// it has the speaker to itself (ignores the silent switch, so the effects and
// music play too), or 'ambient' alongside Spotify. Switching modes line by
// line can pause the effects on iPhone, so only the Spotify case switches.
// A looping silent clip also holds the 'playback' mode on iPhones without the
// audioSession setting (before iOS 17), so the effects ignore the silent switch there too.
let runSession = null
let holder = null
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
function holdSpeaker(on) {
  if (typeof Audio === 'undefined') return
  if (on) {
    if (!holder) { holder = new Audio(SILENCE); holder.loop = true; holder.setAttribute('playsinline', '') }
    holder.play().catch(() => { /* needs a tap: the next one will do */ })
  } else holder?.pause()
}
export function setRunSession(kind) {
  runSession = kind
  const s = typeof navigator !== 'undefined' ? navigator.audioSession : null
  if (s && 'type' in s) { try { s.type = kind || 'auto' } catch { /* not allowed here */ } }
  if (!s || !('type' in s)) holdSpeaker(kind === 'playback')
}
/** The sound mode set for this run or flyover (null when none). */
export const runSessionKind = () => runSession

let announcing = 0 // nested announcements share one switch
export async function asAnnouncement(fn) {
  const s = typeof navigator !== 'undefined' ? navigator.audioSession : null
  if (!s || !('type' in s) || runSession === 'playback' || announcing) return fn()
  const was = s.type
  announcing++
  try { s.type = 'transient' } catch { /* not allowed: carry on */ }
  try { return await fn() } finally {
    announcing--
    try { s.type = was === 'transient' ? 'auto' : was } catch { /* fine */ }
  }
}

function speakPhone(text, voiceName, { pitch = 1, rate = 1.02 } = {}) {
  if (!text || !('speechSynthesis' in window)) return Promise.resolve()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(voiceName)
    if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'en-AU'
    u.rate = rate
    u.pitch = pitch
    const t = setTimeout(resolve, 2000 + text.length * 90) // some browsers never fire onend
    u.onend = u.onerror = () => { clearTimeout(t); resolve() }
    speechSynthesis.speak(u)
  })
}

// Story lines made ahead of time: 'voice|text' -> Promise<Blob | null>
const made = new Map()
const madeKey = (voiceKey, text) => voiceKey + '|' + text

async function fetchVoice(text, voiceKey, timeoutMs = 6000) {
  const r = await fetch(import.meta.env.BASE_URL + 'api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, voice: voiceKey }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!r.ok) {
    if (r.status === 429 || r.status === 503) serverPaused = Date.now() + 10 * 60000
    throw new Error('server voice ' + r.status)
  }
  return r.blob()
}

async function playBlob(blob, text) {
  const url = URL.createObjectURL(blob)
  if (!player) player = new Audio()
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 3000 + text.length * 130)
      player.onended = () => { clearTimeout(t); resolve() }
      player.onerror = () => { clearTimeout(t); reject(new Error('playback')) }
      player.src = url
      player.play().catch((e) => { clearTimeout(t); reject(e) })
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// The same clip through Web Audio (the context the sound effects use, woken by a tap)
async function playWeb(blob, text) {
  const ctx = context()
  if (!ctx || ctx.state !== 'running') throw new Error('no web audio')
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
  await new Promise((resolve) => {
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    const t = setTimeout(resolve, 3000 + text.length * 130)
    src.onended = () => { clearTimeout(t); resolve() }
    src.start()
  })
}

/**
 * Play a voice clip so it shares the speaker with your music: as an
 * announcement first (iPhone lowers Spotify under it), through Web Audio if
 * the player won't, then the ordinary way. Only if all of those fail does the
 * caller fall back to the phone's own voice.
 */
async function playVoice(blob, text) {
  try { return await asAnnouncement(() => playBlob(blob, text)) } catch { /* next way */ }
  try { return await asAnnouncement(() => playWeb(blob, text)) } catch { /* next way */ }
  return playBlob(blob, text)
}

async function speakServer(text, voiceKey) {
  await playVoice(await fetchVoice(text, voiceKey), text)
}

/**
 * Get a story's lines ready before the run, a few at a time, so each one
 * plays the moment it's due (and with no signal later on). lines: [{ who, text }].
 * Quietly gives up if the server voice isn't there.
 */
export async function prepareLines(lines, { coachVoice = 'charlie' } = {}) {
  if (coachVoice === 'phone' || !(await serverVoices())) return 0
  const todo = lines.filter((l) => isCast(l.who) && !made.has(madeKey(l.who, l.text)))
  let i = 0
  let ready = 0
  const worker = async () => {
    while (i < todo.length && Date.now() > serverPaused) {
      const l = todo[i++]
      const k = madeKey(l.who, l.text)
      if (made.has(k)) continue
      const p = fetchVoice(l.text, l.who, 20000).catch(() => null)
      made.set(k, p)
      if (await p) ready++
      else made.delete(k) // try again when it's due
    }
  }
  await Promise.all([worker(), worker(), worker()])
  return ready
}

/** Forget the story lines made for the last run. */
export function forgetLines() { made.clear() }

/**
 * Say a story line in a character's voice: the cast voice from the server
 * when it's there (made ahead by prepareLines, or fetched now), else the
 * phone's voice with the character's pitch and pace.
 */
export async function speakAs(text, who, { coachVoice = 'charlie', voiceName = '' } = {}) {
  if (!text) return
  const c = CAST[who]
  if (!c) return speak(stripTags(text), { coachVoice, voiceName })
  if (coachVoice !== 'phone' && Date.now() > serverPaused && (await serverVoices())) {
    try {
      const k = madeKey(who, text)
      const blob = (made.has(k) ? await made.get(k) : null) || (await fetchVoice(text, who, 9000))
      await playVoice(blob, text)
      return
    } catch { /* fall back to the phone voice below */ }
  }
  await asAnnouncement(() => speakPhone(stripTags(text), voiceName, { pitch: c.pitch, rate: c.rate * 1.02 }))
}

/**
 * Say a line. coachVoice is a server voice key ('charlie', 'brenna') or
 * 'phone'; voiceName picks among the phone's voices.
 */
export async function speak(text, { coachVoice = 'charlie', voiceName = '' } = {}) {
  if (!text) return
  if (coachVoice !== 'phone' && Date.now() > serverPaused && (await serverVoices())) {
    try {
      await speakServer(text, coachVoice)
      return
    } catch { /* fall back to the phone voice below */ }
  }
  await asAnnouncement(() => speakPhone(text, voiceName))
}

export function hush() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  if (player) { player.pause(); player.removeAttribute('src') }
}
