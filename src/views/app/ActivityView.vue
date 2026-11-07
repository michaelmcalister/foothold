<script setup>
// One activity in full: route, ground claimed, run stats (elevation, pace
// and heart rate charts, splits per kilometre),
// Coach's notes, anything that was left out and why, plus GPX export.
// Your latest run asks "How did that feel?" if it wasn't answered yet.
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import ActivityComments from '../../components/ActivityComments.vue'
import { api } from '../../lib/api/index.js'
import { store, refresh, toast } from '../../lib/store.js'
import { km, pace, duration, dateLong, speedKmh, MODE_LABEL } from '../../lib/format.js'
import { toGpx } from '../../lib/tracks.js'
import { toISO } from '../../lib/coach/dates.js'
import { debrief, plannedFor } from '../../lib/coach/debrief.js'
import CoachNotes from '../../components/CoachNotes.vue'
import FeelCheckin from '../../components/FeelCheckin.vue'
import RunStats from '../../components/RunStats.vue'

const route = useRoute()
const router = useRouter()
const a = ref(null)
const track = ref([])
const plan = ref(null)
const recent = ref([])
const notes = computed(() => a.value ? debrief({ activity: a.value, track: track.value, planned: plannedFor(plan.value, a.value), recent: recent.value, now: a.value.startedAt + 6 * 3600000 }) : [])

const askFeel = ref(false) // decided once, so the thank you stays after answering
function checkedIn(act) {
  if (act && a.value) a.value = { ...a.value, ...Object.fromEntries(['feel', 'hurt', 'checkinAt'].filter((k) => k in act).map((k) => [k, act[k]])) }
}

onMounted(async () => {
  api.plan().then((r) => { plan.value = r.plan }).catch(() => {})
  const mine = api.activities({ limit: 50 }).then((r) => { recent.value = r.activities }).catch(() => {})
  try {
    const r = await api.activity(route.params.id)
    a.value = r.activity
    track.value = r.track
  } catch (e) {
    toast(e.message)
    router.replace({ name: 'you' })
    return
  }
  await mine
  // Only your own activities carry checkinAt, so null means yours and not answered
  askFeel.value = a.value.mode === 'run' && !a.value.rejected && a.value.checkinAt === null && recent.value[0]?.id === a.value.id
})

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
    <div class="stat-row two">
      <div class="stat"><span class="big-num">{{ duration(a.movingS) }}</span><span class="label">Moving time</span></div>
      <div class="stat"><span class="big-num">{{ a.mode === 'ride' ? speedKmh(a.paceSPerKm) : pace(a.paceSPerKm) }}</span><span class="label">{{ a.mode === 'ride' ? 'km/h' : 'Pace /km' }}</span></div>
    </div>
    <div class="stat-row">
      <div class="stat"><span class="big-num">{{ a.loops || 0 }}</span><span class="label">{{ a.loops === 1 ? 'loop' : 'loops' }}</span></div>
      <div class="stat"><span class="big-num">{{ (a.claimed || 0) + (a.taken || 0) }}</span><span class="label">hexes claimed</span></div>
      <div class="stat"><span class="big-num">{{ a.taken || 0 }}</span><span class="label">taken from rivals</span></div>
    </div>

    <FeelCheckin v-if="askFeel" :activity="a" :plan="plan" :recent="recent" @saved="checkedIn" @plan="(p) => (plan = p)" />

    <CoachNotes :notes="notes" />

    <div v-if="a.rejected" class="notice bad">{{ a.rejectReason }}</div>
    <div v-else-if="a.flags?.length" class="notice">
      <strong>Left out of this activity</strong>
      <ul><li v-for="(f, i) in a.flags" :key="i">{{ f.message }}</li></ul>
    </div>

    <RunStats :activity="a" :track="track" />

    <ActivityComments :activity-id="a.id" @count="(n) => (a.comments = n)" />

    <div class="actions">
      <RouterLink class="btn" :to="{ name: 'recap', params: { id: a.id } }">Watch recap</RouterLink>
      <RouterLink v-if="a.mine !== false && !a.rejected" class="btn secondary" :to="{ name: 'record', query: { ghost: a.id } }">Race this {{ a.mode === 'ride' ? 'ride' : a.mode }}</RouterLink>
      <button class="btn quiet" type="button" @click="exportGpx">Export GPX</button>
      <button class="btn quiet" type="button" @click="remove">Delete</button>
    </div>
  </div>
</template>

<style scoped>
.maparea { height: 300px; border-radius: 14px; overflow: hidden; position: relative; }
.maparea > :first-child { position: absolute; inset: 0; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.notice ul { margin: 6px 0 0; padding-left: 18px; }
.stat-row.two { grid-template-columns: repeat(2, 1fr); }
</style>
