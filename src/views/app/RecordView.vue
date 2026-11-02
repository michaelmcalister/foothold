<script setup>
// Record a run, walk or ride. Shows time, distance and pace, the route on
// the map, and how far you are from closing your loop. Also imports GPX, TCX
// and FIT files (one or many) from a watch or app, and (in the practice map)
// simulates a loop. A route from the planner shows dashed, with how far off
// it you are. A story mission can ride along: pick one before starting and
// a strip shows its chapter and surge timer during the run.
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import { rec, start, pause, resume, stop } from '../../lib/recorder.js'
import { api, isLocal } from '../../lib/api/index.js'
import { store, refresh, toast } from '../../lib/store.js'
import { km, pace, duration, speedKmh, MODE_LABEL } from '../../lib/format.js'
import { loopTrack } from '../../lib/tracks.js'
import { readImports } from '../../lib/importers/index.js'
import { setLastResult } from '../../lib/lastResult.js'
import { beginRun, finishRun, endRun, missionLive } from '../../lib/audio/runAudio.js'
import { saveResult } from '../../lib/missions/index.js'
import MissionPicker from '../../components/MissionPicker.vue'
import MissionStrip from '../../components/MissionStrip.vue'
import { audio } from '../../lib/audio/settings.js'
import { isLinked as spotifyLinked } from '../../lib/audio/spotify.js'
import { planned, setPlanned } from '../../lib/plannedRoute.js'
import { offRouteM } from '../../lib/planner.js'

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
const loopReady = computed(() => rec.distanceM > 400 && rec.toStartM != null && rec.toStartM <= 30)
const loopHint = computed(() => {
  if (rec.status !== 'recording' || rec.distanceM < 150) return null
  if (loopReady.value) return 'Your loop closes here. Finish now or keep going for a bigger one.'
  if (rec.distanceM < 400) return 'Keep going. Loops need at least 400 m.'
  return `${rec.toStartM} m back to your start closes the loop.`
})

function begin() {
  error.value = null
  start(mode.value)
  // Same tap starts the music and wakes the voice (phones need a tap for sound)
  beginRun(mode.value, { onError: (msg) => toast(msg), missionId: mode.value === 'ride' ? null : missionId.value })
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
  try {
    const res = await api.postActivity(payload)
    setLastResult(res)
    if (missionSummary) saveResult(res.activity.id, missionSummary)
    await refresh()
    router.replace({ name: 'result', params: { id: res.activity.id } })
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function finish() {
  const totals = { elapsedS: rec.elapsedS, distanceM: rec.distanceM } // stop() clears these
  const out = stop()
  const missionSummary = finishRun(totals)
  if (out.points.length < 10) {
    toast('That was too short to save. Nothing was recorded.')
    return
  }
  await save({ ...out, source: 'phone' }, 'Saving', missionSummary)
}

function cancel() {
  if (rec.points.length > 20 && !confirm('Discard this activity? It won’t be saved.')) return
  stop()
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
  await save({ mode: mode.value, source: 'phone', startedAt: startAt, points }, 'Running your practice loop')
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

onBeforeUnmount(() => {
  // Leaving mid-recording keeps the recording going only if we're still on screen;
  // a route change stops it so GPS isn't left running.
  if (rec.status !== 'idle') { stop(); endRun() }
})
</script>

<template>
  <div class="rec">
    <div class="maparea">
      <TerritoryMap :centre="store.centre" :zoom="15.5" :track="rec.points" :me="me" :follow="live" :suggestion="plannedRing" :fit="!!plannedRing" />
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
        <MissionPicker v-if="mode !== 'ride'" v-model="missionId" />
        <div v-if="rec.error || error" class="notice bad">{{ rec.error || error }}</div>
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
        <div class="live">
          <div class="stat"><span class="big-num">{{ duration(rec.elapsedS) }}</span><span class="label">Time</span></div>
          <div class="stat"><span class="big-num">{{ km(rec.distanceM) }}</span><span class="label">km</span></div>
          <div class="stat">
            <span class="big-num">{{ rec.mode === 'ride' ? speedKmh(rec.paceSPerKm) : pace(rec.paceSPerKm) }}</span>
            <span class="label">{{ rec.mode === 'ride' ? 'km/h' : 'Pace /km' }}</span>
          </div>
        </div>
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
  width: 44px; height: 44px; border-radius: 50%; background: #fff; color: var(--ink);
  display: grid; place-items: center; box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.loophint {
  position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 64px; right: 12px; z-index: 2;
  background: #fff; border-radius: 12px; padding: 10px 14px; font-weight: 650; font-size: 0.95rem;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.loophint.ready { background: var(--you); color: #fff; }
.routeline {
  position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  background: #fff; border-radius: 12px; padding: 8px 8px 8px 14px; font-weight: 650; font-size: 0.95rem; min-height: 44px;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.routeline span { flex: 1; min-width: 0; }
.routeline.off { background: #FFF4DE; color: #5A3B00; }
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
</style>
