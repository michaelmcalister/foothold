// Voice lines ease in and out instead of starting and stopping dead: the
// start of the voice rises and the end fades with a soft curve, a little
// silence follows, and it is written out as a WAV the phone plays.
import { describe, it, expect } from 'vitest'
import { fadeOut, fadeIn, wavBytes, FADE_S, FADE_IN_S, TAIL_S } from '../src/lib/audio/voice.js'

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

describe('voice fade in', () => {
  const sr = 1000

  it('rises from silence over half a second, starting where the voice starts', () => {
    const clip = new Float32Array(2000).fill(0.8)
    clip.fill(0, 0, 200) // a fifth of a second of quiet first
    const out = fadeIn(clip, sr)
    expect(FADE_IN_S).toBe(0.5)
    expect(out.length).toBe(2000)
    expect(out[200]).toBeCloseTo(0) // the first sound starts silent
    const mid = out[200 + Math.round((FADE_IN_S * sr) / 2)]
    expect(mid).toBeGreaterThan(0.3); expect(mid).toBeLessThan(0.5)
    expect(out[200 + Math.round(FADE_IN_S * sr)]).toBeCloseTo(0.8) // full level after the fade
    for (let i = 200; i < 200 + Math.round(FADE_IN_S * sr) - 1; i++) expect(out[i + 1]).toBeGreaterThanOrEqual(out[i] - 1e-9) // only ever gets louder
    expect(clip[700]).toBeCloseTo(0.8) // the original is left alone
  })

  it('leaves silence alone, and works with the fade out on a short clip', () => {
    expect(fadeIn(new Float32Array(50), sr).every((x) => x === 0)).toBe(true)
    const both = fadeOut(fadeIn(new Float32Array(300).fill(1), sr), sr)
    expect(both[0]).toBeCloseTo(0)
    expect(Math.abs(both[299])).toBeLessThan(0.001)
    expect(both.every((x) => x <= 1)).toBe(true)
  })
})
