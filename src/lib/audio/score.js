// The run recap's music: a generative score that follows the flyover's shots.
// About 100 BPM in D major (bright, open, summery), from a soft pad, a plucked
// arpeggio, a light bass, synth kick, hats and claps, and a bell tune.
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

const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0))

/**
 * What plays on one sixteenth step of a section, as plain descriptions:
 * { voice: 'pad' | 'arp' | 'bass' | 'kick' | 'hat' | 'clap' | 'bell', notes | note, vel, ... }.
 */
export function stepEvents(section, step, intensity = 0.5) {
  const i = clamp01(intensity)
  const s = ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS
  const bar = Math.floor(s / STEPS_PER_BAR)
  const q = s % STEPS_PER_BAR
  const chord = PROGRESSION[bar]
  const ev = []
  if (!SECTIONS.includes(section) || section === 'overview') return ev
  if (section === 'flyin') {
    if (q === 0) ev.push({ voice: 'pad', notes: chord.pad, vel: 0.9, attack: 2.4, cutoff: 700, to: 2200 })
    if (q % 8 === 4) ev.push({ voice: 'bell', note: chord.arp[3], vel: 0.25 })
    return ev
  }
  if (section === 'follow') {
    if (q === 0) ev.push({ voice: 'pad', notes: chord.pad, vel: 0.6 + 0.2 * i, attack: 0.35, cutoff: 1000 + 800 * i })
    if (i >= 0.5 || q % 2 === 0) ev.push({ voice: 'arp', note: chord.arp[ARP_ORDER[q]], vel: (q % 4 === 0 ? 0.65 : 0.5) + 0.3 * i })
    if (q % 8 === 0 || (i > 0.65 && q % 4 === 0)) ev.push({ voice: 'kick', vel: q % 8 === 0 ? 0.8 : 0.6 })
    if (i > 0.2 && q % 4 === 2) ev.push({ voice: 'hat', vel: 0.5 + 0.4 * i })
    if (i > 0.75 && q % 2 === 1) ev.push({ voice: 'hat', vel: 0.3 })
    if (i > 0.35 && (q === 0 || q === 8)) ev.push({ voice: 'bass', note: chord.bass, vel: 0.8 })
    if (i > 0.6 && (q === 6 || q === 14)) ev.push({ voice: 'bass', note: chord.bass, vel: 0.55 })
    return ev
  }
  // orbit: the full band
  if (q === 0) ev.push({ voice: 'pad', notes: chord.pad, vel: 1, attack: 0.25, cutoff: 2200 })
  ev.push({ voice: 'arp', note: chord.arp[ARP_ORDER[q]], vel: q % 4 === 0 ? 0.95 : 0.75 })
  if (q % 4 === 0) ev.push({ voice: 'kick', vel: 0.85 })
  if (q === 4 || q === 12) ev.push({ voice: 'clap', vel: 0.8 })
  if (q % 4 === 2) ev.push({ voice: 'hat', vel: 0.7, open: true })
  else if (q % 2 === 1) ev.push({ voice: 'hat', vel: 0.35 })
  if (q === 0 || q === 6 || q === 8 || q === 14) ev.push({ voice: 'bass', note: chord.bass, vel: q % 8 === 0 ? 0.9 : 0.6 })
  const m = q % 4 === 0 ? MELODY[bar * 4 + q / 4] : null
  if (m) ev.push({ voice: 'bell', note: m, vel: 0.8 })
  return ev
}

/** Turn one event into sound at time t. */
export function render(ctx, out, ev, t, { bar = stepSeconds() * STEPS_PER_BAR } = {}) {
  const v = ev.vel ?? 1
  switch (ev.voice) {
    case 'pad': return pad(ctx, out, t, ev.notes.map(note), { peak: 0.018 * v, attack: ev.attack ?? 0.4, hold: Math.max(0.2, bar - (ev.attack ?? 0.4)), decay: 0.9, cutoff: ev.cutoff ?? 1400, to: ev.to })
    case 'arp': return pluck(ctx, out, t, note(ev.note), { peak: 0.085 * v, decay: 0.22, bright: 2800 })
    case 'bass': return tone(ctx, out, t, { freq: note(ev.note), type: 'triangle', attack: 0.006, hold: 0.08, decay: 0.3, peak: 0.13 * v, filter: { freq: 900 } })
    case 'kick': return kick(ctx, out, t, { peak: 0.26 * v })
    case 'hat': return hat(ctx, out, t, { peak: 0.035 * v, open: !!ev.open })
    case 'clap': return clap(ctx, out, t, { peak: 0.07 * v })
    case 'bell': return bell(ctx, out, t, note(ev.note), { peak: 0.06 * v, decay: 0.8 })
    default: return t
  }
}

/**
 * A score player. start(section), setSection(id), setIntensity(0..1),
 * stop({ fade }). getContext and getOut can be swapped (tests, offline renders).
 */
export function createScore({ getContext = context, getOut = musicOut, bpm = BPM, lookahead = 0.15, tickMs = 30, timers } = {}) {
  const T = timers || { set: (f, ms) => setTimeout(f, ms), clear: (id) => clearTimeout(id) }
  const dt = stepSeconds(bpm)
  const bar = dt * STEPS_PER_BAR
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
      for (const ev of stepEvents(section, step, intensity)) { render(c, bus, ev, nextTime, { bar }); scheduled++ }
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
    bell(c, bus, t, note('D6'), { peak: 0.07, decay: 1.2 })
    bell(c, bus, t + dt * 2, note('A6'), { peak: 0.05, decay: 1.0 })
  }

  function resolve() {
    section = 'end'
    while (step % 4) { step++; nextTime += dt } // land on the next beat
    const t = Math.max(nextTime, c.currentTime + 0.02)
    pad(c, bus, t, TONIC.map(note), { peak: 0.022, attack: 0.08, hold: 0.6, decay: 2.6, cutoff: 1800, to: 900 })
    tone(c, bus, t, { freq: note('D3'), type: 'triangle', attack: 0.01, hold: 0.2, decay: 2.2, peak: 0.13, filter: { freq: 900 } })
    bell(c, bus, t, note('D6'), { peak: 0.07, decay: 2 })
    bell(c, bus, t + dt * 3, note('A6'), { peak: 0.04, decay: 1.8 })
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
    start, setSection, setIntensity, stop, scheduleUntil,
    get playing() { return playing },
    get section() { return section },
    get intensity() { return intensity },
    get scheduled() { return scheduled },
  }
}
