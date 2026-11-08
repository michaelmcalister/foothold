<script setup>
// Your fitness over the last 6 months: predicted 5K, weekly kilometres, easy run pace and heart rate, FormTrack readiness, and race predictions.
import { ref, computed, onMounted } from 'vue'
import { api } from '../../lib/api/index.js'
import { store } from '../../lib/store.js'
import { pace } from '../../lib/format.js'
import { fitnessTrend, fiveKSeries, isEasyRun, formatTime } from '../../lib/coach/index.js'
import { readinessHistory, recordReadiness } from '../../lib/readiness.js'
import TrendChart from '../../components/TrendChart.vue'

const activities = ref([])
const tracks = ref({})
const readiness = ref({})
const loading = ref(true)
const linked = computed(() => !!store.user?.formtrack?.linked)

const trend = computed(() => fitnessTrend({ activities: activities.value, tracks: tracks.value, readiness: readiness.value }))
const weeks = computed(() => trend.value.weeks)
const series = (k) => (k === 'fiveKS' ? fiveKSeries(weeks.value) : weeks.value.map((w) => ({ label: w.label, value: w[k] })))
const CONF = { high: 'Good guide', medium: 'Fair guide', low: 'Rough guide' }
const kmFmt = (v) => `${Math.round(v)} km`
const paceFmt = (v) => `${pace(v)} /km`

// Heart rate lives in the tracks: fetch them for recent easy runs only, a few at a time
async function loadHr(list) {
  const fit = fitnessTrend({ activities: list }).current
  if (!fit) return
  const easy = list.filter((a) => isEasyRun(a, fit.fiveKS)).slice(0, 30)
  const out = {}
  for (let i = 0; i < easy.length; i += 5) {
    const got = await Promise.all(easy.slice(i, i + 5).map((a) => api.activity(a.id).then((r) => [a.id, r.track]).catch(() => null)))
    for (const g of got) if (g && g[1]?.some((p) => Number.isFinite(p.hr))) out[g[0]] = g[1]
  }
  tracks.value = out
}

onMounted(async () => {
  readiness.value = readinessHistory()
  try {
    activities.value = (await api.activities({ limit: 200 })).activities
  } catch { activities.value = [] }
  loading.value = false
  if (linked.value) {
    api.formtrackSummary().then((s) => { recordReadiness(s); readiness.value = readinessHistory() }).catch(() => {})
  }
  loadHr(activities.value)
})

