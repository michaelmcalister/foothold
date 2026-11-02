// Small Web Audio synth kit for Foothold's sound effects and recap music.
// Everything is made from oscillators and filtered noise (no audio files,
// nothing to license). The maths (notes, envelopes, levels) is pure so it can
// be tested; the voices take any AudioContext-like object, so tests pass a fake.

export const SILENT = 0.0001 // exponential ramps can't reach zero

/** MIDI note number to Hz (A4 = 69 = 440 Hz). */
export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12)

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
/** 'F#4' or 'Bb3' to a MIDI number (C4 = 60). */
export function noteToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  if (!m) throw new Error('Bad note ' + name)
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}
export const note = (name) => midiToFreq(noteToMidi(name))

export const dbToGain = (db) => 10 ** (db / 20)
export const gainToDb = (g) => 20 * Math.log10(Math.max(g, 1e-9))

/**
 * An attack, hold, decay envelope as automation steps:
 * [['set' | 'lin' | 'exp', value, time], ...]. Starts silent, rises linearly
 * (a soft attack avoids clicks), holds, then falls away exponentially.
 */
export function envelope(t, { attack = 0.005, hold = 0, decay = 0.3, peak = 0.3 } = {}) {
  const a = Math.max(0.002, attack)
  const p = Math.max(SILENT * 2, peak)
  const steps = [['set', 0, t], ['lin', p, t + a]]
  if (hold > 0) steps.push(['lin', p, t + a + hold])
  steps.push(['exp', SILENT, t + a + hold + Math.max(0.01, decay)])
  return steps
}
export const envelopeEnd = (steps) => steps[steps.length - 1][2]

/** The envelope's level at time x (for tests and level checks). */
export function envelopeAt(steps, x) {
  if (x <= steps[0][2]) return steps[0][1]
  for (let i = 1; i < steps.length; i++) {
    const [kind, v, t] = steps[i]
    const [, v0, t0] = steps[i - 1]
    if (x <= t) {
      const f = t === t0 ? 1 : (x - t0) / (t - t0)
      if (kind === 'set') return v
      if (kind === 'lin') return v0 + (v - v0) * f
      return Math.max(v0, SILENT) * (v / Math.max(v0, SILENT)) ** f
    }
  }
  return steps[steps.length - 1][1]
}

export function applyEnv(param, steps) {
  param.value = 0 // silent before the first step too (a source can start a sample early)
  for (const [kind, v, t] of steps) {
    if (kind === 'set') param.setValueAtTime(v, t)
    else if (kind === 'lin') param.linearRampToValueAtTime(v, t)
    else param.exponentialRampToValueAtTime(v, t)
  }
}

function filtered(ctx, input, t, filter, decay) {
  if (!filter) return input
  const f = ctx.createBiquadFilter()
  f.type = filter.type || 'lowpass'
  f.frequency.setValueAtTime(filter.freq, t)
  if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t + (filter.time ?? decay))
  f.Q.setValueAtTime(filter.q ?? 0.7, t)
  input.connect(f)
  return f
}

/**
 * One oscillator note. Options: freq, type, attack, hold, decay, peak,
 * glideTo (pitch sweep), detune (cents), filter {type, freq, to, time, q},
 * fm {ratio, index, decay} for bell tones. Returns when it ends.
 */
export function tone(ctx, dest, t, o) {
  const { freq, type = 'sine', attack = 0.005, hold = 0, decay = 0.3, peak = 0.3, glideTo, glideTime, detune = 0, filter, fm } = o
  const env = envelope(t, { attack, hold, decay, peak })
  const end = envelopeEnd(env) + 0.02
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + (glideTime ?? decay))
  if (detune) osc.detune.setValueAtTime(detune, t)
  const g = ctx.createGain()
  applyEnv(g.gain, env)
  osc.connect(g)
  filtered(ctx, g, t, filter, decay).connect(dest)
  if (fm) {
    const m = ctx.createOscillator()
    m.type = 'sine'
    m.frequency.setValueAtTime(freq * fm.ratio, t)
    const mg = ctx.createGain()
    applyEnv(mg.gain, envelope(t, { attack: 0.002, decay: fm.decay ?? decay * 0.5, peak: freq * fm.index }))
    m.connect(mg)
    mg.connect(osc.frequency)
    m.start(t)
    m.stop(end)
  }
  osc.start(t)
  osc.stop(end)
  return end
}

