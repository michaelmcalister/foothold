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
import { speak, speakAs, prepareLines, forgetLines, unlock, hush, setRunSession, asAnnouncement, runSessionKind, reclaimSpeaker } from './voice.js'
import { enqueue, clear } from './queue.js'
import * as sfx from './sfx.js'
import * as spotify from './spotify.js'
import { api } from '../api/index.js'
import { nextSession, toISO, trainingPaces, DEFAULT_5K_S } from '../coach/index.js'
import { createMission, missionById, recordTry, sagaById, CHAINS } from '../missions/index.js'
import { CAST, stripTags } from '../missions/cast.js'
import { createSoundscape, intensityFor, STINGS } from './soundscape.js'
import { listenFor, stopListening as stopMic, canListen, primeListening, optionsPrompt } from './listen.js'
import { loadBuffer, createRunMusic } from './recorded.js'
import { CHASE_TRACK, AMBIENCE } from './library.js'

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
let runMusic = null // Foothold's own music, when Spotify isn't playing
let keepAwake = 0 // wakes the sound if the phone pauses it mid run
let runPaces = null
let probe = null // asks the record screen's map what's around you
let probedAt = -Infinity

/** The record screen hands over a way to ask its map what's nearby (surroundings.js). */
export function setSurroundingsProbe(fn) { probe = fn }

/** What the Record screen's mission strip shows (null with no mission). */
export const missionLive = ref(null)

const MISSION_SFX = { 'surge-start': 'surge', 'surge-end': 'surgeDone', chapter: 'chapter', finale: 'quest' }
// The regular update's first sentence ("2 kilometres."), for when the mission has the floor
const headline = (line) => (line.match(/^[^.]*\./) || [line])[0]

// The height now, smoothed over the last few GPS fixes (phone GPS heights wobble by metres)
function smoothAlt() {
  const alts = []
  for (let i = rec.points.length - 1; i >= 0 && alts.length < 15; i--) if (Number.isFinite(rec.points[i].alt)) alts.push(rec.points[i].alt)
  if (alts.length < 5) return null
  alts.sort((a, b) => a - b)
  return alts[Math.floor(alts.length / 2)]
}

/** Have the voice coach say a line (if the voice is on), ducking the music like any update. */
export function coachSays(text) { say(text) }

function say(text) {
  if (!text || !audio.voice) return
  enqueue(() => spotify.aroundSpeech(() => talking(() => speak(text, { coachVoice: audio.coachVoice, voiceName: audio.voiceName })), { how: audio.music, duckTo: audio.duckTo }))
}

// The soundscape dips while anyone talks
async function talking(fn) {
  const s = scape
  const m = runMusic
  s?.duck(true)
  m?.duck(true)
  try { await fn() } finally { s?.duck(false); m?.duck(false) }
}

const spotifyOn = () => audio.spotifyAutoplay && spotify.isLinked()

/** Foothold's own tracks for a run without Spotify (and without a thriller score). */
function startRunMusic() {
  if (!audio.runMusic || spotifyOn()) return null
  const ctx = sfx.context()
  const out = sfx.musicOut()
  if (!ctx || !out) return null
  const m = createRunMusic(ctx, out)
  m.start()
  return m
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
  // Alongside Spotify the run's sound mode follows the silent switch, so a
  // line's effect plays inside the voice's announcement, which doesn't
  if (fx && s && STINGS[fx]) enqueue(() => (runSessionKind() === 'ambient' ? asAnnouncement(() => s.sting(fx)) : s.sting(fx)))
  if (!text || !audio.voice) return
  const radio = CAST[who]?.radio && s
  const play = async () => {
    if (radio) { await s.sting('squelch'); s.radio(stripTags(text).length / 13) } // static and crackle under the line
    await talking(() => speakAs(text, who, { coachVoice: audio.coachVoice, voiceName: audio.voiceName }))
    if (radio) await s.sting('squelch')
  }
  // alongside Spotify, the radio sounds share the voice's announcement (see above)
  enqueue(() => spotify.aroundSpeech(() => (radio && runSessionKind() === 'ambient' ? asAnnouncement(play) : play()), { how: audio.music, duckTo: audio.duckTo }))
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
    if (!l || typeof l === 'function') return // worked out live (a game show score), so not made ahead
    if (typeof l === 'string') out.push({ text: l, who: who || narratorKey })
    else out.push({ text: l.text, who: l.who || who || narratorKey })
  }
  add(script.loop)
  add(script.early)
  for (const h of script.hillLines || []) add(h, script.host)
  for (const b of script.beats.filter((x) => x.options)) {
    out.push({ text: optionsPrompt(b.options), who: narratorKey })
    for (const o of b.options) add(o.say, b.who)
    for (const k of ['right', 'wrong', 'timeout']) add(b[k], b.who)
  }

  for (const b of script.beats) {
    add(b.say, b.who)
    for (const k of ['success', 'okay', 'half', 'done', 'easyNudge']) add(b[k], b.who)
  }
  const seen = new Set()
  return out.filter((l) => l.who && !seen.has(l.who + l.text) && seen.add(l.who + l.text))
}

