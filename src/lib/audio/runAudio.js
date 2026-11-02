// Music and voice during a recording: starts Spotify on the Start tap,
// says "Let's go" once GPS locks, then speaks the announcer's lines as the
// run goes, lowering or pausing the music around each one. Lines queue so
// they never overlap.
import { watch } from 'vue'
import { rec } from '../recorder.js'
import { audio } from './settings.js'
import { createAnnouncer } from './announcer.js'
import { speak, unlock, hush } from './voice.js'
import * as spotify from './spotify.js'
import { api } from '../api/index.js'
import { nextSession, toISO } from '../coach/index.js'

let stopWatch = null
let announcer = null
let queue = Promise.resolve()
let lastStatus = 'idle'

function say(text) {
  if (!text || !audio.voice) return
  queue = queue.then(() => spotify.aroundSpeech(() => speak(text, { coachVoice: audio.coachVoice, voiceName: audio.voiceName }), { how: audio.music, duckTo: audio.duckTo })).catch(() => {})
}

// Today's planned session, so the coach can say if an easy run is too quick
async function todaysTarget() {
  try {
    const { plan } = await api.plan()
    const s = plan ? nextSession(plan, toISO(Date.now())) : null
    return s && s.date === toISO(Date.now()) ? { type: s.type, paceRange: s.paceRange } : null
  } catch { return null }
}

/** Call from the Start button tap (phones only allow sound after a tap). */
export async function beginRun(mode, { onError = () => {} } = {}) {
  endRun()
  unlock()
  if (audio.spotifyAutoplay && spotify.isLinked()) {
    spotify.startMusic({ context: audio.spotifyContext, shuffle: audio.shuffle }).catch((e) => onError(e.message))
  }
  announcer = createAnnouncer(audio, { mode, target: await todaysTarget() })
  lastStatus = rec.status
  stopWatch = watch(
    () => [rec.status, rec.elapsedS, rec.distanceM],
    ([status]) => {
      if (!announcer) return
      if (status !== lastStatus) {
        if (status === 'recording' && lastStatus === 'acquiring') say(announcer.start())
        else if (status === 'paused') say(announcer.pause())
        else if (status === 'recording' && lastStatus === 'paused') say(announcer.resume())
        lastStatus = status
      }
      if (status === 'recording') {
        for (const line of announcer.update({ elapsedS: rec.elapsedS, distanceM: rec.distanceM, paceSPerKm: rec.paceSPerKm, toStartM: rec.toStartM })) say(line)
      }
    },
  )
}

/** Say the wrap-up line and stop listening. Music keeps playing for the cool-down. */
export function finishRun({ elapsedS, distanceM }) {
  if (announcer && distanceM > 50) say(announcer.finish({ elapsedS, distanceM }))
  stopListening()
}

function stopListening() {
  stopWatch?.()
  stopWatch = null
  announcer = null
}

/** Leaving or discarding: stop talking straight away. */
export function endRun() {
  stopListening()
  hush()
  queue = Promise.resolve()
}
