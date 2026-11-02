// Spoken updates during a run. Uses the Australian ElevenLabs voice from the
// Foothold server (/api/tts) when it's set up, and the phone's built-in
// voices otherwise or whenever the server voice can't answer. Lines queue
// so they never talk over each other; speak() resolves when the line ends.

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

function speakPhone(text, voiceName) {
  if (!text || !('speechSynthesis' in window)) return Promise.resolve()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(voiceName)
    if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'en-AU'
    u.rate = 1.02
    const t = setTimeout(resolve, 2000 + text.length * 90) // some browsers never fire onend
    u.onend = u.onerror = () => { clearTimeout(t); resolve() }
    speechSynthesis.speak(u)
  })
}

async function speakServer(text, voiceKey) {
  const r = await fetch(import.meta.env.BASE_URL + 'api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, voice: voiceKey }),
    signal: AbortSignal.timeout(6000),
  })
  if (!r.ok) {
    if (r.status === 429 || r.status === 503) serverPaused = Date.now() + 10 * 60000
    throw new Error('server voice ' + r.status)
  }
  const url = URL.createObjectURL(await r.blob())
  if (!player) player = new Audio()
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 2000 + text.length * 120)
      player.onended = () => { clearTimeout(t); resolve() }
      player.onerror = () => { clearTimeout(t); reject(new Error('playback')) }
      player.src = url
      player.play().catch((e) => { clearTimeout(t); reject(e) })
    })
  } finally {
    URL.revokeObjectURL(url)
  }
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
  await speakPhone(text, voiceName)
}

export function hush() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  if (player) { player.pause(); player.removeAttribute('src') }
}
