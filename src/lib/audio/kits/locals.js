// Sound kit for the Sydney local stories (River Town's later episodes,
// Breakers at Bondi and The Major's Hill at Mount Druitt): a lifesaver's
// whistle, a Sydney train horn and a brass discovery chime as stings; four
// scenes (a sandstone railway cutting at night, Bondi at sunrise, a western
// Sydney suburb at dusk and a train platform); lorikeets and gulls as little
// sounds; a Sydney train and a flock of lorikeets going past; and a bright,
// sunny theme and score. Everything is synthesised; the recorded versions
// are in each series' LIBRARY. soundscape.js and spatial.js merge it in.
import { note, tone, noise, bell, kick } from '../synth.js'

const stings = {
  whistle: {
    dur: 1.6,
    build(ctx, out, t) {
      // a lifesaver's whistle: two sharp trilled blasts
      for (const [at, len] of [[0, 0.35], [0.5, 0.7]]) {
        tone(ctx, out, t + at, { freq: 2900, type: 'triangle', attack: 0.01, hold: len, decay: 0.08, peak: 0.07, fm: { ratio: 0.012, index: 18 } })
        noise(ctx, out, t + at, { attack: 0.01, hold: len, decay: 0.08, peak: 0.03, filter: { type: 'bandpass', freq: 2900, q: 6 } })
      }
      return t + 1.5
    },
  },
  trainhorn: {
    dur: 2.4,
    build(ctx, out, t) {
      // a Sydney train sounding its horn as it comes through: two notes together, a short blast and a long one
      for (const [at, len] of [[0, 0.4], [0.6, 1.2]]) {
        for (const f of [311, 370]) tone(ctx, out, t + at, { freq: f, type: 'sawtooth', attack: 0.04, hold: len, decay: 0.25, peak: 0.045, filter: { freq: 1600, q: 1 } })
      }
      noise(ctx, out, t, { attack: 0.6, hold: 1.0, decay: 0.7, peak: 0.05, filter: { type: 'lowpass', freq: 400 } })
      return t + 2.3
    },
  },
  found: {
    dur: 2.2,
    build(ctx, out, t) {
      // a clue clicks into place: a warm bell arpeggio over a soft low note
      ;['G4', 'B4', 'D5', 'G5'].forEach((n, i) => bell(ctx, out, t + i * 0.1, note(n), { peak: 0.1, decay: 1.0 }))
      tone(ctx, out, t, { freq: note('G2'), type: 'triangle', attack: 0.02, hold: 0.4, decay: 1.4, peak: 0.12 })
      kick(ctx, out, t, { peak: 0.18 })
      return t + 2.1
    },
  },
}

const spots = {
  lorikeet(ctx, out, t, r) {
    // rainbow lorikeets squabbling in a tree: harsh quick screeches
    const n = 3 + Math.floor(r() * 4)
    for (let i = 0; i < n; i++) noise(ctx, out, t + i * (0.08 + r() * 0.1), { attack: 0.004, decay: 0.06 + r() * 0.04, peak: 0.02 + r() * 0.015, filter: { type: 'bandpass', freq: 3200 + r() * 1500, q: 5 } })
  },
  gull(ctx, out, t, r) {
    // a silver gull calling, somewhere along the beach
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) tone(ctx, out, t + i * 0.28, { freq: 1500 + r() * 300, glideTo: 1100, glideTime: 0.18, type: 'sawtooth', attack: 0.01, decay: 0.2, peak: 0.012, filter: { type: 'bandpass', freq: 1800, q: 3 } })
  },
}

