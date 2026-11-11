// Voice lines ease out instead of stopping dead: the last part fades with a
// soft curve and a little silence follows, written out as a WAV the phone plays.
import { describe, it, expect } from 'vitest'
import { fadeOut, wavBytes, FADE_S, TAIL_S } from '../src/lib/audio/voice.js'

describe('voice fade out', () => {
  const sr = 1000
  const flat = new Float32Array(2000).fill(0.8) // two seconds at full level

  it('keeps the start, fades the end to silence, and adds a quiet tail', () => {
    const out = fadeOut(flat, sr)
    expect(out.length).toBe(2000 + Math.round(TAIL_S * sr))
    expect(out[0]).toBeCloseTo(0.8)
    expect(out[2000 - Math.round(FADE_S * sr) - 1]).toBeCloseTo(0.8) // untouched just before the fade
    const mid = out[2000 - Math.round((FADE_S * sr) / 2)]
    expect(mid).toBeGreaterThan(0.3); expect(mid).toBeLessThan(0.5) // halfway through: about half
    expect(Math.abs(out[1999])).toBeLessThan(0.001) // the last sample of the clip is silent
    expect(out.slice(2000).every((x) => x === 0)).toBe(true)
    for (let i = 2000 - Math.round(FADE_S * sr); i < 1999; i++) expect(out[i + 1]).toBeLessThanOrEqual(out[i] + 1e-9) // only ever gets quieter
  })

  it('fades the whole of a clip shorter than the fade', () => {
    const out = fadeOut(new Float32Array(100).fill(1), sr)
    expect(out[0]).toBeLessThan(1)
    expect(Math.abs(out[99])).toBeLessThan(0.001)
  })

  it('writes a playable 16-bit mono WAV', () => {
    const w = wavBytes(new Float32Array([0, 1, -1]), 44100)
    const v = new DataView(w.buffer)
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE')
    expect(v.getUint32(24, true)).toBe(44100)
    expect(v.getUint32(40, true)).toBe(6)
    expect(v.getInt16(46, true)).toBe(0x7fff)
    expect(v.getInt16(48, true)).toBe(-0x7fff)
  })
})
