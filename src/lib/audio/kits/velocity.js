// Sound kit for Velocity (missions/series/velocity.js): the big superhero
// stings (a lightning strike right beside you, the power charging up, a
// speedster blurring past, a brass hero hit, a roaring crowd, a city powering
// down, a wall of storm), three scenes (a wild storm by the water, a city in a
// blackout, a calm beach at sunrise), thunder rolling across the sky and a
// rival zipping past as spatial sounds, and a heroic B flat theme and score.
// Everything is synthesised; soundscape.js and spatial.js merge it in.
import { note, tone, noise, bell, kick, swell } from '../synth.js'

const stings = {
  boltstrike: {
    dur: 3.6,
    build(ctx, out, t) {
      // a bolt right beside you: a fizz as the air charges, a huge crack, the boom, and sparks after
      noise(ctx, out, t, { attack: 0.25, decay: 0.05, peak: 0.08, filter: { type: 'bandpass', freq: 2500, to: 7000, time: 0.3, q: 2 } })
      noise(ctx, out, t + 0.3, { attack: 0.001, decay: 0.06, peak: 0.45, filter: { type: 'highpass', freq: 1500 } })
      noise(ctx, out, t + 0.32, { attack: 0.002, decay: 0.5, peak: 0.25, filter: { type: 'lowpass', freq: 3500, to: 300, time: 0.5 } })
      tone(ctx, out, t + 0.3, { freq: 2600, glideTo: 220, glideTime: 0.25, type: 'sawtooth', attack: 0.001, decay: 0.3, peak: 0.06, filter: { freq: 4000 } })
      tone(ctx, out, t + 0.3, { freq: 62, glideTo: 26, glideTime: 2.2, attack: 0.005, decay: 2.6, peak: 0.45 })
      noise(ctx, out, t + 0.5, { attack: 0.25, hold: 0.6, decay: 2.2, peak: 0.16, filter: { type: 'lowpass', freq: 240, to: 60, time: 2.8 } })
      for (let i = 0; i < 12; i++) noise(ctx, out, t + 0.45 + i * 0.07 + (i % 3) * 0.02, { attack: 0.001, decay: 0.015, peak: 0.08 - i * 0.005, filter: { type: 'bandpass', freq: 3000 + ((i * 731) % 3000), q: 3 } })
      return t + 3.5
    },
  },
  chargeup: {
    dur: 2.4,
    build(ctx, out, t) {
      // the power kicking in: an electric whine climbing, crackles coming faster, then a bright zing
      tone(ctx, out, t, { freq: 110, glideTo: 1320, glideTime: 1.9, type: 'sawtooth', attack: 1.7, hold: 0.1, decay: 0.15, peak: 0.07, filter: { freq: 600, to: 5000, time: 1.9, q: 3 } })
      tone(ctx, out, t, { freq: 113, glideTo: 1360, glideTime: 1.9, type: 'square', attack: 1.7, hold: 0.1, decay: 0.15, peak: 0.02, filter: { freq: 2500 } })
      let at = t + 0.1
      for (let i = 0; i < 16; i++) {
        noise(ctx, out, at, { attack: 0.001, decay: 0.012, peak: 0.04 + i * 0.006, filter: { type: 'bandpass', freq: 2500 + i * 250, q: 3 } })
        at += 0.22 * Math.pow(0.85, i)
      }
      bell(ctx, out, t + 1.95, note('F6'), { peak: 0.12, decay: 0.4 })
      bell(ctx, out, t + 2.0, note('Bb6'), { peak: 0.1, decay: 0.35 })
      kick(ctx, out, t + 1.95, { peak: 0.35 })
      return t + 2.35
    },
  },
  zipby: {
    dur: 1.3,
    build(ctx, out, t) {
      // a speedster blurring past: a falling doppler whine through a rush of air, sparks trailing
      swell(ctx, out, t, 0.5, { peak: 0.3, from: 700, to: 5000 })
      noise(ctx, out, t + 0.45, { attack: 0.005, decay: 0.5, peak: 0.2, filter: { type: 'bandpass', freq: 4000, to: 500, time: 0.5, q: 1 } })
      tone(ctx, out, t + 0.3, { freq: 1800, glideTo: 450, glideTime: 0.45, type: 'sawtooth', attack: 0.1, decay: 0.45, peak: 0.05, filter: { type: 'bandpass', freq: 1500, q: 2 } })
      for (let i = 0; i < 8; i++) noise(ctx, out, t + 0.55 + i * 0.07, { attack: 0.001, decay: 0.012, peak: 0.07 - i * 0.007, filter: { type: 'bandpass', freq: 3500 + i * 300, q: 3 } })
      return t + 1.25
    },
  },
  herohit: {
    dur: 3.4,
    build(ctx, out, t) {
      // the hero arrives: a brass B flat chord opening up, a timpani hit and a long crash
      for (const [n, d] of [['Bb2', -8], ['F3', 6], ['Bb3', -5], ['D4', 7], ['F4', -4]]) {
        tone(ctx, out, t, { freq: note(n), type: 'sawtooth', detune: d, attack: 0.04, hold: 0.9, decay: 1.6, peak: 0.05, filter: { freq: 400, to: 2600, time: 0.35, q: 1.5 } })
      }
      tone(ctx, out, t, { freq: note('Bb1'), type: 'triangle', attack: 0.02, hold: 0.8, decay: 1.6, peak: 0.12 })
      tone(ctx, out, t, { freq: 98, glideTo: 55, glideTime: 0.35, attack: 0.002, decay: 1.1, peak: 0.42 })
      noise(ctx, out, t, { attack: 0.004, decay: 2.6, peak: 0.1, filter: { type: 'highpass', freq: 5000, to: 2500, time: 2.6 } })
      return t + 3.3
    },
  },
  crowdroar: {
    dur: 3.6,
    build(ctx, out, t) {
      // thousands of people cheering: a roar that swells, a storm of clapping and a few whistles
      noise(ctx, out, t, { attack: 0.8, hold: 1.2, decay: 1.4, peak: 0.22, filter: { type: 'bandpass', freq: 1100, q: 0.7 } })
      noise(ctx, out, t + 0.2, { attack: 0.7, hold: 1.1, decay: 1.3, peak: 0.08, filter: { type: 'bandpass', freq: 2600, q: 0.9 } })
      for (let i = 0; i < 70; i++) noise(ctx, out, t + 0.4 + i * 0.038 + ((i * 37) % 7) * 0.005, { attack: 0.002, decay: 0.03, peak: 0.04 + ((i * 13) % 5) * 0.01, filter: { type: 'bandpass', freq: 1200 + ((i * 211) % 1500), q: 1.2 } })
      for (const [at, f] of [[0.7, 1900], [1.3, 2300], [1.9, 2100]]) tone(ctx, out, t + at, { freq: f, glideTo: f * 1.35, glideTime: 0.25, attack: 0.03, hold: 0.15, decay: 0.2, peak: 0.035 })
      return t + 3.5
    },
  },
  powerdown: {
    dur: 2.6,
    build(ctx, out, t) {
      // the power going out: a big hum sagging away to nothing, a heavy clunk, one last fizz
      tone(ctx, out, t, { freq: 120, glideTo: 28, glideTime: 1.8, type: 'sawtooth', attack: 0.02, hold: 0.3, decay: 1.6, peak: 0.12, filter: { freq: 1200, to: 120, time: 1.8 } })
      tone(ctx, out, t, { freq: 240, glideTo: 56, glideTime: 1.8, type: 'square', attack: 0.02, hold: 0.3, decay: 1.4, peak: 0.025, filter: { freq: 900 } })
      noise(ctx, out, t + 2.0, { attack: 0.002, decay: 0.2, peak: 0.28, filter: { type: 'lowpass', freq: 500 } })
      tone(ctx, out, t + 2.0, { freq: 90, glideTo: 50, glideTime: 0.1, attack: 0.002, decay: 0.25, peak: 0.3 })
      for (let i = 0; i < 5; i++) noise(ctx, out, t + 2.1 + i * 0.06, { attack: 0.001, decay: 0.015, peak: 0.05, filter: { type: 'bandpass', freq: 3200, q: 3 } })
      return t + 2.5
    },
  },
  stormwall: {
    dur: 4.4,
    build(ctx, out, t) {
      // a wall of storm coming at you: wind roaring up, sheets of rain, thunder rolling underneath
      noise(ctx, out, t, { attack: 1.6, hold: 0.8, decay: 1.8, peak: 0.24, filter: { type: 'lowpass', freq: 300, to: 1400, time: 2.2 } })
      noise(ctx, out, t + 0.4, { attack: 1.2, hold: 1.0, decay: 1.6, peak: 0.07, filter: { type: 'highpass', freq: 3000 } })
      noise(ctx, out, t + 1.2, { attack: 0.3, hold: 0.8, decay: 2.0, peak: 0.2, filter: { type: 'lowpass', freq: 200, to: 60, time: 3 } })
      tone(ctx, out, t + 1.2, { freq: 48, glideTo: 30, glideTime: 2.5, attack: 0.2, decay: 2.8, peak: 0.3 })
      return t + 4.3
    },
  },
}

