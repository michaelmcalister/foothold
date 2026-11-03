<script setup>
// "Try it now", last step: the demo run's full report (ground taken, coach's
// notes, run stats with elevation, pace and heart rate, splits) and then the
// ask: sign up free to record a run of your own. Labelled as a demo
// throughout; nothing here is saved.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import RunStats from '../../components/RunStats.vue'
import CoachNotes from '../../components/CoachNotes.vue'
import { demoRun } from '../../lib/recap/demo.js'
import { findLoops, cellsForLoops } from '../../lib/engine/index.js'
import { debrief } from '../../lib/coach/debrief.js'
import { km, pace, duration, plural } from '../../lib/format.js'
import { auth, login } from '../../lib/auth.js'

const router = useRouter()
const { activity, track } = demoRun()
const loops = findLoops(track)
const hexes = cellsForLoops(loops)
const cells = hexes.map((h3) => ({ h3, mine: true, strength: 1 }))
const a = { ...activity, loops: loops.length, claimed: hexes.length, taken: 0 }
const notes = computed(() => debrief({ activity: a, track, result: { diff: { claimed: hexes, taken: [], reinforced: [] }, battles: [] } }))

function signUp() {
  if (auth.enabled) login({ signup: true, returnTo: '#/app' })
  else router.push('/app')
}
</script>

<template>
  <div class="report">
    <div class="maparea">
      <TerritoryMap :centre="track[0]" :cells="cells" :highlight="hexes" :track="track" :loops="loops.map((l) => l.ring)" fit />
      <RouterLink class="close" :to="{ name: 'try' }" aria-label="Back to the demo start">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
      </RouterLink>
    </div>

    <div class="screen">
      <header class="screen-head">
        <p class="chip">Demo run around Sydney Harbour</p>
        <h1>Loop closed. {{ plural(hexes.length, 'hex', 'hexes') }} are yours.</h1>
        <p class="muted">On a real run, this ground turns your colour on the map until a rival runs it back.</p>
      </header>

      <CoachNotes :notes="notes" />

      <div class="stat-row">
        <div class="stat"><span class="big-num">{{ km(a.distanceM) }}</span><span class="label">km</span></div>
        <div class="stat"><span class="big-num">{{ duration(a.movingS) }}</span><span class="label">Moving time</span></div>
        <div class="stat"><span class="big-num">{{ pace(a.paceSPerKm) }}</span><span class="label">Pace /km</span></div>
      </div>

      <RunStats :activity="a" :track="track" />
      <p class="small muted">Heart rate and cadence are sample numbers for this demo. Yours come from your watch.</p>

      <section class="ask" aria-labelledby="ask-h">
        <h2 id="ask-h">Now take your own ground</h2>
        <p>Sign up free and record your first run. Close a loop and it turns your colour for everyone nearby to see.</p>
        <button class="btn block" type="button" @click="signUp">Sign up free</button>
        <RouterLink class="btn secondary block" to="/app">Try the practice map first</RouterLink>
        <RouterLink class="again" :to="{ name: 'try-flyover' }">Watch the flyover again</RouterLink>
      </section>
    </div>

    <div class="dock">
      <span>Ready to record a run of your own?</span>
      <button class="btn" type="button" @click="signUp">Sign up free</button>
    </div>
  </div>
</template>

<style scoped>
.report { min-height: 100dvh; }
.maparea { height: 40vh; min-height: 240px; position: relative; }
.maparea > :first-child { position: absolute; inset: 0; }
.close { position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 12px; z-index: 2; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: #fff; color: var(--ink); box-shadow: 0 2px 8px rgba(22, 48, 42, 0.18); }
.screen { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
.chip { display: inline-block; margin: 0 0 6px; padding: 4px 10px; border-radius: 999px; background: #E8EDFC; color: var(--ink); font-size: 0.8rem; font-weight: 650; }
.ask { display: grid; gap: 10px; padding: 20px; border-radius: var(--radius, 14px); background: #16302A; color: #fff; }
.ask h2 { margin: 0; font-stretch: 112%; }
.ask p { margin: 0 0 4px; opacity: 0.85; }
.ask .btn.secondary { background: rgba(255, 255, 255, 0.12); color: #fff; box-shadow: none; }
.again { color: #fff; justify-self: center; font-weight: 650; text-underline-offset: 3px; padding: 6px; }
.dock { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px var(--pad, 16px) calc(10px + env(safe-area-inset-bottom)); background: rgba(255, 255, 255, 0.96); border-top: 1px solid var(--line); backdrop-filter: blur(8px); }
.dock span { font-weight: 650; font-size: 0.9rem; line-height: 1.25; }
.dock .btn { flex: none; }
</style>
