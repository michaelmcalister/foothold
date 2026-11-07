<script setup>
// Run recap: a short flyover of one activity. Flies in from above, follows the
// trail as it draws, reveals the hexes taken and orbits them, then shows an
// overview and the numbers. Uses Google's photorealistic 3D map when a Maps
// key is set up, otherwise the MapLibre street map with the same moves.
// A generative score (lib/audio/score.js) follows the shots; the speaker
// button mutes it, and a "Tap for sound" chip shows if the phone hasn't
// allowed sound yet.
// The "try it now" demo (#/try/flyover) plays the demo run here too, and
// ends on a button to its run report instead of "Done".
// "Make a reel" (ReelMaker) turns the flyover into a short video to share.
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cellToBoundary } from 'h3-js'
import { api } from '../../lib/api/index.js'
import { store } from '../../lib/store.js'
import { km, pace, duration, dateLong, plural, MODE_VERB } from '../../lib/format.js'
import { findLoops, cellsForLoops } from '../../lib/engine/index.js'
import { planRecap } from '../../lib/recap/plan.js'
import { createDirector } from '../../lib/recap/director.js'
import { mapsKey } from '../../lib/recap/config.js'
import PracticeSignup from '../../components/PracticeSignup.vue'
import ReelMaker from '../../components/ReelMaker.vue'
import { demoRun } from '../../lib/recap/demo.js'
import { audio } from '../../lib/audio/settings.js'
import { sound, resume as wakeSound } from '../../lib/audio/sfx.js'
import { createScore } from '../../lib/audio/score.js'

const props = defineProps({
  id: { type: String, default: '' }, // set by the demo route; otherwise from the URL
  trial: { type: Boolean, default: false }, // part of the "try it now" demo
})
const route = useRoute()
const router = useRouter()
const rid = computed(() => props.id || route.params.id)
const el = ref(null)
const activity = ref(null)
const state = ref('loading') // loading | playing | done | empty | error
const mapShown = ref(false) // the map fades in once it has drawn the opening view
const shot = ref('flyin')
const metres = ref(0)
const hexCount = ref(0)
const engine = ref('')
const reelTrack = ref([]) // kept for the reel
let driver = null
let director = null
let plan = null
let gone = false
const music = createScore()
const hasAudio = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
let musicWanted = false // the map is up, so music should play once sound is allowed

const colour = computed(() => store.user?.colour || '#2E55E6')
const shots = computed(() => plan?.timeline || [])
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function back() {
  if (props.trial) router.replace({ name: 'try' })
  else if (window.history.state?.back) router.back()
  else if (rid.value === 'demo') router.replace(store.user?.onboarded ? { name: 'record' } : { name: 'onboarding' })
  else router.replace({ name: 'activity', params: { id: rid.value } })
}

async function makeDriver(start) {
  const key = await mapsKey()
  if (key) {
    try {
      const { createGoogleDriver } = await import('../../lib/recap/google.js')
      const d = await Promise.race([
        createGoogleDriver(el.value, { key, start, colour: colour.value }),
        new Promise((_, no) => setTimeout(() => no(new Error('Google Maps took too long')), 9000)),
      ])
      return d
    } catch {
      el.value?.replaceChildren()
    }
  }
  const { createMapLibreDriver } = await import('../../lib/recap/maplibre.js')
  return createMapLibreDriver(el.value, { start, colour: colour.value })
}

// ---- music ----
const blocked = computed(() => sound.state === 'suspended' || sound.state === 'interrupted')
const needsTap = computed(() => hasAudio && audio.recapMusic && mapShown.value && blocked.value && state.value !== 'error')

function startMusic() {
  musicWanted = true
  if (!audio.recapMusic || !hasAudio || state.value !== 'playing') return
  wakeSound()
  if (sound.state === 'running') music.start(shot.value) // otherwise it starts when sound is allowed
}
watch(() => sound.state, (st) => { if (st === 'running' && musicWanted && !music.playing && audio.recapMusic && state.value === 'playing') music.start(shot.value) })

