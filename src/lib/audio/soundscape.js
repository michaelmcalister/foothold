// The movie layer for the thriller missions: background sound for each scene
// (wind and cicadas, fire, rain, a city at night, a party upstairs), a score
// that tightens during a chase and settles after, and one-off effects (a
// siren, an alarm, a ferry horn, a radio squelch). All synthesised with Web
// Audio, like the rest of Foothold's sounds, so nothing to download and it
// works with no signal.
//
// It runs under the voice: duck() lowers it while someone is talking. The
// score sits out when Spotify is playing your own music; the scene sounds
// and effects stay. Pure parts (the patterns, levels, random event timing)
// are exported for tests; the voices take any AudioContext-like object.
import { note, tone, noise, pluck, bell, kick, pad, swell, noiseBuffer, SILENT } from './synth.js'
import { loopBuffer } from './recorded.js'
import { playSpatial, radioStatic, SPATIAL } from './spatial.js'

// ---- seeded randomness, so tests (and renders) are repeatable ----
export function rng(seed = 1) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// ---- continuous layers ----

// Freeze a fading level where it is at time `at`, ready for a new ramp. Uses
// cancelAndHoldAtTime where there is one: reading .value can give the wrong
// level (in some browsers, and always before an offline render starts), which
// made a stopping layer jump to full volume for a moment.
function holdAt(param, at) {
  if (param.cancelAndHoldAtTime) { param.cancelAndHoldAtTime(at); return }
  param.cancelScheduledValues(at)
  param.setValueAtTime(param.value, at)
}

/**
 * Looping filtered noise with an optional slow swell (gusts, waves):
 * { filter: { type, freq, q }, level, lfo: { rate, depth } }. Returns { stop(t) }.
 */
export function bed(ctx, out, t, { filter = { type: 'lowpass', freq: 800 }, level = 0.05, lfo = null, am = null, fadeIn = 2.5 } = {}) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = filter.type || 'lowpass'
  f.frequency.setValueAtTime(filter.freq, t)
  f.Q.setValueAtTime(filter.q ?? 0.7, t)
  const g = ctx.createGain()
  g.gain.setValueAtTime(SILENT, t)
  g.gain.linearRampToValueAtTime(level, t + fadeIn)
  src.connect(f)
  f.connect(g)
  g.connect(out)
  const mods = []
  // a slow swell on the level (wind gusts, waves)
  if (lfo) {
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(lfo.rate, t)
    const d = ctx.createGain()
    d.gain.setValueAtTime(level * lfo.depth, t)
    o.connect(d)
    d.connect(g.gain)
    o.start(t)
    mods.push(o)
  }
  // a fast flutter (cicadas, rotor blades)
  if (am) {
    const o = ctx.createOscillator()
    o.type = am.type || 'sine'
    o.frequency.setValueAtTime(am.rate, t)
    const d = ctx.createGain()
    d.gain.setValueAtTime(level * am.depth, t)
    o.connect(d)
    d.connect(g.gain)
    o.start(t)
    mods.push(o)
  }
  src.start(t, (t * 3.17) % 0.9)
  return {
    stop(at, fade = 2) {
      holdAt(g.gain, at)
      g.gain.linearRampToValueAtTime(SILENT, at + fade)
      src.stop(at + fade + 0.05)
      for (const o of mods) o.stop(at + fade + 0.05)
    },
  }
}

/** A steady low hum (air conditioning, a generator). */
export function hum(ctx, out, t, { freq = 60, level = 0.015, fadeIn = 2 } = {}) {
  const oscs = [freq, freq * 2].map((f, i) => {
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(f, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(SILENT, t)
    g.gain.linearRampToValueAtTime(level / (i + 1), t + fadeIn)
    o.connect(g)
    g.connect(out)
    o.start(t)
    return { o, g }
  })
  return {
    stop(at, fade = 2) {
      for (const { o, g } of oscs) {
        holdAt(g.gain, at)
        g.gain.linearRampToValueAtTime(SILENT, at + fade)
        o.stop(at + fade + 0.05)
      }
    },
  }
}

// ---- little sounds that pop up now and then in a scene ----
export const SPOTS = {
  crackle(ctx, out, t, r) {
    const n = 1 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) noise(ctx, out, t + i * (0.01 + r() * 0.04), { attack: 0.001, decay: 0.01 + r() * 0.03, peak: 0.03 + r() * 0.05, filter: { type: 'bandpass', freq: 1500 + r() * 3500, q: 2 } })
  },
  bird(ctx, out, t, r) {
    const f = 2400 + r() * 1400
    for (let i = 0; i < 2 + Math.floor(r() * 3); i++) tone(ctx, out, t + i * 0.13, { freq: f, glideTo: f * (1.15 + r() * 0.2), glideTime: 0.08, attack: 0.005, decay: 0.08, peak: 0.018 })
  },
  cricket(ctx, out, t, r) {
    for (let i = 0; i < 3; i++) tone(ctx, out, t + i * 0.06, { freq: 4300 + r() * 200, attack: 0.003, decay: 0.03, peak: 0.01 })
  },
  drip(ctx, out, t, r) {
    tone(ctx, out, t, { freq: 1200 + r() * 900, glideTo: 2400, glideTime: 0.04, attack: 0.002, decay: 0.05, peak: 0.02 })
  },
  clink(ctx, out, t, r) {
    bell(ctx, out, t, 2600 + r() * 900, { peak: 0.018, decay: 0.4 })
    if (r() > 0.5) bell(ctx, out, t + 0.07, 3100 + r() * 600, { peak: 0.012, decay: 0.3 })
  },
  carHorn(ctx, out, t) {
    for (const f of [392, 466]) tone(ctx, out, t, { freq: f, type: 'sawtooth', attack: 0.02, hold: 0.25, decay: 0.15, peak: 0.008, filter: { freq: 900 } })
  },
  passing(ctx, out, t, r) {
    swell(ctx, out, t, 2.5 + r() * 2, { peak: 0.03, from: 300, to: 900 })
  },
  farHorn(ctx, out, t) {
    for (const f of [note('A1'), note('E2')]) tone(ctx, out, t, { freq: f, type: 'sawtooth', attack: 0.4, hold: 1.6, decay: 1.2, peak: 0.02, filter: { freq: 400 } })
  },
  clap(ctx, out, t, r) {
    // a little ripple of applause
    for (let i = 0; i < 14; i++) noise(ctx, out, t + i * 0.07 + r() * 0.04, { attack: 0.002, decay: 0.04, peak: 0.02 + r() * 0.02, filter: { type: 'bandpass', freq: 1500 + r() * 900, q: 1 } })
  },
  tick(ctx, out, t) {
    noise(ctx, out, t, { attack: 0.001, decay: 0.006, peak: 0.02, filter: { type: 'highpass', freq: 5000 } })
  },
  blip(ctx, out, t, r) {
    // the dish's receiver chirping: a short pure tone, sometimes a pair
    const f = [880, 1320, 1760][Math.floor(r() * 3)]
    tone(ctx, out, t, { freq: f, attack: 0.005, decay: 0.12, peak: 0.012 })
    if (r() > 0.5) tone(ctx, out, t + 0.16, { freq: f * 1.5, attack: 0.005, decay: 0.12, peak: 0.01 })
  },
  buzz(ctx, out, t, r) {
    // one of the swarm darting close by
    tone(ctx, out, t, { freq: 520 + r() * 300, glideTo: 380 + r() * 200, glideTime: 0.7, type: 'sawtooth', attack: 0.2, decay: 0.5, peak: 0.008, filter: { type: 'bandpass', freq: 1400, q: 3 } })
  },
}

