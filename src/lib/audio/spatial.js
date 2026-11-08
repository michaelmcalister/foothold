// Sounds with a place around you, for the missions: a helicopter that comes
// in from one side, passes overhead and fades away on the other; cars that
// pass left to right (and sometimes beep); birds calling from somewhere in
// the trees. Uses Web Audio's 3D panner (HRTF, best with headphones), or a
// plain left/right pan where that isn't there. Each sound can be a recorded
// one-shot (library.js SFX) or, until that's made, a synthesised stand-in.
import { note, tone, noise, bell } from './synth.js'

/**
 * A spot in space to play a sound from. Positions are metres: x is right,
 * y is up, z is in front of you (negative). move() glides it along a path.
 */
export function spot(ctx, out, { x = 0, y = 0, z = -10 } = {}) {
  if (ctx.createPanner) {
    const p = ctx.createPanner()
    p.panningModel = 'HRTF'
    p.distanceModel = 'inverse'
    p.refDistance = 15 // full volume within 15 m, then a gentle fade (a helicopter 80 m away is still loud)
    p.rolloffFactor = 0.6
    const set = (t, pos) => {
      if (p.positionX) { p.positionX.setValueAtTime(pos.x, t); p.positionY.setValueAtTime(pos.y, t); p.positionZ.setValueAtTime(pos.z, t) } else p.setPosition?.(pos.x, pos.y, pos.z)
    }
    set(ctx.currentTime, { x, y, z })
    p.connect(out)
    return {
      input: p,
      move(t0, dur, from, to, steps = 24) {
        if (!p.positionX) { p.setPosition?.(to.x, to.y, to.z); return }
        for (let i = 0; i <= steps; i++) {
          const f = i / steps
          const at = t0 + dur * f
          const pos = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, z: from.z + (to.z - from.z) * f }
          if (i === 0) set(at, pos)
          else { p.positionX.linearRampToValueAtTime(pos.x, at); p.positionY.linearRampToValueAtTime(pos.y, at); p.positionZ.linearRampToValueAtTime(pos.z, at) }
        }
      },
    }
  }
  // no 3D panner: left and right only, quieter when far away
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null
  const g = ctx.createGain()
  const level = (pos) => { const d = Math.hypot(pos.x, pos.y, pos.z); return d <= 15 ? 1 : 15 / (15 + 0.6 * (d - 15)) }
  g.gain.value = level({ x, y, z })
  if (pan) { pan.pan.value = Math.max(-1, Math.min(1, x / 30)); pan.connect(g) }
  g.connect(out)
  return {
    input: pan || g,
    move(t0, dur, from, to) {
      if (pan) { pan.pan.setValueAtTime(Math.max(-1, Math.min(1, from.x / 30)), t0); pan.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, to.x / 30)), t0 + dur) }
      g.gain.setValueAtTime(level(from), t0)
      g.gain.linearRampToValueAtTime(1, t0 + dur / 2)
      g.gain.linearRampToValueAtTime(level(to), t0 + dur)
    },
  }
}

