<script setup>
// The story season on the map (lib/storySeason.js, worker/storySeason.js):
// this week's featured series, everyone's distance towards the goal, and
// when the finale opens. Hidden once the season is over.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../lib/api/index.js'
import { metaById, CATALOGUE_SAGAS } from '../lib/missions/catalogue.js'
import { lookFor } from '../lib/missions/covers.js'

const router = useRouter()
const s = ref(null)
onMounted(async () => { s.value = await api.storySeason().catch(() => null) })

const featured = computed(() => CATALOGUE_SAGAS.find((g) => g.id === s.value?.featured) || null)
const look = computed(() => lookFor(s.value?.featured || 'gathering'))
const pct = computed(() => (s.value ? Math.min(100, Math.round((s.value.km / s.value.goalKm) * 100)) : 0))
const day = (t) => new Date(t).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
const finale = computed(() => metaById(s.value?.finaleMission))

function runFinale() { router.push({ name: 'record', query: { mission: s.value.finaleMission } }) }
</script>

<template>
  <section v-if="s && !s.over" class="season" :style="{ '--accent': look.accent, '--deep': look.deep }" aria-labelledby="season-title">
    <p class="kicker">{{ s.started ? `Week ${s.week} of 6` : `Starts ${day(s.endsAt - 42 * 86400000)}` }}</p>
    <h2 id="season-title" class="title">{{ s.title }}</h2>
    <p v-if="featured" class="feat">This week’s featured series: <strong>{{ featured.title }}</strong></p>
    <p v-else-if="!s.started" class="feat">Six weeks, a featured series each week, and a finale that everyone unlocks together.</p>
    <div class="goal" role="img" :aria-label="`${s.km} of ${s.goalKm} kilometres run together`">
      <div class="bar"><span :style="{ width: pct + '%' }" /></div>
      <p class="small">{{ s.km.toLocaleString('en-AU') }} of {{ s.goalKm.toLocaleString('en-AU') }} km, run together<template v-if="s.people"> by {{ s.people }} {{ s.people === 1 ? 'runner' : 'runners' }}</template></p>
    </div>
    <button v-if="s.finaleOpen && finale" type="button" class="go" @click="runFinale">Run the finale: {{ finale.title }}</button>
    <p v-else class="small note">The finale opens when we reach {{ s.goalKm.toLocaleString('en-AU') }} km, or on {{ day(s.finaleWeekendAt) }}, whichever comes first.</p>
  </section>
</template>

<style scoped>
.season { display: grid; gap: 6px; padding: 14px; border-radius: 16px; background: var(--deep); color: #fff; }
.kicker { margin: 0; font-size: 0.78rem; font-weight: 750; color: var(--accent); }
.title { margin: 0; font-size: 1.1rem; font-weight: 850; }
.feat { margin: 0; font-size: 0.88rem; opacity: 0.9; }
.goal { display: grid; gap: 4px; }
.bar { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.18); overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--accent); border-radius: 4px; }
.small { margin: 0; font-size: 0.8rem; opacity: 0.85; }
.go { min-height: 44px; border: 0; border-radius: 999px; background: var(--accent); color: var(--deep); font: inherit; font-weight: 850; padding: 0 16px; justify-self: start; }
.go:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
</style>
