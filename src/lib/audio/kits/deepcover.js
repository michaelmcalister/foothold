// Sound kit for Deep Cover (missions/series/deepcover.js): Melbourne noir.
// Rain in the laneways with a neon buzz and tram bells, the roar of the MCG,
// a misty mountain ash forest in the Dandenongs; a tram and a steam train
// that pass around you; stings for the voice copying machine, a code being
// cracked, the double cross, the footy siren and the steam whistle; and a
// minor key spy theme with a muted brass line. All synthesised (recorded
// versions come from library.js prompts in the series file).
import { note, tone, noise, bell, kick, pad, swell, pluck } from '../synth.js'

// ---- little sounds that pop up in the new scenes ----
const spots = {
  dcTramBell(ctx, out, t) {
    // a tram ringing ding ding, a street away
    bell(ctx, out, t, 1568, { peak: 0.016, decay: 0.7 })
    bell(ctx, out, t + 0.3, 1568, { peak: 0.014, decay: 0.8 })
  },
  dcNeon(ctx, out, t, r) {
    // a neon sign flickering and buzzing
    const n = 2 + Math.floor(r() * 4)
    for (let i = 0; i < n; i++) tone(ctx, out, t + i * (0.05 + r() * 0.08), { freq: 120, type: 'square', attack: 0.002, hold: 0.03 + r() * 0.05, decay: 0.03, peak: 0.005, filter: { freq: 1600 } })
  },
  dcRoar(ctx, out, t, r) {
    // the crowd surges at a near miss on goal
    noise(ctx, out, t, { attack: 0.5 + r() * 0.4, hold: 0.4, decay: 1.4, peak: 0.05 + r() * 0.03, filter: { type: 'bandpass', freq: 900 + r() * 300, q: 0.5 } })
  },
  dcBellbird(ctx, out, t, r) {
    // a bellbird's clear ping in the trees
    bell(ctx, out, t, 2900 + r() * 300, { peak: 0.012, decay: 0.45 })
  },
  dcWhip(ctx, out, t, r) {
    // a whipbird far off: a long rising whistle and a crack
    tone(ctx, out, t, { freq: 1400 + r() * 200, glideTo: 5000, glideTime: 0.4, attack: 0.02, hold: 0.3, decay: 0.12, peak: 0.01 })
    noise(ctx, out, t + 0.45, { attack: 0.001, decay: 0.03, peak: 0.02, filter: { type: 'highpass', freq: 4500 } })
  },
}

// ---- the scenes ----
const scenes = {
  laneway: {
    beds: [
      { filter: { type: 'highpass', freq: 2600 }, level: 0.022, lfo: { rate: 0.06, depth: 0.4 } }, // fine rain on brick
      { filter: { type: 'lowpass', freq: 150 }, level: 0.05 }, // the city beyond the lane
      { filter: { type: 'bandpass', freq: 900, q: 2 }, level: 0.01, lfo: { rate: 0.17, depth: 0.6 } }, // a gutter running
    ],
    hums: [{ freq: 100, level: 0.005 }], // the neon
    spots: [{ name: 'drip', rate: 1.2 }, { name: 'dcNeon', rate: 0.06 }, { name: 'dcTramBell', rate: 0.02 }],
  },
  footy: {
    beds: [
      { filter: { type: 'bandpass', freq: 800, q: 0.6 }, level: 0.07, lfo: { rate: 0.09, depth: 0.5 } }, // the crowd
      { filter: { type: 'lowpass', freq: 160 }, level: 0.04 },
      { filter: { type: 'highpass', freq: 3200 }, level: 0.01, lfo: { rate: 0.2, depth: 0.5 } },
    ],
    hums: [{ freq: 50, level: 0.006 }], // the light towers
    spots: [{ name: 'dcRoar', rate: 0.06 }, { name: 'clap', rate: 0.1 }],
  },
  dandenongs: {
    beds: [
      { filter: { type: 'lowpass', freq: 600 }, level: 0.035, lfo: { rate: 0.05, depth: 0.8 } }, // breeze high in the ash
      { filter: { type: 'bandpass', freq: 1800, q: 1.5 }, level: 0.008, lfo: { rate: 0.11, depth: 0.5 } }, // the creek below
    ],
    spots: [{ name: 'drip', rate: 0.8 }, { name: 'dcBellbird', rate: 0.25 }, { name: 'dcWhip', rate: 0.03 }, { name: 'bird', rate: 0.08 }],
  },
}

