// Sound kit for Time Runners (missions/series/timerunners.js): the big time
// warp jump that opens and closes every episode, history rippling, the watch
// glitching and winding up, a time ring snapping shut and a brass fanfare;
// three era scenes (an 1851 gold diggings, a big outdoor crowd with a brass
// band for 1932, 1956 and 2000, and a yacht race on open water); a brass
// band marching past and a stadium crowd wave as spatial sounds; and a bright
// G Lydian theme and score with a ticking clock pulse. All synthesised.
import { note, tone, noise, bell, kick, swell } from '../synth.js'

// G Lydian: the raised fourth (C#) gives it a hopeful, slightly magical lift
const LYDIAN = ['G4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6']

// A brass note: two detuned saws through an opening filter, and a soft sub
function brass(ctx, out, t, freq, len, peak = 0.05) {
  for (const d of [-6, 6]) tone(ctx, out, t, { freq, type: 'sawtooth', detune: d, attack: 0.03, hold: len * 0.6, decay: len * 0.5, peak, filter: { freq: 900, to: 2400, time: 0.12, q: 1 } })
  tone(ctx, out, t, { freq: freq / 2, type: 'triangle', attack: 0.03, hold: len * 0.6, decay: len * 0.5, peak: peak * 0.9 })
}

const stings = {
  timewarp: {
    dur: 4.4,
    build(ctx, out, t) {
      // the jump: a sucking rise, a spiral of bells, then the boom of landing and a ringing chord
      swell(ctx, out, t, 1.6, { peak: 0.24, from: 200, to: 6500 })
      tone(ctx, out, t, { freq: 98, glideTo: 1568, glideTime: 1.6, type: 'sawtooth', attack: 1.45, decay: 0.15, peak: 0.06, filter: { freq: 2600 } })
      LYDIAN.forEach((n, i) => bell(ctx, out, t + 0.25 + i * 0.11, note(n), { peak: 0.04 + i * 0.006, decay: 0.5 }))
      const hit = t + 1.75
      tone(ctx, out, hit, { freq: 62, glideTo: 30, glideTime: 1.2, attack: 0.004, decay: 1.9, peak: 0.45 })
      noise(ctx, out, hit, { attack: 0.002, decay: 0.5, peak: 0.25, filter: { type: 'lowpass', freq: 2400, to: 200, time: 0.5 } })
      noise(ctx, out, hit, { attack: 0.01, decay: 1.4, peak: 0.12, filter: { type: 'bandpass', freq: 5000, to: 400, time: 1.4, q: 1.2 } }) // the whoosh past your ears
      for (const [n, d] of [['G2', -5], ['D3', 4], ['B3', -3], ['C#4', 6]]) tone(ctx, out, hit + 0.05, { freq: note(n), type: 'sawtooth', detune: d, attack: 0.08, hold: 0.6, decay: 1.6, peak: 0.04, filter: { freq: 500, to: 1800, time: 0.4, q: 1.5 } })
      bell(ctx, out, hit + 0.1, note('G5'), { peak: 0.12, decay: 2.2 })
      return t + 4.3
    },
  },
  timeripple: {
    dur: 2.8,
    build(ctx, out, t) {
      // history wobbling: a detuned chord that bends down and warbles, over a soft hiss
      for (const [n, d] of [['D4', -8], ['F#4', 9], ['C#5', -4]]) {
        tone(ctx, out, t, { freq: note(n), glideTo: note(n) * 0.93, glideTime: 1.4, type: 'triangle', detune: d, attack: 0.2, hold: 0.9, decay: 1.2, peak: 0.07, fm: { ratio: 0.013, index: 0.035, decay: 2.2 } })
      }
      tone(ctx, out, t, { freq: note('G2'), glideTo: note('F#2'), glideTime: 2, type: 'sawtooth', attack: 0.4, hold: 0.8, decay: 1.2, peak: 0.05, filter: { freq: 400, q: 2 } })
      noise(ctx, out, t, { attack: 0.6, hold: 0.6, decay: 1.2, peak: 0.05, filter: { type: 'bandpass', freq: 1800, to: 600, time: 2.2, q: 2 } })
      return t + 2.7
    },
  },
  timeglitch: {
    dur: 1.7,
    build(ctx, out, t) {
      // the watch hiccups: stuttering bleeps that jump about, then a sag
      const steps = [0, 0.05, 0.09, 0.2, 0.23, 0.26, 0.41, 0.47, 0.6, 0.63, 0.66, 0.69, 0.84, 0.9]
      steps.forEach((s, i) => {
        tone(ctx, out, t + s, { freq: [1760, 880, 2349, 1175, 3136, 659][(i * 5) % 6], type: 'square', attack: 0.002, hold: 0.02, decay: 0.03, peak: 0.06, filter: { freq: 3600 } })
        if (i % 3 === 0) noise(ctx, out, t + s, { attack: 0.001, decay: 0.03, peak: 0.12, filter: { type: 'bandpass', freq: 3000, q: 3 } })
      })
      tone(ctx, out, t + 1.0, { freq: 1200, glideTo: 120, glideTime: 0.5, type: 'sawtooth', attack: 0.005, decay: 0.55, peak: 0.08, filter: { freq: 2000, to: 300, time: 0.5 } })
      return t + 1.6
    },
  },
  windup: {
    dur: 3.0,
    build(ctx, out, t) {
      // the watch winding up: ticks that get faster and higher, a rising whine, then a chime
      let at = 0
      let gap = 0.3
      let i = 0
      while (at < 2.3) {
        noise(ctx, out, t + at, { attack: 0.001, decay: 0.012, peak: 0.25 + 0.2 * (at / 2.3), filter: { type: 'bandpass', freq: 2600 + i * 120, q: 6 } })
        at += gap
        gap = Math.max(0.045, gap * 0.86)
        i++
      }
      tone(ctx, out, t, { freq: 220, glideTo: 1760, glideTime: 2.3, type: 'triangle', attack: 2.1, decay: 0.15, peak: 0.05 })
      swell(ctx, out, t + 0.6, 1.7, { peak: 0.1, from: 600, to: 5000 })
      bell(ctx, out, t + 2.4, note('D6'), { peak: 0.16, decay: 0.5 })
      bell(ctx, out, t + 2.4, note('G5'), { peak: 0.12, decay: 0.5 })
      return t + 2.95
    },
  },
  ringshut: {
    dur: 2.5,
    build(ctx, out, t) {
      // a time ring snapping shut: a quick suck in, a metallic ring and a low thump
      swell(ctx, out, t, 0.4, { peak: 0.2, from: 6000, to: 800 })
      const hit = t + 0.42
      bell(ctx, out, hit, note('G5'), { peak: 0.18, decay: 1.8 })
      bell(ctx, out, hit + 0.01, note('C#6'), { peak: 0.1, decay: 1.5 })
      tone(ctx, out, hit, { freq: 80, glideTo: 40, glideTime: 0.3, attack: 0.002, decay: 0.7, peak: 0.35 })
      noise(ctx, out, hit, { attack: 0.001, decay: 0.15, peak: 0.18, filter: { type: 'highpass', freq: 3000 } })
      tone(ctx, out, hit + 0.1, { freq: 1568, glideTo: 392, glideTime: 1.4, attack: 0.01, decay: 1.5, peak: 0.04, fm: { ratio: 1.5, index: 0.3 } })
      return t + 2.4
    },
  },
  brassfanfare: {
    dur: 3.4,
    build(ctx, out, t) {
      // a proud brass fanfare over a timpani roll, for the big public moments
      const notes = [['D4', 0.14], ['D4', 0.14], ['G4', 0.28], ['B4', 0.28], ['D5', 0.42], ['B4', 0.18], ['D5', 0.18], ['G5', 1.1]]
      let at = t
      for (const [n, len] of notes) {
        brass(ctx, out, at, note(n), len, 0.05)
        brass(ctx, out, at, note(n) * 1.5, len, 0.02) // a fifth above, for the second trumpet
        at += len
      }
      for (let i = 0; i < 10; i++) tone(ctx, out, t + 2.0 + i * 0.05, { freq: 98, glideTo: 90, glideTime: 0.05, attack: 0.003, decay: 0.12, peak: 0.05 + i * 0.01 })
      tone(ctx, out, t + 2.6, { freq: 98, glideTo: 60, glideTime: 0.3, attack: 0.003, decay: 0.6, peak: 0.4 })
      return t + 3.3
    },
  },
}

