// Spoken updates during a run. Uses the Australian ElevenLabs voice from the
// Foothold server (/api/tts) when it's set up, and the phone's built-in
// voices otherwise or whenever the server voice can't answer. Lines queue
// so they never talk over each other; speak() resolves when the line ends.

import { CAST, isCast, stripTags } from '../missions/cast.js'
import { watch, reactive } from 'vue'
import { context, speakerOut, resume, rebuildContext } from './sfx.js'
import { audio } from './settings.js'
import { isAndroidApp, isNativeApp, isIOSApp, audioMix } from '../native.js'

// The last few reasons a server voice didn't play, newest first, shown under
// "Hear a sample" in settings so a problem on a phone can be read off the screen.
export const voiceTrouble = reactive([])
function trouble(where, e) {
  const msg = `${where}: ${e?.name && e.name !== 'Error' ? e.name + ' ' : ''}${e?.message || e}`
  console.warn(msg)
  voiceTrouble.unshift(`${new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}  ${msg}`)
  voiceTrouble.splice(4)
}

let unlocked = false
let player = null // one <audio> element, unlocked on a tap and reused (phones insist)
let serverPaused = 0 // after a refusal, use the phone voice for a while

// ---- what the server offers ----
let ttsPromise = null
/** { voices: [{ key, name, about }], default } or null */
// A failed check (no signal, a slow start) is tried again after 30 seconds,
// so one bad moment doesn't leave the phone voice on for the whole session.
let ttsFailedAt = 0
export function serverVoices() {
  if (ttsPromise && ttsFailedAt && Date.now() - ttsFailedAt > 30000) ttsPromise = null
  if (!ttsPromise) {
    ttsFailedAt = 0
    ttsPromise = (async () => {
      try {
        const r = await fetch(import.meta.env.BASE_URL + 'api/config', { signal: AbortSignal.timeout(6000) })
        if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
          const tts = (await r.json())?.tts || null
          if (tts) return tts
        }
      } catch (e) { trouble('voice check', e) /* no server (GitHub Pages) or no signal */ }
      ttsFailedAt = Date.now()
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
// In the iPhone app the app's own audio session does this instead (AudioMix):
// it keeps playing when the phone locks, which the web view's 'ambient'
// mode doesn't, and still plays alongside Spotify.
let nativeMix = false
// Resolves once the sound mode is set, so the run's first sounds come after it.
export async function setRunSession(kind, { fresh = false } = {}) {
  runSession = kind
  if (isIOSApp()) {
    if (!kind) return // between runs: leave the app's mode as it is
    const was = nativeMix
    nativeMix = await audioMix()
    if (!nativeMix) return webSession(kind)
    if (fresh && !was) { rebuildContext(); await resume() } // effects made before the switch go quiet: start them fresh (runs only, before any sound)
    return
  }
  webSession(kind)
}
function webSession(kind) {
  const s = typeof navigator !== 'undefined' ? navigator.audioSession : null
  if (s && 'type' in s) { try { s.type = kind || 'auto' } catch { /* not allowed here */ } }
  if (!s || !('type' in s)) holdSpeaker(kind === 'playback')
}
/** The sound mode set for this run or flyover (null when none). */
export const runSessionKind = () => runSession

let announcing = 0 // nested announcements share one switch
export async function asAnnouncement(fn) {
  // The iPhone app's own mode already mixes with Spotify. Lowering Spotify
  // under each line meant switching the sound off and on, which silenced the
  // effects, so the line just plays (the Pause music button is there for that).
  if (nativeMix) return fn()
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

// Android's web view has no built-in speech, so the Android app speaks
// through the phone's own text to speech engine instead.
async function speakAndroid(text, { pitch = 1, rate = 1.02 } = {}) {
  try {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
    await TextToSpeech.speak({ text, lang: 'en-AU', rate, pitch, queueStrategy: 1 })
  } catch (e) { console.warn('phone voice', e?.message || e) }
}

function speakPhone(text, voiceName, { pitch = 1, rate = 1.02 } = {}) {
  if (!text || audio.muted) return Promise.resolve()
  if (isAndroidApp()) return speakAndroid(text, { pitch, rate })
  if (!('speechSynthesis' in window)) return Promise.resolve()
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

// keep: false asks the server not to store the line for good (it names something personal)
async function fetchVoice(text, voiceKey, timeoutMs = 6000, keep = true) {
  const r = await fetch(import.meta.env.BASE_URL + 'api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(keep ? { text, voice: voiceKey } : { text, voice: voiceKey, keep: false }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!r.ok) {
    if (r.status === 429 || r.status === 503) serverPaused = Date.now() + 10 * 60000
    throw new Error('server voice ' + r.status)
  }
  return r.blob()
}

// Inside the app a blob: address won't play in an <audio> element (the
// iPhone's web view can't load it from the app's own address), so the clip
// goes in as a data: address there instead.
const asDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = () => reject(r.error)
  r.readAsDataURL(blob)
})

// Ease each clip out: the last FADE_S seconds fade with a soft curve, and a
// short silence follows, so a line never stops dead (and the speaker doesn't
// switch away mid word). Done on the decoded sound, so it works on iPhone,
// where an <audio> element's volume can't be changed. Pure parts exported for tests.
export const FADE_S = 0.6
export const TAIL_S = 0.35
export function fadeOut(samples, sampleRate, fadeS = FADE_S, tailS = TAIL_S) {
  const n = samples.length
  const out = new Float32Array(n + Math.round(tailS * sampleRate))
  out.set(samples)
  const f = Math.min(n, Math.round(fadeS * sampleRate))
  for (let i = 0; i < f; i++) out[n - f + i] *= 0.5 * (1 + Math.cos((Math.PI * (i + 1)) / f))
  return out
}
export function wavBytes(samples, sampleRate) {
  const b = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(b)
  const text = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)) }
  text(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  text(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true)
  return new Uint8Array(b)
}
async function softenEnd(blob) {
  try {
    const C = window.OfflineAudioContext || window.webkitOfflineAudioContext
    if (!C) return blob
    const buf = await new C(1, 1, 44100).decodeAudioData(await blob.arrayBuffer())
    let mono = buf.getChannelData(0)
    if (buf.numberOfChannels > 1) {
      const r = buf.getChannelData(1)
      mono = Float32Array.from(mono, (x, i) => (x + r[i]) / 2)
    }
    return new Blob([wavBytes(fadeOut(mono, buf.sampleRate), buf.sampleRate)], { type: 'audio/wav' })
  } catch (e) {
    console.warn('voice fade', e?.message || e)
    return blob // play it as it came
  }
}

async function playBlob(blob, text) {
  const native = isNativeApp()
  const url = native ? await asDataUrl(blob) : URL.createObjectURL(blob)
  if (!player) player = new Audio()
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 3000 + text.length * 130)
      player.onended = () => { clearTimeout(t); resolve() }
      player.onerror = () => { clearTimeout(t); reject(new Error('playback')) }
      player.src = url
      player.muted = audio.muted
      player.play().catch((e) => { clearTimeout(t); reject(e) })
    })
  } finally {
    if (!native) URL.revokeObjectURL(url)
  }
}

