<script setup>
// One stronghold up close: who holds the crown, your efforts and best time,
// and the leaderboards by efforts (90 days) and by fastest. In the practice
// map it can also run the loop for you.
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, isLocal } from '../lib/api/index.js'
import { refresh, toast } from '../lib/store.js'
import { setLastResult } from '../lib/lastResult.js'
import { duration, km, plural, ago } from '../lib/format.js'
import { decodePolyline } from '../lib/engine/index.js'
import { routeTrack } from '../lib/tracks.js'

const props = defineProps({
  id: { type: String, required: true },
  mode: { type: String, default: 'run' },
})
const emit = defineEmits(['loaded'])
const router = useRouter()
const d = ref(null)
const board = ref('efforts')
const running = ref(false)

async function load() {
  d.value = null
  try {
    d.value = await api.stronghold(props.id, { mode: props.mode })
    emit('loaded', d.value)
  } catch (e) {
    toast(e.message)
  }
}
watch(() => [props.id, props.mode], load, { immediate: true })

const sh = computed(() => d.value?.stronghold)
const crownLine = computed(() => {
  const h = sh.value?.holder
  if (!h) return 'Nobody holds the crown yet. One effort takes it.'
  if (h.me) return `The crown is yours, with ${plural(h.efforts, 'effort')} in 90 days.`
  return `${h.name} holds the crown, with ${plural(h.efforts, 'effort')} in 90 days.`
})
const toCrownLine = computed(() => {
  const m = sh.value?.mine
  if (!m || m.holds || !sh.value.holder) return null
  return `${m.toCrown === 1 ? 'One more effort' : `${m.toCrown} more efforts`} in 90 days takes it from ${sh.value.holder.name}.`
})
const rows = computed(() => (board.value === 'efforts' ? d.value?.byEfforts : d.value?.byTime)?.slice(0, 5) || [])

async function practise() {
  running.value = true
  try {
    const route = decodePolyline(sh.value.line)
    const kmh = props.mode === 'ride' ? 24 : props.mode === 'walk' ? 5.4 : 10 + Math.random() * 2
    const startAt = Date.now() - (sh.value.distanceM / 1000 / kmh) * 3600000 - 60000
    const points = routeTrack(route, { kmh, startAt, seed: Math.floor(Math.random() * 1e9), reverse: Math.random() < 0.5 })
    const res = await api.postActivity({ mode: props.mode, source: 'phone', startedAt: startAt, points })
    setLastResult(res)
    await refresh()
    router.push({ name: 'result', params: { id: res.activity.id } })
  } catch (e) {
    toast(e.message)
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="shcard">
    <template v-if="sh">
      <div class="head">
        <span class="crownbadge" :class="{ mine: sh.holder?.me, open: !sh.holder }" :style="{ '--holder': sh.holder?.colour || '#16302A' }" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 18h18l-1.5-10-4.5 4-3-7-3 7-4.5-4z" fill="currentColor" /></svg>
        </span>
        <div>
          <h3>{{ sh.name }}</h3>
          <p class="small muted">{{ km(sh.distanceM, 1) }} km loop. {{ crownLine }}</p>
        </div>
      </div>

      <div class="mine">
        <div class="stat"><span class="n">{{ sh.mine.efforts }}</span><span class="label">your efforts, 90 days</span></div>
        <div class="stat"><span class="n">{{ sh.mine.bestS ? duration(sh.mine.bestS) : 'None yet' }}</span><span class="label">your best time</span></div>
      </div>
      <p v-if="toCrownLine" class="small tocrown">{{ toCrownLine }}</p>

      <div>
        <div class="seg" role="group" aria-label="Leaderboard">
          <button type="button" :aria-pressed="board === 'efforts'" @click="board = 'efforts'">Most efforts</button>
          <button type="button" :aria-pressed="board === 'time'" @click="board = 'time'">Fastest</button>
        </div>
        <ol v-if="rows.length" class="board">
          <li v-for="(r, i) in rows" :key="r.userId" :class="{ me: r.me }">
            <span class="pos">{{ i + 1 }}</span>
            <span class="dot" :style="{ background: r.me ? '#2E55E6' : r.colour }" aria-hidden="true"></span>
            <span class="who">{{ r.me ? 'You' : r.name }}</span>
            <span class="val">{{ board === 'efforts' ? plural(r.efforts, 'effort') : duration(r.bestS) }}</span>
            <span v-if="board === 'efforts'" class="when small muted">{{ ago(r.last) }}</span>
          </li>
        </ol>
        <p v-else class="small muted board-empty">Nobody has run it on the {{ mode }} map yet. Be the first.</p>
      </div>

      <button v-if="isLocal" class="btn quiet small" type="button" :disabled="running" @click="practise">
        {{ running ? 'Running it' : 'Practice this loop (no GPS)' }}
      </button>
    </template>
    <p v-else class="small muted">Loading the stronghold</p>
  </div>
</template>

<style scoped>
.shcard { display: grid; gap: 12px; min-width: 0; }
.head { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; }
.head > div { min-width: 0; }
.crownbadge {
  width: 34px; height: 34px; border-radius: 50%; border: 3px solid var(--holder); color: var(--holder); background: #fff;
  display: grid; place-items: center; box-sizing: border-box;
}
.crownbadge.mine { background: var(--you); color: #fff; border-color: var(--you); }
.crownbadge.open { border-style: dashed; }
.mine { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mine .n { font-weight: 850; font-stretch: 112%; font-size: 1.35rem; line-height: 1.1; font-variant-numeric: tabular-nums; }
.tocrown { font-weight: 650; color: var(--you); }
.board { list-style: none; margin: 10px 0 0; padding: 0; display: grid; }
.board li { display: grid; grid-template-columns: 18px auto 1fr auto; gap: 8px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
.board li:has(.when) { grid-template-columns: 18px auto 1fr auto auto; }
.board li:last-child { border-bottom: 0; }
.board li.me .who, .board li.me .val { color: var(--you); font-weight: 750; }
.board .pos { color: var(--ink-60); font-size: 0.85rem; }
.board .who { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board .val { font-weight: 650; }
.board-empty { margin-top: 10px; }
</style>
