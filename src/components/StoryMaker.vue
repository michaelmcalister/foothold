<script setup>
// "Make a story here" on the Record screen: looks at the landmarks and local
// history around you, writes the opening of a story that sends you running
// between them (lib/storyMaker), and lists the stories others made nearby.
// The story starts with the next run's Start button.
import { ref, computed } from 'vue'
import { store, toast } from '../lib/store.js'
import { maker, lookAround, makeStory, pickStory, dropStory } from '../lib/storyMaker/session.js'
import { MOODS, LENGTHS, kmBetween, directionTo } from '../lib/storyMaker/core.js'
import { api } from '../lib/api/index.js'

const emit = defineEmits(['ready'])
const open = ref(false)
const mood = ref('mystery')
const km = ref(3)

const here = computed(() => (store.located ? store.centre : null))
const count = computed(() => maker.places?.places?.length || 0)
const withHistory = computed(() => (maker.places?.places || []).filter((p) => p.history).length)
const first = computed(() => maker.ready?.chapter?.stop || null)
const firstAway = computed(() => {
  if (!first.value || !here.value) return ''
  const m = kmBetween(here.value, first.value) * 1000
  return `${m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m / 10) * 10 + ' m'} ${directionTo(here.value, first.value)}`
})

async function start() {
  open.value = true
  if (!here.value) return toast('Waiting for your location. Try again in a moment.')
  if (!maker.places) await lookAround(here.value)
}
async function write() {
  if (!here.value) return toast('Waiting for your location.')
  await makeStory(here.value, { mood: mood.value, targetKm: km.value })
  if (maker.ready) emit('ready')
}
async function pick(id) {
  await pickStory(id)
  if (maker.ready) emit('ready')
}
async function share(s) {
  try {
    const out = await api.storyShare(s.id, s.status !== 'shared')
    Object.assign(s, out.story)
    toast(s.status === 'shared' ? 'Shared. Runners near here can now run your story.' : 'Only you can see this story now.')
  } catch (e) { toast(e.message) }
}
async function report(s) {
  await api.storyReport(s.id).catch(() => {})
  maker.near = maker.near.filter((x) => x.id !== s.id)
  toast('Thanks. We’ll take a look.')
}
</script>

<template>
  <section class="sm" aria-labelledby="sm-title">
    <div v-if="maker.ready" class="ready">
      <p class="small muted">Your story is ready</p>
      <h2 id="sm-title" class="title">{{ maker.ready.story.title || 'Your story' }}</h2>
      <p class="small">First stop: <strong>{{ first?.name }}</strong><template v-if="firstAway">, {{ firstAway }}</template>. Press Start and the story guides you there.</p>
      <button class="btn quiet small" type="button" @click="dropStory">Choose another</button>
    </div>
    <button v-else-if="!open" class="opener" type="button" @click="start">
      <span class="h">Make a story here</span>
      <span class="small muted">A story written around the landmarks and history near you. It changes with every choice you make.</span>
    </button>
    <template v-else>
      <h2 id="sm-title" class="title">Make a story here</h2>
      <p v-if="maker.busy" class="small" aria-live="polite">{{ maker.busy }}…</p>
      <template v-else-if="maker.places">
        <p class="small muted">
          {{ count }} {{ count === 1 ? 'landmark' : 'landmarks' }} near you<template v-if="withHistory">, {{ withHistory }} with real history</template><template v-if="maker.places.suburb"> around {{ maker.places.suburb }}</template>.
        </p>
        <div class="row" role="group" aria-label="Kind of story">
          <button v-for="(m, k) in MOODS" :key="k" type="button" class="pill" :aria-pressed="mood === k" @click="mood = k">{{ m.label }}</button>
        </div>
        <p class="small muted">{{ MOODS[mood].about }}</p>
        <div class="row" role="group" aria-label="How far">
          <button v-for="n in LENGTHS" :key="n" type="button" class="pill" :aria-pressed="km === n" @click="km = n">{{ n }} km</button>
        </div>
        <button class="btn" type="button" :disabled="!count" @click="write">Write my story</button>
        <template v-if="maker.near.length">
          <h3 class="sub">Stories made near you</h3>
          <ul class="plain list">
            <li v-for="s in maker.near" :key="s.id">
              <button type="button" class="story" @click="pick(s.id)">
                <strong>{{ s.title }}</strong>
                <span class="small muted">{{ MOODS[s.mood]?.label }}, about {{ s.targetKm }} km. {{ s.yours ? 'Yours' : `By ${s.maker}` }}<template v-if="s.finishes">, finished {{ s.finishes }} {{ s.finishes === 1 ? 'time' : 'times' }}</template><template v-if="s.yours && s.status !== 'shared'">. Only you can see it</template></span>
              </button>
              <button v-if="s.yours" type="button" class="btn quiet small" @click="share(s)">{{ s.status === 'shared' ? 'Unshare' : 'Share' }}</button>
              <button v-else type="button" class="btn quiet small" @click="report(s)">Report</button>
            </li>
          </ul>
        </template>
        <p class="small muted">Stories are written by AI from public places and Wikipedia, and kept so others can run them. Stay on paths and look out for traffic.</p>
      </template>
      <p v-if="maker.error" class="notice bad small">{{ maker.error }}</p>
    </template>
  </section>
</template>

<style scoped>
.sm { display: grid; gap: 8px; margin: 10px 0; }
.opener { display: grid; gap: 2px; text-align: left; background: var(--soft); border: 0; border-radius: 14px; padding: 12px 14px; color: inherit; font: inherit; cursor: pointer; }
.opener .h, .title { font-weight: 800; font-size: 1rem; margin: 0; }
.ready { display: grid; gap: 4px; background: var(--tint, var(--soft)); border-radius: 14px; padding: 12px 14px; }
.ready p { margin: 0; }
.ready .btn { justify-self: start; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
.pill { border: 1px solid var(--line, #ccd); background: transparent; color: inherit; border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 0.85rem; font-weight: 650; cursor: pointer; }
.pill[aria-pressed='true'] { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.sub { font-size: 0.9rem; margin: 6px 0 0; }
.list { display: grid; gap: 6px; list-style: none; margin: 0; padding: 0; }
.list li { display: flex; gap: 8px; align-items: center; }
.story { flex: 1; min-width: 0; display: grid; gap: 2px; text-align: left; background: var(--soft); border: 0; border-radius: 12px; padding: 8px 12px; color: inherit; font: inherit; cursor: pointer; }
p { margin: 0; }
</style>