// ---- the stand-ins, until the recorded one-shots are made ----
const SYNTH = {
  helicopter(ctx, out, t, dur) {
    // rotor thump, with a turbine whine over the top
    const n = Math.floor(dur / 0.075)
    for (let i = 0; i < n; i++) noise(ctx, out, t + i * 0.075, { attack: 0.004, decay: 0.05, peak: 0.9, filter: { type: 'lowpass', freq: 320 } })
    tone(ctx, out, t, { freq: 1180, glideTo: 1020, glideTime: dur, type: 'sawtooth', attack: dur * 0.3, hold: dur * 0.3, decay: dur * 0.4, peak: 0.035, filter: { type: 'bandpass', freq: 1100, q: 6 } })
  },
  car(ctx, out, t, dur) {
    // tyres and engine, dropping in pitch as it passes
    noise(ctx, out, t, { attack: dur * 0.45, decay: dur * 0.55, peak: 0.22, filter: { type: 'bandpass', freq: 700, to: 450, time: dur, q: 0.8 } })
    tone(ctx, out, t, { freq: 95, glideTo: 70, glideTime: dur, type: 'sawtooth', attack: dur * 0.45, decay: dur * 0.55, peak: 0.05, filter: { freq: 400 } })
  },
  horn(ctx, out, t) {
    for (const at of [0, 0.32]) for (const f of [392, 466]) tone(ctx, out, t + at, { freq: f, type: 'sawtooth', attack: 0.01, hold: 0.18, decay: 0.06, peak: 0.07, filter: { freq: 1800 } })
  },
  bird(ctx, out, t, dur, r) {
    const f = 2600 + r() * 1600
    const n = 3 + Math.floor(r() * 5)
    for (let i = 0; i < n; i++) tone(ctx, out, t + i * (0.09 + r() * 0.05), { freq: f * (0.9 + r() * 0.3), glideTo: f * (1.1 + r() * 0.4), glideTime: 0.06, attack: 0.004, decay: 0.07, peak: 0.14 })
  },
  magpie(ctx, out, t, dur, r) {
    // a warbling carol: liquid glides up and down
    const base = [note('E6'), note('B5'), note('G#6'), note('C#6'), note('F#6'), note('A5')]
    base.forEach((f, i) => tone(ctx, out, t + i * 0.22, { freq: f, glideTo: f * (r() > 0.5 ? 1.25 : 0.8), glideTime: 0.18, attack: 0.02, decay: 0.2, peak: 0.18, fm: { ratio: 2, index: 0.3 } }))
  },
  siren(ctx, out, t, dur) {
    for (let i = 0; i * 1.2 < dur; i++) tone(ctx, out, t + i * 1.2, { freq: 620, glideTo: 980, glideTime: 0.6, type: 'sawtooth', attack: 0.1, hold: 0.5, decay: 0.5, peak: 0.12, filter: { freq: 1600 } })
  },
  chatter(ctx, out, t, dur, r) {
    // voices too far away to make out: formant-ish murmurs
    for (let i = 0; i < dur * 4; i++) noise(ctx, out, t + i * 0.25 + r() * 0.1, { attack: 0.03, decay: 0.12, peak: 0.2, filter: { type: 'bandpass', freq: 500 + r() * 900, q: 4 } })
  },
  drones(ctx, out, t, dur, r) {
    // a cloud of tiny rotors: detuned buzzing that swells and passes
    for (let i = 0; i < 5; i++) tone(ctx, out, t + r() * 0.4, { freq: 380 + r() * 260, glideTo: 300 + r() * 200, glideTime: dur, type: 'sawtooth', detune: (r() - 0.5) * 30, attack: dur * 0.4, decay: dur * 0.55, peak: 0.04, filter: { type: 'bandpass', freq: 1500, q: 2 } })
    noise(ctx, out, t, { attack: dur * 0.4, decay: dur * 0.6, peak: 0.12, filter: { type: 'bandpass', freq: 3000, q: 1.5 } })
  },
  meteor(ctx, out, t, dur) {
    // a hiss tearing across the sky, then a far off rumble
    noise(ctx, out, t, { attack: dur * 0.3, decay: dur * 0.5, peak: 0.3, filter: { type: 'bandpass', freq: 5000, to: 600, time: dur * 0.8, q: 1 } })
    tone(ctx, out, t + dur * 0.75, { freq: 50, glideTo: 30, glideTime: 1, attack: 0.05, decay: 1.2, peak: 0.25 })
  },
  crackle(ctx, out, t, dur, r) {
    for (let i = 0; i < dur * 12; i++) noise(ctx, out, t + r() * dur, { attack: 0.001, decay: 0.015 + r() * 0.03, peak: 0.05 + r() * 0.08, filter: { type: 'bandpass', freq: 1500 + r() * 2500, q: 3 } })
  },
}