// little sounds in the new scenes
const spots = {
  sparkzap(ctx, out, t, r) {
    // a power line or transformer fizzing somewhere
    for (let i = 0; i < 3 + Math.floor(r() * 4); i++) noise(ctx, out, t + i * (0.02 + r() * 0.03), { attack: 0.001, decay: 0.01 + r() * 0.02, peak: 0.02 + r() * 0.02, filter: { type: 'bandpass', freq: 2800 + r() * 2500, q: 4 } })
  },
  wavecrash(ctx, out, t, r) {
    // a wave rolling in and breaking
    noise(ctx, out, t, { attack: 0.8 + r() * 0.5, decay: 1.4 + r(), peak: 0.03 + r() * 0.015, filter: { type: 'lowpass', freq: 300, to: 1300, time: 1.2 } })
  },
}

const scenes = {
  stormfront: {
    beds: [
      { filter: { type: 'highpass', freq: 2500 }, level: 0.03, lfo: { rate: 0.07, depth: 0.4 } }, // rain hissing on the water
      { filter: { type: 'lowpass', freq: 600 }, level: 0.05, lfo: { rate: 0.09, depth: 0.7 } }, // gusts through the trees
      { filter: { type: 'lowpass', freq: 80 }, level: 0.04, lfo: { rate: 0.03, depth: 0.5 } }, // thunder far off
    ],
    spots: [{ name: 'drip', rate: 1.5 }, { name: 'wavecrash', rate: 0.04 }],
  },
  citydark: {
    beds: [
      { filter: { type: 'lowpass', freq: 400 }, level: 0.03, lfo: { rate: 0.05, depth: 0.6 } }, // a warm breeze between dark towers
      { filter: { type: 'bandpass', freq: 4200, q: 8 }, level: 0.008, am: { rate: 22, depth: 0.8 } }, // crickets in the park
    ],
    hums: [{ freq: 50, level: 0.006 }], // a generator somewhere
    spots: [{ name: 'cricket', rate: 0.4 }, { name: 'sparkzap', rate: 0.02 }],
  },
  beachdawn: {
    beds: [
      { filter: { type: 'lowpass', freq: 700 }, level: 0.05, lfo: { rate: 0.12, depth: 0.8 } }, // waves washing up the sand
      { filter: { type: 'highpass', freq: 3000 }, level: 0.012, lfo: { rate: 0.12, depth: 0.6 } }, // the foam fizzing back
    ],
    spots: [{ name: 'bird', rate: 0.08 }, { name: 'wavecrash', rate: 0.08 }],
  },
}

