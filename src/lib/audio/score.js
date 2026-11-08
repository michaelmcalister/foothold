// The run recap's music: a generative score that follows the flyover's shots,
// in one of five styles (STYLES), each with its own key, chords, tempo,
// instruments, drum feel and tune. A run always gets the same style
// (pickStyle), and the recap's music button skips to the next.
//   Sunny Side    D major pop, 100 BPM (the original)
//   Midnight Drive  A minor synthwave, 108 BPM
//   Hold the Line   E minor anthem, half time drums and horns, 90 BPM
//   Slow Burn       lo-fi seventh chords with a lazy swing, 84 BPM
//   Coastal         G major surf, quick and bright, 132 BPM
//   flyin    a rising pad swell
//   follow   the groove comes in, busier as the trail draws (setIntensity)
//   orbit    everything plays, with a lift as the hexes appear
//   overview resolves to the home chord and fades over about 3 seconds
// The four-bar pattern loops seamlessly if a shot runs long. Notes are
// scheduled on the AudioContext clock a little ahead of time (a lookahead
// scheduler); the timer only wakes it up, so timer jitter never shifts a beat.
import { note, pad, pluck, bell, tone, kick, hat, clap, swell, crash, SILENT } from './synth.js'
import { context, musicOut } from './sfx.js'

export const BPM = 100
export const STEPS_PER_BAR = 16 // sixteenth notes
export const LOOP_BARS = 4
export const LOOP_STEPS = STEPS_PER_BAR * LOOP_BARS
export const stepSeconds = (bpm = BPM) => 60 / bpm / 4
export const SECTIONS = ['flyin', 'follow', 'orbit', 'overview']

// I V vi IV, voiced close so the pad moves smoothly
export const PROGRESSION = [
  { name: 'D', pad: ['A3', 'D4', 'F#4', 'A4'], bass: 'D3', arp: ['A4', 'D5', 'F#5', 'A5'] },
  { name: 'A', pad: ['A3', 'C#4', 'E4', 'A4'], bass: 'A2', arp: ['A4', 'C#5', 'E5', 'A5'] },
  { name: 'Bm', pad: ['B3', 'D4', 'F#4', 'B4'], bass: 'B2', arp: ['B4', 'D5', 'F#5', 'B5'] },
  { name: 'G', pad: ['B3', 'D4', 'G4', 'B4'], bass: 'G2', arp: ['G4', 'B4', 'D5', 'G5'] },
]
export const ARP_ORDER = [0, 1, 2, 3, 2, 1, 2, 3, 0, 2, 1, 3, 2, 3, 1, 2]
// The orbit's bell tune, one note per beat (null rests), across the four bars
export const MELODY = [
  'A5', null, 'F#5', 'A5',
  'E5', null, 'C#6', 'A5',
  'F#5', null, 'D6', 'B5',
  'G5', null, 'D5', 'B4',
]
export const TONIC = ['D4', 'F#4', 'A4', 'D5']

const chord = (name, padNotes, bass, arp) => ({ name, pad: padNotes, bass, arp })
const UP = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]

