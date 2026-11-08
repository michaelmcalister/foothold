<script setup>
// Pick a ghost to race before starting: one of your past runs from near
// here (it moves exactly as you did), or the planned route at a steady pace.
// v-model is the chosen option, { kind: 'run', activity } or { kind: 'route', paceSPerKm }, or null.
import { ref, computed, onMounted } from 'vue'
import { api } from '../lib/api/index.js'
import { ghostChoices } from '../lib/ghost.js'
import { km, pace, MODE_LABEL } from '../lib/format.js'

const props = defineProps({
  modelValue: { type: Object, default: null },
  mode: { type: String, default: 'run' },
  here: { type: Object, default: null }, // { lat, lng }
  route: { type: Object, default: null }, // a planned route, to race at a pace
  usualPace: { type: Number, default: 360 },
})
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const runs = ref([])
const routePace = ref(Math.round(props.usualPace / 5) * 5)

onMounted(async () => {
  try {
    const { activities } = await api.activities({ limit: 200 })
    runs.value = props.here ? ghostChoices(activities.filter((a) => a.mine !== false), props.here, props.mode) : []
  } catch { runs.value = [] }
})

const when = (t) => new Date(t).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
const label = computed(() => {
  const v = props.modelValue
  if (!v) return null
  if (v.kind === 'run') return `Racing your ${MODE_LABEL[v.activity.mode].toLowerCase()} from ${when(v.activity.startedAt)}, ${km(v.activity.distanceM)} km at ${pace(v.activity.paceSPerKm)} /km`
  return `Racing ${props.route?.name || 'this route'} at ${pace(v.paceSPerKm)} /km`
})
const paces = computed(() => {
  const out = []
  for (let s = routePace.value - 60; s <= routePace.value + 60; s += 15) if (s >= 150) out.push(s)
  return out
})
function pick(v) {
  emit('update:modelValue', v)
  open.value = false
}
</script>

<template>
  <div class="ghost-pick">
    <div v-if="label" class="chosen">
      <span class="g" aria-hidden="true"></span>
      <p>{{ label }}</p>
      <button class="linkish" type="button" @click="pick(null)">Remove</button>
    </div>
    <button v-else-if="runs.length || route" class="btn quiet block" type="button" :aria-expanded="open" @click="open = !open">Race a ghost</button>

    <div v-if="open && !label" class="list">
      <p class="small muted">The ghost runs beside you on the map, and the voice coach tells you if you're ahead or behind.</p>
      <button v-for="a in runs" :key="a.id" class="opt" type="button" @click="pick({ kind: 'run', activity: a })">
        <strong>Your {{ MODE_LABEL[a.mode].toLowerCase() }} from {{ when(a.startedAt) }}</strong>
        <span class="small muted">{{ km(a.distanceM) }} km at {{ pace(a.paceSPerKm) }} /km</span>
      </button>
      <div v-if="route" class="opt pace">
        <strong>{{ route.name || 'This route' }} at a steady pace</strong>
        <div class="row">
          <select v-model.number="routePace" aria-label="Ghost pace per kilometre">
            <option v-for="s in paces" :key="s" :value="s">{{ pace(s) }} /km</option>
          </select>
          <button class="btn small" type="button" @click="pick({ kind: 'route', paceSPerKm: routePace })">Race it</button>
        </div>
      </div>
      <p v-if="!runs.length && !route" class="small muted">No past runs start near here yet. Once you've done one, you can race it.</p>
    </div>
  </div>
</template>

<style scoped>
.ghost-pick { display: grid; gap: 8px; }
.chosen { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--soft); }
.chosen p { margin: 0; font-size: 0.9rem; }
.g { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid rgba(22, 48, 42, 0.6); }
.linkish { background: none; border: 0; color: var(--you-ink); font: inherit; font-weight: 650; cursor: pointer; padding: 6px; }
.list { display: grid; gap: 8px; }
.opt { display: grid; gap: 2px; text-align: left; padding: 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--card); font: inherit; color: inherit; cursor: pointer; }
.opt.pace { cursor: default; }
.row { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
.row select { font: inherit; padding: 8px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--ink); }
</style>
