// The sound kit built from each series' sound sheet (missions/sound): the
// scenes, the sounds that pass around you and the recorded cues each story
// uses. The real sound is recorded (ElevenLabs, from the prompts on the
// sheets, kept in R2 by worker/audioLibrary.js); what's here is the quiet
// synthesised stand-in that plays until a recording has been made, put
// together from a few simple presets. soundscape.js and spatial.js merge it in.
import { SHEETS } from '../../missions/sound/index.js'

// Stand-in beds: filtered noise and hums that roughly match a kind of place
const BEDS = {
  wind: [{ filter: { type: 'lowpass', freq: 420 }, level: 0.03, lfo: { rate: 0.06, depth: 0.6 } }],
  gusts: [{ filter: { type: 'bandpass', freq: 700, q: 0.5 }, level: 0.035, lfo: { rate: 0.11, depth: 0.8 } }],
  surf: [{ filter: { type: 'lowpass', freq: 700 }, level: 0.05, lfo: { rate: 0.12, depth: 0.85 } }, { filter: { type: 'highpass', freq: 3500 }, level: 0.008, lfo: { rate: 0.12, depth: 0.7 } }],
  lapping: [{ filter: { type: 'lowpass', freq: 600 }, level: 0.03, lfo: { rate: 0.25, depth: 0.6 } }],
  river: [{ filter: { type: 'lowpass', freq: 900 }, level: 0.035, lfo: { rate: 0.09, depth: 0.4 } }],
  rain: [{ filter: { type: 'highpass', freq: 2200 }, level: 0.045, lfo: { rate: 0.05, depth: 0.3 } }, { filter: { type: 'lowpass', freq: 500 }, level: 0.03 }],
  crowd: [{ filter: { type: 'bandpass', freq: 900, q: 0.6 }, level: 0.03, lfo: { rate: 0.07, depth: 0.4 } }],
  traffic: [{ filter: { type: 'lowpass', freq: 260 }, level: 0.04, lfo: { rate: 0.05, depth: 0.4 } }],
  insects: [{ filter: { type: 'highpass', freq: 5200 }, level: 0.012, lfo: { rate: 0.3, depth: 0.6 } }],
  cicadas: [{ filter: { type: 'bandpass', freq: 5000, q: 2 }, level: 0.02, lfo: { rate: 0.4, depth: 0.7 } }],
  room: [{ filter: { type: 'lowpass', freq: 160 }, level: 0.03 }],
  cave: [{ filter: { type: 'lowpass', freq: 180 }, level: 0.04, lfo: { rate: 0.03, depth: 0.5 } }],
  fire: [{ filter: { type: 'bandpass', freq: 1200, q: 0.7 }, level: 0.03, lfo: { rate: 0.4, depth: 0.5 } }],
  storm: [{ filter: { type: 'lowpass', freq: 90 }, level: 0.04, lfo: { rate: 0.03, depth: 0.6 } }, { filter: { type: 'highpass', freq: 1800 }, level: 0.04, lfo: { rate: 0.06, depth: 0.4 } }],
  hush: [{ filter: { type: 'lowpass', freq: 300 }, level: 0.015 }],
}
const HUMS = { traffic: [{ freq: 45, level: 0.005 }], room: [{ freq: 60, level: 0.004 }], machine: [{ freq: 50, level: 0.008 }], cave: [{ freq: 38, level: 0.004 }] }

// Where a passing sound travels (metres: x right, y up, z ahead is negative)
const PATHS = {
  pass: { from: { x: -32, y: 0, z: -6 }, to: { x: 32, y: 0, z: -6 } },
  back: { from: { x: 30, y: 0, z: -8 }, to: { x: -30, y: 0, z: -5 } },
  over: { from: { x: -70, y: 30, z: -30 }, to: { x: 80, y: 25, z: 20 } },
  far: { from: { x: -60, y: 5, z: -60 }, to: { x: 60, y: 5, z: -50 } },
  water: { from: { x: -45, y: 0, z: -18 }, to: { x: 45, y: 0, z: -10 } },
  behind: { from: { x: -6, y: 0, z: 25 }, to: { x: 8, y: 0, z: 4 } },
}

/** A sheet's scene as a soundscape scene: stand-in beds, hums, little sounds. Pure. */
export function sceneFrom(spec) {
  const kinds = spec.synth || ['wind']
  return {
    beds: kinds.flatMap((k) => BEDS[k] || []),
    hums: kinds.flatMap((k) => HUMS[k] || []),
    spots: (spec.spots || []).map((s) => (Array.isArray(s) ? { name: s[0], rate: s[1] } : { name: s, rate: 0.08 })),
  }
}

/** A sheet's passing sound as a spatial sound. Pure. */
export function passingFrom(id, spec) {
  const path = PATHS[spec.path] ? PATHS[spec.path] : null
  return {
    dur: spec.seconds || 5,
    ...(path ? { from: path.from, to: path.to } : { place: spec.path || 'trees' }),
    recorded: id,
    synth: spec.synth || null,
  }
}

const scenes = {}
const around = {}
const spatial = {}
for (const sheet of SHEETS) {
  for (const [id, spec] of Object.entries(sheet.scenes || {})) {
    scenes[id] = sceneFrom(spec)
    around[id] = (spec.around || []).map((a) => (Array.isArray(a) ? { name: a[0], rate: a[1] } : { name: a, rate: 0.012 }))
  }
  for (const [id, spec] of Object.entries(sheet.passing || {})) spatial[id] = passingFrom(id, spec)
}

export const KIT = { id: 'designed', stings: {}, scenes, around, spots: {}, spatial, synth: {} }
