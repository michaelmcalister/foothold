// Answering mission questions out loud. After a question is read out, the app
// listens for a few seconds (the browser's speech recognition, on iPhone and
// Android) and matches what you said to one of the options: the letter ("A",
// "option B"), the order ("the first one"), or words from the option itself
// ("the fire trail", "1932"). Tapping still works, and if nothing is heard
// the story carries on by itself. matchAnswer is pure and unit tested.
// In the iPhone app the browser's speech recognition isn't available, so it
// uses the phone's own through a native plugin (native.js).

import { ref } from 'vue'
import { isNativeApp } from '../native.js'
import { noteTrouble } from './trouble.js'

/** True while the microphone is open for an answer (the screen shows it). */
export const listening = ref(false)
/** Why voice answers aren't working here, in plain words (null when they are). */
export const listenProblem = ref(null)
const PROBLEMS = {
  'not-allowed': 'The microphone or speech recognition isn\u2019t allowed for Foothold. Check Settings, then Safari (or your browser), then Microphone and Speech Recognition.',
  'service-not-allowed': 'This phone won\u2019t let Foothold use speech recognition here. Tap your answers instead.',
  'audio-capture': 'The microphone couldn\u2019t be used. Another app may have it.',
  network: 'Speech recognition needs a connection, and the phone couldn\u2019t reach it.',
  'language-not-supported': 'Speech recognition doesn\u2019t support Australian English on this phone.',
}

const Recognition = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null)
export const canListen = () => isNativeApp() || !!Recognition()

const nativeSpeech = () => import('@capgo/capacitor-speech-recognition').then((m) => m.SpeechRecognition)

// How speech recognition tends to hear single letters
const LETTER_SOUNDS = {
  A: ['a', 'ay', 'eh', 'hey', 'aye', 'ey', 'option a', 'answer a', 'letter a'],
  B: ['b', 'be', 'bee', 'bea', 'bey', 'option b', 'answer b', 'letter b'],
  C: ['c', 'see', 'sea', 'si', 'cee', 'option c', 'answer c', 'letter c'],
}
const ORDER = [['first', 'one', '1', 'number one'], ['second', 'two', '2', 'number two'], ['third', 'three', '3', 'number three']]
const SMALL = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'it', 'in', 'on', 'at', 'for', 'with', 'your', 'you', 'them', 'him', 'her', 'his', 'take', 'go', 'get', 'by'])

