// Foothold's sound effects, synthesised with the Web Audio API: claiming
// ground, taking it from a rival, levelling up, new bests, quests, crowns,
// moving up a division,
// the recording controls and a few tiny UI sounds. Also owns the one shared
// AudioContext (made on the first tap, since phones need a gesture) and the
// master bus the recap music plays through.
//
// Browsers can't tell when a phone is on silent. On iPhone, Web Audio usually
// follows the ring/silent switch; elsewhere it follows the media volume.
import { reactive, watch } from 'vue'
import { audio } from './settings.js'
import { enqueue } from './queue.js'
import { note, tone, noise, pluck, bell, blip, pad, kick, crash, swell } from './synth.js'

// ---- the effects ----
// Each one: dur (seconds, for queueing) and build(ctx, out, t, opts). Levels
// peak near 0.4 inside the effect, so at the default volume (0.6) they land
// around -12 dBFS.

const N = (n) => note(n)

/** The claim figure grows a little with the ground gained. */
export function claimNotes(hexes = 0) {
  const notes = ['D5', 'F#5', 'A5']
  if (hexes >= 8) notes.push('D6')
  if (hexes >= 30) notes.push('F#6')
  return notes
}

export const EFFECTS = {
  claim: {
    dur: 1.0,
    build(ctx, out, t, { hexes = 0 } = {}) {
      const notes = claimNotes(hexes)
      const lift = Math.min(1, hexes / 40)
      notes.forEach((n, i) => {
        const at = t + i * 0.09
        noise(ctx, out, at, { decay: 0.025, peak: 0.08, filter: { type: 'bandpass', freq: 3200, q: 1.5 } }) // the snap
        pluck(ctx, out, at, N(n), { peak: 0.2 + 0.04 * lift, decay: i === notes.length - 1 ? 0.6 : 0.3, bright: 2600 + 1600 * lift })
      })
      const last = t + (notes.length - 1) * 0.09
      tone(ctx, out, last, { freq: N('D4'), type: 'triangle', attack: 0.02, decay: 0.7, peak: 0.12 })
      return last + 0.75
    },
  },
  take: {
    dur: 0.95,
    build(ctx, out, t) {
      tone(ctx, out, t, { freq: 180, glideTo: 50, glideTime: 0.14, attack: 0.003, decay: 0.28, peak: 0.36 })
      noise(ctx, out, t, { decay: 0.09, peak: 0.12, filter: { type: 'lowpass', freq: 1800 } })
      tone(ctx, out, t, { freq: N('D3'), type: 'sawtooth', attack: 0.004, decay: 0.22, peak: 0.08, filter: { freq: 900, to: 200, time: 0.2 } })
      bell(ctx, out, t + 0.07, N('A5'), { peak: 0.12, decay: 0.7 })
      bell(ctx, out, t + 0.13, N('E6'), { peak: 0.09, decay: 0.7 })
      return t + 0.9
    },
  },
  levelUp: {
    dur: 1.6,
    celebration: true,
    build(ctx, out, t) {
      const brass = (at, n, dur, peak = 0.11) => tone(ctx, out, at, { freq: N(n), type: 'sawtooth', attack: 0.02, hold: dur, decay: 0.35, peak, filter: { freq: 900, to: 2600, time: 0.08 + dur, q: 0.8 } })
      brass(t, 'D5', 0.06)
      brass(t + 0.13, 'F#5', 0.06)
      brass(t + 0.26, 'A5', 0.06)
      const hit = t + 0.42
      for (const n of ['D4', 'A4', 'D5', 'F#5']) brass(hit, n, 0.55, 0.075)
      brass(hit, 'A5', 0.55, 0.09)
      kick(ctx, out, hit, { peak: 0.2 })
      bell(ctx, out, hit, N('D6'), { peak: 0.08, decay: 1.0 })
      return hit + 1.15
    },
  },
  pr: {
    dur: 1.0,
    build(ctx, out, t) {
      ;['A6', 'B6', 'D7', 'F#7', 'A7'].forEach((n, i) => {
        bell(ctx, out, t + i * 0.05, N(n), { peak: 0.18 - i * 0.016, decay: 0.45 + i * 0.06 })
      })
      noise(ctx, out, t, { attack: 0.08, decay: 0.5, peak: 0.04, filter: { type: 'highpass', freq: 9000 } })
      return t + 0.95
    },
  },
  quest: {
    dur: 1.4,
    celebration: true,
    build(ctx, out, t) {
      bell(ctx, out, t, N('A5'), { peak: 0.16, decay: 1.0 })
      bell(ctx, out, t + 0.16, N('D6'), { peak: 0.16, decay: 1.2 })
      tone(ctx, out, t + 0.16, { freq: N('D5'), attack: 0.01, decay: 1.0, peak: 0.08 })
      return t + 1.4
    },
  },
  crown: {
    dur: 1.55,
    celebration: true,
    build(ctx, out, t) {
      pad(ctx, out, t, [N('D4'), N('A4')], { peak: 0.06, attack: 0.08, hold: 0.4, decay: 0.8, cutoff: 1200, to: 2400 })
      tone(ctx, out, t, { freq: N('D3'), type: 'triangle', attack: 0.01, decay: 0.9, peak: 0.16 })
      bell(ctx, out, t + 0.18, N('D6'), { peak: 0.13, decay: 1.1 })
      bell(ctx, out, t + 0.3, N('A6'), { peak: 0.08, decay: 1.0 })
      crash(ctx, out, t + 0.18, { peak: 0.03 })
      return t + 1.5
    },
  },
  promote: {
    dur: 1.5,
    celebration: true,
    build(ctx, out, t) {
      // Moving up a division: a rising step, then a warm chord
      ;['D5', 'E5', 'F#5', 'A5'].forEach((n, i) => pluck(ctx, out, t + i * 0.08, N(n), { peak: 0.16, decay: 0.28, bright: 3000 }))
      const hit = t + 0.34
      pad(ctx, out, hit, [N('D4'), N('F#4'), N('A4')], { peak: 0.06, attack: 0.04, hold: 0.35, decay: 0.7, cutoff: 1400, to: 2600 })
      bell(ctx, out, hit, N('D6'), { peak: 0.14, decay: 1.0 })
      bell(ctx, out, hit + 0.12, N('A6'), { peak: 0.08, decay: 0.9 })
      return hit + 1.1
    },
  },
  start: {
    dur: 0.3,
    build(ctx, out, t) {
      blip(ctx, out, t, N('A5'), { peak: 0.14, decay: 0.07 })
      blip(ctx, out, t + 0.09, N('D6'), { peak: 0.16, decay: 0.16 })
      return t + 0.28
    },
  },
  pause: {
    dur: 0.25,
    build(ctx, out, t) {
      blip(ctx, out, t, N('D6'), { peak: 0.12, decay: 0.06 })
      blip(ctx, out, t + 0.08, N('A5'), { peak: 0.12, decay: 0.1 })
      return t + 0.22
    },
  },
  resume: {
    dur: 0.2,
    build(ctx, out, t) {
      blip(ctx, out, t, N('A5'), { peak: 0.24, decay: 0.14, glideTo: N('D6') })
      return t + 0.18
    },
  },
  finish: {
    dur: 0.8,
    build(ctx, out, t) {
      blip(ctx, out, t, N('A5'), { peak: 0.12, decay: 0.08 })
      pluck(ctx, out, t + 0.1, N('D6'), { peak: 0.16, decay: 0.5 })
      pluck(ctx, out, t + 0.1, N('F#5'), { peak: 0.1, decay: 0.5 })
      tone(ctx, out, t + 0.1, { freq: N('D4'), type: 'triangle', attack: 0.01, decay: 0.55, peak: 0.1 })
      return t + 0.75
    },
  },
  loopReady: {
    dur: 0.5,
    build(ctx, out, t) {
      bell(ctx, out, t, N('E6'), { peak: 0.18, decay: 0.22 })
      bell(ctx, out, t + 0.17, N('E6'), { peak: 0.18, decay: 0.3 })
      return t + 0.5
    },
  },
  // Missions: a surge starting (a quick rising call), a surge done (a bright
  // landing) and a new chapter (a soft two bell turn of the page)
  surge: {
    dur: 0.6,
    build(ctx, out, t) {
      ;['D5', 'A5', 'D6'].forEach((n, i) => blip(ctx, out, t + i * 0.08, N(n), { peak: 0.14 + i * 0.02, decay: i === 2 ? 0.25 : 0.07 }))
      kick(ctx, out, t, { peak: 0.12 })
      noise(ctx, out, t + 0.16, { attack: 0.04, decay: 0.3, peak: 0.03, filter: { type: 'highpass', freq: 6000 } })
      return t + 0.55
    },
  },
  surgeDone: {
    dur: 0.8,
    build(ctx, out, t) {
      pluck(ctx, out, t, N('A5'), { peak: 0.14, decay: 0.3 })
      pluck(ctx, out, t + 0.1, N('F#5'), { peak: 0.12, decay: 0.3 })
      bell(ctx, out, t + 0.2, N('D6'), { peak: 0.14, decay: 0.55 })
      tone(ctx, out, t + 0.2, { freq: N('D4'), type: 'triangle', attack: 0.01, decay: 0.5, peak: 0.1 })
      return t + 0.75
    },
  },
  chapter: {
    dur: 0.7,
    build(ctx, out, t) {
      bell(ctx, out, t, N('F#5'), { peak: 0.12, decay: 0.5 })
      bell(ctx, out, t + 0.2, N('B5'), { peak: 0.12, decay: 0.6 })
      return t + 0.7
    },
  },
  kudos: {
    dur: 0.12,
    build(ctx, out, t) {
      tone(ctx, out, t, { freq: 900, glideTo: 380, glideTime: 0.05, attack: 0.003, decay: 0.07, peak: 0.22 })
      return t + 0.1
    },
  },
  // ---- the logo intro (IntroScreen.vue), one sound per phase ----
  // The run line traces the hex: a footfall at each corner, climbing.
  introTrace: {
    celebration: true, // a longer moment, not queued in a run
    dur: 1.2,
    build(ctx, out, t) {
      introCorners().forEach((at, i) => {
        noise(ctx, out, t + at, { decay: 0.02, peak: 0.05, filter: { type: 'bandpass', freq: 2200 + i * 300, q: 1.4 } })
        pluck(ctx, out, t + at, N(['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5'][i]), { peak: 0.08 + i * 0.012, decay: 0.22, bright: 2200 + i * 300 })
      })
      swell(ctx, out, t, 1.1, { peak: 0.035, from: 500, to: 4000 })
      return t + 1.2
    },
  },
  // The loop closes and the hex fills: a soft thud, a warm chord, a shimmer
  introFill: {
    celebration: true, // a longer moment, not queued in a run
    dur: 1.3,
    build(ctx, out, t) {
      kick(ctx, out, t, { peak: 0.22 })
      pad(ctx, out, t, [N('D3'), N('A3'), N('D4'), N('F#4')], { peak: 0.045, attack: 0.03, hold: 0.5, decay: 0.8, cutoff: 1100, to: 2800 })
      bell(ctx, out, t + 0.02, N('D6'), { peak: 0.11, decay: 1.0 })
      noise(ctx, out, t, { attack: 0.01, decay: 0.6, peak: 0.03, filter: { type: 'highpass', freq: 7000, to: 4000, time: 0.6 } })
      return t + 1.3
    },
  },
  // The F draws in like a second, quicker run
  introLetter: {
    dur: 0.4,
    build(ctx, out, t) {
      pluck(ctx, out, t, N('A5'), { peak: 0.1, decay: 0.16, bright: 3200 })
      pluck(ctx, out, t + 0.13, N('D6'), { peak: 0.11, decay: 0.3, bright: 3600 })
      return t + 0.4
    },
  },
  // The wordmark slides out, and the tagline lands with a final chime
  introWord: {
    celebration: true, // a longer moment, not queued in a run
    dur: 1.2,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.18, decay: 0.3, peak: 0.035, filter: { type: 'bandpass', freq: 900, to: 3500, time: 0.45, q: 0.9 } })
      bell(ctx, out, t + 0.5, N('A5'), { peak: 0.09, decay: 0.9 })
      bell(ctx, out, t + 0.5, N('D6'), { peak: 0.07, decay: 1.0 })
      return t + 1.2
    },
  },

  // ---- small sounds around the app ----
  // Run, Walk or Ride: a soft two step, pitched for each mode
  mode: {
    dur: 0.16,
    build(ctx, out, t, { mode = 'run' } = {}) {
      const top = { run: 'D6', walk: 'A5', ride: 'F#6' }[mode] || 'D6'
      blip(ctx, out, t, N('D5'), { peak: 0.07, decay: 0.05 })
      blip(ctx, out, t + 0.06, N(top), { peak: 0.08, decay: 0.08 })
      return t + 0.16
    },
  },
  // A card folding away (down) or opening up (up): a short soft swish
  fold: {
    dur: 0.22,
    build(ctx, out, t, { open = false } = {}) {
      const [a, b] = open ? [700, 2600] : [2600, 700]
      noise(ctx, out, t, { attack: 0.03, decay: 0.16, peak: 0.05, filter: { type: 'bandpass', freq: a, to: b, time: 0.18, q: 1.1 } })
      blip(ctx, out, t + 0.04, N(open ? 'A5' : 'D5'), { peak: 0.04, decay: 0.07 })
      return t + 0.22
    },
  },
  // Opening the mission browser: a cinematic whoosh into a low hit
  reveal: {
    dur: 1.0,
    build(ctx, out, t) {
      swell(ctx, out, t, 0.38, { peak: 0.06, from: 300, to: 3500 })
      const hit = t + 0.38
      kick(ctx, out, hit, { peak: 0.2 })
      tone(ctx, out, hit, { freq: N('D2'), type: 'sawtooth', attack: 0.01, decay: 0.6, peak: 0.06, filter: { freq: 600, to: 150, time: 0.5 } })
      bell(ctx, out, hit, N('A5'), { peak: 0.06, decay: 0.6 })
      return hit + 0.6
    },
  },
  // Looking at a mission poster
  select: {
    dur: 0.12,
    build(ctx, out, t) {
      tone(ctx, out, t, { freq: N('E6'), glideTo: N('A6'), glideTime: 0.05, attack: 0.003, decay: 0.08, peak: 0.07 })
      return t + 0.12
    },
  },
  // Locking in a mission for the next run
  lockIn: {
    dur: 0.9,
    build(ctx, out, t) {
      noise(ctx, out, t, { decay: 0.03, peak: 0.08, filter: { type: 'bandpass', freq: 1800, q: 2 } }) // the click
      tone(ctx, out, t, { freq: N('D3'), type: 'triangle', attack: 0.005, decay: 0.4, peak: 0.14 })
      pluck(ctx, out, t + 0.06, N('A5'), { peak: 0.12, decay: 0.3 })
      bell(ctx, out, t + 0.14, N('D6'), { peak: 0.12, decay: 0.7 })
      return t + 0.85
    },
  },
  // A suggested loop lands on the map: a sonar ping
  found: {
    dur: 0.9,
    build(ctx, out, t) {
      bell(ctx, out, t, N('A5'), { peak: 0.1, decay: 0.8 })
      tone(ctx, out, t + 0.22, { freq: N('A5'), attack: 0.01, decay: 0.6, peak: 0.035 }) // the echo
      return t + 0.9
    },
  },
  tap: {
    dur: 0.04,
    build(ctx, out, t) {
      noise(ctx, out, t, { attack: 0.001, decay: 0.012, peak: 0.03, filter: { type: 'bandpass', freq: 2400, q: 1 } })
      return t + 0.03
    },
  },
}