function toggleMusic() {
  audio.recapMusic = !audio.recapMusic
  if (audio.recapMusic) startMusic()
  else music.stop({ fade: 0.3 })
}
function tapForSound() { wakeSound() }

function direct() {
  director = createDirector(driver, plan, {
    onShot: (id) => {
      shot.value = id
      state.value = 'playing'
      if (musicWanted && audio.recapMusic && sound.state === 'running') music.setSection(id)
    },
    onProgress: (p) => {
      metres.value = p.metres
      if (p.shot === 'follow') music.setIntensity(0.3 + 0.7 * p.f) // busier as the trail draws
    },
    onDone: () => { state.value = 'done' },
  })
}

function play(from = 'flyin') {
  if (!director) return
  if (reduceMotion && from === 'flyin') from = 'overview'
  state.value = 'playing'
  director.play(from)
}

onMounted(async () => {
  try {
    const isDemo = rid.value === 'demo'
    const r = isDemo ? demoRun() : await api.activity(rid.value)
    activity.value = r.activity
    const track = (reelTrack.value = r.track || [])
    const loops = findLoops(track)
    const hexes = cellsForLoops(loops)
    hexCount.value = !isDemo && r.activity?.claimed != null ? (r.activity.claimed || 0) + (r.activity.taken || 0) : hexes.length
    plan = planRecap(track, { mode: r.activity?.mode, hexRings: hexes.map((h) => cellToBoundary(h, true)), aspect: (el.value?.clientWidth || 390) / (el.value?.clientHeight || 844) })
    if (!plan) { state.value = 'empty'; return }
    if (gone) return
    driver = await makeDriver(plan.shots.wide)
    if (gone) { driver.destroy(); return }
    engine.value = driver.kind
    await driver.ready()
    if (gone) return
    direct()
    play()
    mapShown.value = true
    startMusic()
    // A refused Google key only shows up after the map starts. Swap to the street map.
    if (driver.kind === 'google') {
      setTimeout(async () => {
        if (gone || !driver?.failed) return
        director.stop()
        driver.destroy()
        el.value?.replaceChildren()
        const { createMapLibreDriver } = await import('../../lib/recap/maplibre.js')
        driver = await createMapLibreDriver(el.value, { start: plan.shots.wide, colour: colour.value })
        engine.value = driver.kind
        await driver.ready()
        if (gone) return
        direct()
        play()
      }, 3000)
    }
  } catch {
    state.value = 'error'
  }
})

onBeforeUnmount(() => {
  gone = true
  music.stop({ fade: 0.3 })
  director?.stop()
  driver?.destroy()
})
</script>

