<script setup>
// The numbers behind one activity: elapsed and stopped time, fastest km,
// climb, highest point, heart rate and cadence, then the elevation, pace and
// heart rate charts against distance (they share one readout line) and the
// splits per kilometre. Used on the result screen and on activity details.
import { ref, computed, watch } from 'vue'
import ProfileChart from './ProfileChart.vue'
import { withDistance, sampleByDistance, smoothByDistance, paceSeries, kmSplits, runSummary, coverage, heights } from '../lib/runStats.js'
import { elevationFor } from '../lib/elevation.js'
import { pace, duration, speedKmh, MODE_LABEL } from '../lib/format.js'

const props = defineProps({
  activity: { type: Object, required: true },
  track: { type: Array, default: () => [] },
})

const mode = computed(() => props.activity.mode || 'run')
const ride = computed(() => mode.value === 'ride')
const pts = computed(() => withDistance(props.track))
const samples = computed(() => sampleByDistance(pts.value, 240))
const ds = computed(() => samples.value.map((s) => s.d))
const scrub = ref(null)

const elev = ref(null)
const elevState = ref('idle') // idle | loading | done
watch(samples, async (s) => {
  if (s.length < 2) return
  elevState.value = 'loading'
  elev.value = await elevationFor(props.activity, s).catch(() => null)
  elevState.value = 'done'
}, { immediate: true })

const alts = computed(() => elev.value?.alts || null)
const h = computed(() => heights(alts.value))
const summary = computed(() => runSummary({ activity: props.activity, pts: pts.value, alts: alts.value }))

const speedVals = computed(() => {
  const p = smoothByDistance(paceSeries(samples.value, { slowest: ride.value ? 600 : 1200 }), ds.value, 150)
  return ride.value ? p.map((v) => (v ? 3600 / v : null)) : p
})
const hasPace = computed(() => speedVals.value.filter(Number.isFinite).length > samples.value.length * 0.5)
const hrVals = computed(() => coverage(samples.value, 'hr') > 0.5 ? smoothByDistance(samples.value.map((s) => s.hr), ds.value, 60) : null)

const splits = computed(() => kmSplits(pts.value, { samples: samples.value, alts: alts.value }))
const fastestSplit = computed(() => Math.min(...splits.value.filter((s) => s.pace).map((s) => s.pace)))
const showElev = computed(() => splits.value.some((s) => s.elevDelta != null))
const showHr = computed(() => splits.value.some((s) => s.hr != null))

const m = (v) => `${Math.round(v)} m`
const signed = (v) => (v > 0 ? `+${v} m` : v < 0 ? `${String(v).replace('-', '−')} m` : '0 m')
const paceFmt = (v) => `${pace(v)} /km`
const speedFmt = (v) => `${v.toFixed(1)} km/h`

const SOURCE = {
  device: 'Heights from your watch.',
  terrain: 'Heights from terrain data along your route.',
  gps: "Heights from your phone's GPS, which can drift by 10 m or more.",
}

const tiles = computed(() => {
  const s = summary.value
  const out = []
  if (s.elapsedS != null) out.push({ k: 'Elapsed time', v: duration(s.elapsedS) })
  if (s.stoppedS != null && s.stoppedS >= 30) out.push({ k: 'Stopped', v: duration(s.stoppedS) })
  if (s.fastestKmS != null) out.push({ k: 'Fastest km', v: pace(s.fastestKmS) })
  if (h.value) {
    out.push({ k: 'Climbed', v: m(h.value.gain) })
    out.push({ k: 'Descended', v: m(h.value.loss) })
    out.push({ k: 'Highest point', v: m(h.value.high) })
  }
  if (s.heartRate) {
    out.push({ k: 'Average heart rate', v: `${s.heartRate.avg} bpm` })
    out.push({ k: 'Max heart rate', v: `${s.heartRate.max} bpm` })
  }
  if (s.cadence) out.push({ k: ride.value ? 'Cadence' : 'Steps a minute', v: ride.value ? `${s.cadence} rpm` : `${s.cadence}` })
  return out
})

const elevSummary = computed(() => h.value ? `Elevation along the route, from ${h.value.low} m to ${h.value.high} m. Up ${h.value.gain} m and down ${h.value.loss} m in total.` : '')
const paceSummary = computed(() => {
  const xs = speedVals.value.filter(Number.isFinite)
  if (!xs.length) return ''
  const lo = Math.min(...xs), hi = Math.max(...xs)
  return ride.value ? `Speed along the route, between ${speedFmt(lo)} and ${speedFmt(hi)}.` : `Pace along the route, between ${paceFmt(lo)} at the quickest and ${paceFmt(hi)} at the slowest.`
})
</script>

