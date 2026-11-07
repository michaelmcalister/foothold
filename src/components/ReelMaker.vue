<script setup>
// "Make a reel": a button (style it with a class) that opens a full-screen sheet to make a 15 to 20
// second vertical video of a run's flyover, with music and the numbers, for
// Instagram Stories or TikTok. The video is made on the phone (lib/recap/reel.js)
// and shared with the share sheet, or saved. The trail leaves out the ends inside
// privacy zones, and the person's name is only on it if they turn it on.
// Browsers that can't record video get the still share card instead.
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'
import { store } from '../lib/store.js'
import { audio } from '../lib/audio/settings.js'
import { reelGround } from '../lib/recap/reelPlan.js'
import ShareCard from './ShareCard.vue'

const props = defineProps({
  activity: { type: Object, required: true },
  track: { type: Array, default: () => [] },
  hexCount: { type: Number, default: null },
})

const open = ref(false)
const state = ref('intro') // intro | making | done | unsupported | short | error
const stage = ref('map')
const progress = ref(0)
const showName = ref(false)
const music = ref(audio.recapMusic !== false)
const result = ref(null)
const problem = ref('')
const frame = ref(null)
const closeBtn = ref(null)
let abort = null
let opener = null

const name = computed(() => (store.user?.name || '').trim())
const colour = computed(() => store.user?.colour || '#2E55E6')
const pct = computed(() => Math.round(progress.value * 100))
const canShare = computed(() => {
  const f = result.value?.file
  try { return !!(f && navigator.canShare?.({ files: [f] })) } catch { return false }
})
const ground = computed(() => reelGround(props.track, {
  zones: props.activity?.demo ? [] : store.user?.zones || [],
  mode: props.activity?.mode,
  hexCount: props.hexCount ?? undefined,
  activity: props.activity,
}))

async function show(e) {
  opener = e?.currentTarget || null
  open.value = true
  result.value = null
  problem.value = ''
  const { reelSupport } = await import('../lib/recap/reel.js')
  if (!reelSupport().ok) state.value = 'unsupported'
  else if (!ground.value) state.value = 'short'
  else state.value = 'intro'
  await nextTick()
  closeBtn.value?.focus()
}

async function make() {
  state.value = 'making'
  stage.value = 'map'
  progress.value = 0
  abort = new AbortController()
  const { makeReel } = await import('../lib/recap/reel.js')
  try {
    result.value = await makeReel(ground.value, {
      activity: props.activity,
      colour: colour.value,
      name: name.value,
      showName: showName.value,
      music: music.value,
      origin: location.origin,
      signal: abort.signal,
      onStage: (s) => { stage.value = s },
      onProgress: (p) => { progress.value = p },
      onCanvas: (c) => { nextTick(() => { frame.value?.replaceChildren(c) }) },
    })
    state.value = 'done'
  } catch (e) {
    if (e?.name === 'AbortError') { state.value = 'intro'; return }
    problem.value = e?.name === 'HiddenError'
      ? 'Foothold went into the background, so the reel stopped. Keep this screen open while it’s made.'
      : 'Something went wrong making your reel. Try again in a moment.'
    state.value = 'error'
  } finally {
    abort = null
  }
}

function cancel() { abort?.abort() }

async function share() {
  const r = result.value
  if (!r) return
  try {
    await navigator.share({ files: [r.file], title: 'My Foothold reel' })
  } catch (e) {
    if (e?.name !== 'AbortError') save() // the share sheet failed: save it instead
  }
}

