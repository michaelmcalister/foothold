<script setup>
// One hill (King of the hill): its name, gain, length and grade, the climb
// on a small map and as an elevation chart, who is King of the hill, the
// top 10 times and your best. "Run it" opens the planner with the hill's line.
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import ProfileChart from '../../components/ProfileChart.vue'
import { api } from '../../lib/api/index.js'
import { store } from '../../lib/store.js'
import { MODE_VERB, plural, ago } from '../../lib/format.js'
import { hillTime } from '../../lib/engine/hills.js'

const route = useRoute()
const router = useRouter()
const data = ref(null)
const error = ref('')

async function load() {
  error.value = ''
  try {
    data.value = await api.hill(String(route.params.id))
  } catch (e) {
    error.value = e.message || "That hill isn't there any more."
  }
}
onMounted(load)
watch(() => route.params.id, load)

const h = computed(() => data.value?.hill || null)
const verb = computed(() => MODE_VERB[h.value?.mode] || 'run')
const track = computed(() => (h.value?.line || []).map(([lng, lat]) => ({ lat, lng })))
const centre = computed(() => {
  const t = track.value
  return t.length ? t[Math.floor(t.length / 2)] : store.centre
})
const ds = computed(() => (h.value?.profile || []).map((p) => p[0]))
const alts = computed(() => (h.value?.profile || []).map((p) => p[1]))
const pct = computed(() => (h.value ? `${Math.round(h.value.grade * 1000) / 10}%` : ''))

const mine = computed(() => data.value?.mine || null)
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th')
const mineShown = computed(() => data.value?.board?.some((r) => r.me))
const crownLine = computed(() => {
  const hold = h.value?.holder
  if (!hold) return `Nobody is King of the hill yet. ${verb.value === 'ride' ? 'Ride' : verb.value === 'walk' ? 'Walk' : 'Run'} it once and it's yours.`
  if (hold.me) return `You're King of the hill, in ${hillTime(hold.seconds)}. Anyone faster takes it, so enjoy it while it lasts.`
  const gap = mine.value ? mine.value.seconds - hold.seconds : null
  return gap != null
    ? `${hold.name} is King of the hill in ${hillTime(hold.seconds)}. You're ${plural(Math.max(1, Math.round(gap)), 'second')} off. Fancy another go?`
    : `${hold.name} is King of the hill in ${hillTime(hold.seconds)}. Your time to beat.`
})
const summary = computed(() => (h.value ? `The climb rises ${h.value.gainM} metres over ${h.value.lengthM} metres, an average grade of ${pct.value}.` : ''))

function runIt() {
  router.push({ name: 'plan', query: { hill: h.value.id } })
}
function onMap() {
  router.push({ name: 'map' })
}
</script>

<template>
  <div class="screen hill">
    <header class="screen-head">
      <RouterLink class="small back" :to="{ name: 'map' }">Back to the map</RouterLink>
      <p class="kicker small">King of the hill · {{ verb }} map</p>
      <h1>{{ h ? h.name : 'Hill' }}</h1>
      <p v-if="h" class="facts">
        <span><strong>{{ h.gainM }} m</strong> up</span>
        <span><strong>{{ h.lengthM }} m</strong> long</span>
        <span><strong>{{ pct }}</strong> average</span>
      </p>
    </header>

    <p v-if="error" class="notice">{{ error }}</p>
    <p v-else-if="!h" class="muted">Loading the hill</p>

    <template v-else>
      <div class="mini">
        <TerritoryMap :centre="centre" :hills="[h]" fit :interactive="false" />
      </div>

      <section class="panel crown" :class="{ me: h.holder?.me }" :style="{ '--holder': h.holder?.me ? '#2E55E6' : h.holder?.colour || '#16302A' }">
        <span class="badge" :class="{ open: !h.holder }" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 17h16l-1.3-8.5-3.9 3.4L12 6l-2.8 5.9-3.9-3.4z" fill="currentColor" /></svg>
        </span>
        <p>{{ crownLine }}</p>
      </section>

      <ProfileChart
        v-if="ds.length > 1"
        :ds="ds" :values="alts" kind="area" :format="(v) => `${Math.round(v)} m`" :step="5" :min-span="20"
        title="The climb" :sub="`Up ${h.gainM} m over ${h.lengthM} m.`" :summary="summary" value-name="Height"
      />

      <section>
        <h2 class="h3">Top 10</h2>
        <ol v-if="data.board.length" class="board">
          <li v-for="r in data.board" :key="r.userId" :class="{ me: r.me }">
            <span class="pos">{{ r.rank }}</span>
            <span class="dot" :style="{ background: r.me ? '#2E55E6' : r.colour }" aria-hidden="true"></span>
            <span class="who">{{ r.me ? 'You' : r.name }}<span v-if="r.rank === 1" class="small muted"> · King of the hill</span></span>
            <span class="val">{{ hillTime(r.seconds) }}</span>
          </li>
        </ol>
        <p v-else class="small muted">No times yet. Be the first up.</p>
        <p class="small muted">{{ plural(h.people || data.board.length, 'person', 'people') }} up it on the {{ verb }} map. Only each person's best counts.</p>
      </section>

      <section class="panel yours">
        <h2 class="h3">Your best</h2>
        <p v-if="mine">
          <strong class="big">{{ hillTime(mine.seconds) }}</strong>
          <span class="muted"> {{ mineShown ? 'In the top 10.' : `${ordinal(mine.rank)} on the board.` }} {{ mine.at ? `Set ${ago(mine.at)}.` : '' }}</span>
        </p>
        <p v-else class="muted">No time yet. Your first go sets one.</p>
      </section>

      <div class="actions">
        <button class="btn block" type="button" @click="runIt">Run it</button>
        <button class="btn secondary block" type="button" @click="onMap">See it on the map</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hill { display: grid; gap: 16px; }
.back { display: inline-block; margin-bottom: 6px; }
.kicker { text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-60); margin: 0; font-weight: 700; }
.facts { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 6px 0 0; font-variant-numeric: tabular-nums; }
.mini { height: 200px; border-radius: 14px; overflow: hidden; position: relative; }
.mini > :first-child { position: absolute; inset: 0; }
.crown { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; }
.crown p { margin: 0; font-weight: 600; }
.badge {
  width: 38px; height: 38px; border-radius: 50%; border: 3px solid var(--holder); color: var(--holder); background: #fff;
  display: grid; place-items: center; box-sizing: border-box;
}
.crown.me .badge { background: var(--you); color: #fff; border-color: var(--you); }
.badge.open { border-style: dashed; }
.h3 { font-size: 1.05rem; margin: 0 0 6px; }
.board { list-style: none; margin: 0 0 8px; padding: 0; display: grid; }
.board li { display: grid; grid-template-columns: 22px auto 1fr auto; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
.board li:last-child { border-bottom: 0; }
.board li.me .who, .board li.me .val { color: var(--you); font-weight: 750; }
.board .pos { color: var(--ink-60); font-size: 0.85rem; }
.board .who { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board .val { font-weight: 650; }
.yours p { margin: 0; }
.yours .big + .muted { margin-left: 6px; }
.yours .big { font-size: 1.4rem; font-weight: 850; font-variant-numeric: tabular-nums; }
.actions { display: grid; gap: 10px; padding-bottom: 12px; }
</style>
