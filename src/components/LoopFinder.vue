<script setup>
// Suggest a loop: asks how far, then builds loops on real streets from where
// you are (lib/loopBuilder.js) and shows the best one for taking ground:
// new hexes, rivals' hexes you can take, and streets you haven't run.
// "Try another" walks through the others (and builds more in new
// directions). Run it with spoken turn by turn directions, read the
// directions first, or open it in the planner to change it.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { streetLoopsFor, loopKmFor } from '../lib/suggest.js'
import { setPlanned } from '../lib/plannedRoute.js'
import { toast } from '../lib/store.js'
import { MODE_LABEL } from '../lib/format.js'

const props = defineProps({
  centre: { type: Object, required: true },
  mode: { type: String, default: 'run' },
  startKm: { type: Number, default: null }, // a distance to start with (the first week's loop)
  auto: { type: Boolean, default: false }, // build straight away
})
const emit = defineEmits(['show', 'close'])
const router = useRouter()

const CHIPS = { run: [3, 5, 8, 10, 15], walk: [2, 3, 5, 8], ride: [10, 20, 30, 50] }
const STEP = { run: 0.5, walk: 0.5, ride: 5 }
const LIMIT = { run: [1, 42], walk: [1, 30], ride: [5, 150] }

const phase = ref('ask') // ask | building | result
const km = ref(props.startKm || CHIPS[props.mode]?.[1] || 5)
const loops = ref([])
const at = ref(0)
const streets = ref(true)
const shown = ref([]) // headings shown so far
const showDirs = ref(false)
const loop = computed(() => loops.value[at.value] || null)
const turns = computed(() => (loop.value?.directions || []).filter((d) => d.turn !== 'depart'))

function nudge(dir) {
  const [lo, hi] = LIMIT[props.mode] || [1, 42]
  km.value = Math.min(hi, Math.max(lo, Math.round((km.value + dir * STEP[props.mode]) * 10) / 10))
}

function show() {
  showDirs.value = false
  emit('show', loop.value ? loop.value.line : null)
}

async function find() {
  phase.value = 'building'
  shown.value = []
  try {
    const r = await streetLoopsFor(props.centre, props.mode, km.value)
    loops.value = r.loops
    streets.value = r.streets
    at.value = 0
    if (!loops.value.length) { toast("Couldn't find a loop from here. Try another distance."); phase.value = 'ask'; return }
    shown.value.push(loop.value.headingDeg)
    phase.value = 'result'
    show()
  } catch (e) {
    toast(e.message || "Couldn't build a loop just now.")
    phase.value = 'ask'
  }
}

async function another() {
  if (at.value + 1 < loops.value.length) {
    at.value++
  } else if (streets.value) {
    // build more, in directions not shown yet
    phase.value = 'building'
    try {
      const r = await streetLoopsFor(props.centre, props.mode, km.value, { skip: shown.value })
      const fresh = r.streets ? r.loops : []
      if (fresh.length) { loops.value = [...loops.value, ...fresh]; at.value++ } else { at.value = 0; toast("That's every direction from here. Back to the best one.") }
    } finally { phase.value = 'result' }
  } else {
    at.value = 0
  }
  if (loop.value && !shown.value.includes(loop.value.headingDeg)) shown.value.push(loop.value.headingDeg)
  show()
}

function hand() {
  const l = loop.value
  setPlanned({ name: `${l.km.toFixed(1)} km loop`, mode: props.mode, ring: l.line, steps: l.directions })
}
function run() {
  hand()
  router.push({ name: 'record', query: { route: 'planned' } })
}
function edit() {
  hand()
  router.push({ name: 'plan', query: { from: 'loop' } })
}
function back() {
  phase.value = 'ask'
  emit('show', null)
}

onMounted(async () => {
  if (!props.startKm) km.value = await loopKmFor(props.mode)
  if (props.auto) find()
})
</script>

