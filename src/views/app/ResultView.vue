<script setup>
// After an activity: what you claimed, what you took and from whom, any
// battles that started, a level-up, Coach's notes on the run, and a gentle
// check on this week's load.
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import { api } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { lastResult } from '../../lib/lastResult.js'
import { km, pace, duration, speedKmh, plural } from '../../lib/format.js'
import { loadMessage, levelFor } from '../../lib/engine/index.js'
import ShareCard from '../../components/ShareCard.vue'
import CoachNotes from '../../components/CoachNotes.vue'
import { debrief, plannedFor } from '../../lib/coach/debrief.js'

const route = useRoute()
const router = useRouter()
const res = ref(lastResult(route.params.id))
const track = ref([])
const cells = ref([])
const appealing = ref(false)
const appealNote = ref('')
const appealSent = ref(false)
const plan = ref(null)
const recent = ref([])

const a = computed(() => res.value?.activity)
const highlight = computed(() => res.value?.diff ? [...res.value.diff.claimed, ...res.value.diff.taken.map((t) => t.h3)] : [])
const newHexes = computed(() => (res.value?.diff?.claimed.length || 0) + (res.value?.diff?.taken.length || 0))
const takenBy = computed(() => {
  const m = new Map()
  for (const b of res.value?.battles || []) m.set(b.defenderName, b.hexes.length)
  return [...m.entries()]
})
const takenText = computed(() => {
  const parts = takenBy.value.map(([name, n]) => `${n} from ${name}`)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
})
const levelUp = computed(() => {
  if (!res.value) return null
  const before = levelFor(res.value.hexesBefore).level
  const after = levelFor(res.value.hexesAfter).level
  return after && after.id !== before?.id ? after : null
})
const notes = computed(() => a.value ? debrief({ activity: a.value, track: track.value, planned: plannedFor(plan.value, a.value), recent: recent.value, result: res.value }) : [])
// Coach's notes cover this week's load once the run is in, so the pre-run check steps aside.
const loadNote = computed(() => res.value?.load && !notes.value.some((n) => n.kind === 'load') ? loadMessage(res.value.load) : null)

const headline = computed(() => {
  if (!a.value) return ''
  if (a.value.rejected) return "This one can't claim ground"
  if (!a.value.loops) return 'No loop this time'
  if (!newHexes.value) return `Loop closed. Your ground is stronger.`
  return `Loop closed. ${plural(newHexes.value, 'hex', 'hexes')} ${newHexes.value === 1 ? 'is' : 'are'} yours.`
})

onMounted(async () => {
  api.plan().then((r) => { plan.value = r.plan }).catch(() => {})
  api.activities({ limit: 50 }).then((r) => { recent.value = r.activities }).catch(() => {})
  if (!res.value) {
    try {
      const r = await api.activity(route.params.id)
      res.value = { activity: r.activity, diff: null, battles: [], loops: [], hexesBefore: 0, hexesAfter: 0 }
      track.value = r.track
    } catch {
      router.replace('/app')
      return
    }
  } else {
    const r = await api.activity(route.params.id).catch(() => null)
    track.value = r?.track || []
  }
  const bb = a.value.bbox
  if (bb) {
    const pad = 0.01
    const { cells: c } = await api.territory({ mode: a.value.mode, bbox: [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad] })
    cells.value = c
  }
})

async function sendAppeal() {
  await api.appeal(a.value.id, appealNote.value)
  appealSent.value = true
  appealing.value = false
  toast('Appeal sent. We’ll look at the flagged parts and reply here.')
}
</script>

<template>
  <div v-if="a" class="result">
    <div class="maparea">
      <TerritoryMap
        :centre="a.start || store.centre"
        :cells="cells"
        :highlight="highlight"
        :track="track"
        :loops="res.loops || []"
        fit
      />
    </div>

    <div class="screen">
      <header class="screen-head">
        <h1>{{ headline }}</h1>
        <p v-if="a.rejected" class="muted">{{ a.rejectReason }}</p>
        <p v-else-if="!a.loops" class="muted">
          Your route didn't come back to where it started, so there was no loop to fill in.
          It still counts towards your week. Next time, finish within 30 m of your start.
        </p>
        <p v-else-if="takenBy.length" class="muted">
          You took {{ takenText }}. {{ takenBy.length > 1 ? 'One-week battles have' : 'A one-week battle has' }} started. Hold your ground to win.
        </p>
        <p v-else-if="a.reinforced" class="muted">{{ plural(a.reinforced, 'hex', 'hexes') }} you already held got stronger.</p>
      </header>

      <CoachNotes :notes="notes" />

      <div class="stat-row">
        <div class="stat"><span class="big-num">{{ km(a.distanceM) }}</span><span class="label">km</span></div>
        <div class="stat"><span class="big-num">{{ duration(a.movingS) }}</span><span class="label">Moving time</span></div>
        <div class="stat">
          <span class="big-num">{{ a.mode === 'ride' ? speedKmh(a.paceSPerKm) : pace(a.paceSPerKm) }}</span>
          <span class="label">{{ a.mode === 'ride' ? 'km/h' : 'Pace /km' }}</span>
        </div>
      </div>

      <div v-if="levelUp" class="notice good">
        <strong>You've reached {{ levelUp.name }}.</strong> {{ res.hexesAfter }} hexes held on the {{ a.mode }} map.
      </div>

      <div v-if="a.flags?.length && !a.rejected" class="notice">
        <strong>Part of this was left out.</strong>
        <ul><li v-for="(f, i) in a.flags" :key="i">{{ f.message }}</li></ul>
      </div>

      <div v-if="loadNote" class="notice">{{ loadNote }}</div>

      <div v-if="a.rejected || a.flags?.length" class="appeal">
        <template v-if="appealSent || a.appeal">
          <p class="small muted">Appeal sent. We'll check the flagged parts and reply in your notifications.</p>
        </template>
        <template v-else-if="appealing">
          <div class="field">
            <label for="appeal">What happened?</label>
            <textarea id="appeal" v-model="appealNote" placeholder="For example: I ran through a tunnel and my GPS jumped." />
          </div>
          <button class="btn" type="button" @click="sendAppeal">Send appeal</button>
        </template>
        <button v-else class="btn quiet" type="button" @click="appealing = true">Appeal this</button>
      </div>

      <ShareCard v-if="!a.rejected" :activity="a" :new-hexes="newHexes" :taken="takenBy" />

      <div class="done">
        <RouterLink v-if="!a.rejected" class="btn block" :to="{ name: 'recap', params: { id: a.id } }">Watch your recap</RouterLink>
        <RouterLink class="btn secondary block" to="/app">Back to the map</RouterLink>
        <RouterLink class="btn secondary block" :to="{ name: 'activity', params: { id: a.id } }">See activity details</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result { min-height: 100dvh; }
.maparea { height: 44vh; min-height: 260px; position: relative; }
.maparea > :first-child { position: absolute; inset: 0; }
.screen { padding-bottom: calc(28px + env(safe-area-inset-bottom)); }
.done { display: grid; gap: 10px; }
.notice ul { margin: 6px 0 0; padding-left: 18px; }
.appeal { display: grid; gap: 10px; justify-items: start; }
</style>