/**
 * When the intro's run line sets off and reaches each corner of the hex
 * (seconds from the start of the trace). The sixth corner closes the loop,
 * where introFill takes over. Matches IntroScreen's trace: 1.15 seconds,
 * eased 1 - (1 - k)^2.2.
 */
export function introCorners(duration = 1.15) {
  return Array.from({ length: 6 }, (_, i) => +(duration * (1 - Math.pow(1 - i / 6, 1 / 2.2))).toFixed(3))
}

/** Start times for a run of effects played one after another. */
export function planSequence(items, gap = 0.18) {
  let at = 0
  return items.filter((it) => EFFECTS[it.name]).map((it) => {
    const step = { ...it, at }
    at += EFFECTS[it.name].dur + gap
    return step
  })
}

/** The sounds for a fresh activity result, in the order they play. */
export function resultSounds(r, levelUp = false) {
  const a = r?.activity
  if (!a || a.rejected || !r.diff) return []
  const out = []
  if (a.loops) out.push({ name: 'claim', hexes: r.diff.claimed.length + r.diff.taken.length })
  if (r.diff.taken.length) out.push({ name: 'take' })
  // a crown taken: from someone else, or the first to run it
  if ((r.strongholds || []).some((s) => s.holds && (s.tookFrom || s.efforts <= 1))) out.push({ name: 'crown' })
  if (r.prs?.length) out.push({ name: 'pr' })
  if (levelUp) out.push({ name: 'levelUp' })
  return out
}