// sounds placed around you in each new scene
const around = {
  laneway: [{ name: 'melbtram', rate: 0.012 }, { name: 'car', rate: 0.02 }, { name: 'chatter', rate: 0.008 }],
  footy: [{ name: 'chatter', rate: 0.03 }],
  dandenongs: [{ name: 'puffer', rate: 0.004 }, { name: 'kookaburra', rate: 0.006 }, { name: 'magpie', rate: 0.004 }],
}

// ---- spatial sounds, and their synthesised stand ins ----
const spatial = {
  melbtram: { dur: 7, from: { x: -45, y: 0, z: -12 }, to: { x: 45, y: 0, z: -10 }, recorded: 'melb-tram-pass', synth: 'dcTram' },
  puffer: { dur: 10, from: { x: 70, y: 0, z: -45 }, to: { x: -70, y: 0, z: -30 }, recorded: 'steam-train-pass', synth: 'dcSteam' },
}

const synth = {
  dcTram(ctx, out, t, dur) {
    // steel wheels rumbling, a squeal on the curve, ding ding
    noise(ctx, out, t, { attack: dur * 0.4, decay: dur * 0.6, peak: 0.3, filter: { type: 'lowpass', freq: 260 } })
    tone(ctx, out, t, { freq: 92, glideTo: 74, glideTime: dur, type: 'sawtooth', attack: dur * 0.4, decay: dur * 0.6, peak: 0.04, filter: { freq: 380 } })
    noise(ctx, out, t + dur * 0.35, { attack: 0.3, hold: 0.6, decay: 0.6, peak: 0.04, filter: { type: 'bandpass', freq: 3300, q: 12 } })
    bell(ctx, out, t + dur * 0.3, 1568, { peak: 0.12, decay: 0.8 })
    bell(ctx, out, t + dur * 0.3 + 0.3, 1568, { peak: 0.1, decay: 0.9 })
  },
  dcSteam(ctx, out, t, dur) {
    // chuffing steam, clanking rails and a two note whistle
    const n = Math.floor(dur / 0.36)
    for (let i = 0; i < n; i++) {
      const swellUp = Math.sin((i / n) * Math.PI)
      noise(ctx, out, t + i * 0.36, { attack: 0.02, decay: 0.2, peak: 0.08 + 0.22 * swellUp, filter: { type: 'bandpass', freq: 700, q: 0.9 } })
      if (i % 4 === 2) noise(ctx, out, t + i * 0.36 + 0.1, { attack: 0.001, decay: 0.03, peak: 0.05 + 0.08 * swellUp, filter: { type: 'bandpass', freq: 2400, q: 3 } })
    }
    for (const f of [note('F5'), note('A5')]) tone(ctx, out, t + dur * 0.3, { freq: f, type: 'triangle', attack: 0.06, hold: 1.1, decay: 0.5, peak: 0.06 })
    noise(ctx, out, t + dur * 0.3, { attack: 0.05, hold: 1.1, decay: 0.5, peak: 0.05, filter: { type: 'highpass', freq: 4000 } })
  },
}

