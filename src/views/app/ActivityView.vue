<script setup>
// One activity in full: route, ground claimed, splits per kilometre,
// anything that was left out and why, plus GPX export.
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import { api } from '../../lib/api/index.js'
import { store, refresh, toast } from '../../lib/store.js'
import { km, pace, duration, dateLong, speedKmh, MODE_LABEL } from '../../lib/format.js'
import { distance } from '../../lib/engine/index.js'
import { toGpx } from '../../lib/tracks.js'
import { toISO } from '../../lib/coach/dates.js'

const route = useRoute()
const router = useRouter()
const a = ref(null)
const track = ref([])

onMounted(async () => {
  try {
    const r = await api.activity(route.params.id)
    a.value = r.activity
    track.value = r.track
  } catch (e) {
    toast(e.message)
    router.replace({ name: 'you' })
  }
})

const splits = computed(() => {
  const out = []
  let d = 0
  let lastT = track.value[0]?.t
  let next = 1000
  for (let i = 1; i < track.value.length; i++) {
    d += distance(track.value[i - 1], track.value[i])
    if (d >= next) {
      out.push({ km: next / 1000, s: (track.value[i].t - lastT) / 1000 })
      lastT = track.value[i].t
      next += 1000
    }
  }
  return out
})
const fastest = computed(() => Math.min(...splits.value.map((s) => s.s)))

function exportGpx() {
  const blob = new Blob([toGpx(track.value, `Foothold ${a.value.mode}`)], { type: 'application/gpx+xml' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `foothold-${toISO(a.value.startedAt)}.gpx`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 2000)
}

async function remove() {
  if (!confirm('Delete this activity? Ground it claimed stays on the map until it fades.')) return
  await api.deleteActivity(a.value.id)
  await refresh()
  toast('Activity deleted.')
  router.replace({ name: 'you' })
}
</script>

<template>
  <div v-if="a" class="screen">
    <header class="screen-head">
      <p class="small muted">{{ dateLong(a.startedAt) }} · {{ MODE_LABEL[a.mode] }}<template v-if="a.source === 'import'"> · imported</template></p>
      <h1>{{ km(a.distanceM) }} km {{ a.mode }}</h1>
    </header>
    <div class="maparea">
      <TerritoryMap :centre="a.start || store.centre" :track="track" fit :interactive="true" />
    </div>
    <div class="stat-row">
      <div class="stat"><span class="big-num">{{ duration(a.movingS) }}</span><span class="label">Moving time</span></div>
      <div class="stat"><span class="big-num">{{ a.mode === 'ride' ? speedKmh(a.paceSPerKm) : pace(a.paceSPerKm) }}</span><span class="label">{{ a.mode === 'ride' ? 'km/h' : 'Pace /km' }}</span></div>
      <div class="stat"><span class="big-num">{{ a.elevGainM || 0 }}</span><span class="label">m climbed</span></div>
    </div>
    <div class="stat-row">
      <div class="stat"><span class="big-num">{{ a.loops || 0 }}</span><span class="label">{{ a.loops === 1 ? 'loop' : 'loops' }}</span></div>
      <div class="stat"><span class="big-num">{{ (a.claimed || 0) + (a.taken || 0) }}</span><span class="label">hexes claimed</span></div>
      <div class="stat"><span class="big-num">{{ a.taken || 0 }}</span><span class="label">taken from rivals</span></div>
    </div>

    <div v-if="a.rejected" class="notice bad">{{ a.rejectReason }}</div>
    <div v-else-if="a.flags?.length" class="notice">
      <strong>Left out of this activity</strong>
      <ul><li v-for="(f, i) in a.flags" :key="i">{{ f.message }}</li></ul>
    </div>

    <section v-if="splits.length" aria-labelledby="splits">
      <h2 id="splits">Splits</h2>
      <table class="splits">
        <thead><tr><th scope="col">km</th><th scope="col">{{ a.mode === 'ride' ? 'km/h' : 'Pace' }}</th><th scope="col"><span class="sr">Bar</span></th></tr></thead>
        <tbody>
          <tr v-for="s in splits" :key="s.km">
            <td>{{ s.km }}</td>
            <td>{{ a.mode === 'ride' ? speedKmh(s.s) : pace(s.s) }}</td>
            <td><span class="bar" :class="{ best: s.s === fastest }" :style="{ width: `${Math.round((fastest / s.s) * 100)}%` }"></span></td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="actions">
      <RouterLink class="btn" :to="{ name: 'recap', params: { id: a.id } }">Watch recap</RouterLink>
      <button class="btn quiet" type="button" @click="exportGpx">Export GPX</button>
      <button class="btn quiet" type="button" @click="remove">Delete</button>
    </div>
  </div>
</template>

<style scoped>
.maparea { height: 300px; border-radius: 14px; overflow: hidden; position: relative; }
.maparea > :first-child { position: absolute; inset: 0; }
.splits { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; margin-top: 10px; }
.splits th { text-align: left; font-size: 0.85rem; color: var(--ink-60); font-weight: 600; padding: 6px 0; }
.splits td { padding: 7px 0; border-top: 1px solid var(--line); }
.splits td:first-child { width: 48px; }
.splits td:nth-child(2) { width: 72px; font-weight: 700; }
.bar { display: block; height: 10px; border-radius: 5px; background: var(--youSoft, #AFC0F7); }
.bar.best { background: var(--you); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.notice ul { margin: 6px 0 0; padding-left: 18px; }
</style>