const seen = new Set()
/** True the first time a key is seen this session (so Back doesn't replay a fanfare). */
export function firstTime(key) {
  if (seen.has(key)) return false
  seen.add(key)
  return true
}

/** Schedule one effect on any context and output (also used for offline renders). */
export function scheduleEffect(ctx, out, name, t, opts) {
  const fx = EFFECTS[name]
  if (!fx) throw new Error('No sound called ' + name)
  return fx.build(ctx, out, t, opts || {})
}

// ---- the shared context and buses ----

export const sound = reactive({ state: 'none' }) // 'none' until made, then the context's state
let ctx = null
let limiter = null
let sfxBus = null
let musicBus = null
let wasRunning = false // once sound has played, an interruption is woken back up
let speaker = null // the last stop before the speaker: the top bar's mute button turns it to zero

const Ctor = () => (typeof window === 'undefined' ? null : window.AudioContext || window.webkitAudioContext || null)

/** The shared AudioContext, made on first use. Null if the browser has none. */
export function context() {
  if (ctx) return ctx
  const C = Ctor()
  if (!C) return null
  try {
    ctx = new C({ latencyHint: 'interactive' })
  } catch {
    return null
  }
  limiter = ctx.createDynamicsCompressor() // a safety net so stacked sounds never clip
  limiter.threshold.value = -6
  limiter.knee.value = 4
  limiter.ratio.value = 12
  limiter.attack.value = 0.003
  limiter.release.value = 0.15
  speaker = ctx.createGain()
  speaker.gain.value = audio.muted ? 0 : 1
  speaker.connect(ctx.destination)
  limiter.connect(speaker)
  sfxBus = ctx.createGain()
  sfxBus.gain.value = audio.sfxVolume
  sfxBus.connect(limiter)
  musicBus = ctx.createGain()
  musicBus.gain.value = 0.9
  musicBus.connect(limiter)
  sound.state = ctx.state
  ctx.onstatechange = () => {
    sound.state = ctx.state
    // iPhone app: switching the app's sound mode (ducking Spotify under a line,
    // or a phone call) interrupts Web Audio. Wake it straight back up once it
    // has been running, so effects and mission sound don't go quiet for good.
    if (ctx.state !== 'running' && ctx.state !== 'closed' && wasRunning) setTimeout(() => ctx?.resume?.().catch(() => {}), 150)
    if (ctx.state === 'running') wasRunning = true
  }
  return ctx
}