const clean = (t) => String(t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const words = (t) => clean(t).split(' ').filter((w) => w && !SMALL.has(w))

/**
 * Which option a spoken answer means, or null if it isn't clear.
 * options: [{ key: 'A', label: 'Carry the cage' }, ...]
 */
export function matchAnswer(transcript, options) {
  const said = clean(transcript)
  if (!said) return null
  const padded = ` ${said} `
  // 1. the words of an option ("the fire trail", "1932"): the best clear match wins
  const scored = options.map((o) => {
    const ws = words(o.label)
    const hits = ws.filter((w) => padded.includes(` ${w} `)).length
    return { key: o.key, score: ws.length ? hits / ws.length : 0, hits }
  }).sort((a, b) => b.score - a.score)
  if (scored[0].hits && scored[0].score >= 0.5 && (scored.length < 2 || scored[0].score > scored[1].score)) return scored[0].key
  // 2. the letter, said on its own or as "option B"
  for (const o of options) {
    const sounds = LETTER_SOUNDS[o.key] || [o.key.toLowerCase()]
    if (sounds.some((s) => said === s || padded.includes(` option ${s} `) || padded.includes(` answer ${s} `) || said.endsWith(` ${s}`) && s.length > 1)) return o.key
  }
  // 3. the order ("the second one")
  for (const pass of [0, 1]) { // "the second one": the ordinal word first, then plain numbers
    for (let i = 0; i < options.length && i < ORDER.length; i++) {
      const ws = pass === 0 ? ORDER[i].slice(0, 1) : ORDER[i].slice(1)
      if (ws.some((w) => padded.includes(` ${w} `))) return options[i].key
    }
  }
  // 4. any single word from just one option
  const single = scored.filter((x) => x.hits > 0)
  if (single.length === 1) return single[0].key
  return null
}

let current = null
let nativeStop = null

/** Stop listening (an answer was tapped, or the run ended). */
export function stopListening() {
  try { current?.abort() } catch { /* already stopped */ }
  current = null
  nativeStop?.()
  nativeStop = null
  listening.value = false
}

// In the app: the phone's own speech recognition, with partial results
function listenNative(options, { timeoutMs, lang }) {
  return new Promise((resolve) => {
    let done = false
    let handle = null
    let errHandle = null
    let speech = null
    let heard = ''
    const finish = (key) => {
      if (done) return
      done = true
      clearTimeout(timer)
      listening.value = false
      nativeStop = null
      handle?.remove?.()
      errHandle?.remove?.()
      speech?.stop().catch(() => {})
      if (!key) noteTrouble('microphone', heard ? `heard "${heard.slice(0, 60)}" but it didn't match an answer` : 'heard nothing before the question closed')
      resolve(key)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    nativeStop = () => finish(null)
    nativeSpeech().then(async (s) => {
      speech = s
      if (done) return
      const perm = await s.checkPermissions().catch(() => null)
      if (perm?.speechRecognition !== 'granted') {
        const asked = await s.requestPermissions().catch(() => null)
        if (asked?.speechRecognition !== 'granted') {
          noteTrouble('microphone', `not allowed (${asked?.speechRecognition || perm?.speechRecognition || 'no answer'})`)
          listenProblem.value = 'The microphone or speech recognition isn\u2019t allowed for Foothold. Open Settings, then Foothold, and switch them on.'
          return finish(null)
        }
      }
      errHandle = await s.addListener('error', (e) => noteTrouble('microphone', e?.message || e?.error || JSON.stringify(e))).catch(() => null)
      handle = await s.addListener('partialResults', (e) => {
        for (const t of e.matches || [e.accumulatedText || '']) {
          if (t) heard = t
          const key = matchAnswer(t, options)
          if (key) { listenProblem.value = null; return finish(key) }
        }
      })
      if (done) return handle.remove()
      listening.value = true
      await s.start({ language: lang, maxResults: 3, partialResults: true, popup: false })
    }).catch((e) => { noteTrouble('microphone', e); finish(null) })
  })
}

/**
 * Listen for one answer. Resolves with an option key, or null if nothing
 * clear was heard in time (or listening isn't possible here).
 */
export function listenFor(options, { timeoutMs = 12000, lang = 'en-AU' } = {}) {
  if (isNativeApp()) { stopListening(); return listenNative(options, { timeoutMs, lang }) }
  const R = Recognition()
  if (!R) return Promise.resolve(null)
  stopListening()
  return new Promise((resolve) => {
    let done = false
    let r = null
    let tries = 0
    const finish = (key) => {
      if (done) return
      done = true
      listening.value = false
      clearTimeout(timer)
      try { r?.abort() } catch { /* fine */ }
      if (current === r) current = null
      resolve(key)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    // Phones (iPhone especially) stop listening after a moment of quiet, so
    // keep starting again until there's an answer or time is up
    const begin = () => {
      if (done) return
      if (++tries > 12) return finish(null)
      r = new R()
      current = r
      r.lang = lang
      r.interimResults = true
      r.continuous = false
      r.maxAlternatives = 3
      r.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          for (let j = 0; j < e.results[i].length; j++) {
            const key = matchAnswer(e.results[i][j].transcript, options)
            if (key) { listenProblem.value = null; return finish(key) }
          }
        }
      }
      r.onerror = (e) => {
        if (PROBLEMS[e.error]) { listenProblem.value = PROBLEMS[e.error]; finish(null) }
        // 'no-speech' and 'aborted' just mean try again
      }
      r.onend = () => { if (!done) setTimeout(begin, 120) }
      try { r.start(); listening.value = true } catch { setTimeout(begin, 300) }
    }
    begin()
  })
}

/**
 * From a tap (the Start button): start and stop speech recognition once, so
 * the phone asks for the microphone and speech recognition then, not in the
 * middle of a question. Some phones only allow listening that began from a tap.
 */
export function primeListening() {
  if (isNativeApp()) {
    nativeSpeech().then((s) => s.requestPermissions()).catch(() => {})
    return
  }
  const R = Recognition()
  if (!R) return
  try {
    const r = new R()
    r.lang = 'en-AU'
    r.onerror = (e) => { if (PROBLEMS[e.error] && e.error !== 'network') listenProblem.value = PROBLEMS[e.error] }
    r.onstart = () => setTimeout(() => { try { r.abort() } catch { /* fine */ } }, 400)
    r.start()
  } catch { /* not this time */ }
}

/** Ask for the microphone once, from a tap (the Start button), so a question mid-run doesn't stop to ask. */
export async function primeMicrophone() {
  if (isNativeApp()) return nativeSpeech().then((s) => s.requestPermissions()).then((p) => p.speechRecognition === 'granted').catch(() => false)
  if (!canListen() || !navigator.mediaDevices?.getUserMedia) return false
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    s.getTracks().forEach((t) => t.stop())
    return true
  } catch { return false }
}

/** "Say A for the fire trail, or B for the road." */
export function optionsPrompt(options) {
  const parts = options.map((o) => `${o.key} for ${o.label.replace(/\.$/, '').replace(/^[A-Z]/, (c) => (/^(I|Sydney|Crane|Bluey|Gwen|Pixel|Mack|Viv|Reg|Jo|Ollie|Pip|Apollo|Voyager|Andromeda|Orion)\b/.test(o.label) ? c : c.toLowerCase()))}`)
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, or ${parts.at(-1)}` : parts[0]
  return `Say ${list}.`
}
