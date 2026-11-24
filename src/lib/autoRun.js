// The admin play through: hear a whole story at your desk. A pretend runner
// moves through the run in fast-forward (a few seconds of run time for each
// fifth of a real second), stops while anything is being said so no line is
// skipped, and waits at each question for a spoken or tapped answer (or picks
// the first after a few seconds). The microphone stays on so answering out
// loud is tested too, and a live log (audio/testLog.js) shows each line,
// effect and what the microphone heard. A Story Maker story is followed along the route to
// each stop; a series episode goes round a loop. Nothing is saved.
import { reactive } from 'vue'
import { rec, simStep } from './recorder.js'
import { busy, jobAge } from './audio/queue.js'
import { missionLive, missionOffer, answerMission, answerOffer } from './audio/runAudio.js'
import { stopListening, canListen } from './audio/listen.js'
import { testLog, logTest } from './audio/testLog.js'
import { audio } from './audio/settings.js'
import { distance } from './engine/geo.js'
import { report } from './monitoring.js'

export const auto = reactive({ on: false, note: '' })

const TICK_MS = 200
const STEP_S = 4 // run time per tick when nothing is being said
const SPEED = { run: 3.3, walk: 1.5, ride: 6.5 } // metres a second
const ASK_TAP_MS = 6000 // time to tap an answer before the first one is picked
const MAX_M = 25000
const START_MS = 20000 // how long the story has to get going
const STUCK_MS = 45000 // a sound this long is probably stuck

/** The point d metres along a line of [lng, lat] pairs (the last point past the end). Pure. */
export function along(line, d) {
  let left = d
  for (let i = 1; i < line.length; i++) {
    const a = { lat: line[i - 1][1], lng: line[i - 1][0] }
    const b = { lat: line[i][1], lng: line[i][0] }
    const seg = distance(a, b)
    if (left <= seg && seg > 0) {
      const f = left / seg
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, end: false }
    }
    left -= seg
  }
  const z = line[line.length - 1]
  return { lat: z[1], lng: z[0], end: true }
}

/** A point on a loop of radius r that starts (and ends) at start. Pure. */
export function onLoop(start, d, r = 450) {
  const a = d / r
  const kLat = 111320
  const kLng = 111320 * Math.cos((start.lat * Math.PI) / 180)
  // the loop's centre sits r metres south of the start
  return { lat: start.lat - r / kLat + (Math.cos(a) * r) / kLat, lng: start.lng + (Math.sin(a) * r) / kLng }
}

let timer = 0
let voiceWas = null

// The iPhone app pauses when the phone locks or another app opens: say so in the log
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (!auto.on) return
  logTest(document.visibilityState === 'hidden' ? 'Problem' : 'Start', document.visibilityState === 'hidden' ? 'Foothold went into the background. The play through waits' : 'Back in Foothold. Carrying on')
})

/**
 * Start moving. start: { lat, lng }. begin(): starts the pretend run and its
 * story (called here, once the log and microphone are set up; may return a
 * promise). leg(): the Story Maker leg's line, or null for an episode's loop.
 * onDone(): called once the story ends and the last word is said (or after
 * MAX_M, or if the story never starts).
 */
export function startAuto({ start, mode = 'run', begin = () => {}, leg = () => null, onDone }) {
  stopAuto()
  // the microphone stays on (when the phone can listen), so answering out loud gets tested too
  voiceWas = audio.answerByVoice
  audio.answerByVoice = canListen()
  testLog.items.splice(0)
  testLog.on = true
  auto.on = true
  auto.note = 'Starting the story'
  logTest('Start', `Play it through, microphone ${audio.answerByVoice ? 'on' : 'off on this phone'}`)
  // the story starts in the background: the ticks below wait for it, so a
  // slow phone (or a sound mode that takes a while) never stops it starting
  const t0 = Date.now()
  let started = false
  let stuckSaid = false
  try {
    Promise.resolve(begin()).catch((e) => logTest('Problem', `Starting: ${e?.message || e}`))
  } catch (e) { logTest('Problem', `Starting: ${e?.message || e}`) }
  const speed = SPEED[mode] || SPEED.run
  let t = 0
  let loopD = 0
  let line = null
  let lineD = 0
  let askSince = 0
  let endingSince = 0
  simStep(start, 0)
  timer = setInterval(() => {
    const view = missionLive.value
    if (!started) {
      if (view && rec.status === 'recording') { started = true; logTest('Start', 'Story running'); auto.note = 'Playing it through: skipping the quiet bits' }
      else if (Date.now() - t0 > START_MS) {
        logTest('Problem', rec.status !== 'recording' ? 'The pretend run never started' : 'The story never started')
        auto.note = 'The story didn’t start. See the log'
        // tell us what the phone got to (step names and sound names only, never places)
        const SAFE = new Set(['Start', 'Problem', 'Scene', 'Music', 'Passing', 'Effect', 'App', 'Radio']) // never spoken lines or what the mic heard
        report(new Error(`Play it through did not start: ${testLog.items.filter((it) => SAFE.has(it.kind)).map((it) => `${it.kind}: ${it.text}`).reverse().join(' | ')}`), 'play-through')
        clearInterval(timer)
        return
      }
      return
    }
    if (rec.status !== 'recording') return
    // the end: wait for the last words, then finish
    if (!view || view.done || rec.distanceM > MAX_M) {
      // "play the next episode?" gets a quiet no: one story at a time
      if (missionOffer.value) { stopListening(); answerOffer('B', { quiet: true }) }
      if (busy()) return
      endingSince ||= Date.now()
      if (Date.now() - endingSince < 1500) return
      stopAuto()
      onDone?.()
      return
    }
    if (busy()) { // a line is being said (or the mic is open): hear it all
      if (!stuckSaid && jobAge() > STUCK_MS) { stuckSaid = true; logTest('Problem', 'One sound has gone for 45 seconds. It may be stuck') }
      if (view.ask && audio.answerByVoice) auto.note = 'Listening: say your answer, or tap it'
      return
    }
    stuckSaid = false
    // a question: tap an answer, or the first one is picked
    if (view.ask) {
      askSince ||= Date.now()
      auto.note = audio.answerByVoice ? 'Say or tap an answer. The first one is picked after a few seconds' : 'Tap an answer, or the first one is picked'
      if (Date.now() - askSince > ASK_TAP_MS) answerMission(view.ask.options[0].key)
      return
    }
    askSince = 0
    auto.note = 'Playing it through: skipping the quiet bits'
    t += STEP_S
    const step = speed * STEP_S * (view.kind === 'surge' ? 1.3 : 1)
    const now = leg()
    let p
    if (now) {
      if (now !== line) { line = now; lineD = 0 } // a new leg starts where you are
      lineD += step
      p = along(line, lineD)
      if (p.end) t += STEP_S // waiting at a stop for the next chapter
    } else {
      loopD += step
      p = onLoop(start, loopD)
    }
    simStep(p, t)
  }, TICK_MS)
}

export function stopAuto() {
  clearInterval(timer)
  if (voiceWas !== null) { audio.answerByVoice = voiceWas; voiceWas = null }
  testLog.on = false
  auto.on = false
  auto.note = ''
}
