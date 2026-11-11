// Sound kit for Two Cities (missions/series/twocities.js): a bronze gong, a
// two tone station chime and a tropical thunderclap as stings; six scenes (a
// Kuala Lumpur night market, a monsoon downpour, the river confluence under
// blue lights, Manila Bay at sunset, the stone streets of Intramuros and a
// Binondo street full of jeepneys); geckos, sizzling woks and hooves as
// little sounds; jeepneys, a calesa, scooters and a light rail train going
// past; and a gong and pentatonic theme and score. Everything is synthesised;
// the recorded versions are in the series LIBRARY. soundscape.js and
// spatial.js merge it in.
import { note, tone, noise, bell, kick, swell } from '../synth.js'

const stings = {
  gong: {
    dur: 3.8,
    build(ctx, out, t) {
      // a big bronze gong: a soft mallet thud, a deep shimmering hum and bright partials that wobble away
      noise(ctx, out, t, { attack: 0.002, decay: 0.08, peak: 0.12, filter: { type: 'lowpass', freq: 900 } })
      tone(ctx, out, t, { freq: 98, glideTo: 96, glideTime: 3, attack: 0.01, hold: 0.3, decay: 3.2, peak: 0.28, fm: { ratio: 1.41, index: 0.6 } })
      tone(ctx, out, t, { freq: 196, type: 'triangle', attack: 0.02, decay: 2.6, peak: 0.08 })
      for (const [r, p] of [[2.76, 0.05], [5.4, 0.03], [8.9, 0.015]]) bell(ctx, out, t, 98 * r, { peak: p, decay: 2.4 })
      return t + 3.7
    },
  },
  chime: {
    dur: 1.6,
    build(ctx, out, t) {
      // a station chime: two soft tones, high then low
      bell(ctx, out, t, note('E5'), { peak: 0.14, decay: 0.9 })
      bell(ctx, out, t + 0.45, note('C5'), { peak: 0.13, decay: 1.1 })
      tone(ctx, out, t, { freq: note('E4'), type: 'triangle', attack: 0.01, decay: 0.7, peak: 0.04 })
      tone(ctx, out, t + 0.45, { freq: note('C4'), type: 'triangle', attack: 0.01, decay: 0.9, peak: 0.04 })
      return t + 1.55
    },
  },
  tropicthunder: {
    dur: 4.2,
    build(ctx, out, t) {
      // a tropical storm breaking: a sharp crack overhead, a deep boom, then rain sweeping in
      noise(ctx, out, t, { attack: 0.001, decay: 0.08, peak: 0.4, filter: { type: 'highpass', freq: 1800 } })
      noise(ctx, out, t + 0.03, { attack: 0.003, decay: 0.6, peak: 0.25, filter: { type: 'lowpass', freq: 3000, to: 250, time: 0.6 } })
      tone(ctx, out, t + 0.05, { freq: 58, glideTo: 28, glideTime: 2, attack: 0.005, decay: 2.4, peak: 0.4 })
      noise(ctx, out, t + 0.6, { attack: 1.2, hold: 1.4, decay: 1.0, peak: 0.12, filter: { type: 'highpass', freq: 2500 } })
      noise(ctx, out, t + 0.6, { attack: 1.0, hold: 1.4, decay: 1.0, peak: 0.08, filter: { type: 'lowpass', freq: 500 } })
      return t + 4.1
    },
  },
  lanterns: {
    dur: 2.8,
    build(ctx, out, t) {
      // a discovery: tuned gongs climbing a pentatonic run, then a soft low gong under a bright chord
      ;['C5', 'D5', 'E5', 'G5', 'A5', 'C6'].forEach((n, i) => bell(ctx, out, t + i * 0.12, note(n), { peak: 0.09, decay: 0.7 }))
      tone(ctx, out, t + 0.75, { freq: 131, attack: 0.01, decay: 1.8, peak: 0.16, fm: { ratio: 1.41, index: 0.4 } })
      for (const n of ['C4', 'G4', 'E5']) tone(ctx, out, t + 0.75, { freq: note(n), type: 'triangle', attack: 0.05, hold: 0.6, decay: 1.3, peak: 0.035 })
      kick(ctx, out, t + 0.75, { peak: 0.2 })
      return t + 2.7
    },
  },
}