/**
 * The scenes. beds and hums play all the time; spots pop up at random, about
 * `rate` times a second.
 */
export const SCENES = {
  bush: {
    beds: [
      { filter: { type: 'lowpass', freq: 900 }, level: 0.045, lfo: { rate: 0.07, depth: 0.6 } }, // hot wind
      { filter: { type: 'bandpass', freq: 4800, q: 6 }, level: 0.03, am: { rate: 34, depth: 0.7 }, lfo: { rate: 0.05, depth: 0.5 } }, // cicadas
    ],
    spots: [{ name: 'bird', rate: 0.12 }],
  },
  smoke: {
    beds: [
      { filter: { type: 'lowpass', freq: 700 }, level: 0.06, lfo: { rate: 0.11, depth: 0.7 } },
      { filter: { type: 'lowpass', freq: 90 }, level: 0.05, lfo: { rate: 0.03, depth: 0.4 } }, // far off rumble
      { filter: { type: 'bandpass', freq: 4800, q: 6 }, level: 0.012, am: { rate: 34, depth: 0.7 } },
    ],
    spots: [{ name: 'crackle', rate: 0.6 }],
  },
  fire: {
    beds: [
      { filter: { type: 'lowpass', freq: 320 }, level: 0.08, lfo: { rate: 0.18, depth: 0.5 } }, // the roar
      { filter: { type: 'highpass', freq: 1500 }, level: 0.018, lfo: { rate: 0.23, depth: 0.6 } },
    ],
    spots: [{ name: 'crackle', rate: 5 }],
  },
  night: {
    beds: [
      { filter: { type: 'lowpass', freq: 500 }, level: 0.04, lfo: { rate: 0.06, depth: 0.6 } },
      { filter: { type: 'lowpass', freq: 80 }, level: 0.04, lfo: { rate: 0.02, depth: 0.5 } },
    ],
    spots: [{ name: 'cricket', rate: 0.5 }, { name: 'crackle', rate: 0.25 }],
  },
  rain: {
    beds: [
      { filter: { type: 'highpass', freq: 2200 }, level: 0.022, lfo: { rate: 0.05, depth: 0.3 } },
      { filter: { type: 'lowpass', freq: 1200 }, level: 0.016 },
    ],
    spots: [{ name: 'drip', rate: 3 }, { name: 'bird', rate: 0.05 }],
  },
  city: {
    beds: [
      { filter: { type: 'lowpass', freq: 160 }, level: 0.06 }, // the city's low hum
      { filter: { type: 'lowpass', freq: 1000 }, level: 0.025, lfo: { rate: 0.05, depth: 0.8 } },
    ],
    spots: [{ name: 'passing', rate: 0.08 }, { name: 'carHorn', rate: 0.02 }],
  },
  street: {
    beds: [
      { filter: { type: 'lowpass', freq: 200 }, level: 0.05 },
      { filter: { type: 'highpass', freq: 3000 }, level: 0.02, lfo: { rate: 0.08, depth: 0.4 } }, // wet roads and drizzle
    ],
    spots: [{ name: 'passing', rate: 0.12 }, { name: 'carHorn', rate: 0.02 }],
  },
  tower: {
    beds: [{ filter: { type: 'lowpass', freq: 400 }, level: 0.022 }],
    hums: [{ freq: 60, level: 0.012 }],
    spots: [{ name: 'tick', rate: 0.15 }],
  },
  gala: {
    beds: [
      { filter: { type: 'bandpass', freq: 650, q: 0.8 }, level: 0.045, lfo: { rate: 0.3, depth: 0.35 } }, // chatter through a wall
      { filter: { type: 'lowpass', freq: 200 }, level: 0.03 },
    ],
    spots: [{ name: 'clink', rate: 0.25 }],
  },
  studio: {
    beds: [
      { filter: { type: 'bandpass', freq: 700, q: 0.7 }, level: 0.04, lfo: { rate: 0.25, depth: 0.4 } }, // the audience murmuring
      { filter: { type: 'lowpass', freq: 180 }, level: 0.025 },
    ],
    spots: [{ name: 'clap', rate: 0.08 }],
  },
  outback: {
    beds: [
      { filter: { type: 'lowpass', freq: 380 }, level: 0.04, lfo: { rate: 0.05, depth: 0.7 } }, // cold wind over the paddocks
      { filter: { type: 'bandpass', freq: 4200, q: 8 }, level: 0.012, am: { rate: 22, depth: 0.8 } }, // crickets
    ],
    spots: [{ name: 'cricket', rate: 0.7 }],
  },
  dish: {
    beds: [
      { filter: { type: 'lowpass', freq: 300 }, level: 0.035, lfo: { rate: 0.04, depth: 0.5 } },
      { filter: { type: 'bandpass', freq: 4200, q: 8 }, level: 0.008, am: { rate: 22, depth: 0.8 } },
    ],
    hums: [{ freq: 50, level: 0.012 }],
    spots: [{ name: 'blip', rate: 0.12 }, { name: 'cricket', rate: 0.3 }],
  },
  swarm: {
    beds: [
      { filter: { type: 'bandpass', freq: 2600, q: 5 }, level: 0.02, am: { rate: 17, depth: 0.6 }, lfo: { rate: 0.13, depth: 0.7 } }, // hundreds of tiny rotors
      { filter: { type: 'lowpass', freq: 250 }, level: 0.03, lfo: { rate: 0.05, depth: 0.5 } },
    ],
    spots: [{ name: 'buzz', rate: 0.4 }, { name: 'blip', rate: 0.08 }],
  },
  harbour: {
    beds: [
      { filter: { type: 'lowpass', freq: 500 }, level: 0.05, lfo: { rate: 0.22, depth: 0.8 } }, // water on the pylons
      { filter: { type: 'lowpass', freq: 150 }, level: 0.035 },
    ],
    spots: [{ name: 'farHorn', rate: 0.012 }, { name: 'passing', rate: 0.03 }],
  },
}

/**
 * Sounds placed around you in each scene (spatial.js), about `rate` times a
 * second: birds in the trees, cars going past, a helicopter overhead.
 */