// ---- questions: read the options out, listen for an answer, or take a tap ----
function askAloud() {
  const v = mission?.view().ask
  if (!v) return
  if (scape) enqueue(() => scape?.sting('question'))
  else sfx.cue('loopReady')
  sayLine(narrator ? { text: optionsPrompt(v.options), who: narrator } : optionsPrompt(v.options))
  if (!audio.answerByVoice || !canListen()) return
  enqueue(async () => {
    const now = mission?.view().ask
    if (!now) return // answered with a tap while the options were read
    const s = scape
    s?.duck(true)
    sfx.play('kudos', { wait: false }) // a little blip: the microphone is open, say your answer
    const key = await listenFor(now.options, { timeoutMs: Math.max(5000, (now.remainingS - 1) * 1000) })
    await afterListening()
    scape?.duck(false)
    if (key) applyAnswer(key)
  })
}

function answered(events) {
  const show = mission?.script.scored
  for (const e of events) {
    // game show: the till rings for points from sprints and hills
    if (show && scape && (e.type === 'climb' || (e.type === 'surge-end' && e.points))) { enqueue(() => scape?.sting('cash')); continue }
    if (e.type !== 'answer') continue
    if (e.kind === 'choice') { if (scape) enqueue(() => scape?.sting('impact')); continue }
    if (scape) enqueue(() => scape?.sting(e.right ? (show ? 'cash' : 'correct') : (show ? 'bonk' : 'downer')))
    if (scape && show && e.right) enqueue(() => scape?.sting('applause')) // the crowd only claps when it's earned
    else sfx.cue(e.right ? 'surgeDone' : 'chapter')
  }
}

function applyAnswer(key) {
  if (!mission) return
  const out = mission.answer(key)
  answered(out.events)
  for (const line of out.lines) sayLine(line)
  missionLive.value = mission.view()
}

/** A tap on one of the answers on screen. */
export function answerMission(key) {
  stopMic()
  applyAnswer(key)
}

// iPhone app: after the microphone listens, put Foothold's sound back and
// start the effects and the story's soundscape fresh, where it was.
let scapeSaga = null
let scapeScene = null
async function afterListening() {
  if (!(await reclaimSpeaker())) return
  const had = !!scape
  scape?.stop(0)
  sfx.rebuildContext()
  await sfx.resume()
  if (had && scapeSaga) {
    scape = startScape(scapeSaga)
    if (scapeScene) scape?.setScene(scapeScene)
    scape?.setIntensity(level)
  }
}

