// Music and voice during a recording: starts Spotify on the Start tap,
// says "Let's go" once GPS locks, then speaks the announcer's lines as the
// run goes, lowering or pausing the music around each one. Lines and the
// small control sounds share one queue so they never overlap. With a story
// mission on, the mission's lines go first in the queue and the coach's
// regular updates shrink to the headline while the mission is talking.
// The thriller series (Ember Run, The Night Job) also bring a cast of voices,
// made ahead of the run, and a soundscape: scene sounds, a score that follows
// the surges, and effects before some lines.
import { watch, ref } from 'vue'
import { rec } from '../recorder.js'
import { audio } from './settings.js'
import { createAnnouncer } from './announcer.js'
import { speak, speakAs, prepareLines, forgetLines, unlock, hush } from './voice.js'
import { enqueue, clear } from './queue.js'
import * as sfx from './sfx.js'
import * as spotify from './spotify.js'
import { api } from '../api/index.js'
import { nextSession, toISO, trainingPaces, DEFAULT_5K_S } from '../coach/index.js'
import { createMission, missionById, recordTry, sagaById } from '../missions/index.js'
import { CAST } from '../missions/cast.js'
import { createSoundscape, intensityFor, STINGS } from './soundscape.js'

let stopWatch = null
let announcer = null
let lastStatus = 'idle'
let loopWasReady = false
let mission = null
let missionSpokeAt = -Infinity
let scape = null // the thriller soundscape, when one is playing
let narrator = null // who reads lines with no speaker
let level = 0 // the score's intensity
let episode = null // the thriller episode's title and teaser lines

/** What the Record screen's mission strip shows (null with no mission). */
export const missionLive = ref(null)

const MISSION_SFX = { 'surge-start': 'surge', 'surge-end': 'surgeDone', chapter: 'chapter', finale: 'quest' }
// The regular update's first sentence ("2 kilometres."), for when the mission has the floor
const headline = (line) => (line.match(/^[^.]*\./) || [line])[0]

/** Have the voice coach say a line (if the voice is on), ducking the music like any update. */
export function coachSays(text) { say(text) }

function say(text) {
  if (!text || !audio.voice) return
  enqueue(() => spotify.aroundSpeech(() => talking(() => speak(text, { coachVoice: audio.coachVoice, voiceName: audio.voiceName })), { how: audio.music, duckTo: audio.duckTo }))
}

// The soundscape dips while anyone talks
async function talking(fn) {
  const s = scape
  s?.duck(true)
  try { await fn() } finally { s?.duck(false) }
}

/**
 * A mission line: plain text (the coach voice) or { text, who, fx }. A sound
 * effect plays first, and radio characters get a squelch either side.
 */
function sayLine(line) {
  if (!line) return
  if (typeof line === 'string' && !narrator) return say(line)
  const { text, who: w, fx } = typeof line === 'string' ? { text: line } : line
  const who = w || narrator
  const s = scape
  if (fx && s && STINGS[fx]) enqueue(() => s.sting(fx))
  if (!text || !audio.voice) return
  const radio = CAST[who]?.radio && s
  enqueue(() => spotify.aroundSpeech(async () => {
    if (radio) await s.sting('squelch')
    await talking(() => speakAs(text, who, { coachVoice: audio.coachVoice, voiceName: audio.voiceName }))
    if (radio) await s.sting('squelch')
  }, { how: audio.music, duckTo: audio.duckTo }))
}

/** The title card, "Previously on" and "Next time on" lines for a thriller episode. */
export function episodeLines(script, saga) {
  if (!saga?.narrator || !script.episode) return { title: null, previously: null, next: null }
  return {
    title: `${saga.title}. Episode ${script.episode}. ${script.title}.`,
    previously: script.previously || null,
    next: script.next || null,
  }
}

/** Every line a mission can say, with its speaker, to get ready before the run. */
export function missionLines(script, narratorKey, saga = null) {
  const out = []
  const ep = episodeLines(script, saga)
  for (const l of [ep.title, ep.previously, ep.next]) if (l) out.push({ text: l, who: narratorKey })
  const add = (l, who) => {
    if (!l) return
    if (typeof l === 'string') out.push({ text: l, who: who || narratorKey })
    else out.push({ text: l.text, who: l.who || who || narratorKey })
  }
  add(script.loop)
  add(script.early)
  for (const b of script.beats) {
    add(b.say, b.who)
    for (const k of ['success', 'okay', 'half', 'done', 'easyNudge']) add(b[k], b.who)
  }
  const seen = new Set()
  return out.filter((l) => l.who && !seen.has(l.who + l.text) && seen.add(l.who + l.text))
}

function startScape(saga) {
  if (!saga?.score || !audio.sfx || !audio.storySound) return null
  const ctx = sfx.context()
  const out = sfx.musicOut()
  if (!ctx || !out) return null
  // your own Spotify music takes the place of the score
  const music = !(audio.spotifyAutoplay && spotify.isLinked())
  const s = createSoundscape(ctx, out, { score: saga.score, music, seed: Date.now() % 9973 })
  s.start()
  return s
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
  const saga = script ? sagaById(script.saga) : null
  narrator = saga?.narrator || null
  level = 0
  episode = null
  if (narrator) {
    prepareLines(missionLines(script, narrator, saga), { coachVoice: audio.coachVoice }) // in the background
    scape = startScape(saga)
    episode = episodeLines(script, saga)
    // the cold open: title music, the episode's title, and what happened last time
    const s = scape
    if (s) enqueue(() => s.intro())
    sayLine(episode.title)
    sayLine(episode.previously)
  }
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
            if (e.type === 'scene') scape?.setScene(e.scene)
            if (scape) {
              level = intensityFor(e.type, level)
              scape.setIntensity(level)
            }
            // the thrillers' score marks chapters and endings itself
            if (MISSION_SFX[e.type] && !(narrator && ['chapter', 'finale'].includes(e.type))) sfx.cue(MISSION_SFX[e.type])
          }
          for (const line of out.lines) sayLine(line)
          // the end of an episode: the end theme, then a teaser for the next one
          if (narrator && out.events.some((e) => e.type === 'finale')) {
            const s = scape
            if (s) enqueue(() => s.outro())
            sayLine(episode?.next)
          }
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
    for (const line of out.lines) sayLine(line)
    if (summary.clockS >= 60) recordTry(summary) // any real try unlocks the next mission
  }
  if (announcer && distanceM > 50) say(announcer.finish({ elapsedS, distanceM }))
  const s = scape
  if (s) enqueue(() => s.stop(5)) // fades out after the last word
  scape = null
  stopListening()
  return summary
}

function stopListening() {
  stopWatch?.()
  stopWatch = null
  announcer = null
  mission = null
  narrator = null
  missionLive.value = null
}

/** Leaving or discarding: stop talking straight away. */
export function endRun() {
  scape?.stop(0.6)
  scape = null
  forgetLines()
  stopListening()
  hush()
  clear()
}