export const AROUND = {
  bush: [{ name: 'magpie', rate: 0.02 }, { name: 'kookaburra', rate: 0.008 }, { name: 'bird', rate: 0.05 }],
  smoke: [{ name: 'bird', rate: 0.02 }, { name: 'helicopter', rate: 0.004 }],
  fire: [{ name: 'firetruck', rate: 0.006 }, { name: 'helicopter', rate: 0.006 }],
  night: [{ name: 'dog', rate: 0.006 }],
  rain: [{ name: 'magpie', rate: 0.01 }, { name: 'bird', rate: 0.04 }],
  city: [{ name: 'car', rate: 0.05 }, { name: 'chatter', rate: 0.012 }],
  street: [{ name: 'car', rate: 0.07 }],
  tower: [],
  gala: [{ name: 'chatter', rate: 0.03 }],
  harbour: [{ name: 'chatter', rate: 0.01 }, { name: 'helicopter', rate: 0.003 }],
  studio: [],
  outback: [{ name: 'dog', rate: 0.004 }, { name: 'meteor', rate: 0.004 }],
  dish: [{ name: 'meteor', rate: 0.003 }],
  swarm: [{ name: 'drones', rate: 0.02 }, { name: 'helicopter', rate: 0.003 }],
}
/** What the map says is around you adds its own sounds (a park, a main road, shops). */
export const NEARBY = {
  park: [{ name: 'bird', rate: 0.06 }, { name: 'kids', rate: 0.02 }, { name: 'magpie', rate: 0.01 }, { name: 'dog', rate: 0.006 }],
  road: [{ name: 'car', rate: 0.06 }],
  shops: [{ name: 'chatter', rate: 0.02 }],
}

/** When the spatial sounds play between from and to: at most one every few seconds, so they never pile up. */
export function aroundTimes(list, from, to, r, { lastAt = -Infinity, gap = 5 } = {}) {
  const out = []
  for (const a of list) {
    for (let expected = a.rate * (to - from); expected > 0; expected -= 1) {
      if (r() < Math.min(1, expected)) out.push({ name: a.name, at: from + r() * (to - from) })
    }
  }
  out.sort((x, y) => x.at - y.at)
  const kept = []
  let last = lastAt
  for (const e of out) if (e.at - last >= gap) { kept.push(e); last = e.at }
  return kept
}

/** Start a scene's continuous layers. Returns { stop(t) }. */
export function startScene(ctx, out, name, t) {
  const sc = SCENES[name]
  if (!sc) return { stop() {} }
  const parts = [...(sc.beds || []).map((b) => bed(ctx, out, t, b)), ...(sc.hums || []).map((h) => hum(ctx, out, t, h))]
  return { stop: (at, fade) => parts.forEach((p) => p.stop(at, fade)) }
}

/**
 * When a scene's spots play between from and to (seconds). Each spot type
 * has an average rate; times come from the seeded random source.
 */
export function spotTimes(name, from, to, r) {
  const sc = SCENES[name]
  if (!sc?.spots) return []
  const out = []
  const span = to - from
  for (const s of sc.spots) {
    // Poisson-ish: for short windows, a chance per window
    let expected = s.rate * span
    while (expected > 0) {
      if (r() < Math.min(1, expected)) out.push({ name: s.name, at: from + r() * span })
      expected -= 1
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

// ---- one-off effects, played just before a line ----
export const STINGS = {
  siren: {
    dur: 2.6,
    build(ctx, out, t) {
      // a distant wail rising and falling twice
      for (let i = 0; i < 2; i++) {
        const at = t + i * 1.2
        tone(ctx, out, at, { freq: 620, glideTo: 980, glideTime: 0.6, type: 'sawtooth', attack: 0.15, hold: 0.5, decay: 0.5, peak: 0.14, filter: { freq: 1600 } })
      }
      return t + 2.6
    },
  },
  boom: {
    dur: 2.2,
    build(ctx, out, t) {
      tone(ctx, out, t, { freq: 70, glideTo: 32, glideTime: 1.2, attack: 0.01, decay: 1.8, peak: 0.4 })
      noise(ctx, out, t, { attack: 0.01, decay: 1.6, peak: 0.12, filter: { type: 'lowpass', freq: 300, to: 60, time: 1.6 } })
      return t + 2.0
    },
  },
  crack: {
    dur: 1.2,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.001, decay: 0.05, peak: 0.3, filter: { type: 'highpass', freq: 1200 } })
      noise(ctx, out, t + 0.03, { attack: 0.01, decay: 0.9, peak: 0.08, filter: { type: 'lowpass', freq: 1800, to: 200, time: 0.9 } })
      for (let i = 0; i < 6; i++) noise(ctx, out, t + 0.1 + i * 0.09, { decay: 0.02, peak: 0.05, filter: { type: 'bandpass', freq: 2500, q: 2 } })
      return t + 1.1
    },
  },
  rotor: {
    dur: 3.2,
    build(ctx, out, t) {
      for (let i = 0; i < 34; i++) {
        const at = t + i * 0.09
        const swellUp = Math.sin((i / 34) * Math.PI)
        noise(ctx, out, at, { attack: 0.005, decay: 0.06, peak: 0.08 + 0.3 * swellUp, filter: { type: 'lowpass', freq: 380 } })
      }
      return t + 3.2
    },
  },
  horn: {
    dur: 2.4,
    build(ctx, out, t) {
      for (const f of [note('A1'), note('E2'), note('A2')]) tone(ctx, out, t, { freq: f, type: 'sawtooth', attack: 0.15, hold: 1.4, decay: 0.7, peak: 0.08, filter: { freq: 700 } })
      return t + 2.3
    },
  },
  alarm: {
    dur: 1.8,
    build(ctx, out, t) {
      for (let i = 0; i < 6; i++) tone(ctx, out, t + i * 0.28, { freq: i % 2 ? 740 : 990, type: 'square', attack: 0.005, hold: 0.18, decay: 0.05, peak: 0.12, filter: { freq: 2200 } })
      return t + 1.8
    },
  },
  heartbeat: {
    dur: 2.4,
    build(ctx, out, t) {
      for (let i = 0; i < 3; i++) {
        const at = t + i * 0.8
        kick(ctx, out, at, { peak: 0.3 })
        kick(ctx, out, at + 0.2, { peak: 0.2 })
      }
      return t + 2.3
    },
  },
  thunk: {
    dur: 0.7,
    build(ctx, out, t) {
      tone(ctx, out, t, { freq: 110, glideTo: 60, glideTime: 0.1, attack: 0.002, decay: 0.25, peak: 0.3 })
      noise(ctx, out, t, { attack: 0.001, decay: 0.12, peak: 0.12, filter: { type: 'lowpass', freq: 900 } })
      return t + 0.6
    },
  },
  click: {
    dur: 0.5,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.001, decay: 0.012, peak: 0.3, filter: { type: 'highpass', freq: 3000 } })
      noise(ctx, out, t + 0.16, { attack: 0.001, decay: 0.02, peak: 0.35, filter: { type: 'bandpass', freq: 2000, q: 2 } })
      return t + 0.45
    },
  },
  whoosh: {
    dur: 1.0,
    build(ctx, out, t) {
      swell(ctx, out, t, 0.9, { peak: 0.35, from: 300, to: 4000 })
      return t + 1.0
    },
  },
  squelch: {
    dur: 0.22,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.003, hold: 0.07, decay: 0.05, peak: 0.22, filter: { type: 'bandpass', freq: 1800, q: 1.4 } })
      tone(ctx, out, t + 0.1, { freq: 1250, type: 'square', attack: 0.002, decay: 0.05, peak: 0.06, filter: { freq: 2500 } })
      return t + 0.2
    },
  },
}