// ---- little sounds that pop up in the new scenes ----
const spots = {
  pick(ctx, out, t, r) {
    // a pick on rock, sometimes twice
    const f = 1800 + r() * 900
    bell(ctx, out, t, f, { peak: 0.02, decay: 0.12 })
    noise(ctx, out, t, { attack: 0.001, decay: 0.03, peak: 0.03, filter: { type: 'bandpass', freq: 2500, q: 2 } })
    if (r() > 0.5) bell(ctx, out, t + 0.6 + r() * 0.3, f * 0.95, { peak: 0.016, decay: 0.12 })
  },
  cradle(ctx, out, t, r) {
    // gravel rattling in a rocking cradle: two shakes
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < 9; i++) noise(ctx, out, t + s * 0.55 + i * 0.03 + r() * 0.02, { attack: 0.001, decay: 0.02, peak: 0.012 + r() * 0.012, filter: { type: 'bandpass', freq: 1200 + r() * 1600, q: 2 } })
    }
  },
  oompah(ctx, out, t, r) {
    // a brass band a street away: tuba on the beat, a cornet phrase on top
    const key = r() > 0.5 ? 0 : 5
    const bass = ['G2', 'D2', 'G2', 'D2']
    const top = ['B4', 'D5', 'G5', 'D5']
    bass.forEach((n, i) => tone(ctx, out, t + i * 0.5, { freq: note(n) * 2 ** (key / 12), type: 'sawtooth', attack: 0.02, hold: 0.15, decay: 0.15, peak: 0.012, filter: { freq: 500 } }))
    top.forEach((n, i) => tone(ctx, out, t + i * 0.5 + 0.25, { freq: note(n) * 2 ** (key / 12), type: 'sawtooth', attack: 0.02, hold: 0.12, decay: 0.12, peak: 0.006, filter: { freq: 1400 } }))
  },
  roar(ctx, out, t, r) {
    // the crowd surges with a cheer, somewhere off to one side
    noise(ctx, out, t, { attack: 0.5 + r() * 0.4, hold: 0.4, decay: 1.2, peak: 0.03, filter: { type: 'bandpass', freq: 900 + r() * 500, q: 0.8 } })
  },
  halyard(ctx, out, t, r) {
    // rigging clinking on an aluminium mast
    const f = 1100 + r() * 500
    bell(ctx, out, t, f, { peak: 0.018, decay: 0.3 })
    if (r() > 0.4) bell(ctx, out, t + 0.18 + r() * 0.1, f * 1.07, { peak: 0.012, decay: 0.25 })
  },
  gull(ctx, out, t, r) {
    // a gull's cry: a few falling squawks
    const f = 1500 + r() * 400
    for (let i = 0; i < 2 + Math.floor(r() * 3); i++) tone(ctx, out, t + i * 0.28, { freq: f, glideTo: f * 0.7, glideTime: 0.2, type: 'sawtooth', attack: 0.01, decay: 0.2, peak: 0.008, filter: { type: 'bandpass', freq: 2200, q: 3 } })
  },
}

