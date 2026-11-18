// The iPhone app's own sound player (NativeSound in ios/App/App/AppDelegate.swift).
// Voice lines and sound effects go through it in the app, because sound from
// the web view stops when the phone locks, goes to sleep after a quiet minute
// and only starts again from a tap. Resolves true once the sound has played,
// false when the app has no native player (an older build, or not the
// iPhone app), so the caller plays it the web way instead.
import { isIOSApp } from '../native.js'
import { noteTrouble } from './trouble.js'

let plugin = null
let missing = false

async function player() {
  if (missing || !isIOSApp()) return null
  if (!plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    plugin = registerPlugin('NativeSound')
  }
  return plugin
}

/** Bytes to base64 without blowing the stack on long clips. Pure. */
export function toBase64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

let proven = false // set once a sound has really played: until then every play is checked
let fails = 0

/**
 * Play a WAV or MP3 (bytes) on the phone itself. wait: false resolves as soon
 * as it starts, but only once the player has proven it works; until then (or
 * after two failures in a row) the caller is told false and plays it the web way.
 */
export async function playNative(bytes, { volume = 1, timeoutMs = 15000, wait = true } = {}) {
  const p = await player()
  if (!p) return false
  const done = p.play({ data: toBase64(bytes), volume }).then(
    (r) => { proven = true; fails = 0; return r },
    (e) => {
      const why = String(e?.message || e?.code || e)
      noteTrouble('phone player', why)
      if (/not implemented|UNIMPLEMENTED/i.test(why) || ++fails >= 2) missing = true // fall back to the web view's sound for the rest of the session
      throw e
    },
  )
  if (!wait && proven) { done.catch(() => {}); return true }
  await Promise.race([done, new Promise((r) => setTimeout(r, timeoutMs))])
  return true
}

/** Stop everything the phone is playing for us (discarding a run). */
export async function stopNative() {
  const p = await player()
  await p?.stopAll().catch(() => {})
}

/** Whether the native player is worth trying. */
export const nativeSoundOn = () => isIOSApp() && !missing