// ---- the cinematic kit: big hits, risers and the like ----
Object.assign(STINGS, {
  transmission: {
    dur: 2.6,
    build(ctx, out, t) {
      // a signal from deep space: pulses in twos, threes and fives, over a hiss
      noise(ctx, out, t, { attack: 0.3, hold: 1.6, decay: 0.6, peak: 0.05, filter: { type: 'bandpass', freq: 2200, q: 0.8 } })
      let at = t + 0.15
      for (const n of [2, 3, 5]) {
        for (let i = 0; i < n; i++) tone(ctx, out, at + i * 0.09, { freq: 1480, attack: 0.004, decay: 0.06, peak: 0.12, fm: { ratio: 3, index: 0.6 } })
        at += n * 0.09 + 0.22
      }
      tone(ctx, out, t, { freq: note('A1'), type: 'triangle', attack: 0.6, hold: 1.2, decay: 0.8, peak: 0.1 })
      return t + 2.5
    },
  },
  servo: {
    dur: 2.2,
    build(ctx, out, t) {
      // a huge motor grinding round, ending in a clunk
      tone(ctx, out, t, { freq: 70, glideTo: 118, glideTime: 1.6, type: 'sawtooth', attack: 0.2, hold: 1.2, decay: 0.4, peak: 0.12, filter: { freq: 500, q: 2 } })
      tone(ctx, out, t, { freq: 140, glideTo: 236, glideTime: 1.6, type: 'square', attack: 0.2, hold: 1.2, decay: 0.4, peak: 0.025, filter: { freq: 900 } })
      noise(ctx, out, t + 1.8, { attack: 0.002, decay: 0.2, peak: 0.25, filter: { type: 'lowpass', freq: 400 } })
      return t + 2.1
    },
  },
  sonic: {
    dur: 2.6,
    build(ctx, out, t) {
      // a sonic boom: a hard double crack, then the rumble rolling away
      for (const at of [0, 0.12]) noise(ctx, out, t + at, { attack: 0.002, decay: 0.25, peak: 0.35, filter: { type: 'lowpass', freq: 1400, to: 200, time: 0.25 } })
      tone(ctx, out, t, { freq: 60, glideTo: 28, glideTime: 1.8, attack: 0.005, decay: 2.2, peak: 0.42 })
      noise(ctx, out, t + 0.2, { attack: 0.2, decay: 2, peak: 0.08, filter: { type: 'lowpass', freq: 160 } })
      return t + 2.5
    },
  },
  scan: {
    dur: 1.8,
    build(ctx, out, t) {
      // something sweeping the sky: two rising tones that hang in the air
      for (const at of [0, 0.7]) tone(ctx, out, t + at, { freq: 400, glideTo: 2400, glideTime: 0.6, attack: 0.02, decay: 0.7, peak: 0.08, fm: { ratio: 1.5, index: 0.4 } })
      return t + 1.7
    },
  },
  braam: {
    dur: 3.2,
    build(ctx, out, t) {
      // the trailer horn: stacked low saws opening up, with a thump under it
      for (const [n, d] of [['D1', -9], ['D2', 7], ['A2', -5], ['D3', 4]]) tone(ctx, out, t, { freq: note(n), type: 'sawtooth', detune: d, attack: 0.05, hold: 1.2, decay: 1.8, peak: 0.07, filter: { freq: 180, to: 1400, time: 0.5, q: 2 } })
      tone(ctx, out, t, { freq: 55, glideTo: 30, glideTime: 0.8, attack: 0.005, decay: 1.4, peak: 0.45 })
      noise(ctx, out, t, { attack: 0.01, decay: 1.2, peak: 0.08, filter: { type: 'lowpass', freq: 600, to: 100, time: 1.2 } })
      return t + 3.1
    },
  },
  impact: {
    dur: 2.0,
    build(ctx, out, t) {
      tone(ctx, out, t, { freq: 90, glideTo: 38, glideTime: 0.35, attack: 0.002, decay: 1.1, peak: 0.38 })
      noise(ctx, out, t, { attack: 0.001, decay: 0.25, peak: 0.25, filter: { type: 'lowpass', freq: 3000, to: 300, time: 0.25 } })
      noise(ctx, out, t + 0.02, { attack: 0.01, decay: 1.6, peak: 0.05, filter: { type: 'highpass', freq: 4000, to: 2500, time: 1.6 } })
      return t + 1.9
    },
  },
  riser: {
    dur: 4.0,
    build(ctx, out, t) {
      swell(ctx, out, t, 3.8, { peak: 0.2, from: 200, to: 6000 })
      tone(ctx, out, t, { freq: 110, glideTo: 880, glideTime: 3.8, type: 'sawtooth', attack: 3.6, decay: 0.15, peak: 0.05, filter: { freq: 2400 } })
      return t + 3.95
    },
  },
  downer: {
    dur: 2.2,
    build(ctx, out, t) {
      tone(ctx, out, t, { freq: 420, glideTo: 50, glideTime: 1.8, type: 'sawtooth', attack: 0.02, decay: 2, peak: 0.22, filter: { freq: 1200, to: 200, time: 1.8 } })
      return t + 2.1
    },
  },
  timpani: {
    dur: 2.4,
    build(ctx, out, t) {
      // a roll that swells into a hit
      for (let i = 0; i < 18; i++) tone(ctx, out, t + i * 0.09, { freq: 82, glideTo: 70, glideTime: 0.1, attack: 0.003, decay: 0.2, peak: 0.05 + i * 0.012 })
      tone(ctx, out, t + 1.65, { freq: 98, glideTo: 60, glideTime: 0.3, attack: 0.003, decay: 0.7, peak: 0.45 })
      return t + 2.35
    },
  },
  taiko: {
    dur: 1.6,
    build(ctx, out, t) {
      for (const [at, f, pk] of [[0, 70, 0.45], [0.38, 70, 0.3], [0.75, 58, 0.55]]) {
        tone(ctx, out, t + at, { freq: f, glideTo: f * 0.6, glideTime: 0.3, attack: 0.002, decay: 0.6, peak: pk })
        noise(ctx, out, t + at, { attack: 0.001, decay: 0.06, peak: pk * 0.25, filter: { type: 'lowpass', freq: 900 } })
      }
      return t + 1.5
    },
  },
  clock: {
    dur: 3.0,
    build(ctx, out, t) {
      for (let i = 0; i < 6; i++) noise(ctx, out, t + i * 0.5, { attack: 0.001, decay: 0.02, peak: 0.6, filter: { type: 'bandpass', freq: i % 2 ? 2600 : 3400, q: 6 } })
      return t + 3.0
    },
  },
  smash: {
    dur: 1.4,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.001, decay: 0.4, peak: 0.25, filter: { type: 'highpass', freq: 2500 } })
      for (let i = 0; i < 12; i++) bell(ctx, out, t + 0.03 + i * 0.05 + (i % 3) * 0.013, 3000 + ((i * 937) % 2500), { peak: 0.03, decay: 0.25 })
      return t + 1.3
    },
  },
  creak: {
    dur: 1.6,
    build(ctx, out, t) {
      for (let i = 0; i < 26; i++) tone(ctx, out, t + i * 0.055, { freq: 180 + Math.sin(i * 0.6) * 60, type: 'sawtooth', attack: 0.004, decay: 0.05, peak: 0.28, filter: { type: 'bandpass', freq: 900, q: 4 } })
      return t + 1.55
    },
  },
  footsteps: {
    dur: 2.6,
    build(ctx, out, t) {
      // someone running up behind you, getting closer
      for (let i = 0; i < 9; i++) {
        const near = (i + 1) / 9
        noise(ctx, out, t + i * 0.29, { attack: 0.002, decay: 0.07, peak: 0.04 + 0.16 * near, filter: { type: 'lowpass', freq: 500 + 900 * near } })
        tone(ctx, out, t + i * 0.29, { freq: 90, glideTo: 60, glideTime: 0.05, attack: 0.002, decay: 0.08, peak: 0.05 + 0.15 * near })
      }
      return t + 2.6
    },
  },
  beeps: {
    dur: 1.6,
    build(ctx, out, t) {
      // a keypad: four digits, then the safe opens
      ;[1209, 1336, 1477, 1336].forEach((f, i) => { tone(ctx, out, t + i * 0.22, { freq: f, attack: 0.003, hold: 0.08, decay: 0.03, peak: 0.07 }); tone(ctx, out, t + i * 0.22, { freq: 770, attack: 0.003, hold: 0.08, decay: 0.03, peak: 0.07 }) })
      tone(ctx, out, t + 1.0, { freq: 1760, attack: 0.003, hold: 0.25, decay: 0.1, peak: 0.08 })
      return t + 1.5
    },
  },
  screech: {
    dur: 1.8,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.05, hold: 0.9, decay: 0.5, peak: 0.12, filter: { type: 'bandpass', freq: 2200, to: 1500, time: 1.4, q: 8 } })
      tone(ctx, out, t, { freq: 70, type: 'sawtooth', attack: 0.1, hold: 1.0, decay: 0.4, peak: 0.08, filter: { freq: 300 } })
      return t + 1.7
    },
  },
  thunder: {
    dur: 4.0,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.01, decay: 0.3, peak: 0.25, filter: { type: 'lowpass', freq: 1800 } })
      noise(ctx, out, t + 0.2, { attack: 0.3, hold: 0.8, decay: 2.6, peak: 0.25, filter: { type: 'lowpass', freq: 220, to: 70, time: 3.5 } })
      return t + 3.9
    },
  },
  cheer: {
    dur: 3.0,
    build(ctx, out, t) {
      swell(ctx, out, t, 1.2, { peak: 0.2, from: 800, to: 1600 })
      noise(ctx, out, t + 1.1, { attack: 0.05, hold: 0.8, decay: 1, peak: 0.25, filter: { type: 'bandpass', freq: 1300, q: 0.8 } })
      for (let i = 0; i < 10; i++) noise(ctx, out, t + 0.9 + i * 0.11 + (i % 3) * 0.03, { attack: 0.002, decay: 0.05, peak: 0.15, filter: { type: 'bandpass', freq: 1800, q: 1 } }) // claps
      return t + 2.9
    },
  },
  shutter: {
    dur: 0.5,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.001, decay: 0.03, peak: 0.4, filter: { type: 'bandpass', freq: 3500, q: 2 } })
      noise(ctx, out, t + 0.09, { attack: 0.001, decay: 0.04, peak: 0.3, filter: { type: 'bandpass', freq: 2500, q: 2 } })
      return t + 0.45
    },
  },
  hostin: {
    dur: 3.4,
    build(ctx, out, t) {
      // the host walks on: a bright brassy jingle over a wave of applause
      const notes = ['C5', 'E5', 'G5', 'C6', 'G5', 'C6']
      const lens = [0.12, 0.12, 0.12, 0.3, 0.12, 0.7]
      let at = t
      notes.forEach((n, i) => {
        for (const d of [-7, 7]) tone(ctx, out, at, { freq: note(n), type: 'sawtooth', detune: d, attack: 0.01, hold: lens[i] * 0.7, decay: 0.25, peak: 0.06, filter: { freq: 2600, q: 1 } })
        tone(ctx, out, at, { freq: note(n) / 2, type: 'triangle', attack: 0.01, hold: lens[i] * 0.6, decay: 0.2, peak: 0.08 })
        at += lens[i]
      })
      kick(ctx, out, t, { peak: 0.3 })
      kick(ctx, out, t + 0.66, { peak: 0.3 })
      // applause: a swell of many hands, and a cheer on top
      noise(ctx, out, t + 0.3, { attack: 0.5, hold: 1.6, decay: 1.0, peak: 0.12, filter: { type: 'bandpass', freq: 1500, q: 0.6 } })
      for (let i = 0; i < 60; i++) noise(ctx, out, t + 0.3 + i * 0.045 + ((i * 37) % 7) * 0.006, { attack: 0.002, decay: 0.035, peak: 0.05 + ((i * 13) % 5) * 0.01, filter: { type: 'bandpass', freq: 1300 + ((i * 211) % 1300), q: 1.2 } })
      swell(ctx, out, t + 0.4, 1.2, { peak: 0.06, from: 900, to: 2200 })
      return t + 3.3
    },
  },
  bonk: {
    dur: 0.8,
    build(ctx, out, t) {
      // a friendly wrong answer: a cartoon boing, not a harsh buzzer
      tone(ctx, out, t, { freq: 330, glideTo: 180, glideTime: 0.35, type: 'triangle', attack: 0.005, decay: 0.5, peak: 0.22 })
      tone(ctx, out, t + 0.02, { freq: 165, glideTo: 90, glideTime: 0.35, type: 'square', attack: 0.005, decay: 0.4, peak: 0.05, filter: { freq: 900 } })
      return t + 0.75
    },
  },
  cash: {
    dur: 0.9,
    build(ctx, out, t) {
      // points in the bank: a till ring and a sparkle
      bell(ctx, out, t, 2093, { peak: 0.16, decay: 0.5 })
      bell(ctx, out, t + 0.09, 2637, { peak: 0.14, decay: 0.6 })
      noise(ctx, out, t, { attack: 0.001, decay: 0.08, peak: 0.08, filter: { type: 'bandpass', freq: 5000, q: 2 } })
      return t + 0.85
    },
  },
  question: {
    dur: 0.9,
    build(ctx, out, t) {
      // a two note lift that asks for an answer
      bell(ctx, out, t, note('A5'), { peak: 0.14, decay: 0.5 })
      bell(ctx, out, t + 0.18, note('E6'), { peak: 0.16, decay: 0.7 })
      tone(ctx, out, t, { freq: note('A3'), type: 'triangle', attack: 0.02, decay: 0.7, peak: 0.08 })
      return t + 0.85
    },
  },
  correct: {
    dur: 1.1,
    build(ctx, out, t) {
      ;['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => pluck(ctx, out, t + i * 0.07, note(n), { peak: 0.16, decay: i === 3 ? 0.6 : 0.25, bright: 3600 }))
      bell(ctx, out, t + 0.28, note('D6'), { peak: 0.12, decay: 0.8 })
      return t + 1.05
    },
  },
  flare: {
    dur: 2.2,
    build(ctx, out, t) {
      // the fire flaring up: a roar that swells and settles
      noise(ctx, out, t, { attack: 0.6, hold: 0.4, decay: 1.1, peak: 0.25, filter: { type: 'lowpass', freq: 250, to: 900, time: 1.0 } })
      for (let i = 0; i < 14; i++) noise(ctx, out, t + 0.4 + i * 0.09, { attack: 0.001, decay: 0.02, peak: 0.08, filter: { type: 'bandpass', freq: 2000 + (i * 613) % 2500, q: 2 } })
      return t + 2.1
    },
  },
})