export const STYLES = {
  sunny: {
    id: 'sunny', name: 'Sunny Side', bpm: BPM, progression: PROGRESSION, arpOrder: ARP_ORDER, melody: MELODY, tonic: TONIC,
    lift: ['D6', 'A6'], arp: 'pluck', lead: 'bell', drums: 'pop', swing: 0,
  },
  midnight: {
    id: 'midnight', name: 'Midnight Drive', bpm: 108,
    progression: [
      chord('Am', ['A3', 'C4', 'E4', 'A4'], 'A2', ['A4', 'C5', 'E5', 'A5']),
      chord('F', ['A3', 'C4', 'F4', 'A4'], 'F2', ['F4', 'A4', 'C5', 'F5']),
      chord('C', ['G3', 'C4', 'E4', 'G4'], 'C3', ['G4', 'C5', 'E5', 'G5']),
      chord('G', ['G3', 'B3', 'D4', 'G4'], 'G2', ['G4', 'B4', 'D5', 'G5']),
    ],
    arpOrder: UP,
    melody: ['E5', null, 'C5', 'E5', 'F5', null, 'A5', 'F5', 'G5', null, 'E5', 'C5', 'D5', null, 'B4', 'G4'],
    tonic: ['A3', 'C4', 'E4', 'A4'], lift: ['A5', 'E6'], arp: 'saw', lead: 'horn', drums: 'synth', swing: 0,
  },
  anthem: {
    id: 'anthem', name: 'Hold the Line', bpm: 90,
    progression: [
      chord('Em', ['G3', 'B3', 'E4', 'G4'], 'E2', ['E4', 'G4', 'B4', 'E5']),
      chord('C', ['G3', 'C4', 'E4', 'G4'], 'C2', ['C4', 'E4', 'G4', 'C5']),
      chord('G', ['G3', 'B3', 'D4', 'G4'], 'G2', ['G4', 'B4', 'D5', 'G5']),
      chord('D', ['F#3', 'A3', 'D4', 'F#4'], 'D2', ['D4', 'F#4', 'A4', 'D5']),
    ],
    arpOrder: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 3, 2, 1],
    melody: ['B4', null, 'E5', 'G5', 'G5', null, 'E5', 'C5', 'D5', null, 'G5', 'B5', 'A5', null, 'F#5', 'D5'],
    tonic: ['E3', 'G#3', 'B3', 'E4'], lift: ['E5', 'B5'], arp: 'pluck', lead: 'horn', drums: 'halftime', swing: 0,
  },
  chill: {
    id: 'chill', name: 'Slow Burn', bpm: 84,
    progression: [
      chord('Fmaj7', ['A3', 'C4', 'E4', 'F4'], 'F2', ['F4', 'A4', 'C5', 'E5']),
      chord('Em7', ['G3', 'B3', 'D4', 'E4'], 'E2', ['E4', 'G4', 'B4', 'D5']),
      chord('Dm7', ['F3', 'A3', 'C4', 'D4'], 'D2', ['D4', 'F4', 'A4', 'C5']),
      chord('Cmaj7', ['E3', 'G3', 'B3', 'C4'], 'C2', ['C4', 'E4', 'G4', 'B4']),
    ],
    arpOrder: [0, 2, 3, 1, 2, 3, 0, 2, 1, 3, 2, 0, 3, 1, 2, 3],
    melody: ['C6', null, 'A5', null, 'B5', null, 'G5', null, 'A5', null, 'F5', 'D5', 'E5', null, 'G5', null],
    tonic: ['F3', 'A3', 'C4', 'E4'], lift: ['C6', 'G6'], arp: 'keys', lead: 'whistle', drums: 'lofi', swing: 0.32,
  },
  surf: {
    id: 'surf', name: 'Coastal', bpm: 132,
    progression: [
      chord('G', ['G3', 'B3', 'D4', 'G4'], 'G2', ['G4', 'B4', 'D5', 'G5']),
      chord('C', ['G3', 'C4', 'E4', 'G4'], 'C3', ['C5', 'E5', 'G5', 'C6']),
      chord('D', ['F#3', 'A3', 'D4', 'F#4'], 'D3', ['D5', 'F#5', 'A5', 'D6']),
      chord('C', ['G3', 'C4', 'E4', 'G4'], 'C3', ['C5', 'E5', 'G5', 'C6']),
    ],
    arpOrder: UP,
    melody: ['D6', null, 'B5', 'G5', 'E6', null, 'C6', 'G5', 'F#6', null, 'D6', 'A5', 'E6', null, 'C6', 'G5'],
    tonic: ['G3', 'B3', 'D4', 'G4'], lift: ['G6', 'D6'], arp: 'marimba', lead: 'whistle', drums: 'surf', swing: 0,
  },
}
export const STYLE_ORDER = ['sunny', 'midnight', 'anthem', 'chill', 'surf']

/** The style for a run: the same run always gets the same one. */
export function pickStyle(seed = '') {
  let h = 0
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return STYLES[STYLE_ORDER[h % STYLE_ORDER.length]]
}
/** The style for a run: the one picked with the music button, else its own. */
export function styleFor(id) {
  try {
    const kept = localStorage.getItem('fh-recap-style:' + id)
    if (kept && STYLES[kept]) return STYLES[kept]
  } catch { /* storage blocked */ }
  return pickStyle(id)
}
/** Remember the style picked for a run (so its reel uses it too). */
export function keepStyle(id, styleId) {
  try { localStorage.setItem('fh-recap-style:' + id, styleId) } catch { /* fine */ }
}

/** The next style along (the recap's music button). */
export const nextStyle = (id) => STYLES[STYLE_ORDER[(STYLE_ORDER.indexOf(id) + 1) % STYLE_ORDER.length]]

