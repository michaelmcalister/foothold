<script setup>
// The weekly recap: distance, time and outings, ground taken, held and lost,
// quests done, the biggest loop, a best moment and a kind look back at the
// week before, with a little map of where you went. ?w=YYYY-MM-DD for a past week.
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import QuestList from '../../components/QuestList.vue'
import { api } from '../../lib/api/index.js'
import { store } from '../../lib/store.js'
import { km, plural, MODE_LABEL } from '../../lib/format.js'
import { weekFor, weekLabel, weekdayOf, nextWeek, cellCentre } from '../../lib/engine/index.js'

const route = useRoute()
const router = useRouter()
const recap = ref(null)
const error = ref('')

async function load() {
  error.value = ''
  try {
    recap.value = (await api.week({ w: route.query.w || undefined })).recap
  } catch (e) {
    recap.value = null
    error.value = e.message || 'That week would not load. Try again in a moment.'
  }
}
watch(() => route.query.w, load, { immediate: true })

const r = computed(() => recap.value)
const label = computed(() => (r.value ? weekLabel(weekFor(r.value.week.key)) : ''))
const title = computed(() => (r.value?.week.current ? 'Your week so far' : 'Your week'))
const nextKey = computed(() => {
  if (!r.value || r.value.week.current) return null
  return nextWeek(weekFor(r.value.week.key))
})
function go(w) {
  router.replace({ name: 'week', query: w && !w.current ? { w: w.key } : {} })
}
const goNext = () => {
  const n = nextKey.value
  router.replace({ name: 'week', query: n && n.end <= Date.now() ? { w: n.key } : {} })
}

// Moving time as a short number and its unit, so it fits a third of a phone
const moving = computed(() => {
  const m = Math.round((r.value?.movingS || 0) / 60)
  return m < 60 ? { n: String(m), unit: 'min moving' } : { n: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`, unit: 'hours moving' }
})

const cells = computed(() => (r.value?.visited || []).map((h3) => ({ h3, mine: true, strength: 40 })))
const mapCentre = computed(() => (r.value?.visited?.length ? cellCentre(r.value.visited[0]) : store.centre))

// Ground that went back, said gently
const lostText = computed(() => {
  const x = r.value?.hexes
  if (!x || !x.lost) return 'None went back. Solid.'
  const parts = []
  if (x.lostToRivals) parts.push(`rivals ran through ${x.lostToRivals}`)
  if (x.faded) parts.push(`${x.faded} faded to wild`)
  return `${parts.join(' and ')}. A run brings it back.`.replace(/^./, (c) => c.toUpperCase())
})
const big = computed(() => r.value?.biggestLoop)
const bigText = computed(() => {
  const b = big.value
  if (!b) return ''
  return `${plural(b.hexes, 'hex', 'hexes')} on ${weekdayOf(b.startedAt)}’s ${km(b.distanceM, 1)} km ${MODE_LABEL[b.mode]?.toLowerCase() || 'run'}.`
})
</script>

<template>
  <div class="screen">
    <header class="screen-head head">
      <div>
        <h1>{{ title }}</h1>
        <p class="muted">{{ label }}</p>
      </div>
      <div v-if="r" class="nav" role="group" aria-label="Pick a week">
        <button class="btn quiet small" type="button" aria-label="The week before" @click="go({ key: r.week.previous })">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <button class="btn quiet small" type="button" aria-label="The week after" :disabled="r.week.current" @click="goNext">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </header>

    <p v-if="error" class="notice">{{ error }}</p>

    <template v-if="r">
      <div class="stat-row">
        <div class="stat"><span class="big-num">{{ km(r.distanceM, 1) }}</span><span class="label">km</span></div>
        <div class="stat"><span class="big-num">{{ moving.n }}</span><span class="label">{{ moving.unit }}</span></div>
        <div class="stat"><span class="big-num">{{ r.outings }}</span><span class="label">{{ r.outings === 1 ? 'outing' : 'outings' }}</span></div>
      </div>

      <p class="compare">{{ r.compare }}</p>

      <div v-if="cells.length" class="maparea" aria-label="Hexes you passed through this week">
        <TerritoryMap :centre="mapCentre" :cells="cells" :interactive="false" fit />
      </div>

      <section v-if="r.outings || r.hexes.lost || r.hexes.held" aria-labelledby="ground" class="block">
        <h2 id="ground">Ground</h2>
        <div class="stat-row">
          <div class="stat"><span class="big-num you">{{ r.hexes.taken }}</span><span class="label">hexes taken</span></div>
          <div class="stat"><span class="big-num">{{ r.hexes.held }}</span><span class="label">held now</span></div>
          <div class="stat"><span class="big-num">{{ r.hexes.lost }}</span><span class="label">went back</span></div>
        </div>
        <p class="small muted">
          <template v-if="r.hexes.fromRivals">{{ plural(r.hexes.fromRivals, 'hex', 'hexes') }} of those came from rivals. </template>
          <template v-if="r.explored">{{ plural(r.explored, 'new hex', 'new hexes') }} explored. </template>
          {{ lostText }}
        </p>
      </section>

      <section v-if="r.best || big" aria-labelledby="moments" class="block">
        <h2 id="moments">Moments</h2>
        <ul class="rows plain">
          <li v-if="r.best">
            <RouterLink v-if="r.best.activityId" class="moment" :to="{ name: 'activity', params: { id: r.best.activityId } }">
              <span class="hexdot" aria-hidden="true"></span>
              <span><strong>Best moment</strong><span class="small muted sub">{{ r.best.text }}</span></span>
            </RouterLink>
          </li>
          <li v-if="big">
            <RouterLink class="moment" :to="{ name: 'activity', params: { id: big.activityId } }">
              <span class="hexdot" aria-hidden="true"></span>
              <span><strong>Biggest loop</strong><span class="small muted sub">{{ bigText }}</span></span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="r.quests.length && (r.outings || r.week.current)" aria-labelledby="wquests" class="block">
        <h2 id="wquests">Quests</h2>
        <p class="small muted">{{ r.questsDone }} of {{ r.quests.length }} done{{ r.week.current ? ' so far' : '' }}.</p>
        <QuestList :quests="r.quests" compact />
      </section>

      <div v-if="!r.outings && r.week.current" class="empty">
        <p class="muted">Nothing on the map yet this week. Whenever you’re ready, a short loop counts.</p>
        <RouterLink class="btn" :to="{ name: 'record' }">Start a {{ store.mode }}</RouterLink>
      </div>

      <RouterLink class="btn secondary block" :to="{ name: 'you' }">Back to You</RouterLink>
    </template>
  </div>
</template>

<style scoped>
.head { grid-template-columns: 1fr auto; align-items: start; }
.head h1, .head p { margin: 0; }
.nav { display: flex; gap: 6px; }
.nav .btn { padding: 8px 10px; }
.compare { font-size: 1.05rem; font-weight: 600; margin: 0; }
.maparea { height: 220px; border-radius: var(--radius); overflow: hidden; position: relative; box-shadow: inset 0 0 0 1px var(--line); }
.maparea > :first-child { position: absolute; inset: 0; }
.block { display: grid; gap: 12px; }
.block h2, .block p { margin: 0; }
.big-num.you { color: var(--you-ink); }
.plain { list-style: none; margin: 0; padding: 0; }
.moment { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; text-decoration: none; color: inherit; }
.moment .hexdot { width: 18px; height: 16px; margin-top: 3px; background: var(--you); }
.block { min-width: 0; }
.sub { display: block; }
</style>