function save() {
  const r = result.value
  if (!r) return
  const a = document.createElement('a')
  a.href = r.url
  a.download = r.fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function close() {
  cancel()
  open.value = false
  if (result.value?.url) URL.revokeObjectURL(result.value.url)
  result.value = null
  opener?.focus?.()
}

function onKey(e) { if (e.key === 'Escape' && state.value !== 'making') close() }

onBeforeUnmount(() => {
  cancel()
  if (result.value?.url) URL.revokeObjectURL(result.value.url)
})
</script>

<template>
  <button class="reel-open" type="button" @click="show">Make a reel<Teleport to="body">
    <div v-if="open" class="reel-sheet" role="dialog" aria-modal="true" aria-labelledby="reel-title" :style="{ '--you': colour }" @keydown="onKey">
      <header class="reel-top">
        <h2 id="reel-title">Make a reel</h2>
        <button ref="closeBtn" class="x" type="button" aria-label="Close" @click="close">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
        </button>
      </header>

      <div v-if="state === 'intro'" class="reel-body">
        <div class="poster" aria-hidden="true">
          <span class="ph-brand">FOOTHOLD</span>
          <span class="ph-hex"></span>
          <span class="ph-line"></span>
        </div>
        <p>A short vertical video of your flyover, about 18 seconds, with music and your numbers. Ready for Instagram Stories or TikTok.</p>
        <label v-if="name" class="toggle">
          <input v-model="showName" type="checkbox" />
          <span>Show my name</span>
        </label>
        <label class="toggle">
          <input v-model="music" type="checkbox" />
          <span>Add music</span>
        </label>
        <p class="small fine">It’s made on your phone and nothing is uploaded. Keep this screen open while it plays through.</p>
        <button class="btn block" type="button" @click="make">Make my reel</button>
      </div>

      <div v-else-if="state === 'making'" class="reel-body making">
        <div ref="frame" class="frame" aria-hidden="true"></div>
        <div class="bar" role="progressbar" aria-label="Reel progress" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
          <span :style="{ width: pct + '%' }"></span>
        </div>
        <p class="status" aria-live="polite">{{ stage === 'map' ? 'Getting the map ready' : `Making your reel, ${pct}%` }}</p>
        <button class="btn ghost block" type="button" @click="cancel">Cancel</button>
      </div>

      <div v-else-if="state === 'done' && result" class="reel-body">
        <video class="preview" :src="result.url" controls playsinline loop muted autoplay aria-label="Your reel"></video>
        <div class="row">
          <button v-if="canShare" class="btn" type="button" @click="share">Share</button>
          <button class="btn" :class="{ ghost: canShare }" type="button" @click="save">Save</button>
        </div>
        <button class="btn ghost block" type="button" @click="state = 'intro'">Make it again</button>
      </div>

      <div v-else-if="state === 'unsupported'" class="reel-body">
        <p>This browser can’t record video, so it can’t make a reel. You can share a picture of your run instead.</p>
        <p class="small fine">Reels work in recent Chrome, Safari and Edge.</p>
        <div class="card"><ShareCard :activity="activity" :new-hexes="ground?.hexCount || 0" /></div>
      </div>

      <div v-else-if="state === 'short'" class="reel-body">
        <p>This one is too short to make a reel. Record a longer loop and try again.</p>
        <button class="btn block" type="button" @click="close">Back</button>
      </div>

      <div v-else-if="state === 'error'" class="reel-body">
        <p>{{ problem }}</p>
        <button class="btn block" type="button" @click="make">Try again</button>
        <div class="card"><ShareCard :activity="activity" :new-hexes="ground?.hexCount || 0" /></div>
      </div>
    </div>
  </Teleport></button>
</template>

<style scoped>
.reel-open { justify-self: start; }
.reel-sheet {
  position: fixed; inset: 0; z-index: 80; display: grid; grid-template-rows: auto 1fr; overflow-y: auto;
  background: #16302A; color: #F3F5EF; font-family: var(--font);
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
  animation: reel-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes reel-in { from { opacity: 0; transform: translateY(24px); } }
.reel-top { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
.reel-top h2 { margin: 0; font-size: 1.25rem; font-weight: 800; font-stretch: 106%; }
.x {
  width: 44px; height: 44px; border-radius: 50%; border: 0; display: grid; place-items: center; cursor: pointer;
  background: rgba(255, 255, 255, 0.14); color: #fff;
}
.reel-body { width: 100%; max-width: 440px; margin: 0 auto; padding: 4px 16px 24px; display: grid; gap: 14px; align-content: start; }
.reel-body p { margin: 0; }
.fine { opacity: 0.72; }
.poster {
  justify-self: center; width: min(calc(46vw / var(--zoom, 1)), 180px); aspect-ratio: 9 / 16; border-radius: 16px; position: relative; overflow: hidden;
  background: linear-gradient(#24463D, #ECEFE4 70%); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.ph-brand { position: absolute; top: 12px; left: 12px; font-weight: 850; font-stretch: 125%; font-size: 0.8rem; letter-spacing: 0.02em; }
.ph-hex {
  position: absolute; left: 30%; top: 46%; width: 40%; aspect-ratio: 1.15; background: var(--you); opacity: 0.45;
  clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%);
}
.ph-line { position: absolute; left: 20%; right: 20%; top: 58%; height: 6px; border-radius: 3px; background: var(--you); box-shadow: 0 0 0 3px #fff; }
.toggle { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 14px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); cursor: pointer; font-weight: 650; }
.toggle input { width: 22px; height: 22px; accent-color: var(--you); }
.frame {
  justify-self: center; width: min(calc(56vw / var(--zoom, 1)), 240px); aspect-ratio: 9 / 16; border-radius: 16px; overflow: hidden; background: #ECEFE4;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.frame :deep(canvas) { width: 100%; height: 100%; display: block; }
.bar { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.14); overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--you); transition: width 0.2s linear; }
.status { text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.preview { justify-self: center; width: min(calc(64vw / var(--zoom, 1)), 280px); aspect-ratio: 9 / 16; border-radius: 16px; background: #000; }
.row { display: flex; gap: 10px; }
.row .btn { flex: 1; }
.btn.ghost { background: rgba(255, 255, 255, 0.12); color: #fff; box-shadow: none; }
.card { background: #F3F5EF; color: #16302A; border-radius: 16px; padding: 14px; }
.x:focus-visible, .btn:focus-visible, .toggle:focus-within { outline: 3px solid #fff; outline-offset: 2px; }
@media (max-height: 680px) { .poster, .frame { width: min(calc(40vw / var(--zoom, 1)), 150px); } }
@media (prefers-reduced-motion: reduce) {
  .reel-sheet { animation: none; }
  .bar span { transition: none; }
}
</style>