const around = {
  stormfront: [{ name: 'thunderroll', rate: 0.012 }, { name: 'car', rate: 0.008 }],
  citydark: [{ name: 'firetruck', rate: 0.004 }, { name: 'chatter', rate: 0.01 }, { name: 'dog', rate: 0.004 }],
  beachdawn: [{ name: 'bird', rate: 0.04 }, { name: 'magpie', rate: 0.005 }],
}

const spatial = {
  thunderroll: { dur: 6, from: { x: -120, y: 80, z: -80 }, to: { x: 120, y: 60, z: -40 }, recorded: 'thunder-roll', synth: 'thunderroll' },
  speedster: { dur: 1.6, from: { x: -40, y: 0, z: -3 }, to: { x: 40, y: 0, z: -3 }, recorded: 'speedster-pass', synth: 'speedster' },
}

const synth = {
  thunderroll(ctx, out, t, dur, r) {
    // a crack far off, then a long rumble that rolls across the sky
    noise(ctx, out, t, { attack: 0.01, decay: 0.3, peak: 0.2, filter: { type: 'lowpass', freq: 1500 } })
    noise(ctx, out, t + 0.15, { attack: 0.3, hold: dur * 0.3, decay: dur * 0.55, peak: 0.5, filter: { type: 'lowpass', freq: 260, to: 70, time: dur * 0.8 } })
    tone(ctx, out, t + 0.2, { freq: 45, glideTo: 28, glideTime: dur * 0.8, attack: 0.3, decay: dur * 0.7, peak: 0.3 })
    for (let i = 0; i < 5; i++) noise(ctx, out, t + 0.4 + r() * dur * 0.5, { attack: 0.05, decay: 0.4, peak: 0.12, filter: { type: 'lowpass', freq: 500 } })
  },
  speedster(ctx, out, t, dur, r) {
    // a rush of air and an electric fizz going past
    swell(ctx, out, t, dur * 0.5, { peak: 0.5, from: 600, to: 4000 })
    noise(ctx, out, t + dur * 0.45, { attack: 0.005, decay: dur * 0.5, peak: 0.35, filter: { type: 'bandpass', freq: 3500, to: 600, time: dur * 0.5, q: 1 } })
    tone(ctx, out, t + dur * 0.2, { freq: 1600, glideTo: 600, glideTime: dur * 0.6, type: 'sawtooth', attack: dur * 0.2, decay: dur * 0.5, peak: 0.08, filter: { type: 'bandpass', freq: 1400, q: 2 } })
    for (let i = 0; i < 10; i++) noise(ctx, out, t + r() * dur, { attack: 0.001, decay: 0.012, peak: 0.12, filter: { type: 'bandpass', freq: 3000 + r() * 3000, q: 3 } })
  },
}

// a heroic horn call: up a fifth, up the octave, then climbing to the top
const theme = {
  motif: ['Bb3', 'F4', 'Bb4', 'C5', 'D5', 'C5', 'F5'],
  beats: [0.5, 0.5, 1, 0.5, 0.5, 0.5, 2.5],
  chord: ['Bb1', 'F2', 'Bb2', 'D3', 'F3'],
  end: ['Bb2', 'D3', 'F3', 'Bb3'],
  voice: 'horn',
}

const score = {
  bpm: [76, 96, 140, 100],
  drone: ['Bb1', 'F2'],
  tension: ['Bb2', 'Db3', 'F3'], // minor while the trouble builds
  lift: ['Bb2', 'D3', 'F3', 'Bb3'], // major when the hero wins
  pulse: 'tom', // big drums
  run: ['Bb4', 'D5', 'F5', 'Bb5', 'A5', 'F5', 'D5', 'F5'],
  bass: ['Bb1', 'Bb1', 'D2', 'F2', 'G1', 'G1', 'F1', 'A1'],
}

export const KIT = { id: 'velocity', stings, scenes, around, spots, spatial, synth, theme, score }