const scenes = {
  goldfield: {
    beds: [
      { filter: { type: 'bandpass', freq: 1400, q: 0.9 }, level: 0.028, lfo: { rate: 0.7, depth: 0.35 } }, // the creek babbling over stones
      { filter: { type: 'highpass', freq: 3200 }, level: 0.008, lfo: { rate: 1.3, depth: 0.5 } }, // sparkle on the water
      { filter: { type: 'lowpass', freq: 600 }, level: 0.03, lfo: { rate: 0.06, depth: 0.7 } }, // wind in the gums
    ],
    spots: [{ name: 'pick', rate: 0.35 }, { name: 'cradle', rate: 0.12 }, { name: 'bird', rate: 0.08 }],
  },
  jubilee: {
    beds: [
      { filter: { type: 'bandpass', freq: 750, q: 0.7 }, level: 0.05, lfo: { rate: 0.18, depth: 0.4 } }, // a huge crowd murmuring
      { filter: { type: 'lowpass', freq: 160 }, level: 0.03, lfo: { rate: 0.04, depth: 0.4 } },
      { filter: { type: 'highpass', freq: 2500 }, level: 0.008, lfo: { rate: 0.25, depth: 0.6 } }, // flags flapping in the breeze
    ],
    spots: [{ name: 'oompah', rate: 0.03 }, { name: 'roar', rate: 0.05 }, { name: 'clap', rate: 0.05 }],
  },
  regatta: {
    beds: [
      { filter: { type: 'lowpass', freq: 450 }, level: 0.05, lfo: { rate: 0.12, depth: 0.8 } }, // waves on the hull
      { filter: { type: 'bandpass', freq: 2400, q: 3 }, level: 0.012, lfo: { rate: 0.09, depth: 0.7 } }, // wind in the rigging
      { filter: { type: 'lowpass', freq: 120 }, level: 0.025 },
    ],
    spots: [{ name: 'halyard', rate: 0.2 }, { name: 'gull', rate: 0.05 }, { name: 'farHorn', rate: 0.01 }],
  },
}

