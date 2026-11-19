<script setup>
// "Make a story here" on the Record screen: looks at the landmarks and local
// history around you, writes the opening of a story that sends you running
// between them (lib/storyMaker), and lists the stories others made nearby.
// The story starts with the next run's Start button.
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { store, toast } from '../lib/store.js'
import { maker, lookAround, makeStory, pickStory, dropStory } from '../lib/storyMaker/session.js'
import { MOODS, LENGTHS, kmBetween, directionTo } from '../lib/storyMaker/core.js'
import { api } from '../lib/api/index.js'
import { quipsFor } from '../lib/storyMaker/quips.js'

const emit = defineEmits(['ready'])
const open = ref(false)
const mood = ref('mystery')
const km = ref(3)

// While it works: a new silly line every couple of seconds
const quip = ref('')
let quips = []
let qi = 0
let qtimer = 0
watch(() => maker.busy, (b) => {
  clearInterval(qtimer)
  if (!b) { quip.value = ''; return }
  quips = quipsFor(maker.busyKind)
  qi = 0
  quip.value = quips[0]
  // after the last one, a fresh shuffle (without the plain first line), so it never loops in the same order
  qtimer = setInterval(() => {
    qi++
    if (qi >= quips.length) { quips = quipsFor(maker.busyKind).slice(1); qi = 0 }
    quip.value = quips[qi]
  }, 2200)
}, { immediate: true })

// The bar: creeps towards 95% over the usual wait for this step (it slows as
// it goes, so a slow day never looks stuck at full), then fills when done.
const USUAL_S = { look: 12, write: 30, get: 15 }
const bar = ref(0)
let btimer = 0
watch(() => maker.busy, (b) => {
  clearInterval(btimer)
  if (!b) { bar.value = 0; return }
  const started = Date.now()
  const usual = USUAL_S[maker.busyKind] || 20
  bar.value = 2
  btimer = setInterval(() => { bar.value = Math.round(95 * (1 - Math.exp(-((Date.now() - started) / 1000) / (usual / 2)))) }, 250)
}, { immediate: true })
onBeforeUnmount(() => { clearInterval(qtimer); clearInterval(btimer) })

const here = computed(() => (store.located ? store.centre : null))
const count = computed(() => maker.places?.places?.length || 0)
const withHistory = computed(() => (maker.places?.places || []).filter((p) => p.history).length)
const first = computed(() => maker.ready?.chapter?.stop || null)
const firstAway = computed(() => {
  if (!first.value || !here.value) return ''
  const m = kmBetween(here.value, first.value) * 1000
  return `${m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m / 10) * 10 + ' m'} ${directionTo(here.value, first.value)}`
})

// Moved (an admin's Put me here, or back to you) with the panel open: the
// old landmarks were cleared, so look around the new spot straight away
watch(() => [open.value, here.value?.lat, here.value?.lng, !!maker.places], () => {
  if (open.value && here.value && !maker.places && !maker.busy && !maker.ready) {
    maker.error = ''
    lookAround(here.value)
  }
})

async function start() {
  open.value = true
  lastTry = start
  if (!here.value) { maker.error = 'Still waiting for your location. Try again in a moment.'; return }
  if (!maker.places) await lookAround(here.value)
}
async function again() {
  lastTry = again
  maker.places = null
  if (here.value) await lookAround(here.value)
}
async function write() {
  lastTry = write
  if (!here.value) return toast('Waiting for your location.')
  await makeStory(here.value, { mood: mood.value, targetKm: km.value })
  if (maker.ready) emit('ready')
}
// After a problem: look around again if that's what failed, else write again
let lastTry = () => start()
function retry() {
  maker.error = ''
  return lastTry()
}
function close() {
  maker.error = ''
  open.value = false
}
async function pick(id) {
  lastTry = () => pick(id)
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
      <!-- a little map: contour lines, three landmarks, and the story's route drawing itself between them -->
      <svg class="omap" viewBox="0 0 360 132" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g class="contours" fill="none" stroke-width="1">
          <path d="M-10 108 C60 84 110 122 180 98 S300 64 370 86" />
          <path d="M-10 84 C50 62 120 98 190 74 S310 40 370 60" />
          <path d="M150 -10 C170 20 230 30 250 10 S330 -6 370 18" />
          <path d="M210 140 C230 112 290 118 310 100 S360 92 380 104" />
        </g>
        <path class="route" d="M196 104 C224 92 228 64 252 58 S300 74 318 48 S332 20 296 22" pathLength="100" />
        <path class="route glow" d="M196 104 C224 92 228 64 252 58 S300 74 318 48 S332 20 296 22" pathLength="100" />
        <g class="pin p1"><circle cx="252" cy="58" r="5" /></g>
        <g class="pin p2"><circle cx="318" cy="48" r="5" /></g>
        <g class="pin p3"><circle cx="296" cy="22" r="5" /><path d="M296 22 v-16 l10 4 -10 4" class="flag" /></g>
        <circle class="you" cx="196" cy="104" r="5" />
        <circle class="youring" cx="196" cy="104" r="5" />
      </svg>
      <span class="oshade" aria-hidden="true" />
      <span class="otext">
        <span class="okick">New: written where you stand</span>
        <span class="otitle">Make a story here</span>
        <span class="ometa">Real landmarks and history near you. Every choice changes where it goes.</span>
      </span>
      <span class="ogo" aria-hidden="true">Write one</span>
    </button>
    <template v-else>
      <h2 id="sm-title" class="title">Make a story here</h2>
      <div v-if="maker.busy" class="working">
        <span class="sr-only" aria-live="polite">{{ maker.busy }}</span>
        <span class="quill" aria-hidden="true"><i /><i /><i /></span>
        <Transition name="quip" mode="out-in"><p :key="quip" class="quip" aria-hidden="true">{{ quip }}…</p></Transition>
        <span class="bar" role="progressbar" aria-label="Progress" :aria-valuenow="bar" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: bar + '%' }" /></span>
      </div>
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
        <p v-if="count < 4" class="notice small">Only {{ count }} {{ count === 1 ? 'landmark' : 'landmarks' }} turned up just now. The map service may be busy. <button class="linkish" type="button" @click="again">Look again</button></p>
        <button class="btn" type="button" :disabled="!count || !!maker.busy" @click="write">Write my story</button>
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
      <div v-if="maker.error && !maker.busy" class="notice bad small oops">
        <p>{{ maker.error }}</p>
        <div class="row">
          <button class="btn small" type="button" @click="retry">Try again</button>
          <button class="btn quiet small" type="button" @click="close">Close</button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.sm { display: grid; gap: 8px; margin: 10px 0; }
