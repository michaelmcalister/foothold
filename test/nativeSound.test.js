// The iPhone app's own sound player (src/lib/audio/nativeSound.js): clips go
// over as base64, and outside the iPhone app nothing is tried.
import { describe, it, expect } from 'vitest'
import { toBase64, playNative, nativeSoundOn } from '../src/lib/audio/nativeSound.js'
import { wavBytes } from '../src/lib/audio/wav.js'

describe('native sound', () => {
  it('encodes long clips to base64 the same as a short way would', () => {
    const bytes = new Uint8Array(200000).map((_, i) => (i * 7) % 256)
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
    const wav = wavBytes(new Float32Array(10), 44100)
    expect(toBase64(wav).startsWith('UklGR')).toBe(true) // "RIFF"
  })
  it('is never tried outside the iPhone app', async () => {
    expect(nativeSoundOn()).toBe(false)
    expect(await playNative(new Uint8Array(4))).toBe(false)
  })
})