function startScape(saga) {
  scapeSaga = saga
  if (!saga?.score || !audio.sfx || !audio.storySound) return null
  const ctx = sfx.context()
  const out = sfx.musicOut()
  if (!ctx || !out) return null
  // your own Spotify music takes the place of the score
  const music = !spotifyOn()
  const recorded = { ambience: (n) => loadBuffer(ctx, 'ambience', n), track: (id) => loadBuffer(ctx, 'track', id), sfx: (id) => loadBuffer(ctx, 'sfx', id) }
  const s = createSoundscape(ctx, out, { score: saga.score, music, seed: Date.now() % 9973, recorded, chase: music ? CHASE_TRACK[saga.id] : null })
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

/**
 * Start a mission's story and sound (at the start of a run, or straight after
 * the last episode when you say yes to the next one).
 */
function startMission(script) {
  mission = script ? createMission(script, { paces: runPaces }) : null
  const saga = script ? sagaById(script.saga) : null
  narrator = saga?.narrator || null
  level = 0
  episode = null
  missionOffer.value = null
  if (narrator) {
    prepareLines(missionLines(script, narrator, saga)) // in the background
    scapeScene = null
    scape = startScape(saga)
    // get the episode's recorded scenes ready while the title music plays
    const ctx = sfx.context()
    if (scape && ctx) for (const n of new Set(script.beats.map((b) => b.scene).filter((x) => x && AMBIENCE[x]))) loadBuffer(ctx, 'ambience', n)
    episode = episodeLines(script, saga)
    // the cold open: title music, the episode's title, and what happened last time
    const s = scape
    if (s) enqueue(() => s.intro())
    sayLine(episode.title)
    sayLine(episode.previously)
  }
  missionLive.value = mission ? mission.view() : null
}

// ---- after an episode: offer the next one ----
/** The offer on screen: { kind: 'next', question, options, remainingS, waitS } or null. */
export const missionOffer = ref(null)
const OFFER_S = 25
let offerTimer = 0
let nextScript = null

/** The episode after this one in its series, if there is one. */
export function nextEpisode(id) {
  for (const chain of Object.values(CHAINS)) {
    const i = chain.indexOf(id)
    if (i >= 0 && i < chain.length - 1) return missionById(chain[i + 1])
  }
  return null
}

function offerNext(script) {
  const next = nextEpisode(script.id)
  if (!next) return
  nextScript = next
  const ep = next.episode ? `episode ${next.episode}, ${next.title}` : next.title
  enqueue(async () => {
    if (!mission || mission.script.id !== script.id) return
    missionOffer.value = { kind: 'next', question: `Up next: ${next.title}. Keep going?`, options: [{ key: 'A', label: 'Yes, play it' }, { key: 'B', label: 'No thanks' }], remainingS: OFFER_S, waitS: OFFER_S }
    clearInterval(offerTimer)
    offerTimer = setInterval(() => {
      const o = missionOffer.value
      if (!o) return clearInterval(offerTimer)
      if (o.remainingS <= 1) { answerOffer('B', { quiet: true }); return }
      missionOffer.value = { ...o, remainingS: o.remainingS - 1 }
    }, 1000)
  })
  const ask = `Want to go straight into ${ep}? Say yes or no.`
  sayLine(narrator ? { text: ask, who: narrator } : ask)
  if (!audio.answerByVoice || !canListen()) return
  enqueue(async () => {
    if (!missionOffer.value) return
    sfx.play('kudos', { wait: false })
    const key = await listenFor(missionOffer.value.options, { timeoutMs: Math.max(5000, (missionOffer.value.remainingS - 1) * 1000) })
    await afterListening()
    if (key && missionOffer.value) answerOffer(key)
  })
}

/** Yes (A) starts the next episode now, without stopping the run; no (B) carries on. */
export function answerOffer(key, { quiet = false } = {}) {
  if (!missionOffer.value) return
  clearInterval(offerTimer)
  stopMic()
  missionOffer.value = null
  if (key !== 'A' || !nextScript) {
    if (!quiet) say('No worries. Enjoy the rest of your run.')
    return
  }
  // close this episode (it counts, and unlocks the next), then on with the next
  const done = mission?.finish()
  if (done?.summary && done.summary.clockS >= 60) recordTry(done.summary)
  scape?.stop(2)
  scape = null
  runMusic?.stop(2)
  runMusic = null
  startMission(nextScript)
  if (!scape) runMusic = startRunMusic()
  nextScript = null
}

/** Call from the Start button tap (phones only allow sound after a tap). */
/** True when the run's music couldn't start because Spotify was asleep on this phone. */
export const musicWaiting = ref(false)

export async function beginRun(mode, { onError = () => {}, missionId = null } = {}) {
  endRun()
  unlock()
  // a mission that asks questions: ask for the microphone now, inside the tap
  const asks = missionId && missionById(missionId)?.beats.some((b) => b.options)
  if (asks && audio.answerByVoice && canListen()) primeListening()
  // One sound mode for the whole run: playback (ignores the silent switch) on
  // our own, or ambient alongside Spotify. Then the same tap wakes the sound.
  const session = setRunSession(audio.spotifyAutoplay && spotify.isLinked() ? 'ambient' : 'playback', { fresh: true })
  sfx.resume()
  await session // the iPhone app sets its own mode first, then the run's sounds start
  // iPhone pauses web sound when the mic opens or a call comes in: wake it again
  clearInterval(keepAwake)
  keepAwake = setInterval(() => { if (sfx.sound.state !== 'running') sfx.resume() }, 2000)
  sfx.cue('start')
  if (audio.spotifyAutoplay && spotify.isLinked()) {
    musicWaiting.value = false
    spotify.startMusic({ context: audio.spotifyContext, shuffle: audio.shuffle }).catch((e) => {
      if (e.asleep) musicWaiting.value = true // the Play music button starts it, opening Spotify only then
      else onError(e.message)
    })
  }
  const { paces, target } = await todaysTarget()
  runPaces = paces
  const script = missionId ? missionById(missionId) : null
  startMission(script)
  // no thriller score: Foothold's own tracks, unless Spotify is playing yours
  if (!scape) runMusic = startRunMusic()
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
        const live = { elapsedS: rec.elapsedS, distanceM: rec.distanceM, paceSPerKm: rec.paceSPerKm, toStartM: rec.toStartM, altM: smoothAlt() }
        let loopSaid = false
        // every 20 seconds or so, what's around you (a park, a main road, shops)
        if (scape && probe && rec.elapsedS - probedAt >= 20) {
          probedAt = rec.elapsedS
          const near = probe(rec.points[rec.points.length - 1])
          if (near) scape.setSurroundings(near)
        }
        if (mission) {
          const out = mission.update(live)
          for (const e of out.events) {
            if (e.type === 'loop') loopSaid = true
            if (e.type === 'scene') { scapeScene = e.scene; scape?.setScene(e.scene) }
            if (e.type === 'spatial') scape?.spatial(e.name)
            if (scape) {
              level = intensityFor(e.type, level)
              scape.setIntensity(level)
            }
            // the thrillers' score marks chapters and endings itself
            if (MISSION_SFX[e.type] && !(narrator && ['chapter', 'finale'].includes(e.type))) sfx.cue(MISSION_SFX[e.type])
          }
          for (const line of out.lines) sayLine(line)
          if (out.events.some((e) => e.type === 'ask')) askAloud()
          answered(out.events)
          // the end of an episode: the end theme, then a teaser for the next one
          if (out.events.some((e) => e.type === 'finale')) {
            const s = scape
            if (narrator && s) enqueue(() => s.outro())
            if (narrator) sayLine(episode?.next)
            offerNext(mission.script) // and ask if they'd like to keep going
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
  stopMic()
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
  const m = runMusic
  if (m) enqueue(() => m.stop(6))
  runMusic = null
  enqueue(async () => { clearInterval(keepAwake); setRunSession(null) }) // after the last word
  stopListening()
  return summary
}

function stopListening() {
  clearInterval(offerTimer)
  missionOffer.value = null
  nextScript = null
  stopWatch?.()
  stopWatch = null
  announcer = null
  mission = null
  narrator = null
  missionLive.value = null
}

/** Leaving or discarding: stop talking straight away. */
export function endRun() {
  clearInterval(keepAwake)
  setRunSession(null)
  stopMic()
  runMusic?.stop(0.6)
  runMusic = null
  scape?.stop(0.6)
  scape = null
  forgetLines()
  stopListening()
  hush()
  clear()
}