/* The opener: a dusk map with the story's route drawing itself in, once */
.opener {
  --amber: #FFC15E;
  position: relative; display: block; width: 100%; height: 132px; padding: 0; border: 0; border-radius: 16px; overflow: hidden; isolation: isolate;
  background: radial-gradient(120% 140% at 85% 20%, #2B4A5E 0%, #14283A 45%, #0B1622 100%);
  color: #fff; font: inherit; text-align: left; cursor: pointer;
}
.opener:focus-visible { outline: 3px solid var(--you); outline-offset: 2px; }
.omap { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -2; }
.contours { stroke: rgba(160, 205, 220, 0.16); }
.route { fill: none; stroke: var(--amber); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: 100; animation: draw 1.6s 0.25s cubic-bezier(0.5, 0, 0.2, 1) forwards; }
.route.glow { stroke-width: 10; opacity: 0.25; filter: blur(4px); }
.pin circle { fill: #0B1622; stroke: var(--amber); stroke-width: 2.5; }
.pin { opacity: 0; transform-box: fill-box; transform-origin: center; animation: pop 0.35s ease-out forwards; }
.pin.p1 { animation-delay: 0.75s; }
.pin.p2 { animation-delay: 1.15s; }
.pin.p3 { animation-delay: 1.6s; }
.flag { fill: var(--amber); stroke: var(--amber); stroke-width: 1.5; stroke-linejoin: round; }
.you { fill: #6FB5FF; stroke: #fff; stroke-width: 2; }
.youring { fill: none; stroke: #6FB5FF; stroke-width: 2; transform-box: fill-box; transform-origin: center; animation: ping 2.4s ease-out infinite; }
.oshade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(8, 16, 24, 0.92) 0%, rgba(8, 16, 24, 0.7) 45%, rgba(8, 16, 24, 0) 75%); }
.otext { position: absolute; left: 16px; right: 16px; bottom: 14px; display: grid; gap: 3px; }
.okick { font-size: 0.75rem; font-weight: 750; color: var(--amber); }
.otitle { font-weight: 900; font-stretch: 62%; font-size: 1.85rem; line-height: 0.95; letter-spacing: 0.005em; }
.ometa { font-size: 0.8rem; line-height: 1.3; opacity: 0.85; max-width: 62%; }
.ogo { position: absolute; right: 12px; bottom: 14px; padding: 7px 12px; border-radius: 999px; background: var(--amber); color: #1A1206; font-weight: 800; font-size: 0.85rem; }
.opener:active .ogo { transform: scale(0.96); }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes pop { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); } }
@keyframes ping { from { opacity: 0.9; transform: scale(1); } to { opacity: 0; transform: scale(3.2); } }
@media (prefers-reduced-motion: reduce) {
  .route { animation: none; stroke-dashoffset: 0; }
  .pin { animation: none; opacity: 1; }
  .youring { animation: none; opacity: 0; }
}
.title { font-weight: 800; font-size: 1rem; margin: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.working { position: relative; display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px 14px 16px; border-radius: 14px; background: var(--soft); overflow: hidden; }
.bar { position: absolute; left: 14px; right: 14px; bottom: 7px; height: 5px; border-radius: 3px; background: rgba(22, 48, 42, 0.12); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--you), #FFC15E); transition: width 0.25s linear; }
.quip { font-weight: 700; font-size: 0.92rem; }
.quill { display: inline-flex; gap: 4px; flex: none; }
.quill i { width: 7px; height: 7px; border-radius: 50%; background: var(--you); animation: hop 1s ease-in-out infinite; }
.quill i:nth-child(2) { animation-delay: 0.15s; }
.quill i:nth-child(3) { animation-delay: 0.3s; }
@keyframes hop { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-5px); opacity: 1; } }
.quip-enter-active, .quip-leave-active { transition: opacity 0.25s, transform 0.25s; }
.quip-enter-from { opacity: 0; transform: translateY(6px); }
.quip-leave-to { opacity: 0; transform: translateY(-6px); }
@media (prefers-reduced-motion: reduce) {
  .quill i { animation: none; opacity: 1; }
  .quip-enter-active, .quip-leave-active { transition: none; }
}
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
.oops { display: grid; gap: 8px; }
.linkish { border: 0; background: none; padding: 0; font: inherit; font-weight: 750; color: inherit; text-decoration: underline; cursor: pointer; }
</style>