<template>
  <div class="recap" :style="{ '--you': colour }">
    <div ref="el" class="map" :class="{ shown: mapShown }" aria-hidden="true"></div>

    <header class="top">
      <button class="close" type="button" aria-label="Close recap" @click="back">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
      </button>
      <div v-if="activity" class="when">
        <template v-if="activity.demo"><strong>Demo run</strong><span>Over the Harbour Bridge</span></template>
        <template v-else>
          <strong>Your {{ MODE_VERB[activity.mode] || 'run' }}</strong>
          <span>{{ dateLong(activity.startedAt) }}</span>
        </template>
      </div>
      <button v-if="hasAudio" class="close speaker" type="button" :aria-label="audio.recapMusic ? 'Turn the music off' : 'Turn the music on'" @click="toggleMusic">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
          <template v-if="audio.recapMusic">
            <path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </template>
          <path v-else d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </header>
    <button v-if="needsTap" class="soundchip" type="button" @click="tapForSound">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" /></svg>
      Tap for sound
    </button>

    <Transition name="fade">
      <div v-if="state === 'loading'" class="loading" role="status" aria-live="polite">
        <svg class="hexload" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
          <polygon class="track" points="32,4 56,18 56,46 32,60 8,46 8,18" />
          <polygon class="draw" points="32,4 56,18 56,46 32,60 8,46 8,18" pathLength="100" />
        </svg>
        <strong>Loading your flyover</strong>
        <span>{{ rid === 'demo' ? 'Lining up the cameras over the Harbour Bridge' : 'Lining up the cameras over your loop' }}</span>
      </div>
    </Transition>
    <div v-if="state === 'empty'" class="middle card">
      <p>This one is too short to fly over. Record a longer loop and try again.</p>
      <button class="btn" type="button" @click="back">Back</button>
    </div>
    <div v-else-if="state === 'error'" class="middle card">
      <p>The recap couldn't load. Check your connection and try again.</p>
      <button class="btn" type="button" @click="back">Back</button>
    </div>

    <footer v-if="state === 'playing'" class="bottom">
      <p class="count" aria-live="off">
        <span class="num">{{ km(shot === 'flyin' ? 0 : metres) }}</span><span class="unit">km</span>
      </p>
      <p v-if="shot === 'orbit' || shot === 'overview'" class="taken">{{ plural(hexCount, 'hex', 'hexes') }} taken</p>
      <nav class="shots" aria-label="Camera angle">
        <button v-for="s in shots" :key="s.id" type="button" :aria-pressed="shot === s.id" @click="play(s.id)">{{ s.label }}</button>
      </nav>
    </footer>

    <section v-if="state === 'done' && activity" class="end" aria-label="Recap summary">
      <div class="stats">
        <div><span class="num">{{ km(activity.distanceM) }}</span><span class="lbl">km</span></div>
        <div><span class="num">{{ duration(activity.movingS || activity.durationS) }}</span><span class="lbl">moving</span></div>
        <div v-if="activity.mode !== 'ride'"><span class="num">{{ pace(activity.paceSPerKm) }}</span><span class="lbl">per km</span></div>
        <div><span class="num">{{ hexCount }}</span><span class="lbl">{{ hexCount === 1 ? 'hex' : 'hexes' }}</span></div>
      </div>
      <div v-if="trial" class="actions">
        <RouterLink class="btn" :to="{ name: 'try-report' }">See your run report</RouterLink>
        <button class="btn ghost" type="button" @click="play()">Watch again</button>
        <ReelMaker class="btn ghost reelbtn" :activity="activity" :track="reelTrack" :hex-count="hexCount" />
      </div>
      <div v-else class="actions">
        <button class="btn" type="button" @click="play()">Watch again</button>
        <ReelMaker class="btn ghost reelbtn" :activity="activity" :track="reelTrack" :hex-count="hexCount" />
        <button class="btn ghost" type="button" @click="back">{{ rid === 'demo' ? 'Done' : 'See your run report' }}</button>
      </div>
      <PracticeSignup v-if="rid !== 'demo'" dark class="keep" :simulated="!!activity?.simulated" />
      <p v-if="engine === 'google'" class="credit">3D imagery from Google</p>
    </section>
  </div>
</template>