/**
 * Start the shared context again from scratch. The iPhone app calls this
 * after setting its own sound mode for a run: a context made before that
 * can say it's running yet play nothing. The next sound makes a new one.
 */
export function rebuildContext() {
  if (!ctx) return
  try { ctx.onstatechange = null; ctx.close() } catch { /* already gone */ }
  ctx = null
  limiter = sfxBus = musicBus = speaker = null
  wasRunning = false
  sound.state = 'none'
}

/** Straight to the speaker (past the limiter), still under the mute button. Voice clips use it. */
export function speakerOut() {
  return context() ? speaker : null
}

watch(() => audio.muted, (m) => {
  if (speaker && ctx) speaker.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.03)
})

/** Where the recap music plays into. */
export function musicOut() {
  return context() ? musicBus : null
}

/** Wake the context. Call from a tap. Never throws; resolves true if sound can play. */
export async function resume() {
  const c = context()
  if (!c) return false
  if (c.state === 'running') return true
  try {
    await Promise.race([c.resume(), new Promise((r) => setTimeout(r, 400))])
  } catch { /* blocked until a tap */ }
  return c.state === 'running'
}

watch(() => audio.sfxVolume, (v) => {
  if (sfxBus && ctx) sfxBus.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime, 0.05)
})

const wait = (s) => new Promise((r) => setTimeout(r, Math.max(0, s * 1000)))

