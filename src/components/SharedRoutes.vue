<script setup>
// "Shared with me": routes your crew sent you, newest first. Each shows who
// sent it, its distance and its day and time, with Plan it (emits `open` with
// the route), Add to calendar (when it has a time ahead) and Hide.
// Shows nothing when there are none, so a screen can drop it in anywhere.
import { ref, onMounted } from 'vue'
import { api } from '../lib/api/index.js'
import { toast } from '../lib/store.js'
import { km, MODE_LABEL } from '../lib/format.js'
import { whenLabel, addRouteToCalendar } from '../lib/routeShare.js'
import Crest from './Crest.vue'

const props = defineProps({ title: { type: String, default: 'Shared with me' } })
const emit = defineEmits(['open', 'loaded'])

const items = ref([])
const busy = ref(null)

async function load() {
  try {
    items.value = (await api.sharedRoutes()).shared || []
  } catch {
    items.value = []
  }
  emit('loaded', items.value.length)
}
onMounted(load)
defineExpose({ reload: load })

const ahead = (s) => s.plannedAt != null && s.plannedAt > Date.now()
// What `open` carries: a route the planner can load or save, plus who sent it
const asRoute = (s) => ({ ...s.route, plannedAt: s.plannedAt, shareId: s.id, from: s.from, practice: !!s.practice })

function calendar(s) {
  try {
    addRouteToCalendar({ id: s.id, ...s.route, plannedAt: s.plannedAt, fromName: s.from.name })
  } catch (e) {
    toast(e.message)
  }
}
async function hide(s) {
  busy.value = s.id
  try {
    await api.hideSharedRoute(s.id)
    items.value = items.value.filter((x) => x.id !== s.id)
    emit('loaded', items.value.length)
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section v-if="items.length" class="shared" aria-labelledby="shared-h">
    <h3 id="shared-h">{{ props.title }}</h3>
    <ul class="list">
      <li v-for="s in items" :key="s.id" class="item">
        <div class="who">
          <Crest :crest="s.from.crest" :colour="s.from.colour" :id="s.from.id" :size="28" />
          <div class="txt">
            <strong class="name">{{ s.route.name }}</strong>
            <span class="small muted">{{ MODE_LABEL[s.route.mode] || 'Run' }}, {{ km(s.route.distanceM) }} km, from <span class="from">{{ s.from.name }}</span></span>
            <span v-if="s.plannedAt != null" class="small when">{{ ahead(s) ? 'Planned for' : 'Was planned for' }} {{ whenLabel(s.plannedAt) }}</span>
            <span v-if="s.practice" class="chip">Practice example</span>
          </div>
        </div>
        <div class="acts">
          <button type="button" class="btn small" @click="emit('open', asRoute(s))">Plan it</button>
          <button v-if="ahead(s)" type="button" class="btn quiet small" @click="calendar(s)">Add to calendar</button>
          <button type="button" class="btn quiet small" :disabled="busy === s.id" :aria-label="`Hide ${s.route.name}`" @click="hide(s)">Hide</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.shared { display: grid; gap: 6px; min-width: 0; }
.shared h3 { margin: 0; }
.list { list-style: none; margin: 0; padding: 0; display: grid; }
.item { display: grid; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--line); min-width: 0; }
.item:last-child { border-bottom: 0; }
.who { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; min-width: 0; }
.txt { display: grid; gap: 2px; min-width: 0; justify-items: start; }
.name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.from { font-weight: 700; }
.when { font-weight: 650; }
.chip { margin-top: 4px; }
.acts { display: flex; gap: 8px; flex-wrap: wrap; padding-left: 40px; }
</style>
