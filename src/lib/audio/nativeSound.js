// The iPhone app's own sound player (NativeSound in ios/App/App/AppDelegate.swift).
// Voice lines and sound effects go through it in the app, because sound from
// the web view stops when the phone locks, goes to sleep after a quiet minute
// and only starts again from a tap. Resolves true once the sound has played,
// false when the app has no native player (an older build, or not the
// iPhone app), so the caller plays it the web way instead.
import { isIOSApp } from '../native.js'

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

/** Play a WAV or MP3 (bytes) on the phone itself. wait: false resolves as soon as it starts. */
export async function playNative(bytes, { volume = 1, timeoutMs = 15000, wait = true } = {}) {
  const p = await player()
  if (!p) return false
  const done = p.play({ data: toBase64(bytes), volume }).catch((e) => {
    // an app built before the native player: never ask again
    if (/not implemented|UNIMPLEMENTED/i.test(String(e?.message || e?.code || e))) missing = true
    throw e
  })
  if (!wait) { done.catch(() => {}); return true }
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