/**
 * Play an effect now. Resolves when it has finished, so it can sit in a
 * queue. Quietly does nothing if sounds are off or the phone hasn't allowed
 * sound yet (old sounds never pile up and play late).
 */
export async function play(name, opts = {}) {
  if (!EFFECTS[name] || !audio.sfx) return false
  if (name === 'tap' && !audio.tapSound) return false
  if (!(await resume())) return false
  try {
    const out = opts.quiet ? quietBus() : sfxBus
    scheduleEffect(ctx, out, name, ctx.currentTime + 0.01, opts)
  } catch { return false }
  if (opts.wait !== false) await wait(EFFECTS[name].dur)
  return true
}

let quiet = null
function quietBus() {
  if (!quiet) {
    quiet = ctx.createGain()
    quiet.gain.value = 0.65
    quiet.connect(sfxBus)
  }
  return quiet
}

/** Play effects one after another, after any voice line in the queue. */
export function playSequence(items, { gap = 0.18, delay = 0 } = {}) {
  const steps = planSequence(items, gap)
  if (!steps.length || !audio.sfx) return Promise.resolve()
  return enqueue(async () => {
    if (delay) await wait(delay)
    for (let i = 0; i < steps.length; i++) {
      await play(steps[i].name, steps[i])
      if (i < steps.length - 1) await wait(gap)
    }
  })
}

/** Queue an effect behind the voice coach (during a run). */
export function cue(name, opts = {}) {
  if (!audio.sfx) return Promise.resolve()
  return enqueue(() => play(name, { quiet: true, ...opts }))
}

// Any tap wakes the sound (so screens reached by a tap can play), and plays
// the optional soft tick on buttons.
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => {
    if (!audio.sfx && !audio.recapMusic) return
    resume()
    if (audio.tapSound && e.target?.closest?.('button, a, [role="button"]')) play('tap', { wait: false })
  }, { capture: true, passive: true })
}
