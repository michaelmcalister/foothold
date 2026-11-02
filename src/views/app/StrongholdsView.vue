<script setup>
// Strongholds near you: named landmark loops where the most efforts in 90
// days holds the crown. Tap one for its route and leaderboards.
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import StrongholdCard from '../../components/StrongholdCard.vue'
import { api } from '../../lib/api/index.js'
import { store } from '../../lib/store.js'
import { km, plural } from '../../lib/format.js'
import { decodePolyline, distance } from '../../lib/engine/index.js'

const route = useRoute()
const router = useRouter()
const list = ref(null)
const open = ref(route.params.id || null)

async function load() {
  const { strongholds } = await api.strongholds({ mode: store.mode })
  const here = store.centre
  list.value = strongholds
    .map((s) => ({ ...s, away: here ? distance(here, s.centre) : 0 }))
    .sort((a, b) => a.away - b.away)
}
onMounted(load)
watch(() => store.mode, load)
watch(() => route.params.id, (id) => { open.value = id || null })

const picked = computed(() => list.value?.find((s) => s.id === open.value) || null)
const pickedRoute = computed(() => (picked.value ? decodePolyline(picked.value.line) : null))
const held = computed(() => list.value?.filter((s) => s.mine.holds).length || 0)

async function toggle(id) {
  const next = open.value === id ? null : id
  router.replace({ name: 'strongholds', params: { id: next || undefined } })
  open.value = next
  if (next) {
    await nextTick()
    document.getElementById(`sh-${next}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
}

function crownText(s) {
  if (!s.holder) return 'Crown up for grabs'
  if (s.holder.me) return 'Your crown'
  return `${s.holder.name} holds it`
}
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <h1>Strongholds</h1>
      <p class="muted">
        Landmark loops. Whoever runs one the most in 90 days holds its crown.
        A draw goes to whoever ran it last.
      </p>
      <p v-if="held" class="small"><strong>You hold {{ plural(held, 'crown') }} on the {{ store.mode }} map.</strong></p>
    </header>

    <p v-if="list === null" class="muted">Loading strongholds</p>
    <div v-else-if="!list.length" class="empty">
      <p class="muted">No strongholds near you yet. We're mapping more areas soon.</p>
      <RouterLink class="btn quiet" to="/app">Back to the map</RouterLink>
    </div>

    <ul v-else class="rows plain">
      <li v-for="s in list" :id="`sh-${s.id}`" :key="s.id">
        <button class="row" type="button" :aria-expanded="open === s.id" @click="toggle(s.id)">
          <span class="crownbadge" :class="{ mine: s.holder?.me, open: !s.holder }" :style="{ '--holder': s.holder?.colour || '#16302A' }" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 18h18l-1.5-10-4.5 4-3-7-3 7-4.5-4z" fill="currentColor" /></svg>
          </span>
          <span class="txt">
            <strong>{{ s.name }}</strong>
            <span class="small muted">{{ km(s.distanceM, 1) }} km<template v-if="s.away > 50"> · {{ km(s.away, 1) }} km away</template> · {{ crownText(s) }}</span>
          </span>
          <span v-if="s.mine.efforts" class="chip">{{ s.mine.efforts }}</span>
        </button>
        <div v-if="open === s.id" class="detail">
          <div class="mini">
            <TerritoryMap :centre="s.centre" :track="pickedRoute || []" :strongholds="[s]" fit :interactive="false" />
          </div>
          <StrongholdCard :id="s.id" :mode="store.mode" />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.plain { list-style: none; margin: 0; padding: 0; }
.row {
  display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; width: 100%;
  background: none; border: 0; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; min-height: 44px;
}
.txt { display: grid; gap: 2px; min-width: 0; }
.txt strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.crownbadge {
  width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--holder); color: var(--holder); background: #fff;
  display: grid; place-items: center; box-sizing: border-box;
}
.crownbadge.mine { background: var(--you); color: #fff; border-color: var(--you); }
.crownbadge.open { border-style: dashed; }
.detail { display: grid; gap: 14px; margin-top: 14px; }
.mini { height: 190px; border-radius: 14px; overflow: hidden; position: relative; }
.mini > :first-child { position: absolute; inset: 0; }
</style>