<style scoped>
.recap {
  position: fixed; inset: 0; z-index: 50; background: #16302A; color: #fff; overflow: hidden;
}
.map { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.map.shown { opacity: 1; }
.loading {
  position: absolute; inset: 0; z-index: 2; display: grid; place-content: center; justify-items: center; gap: 8px;
  text-align: center; padding: 24px; background: #16302A;
}
.loading strong { font-weight: 800; font-stretch: 112%; font-size: 1.35rem; margin-top: 10px; }
.loading span { opacity: 0.75; font-size: 0.95rem; max-width: 30ch; }
.hexload polygon { fill: none; stroke-width: 4; stroke-linejoin: round; }
.hexload .track { stroke: rgba(255, 255, 255, 0.14); }
.hexload .draw { stroke: var(--you); stroke-dasharray: 30 70; animation: hexrun 1.4s linear infinite; }
@keyframes hexrun { to { stroke-dashoffset: -100; } }
.fade-leave-active { transition: opacity 0.6s ease; }
.fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .hexload .draw { animation: none; stroke-dasharray: none; }
  .map, .fade-leave-active { transition: none; }
}
.top {
  position: absolute; top: 0; left: 0; right: 0; z-index: 3; display: flex; align-items: center; gap: 12px;
  padding: calc(env(safe-area-inset-top) + 12px) 16px 28px;
  background: linear-gradient(rgba(22, 48, 42, 0.7), rgba(22, 48, 42, 0));
  pointer-events: none;
}
.close {
  pointer-events: auto; width: 44px; height: 44px; border-radius: 50%; border: 0; display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.16); color: #fff; backdrop-filter: blur(8px); cursor: pointer;
}
.speaker { margin-left: auto; }
.soundchip {
  position: absolute; z-index: 3; left: 50%; transform: translateX(-50%); top: calc(env(safe-area-inset-top) + 70px);
  display: inline-flex; align-items: center; gap: 6px; font: inherit; font-weight: 700; font-size: 0.88rem; color: #16302A;
  background: #fff; border: 0; border-radius: 999px; padding: 8px 14px; min-height: 38px; cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}
.soundchip:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.close:focus-visible, .shots button:focus-visible, .btn:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.when { display: grid; line-height: 1.2; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35); }
.when strong { font-weight: 800; font-stretch: 108%; }
.when span { font-size: 0.85rem; opacity: 0.85; }

.middle { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; gap: 14px; padding: 24px; }
.middle.card p { max-width: 30ch; }

.bottom {
  position: absolute; left: 0; right: 0; bottom: 0; display: grid; gap: 10px;
  padding: 48px 16px calc(env(safe-area-inset-bottom) + 18px);
  background: linear-gradient(rgba(22, 48, 42, 0), rgba(22, 48, 42, 0.78));
  pointer-events: none;
}
.count { display: flex; align-items: baseline; gap: 6px; text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35); }
.count .num {
  font-weight: 850; font-stretch: 122%; font-size: calc(17vw / var(--zoom, 1)); line-height: 0.9;
  letter-spacing: -0.03em; font-variant-numeric: tabular-nums;
}
@media (min-width: 560px) { .count .num { font-size: 5.4rem; } }
.count .unit { font-weight: 700; font-size: 1.3rem; opacity: 0.9; }
.taken { font-weight: 700; font-size: 1.05rem; }
.taken::before {
  content: ''; display: inline-block; width: 0.8em; height: 0.8em; margin-right: 8px; vertical-align: -0.05em;
  background: var(--you); clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%);
}
.shots { display: flex; gap: 6px; flex-wrap: wrap; pointer-events: auto; }
.shots button {
  font: inherit; font-weight: 650; font-size: 0.88rem; color: #fff; border: 0; border-radius: 999px; padding: 8px 14px;
  min-height: 38px; background: rgba(255, 255, 255, 0.14); backdrop-filter: blur(8px); cursor: pointer;
}
.shots button[aria-pressed='true'] { background: #fff; color: #16302A; }

.end {
  position: absolute; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom) + 12px);
  max-width: 520px; margin: 0 auto; display: grid; gap: 16px; padding: 18px;
  background: rgba(22, 48, 42, 0.92); border-radius: 18px; backdrop-filter: blur(10px);
  animation: rise 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes rise { from { transform: translateY(24px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .end { animation: none; } }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 12px; }
.stats div { display: grid; gap: 2px; }
.stats .num { font-weight: 850; font-stretch: 112%; font-size: 1.6rem; line-height: 1; font-variant-numeric: tabular-nums; }
.stats .lbl { font-size: 0.82rem; opacity: 0.75; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
.keep { margin-top: 14px; }
.actions .btn { flex: 1; }
.actions .reelbtn { flex-basis: 100%; }
.btn.ghost { background: rgba(255, 255, 255, 0.12); color: #fff; box-shadow: none; }
.credit { font-size: 0.75rem; opacity: 0.6; }
</style>
