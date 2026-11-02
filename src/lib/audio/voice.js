// Spoken updates with the phone's built-in voices (Web Speech API), picking an
// Australian English voice when the phone has one. Lines queue so they never
// talk over each other; speak() resolves when the line has finished.

let unlocked = false

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

// Phones only allow speech after a tap. Call this from the Start button.
export function unlock() {
  if (unlocked || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  speechSynthesis.speak(u)
  unlocked = true
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

export function speak(text, { voiceName = '' } = {}) {
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

export function hush() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}