// ---- the title music: a cold open and an end theme for each series ----
export const THEMES = {
  quiz: {
    motif: ['C5', 'E5', 'G5', 'C6', 'A5', 'C6', 'G5'], // a bright brassy game show sting
    beats: [0.5, 0.5, 0.5, 1, 0.5, 0.5, 2],
    chord: ['C2', 'G2', 'C3', 'E3', 'G3'],
    end: ['C3', 'E3', 'G3', 'C4'],
    voice: 'horn',
  },
  ember: {
    motif: ['D4', 'F4', 'A4', 'G4', 'F4', 'E4', 'D4'], // a horn line
    beats: [1, 0.5, 1.5, 0.5, 0.5, 0.5, 2.5],
    chord: ['D2', 'A2', 'D3', 'F3', 'A3'],
    end: ['D3', 'F#3', 'A3', 'D4'],
    voice: 'horn',
  },
  signal: {
    motif: ['A4', 'E5', 'C5', 'B4', 'E5', 'G#4', 'A4'], // an eerie glassy line from far away
    beats: [1, 0.5, 1, 0.5, 1, 0.5, 2.5],
    chord: ['A1', 'E2', 'A2', 'C3', 'E3'],
    end: ['A2', 'C#3', 'E3', 'A3'],
    voice: 'glass',
  },
  heist: {
    motif: ['E3', 'G3', 'B3', 'A#3', 'A3', 'G3', 'E3'], // a spy bass line
    beats: [0.5, 0.5, 1, 0.5, 0.5, 0.5, 2],
    chord: ['E2', 'B2', 'E3', 'G3', 'B3'],
    end: ['E3', 'G#3', 'B3', 'E4'],
    voice: 'pluck',
  },
}

