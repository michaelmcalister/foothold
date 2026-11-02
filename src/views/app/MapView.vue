<script setup>
// Home: the territory map with your ground, rivals' ground and wild
// ground, a strip of your numbers, and the one question worth asking today.
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import { api } from '../../lib/api/index.js'
import { store, locate } from '../../lib/store.js'
import { plural } from '../../lib/format.js'
import { todaysNudge } from '../../lib/nudge.js'

const router = useRouter()
const cells = ref([])
const picked = ref(null)
const bbox = ref(null)
const nudge = ref(null)
const suggestion = ref(null)
const suggesting = ref(false)
let t = 0

async function load() {
  if (!bbox.value) return
  const pad = 0.02
  const [w, s, e, n] = bbox.value
  const { cells: c } = await api.territory({ mode: store.mode, bbox: [w - pad, s - pad, e + pad, n + pad] })
  cells.value = c
}
function onMoved({ bbox: b }) {
  bbox.value = b
  clearTimeout(t)
  t = setTimeout(load, 250)
}
watch(() => store.mode, () => { picked.value = null; suggestion.value = null; load() })

onMounted(async () => {
  nudge.value = await todaysNudge()
})

const mineCount = computed(() => store.stats?.hexes ?? 0)
const level = computed(() => store.stats?.level)

async function recentre() {
  await locate()
  load()
}

async function suggest() {
  suggesting.value = true
  try {
    const { suggestLoopFor } = await import('../../lib/suggest.js')
    suggestion.value = await suggestLoopFor(store.centre, store.mode)
  } finally {
    suggesting.value = false
  }
}
</script>

<template>
  <div class="mapview">
    <TerritoryMap
      class="map"
      :centre="store.centre"
      :cells="cells"
      :zones="store.user?.zones || []"
      :me="store.located ? store.centre : null"
      :suggestion="suggestion?.ring || null"
      @moved="onMoved"
      @cell="picked = $event"
    />

    <div class="strip" aria-live="polite">
      <div class="stat">
        <span class="n">{{ mineCount }}</span>
        <span class="l">{{ mineCount === 1 ? 'hex held' : 'hexes held' }}</span>
      </div>
      <div class="stat">
        <span class="n">{{ level ? level.name : 'None yet' }}</span>
        <span class="l">{{ store.stats?.next ? `${store.stats.toNext} to ${store.stats.next.name}` : level ? 'Top of the ladder' : 'Close a loop to start' }}</span>
      </div>
      <div v-if="store.stats?.fadingSoon" class="stat warn">
        <span class="n">{{ store.stats.fadingSoon }}</span>
        <span class="l">fading soon</span>
      </div>
    </div>

    <button class="locate" type="button" aria-label="Centre on me" @click="recentre">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
    </button>

    <div class="sheet">
      <template v-if="picked">
        <div class="pick">
          <span class="hexdot" :style="{ background: picked.colour }" aria-hidden="true"></span>
          <div>
            <strong>{{ picked.mine ? 'Your ground' : `${picked.name}'s ground` }}</strong>
            <p class="small muted">
              Strength {{ picked.strength }} of 100.
              <template v-if="picked.mine">Goes wild in {{ plural(picked.days, 'day') }} if nobody runs it.</template>
              <template v-else>A {{ store.mode }} worth more than {{ picked.strength }} takes it.</template>
            </p>
          </div>
          <button class="close" type="button" aria-label="Close" @click="picked = null">×</button>
        </div>
        <RouterLink class="btn block" :to="{ name: 'record' }">{{ picked.mine ? 'Run it again' : 'Go take it' }}</RouterLink>
      </template>
      <template v-else-if="suggestion">
        <div class="pick">
          <span class="hexdot" style="background: #16302A" aria-hidden="true"></span>
          <div>
            <strong>Suggested loop</strong>
            <p class="small muted">{{ suggestion.note }}</p>
          </div>
          <button class="close" type="button" aria-label="Close" @click="suggestion = null">×</button>
        </div>
        <div class="actions">
          <RouterLink class="btn" :to="{ name: 'record' }">Start this loop</RouterLink>
          <RouterLink class="btn quiet" :to="{ name: 'plan', query: { suggest: 1, km: suggestion.distanceKm } }">Edit in planner</RouterLink>
        </div>
      </template>
      <template v-else>
        <div v-if="nudge" class="nudge">
          <strong>{{ nudge.title }}</strong>
          <p class="small muted">{{ nudge.body }}</p>
        </div>
        <div class="actions">
          <RouterLink class="btn" :to="{ name: 'record' }">Start a {{ store.mode }}</RouterLink>
          <button class="btn quiet" type="button" :disabled="suggesting" @click="suggest">{{ suggesting ? 'Finding a loop' : 'Suggest a loop' }}</button>
        </div>
        <RouterLink class="planlink small" :to="{ name: 'plan' }">Plan a route and see what it takes</RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mapview { position: relative; height: calc(100dvh - var(--top-h) - var(--bar-h) - env(safe-area-inset-bottom)); }
.map { position: absolute; inset: 0; }
.strip {
  position: absolute; top: 10px; left: 10px; right: 10px; z-index: 2;
  display: flex; gap: 8px; flex-wrap: wrap;
}
.strip .stat {
  background: rgba(255, 255, 255, 0.95); border-radius: 12px; padding: 8px 12px;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.35); display: grid; gap: 0;
}
.strip .n { font-weight: 850; font-stretch: 112%; font-size: 1.15rem; line-height: 1.1; }
.strip .l { font-size: 0.75rem; color: var(--ink-60); }
.strip .warn .n { color: var(--warn); }
.locate {
  position: absolute; right: 12px; bottom: 150px; z-index: 2;
  width: 44px; height: 44px; border-radius: 50%; border: 0; background: #fff; color: var(--you);
  display: grid; place-items: center; box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45); cursor: pointer;
}
.sheet {
  position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 2;
  background: #fff; border-radius: 16px; padding: 14px; display: grid; gap: 12px;
  box-shadow: 0 10px 30px -14px rgba(22, 48, 42, 0.55);
  max-width: 520px; margin: 0 auto;
}
.nudge { display: grid; gap: 2px; }
.planlink { justify-self: center; color: var(--ink); font-weight: 650; text-decoration: underline; text-underline-offset: 3px; padding: 10px; margin: -8px 0 -6px; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pick { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start; }
.pick .hexdot { width: 20px; height: 18px; margin-top: 3px; }
.close { border: 0; background: var(--soft); width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; color: var(--ink); }
</style>