<template>
  <div class="finder">
    <div class="head">
      <strong v-if="phase === 'ask'">How far do you want to {{ mode }}?</strong>
      <strong v-else-if="phase === 'building'">Finding streets</strong>
      <strong v-else>Your loop</strong>
      <button class="close" type="button" aria-label="Close" @click="emit('close')">×</button>
    </div>

    <template v-if="phase === 'ask'">
      <div class="chips" role="group" aria-label="Distance">
        <button v-for="c in CHIPS[mode]" :key="c" type="button" class="chip" :aria-pressed="km === c" @click="km = c">{{ c }} km</button>
      </div>
      <div class="stepper">
        <button type="button" class="btn quiet small" aria-label="Shorter" @click="nudge(-1)">−</button>
        <span class="km" aria-live="polite"><strong>{{ km }}</strong> km</span>
        <button type="button" class="btn quiet small" aria-label="Longer" @click="nudge(1)">+</button>
      </div>
      <p class="small muted">Loops follow real streets and paths from where you are, and go for new ground, rivals' ground and streets you haven't run.</p>
      <button class="btn block" type="button" @click="find">Find my loop</button>
    </template>

    <div v-else-if="phase === 'building'" class="building" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <span class="small muted">Trying loops in a few directions and checking which takes the most ground.</span>
    </div>

    <template v-else-if="loop">
      <p class="small">{{ loop.note }}</p>
      <div v-if="streets" class="facts small muted">
        <span>{{ loop.km.toFixed(1) }} km</span>
        <span v-if="loop.timeS">About {{ Math.max(1, Math.round(loop.timeS / 60)) }} min</span>
        <span>{{ turns.length }} {{ turns.length === 1 ? 'turn' : 'turns' }}</span>
        <span v-if="loops.length > 1">Option {{ at + 1 }} of {{ loops.length }}</span>
      </div>
      <div class="actions">
        <button class="btn" type="button" @click="run">{{ streets ? 'Go with directions' : `Start this ${MODE_LABEL[mode].toLowerCase()}` }}</button>
        <button class="btn quiet" type="button" @click="another">Try another</button>
      </div>
      <div class="actions minor">
        <button v-if="turns.length" class="link small" type="button" :aria-expanded="showDirs" @click="showDirs = !showDirs">{{ showDirs ? 'Hide directions' : 'See directions' }}</button>
        <button class="link small" type="button" @click="edit">Edit in planner</button>
        <button class="link small" type="button" @click="back">Change distance</button>
      </div>
      <ol v-if="showDirs" class="dirs small">
        <li v-for="(d, i) in loop.directions" :key="i">
          <span class="dist">{{ d.d >= 1000 ? (d.d / 1000).toFixed(1) + ' km' : d.d + ' m' }}</span>
          <span>{{ d.text }}</span>
        </li>
      </ol>
    </template>
  </div>
</template>

<style scoped>
.finder { display: grid; gap: 10px; }
.head { display: flex; align-items: center; gap: 10px; }
.head strong { flex: 1; }
.close { border: 0; background: none; font-size: 1.5rem; line-height: 1; color: var(--ink-60); cursor: pointer; min-width: 44px; min-height: 44px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  min-height: 44px; padding: 0 16px; border-radius: 999px; border: 0; font: inherit; font-weight: 700; cursor: pointer;
  background: var(--soft); color: var(--ink);
}
.chip[aria-pressed='true'] { background: var(--ink); color: #fff; }
.stepper { display: flex; align-items: center; gap: 14px; }
.stepper .btn { min-width: 48px; font-size: 1.3rem; }
.stepper .km { font-size: 1.1rem; font-variant-numeric: tabular-nums; }
.stepper .km strong { font-size: 1.6rem; }
.spinner { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 3px solid var(--soft); border-top-color: var(--you); animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.building { display: flex; align-items: center; gap: 12px; min-height: 64px; }
.facts { display: flex; flex-wrap: wrap; gap: 4px 14px; }
.actions { display: flex; gap: 10px; }
.actions .btn { flex: 1; }
.actions.minor { flex-wrap: wrap; gap: 4px 16px; }
.link { border: 0; background: none; padding: 6px 0; font: inherit; color: var(--you); font-weight: 650; cursor: pointer; min-height: 36px; }
.dirs { margin: 0; padding: 0 0 0 4px; list-style: none; display: grid; gap: 6px; max-height: 32vh; overflow: auto; }
.dirs li { display: grid; grid-template-columns: 64px 1fr; gap: 10px; }
.dist { color: var(--ink-60); font-variant-numeric: tabular-nums; }
</style>