function motifNote(ctx, out, t, voice, freq, len) {
  if (voice === 'horn') {
    for (const d of [-6, 6]) tone(ctx, out, t, { freq, type: 'sawtooth', detune: d, attack: 0.08, hold: len * 0.7, decay: len * 0.5, peak: 0.05, filter: { freq: 700, to: 1600, time: 0.25, q: 1 } })
    tone(ctx, out, t, { freq: freq / 2, type: 'triangle', attack: 0.08, hold: len * 0.7, decay: len * 0.5, peak: 0.05 })
  } else if (voice === 'glass') {
    bell(ctx, out, t, freq, { peak: 0.13, decay: Math.max(0.6, len * 1.8) })
    tone(ctx, out, t, { freq: freq / 2, type: 'triangle', detune: 7, attack: 0.15, hold: len * 0.5, decay: len, peak: 0.04 })
  } else {
    pluck(ctx, out, t, freq, { peak: 0.2, decay: Math.min(0.6, len * 0.9), bright: 1400 })
    noise(ctx, out, t, { attack: 0.001, decay: 0.02, peak: 0.03, filter: { type: 'highpass', freq: 7000 } }) // brushed hat
  }
}

/**
 * The cold open: a swell from nothing, drums, a big hit, then the series
 * motif. Returns the time the narrator should come in (after the hit).
 */
export function scheduleIntro(ctx, out, name, t) {
  const th = THEMES[name] || THEMES.ember
  pad(ctx, out, t, th.chord.slice(0, 2).map(note), { peak: 0.05, attack: 4, hold: 3, decay: 3, cutoff: 500, to: 1200 })
  STINGS.riser.build(ctx, out, t + 1.2)
  STINGS.taiko.build(ctx, out, t + 4.2)
  STINGS.braam.build(ctx, out, t + 5.4)
  let at = t + 6.4
  const beat = name === 'heist' ? 0.32 : 0.42
  th.motif.forEach((n, i) => {
    const len = th.beats[i] * beat
    motifNote(ctx, out, at, th.voice, note(n), len)
    at += len
  })
  pad(ctx, out, t + 6.4, th.chord.map(note), { peak: 0.03, attack: 1.2, hold: 3, decay: 3, cutoff: 1100 })
  return t + 5.8
}
export const INTRO_S = 12 // how long the cold open runs before it settles

/** The end theme: the motif once more, landing on a lifted chord and a hit. */
export function scheduleOutro(ctx, out, name, t) {
  const th = THEMES[name] || THEMES.ember
  STINGS.timpani.build(ctx, out, t)
  let at = t + 1.65
  const beat = name === 'heist' ? 0.32 : 0.42
  th.motif.forEach((n, i) => {
    const len = th.beats[i] * beat
    motifNote(ctx, out, at, th.voice, note(i === th.motif.length - 1 ? th.end[0].replace(/\d/, (d) => String(Number(d) + 1)) : n), len)
    at += len
  })
  pad(ctx, out, at - 0.6, th.end.map(note), { peak: 0.045, attack: 0.4, hold: 2.5, decay: 3.5, cutoff: 1800 })
  STINGS.impact.build(ctx, out, at - 0.6)
  return at + 5
}

/** A soft generated hall, so the big moments ring out. Null without convolver support. */
export function makeHall(ctx, seconds = 2.4) {
  if (!ctx.createConvolver || !ctx.createBuffer) return null
  const len = Math.floor(ctx.sampleRate * seconds)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  const r = rng(11)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  const conv = ctx.createConvolver()
  conv.buffer = ir
  return conv
}

export function scheduleSting(ctx, out, name, t) {
  const s = STINGS[name]
  if (!s) return t
  return s.build(ctx, out, t)
}

