<script setup>
// After an activity: what you claimed, what you took and from whom, any
// battles that started, a level-up, new personal bests, strongholds you ran,
// and a gentle check on this week's load.
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import { api } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { lastResult } from '../../lib/lastResult.js'
import { km, pace, duration, speedKmh, plural } from '../../lib/format.js'
import { loadMessage, levelFor, bestMessage } from '../../lib/engine/index.js'
import ShareCard from '../../components/ShareCard.vue'

const route = useRoute()
const router = useRouter()
const res = ref(lastResult(route.params.id))
const track = ref([])
const cells = ref([])
const appealing = ref(false)
const appealNote = ref('')
const appealSent = ref(false)

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
const loadNote = computed(() => res.value?.load ? loadMessage(res.value.load) : null)

const headline = computed(() => {
  if (!a.value) return ''
  if (a.value.rejected) return "This one can't claim ground"
  if (!a.value.loops) return 'No loop this time'
  if (!newHexes.value) return `Loop closed. Your ground is stronger.`
  return `Loop closed. ${plural(newHexes.value, 'hex', 'hexes')} ${newHexes.value === 1 ? 'is' : 'are'} yours.`
})

onMounted(async () => {
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

      <div class="stat-row">
        <div class="stat"><span class="big-num">{{ km(a.distanceM) }}</span><span class="label">km</span></div>
        <div class="stat"><span class="big-num">{{ duration(a.movingS) }}</span><span class="label">Moving time</span></div>
        <div class="stat">
          <span class="big-num">{{ a.mode === 'ride' ? speedKmh(a.paceSPerKm) : pace(a.paceSPerKm) }}</span>
          <span class="label">{{ a.mode === 'ride' ? 'km/h' : 'Pace /km' }}</span>
        </div>
      </div>

      <div v-if="res.prs?.length" class="notice good prs">
        <strong>{{ res.prs.length === 1 ? 'A new personal best.' : `${res.prs.length} new personal bests.` }}</strong>
        <ul><li v-for="p in res.prs" :key="p.key">{{ bestMessage(p) }}.</li></ul>
      </div>

      <RouterLink v-for="s in res.strongholds || []" :key="s.id" class="notice shnote" :class="{ held: s.holds }" :to="{ name: 'strongholds', params: { id: s.id } }">
        <span class="crownbadge" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 18h18l-1.5-10-4.5 4-3-7-3 7-4.5-4z" fill="currentColor" /></svg>
        </span>
        <span>{{ s.message }} <span class="see">See the leaderboard</span></span>
      </RouterLink>

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
.prs ul { list-style: none; padding: 0; }
.shnote { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; text-decoration: none; background: #E8EDFC; color: var(--ink); }
.shnote .crownbadge { width: 30px; height: 30px; border-radius: 50%; background: #fff; color: var(--ink); display: grid; place-items: center; box-shadow: inset 0 0 0 2px var(--ink); }
.shnote.held .crownbadge { background: var(--you); color: #fff; box-shadow: none; }
.shnote .see { display: block; margin-top: 4px; color: var(--you); font-weight: 650; font-size: 0.9rem; }
</style>