<template>
  <section v-if="samples.length > 1" class="runstats" aria-labelledby="rs-h">
    <h2 id="rs-h">{{ MODE_LABEL[mode] }} stats</h2>

    <dl v-if="tiles.length" class="tiles">
      <div v-for="t in tiles" :key="t.k" class="tile"><dt>{{ t.k }}</dt><dd>{{ t.v }}</dd></div>
    </dl>

    <ProfileChart
      v-if="alts"
      v-model:scrub="scrub" :ds="ds" :values="alts" kind="area" :format="m" :step="5" :min-span="30"
      title="Elevation" :sub="`Up ${h.gain} m, down ${h.loss} m. ${SOURCE[elev.source]}`"
      :summary="elevSummary" value-name="Height"
    />
    <p v-else-if="elevState === 'loading'" class="small muted wait">Working out the hills on your route.</p>
    <p v-else-if="elevState === 'done'" class="small muted">No height data for this one, so there's no elevation chart.</p>

    <ProfileChart
      v-if="hasPace"
      v-model:scrub="scrub" :ds="ds" :values="speedVals" :format="ride ? speedFmt : paceFmt" :step="ride ? 2 : 15" trim
      :title="ride ? 'Speed' : 'Pace'" :sub="ride ? 'Higher is faster.' : 'Lower is quicker. Stops show as gaps.'"
      :summary="paceSummary" :value-name="ride ? 'Speed' : 'Pace'"
    />

    <ProfileChart
      v-if="hrVals"
      v-model:scrub="scrub" :ds="ds" :values="hrVals" :format="(v) => `${Math.round(v)} bpm`" :step="10" :min-span="30"
      title="Heart rate" :sub="`Average ${summary.heartRate?.avg} bpm, max ${summary.heartRate?.max} bpm.`"
      :summary="`Heart rate along the route, averaging ${summary.heartRate?.avg} beats a minute.`" value-name="Heart rate"
    />

    <div v-if="splits.length" class="splitwrap">
      <h3>Splits</h3>
      <table class="splits">
        <thead>
          <tr>
            <th scope="col">km</th>
            <th scope="col">{{ ride ? 'km/h' : 'Pace' }}</th>
            <th scope="col"><span class="sr">Bar</span></th>
            <th v-if="showElev" scope="col" class="num">Elev</th>
            <th v-if="showHr" scope="col" class="num">HR</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in splits" :key="s.n">
            <td>{{ s.partial ? (s.distM / 1000).toFixed(2) : s.n }}</td>
            <td class="pace">{{ ride ? speedKmh(s.pace) : pace(s.pace) }}</td>
            <td><span class="bar" :class="{ best: s.pace === fastestSplit }" :style="{ width: `${Math.round((fastestSplit / s.pace) * 100)}%` }"></span></td>
            <td v-if="showElev" class="num">{{ s.elevDelta == null ? '' : signed(s.elevDelta) }}</td>
            <td v-if="showHr" class="num">{{ s.hr ?? '' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="splits[splits.length - 1].partial" class="small muted">The last row is a part kilometre, shown at its pace per km.</p>
    </div>
  </section>
</template>

<style scoped>
.runstats { display: grid; gap: 18px; min-width: 0; }
.runstats h2 { margin: 0; }
h3 { font-size: 0.95rem; font-weight: 750; margin: 0; }
.tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 12px; margin: 0; }
.tile { display: grid; gap: 2px; min-width: 0; }
.tile dt { font-size: 0.8rem; color: var(--ink-60); order: 2; }
.tile dd { margin: 0; font-weight: 800; font-size: 1.15rem; font-variant-numeric: tabular-nums; order: 1; }
.wait { animation: breathe 1.6s ease-in-out infinite; }
@keyframes breathe { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .wait { animation: none; } }
.splitwrap { display: grid; gap: 6px; }
.splits { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.splits th { text-align: left; font-size: 0.8rem; color: var(--ink-60); font-weight: 600; padding: 6px 0; }
.splits td { padding: 7px 0; border-top: 1px solid var(--line); }
.splits td:first-child { width: 44px; }
.splits td.pace { width: 64px; font-weight: 700; }
.splits .num { text-align: right; width: 58px; padding-left: 8px; }
.bar { display: block; height: 10px; border-radius: 0 5px 5px 0; background: var(--you-soft); }
.bar.best { background: var(--you); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