// ---- the score ----
// Two moods. Intensity: 0 breathing (a drone), 1 tension (a pulse comes in),
// 2 chase (faster, busier, rising), 3 the end of an episode (a lift).
export const SCORES = {
  ember: {
    bpm: [72, 84, 120, 84],
    drone: ['D2', 'A2'],
    tension: ['D3', 'F3', 'A3'],
    lift: ['D3', 'F#3', 'A3', 'D4'],
    pulse: 'tom', // low drums
    run: ['D4', 'F4', 'A4', 'C5', 'D5', 'C5', 'A4', 'F4'],
    bass: ['D2', 'D2', 'F2', 'D2', 'C2', 'C2', 'A1', 'C2'],
  },
  quiz: {
    bpm: [96, 112, 132, 112],
    drone: ['C3', 'G3'],
    tension: ['C3', 'E3', 'G3'],
    lift: ['C3', 'E3', 'G3', 'C4'],
    pulse: 'tick',
    run: ['C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'D5', 'G5'],
    bass: ['C2', 'C2', 'E2', 'G2', 'A1', 'A1', 'G1', 'B1'],
  },
  signal: {
    bpm: [70, 92, 132, 92],
    drone: ['A1', 'E2'],
    tension: ['A2', 'C3', 'E3'],
    lift: ['A2', 'C#3', 'E3', 'A3'],
    pulse: 'tick', // the receiver ticking
    run: ['A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'C5', 'E5'],
    bass: ['A1', 'A1', 'C2', 'A1', 'G1', 'G1', 'E1', 'G1'],
  },
  heist: {
    bpm: [80, 100, 128, 100],
    drone: ['E2', 'B2'],
    tension: ['E3', 'G3', 'B3'],
    lift: ['E3', 'G#3', 'B3', 'E4'],
    pulse: 'tick', // a clock
    run: ['E4', 'G4', 'B4', 'D5', 'E5', 'D5', 'B4', 'G4'],
    bass: ['E2', 'E2', 'G2', 'E2', 'D2', 'D2', 'B1', 'D2'],
  },
}

/**
 * The notes for one sixteenth step of the score. Pure.
 * Returns [{ inst, freq?, at (seconds after the step), peak }].
 */
export function musicStep(scoreName, intensity, step) {
  const sc = SCORES[scoreName]
  if (!sc) return []
  const lvl = Math.max(0, Math.min(3, intensity | 0))
  const s = step % 64 // four bars
  const beat = s % 4 === 0
  const bar = s % 16 === 0
  const out = []
  // the drone, a long swell every two bars
  if (s % 32 === 0) out.push({ inst: 'pad', notes: lvl === 3 ? sc.lift : lvl >= 1 ? sc.tension : sc.drone, peak: lvl === 3 ? 0.035 : 0.028 })
  if (lvl >= 1) {
    // the pulse
    if (sc.pulse === 'tom') {
      if (s % 8 === 0) out.push({ inst: 'tom', freq: 72, peak: 0.22 })
      if (lvl >= 2 && s % 8 === 6) out.push({ inst: 'tom', freq: 96, peak: 0.12 })
    } else if (beat) {
      out.push({ inst: 'tick', peak: s % 8 === 0 ? 0.05 : 0.03 })
    }
    // a bass figure on the eighths
    if (s % 2 === 0) out.push({ inst: 'bass', freq: note(sc.bass[(s / 2) % 8]), peak: lvl >= 2 ? 0.1 : 0.06 })
  }
  if (lvl === 2) {
    // the chase: a running figure and driving drums
    out.push({ inst: 'run', freq: note(sc.run[s % 8]), peak: 0.035 + 0.02 * ((s % 16) / 16) })
    if (beat) out.push({ inst: 'kick', peak: 0.16 })
    if (s % 2 === 1) out.push({ inst: 'shaker', peak: 0.025 })
    if (bar && s === 48) out.push({ inst: 'riser', peak: 0.05 })
  }
  if (lvl === 3 && beat) out.push({ inst: 'bell', freq: note(sc.lift[(s / 4) % sc.lift.length]) * 2, peak: 0.05 })
  return out
}

export const stepSeconds = (scoreName, intensity) => 60 / (SCORES[scoreName]?.bpm[Math.max(0, Math.min(3, intensity | 0))] || 90) / 4

export function playNote(ctx, out, t, n) {
  switch (n.inst) {
    case 'pad': return pad(ctx, out, t, n.notes.map(note), { peak: n.peak, attack: 2.5, hold: 5, decay: 4, cutoff: 900 })
    case 'tom': return tone(ctx, out, t, { freq: n.freq, glideTo: n.freq * 0.6, glideTime: 0.25, attack: 0.004, decay: 0.45, peak: n.peak })
    case 'tick': return noise(ctx, out, t, { attack: 0.001, decay: 0.015, peak: n.peak, filter: { type: 'highpass', freq: 6500 } })
    case 'bass': return tone(ctx, out, t, { freq: n.freq, type: 'sawtooth', attack: 0.008, decay: 0.22, peak: n.peak, filter: { freq: 380, to: 160, time: 0.2 } })
    case 'run': return pluck(ctx, out, t, n.freq, { peak: n.peak, decay: 0.16, bright: 2200 })
    case 'kick': return kick(ctx, out, t, { peak: n.peak })
    case 'shaker': return noise(ctx, out, t, { attack: 0.004, decay: 0.03, peak: n.peak, filter: { type: 'highpass', freq: 7000 } })
    case 'riser': return swell(ctx, out, t, 3.8, { peak: n.peak, from: 300, to: 5000 })
    case 'bell': return bell(ctx, out, t, n.freq, { peak: n.peak, decay: 1.4 })
    default: return t
  }
}

// ---- the live engine ----

/**
 * One soundscape for one run. ctx: the AudioContext, out: where it plays.
 * Nothing starts until start(). All methods are safe to call at any time.
 */
/**
 * recorded (optional): { ambience(name), track(id) } returning Promise<AudioBuffer | null>,
 * for the recorded scene loops and chase music (recorded.js). chase: the
 * track that plays during a surge. Until a recording arrives, or without
 * one, the synthesised sound plays.
 */
export function createSoundscape(ctx, out, { score = null, seed = 7, music = true, recorded = null, chase = null } = {}) {
  const r = rng(seed)
  const master = ctx.createGain()
  master.gain.value = 1
  master.connect(out)
  const sceneBus = ctx.createGain()
  sceneBus.gain.value = 2.6 // the scene layers are quiet filtered noise; this lifts them to sit just under the voice
  sceneBus.connect(master)
  const musicBus = ctx.createGain()
  musicBus.gain.value = 0.85
  musicBus.connect(master)
  const stingBus = ctx.createGain()
  stingBus.gain.value = 1
  stingBus.connect(out) // effects are never ducked: they come just before a line
  // a touch of hall on the music and effects, for the big moments
  const hall = makeHall(ctx)
  if (hall) {
    const send = ctx.createGain()
    send.gain.value = 0.22
    hall.connect(send)
    send.connect(out)
    musicBus.connect(hall)
    stingBus.connect(hall)
  }

  // recorded loops and chase music sit on their own buses, at sensible levels
  const recBus = ctx.createGain()
  recBus.gain.value = 0.4 // the recorded loops are mastered around -22 dB; this sits them where the synthesised beds were
  recBus.connect(master)
  const chaseBus = ctx.createGain()
  chaseBus.gain.value = 0.5
  chaseBus.connect(master)
  const spaceBus = ctx.createGain() // sounds placed around you
  spaceBus.gain.value = 0.9
  spaceBus.connect(master)
  const radioBus = ctx.createGain() // static under radio lines: never ducked, it's part of the voice
  radioBus.gain.value = 1
  radioBus.connect(out)
  const sfxBufs = new Map() // recorded one-shots, as they arrive
  let near = { park: false, road: false, shops: false }
  let aroundUpTo = 0
  let lastAround = -Infinity
  let recLoop = null // the recorded loop for this scene
  let recScene = null // which scene it belongs to
  let chaseBuf = null
  let chaseLoop = null

  let scene = null
  let sceneName = null
  let intensity = 0
  let step = 0
  let nextStepAt = 0
  let spotsUpTo = 0
  let timer = null
  let ducked = false
  let finaleUntil = 0
  let chaseUpTo = 0
  let quietUntil = 0 // the score waits while the title music plays
  const LOOK = 1.2 // seconds scheduled ahead (timers are slow when the screen is off)

  function tick() {
    const now = ctx.currentTime
    const until = now + LOOK
    if (sceneName && spotsUpTo < until && recScene !== sceneName) {
      const from = Math.max(spotsUpTo, now)
      for (const s of spotTimes(sceneName, from, until, r)) SPOTS[s.name](ctx, sceneBus, s.at, r)
      spotsUpTo = until
    }
    // sounds placed around you: the scene's, plus whatever the map says is near
    if (sceneName && aroundUpTo < until) {
      const from = Math.max(aroundUpTo, now)
      const list = [...(AROUND[sceneName] || []), ...Object.entries(NEARBY).filter(([k]) => near[k]).flatMap(([, v]) => v)]
      for (const e of aroundTimes(list, from, until, r, { lastAt: lastAround })) {
        const def = SPATIAL[e.name]
        const buffer = def?.recorded ? sfxBufs.get(def.recorded) : null
        if (!buffer && !def?.synth) continue // a recording only, not made yet
        playSpatial(ctx, spaceBus, e.name, e.at, { buffer, r })
        lastAround = e.at
      }
      aroundUpTo = until
    }
    // in a chase, the sound of the chase: footsteps behind you, or the fire flaring
    if (intensity === 2 && score && chaseUpTo < until) {
      for (let at = Math.max(chaseUpTo, now); at < until; at += 0.31) {
        if (score === 'heist') {
          const near = 0.5 + 0.5 * Math.sin(at * 0.4) ** 2
          noise(ctx, sceneBus, at, { attack: 0.002, decay: 0.06, peak: 0.02 + 0.03 * near, filter: { type: 'lowpass', freq: 700 } })
        } else if (r() < 0.5) {
          SPOTS.crackle(ctx, sceneBus, at, r)
        }
      }
      chaseUpTo = until
    }
    if (music && score) {
      if (finaleUntil && now > finaleUntil) { intensity = 0; finaleUntil = 0 }
      if (nextStepAt < now) nextStepAt = Math.max(now + 0.05, quietUntil)
      while (nextStepAt < until && nextStepAt >= quietUntil && !chaseLoop) {
        for (const n of musicStep(score, intensity, step)) playNote(ctx, musicBus, nextStepAt, n)
        nextStepAt += stepSeconds(score, intensity)
        step++
      }
    }
  }

  const api = {
    start() {
      if (timer) return
      nextStepAt = ctx.currentTime + 0.1
      spotsUpTo = ctx.currentTime
      tick()
      timer = setInterval(tick, 250)
      if (recorded && chase) recorded.track(chase).then((b) => { chaseBuf = b }).catch(() => {})
      // the recorded one-shots, for the sounds that move around you
      if (recorded?.sfx) for (const id of new Set(Object.values(SPATIAL).map((d) => d.recorded).filter(Boolean))) recorded.sfx(id).then((b) => { if (b) sfxBufs.set(id, b) }).catch(() => {})
    },
    setScene(name) {
      if (!SCENES[name] || name === sceneName) return
      const t = ctx.currentTime
      scene?.stop(t, 3)
      recLoop?.stop(3)
      recLoop = null
      recScene = null
      scene = startScene(ctx, sceneBus, name, t + 0.05)
      sceneName = name
      spotsUpTo = t + 1 // let the new scene fade in before its spots
      // swap to the recording once it arrives (if this is still the scene)
      recorded?.ambience(name).then((buf) => {
        if (!buf || sceneName !== name || !timer) return
        recLoop = loopBuffer(ctx, recBus, buf, { level: 1, fadeIn: 4 })
        recScene = name
        scene?.stop(ctx.currentTime, 4)
        scene = null
      }).catch(() => {})
    },
    setIntensity(n) {
      const was = intensity
      intensity = Math.max(0, Math.min(3, n | 0))
      if (intensity === 3) finaleUntil = ctx.currentTime + 14
      // the chase music comes in for a surge and goes when it ends
      if (intensity === 2 && was !== 2 && chaseBuf && !chaseLoop) chaseLoop = loopBuffer(ctx, chaseBus, chaseBuf, { level: 1, fadeIn: 1.5, from: 0 })
      if (intensity !== 2 && chaseLoop) { chaseLoop.stop(3); chaseLoop = null; nextStepAt = ctx.currentTime + 3 }
    },
    get state() { return { scene: sceneName, intensity, ducked } },
    /** A sound placed around you, now (a beat's `spatial`). */
    spatial(name) {
      const def = SPATIAL[name]
      if (!def) return
      const buffer = def.recorded ? sfxBufs.get(def.recorded) : null
      playSpatial(ctx, spaceBus, name, ctx.currentTime + 0.05, { buffer, r })
      lastAround = ctx.currentTime + 0.05
    },
    /** What the map says is around you: { park, road, shops }. */
    setSurroundings(s) { near = { park: !!s?.park, road: !!s?.road, shops: !!s?.shops } },
    get surroundings() { return near },
    /** Static and crackle under a radio line that lasts about `seconds`. */
    radio(seconds) { radioStatic(ctx, radioBus, ctx.currentTime + 0.02, Math.max(0.5, seconds), r) },
    /** Lower everything but the effects while someone talks. */
    duck(on) {
      if (on === ducked) return
      ducked = on
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(on ? 0.35 : 1, t + (on ? 0.15 : 0.8))
    },
    /**
     * The cold open. Resolves when the narrator should start the title (just
     * after the big hit); the music carries on underneath.
     */
    intro() {
      const t = ctx.currentTime + 0.05
      const voiceAt = scheduleIntro(ctx, stingBus, score, t)
      quietUntil = t + INTRO_S
      nextStepAt = quietUntil
      return new Promise((res) => setTimeout(res, (voiceAt - t) * 1000))
    },
    /** The end theme, after the finale. Resolves when it has played. */
    outro() {
      const t = ctx.currentTime + 0.05
      const end = scheduleOutro(ctx, stingBus, score, t)
      quietUntil = end
      return new Promise((res) => setTimeout(res, (end - t - 3) * 1000))
    },
    /** Play an effect now; resolves when it's done. */
    sting(name) {
      const s = STINGS[name]
      if (!s) return Promise.resolve()
      const t = ctx.currentTime + 0.02
      s.build(ctx, stingBus, t)
      return new Promise((res) => setTimeout(res, s.dur * 1000))
    },
    /** Fade it all out. */
    stop(fade = 3) {
      clearInterval(timer)
      timer = null
      const t = ctx.currentTime
      scene?.stop(t, fade)
      recLoop?.stop(fade)
      chaseLoop?.stop(fade)
      setTimeout(() => { try { radioBus.disconnect() } catch { /* gone */ } }, (fade + 0.5) * 1000)
      scene = null
      recLoop = null
      chaseLoop = null
      sceneName = null
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(SILENT, t + fade)
      setTimeout(() => { try { master.disconnect(); stingBus.disconnect() } catch { /* already gone */ } }, (fade + 0.5) * 1000)
    },
  }
  return api
}

/** How a mission event moves the score. */
export function intensityFor(eventType, current) {
  switch (eventType) {
    case 'surge-start': return 2
    case 'surge-end': return 1
    case 'recover-start': return current === 2 ? 1 : 0
    case 'steady-start': return 1
    case 'chapter': return Math.max(current, 1)
    case 'finale': return 3
    default: return current
  }
}
