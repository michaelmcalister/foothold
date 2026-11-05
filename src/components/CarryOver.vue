<script setup>
// After signing up: offers to move the runs recorded on the practice map onto
// the real map. Shows once there's something to move; "Not now" hides it
// for good (Settings doesn't need to know about it).
import { ref, onMounted } from 'vue'
import { movablePractice, movePractice, carryDismissed, dismissCarry } from '../lib/carryOver.js'
import { refresh } from '../lib/store.js'
import { plural } from '../lib/format.js'

const runs = ref([])
const state = ref('ask') // ask | moving | done
const progress = ref([0, 0])
const result = ref(null)

onMounted(async () => {
  if (carryDismissed()) return
  runs.value = await movablePractice().catch(() => [])
})

async function move() {
  state.value = 'moving'
  result.value = await movePractice(runs.value, (d, t) => { progress.value = [d, t] })
  state.value = 'done'
  dismissCarry()
  refresh()
}
function later() {
  dismissCarry()
  runs.value = []
}
</script>

<template>
  <section v-if="runs.length" class="carry" aria-live="polite" aria-labelledby="carry-h">
    <template v-if="state === 'ask'">
      <h2 id="carry-h">Bring your practice runs across?</h2>
      <p>You recorded {{ plural(runs.length, 'run', 'runs') }} on the practice map. Move {{ runs.length === 1 ? 'it' : 'them' }} to your account and the ground goes on the real map.</p>
      <div class="row">
        <button class="btn" type="button" @click="move">Move {{ runs.length === 1 ? 'it' : 'them' }}</button>
        <button class="btn quiet" type="button" @click="later">Not now</button>
      </div>
    </template>
    <template v-else-if="state === 'moving'">
      <h2 id="carry-h">Moving your runs</h2>
      <p>{{ progress[0] }} of {{ progress[1] }} done.</p>
    </template>
    <template v-else>
      <h2 id="carry-h">{{ result.moved ? 'Your runs are on the real map' : 'Nothing new to move' }}</h2>
      <p>
        <template v-if="result.moved">{{ plural(result.moved, 'run', 'runs') }} moved across.</template>
        <template v-if="result.skipped"> {{ plural(result.skipped, 'was', 'were') }} already there.</template>
        <template v-if="result.failed"> {{ plural(result.failed, "run didn't", "runs didn't") }} make it. You can import the GPX file from the Record screen.</template>
      </p>
      <button class="btn quiet" type="button" @click="runs = []">Done</button>
    </template>
  </section>
</template>

<style scoped>
.carry { margin: 12px var(--pad, 16px) 0; padding: 16px; border-radius: var(--radius, 14px); background: #E8EDFC; display: grid; gap: 8px; }
.carry h2 { margin: 0; font-size: 1.1rem; }
.carry p { margin: 0; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
