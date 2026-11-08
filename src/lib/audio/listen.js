// Answering mission questions out loud. After a question is read out, the app
// listens for a few seconds (the browser's speech recognition, on iPhone and
// Android) and matches what you said to one of the options: the letter ("A",
// "option B"), the order ("the first one"), or words from the option itself
// ("the fire trail", "1932"). Tapping still works, and if nothing is heard
// the story carries on by itself. matchAnswer is pure and unit tested.

import { ref } from 'vue'

/** True while the microphone is open for an answer (the screen shows it). */
export const listening = ref(false)

const Recognition = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null)
export const canListen = () => !!Recognition()

// How speech recognition tends to hear single letters
const LETTER_SOUNDS = {
  A: ['a', 'ay', 'eh', 'hey', 'aye', 'option a', 'answer a', 'letter a'],
  B: ['b', 'be', 'bee', 'option b', 'answer b', 'letter b'],
  C: ['c', 'see', 'sea', 'option c', 'answer c', 'letter c'],
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

/** Stop listening (an answer was tapped, or the run ended). */
export function stopListening() {
  try { current?.abort() } catch { /* already stopped */ }
  current = null
  listening.value = false
}

/**
 * Listen for one answer. Resolves with an option key, or null if nothing
 * clear was heard in time (or listening isn't possible here).
 */
export function listenFor(options, { timeoutMs = 12000, lang = 'en-AU' } = {}) {
  const R = Recognition()
  if (!R) return Promise.resolve(null)
  stopListening()
  return new Promise((resolve) => {
    let done = false
    const r = new R()
    current = r
    r.lang = lang
    r.interimResults = true
    r.continuous = true
    r.maxAlternatives = 3
    const finish = (key) => {
      if (done) return
      done = true
      listening.value = false
      clearTimeout(timer)
      try { r.abort() } catch { /* fine */ }
      if (current === r) current = null
      resolve(key)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          const key = matchAnswer(e.results[i][j].transcript, options)
          if (key && (e.results[i].isFinal || j === 0)) return finish(key)
        }
      }
    }
    r.onerror = () => finish(null)
    r.onend = () => finish(null)
    try { r.start(); listening.value = true } catch { finish(null) }
  })
}

/** Ask for the microphone once, from a tap (the Start button), so a question mid-run doesn't stop to ask. */
export async function primeMicrophone() {
  if (!canListen() || !navigator.mediaDevices?.getUserMedia) return false
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    s.getTracks().forEach((t) => t.stop())
    return true
  } catch { return false }
}

/** "Say A for the fire trail, or B for the road." */
export function optionsPrompt(options) {
  const parts = options.map((o) => `${o.key} for ${o.label.replace(/\.$/, '').replace(/^[A-Z]/, (c) => (/^(I|Sydney|Crane|Bluey|Gwen|Pixel|Mack|Viv|Reg|Jo|Ollie|Pip)\b/.test(o.label) ? c : c.toLowerCase()))}`)
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, or ${parts.at(-1)}` : parts[0]
  return `Say ${list}.`
}