// Sounds placed around you in each new scene (no cars or helicopters before their time)
const around = {
  goldfield: [{ name: 'kookaburra', rate: 0.006 }, { name: 'magpie', rate: 0.012 }, { name: 'bird', rate: 0.04 }, { name: 'dog', rate: 0.003 }],
  jubilee: [{ name: 'brassband', rate: 0.006 }, { name: 'chatter', rate: 0.02 }, { name: 'crowdwave', rate: 0.004 }],
  regatta: [{ name: 'chatter', rate: 0.006 }, { name: 'helicopter', rate: 0.002 }],
}

const spatial = {
  brassband: { dur: 8, from: { x: -35, y: 0, z: -12 }, to: { x: 35, y: 0, z: -10 }, recorded: 'brass-band-pass', synth: 'brassband' },
  crowdwave: { dur: 6, from: { x: -60, y: 12, z: 25 }, to: { x: 60, y: 12, z: -35 }, recorded: 'crowd-wave', synth: 'crowdwave' },
}

const synth = {
  brassband(ctx, out, t, dur) {
    // a march going by: bass drum and tuba on the beat, cornets on top
    const tune = ['B4', 'D5', 'G5', 'F#5', 'E5', 'D5', 'B4', 'D5', 'C#5', 'E5', 'A5', 'G5', 'F#5', 'E5', 'D5', 'D5']
    const tuba = ['G2', 'D2', 'G2', 'D2', 'A2', 'D2', 'A2', 'D2']
    const beat = 0.5
    for (let i = 0; i * beat < dur - 0.4; i++) {
      const at = t + i * beat
      kick(ctx, out, at, { peak: 0.12 })
      tone(ctx, out, at, { freq: note(tuba[i % tuba.length]), type: 'sawtooth', attack: 0.02, hold: 0.18, decay: 0.12, peak: 0.08, filter: { freq: 500 } })
      tone(ctx, out, at, { freq: note(tune[i % tune.length]), type: 'sawtooth', attack: 0.02, hold: 0.28, decay: 0.1, peak: 0.04, filter: { freq: 2000, q: 1 } })
      if (i % 2) noise(ctx, out, at + 0.25, { attack: 0.002, decay: 0.08, peak: 0.05, filter: { type: 'bandpass', freq: 4000, q: 1 } }) // cymbal
    }
  },
  crowdwave(ctx, out, t, dur, r) {
    // a roar that swells as it reaches you and rolls on past
    noise(ctx, out, t, { attack: dur * 0.45, decay: dur * 0.5, peak: 0.35, filter: { type: 'bandpass', freq: 900, q: 0.7 } })
    noise(ctx, out, t, { attack: dur * 0.45, decay: dur * 0.5, peak: 0.08, filter: { type: 'highpass', freq: 3000 } })
    for (let i = 0; i < 30; i++) noise(ctx, out, t + dur * 0.3 + r() * dur * 0.4, { attack: 0.002, decay: 0.04, peak: 0.05 + r() * 0.05, filter: { type: 'bandpass', freq: 1400 + r() * 1200, q: 1.2 } })
  },
}

const theme = {
  motif: ['D4', 'G4', 'A4', 'B4', 'C#5', 'D5', 'G5'], // an adventurous climb that lands high, with the Lydian lift
  beats: [0.5, 0.5, 0.5, 1, 0.5, 1, 2.5],
  chord: ['G1', 'D2', 'G2', 'B2', 'D3'],
  end: ['G2', 'B2', 'D3', 'G3'],
  voice: 'horn',
}

const score = {
  bpm: [76, 96, 140, 96],
  drone: ['G1', 'D2'],
  tension: ['G2', 'B2', 'C#3'],
  lift: ['G2', 'B2', 'D3', 'G3'],
  pulse: 'tick', // the watch ticking
  run: ['G4', 'A4', 'B4', 'C#5', 'D5', 'C#5', 'B4', 'A4'],
  bass: ['G1', 'G1', 'B1', 'G1', 'A1', 'A1', 'F#1', 'A1'],
}

export const KIT = { id: 'timerunners', stings, scenes, around, spots, spatial, synth, theme, score }