const summaryOf = (name, rows, fmt) => {
  const xs = rows.filter((r) => r.value != null)
  if (!xs.length) return `${name}: no data yet.`
  return `${name} over ${rows.length} weeks. First ${fmt(xs[0].value)} in the week of ${xs[0].label}, latest ${fmt(xs[xs.length - 1].value)} in the week of ${xs[xs.length - 1].label}.`
}
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <RouterLink class="back small" :to="{ name: 'you' }">Back to You</RouterLink>
      <h1>Your fitness</h1>
      <p v-if="!loading" class="lead">{{ trend.headline.text }}</p>
      <p v-if="trend.headline.note" class="small muted">{{ trend.headline.note }}</p>
    </header>

    <template v-if="!loading && trend.current">
      <div class="fithero">
        <div class="stat">
          <span class="label">Predicted 5K</span>
          <span class="big-num">{{ formatTime(trend.current.fiveKS) }}</span>
        </div>
        <span class="chip">{{ CONF[trend.current.confidence] }}</span>
      </div>

      <section class="multiples" aria-label="Fitness charts, last 6 months">
        <div class="panel">
          <TrendChart :rows="series('fiveKS')" :format="formatTime" :step="15" title="Predicted 5K" value-name="Predicted 5K"
            :summary="summaryOf('Predicted 5K time', series('fiveKS'), formatTime) + ' Lower is faster.'" />
          <p class="hint">Lower is faster. Each week uses your best runs from the 8 weeks before it, so one great day doesn't skew it.</p>
        </div>
        <div class="panel">
          <TrendChart :rows="series('km')" kind="bar" :format="kmFmt" :step="5" title="Kilometres per week" value-name="Kilometres"
            :summary="summaryOf('Kilometres per week', series('km'), kmFmt)" />
          <p class="hint">This week is the dark bar.</p>
        </div>
        <div class="panel">
          <TrendChart :rows="series('easyPaceS')" :format="paceFmt" :step="15" title="Easy run pace" value-name="Easy pace"
            :summary="summaryOf('Easy run pace', series('easyPaceS'), paceFmt) + ' Lower is quicker.'" />
          <p class="hint">Lower is quicker. Getting quicker at the same easy effort is fitness you can feel.</p>
        </div>
        <div v-if="trend.hasHr" class="panel">
          <TrendChart :rows="series('beatsPerKm')" :format="(v) => `${Math.round(v)} beats`" :step="10" title="Heartbeats per km on easy runs" value-name="Beats per km"
            :summary="summaryOf('Heartbeats per km on easy runs', series('beatsPerKm'), (v) => `${Math.round(v)} beats`) + ' Lower means a fitter engine.'" />
          <p class="hint">Fewer beats for each km means your heart is working less for the same running.</p>
        </div>
        <div v-if="trend.hasReadiness" class="panel">
          <TrendChart :rows="series('readiness')" :format="(v) => `${Math.round(v)}`" :step="10" title="Readiness from FormTrack" value-name="Readiness (0 to 100)"
            :summary="summaryOf('FormTrack readiness', series('readiness'), (v) => `${Math.round(v)} of 100`)" />
          <p class="hint">Weekly average, out of 100, from sleep, HRV and resting heart rate. Saved on this phone each day you open the app.</p>
        </div>
      </section>

      <p v-if="!trend.hasHr" class="small muted">Heart rate on easy runs shows here when your watch sends it with your runs.</p>
      <p v-if="!linked" class="small muted">Link FormTrack in <RouterLink :to="{ name: 'settings' }">Settings</RouterLink> to see your readiness next to your running.</p>
      <p v-else class="small muted">FormTrack shares a daily readiness score but not resting heart rate history, so resting heart rate isn't charted.</p>

      <section class="panel races" aria-labelledby="races">
        <h2 id="races">Race predictions</h2>
        <ul class="rows plain">
          <li v-for="r in trend.races" :key="r.key" class="race">
            <strong>{{ r.label }}</strong>
            <span class="time">{{ formatTime(r.timeS) }}</span>
            <span class="chip">{{ CONF[r.confidence] }}</span>
          </li>
        </ul>
        <p class="hint">From your recent runs, if you train for the distance. Longer races are more of a stretch to predict, so they get a rougher guide.</p>
      </section>
    </template>

    <div v-else-if="!loading" class="empty">
      <p class="muted">Record a few runs of 3 km or more and your fitness trend appears here.</p>
      <RouterLink class="btn" :to="{ name: 'record' }">Record a run</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.back { color: var(--you-ink); font-weight: 650; text-decoration: none; width: fit-content; }
.lead { font-size: 1.15rem; font-weight: 700; line-height: 1.3; margin: 0; }
.screen-head p { margin: 0; }
.fithero { display: flex; align-items: end; justify-content: space-between; gap: 12px; }
.multiples { display: grid; gap: 12px; }
@media (min-width: 640px) { .multiples { grid-template-columns: 1fr 1fr; } }
.multiples .panel { display: grid; gap: 8px; align-content: start; padding: 14px; }
.multiples .hint { margin: 0; }
.races { display: grid; gap: 8px; }
.races h2 { font-size: 1.1rem; margin: 0; }
.plain { list-style: none; margin: 0; padding: 0; }
.race { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; }
.time { font-weight: 800; font-stretch: 108%; font-size: 1.1rem; font-variant-numeric: tabular-nums; }
.races .hint { margin: 0; }
</style>
