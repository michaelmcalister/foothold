<script setup>
// Run recap: a short flyover of one activity. Flies in from above, follows the
// trail as it draws, reveals the hexes taken and orbits them, then shows an
// overview and the numbers. Uses Google's photorealistic 3D map when a Maps
// key is set up, otherwise the MapLibre street map with the same moves.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cellToBoundary } from 'h3-js'
import { api } from '../../lib/api/index.js'
import { store } from '../../lib/store.js'
import { km, pace, duration, dateLong, plural, MODE_VERB } from '../../lib/format.js'
import { findLoops, cellsForLoops } from '../../lib/engine/index.js'
import { planRecap } from '../../lib/recap/plan.js'
import { createDirector } from '../../lib/recap/director.js'
import { mapsKey } from '../../lib/recap/config.js'
import { demoRun } from '../../lib/recap/demo.js'

const route = useRoute()
const router = useRouter()
const el = ref(null)
const activity = ref(null)
const state = ref('loading') // loading | playing | done | empty | error
const shot = ref('flyin')
const metres = ref(0)
const hexCount = ref(0)
const engine = ref('')
let driver = null
let director = null
let plan = null
let gone = false

const colour = computed(() => store.user?.colour || '#2E55E6')
const shots = computed(() => plan?.timeline || [])
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function back() {
  if (window.history.state?.back) router.back()
  else if (route.params.id === 'demo') router.replace(store.user?.onboarded ? { name: 'record' } : { name: 'onboarding' })
  else router.replace({ name: 'activity', params: { id: route.params.id } })
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

function direct() {
  director = createDirector(driver, plan, {
    onShot: (id) => { shot.value = id; state.value = 'playing' },
    onProgress: (p) => { metres.value = p.metres },
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
    const isDemo = route.params.id === 'demo'
    const r = isDemo ? demoRun() : await api.activity(route.params.id)
    activity.value = r.activity
    const track = r.track || []
    const loops = findLoops(track)
    const hexes = cellsForLoops(loops)
    hexCount.value = !isDemo && r.activity?.claimed != null ? (r.activity.claimed || 0) + (r.activity.taken || 0) : hexes.length
    plan = planRecap(track, { mode: r.activity?.mode, hexRings: hexes.map((h) => cellToBoundary(h, true)), aspect: (el.value?.clientWidth || 390) / (el.value?.clientHeight || 844) })
    if (!plan) { state.value = 'empty'; return }
    if (gone) return
    driver = await makeDriver(plan.shots.wide)
    if (gone) { driver.destroy(); return }
    engine.value = driver.kind
    direct()
    play()
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
  director?.stop()
  driver?.destroy()
})
</script>

<template>
  <div class="recap" :style="{ '--you': colour }">
    <div ref="el" class="map" aria-hidden="true"></div>

    <header class="top">
      <button class="close" type="button" aria-label="Close recap" @click="back">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
      </button>
      <div v-if="activity" class="when">
        <template v-if="activity.demo"><strong>Demo run</strong><span>Around Sydney Harbour</span></template>
        <template v-else>
          <strong>Your {{ MODE_VERB[activity.mode] || 'run' }}</strong>
          <span>{{ dateLong(activity.startedAt) }}</span>
        </template>
      </div>
    </header>

    <div v-if="state === 'loading'" class="middle"><p>Lining up the cameras</p></div>
    <div v-else-if="state === 'empty'" class="middle card">
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
      <div class="actions">
        <button class="btn" type="button" @click="play()">Watch again</button>
        <button class="btn ghost" type="button" @click="back">Done</button>
      </div>
      <p v-if="engine === 'google'" class="credit">3D imagery from Google</p>
    </section>
  </div>
</template>

<style scoped>
.recap {
  position: fixed; inset: 0; z-index: 50; background: #16302A; color: #fff; overflow: hidden;
}
.map { position: absolute; inset: 0; }
.top {
  position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px;
  padding: calc(env(safe-area-inset-top) + 12px) 16px 28px;
  background: linear-gradient(rgba(22, 48, 42, 0.7), rgba(22, 48, 42, 0));
  pointer-events: none;
}
.close {
  pointer-events: auto; width: 44px; height: 44px; border-radius: 50%; border: 0; display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.16); color: #fff; backdrop-filter: blur(8px); cursor: pointer;
}
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
.actions { display: flex; gap: 10px; }
.actions .btn { flex: 1; }
.btn.ghost { background: rgba(255, 255, 255, 0.12); color: #fff; box-shadow: none; }
.credit { font-size: 0.75rem; opacity: 0.6; }
</style>