// Each style's drums for the full band (orbit) and the groove (follow)
function drums(kind, q, i, full, ev) {
  if (kind === 'pop') {
    if (full) {
      if (q % 4 === 0) ev.push({ voice: 'kick', vel: 0.85 })
      if (q === 4 || q === 12) ev.push({ voice: 'clap', vel: 0.8 })
      if (q % 4 === 2) ev.push({ voice: 'hat', vel: 0.7, open: true })
      else if (q % 2 === 1) ev.push({ voice: 'hat', vel: 0.35 })
    } else {
      if (q % 8 === 0 || (i > 0.65 && q % 4 === 0)) ev.push({ voice: 'kick', vel: q % 8 === 0 ? 0.8 : 0.6 })
      if (i > 0.2 && q % 4 === 2) ev.push({ voice: 'hat', vel: 0.5 + 0.4 * i })
      if (i > 0.75 && q % 2 === 1) ev.push({ voice: 'hat', vel: 0.3 })
    }
  } else if (kind === 'synth') {
    if (q % 4 === 0 && (full || i > 0.4 || q % 8 === 0)) ev.push({ voice: 'kick', vel: 0.85 })
    if ((full || i > 0.6) && (q === 4 || q === 12)) ev.push({ voice: 'clap', vel: 0.85 })
    if (full || i > 0.3) ev.push({ voice: 'hat', vel: q % 2 ? 0.25 : 0.45 })
  } else if (kind === 'halftime') {
    if (q === 0 || (full && q === 10)) ev.push({ voice: 'kick', vel: 0.95 })
    if ((full || i > 0.5) && q === 8) ev.push({ voice: 'clap', vel: 0.9 })
    if (full && q >= 12 && q % 2 === 0) ev.push({ voice: 'tom', vel: 0.4 + (q - 12) * 0.12 })
    if (q % 4 === 2) ev.push({ voice: 'hat', vel: full ? 0.5 : 0.3 })
  } else if (kind === 'lofi') {
    if (q === 0 || q === 10 || (full && q === 7)) ev.push({ voice: 'kick', vel: 0.6 })
    if ((full || i > 0.4) && (q === 4 || q === 12)) ev.push({ voice: 'clap', vel: 0.45 })
    if (q % 2 === 0 && (full || i > 0.2)) ev.push({ voice: 'hat', vel: q % 4 === 2 ? 0.3 : 0.5 })
  } else if (kind === 'surf') {
    if (q === 0 || q === 8 || (full && q === 10)) ev.push({ voice: 'kick', vel: 0.75 })
    if ((full || i > 0.4) && (q === 4 || q === 12)) ev.push({ voice: 'clap', vel: 0.7 })
    if (q % 2 === 0 && (full || i > 0.25)) ev.push({ voice: 'hat', vel: 0.55, open: q % 4 === 2 }) // a tambourine feel
  }
}

const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0))

/**
 * What plays on one sixteenth step of a section, as plain descriptions:
 * { voice: 'pad' | 'arp' | 'bass' | 'kick' | 'hat' | 'clap' | 'bell', notes | note, vel, ... }.
 */
export function stepEvents(section, step, intensity = 0.5, style = STYLES.sunny) {
  const i = clamp01(intensity)
  const s = ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS
  const bar = Math.floor(s / STEPS_PER_BAR)
  const q = s % STEPS_PER_BAR
  const chord = style.progression[bar]
  const order = style.arpOrder
  const ev = []
  if (!SECTIONS.includes(section) || section === 'overview') return ev
  if (section === 'flyin') {
    if (q === 0) ev.push({ voice: 'pad', notes: chord.pad, vel: 0.9, attack: 2.4, cutoff: 700, to: 2200 })
    if (q % 8 === 4) ev.push({ voice: 'bell', note: chord.arp[3], vel: 0.25 })
    return ev
  }
  if (section === 'follow') {
    if (q === 0) ev.push({ voice: 'pad', notes: chord.pad, vel: 0.6 + 0.2 * i, attack: 0.35, cutoff: 1000 + 800 * i })
    if (i >= 0.5 || q % 2 === 0) ev.push({ voice: 'arp', note: chord.arp[order[q]], vel: (q % 4 === 0 ? 0.65 : 0.5) + 0.3 * i })
    drums(style.drums, q, i, false, ev)
    if (i > 0.35 && (q === 0 || q === 8)) ev.push({ voice: 'bass', note: chord.bass, vel: 0.8 })
    if (i > 0.6 && (q === 6 || q === 14)) ev.push({ voice: 'bass', note: chord.bass, vel: 0.55 })
    return ev
  }
  // orbit: the full band
  if (q === 0) ev.push({ voice: 'pad', notes: chord.pad, vel: 1, attack: 0.25, cutoff: 2200 })
  ev.push({ voice: 'arp', note: chord.arp[order[q]], vel: q % 4 === 0 ? 0.95 : 0.75 })
  drums(style.drums, q, i, true, ev)
  if (q === 0 || q === 6 || q === 8 || q === 14) ev.push({ voice: 'bass', note: chord.bass, vel: q % 8 === 0 ? 0.9 : 0.6 })
  const m = q % 4 === 0 ? style.melody[bar * 4 + q / 4] : null
  if (m) ev.push({ voice: 'bell', note: m, vel: 0.8 })
  return ev
}