/**
 * The spatial sounds: how long each lasts and the path it takes.
 * recorded: the library one-shot to use when it's been made.
 */
export const SPATIAL = {
  helicopter: { dur: 9, from: { x: -80, y: 25, z: -30 }, to: { x: 90, y: 25, z: 20 }, recorded: 'helicopter', synth: 'helicopter' },
  car: { dur: 3.6, from: { x: -30, y: 0, z: -6 }, to: { x: 30, y: 0, z: -6 }, recorded: 'car-pass', synth: 'car', horn: 0.25 },
  firetruck: { dur: 7, from: { x: 40, y: 0, z: -15 }, to: { x: -50, y: 0, z: -10 }, recorded: 'siren-pass', synth: 'siren' },
  bird: { dur: 1.5, place: 'trees', recorded: null, synth: 'bird' },
  magpie: { dur: 2.5, place: 'trees', recorded: 'magpie', synth: 'magpie' },
  kookaburra: { dur: 4, place: 'trees', recorded: 'kookaburra', synth: 'bird' },
  kids: { dur: 6, place: 'park', recorded: 'kids', synth: null },
  chatter: { dur: 4, from: { x: 12, y: 0, z: -4 }, to: { x: -12, y: 0, z: -2 }, recorded: 'chatter', synth: 'chatter' },
  dog: { dur: 2.5, place: 'yard', recorded: 'dog', synth: null },
  drones: { dur: 6, from: { x: -40, y: 12, z: -20 }, to: { x: 50, y: 10, z: 12 }, recorded: 'drone-swarm', synth: 'drones' },
  meteor: { dur: 4, from: { x: -90, y: 70, z: -60 }, to: { x: 80, y: 30, z: -40 }, recorded: 'meteor', synth: 'meteor' },
}

/** A random place for a sound with no path: up in the trees, across the park, over a fence. */
export function placeFor(kind, r) {
  const side = r() < 0.5 ? -1 : 1
  if (kind === 'trees') return { x: side * (6 + r() * 20), y: 6 + r() * 8, z: -5 - r() * 20 }
  if (kind === 'park') return { x: side * (20 + r() * 30), y: 0, z: -10 - r() * 30 }
  return { x: side * (8 + r() * 10), y: 0, z: -4 - r() * 8 }
}

/**
 * Play a spatial sound at time t. buffer: the recorded one-shot, if loaded.
 * Returns the time it ends, or t if there's nothing to play.
 */
export function playSpatial(ctx, out, name, t, { buffer = null, r = Math.random } = {}) {
  const def = SPATIAL[name]
  if (!def || (!buffer && !def.synth)) return t
  const dur = buffer ? Math.min(buffer.duration, 20) : def.dur
  const from = def.from || placeFor(def.place, r)
  const to = def.to || from
  const sp = spot(ctx, out, from)
  sp.move(t, dur, from, to)
  if (buffer) {
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(sp.input)
    src.start(t)
  } else {
    SYNTH[def.synth](ctx, sp.input, t, dur, r)
  }
  if (def.horn && r() < def.horn) SYNTH.horn(ctx, sp.input, t + dur * 0.45)
  return t + dur
}

/** Radio static under a radio line: a hiss with crackles, then a squelch off. */
export function radioStatic(ctx, out, t, dur, r = Math.random) {
  noise(ctx, out, t, { attack: 0.05, hold: Math.max(0, dur - 0.3), decay: 0.25, peak: 0.018, filter: { type: 'bandpass', freq: 2600, q: 1.2 } })
  SYNTH.crackle(ctx, out, t, dur, r)
  // now and then the signal drops for a moment
  if (r() < 0.35) noise(ctx, out, t + dur * (0.3 + r() * 0.4), { attack: 0.01, hold: 0.25, decay: 0.1, peak: 0.12, filter: { type: 'bandpass', freq: 1800, q: 0.8 } })
  bell(ctx, out, t + dur, 2400, { peak: 0.02, decay: 0.08 })
  return t + dur
}
