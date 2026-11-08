<script setup>
// Record a run, walk or ride. Shows time, distance and pace, the route on
// the map, and how far you are from closing your loop. Also imports GPX, TCX
// and FIT files (one or many) from a watch or app, and (in the practice map)
// simulates a loop. A route from the planner shows dashed, with how far off
// it you are. A story mission can ride along: pick one before starting and
// a strip shows its chapter and surge timer during the run. Or race a
// ghost: a past run of yours from here, or the planned route at a pace. The
// ghost moves on the map and the voice coach calls the gap.
import { ref, computed, watch, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import { rec, start, pause, resume, stop, discard, bridgeGaps, unfinished, forgetUnfinished } from '../../lib/recorder.js'
import { api, isLocal } from '../../lib/api/index.js'
import { store, refresh, toast } from '../../lib/store.js'
import { km, pace, duration, speedKmh, MODE_LABEL } from '../../lib/format.js'
import { loopTrack } from '../../lib/tracks.js'
import { readImports } from '../../lib/importers/index.js'
import { setLastResult } from '../../lib/lastResult.js'
import { beginRun, finishRun, endRun, missionLive, coachSays, answerMission, setSurroundingsProbe } from '../../lib/audio/runAudio.js'
import GhostPicker from '../../components/GhostPicker.vue'
import { makeGhost, ghostAt, progressAlong, gapSeconds, gapLine, gapShort, raceResult } from '../../lib/ghost.js'
import { saveGhostRace } from '../../lib/ghostRace.js'
import { usualPace } from '../../lib/planner.js'
import { saveResult } from '../../lib/missions/index.js'
import MissionPicker from '../../components/MissionPicker.vue'
import MissionStrip from '../../components/MissionStrip.vue'
import { audio } from '../../lib/audio/settings.js'
import { isLinked as spotifyLinked } from '../../lib/audio/spotify.js'
import { planned, setPlanned } from '../../lib/plannedRoute.js'
import { offRouteM } from '../../lib/planner.js'
import { createNavigator } from '../../lib/directions.js'
import { surroundingsOnMap } from '../../lib/surroundings.js'
import PocketMode from '../../components/PocketMode.vue'
import AskCard from '../../components/AskCard.vue'

const router = useRouter()
const here = useRoute()
// A planned route only when we came from the planner
const plannedRing = ref(here.query.route === 'planned' && planned.route ? planned.route.ring : null)
const mode = ref(plannedRing.value ? planned.route.mode : store.mode)
const saving = ref(false)
const error = ref(null)
const fileInput = ref(null)
const progress = ref(null)
const missionId = ref(null)

const live = computed(() => rec.status === 'recording' || rec.status === 'paused' || rec.status === 'acquiring')
const me = computed(() => rec.points.length ? rec.points[rec.points.length - 1] : store.located ? store.centre : null)
const offRoute = computed(() => {
  if (!plannedRing.value || !me.value) return null
  return Math.round(offRouteM(me.value, plannedRing.value))
})
const routeLine = computed(() => {
  if (!plannedRing.value) return null
  if (!live.value) return `Following ${planned.route.name}. The dashed line is your route.`
  if (offRoute.value == null) return null
  return offRoute.value <= 25 ? 'On route.' : `${offRoute.value} m off route. Head back to the dashed line when you can.`
})
function dropRoute() {
  plannedRing.value = null
  setPlanned(null)
}

// The missions place real-world sounds around you from what the map shows nearby
const tmap = ref(null)
setSurroundingsProbe((p) => surroundingsOnMap(tmap.value?.map, p))
onBeforeUnmount(() => setSurroundingsProbe(null))

// Pocket mode: a black screen that keeps recording (locking the phone stops GPS)
const pocket = ref(false)
watch(() => rec.status, (st) => { if (st !== 'recording' && st !== 'paused') pocket.value = false })

// ---- turn by turn directions, when the planned route came with them ----
const hasDirections = computed(() => !!(plannedRing.value && planned.route?.steps?.length))
const nextTurn = ref(null)
let nav = null
watch(() => rec.points.length, () => {
  if (!nav || rec.status !== 'recording' || !rec.points.length) return
  const out = nav.update(rec.points[rec.points.length - 1], rec.elapsedS)
  nextTurn.value = out.next
  if (audio.directions) for (const line of out.say) coachSays(line)
})
const turnText = computed(() => {
  const n = nextTurn.value
  if (!n) return null
  const when = n.inM >= 1000 ? `${(n.inM / 1000).toFixed(1)} km` : `${Math.max(10, Math.round(n.inM / 10) * 10)} m`
  return { short: n.short, when, turn: n.turn }
})
const ARROWS = { left: -90, 'sharp left': -135, 'slight left': -40, 'keep left': -25, right: 90, 'sharp right': 135, 'slight right': 40, 'keep right': 25, uturn: 180, roundabout: 0, straight: 0, arrive: 0 }
const loopReady = computed(() => rec.distanceM > 400 && rec.toStartM != null && rec.toStartM <= 30)
const loopHint = computed(() => {
  if (rec.status !== 'recording' || rec.distanceM < 150) return null
  if (loopReady.value) return 'Your loop closes here. Finish now or keep going for a bigger one.'
  if (rec.distanceM < 400) return 'Keep going. Loops need at least 400 m.'
  return `${rec.toStartM} m back to your start closes the loop.`
})

// ---- ghost ----
const ghostPick = ref(null)
const ghost = shallowRef(null)
const ghostLive = ref(null) // { pos, gapS, offM } during the run
const usual = ref(360)
let ghostIdx = 0
let bestD = 0
let reachedAtS = null
let nextCueM = 500
let ghostDoneSaid = false
let offSaid = false

async function buildGhost(pick) {
  ghost.value = null
  if (!pick) return
  try {
    if (pick.kind === 'run') {
      const { track } = await api.activity(pick.activity.id)
      ghost.value = makeGhost(track, { label: 'your ghost' })
    } else if (plannedRing.value) {
      ghost.value = makeGhost(plannedRing.value.map(([lng, lat]) => ({ lat, lng })), { paceSPerKm: pick.paceSPerKm, label: 'the pace ghost' })
    }
    if (!ghost.value) { toast("That run can't be raced. Pick another."); ghostPick.value = null }
  } catch (e) { toast(e.message); ghostPick.value = null }
}
watch(ghostPick, buildGhost)
onMounted(async () => {
  try { usual.value = usualPace((await api.activities({ limit: 30 })).activities, mode.value) || 360 } catch { /* an easy pace it is */ }
  const id = here.query.ghost
  if (id) {
    try {
      const { activity } = await api.activity(String(id))
      mode.value = activity.mode
      ghostPick.value = { kind: 'run', activity }
    } catch { toast("That run isn't there any more.") }
  }
})

function resetGhostRace() {
  ghostIdx = 0; bestD = 0; reachedAtS = null; nextCueM = 500; ghostDoneSaid = false; offSaid = false
  ghostLive.value = null
}
watch(() => [rec.elapsedS, rec.points.length], () => {
  const g = ghost.value
  if (!g || rec.status !== 'recording' || !rec.points.length) return
  const here0 = rec.points[rec.points.length - 1]
  const p = progressAlong(g, here0, ghostIdx)
  if (p.offM < 80) { ghostIdx = p.idx; bestD = Math.max(bestD, p.d); offSaid = false }
  else if (!offSaid && rec.distanceM > 200) { offSaid = true; coachSays(`You're off ${g.label}'s line. Head back to it to keep racing.`) }
  const gapS = gapSeconds(g, bestD, rec.elapsedS)
  const pos = ghostAt(g, rec.elapsedS)
  ghostLive.value = { pos, gapS, offM: Math.round(p.offM) }
  if (reachedAtS == null && bestD >= g.totalM - 25) {
    reachedAtS = rec.elapsedS
    coachSays(raceResult(g, { reachedEnd: true, myS: reachedAtS }).text)
  } else if (reachedAtS == null && bestD >= nextCueM) {
    nextCueM += 500
    coachSays(gapLine(gapS, { label: g.label }))
  }
  if (pos.done && !ghostDoneSaid && reachedAtS == null) { ghostDoneSaid = true; coachSays(`${g.label[0].toUpperCase() + g.label.slice(1)} has finished. Keep going, it's only time.`) }
})
const ghostStrip = computed(() => {
  if (!ghost.value || !ghostLive.value) return null
  if (reachedAtS != null) return { text: 'Ghost race done', cls: 'done' }
  return { text: `Ghost: ${gapShort(ghostLive.value.gapS)}`, cls: ghostLive.value.gapS >= 3 ? 'ahead' : ghostLive.value.gapS <= -3 ? 'behind' : '' }
})
// How the race went, worked out as you finish
function ghostOutcome() {
  const g = ghost.value
  if (!g) return null
  const r = raceResult(g, { reachedEnd: reachedAtS != null, myS: reachedAtS })
  return { ...r, label: g.label, totalS: g.totalS, ghost: g.pts.filter((_, i) => i % Math.max(1, Math.ceil(g.pts.length / 1500)) === 0).map((q) => [q.lat, q.lng, Math.round(q.s)]) }
}
let pendingGhost = null

function begin() {
  error.value = null
  resetGhostRace()
  start(mode.value)
  // Same tap starts the music and wakes the voice (phones need a tap for sound)
  beginRun(mode.value, { onError: (msg) => toast(msg), missionId: mode.value === 'ride' ? null : missionId.value })
  nav = hasDirections.value ? createNavigator(plannedRing.value, planned.route.steps) : null
  nextTurn.value = null
  const first = nav && planned.route.steps[0]
  if (first?.turn === 'depart' && audio.directions) coachSays(first.text)
}
const audioLine = computed(() => {
  const parts = []
  if (audio.voice) parts.push('Voice coach on')
  if (spotifyLinked() && audio.spotifyAutoplay) parts.push(audio.spotifyContextName ? `Spotify: ${audio.spotifyContextName}` : 'Spotify on')
  return parts.join('. ') || 'Music and voice off'
})

async function save(payload, label = 'Saving', missionSummary = null) {
  saving.value = label
  error.value = null
  let res
  try {
    res = await api.postActivity(payload)
  } catch (e) {
    error.value = e.message
    saving.value = false
    return
  }
  // Saved. Nothing from here on may keep the summary from showing.
  const id = res?.activity?.id
  const quietly = (fn) => { try { fn() } catch { /* a nice extra, not worth losing the summary over */ } }
  if (payload.source === 'phone' && !payload.simulated) quietly(forgetUnfinished)
  quietly(() => setLastResult(res))
  if (missionSummary && id) quietly(() => saveResult(id, missionSummary))
  if (pendingGhost && id) quietly(() => saveGhostRace(id, pendingGhost))
  pendingGhost = null
  await Promise.race([refresh().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]) // fresh numbers, but never a long wait
  saving.value = false
  if (id) router.replace({ name: 'result', params: { id } }).catch(() => { location.hash = `#/app/result/${encodeURIComponent(id)}` })
  else router.replace({ name: 'you' }).catch(() => {})
}

// Why a recording couldn't be saved, in plain words
function tooShort(gpsPoints, elapsedS) {
  if (elapsedS > 120 && gpsPoints < 20) {
    return `Only ${gpsPoints} GPS ${gpsPoints === 1 ? 'point' : 'points'} came through in ${Math.round(elapsedS / 60)} minutes, so there's nothing to save. Phones stop GPS when the screen locks or another app is in front. Keep Foothold open with the screen on while you go.`
  }
  return 'That was too short to save. Nothing was recorded.'
}

async function finish() {
  const totals = { elapsedS: rec.elapsedS, distanceM: rec.distanceM } // stop() clears these
  pendingGhost = ghostOutcome()
  const out = stop()
  const missionSummary = finishRun(totals)
  await saveRecording(out, totals.elapsedS, missionSummary)
}

async function saveRecording(out, elapsedS, missionSummary = null) {
  // Join any stretch where GPS went quiet, so it still counts and a loop can close
  const points = bridgeGaps(out.points, { mode: out.mode })
  if (points.length < 10 || (out.distanceM ?? 1e9) < 30) {
    forgetUnfinished()
    error.value = tooShort(out.points.length, elapsedS)
    return
  }
  await save({ mode: out.mode, startedAt: out.startedAt, points, source: 'phone' }, 'Saving', missionSummary)
}

// A run from before the page was closed, waiting to be saved
const leftover = ref(unfinished())
const leftoverText = computed(() => {
  const u = leftover.value
  if (!u) return ''
  const when = new Date(u.startedAt || u.points[0].t).toLocaleString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  let m = 0
  for (let i = 1; i < u.points.length; i++) m += Math.hypot((u.points[i].lat - u.points[i - 1].lat) * 111320, (u.points[i].lng - u.points[i - 1].lng) * 111320 * Math.cos((u.points[i].lat * Math.PI) / 180))
  return `You have an unsaved ${u.mode} from ${when}, ${km(m)} km so far.`
})
async function saveLeftover() {
  const u = leftover.value
  leftover.value = null
  const t0 = u.startedAt || u.points[0].t
  await saveRecording({ ...u, distanceM: null }, Math.round((u.points[u.points.length - 1].t - t0) / 1000))
}
function dropLeftover() {
  forgetUnfinished()
  leftover.value = null
}

function cancel() {
  if (rec.points.length > 20 && !confirm('Discard this activity? It won’t be saved.')) return
  discard()
  endRun()
}

async function simulate() {
  const perimeterKm = mode.value === 'ride' ? 9 : mode.value === 'walk' ? 2.5 : 3.6
  const kmh = mode.value === 'ride' ? 24 : mode.value === 'walk' ? 5.2 : 10.5
  const startAt = Date.now() - (perimeterKm / kmh) * 3600000 - 60000
  const angle = Math.random() * Math.PI * 2
  const r = 300 + Math.random() * 500
  const centre = { lat: store.centre.lat + (Math.sin(angle) * r) / 111000, lng: store.centre.lng + (Math.cos(angle) * r) / (111000 * Math.cos((store.centre.lat * Math.PI) / 180)) }
  const points = loopTrack({ centre, perimeterKm, kmh, startAt, seed: Math.floor(Math.random() * 1e9), stretch: 0.8 + Math.random() * 0.6, rotate: Math.random() * Math.PI })
  await save({ mode: mode.value, source: 'phone', startedAt: startAt, points, simulated: true }, 'Running your practice loop')
}

async function onFile(e) {
  const files = [...(e.target.files || [])]
  e.target.value = ''
  if (!files.length) return
  error.value = null
  saving.value = 'Reading your files'
  progress.value = null
  try {
    const known = await api.activities({ limit: 200 }).then((r) => r.activities.map((x) => x.startedAt)).catch(() => [])
    const { ready, duplicates, problems } = await readImports(files, known)
    const failed = [...problems]
    let last = null
    let saved = 0
    let lastError = null
    for (let i = 0; i < ready.length; i++) {
      const r = ready[i]
      saving.value = ready.length > 1 ? `Importing ${i + 1} of ${ready.length}` : 'Importing'
      progress.value = ready.length > 1 ? new Date(r.startedAt).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${MODE_LABEL[r.mode]}` : null
      try {
        last = await api.postActivity({ mode: r.mode, source: 'import', startedAt: r.startedAt, points: r.points })
        saved++
        lastError = null
      } catch (err) {
        failed.push({ name: r.name, message: err.message })
        // The same error twice in a row (a daily limit, say) won't fix itself: stop here.
        if (err.message === lastError) break
        lastError = err.message
      }
    }
    const skipped = []
    if (duplicates) skipped.push(`${duplicates} already saved`)
    if (failed.length) skipped.push(`${failed.length} couldn't be imported`)
    if (!last) {
      error.value = failed.length === 1 && !duplicates ? failed[0].message
        : duplicates && !failed.length ? (duplicates === 1 ? 'That activity is already saved.' : 'Those activities are already saved.')
        : `Nothing new to import: ${skipped.join(', ')}.${failed[0] ? ` ${failed[0].message}` : ''}`
      return
    }
    setLastResult(last)
    await refresh()
    if (saved > 1 || skipped.length) toast(`Imported ${saved} ${saved === 1 ? 'activity' : 'activities'}${skipped.length ? `. ${skipped.join(', ')}` : ''}.`, 5000)
    router.replace({ name: 'result', params: { id: last.activity.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
    progress.value = null
  }
}

// Leaving this screen mid-recording keeps it going: the app shows a bar to
// come back, and the recording is saved on the device as it goes.
onBeforeUnmount(() => {})
</script>

<template>
  <div class="rec">
    <PocketMode v-if="pocket" :next-turn="nextTurn" :ask="missionLive?.ask || null" @answer="answerMission" @close="pocket = false" />
    <div class="maparea">
      <TerritoryMap ref="tmap" :centre="store.centre" :zoom="15.5" :track="rec.points" :me="me" :follow="live" :suggestion="plannedRing" :fit="!!plannedRing" :ghost="ghostLive?.pos || null" />
      <RouterLink v-if="!live" class="back" to="/app" aria-label="Back to the map">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </RouterLink>
      <div v-if="loopHint" class="loophint" :class="{ ready: loopReady }" aria-live="polite">{{ loopHint }}</div>
      <div v-if="routeLine" class="routeline" :class="{ off: offRoute > 25 }" aria-live="polite">
        <span>{{ routeLine }}</span>
        <button v-if="!live" type="button" class="drop" aria-label="Stop following this route" @click="dropRoute">×</button>
      </div>
    </div>

    <section class="panel-bottom">
      <template v-if="saving">
        <div class="saving" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <strong>{{ saving }}</strong>
          <span v-if="progress" class="muted small">{{ progress }}</span>
          <span class="muted small">Finding your loops and claiming ground</span>
        </div>
      </template>

      <template v-else-if="!live">
        <div class="seg" role="group" aria-label="Activity type">
          <button v-for="m in ['run', 'walk', 'ride']" :key="m" type="button" :aria-pressed="mode === m" @click="mode = m">{{ MODE_LABEL[m] }}</button>
        </div>
        <p class="small muted">
          Keep Foothold open on screen while you {{ mode }}. Browsers pause GPS when the phone locks.
          Close a loop of at least 400 m and everything inside is yours.
        </p>
        <div v-if="leftover" class="notice leftover">
          <p>{{ leftoverText }} Save it now?</p>
          <div class="row">
            <button class="btn small" type="button" @click="saveLeftover">Save it</button>
            <button class="btn quiet small" type="button" @click="dropLeftover">Discard</button>
          </div>
        </div>
        <MissionPicker v-if="mode !== 'ride'" v-model="missionId" />
        <GhostPicker v-model="ghostPick" :mode="mode" :here="store.located ? store.centre : null" :route="plannedRing ? planned.route : null" :usual-pace="usual" />
        <div v-if="error" class="notice bad">{{ error }}</div>
        <div v-else-if="rec.error" class="notice bad">{{ rec.error }}</div>
        <button class="btn block go" type="button" @click="begin">Start {{ mode }}</button>
        <RouterLink class="audioline small" to="/app/settings">{{ audioLine }}. Change</RouterLink>
        <div class="alt">
          <button class="btn quiet small" type="button" @click="fileInput.click()">Import from a watch or app (GPX, TCX, FIT)</button>
          <button v-if="isLocal" class="btn quiet small" type="button" @click="simulate">Practice loop (no GPS)</button>
          <RouterLink class="btn quiet small" :to="{ name: 'recap', params: { id: 'demo' } }">Watch a demo recap</RouterLink>
          <input ref="fileInput" type="file" multiple accept=".gpx,.tcx,.fit,.gz,.zip,application/gpx+xml,application/vnd.garmin.tcx+xml,application/xml,text/xml,application/zip,application/gzip,application/octet-stream" hidden @change="onFile" />
        </div>
      </template>

      <template v-else>
        <div v-if="rec.status === 'acquiring'" class="acq" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <span>Finding GPS<template v-if="rec.accuracy"> (±{{ rec.accuracy }} m)</template></span>
        </div>
        <MissionStrip v-if="missionLive && rec.status !== 'acquiring'" :view="missionLive" />
        <AskCard v-if="missionLive?.ask && rec.status === 'recording'" :ask="missionLive.ask" @answer="answerMission" />
        <div v-if="rec.notice" class="notice gap" role="status">{{ rec.notice }}</div>
        <div v-if="turnText && rec.status === 'recording'" class="turnstrip" :class="{ soon: nextTurn.inM <= 60 }" aria-live="off">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" :style="{ transform: `rotate(${ARROWS[turnText.turn] || 0}deg)` }"><path d="M12 20V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <span class="what">{{ turnText.short }}</span>
          <span class="when">{{ turnText.when }}</span>
        </div>
        <div v-if="ghostStrip" class="ghoststrip" :class="ghostStrip.cls" aria-live="polite"><span class="g" aria-hidden="true"></span>{{ ghostStrip.text }}</div>
        <div class="live">
          <div class="stat"><span class="big-num">{{ duration(rec.elapsedS) }}</span><span class="label">Time</span></div>
          <div class="stat"><span class="big-num">{{ km(rec.distanceM) }}</span><span class="label">km</span></div>
          <div class="stat">
            <span class="big-num">{{ rec.mode === 'ride' ? speedKmh(rec.paceSPerKm) : pace(rec.paceSPerKm) }}</span>
            <span class="label">{{ rec.mode === 'ride' ? 'km/h' : 'Pace /km' }}</span>
          </div>
        </div>
        <button v-if="rec.status !== 'acquiring'" class="pocketbtn" type="button" @click="pocket = true">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M10 18.5h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          Pocket mode <span class="muted">keeps GPS going, unlike the lock button</span>
        </button>
        <div class="controls">
          <button v-if="rec.status === 'recording'" class="btn secondary" type="button" @click="pause">Pause</button>
          <button v-else-if="rec.status === 'paused'" class="btn secondary" type="button" @click="resume">Resume</button>
          <button v-else class="btn secondary" type="button" @click="cancel">Cancel</button>
          <button class="btn" type="button" :disabled="rec.status === 'acquiring'" @click="finish">Finish</button>
        </div>
        <button v-if="rec.status !== 'acquiring'" class="discard" type="button" @click="cancel">Discard</button>
      </template>
    </section>
  </div>
</template>

<style scoped>
.rec { display: grid; grid-template-rows: minmax(36dvh, 1fr) auto; height: 100dvh; overflow: hidden; }
.maparea { position: relative; min-height: 0; }
.maparea > :first-child { position: absolute; inset: 0; }
.back {
  position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 12px; z-index: 2;
  width: 44px; height: 44px; border-radius: 50%; background: var(--card); color: var(--ink);
  display: grid; place-items: center; box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.loophint {
  position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 64px; right: 12px; z-index: 2;
  background: var(--card); border-radius: 12px; padding: 10px 14px; font-weight: 650; font-size: 0.95rem;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.loophint.ready { background: var(--you); color: #fff; }
.routeline {
  position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  background: var(--card); border-radius: 12px; padding: 8px 8px 8px 14px; font-weight: 650; font-size: 0.95rem; min-height: 44px;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.routeline span { flex: 1; min-width: 0; }
.routeline.off { background: var(--notice-bg); color: var(--notice-ink); }
.routeline .drop { border: 0; background: var(--soft); width: 36px; height: 36px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; color: var(--ink); flex: none; }
.panel-bottom {
  background: var(--paper); padding: 18px var(--pad) calc(18px + env(safe-area-inset-bottom));
  display: grid; gap: 14px; border-top: 1px solid var(--line);
  /* Lots of options before a run: scroll them rather than squash the map */
  max-height: 64dvh; overflow-y: auto; overscroll-behavior: contain;
}
.go { min-height: 58px; font-size: 1.15rem; }
.alt { display: flex; gap: 10px; flex-wrap: wrap; }
.live { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; }
.live .big-num { font-size: clamp(1.8rem, 9vw, 2.6rem); }
.controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.discard { justify-self: center; border: 0; background: none; color: var(--ink-60); font: inherit; text-decoration: underline; cursor: pointer; padding: 6px; }
.acq, .saving { display: flex; align-items: center; gap: 10px; justify-content: center; }
.saving { flex-direction: column; padding: 12px 0; }
.spinner {
  width: 22px; height: 22px; border-radius: 50%; border: 3px solid var(--soft); border-top-color: var(--you);
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.audioline { justify-self: center; color: var(--ink-60); text-decoration: underline; text-underline-offset: 3px; }
.leftover { display: grid; gap: 8px; }
.leftover p { margin: 0; }
.leftover .row { display: flex; gap: 8px; }
.notice.gap { font-size: 0.9rem; }
.ghoststrip { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; background: var(--soft); font-weight: 750; }
.ghoststrip .g { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid rgba(22, 48, 42, 0.6); }
.ghoststrip.ahead { background: var(--good-bg); }
.ghoststrip.behind { background: var(--behind-bg); }
.pocketbtn {
  display: flex; align-items: center; gap: 8px; width: 100%; min-height: 48px; padding: 8px 14px; border: 0; border-radius: 12px;
  background: var(--soft); color: var(--ink); font: inherit; font-weight: 750; cursor: pointer; text-align: left;
}
.pocketbtn .muted { font-weight: 500; font-size: 0.85rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.turnstrip { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; background: var(--ink); color: var(--on-ink); font-weight: 750; }
.turnstrip svg { flex: none; transition: transform 0.3s; }
.turnstrip .what { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.turnstrip .when { flex: none; font-variant-numeric: tabular-nums; }
.turnstrip.soon { background: var(--you); }
</style>