/** Turn one event into sound at time t. */
export function render(ctx, out, ev, t, { bar = stepSeconds() * STEPS_PER_BAR, style = STYLES.sunny } = {}) {
  const v = ev.vel ?? 1
  switch (ev.voice) {
    case 'pad': return pad(ctx, out, t, ev.notes.map(note), { peak: 0.018 * v, attack: ev.attack ?? 0.4, hold: Math.max(0.2, bar - (ev.attack ?? 0.4)), decay: 0.9, cutoff: ev.cutoff ?? 1400, to: ev.to })
    case 'arp': {
      const f = note(ev.note)
      if (style.arp === 'saw') return tone(ctx, out, t, { freq: f, type: 'sawtooth', attack: 0.004, decay: 0.18, peak: 0.05 * v, filter: { freq: 2600, to: 500, time: 0.16, q: 2 } })
      if (style.arp === 'keys') { tone(ctx, out, t, { freq: f * 2, attack: 0.01, decay: 0.35, peak: 0.02 * v }); return tone(ctx, out, t, { freq: f, type: 'triangle', attack: 0.012, decay: 0.55, peak: 0.07 * v, filter: { freq: 1800 } }) }
      if (style.arp === 'marimba') { tone(ctx, out, t, { freq: f * 4, attack: 0.002, decay: 0.05, peak: 0.02 * v }); return tone(ctx, out, t, { freq: f, attack: 0.003, decay: 0.2, peak: 0.1 * v }) }
      return pluck(ctx, out, t, f, { peak: 0.085 * v, decay: 0.22, bright: 2800 })
    }
    case 'tom': return tone(ctx, out, t, { freq: 110 - 8 * (ev.vel || 0), glideTo: 70, glideTime: 0.2, attack: 0.003, decay: 0.35, peak: 0.22 * v })
    case 'bass': return tone(ctx, out, t, { freq: note(ev.note), type: 'triangle', attack: 0.006, hold: 0.08, decay: 0.3, peak: 0.13 * v, filter: { freq: 900 } })
    case 'kick': return kick(ctx, out, t, { peak: 0.26 * v })
    case 'hat': return hat(ctx, out, t, { peak: 0.035 * v, open: !!ev.open })
    case 'clap': return clap(ctx, out, t, { peak: 0.07 * v })
    case 'bell': {
      const f = note(ev.note)
      if (style.lead === 'horn') { for (const d of [-6, 6]) tone(ctx, out, t, { freq: f / 2, type: 'sawtooth', detune: d, attack: 0.05, hold: 0.25, decay: 0.4, peak: 0.03 * v, filter: { freq: 1500, q: 1 } }); return t + 0.7 }
      if (style.lead === 'whistle') return tone(ctx, out, t, { freq: f, attack: 0.03, hold: 0.15, decay: 0.45, peak: 0.05 * v })
      return bell(ctx, out, t, f, { peak: 0.06 * v, decay: 0.8 })
    }
    default: return t
  }
}

/**
 * A score player. start(section), setSection(id), setIntensity(0..1),
 * stop({ fade }). getContext and getOut can be swapped (tests, offline renders).
 */