// little sounds in the new scenes
const spots = {
  gecko(ctx, out, t, r) {
    // a cicak on the wall: a run of quick chirps, each a little softer
    const n = 4 + Math.floor(r() * 4)
    for (let i = 0; i < n; i++) tone(ctx, out, t + i * 0.13, { freq: 2300 + r() * 300, glideTo: 1700, glideTime: 0.04, type: 'square', attack: 0.002, decay: 0.05, peak: 0.012 * (1 - i / (n + 2)), filter: { freq: 3500 } })
  },
  wok(ctx, out, t, r) {
    // something hitting a hot wok: a burst of sizzle, and the clang of a ladle
    noise(ctx, out, t, { attack: 0.01, hold: 0.4 + r() * 0.4, decay: 0.8, peak: 0.025, filter: { type: 'highpass', freq: 4000 } })
    if (r() < 0.6) bell(ctx, out, t + 0.1, 900 + r() * 300, { peak: 0.02, decay: 0.25 })
  },
  hoof(ctx, out, t, r) {
    // a horse stepping on cobbles somewhere
    for (let i = 0; i < 4; i++) noise(ctx, out, t + i * 0.24 + (i % 2) * 0.05, { attack: 0.001, decay: 0.04, peak: 0.03 + r() * 0.01, filter: { type: 'bandpass', freq: 1100 + r() * 300, q: 2 } })
  },
}

const scenes = {
  pasar: {
    beds: [
      { filter: { type: 'bandpass', freq: 900, q: 0.6 }, level: 0.03, lfo: { rate: 0.08, depth: 0.4 } }, // a crowd murmuring between stalls
      { filter: { type: 'highpass', freq: 4500 }, level: 0.008, lfo: { rate: 0.2, depth: 0.6 } }, // woks sizzling
    ],
    spots: [{ name: 'wok', rate: 0.15 }, { name: 'gecko', rate: 0.05 }, { name: 'clink', rate: 0.2 }],
  },
  monsoon: {
    beds: [
      { filter: { type: 'highpass', freq: 2000 }, level: 0.05, lfo: { rate: 0.05, depth: 0.3 } }, // rain drumming on awnings
      { filter: { type: 'lowpass', freq: 500 }, level: 0.05, lfo: { rate: 0.07, depth: 0.5 } }, // water gushing in drains
      { filter: { type: 'lowpass', freq: 90 }, level: 0.03, lfo: { rate: 0.03, depth: 0.6 } }, // thunder far off
    ],
    spots: [{ name: 'drip', rate: 1.6 }],
  },
  confluence: {
    beds: [
      { filter: { type: 'lowpass', freq: 800 }, level: 0.035, lfo: { rate: 0.1, depth: 0.5 } }, // the rivers flowing together
      { filter: { type: 'highpass', freq: 5000 }, level: 0.01, lfo: { rate: 0.05, depth: 0.5 } }, // the mist fountains hissing
    ],
    hums: [{ freq: 55, level: 0.005 }], // the city all around
    spots: [{ name: 'gecko', rate: 0.06 }, { name: 'cricket', rate: 0.3 }],
  },
  bayside: {
    beds: [
      { filter: { type: 'lowpass', freq: 700 }, level: 0.045, lfo: { rate: 0.13, depth: 0.8 } }, // small waves on the seawall
      { filter: { type: 'bandpass', freq: 1000, q: 0.6 }, level: 0.015, lfo: { rate: 0.06, depth: 0.4 } }, // people strolling
    ],
    spots: [{ name: 'bird', rate: 0.05 }],
  },
  intramuros: {
    beds: [
      { filter: { type: 'lowpass', freq: 400 }, level: 0.025, lfo: { rate: 0.05, depth: 0.5 } }, // a soft breeze down stone streets
    ],
    spots: [{ name: 'hoof', rate: 0.08 }, { name: 'bird', rate: 0.1 }],
  },
  jeepneys: {
    beds: [
      { filter: { type: 'lowpass', freq: 220 }, level: 0.04, lfo: { rate: 0.09, depth: 0.5 } }, // diesel engines idling
      { filter: { type: 'bandpass', freq: 1000, q: 0.6 }, level: 0.025, lfo: { rate: 0.07, depth: 0.4 } }, // a busy crowd
    ],
    hums: [{ freq: 42, level: 0.006 }],
    spots: [{ name: 'wok', rate: 0.08 }, { name: 'clink', rate: 0.1 }],
  },
}

const around = {
  pasar: [{ name: 'motorbike', rate: 0.02 }, { name: 'chatter', rate: 0.02 }],
  monsoon: [{ name: 'car', rate: 0.006 }],
  confluence: [{ name: 'lrt', rate: 0.012 }, { name: 'chatter', rate: 0.006 }],
  bayside: [{ name: 'jeepney', rate: 0.012 }, { name: 'chatter', rate: 0.012 }],
  intramuros: [{ name: 'calesa', rate: 0.014 }],
  jeepneys: [{ name: 'jeepney', rate: 0.025 }, { name: 'motorbike', rate: 0.02 }],
}

