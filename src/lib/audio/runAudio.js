// Music and voice during a recording: starts Spotify on the Start tap,
// says "Let's go" once GPS locks, then speaks the announcer's lines as the
// run goes, lowering or pausing the music around each one. Lines and the
// small control sounds share one queue so they never overlap. With a story
// mission on, the mission's lines go first in the queue and the coach's
// regular updates shrink to the headline while the mission is talking.
import { watch, ref } from 'vue'
import { rec } from '../recorder.js'
import { audio } from './settings.js'
import { createAnnouncer } from './announcer.js'
import { speak, unlock, hush } from './voice.js'
import { enqueue, clear } from './queue.js'
import * as sfx from './sfx.js'
import * as spotify from './spotify.js'
import { api } from '../api/index.js'
import { nextSession, toISO, trainingPaces, DEFAULT_5K_S } from '../coach/index.js'
import { createMission, missionById, recordTry } from '../missions/index.js'

let stopWatch = null
let announcer = null
let lastStatus = 'idle'
let loopWasReady = false
let mission = null
let missionSpokeAt = -Infinity

/** What the Record screen's mission strip shows (null with no mission). */
export const missionLive = ref(null)

const MISSION_SFX = { 'surge-start': 'surge', 'surge-end': 'surgeDone', chapter: 'chapter', finale: 'quest' }
// The regular update's first sentence ("2 kilometres."), for when the mission has the floor
const headline = (line) => (line.match(/^[^.]*\./) || [line])[0]

/** Have the voice coach say a line (if the voice is on), ducking the music like any update. */
export function coachSays(text) { say(text) }

function say(text) {
  if (!text || !audio.voice) return
  enqueue(() => spotify.aroundSpeech(() => speak(text, { coachVoice: audio.coachVoice, voiceName: audio.voiceName }), { how: audio.music, duckTo: audio.duckTo }))
}

// Today's planned session, so the coach can say if an easy run is too quick
async function todaysTarget() {
  try {
    const { plan } = await api.plan()
    const s = plan ? nextSession(plan, toISO(Date.now())) : null
    const paces = plan?.fitness?.paces || trainingPaces(DEFAULT_5K_S)
    return { paces, target: s && s.date === toISO(Date.now()) ? { type: s.type, paceRange: s.paceRange } : null }
  } catch { return { paces: trainingPaces(DEFAULT_5K_S), target: null } }
}

/** Call from the Start button tap (phones only allow sound after a tap). */
export async function beginRun(mode, { onError = () => {}, missionId = null } = {}) {
  endRun()
  unlock()
  sfx.resume() // the same tap wakes the sound effects
  sfx.cue('start')
  if (audio.spotifyAutoplay && spotify.isLinked()) {
    spotify.startMusic({ context: audio.spotifyContext, shuffle: audio.shuffle }).catch((e) => onError(e.message))
  }
  const { paces, target } = await todaysTarget()
  const script = missionId ? missionById(missionId) : null
  mission = script ? createMission(script, { paces }) : null
  missionSpokeAt = -Infinity
  missionLive.value = mission ? mission.view() : null
  // the mission is the encouragement, so the coach's cheers step aside
  announcer = createAnnouncer(mission ? { ...audio, cheer: 'off' } : audio, { mode, target })
  lastStatus = rec.status
  loopWasReady = false
  stopWatch = watch(
    () => [rec.status, rec.elapsedS, rec.distanceM],
    ([status]) => {
      if (!announcer) return
      if (status !== lastStatus) {
        if (status === 'recording' && lastStatus === 'acquiring') say(announcer.start())
        else if (status === 'paused') { mission?.pause({ elapsedS: rec.elapsedS, distanceM: rec.distanceM }); sfx.cue('pause'); say(announcer.pause()) }
        else if (status === 'recording' && lastStatus === 'paused') { mission?.resume(); sfx.cue('resume'); say(announcer.resume()) }
        lastStatus = status
      }
      if (status === 'recording') {
        // A gentle double ping the moment the loop can close (same rule as the Record screen's hint)
        const ready = rec.distanceM > 400 && rec.toStartM != null && rec.toStartM <= 30
        if (ready && !loopWasReady) sfx.cue('loopReady')
        if (ready) loopWasReady = true
        else if (rec.toStartM == null || rec.toStartM > 60) loopWasReady = false // only ping again after heading away
        const live = { elapsedS: rec.elapsedS, distanceM: rec.distanceM, paceSPerKm: rec.paceSPerKm, toStartM: rec.toStartM }
        let loopSaid = false
        if (mission) {
          const out = mission.update(live)
          for (const e of out.events) {
            if (e.type === 'loop') loopSaid = true
            if (MISSION_SFX[e.type]) sfx.cue(MISSION_SFX[e.type])
          }
          for (const line of out.lines) say(line)
          if (out.lines.length) missionSpokeAt = rec.elapsedS
        }
        const busy = mission && (mission.view().kind === 'surge' || rec.elapsedS - missionSpokeAt < 20)
        for (const line of announcer.update(live)) {
          if (loopSaid && /^(About|Your loop)/.test(line)) continue // the mission just said it
          say(busy ? headline(line) : line)
        }
      }
      if (mission) missionLive.value = mission.view()
    },
  )
}

/**
 * Say the wrap-up line and stop listening. Music keeps playing for the
 * cool-down. Returns the mission's summary, if a mission was on.
 */
export function finishRun({ elapsedS, distanceM }) {
  if (announcer) sfx.cue('finish')
  let summary = null
  if (mission) {
    const out = mission.finish()
    summary = out.summary
    for (const line of out.lines) say(line)
    if (summary.clockS >= 60) recordTry(summary) // any real try unlocks the next mission
  }
  if (announcer && distanceM > 50) say(announcer.finish({ elapsedS, distanceM }))
  stopListening()
  return summary
}

function stopListening() {
  stopWatch?.()
  stopWatch = null
  announcer = null
  mission = null
  missionLive.value = null
}

/** Leaving or discarding: stop talking straight away. */
export function endRun() {
  stopListening()
  hush()
  clear()
}