const noiseBuffers = new WeakMap()
function noiseBuffer(ctx) {
  let b = noiseBuffers.get(ctx)
  if (!b) {
    const len = Math.floor(ctx.sampleRate)
    b = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = b.getChannelData(0)
    let seed = 12345 // a fixed seed keeps renders the same every time
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      d[i] = (seed / 0x3fffffff) - 1
    }
    noiseBuffers.set(ctx, b)
  }
  return b
}

/** A burst of filtered noise (hats, claps, snaps, swells). */
export function noise(ctx, dest, t, { attack = 0.002, hold = 0, decay = 0.08, peak = 0.2, filter = { type: 'highpass', freq: 6000 } } = {}) {
  const env = envelope(t, { attack, hold, decay, peak })
  const end = envelopeEnd(env) + 0.02
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  src.loop = true
  const g = ctx.createGain()
  applyEnv(g.gain, env)
  src.connect(g)
  filtered(ctx, g, t, filter, attack + hold + decay).connect(dest)
  src.start(t, (t * 7.31) % 0.9) // a different slice each time
  src.stop(end)
  return end
}

// ---- instruments built from the two voices above ----

/** A plucked note: triangle body plus a quiet sine octave, quick decay. */
export function pluck(ctx, dest, t, freq, { peak = 0.2, decay = 0.28, bright = 3200 } = {}) {
  const end = tone(ctx, dest, t, { freq, type: 'triangle', attack: 0.004, decay, peak, filter: { freq: bright, to: bright * 0.4, time: decay } })
  tone(ctx, dest, t, { freq: freq * 2, attack: 0.003, decay: decay * 0.6, peak: peak * 0.25 })
  return end
}

/** A bell: FM sine with a quick metallic shimmer that settles. */
export function bell(ctx, dest, t, freq, { peak = 0.16, decay = 0.9 } = {}) {
  return tone(ctx, dest, t, { freq, attack: 0.003, decay, peak, fm: { ratio: 3.5, index: 1.4, decay: decay * 0.35 } })
}

/** A soft blip for small UI moments. */
export function blip(ctx, dest, t, freq, { peak = 0.14, decay = 0.08, glideTo } = {}) {
  return tone(ctx, dest, t, { freq, attack: 0.004, decay, peak, glideTo, glideTime: decay })
}

/** A warm pad chord: two slightly detuned saws per note through a lowpass. */
export function pad(ctx, dest, t, freqs, { peak = 0.05, attack = 0.5, hold = 1.6, decay = 1.2, cutoff = 1400, to } = {}) {
  let end = t
  for (const f of freqs) {
    for (const d of [-7, 7]) {
      end = Math.max(end, tone(ctx, dest, t, { freq: f, type: 'sawtooth', detune: d, attack, hold, decay, peak, filter: { freq: cutoff, to, time: attack + hold, q: 0.5 } }))
    }
  }
  return end
}

/** A soft synth kick: a sine that drops in pitch. */
export function kick(ctx, dest, t, { peak = 0.4 } = {}) {
  return tone(ctx, dest, t, { freq: 150, glideTo: 45, glideTime: 0.12, attack: 0.003, decay: 0.24, peak })
}

export function hat(ctx, dest, t, { peak = 0.05, open = false } = {}) {
  return noise(ctx, dest, t, { decay: open ? 0.16 : 0.035, peak, filter: { type: 'highpass', freq: 7500 } })
}

export function clap(ctx, dest, t, { peak = 0.09 } = {}) {
  return noise(ctx, dest, t, { attack: 0.003, decay: 0.12, peak, filter: { type: 'bandpass', freq: 1600, q: 0.9 } })
}

/** Rising filtered noise, for a swell into a moment. */
export function swell(ctx, dest, t, dur, { peak = 0.05, from = 400, to = 5000 } = {}) {
  return noise(ctx, dest, t, { attack: dur * 0.85, decay: dur * 0.15 + 0.05, peak, filter: { type: 'bandpass', freq: from, to, time: dur, q: 1.2 } })
}

/** A bright crash for a lift (highpassed noise with a long tail). */
export function crash(ctx, dest, t, { peak = 0.06 } = {}) {
  return noise(ctx, dest, t, { attack: 0.004, decay: 1.6, peak, filter: { type: 'highpass', freq: 5000, to: 3000, time: 1.6 } })
}