const spatial = {
  jeepney: { dur: 4.5, from: { x: -35, y: 0, z: -6 }, to: { x: 35, y: 0, z: -6 }, recorded: 'jeepney-pass', synth: 'jeepney' },
  calesa: { dur: 6, from: { x: 25, y: 0, z: -5 }, to: { x: -25, y: 0, z: -4 }, recorded: 'calesa-pass', synth: 'hooves' },
  motorbike: { dur: 3.2, from: { x: -30, y: 0, z: -4 }, to: { x: 30, y: 0, z: -4 }, recorded: 'motorbike-pass', synth: 'scooter' },
  lrt: { dur: 5.5, from: { x: -60, y: 10, z: -25 }, to: { x: 60, y: 10, z: -25 }, recorded: 'lrt-pass', synth: 'train' },
}

const synth = {
  jeepney(ctx, out, t, dur) {
    // a rattling diesel going past, and a cheerful two tone beep
    tone(ctx, out, t, { freq: 48, glideTo: 40, glideTime: dur, type: 'sawtooth', attack: dur * 0.3, hold: dur * 0.2, decay: dur * 0.5, peak: 0.2, filter: { freq: 300 } })
    noise(ctx, out, t, { attack: dur * 0.3, hold: dur * 0.2, decay: dur * 0.5, peak: 0.1, filter: { type: 'bandpass', freq: 600, q: 1 } })
    for (const [at, f] of [[0.35, 660], [0.5, 520], [0.65, 660]]) tone(ctx, out, t + dur * at, { freq: f, type: 'square', attack: 0.01, hold: 0.08, decay: 0.05, peak: 0.05, filter: { freq: 2000 } })
  },
  hooves(ctx, out, t, dur, r) {
    // a calesa: steady hooves on cobbles and a creaking wheel
    for (let at = 0; at < dur; at += 0.26) noise(ctx, out, t + at + (Math.round(at / 0.26) % 2) * 0.06, { attack: 0.001, decay: 0.045, peak: 0.14 + r() * 0.05, filter: { type: 'bandpass', freq: 1000 + r() * 400, q: 2 } })
    tone(ctx, out, t + dur * 0.3, { freq: 420, glideTo: 380, glideTime: 0.5, type: 'sawtooth', attack: 0.1, decay: 0.4, peak: 0.02, filter: { type: 'bandpass', freq: 800, q: 4 } })
    bell(ctx, out, t + dur * 0.5, 2600, { peak: 0.04, decay: 0.4 })
  },
  scooter(ctx, out, t, dur) {
    // a small two stroke buzzing past
    tone(ctx, out, t, { freq: 180, glideTo: 120, glideTime: dur, type: 'sawtooth', attack: dur * 0.45, decay: dur * 0.55, peak: 0.12, filter: { freq: 1400 } })
    tone(ctx, out, t, { freq: 360, glideTo: 240, glideTime: dur, type: 'square', attack: dur * 0.45, decay: dur * 0.55, peak: 0.03, filter: { freq: 1800 } })
  },
  train(ctx, out, t, dur) {
    // a light rail train gliding by up on its track: an electric whine and a smooth rush
    swell(ctx, out, t, dur * 0.5, { peak: 0.25, from: 300, to: 1600 })
    noise(ctx, out, t + dur * 0.45, { attack: 0.05, decay: dur * 0.5, peak: 0.18, filter: { type: 'lowpass', freq: 1600, to: 400, time: dur * 0.5 } })
    tone(ctx, out, t, { freq: 620, glideTo: 540, glideTime: dur, type: 'triangle', attack: dur * 0.4, decay: dur * 0.6, peak: 0.04 })
  },
}

// a gong and kulintang flavoured call: pentatonic, climbing and coming home
const theme = {
  motif: ['D4', 'E4', 'G4', 'A4', 'G4', 'C5', 'D5'],
  beats: [0.5, 0.5, 1, 0.5, 0.5, 0.5, 2.5],
  chord: ['D2', 'A2', 'D3', 'E3', 'A3'],
  end: ['D3', 'F#3', 'A3', 'D4'],
  voice: 'glass',
}

const score = {
  bpm: [78, 98, 140, 100],
  drone: ['D2', 'A2'],
  tension: ['D3', 'F3', 'A3'], // minor while the chase is on
  lift: ['D3', 'F#3', 'A3', 'D4'], // major when the halves come home
  pulse: 'tom', // frame drums
  run: ['D5', 'E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5'],
  bass: ['D2', 'D2', 'A1', 'C2', 'G1', 'G1', 'A1', 'A1'],
}

export const KIT = { id: 'twocities', stings, scenes, around, spots, spatial, synth, theme, score }