export function createScore({ getContext = context, getOut = musicOut, style: chosen = STYLES.sunny, bpm = null, lookahead = 0.15, tickMs = 30, timers } = {}) {
  const T = timers || { set: (f, ms) => setTimeout(f, ms), clear: (id) => clearTimeout(id) }
  let style = chosen
  let dt = stepSeconds(bpm || style.bpm)
  let bar = dt * STEPS_PER_BAR
  let c = null
  let bus = null
  let timer = null
  let endTimer = null
  let playing = false
  let section = 'flyin'
  let intensity = 0.35
  let step = 0
  let nextTime = 0
  let scheduled = 0 // events scheduled (for checks)

  function scheduleUntil(until) {
    if (!playing) return
    if (nextTime < c.currentTime - 0.05) { // woke late (a background tab): skip ahead, don't burst
      const skip = Math.ceil((c.currentTime - nextTime) / dt)
      step += skip
      nextTime += skip * dt
    }
    while (nextTime < until) {
      // swing: the off beat eighths land a little late (the lo-fi style)
      const late = style.swing && step % 4 === 2 ? style.swing * dt : 0
      for (const ev of stepEvents(section, step, intensity, style)) { render(c, bus, ev, nextTime + late, { bar, style }); scheduled++ }
      step++
      nextTime += dt
    }
  }

  function tick() {
    if (!playing) return
    try { scheduleUntil(c.currentTime + lookahead) } catch { /* keep the flyover going */ }
    timer = T.set(tick, tickMs)
  }

  function start(sec = 'flyin', { at } = {}) {
    if (playing) { setSection(sec); return true }
    c = getContext()
    const out = c && getOut()
    if (!c || !out) return false
    bus = c.createGain()
    bus.connect(out)
    const t = at ?? c.currentTime + 0.06
    bus.gain.setValueAtTime(0, t)
    bus.gain.linearRampToValueAtTime(1, t + (sec === 'flyin' ? 0.05 : 0.6))
    playing = true
    section = sec
    intensity = sec === 'orbit' ? 1 : 0.35
    step = 0
    nextTime = t
    if (sec === 'flyin') swell(c, bus, t, 3.4, { peak: 0.03, from: 300, to: 4000 })
    if (sec === 'overview') resolve()
    else if (!timers || timers.auto !== false) tick()
    return true
  }

  function lift(t) {
    crash(c, bus, t, { peak: 0.05 })
    kick(c, bus, t, { peak: 0.26 })
    bell(c, bus, t, note(style.lift[0]), { peak: 0.07, decay: 1.2 })
    bell(c, bus, t + dt * 2, note(style.lift[1]), { peak: 0.05, decay: 1.0 })
  }

  function resolve() {
    section = 'end'
    while (step % 4) { step++; nextTime += dt } // land on the next beat
    const t = Math.max(nextTime, c.currentTime + 0.02)
    pad(c, bus, t, style.tonic.map(note), { peak: 0.022, attack: 0.08, hold: 0.6, decay: 2.6, cutoff: 1800, to: 900 })
    tone(c, bus, t, { freq: note(style.tonic[0]) / 2, type: 'triangle', attack: 0.01, hold: 0.2, decay: 2.2, peak: 0.13, filter: { freq: 900 } })
    bell(c, bus, t, note(style.lift[0]), { peak: 0.07, decay: 2 })
    bell(c, bus, t + dt * 3, note(style.lift[1]), { peak: 0.04, decay: 1.8 })
    crash(c, bus, t, { peak: 0.025 })
    bus.gain.setValueAtTime(1, t + 0.3)
    bus.gain.exponentialRampToValueAtTime(SILENT, t + 3.2)
    const b = bus
    endTimer = T.set(() => { if (bus === b) finish() }, Math.max(0, (t + 3.3 - c.currentTime) * 1000))
  }

  function finish() {
    playing = false
    T.clear(timer)
    T.clear(endTimer)
    const b = bus
    bus = null
    T.set(() => { try { b?.disconnect() } catch { /* already gone */ } }, 400)
  }

  function setSection(id) {
    if (!playing) { if (SECTIONS.includes(id)) start(id); return }
    if (id === section) return
    if (id === 'flyin') { stop({ fade: 0.25 }); start('flyin'); return }
    if (id === 'overview') { resolve(); return }
    if (!SECTIONS.includes(id)) return
    if (section === 'end') { stop({ fade: 0.25 }); start(id); return }
    section = id
    if (id === 'orbit') { intensity = 1; lift(nextTime) }
    if (id === 'follow') intensity = 0.35
  }

  function setIntensity(x) { intensity = clamp01(x) }

  /** Change style (the music button): a quick fade, then the same section in the new style. */
  function setStyle(next) {
    if (!next || next === style) return
    style = next
    dt = stepSeconds(bpm || style.bpm)
    bar = dt * STEPS_PER_BAR
    if (playing && section !== 'end') {
      const sec = section
      const i = intensity
      stop({ fade: 0.35 })
      start(sec)
      intensity = i
    }
  }

  function stop({ fade = 0.5 } = {}) {
    if (!playing || !bus) return
    const t = c.currentTime
    const g = bus.gain
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t)
    else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t) }
    g.linearRampToValueAtTime(0, t + Math.max(0.02, fade))
    const b = bus
    playing = false
    T.clear(timer)
    T.clear(endTimer)
    bus = null
    T.set(() => { try { b.disconnect() } catch { /* already gone */ } }, (fade + 0.2) * 1000)
  }

  return {
    start, setSection, setIntensity, setStyle, stop, scheduleUntil,
    get style() { return style },
    get playing() { return playing },
    get section() { return section },
    get intensity() { return intensity },
    get scheduled() { return scheduled },
  }
}