const scenes = {
  cutting: {
    beds: [
      { filter: { type: 'lowpass', freq: 500 }, level: 0.025, lfo: { rate: 0.06, depth: 0.5 } }, // night air moving through the cutting
      { filter: { type: 'bandpass', freq: 4300, q: 8 }, level: 0.006, am: { rate: 20, depth: 0.8 } }, // crickets
    ],
    spots: [{ name: 'drip', rate: 0.6 }, { name: 'cricket', rate: 0.3 }],
  },
  surfdawn: {
    beds: [
      { filter: { type: 'lowpass', freq: 650 }, level: 0.055, lfo: { rate: 0.1, depth: 0.85 } }, // the surf rolling in
      { filter: { type: 'highpass', freq: 3200 }, level: 0.014, lfo: { rate: 0.1, depth: 0.6 } }, // foam fizzing back down the sand
    ],
    spots: [{ name: 'gull', rate: 0.1 }],
  },
  suburb: {
    beds: [
      { filter: { type: 'lowpass', freq: 300 }, level: 0.025, lfo: { rate: 0.04, depth: 0.5 } }, // a highway far off
      { filter: { type: 'bandpass', freq: 4200, q: 8 }, level: 0.005, am: { rate: 22, depth: 0.8 } }, // crickets starting up
    ],
    spots: [{ name: 'lorikeet', rate: 0.06 }, { name: 'bird', rate: 0.05 }],
  },
  station: {
    beds: [
      { filter: { type: 'bandpass', freq: 900, q: 0.6 }, level: 0.018, lfo: { rate: 0.06, depth: 0.4 } }, // people waiting on the platform
    ],
    hums: [{ freq: 50, level: 0.006 }], // the overhead wires
    spots: [{ name: 'clink', rate: 0.05 }],
  },
}

const around = {
  cutting: [{ name: 'owl', rate: 0.01 }],
  surfdawn: [{ name: 'chatter', rate: 0.008 }, { name: 'helicopter', rate: 0.002 }],
  suburb: [{ name: 'lorikeets', rate: 0.012 }, { name: 'car', rate: 0.01 }, { name: 'dog', rate: 0.004 }, { name: 'sydneytrain', rate: 0.006 }],
  station: [{ name: 'sydneytrain', rate: 0.02 }, { name: 'chatter', rate: 0.01 }],
}

const spatial = {
  sydneytrain: { dur: 7, from: { x: -80, y: 0, z: -18 }, to: { x: 80, y: 0, z: -18 }, recorded: 'sydney-train', synth: 'electrictrain' },
  lorikeets: { dur: 3, from: { x: -30, y: 15, z: -10 }, to: { x: 35, y: 18, z: 5 }, recorded: 'lorikeet-flock', synth: 'flock' },
}

const synth = {
  electrictrain(ctx, out, t, dur) {
    // a double deck electric train: a motor whine rising and falling, wheels clacking over joins
    tone(ctx, out, t, { freq: 420, glideTo: 640, glideTime: dur * 0.5, type: 'sawtooth', attack: dur * 0.35, hold: dur * 0.2, decay: dur * 0.45, peak: 0.03, filter: { freq: 1200 } })
    noise(ctx, out, t, { attack: dur * 0.35, hold: dur * 0.2, decay: dur * 0.45, peak: 0.16, filter: { type: 'lowpass', freq: 700 } })
    for (let at = dur * 0.25; at < dur * 0.8; at += 0.22) noise(ctx, out, t + at, { attack: 0.002, decay: 0.05, peak: 0.08, filter: { type: 'bandpass', freq: 600, q: 2 } })
  },
  flock(ctx, out, t, dur, r) {
    // lorikeets streaking overhead, screeching as they go
    for (let i = 0; i < dur * 6; i++) noise(ctx, out, t + r() * dur, { attack: 0.004, decay: 0.05 + r() * 0.05, peak: 0.1 + r() * 0.08, filter: { type: 'bandpass', freq: 3000 + r() * 2000, q: 5 } })
  },
}

// a sunny, open call: up through the major chord and home
const theme = {
  motif: ['G4', 'B4', 'D5', 'E5', 'D5', 'B4', 'G5'],
  beats: [0.5, 0.5, 1, 0.5, 0.5, 0.5, 2.5],
  chord: ['G1', 'D2', 'G2', 'B2', 'D3'],
  end: ['G2', 'B2', 'D3', 'G3'],
  voice: 'pluck',
}

const score = {
  bpm: [80, 100, 138, 100],
  drone: ['G1', 'D2'],
  tension: ['G2', 'Bb2', 'D3'], // minor while the mystery is open
  lift: ['G2', 'B2', 'D3', 'G3'], // major when it's solved
  pulse: 'tick',
  run: ['G4', 'B4', 'D5', 'G5', 'E5', 'D5', 'B4', 'D5'],
  bass: ['G1', 'G1', 'E1', 'E1', 'C2', 'C2', 'D2', 'D2'],
}

export const KIT = { id: 'locals', stings, scenes, around, spots, spatial, synth, theme, score }