// ---- stings ----
const stings = {
  lyrebird: {
    dur: 2.6,
    build(ctx, out, t) {
      // the machine wakes and copies a voice: warbling glides that settle into a speaking vowel, then a tiny chirp
      const path = [[440, 880], [880, 520], [520, 1040], [1040, 620], [620, 740]]
      path.forEach(([a, b], i) => tone(ctx, out, t + i * 0.26, { freq: a, glideTo: b, glideTime: 0.24, type: 'triangle', attack: 0.02, decay: 0.3, peak: 0.1, fm: { ratio: 2.01, index: 0.5 } }))
      noise(ctx, out, t + 0.1, { attack: 0.5, hold: 0.6, decay: 0.6, peak: 0.06, filter: { type: 'bandpass', freq: 500, to: 2200, time: 1.4, q: 5 } })
      tone(ctx, out, t + 0.2, { freq: note('A1'), type: 'sawtooth', attack: 0.4, hold: 0.8, decay: 0.8, peak: 0.06, filter: { freq: 300, to: 900, time: 1.2 } })
      bell(ctx, out, t + 1.55, 3520, { peak: 0.09, decay: 0.6 })
      bell(ctx, out, t + 1.72, 4186, { peak: 0.07, decay: 0.6 })
      return t + 2.5
    },
  },
  tramding: {
    dur: 1.8,
    build(ctx, out, t) {
      // a Melbourne tram: ding ding, steel wheels and a squeal on the curve
      bell(ctx, out, t, 1568, { peak: 0.2, decay: 0.9 })
      bell(ctx, out, t + 0.32, 1568, { peak: 0.18, decay: 1.0 })
      noise(ctx, out, t + 0.1, { attack: 0.15, hold: 0.5, decay: 0.5, peak: 0.04, filter: { type: 'bandpass', freq: 3200, q: 10 } })
      tone(ctx, out, t, { freq: 60, glideTo: 50, glideTime: 1.4, type: 'sawtooth', attack: 0.2, hold: 0.6, decay: 0.7, peak: 0.06, filter: { freq: 240 } })
      return t + 1.7
    },
  },
  decode: {
    dur: 1.9,
    build(ctx, out, t) {
      // a code being cracked: a flurry of data blips that resolve into a bright chord
      const fs = [1320, 990, 1760, 1175, 1480, 880, 1980, 1245, 1660, 1047, 2093, 1397]
      fs.forEach((fq, i) => tone(ctx, out, t + i * 0.065, { freq: fq, type: 'square', attack: 0.002, decay: 0.04, peak: 0.035, filter: { freq: 3000 } }))
      for (const n of ['C5', 'G5', 'D6']) bell(ctx, out, t + 0.85, note(n), { peak: 0.08, decay: 0.9 })
      tone(ctx, out, t + 0.85, { freq: note('C3'), type: 'triangle', attack: 0.01, decay: 0.8, peak: 0.1 })
      return t + 1.85
    },
  },
  betrayal: {
    dur: 3.6,
    build(ctx, out, t) {
      // the double cross: a dark brass cluster opens up, the floor drops away under it
      for (const [n, d] of [['C2', -8], ['Db2', 6], ['G2', -4], ['Ab2', 5], ['C3', 0]]) tone(ctx, out, t, { freq: note(n), type: 'sawtooth', detune: d, attack: 0.04, hold: 1.0, decay: 1.9, peak: 0.055, filter: { freq: 200, to: 1300, time: 0.6, q: 2 } })
      tone(ctx, out, t, { freq: 60, glideTo: 30, glideTime: 1.0, attack: 0.004, decay: 1.5, peak: 0.42 })
      tone(ctx, out, t + 0.3, { freq: 700, glideTo: 70, glideTime: 2.6, type: 'sawtooth', attack: 0.05, decay: 2.8, peak: 0.05, filter: { freq: 1500, to: 200, time: 2.6 } })
      noise(ctx, out, t, { attack: 0.01, decay: 1.3, peak: 0.08, filter: { type: 'lowpass', freq: 700, to: 90, time: 1.3 } })
      return t + 3.5
    },
  },
  finalsiren: {
    dur: 3.4,
    build(ctx, out, t) {
      // the footy siren: one long electric horn, and a crowd that rises to its feet
      for (const [f, d] of [[440, -5], [440, 5], [880, 0]]) tone(ctx, out, t, { freq: f, type: 'sawtooth', detune: d, attack: 0.15, hold: 2.1, decay: 0.5, peak: f > 500 ? 0.025 : 0.06, filter: { freq: 1900, q: 1.5 } })
      noise(ctx, out, t + 0.4, { attack: 1.0, hold: 1.2, decay: 0.9, peak: 0.16, filter: { type: 'bandpass', freq: 1000, q: 0.5 } })
      for (let i = 0; i < 16; i++) noise(ctx, out, t + 1.0 + i * 0.12 + (i % 3) * 0.02, { attack: 0.002, decay: 0.04, peak: 0.06, filter: { type: 'bandpass', freq: 1700, q: 1 } })
      return t + 3.3
    },
  },
  steamwhistle: {
    dur: 3.0,
    build(ctx, out, t) {
      // Puffing Billy's whistle: a breathy chord that bends up into tune, over a hiss of steam
      for (const n of ['F5', 'A5', 'C6']) tone(ctx, out, t, { freq: note(n) * 0.94, glideTo: note(n), glideTime: 0.2, type: 'triangle', attack: 0.08, hold: 1.4, decay: 0.7, peak: 0.07 })
      noise(ctx, out, t, { attack: 0.05, hold: 1.4, decay: 0.9, peak: 0.07, filter: { type: 'highpass', freq: 3500 } })
      for (let i = 0; i < 4; i++) noise(ctx, out, t + 1.9 + i * 0.25, { attack: 0.02, decay: 0.15, peak: 0.12 - i * 0.02, filter: { type: 'bandpass', freq: 650, q: 0.9 } })
      return t + 2.95
    },
  },
  noirstab: {
    dur: 2.6,
    build(ctx, out, t) {
      // a noir brass hit: muted minor chord, a low piano note and a brushed cymbal
      for (const [n, d] of [['C3', -6], ['Eb3', 6], ['G3', -4], ['Bb3', 4]]) tone(ctx, out, t, { freq: note(n), type: 'sawtooth', detune: d, attack: 0.01, hold: 0.25, decay: 1.4, peak: 0.05, filter: { freq: 2200, to: 500, time: 1.2, q: 1 } })
      pluck(ctx, out, t, note('C2'), { peak: 0.3, decay: 1.6, bright: 900 })
      kick(ctx, out, t, { peak: 0.25 })
      noise(ctx, out, t, { attack: 0.005, decay: 1.8, peak: 0.04, filter: { type: 'highpass', freq: 6000 } })
      swell(ctx, out, t + 1.4, 1.0, { peak: 0.03, from: 2000, to: 500 })
      return t + 2.5
    },
  },
}

// ---- the title theme and the score ----
const theme = {
  motif: ['C4', 'G4', 'Ab4', 'G4', 'Eb4', 'F4', 'C4'], // a muted brass line under a streetlight
  beats: [1, 0.5, 1.5, 0.5, 0.5, 0.5, 2.5],
  chord: ['C2', 'G2', 'C3', 'Eb3', 'Bb3'],
  end: ['C3', 'Eb3', 'G3', 'D4'],
  voice: 'horn',
}

const score = {
  bpm: [74, 96, 138, 96],
  drone: ['C2', 'G2'],
  tension: ['C3', 'Eb3', 'G3'],
  lift: ['C3', 'Eb3', 'G3', 'Bb3'],
  pulse: 'tick', // a watch ticking in the dark
  run: ['C5', 'Eb5', 'G5', 'Bb5', 'Ab5', 'G5', 'Eb5', 'D5'],
  bass: ['C2', 'C2', 'Eb2', 'C2', 'Bb1', 'Bb1', 'G1', 'Ab1'],
}

export const KIT = { id: 'deepcover', stings, scenes, around, spots, spatial, synth, theme, score }
