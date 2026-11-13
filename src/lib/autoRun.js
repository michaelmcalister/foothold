// The admin auto run: hear a whole story at your desk. A pretend runner
// moves through the run in fast-forward (a few seconds of run time for each
// fifth of a real second), stops while anything is being said so no line is
// skipped, and waits at each question for a tap (or picks the first answer
// after a few seconds). A Story Maker story is followed along the route to
// each stop; a series episode goes round a loop. Nothing is saved.
import { reactive } from 'vue'
import { rec, simStep } from './recorder.js'
import { busy } from './audio/queue.js'
import { missionLive } from './audio/runAudio.js'
import { answerMission } from './audio/runAudio.js'
import { distance } from './engine/geo.js'

export const auto = reactive({ on: false, note: '' })

const TICK_MS = 200
const STEP_S = 4 // run time per tick when nothing is being said
const SPEED = { run: 3.3, walk: 1.5, ride: 6.5 } // metres a second
const ASK_TAP_MS = 6000 // time to tap an answer before the first one is picked
const MAX_M = 25000

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

/**
 * Start moving. start: { lat, lng }. leg(): the Story Maker leg's line, or
 * null for an episode's loop. onDone(): called once the story ends and the
 * last word is said (or after MAX_M).
 */
export function startAuto({ start, mode = 'run', leg = () => null, onDone }) {
  stopAuto()
  auto.on = true
  auto.note = 'Auto run: skipping the quiet bits'
  const speed = SPEED[mode] || SPEED.run
  let t = 0
  let loopD = 0
  let line = null
  let lineD = 0
  let askSince = 0
  let endingSince = 0
  simStep(start, 0)
  timer = setInterval(() => {
    if (rec.status !== 'recording') return
    const view = missionLive.value
    // the end: wait for the last words, then finish
    if (!view || view.done || rec.distanceM > MAX_M) {
      if (busy()) return
      endingSince ||= Date.now()
      if (Date.now() - endingSince < 1500) return
      stopAuto()
      onDone?.()
      return
    }
    if (busy()) return // a line is being said: hear it all
    // a question: tap an answer, or the first one is picked
    if (view.ask) {
      askSince ||= Date.now()
      auto.note = 'Tap an answer, or the first one is picked'
      if (Date.now() - askSince > ASK_TAP_MS) answerMission(view.ask.options[0].key)
      return
    }
    askSince = 0
    auto.note = 'Auto run: skipping the quiet bits'
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
  auto.on = false
  auto.note = ''
}