// The same clip through Web Audio (the context the sound effects use, woken by a tap)
async function playWeb(blob, text) {
  await resume() // the effects' audio may have gone to sleep since the last sound
  const ctx = context()
  if (!ctx || ctx.state !== 'running') throw new Error('no web audio')
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
  await new Promise((resolve) => {
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(speakerOut() || ctx.destination)
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
  blob = await softenEnd(blob)
  try { return await asAnnouncement(() => playBlob(blob, text)) } catch (e) { trouble('voice element', e) /* next way */ }
  try { return await asAnnouncement(() => playWeb(blob, text)) } catch (e) { trouble('voice web audio', e) /* next way */ }
  return playBlob(blob, text)
}

async function speakServer(text, voiceKey, keep) {
  await playVoice(await fetchVoice(text, voiceKey, 6000, keep), text)
}

/**
 * Get a story's lines ready before the run, a few at a time, so each one
 * plays the moment it's due (and with no signal later on). lines: [{ who, text }].
 * Quietly gives up if the server voice isn't there.
 */
// The cast keep their own voices even when the coach is on the phone's voice
export async function prepareLines(lines) {
  if (!(await serverVoices())) return 0
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
  if (Date.now() <= serverPaused) trouble('server voice', 'paused after the server said no')
  if (Date.now() > serverPaused && (await serverVoices())) {
    try {
      const k = madeKey(who, text)
      const blob = (made.has(k) ? await made.get(k) : null) || (await fetchVoice(text, who, 15000)) // the expressive model can take a while on a long line
      await playVoice(blob, text)
      return
    } catch (e) { trouble('server voice', e) /* fall back to the phone voice below */ }
  }
  await asAnnouncement(() => speakPhone(stripTags(text), voiceName, { pitch: c.pitch, rate: c.rate * 1.02 }))
}

/**
 * Say a line. coachVoice is a server voice key ('charlie', 'brenna') or
 * 'phone'; voiceName picks among the phone's voices. keep: false for a line
 * that names something personal (a device), so the server doesn't store it.
 */
export async function speak(text, { coachVoice = 'charlie', voiceName = '', keep = true } = {}) {
  if (!text) return
  if (coachVoice !== 'phone' && Date.now() <= serverPaused) trouble('server voice', 'paused after the server said no')
  if (coachVoice !== 'phone' && Date.now() > serverPaused && (await serverVoices())) {
    try {
      await speakServer(text, coachVoice, keep)
      return
    } catch (e) { trouble('server voice', e) /* fall back to the phone voice below */ }
  }
  await asAnnouncement(() => speakPhone(text, voiceName))
}

export function hush() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  if (player) { player.pause(); player.removeAttribute('src') }
}

// The top bar's speaker button: muting stops a line mid sentence, and the
// voice element stays quiet until it's turned back on.
watch(() => audio.muted, (m) => {
  if (player) player.muted = m
  if (m && typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.cancel()
})
