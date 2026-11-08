<script setup>
// Foothold Wrapped: your year in review as full screen story slides. Tap the
// right side (or swipe left, or press the right arrow) for the next slide,
// the left side for the one before. Hold to pause. Before 1 December it is
// "your year so far"; ?full=1 shows the December version early. The maths is
// in src/lib/wrapped.js, the loading in src/lib/wrappedData.js.
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Crest from '../../components/Crest.vue'
import YearFilm from '../../components/wrapped/YearFilm.vue'
import { loadWrapped, markWrappedSeen } from '../../lib/wrappedData.js'
import { slidesFor, rivalLine } from '../../lib/wrapped.js'
import { headline, bestText, loopPath, drawCard, cardBlob, shareCard, saveCard } from '../../lib/wrappedCard.js'
import { MODE_LABEL } from '../../lib/format.js'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const progress = ref({ done: 0, total: 0 })
const error = ref('')
const data = ref(null)
const index = ref(0)
const elapsed = ref(0)
const paused = ref(false) // the pause button
const holding = ref(false) // a finger held down
const hidden = ref(false)
const reduced = ref(false)
const showName = ref(false)
const cardUrl = ref('')
const shareNote = ref('')
const stage = ref(null)

const sum = computed(() => data.value?.summary)
const user = computed(() => data.value?.user || {})
const colour = computed(() => user.value.colour || '#2E55E6')
const year = computed(() => data.value?.wrapped.year || new Date().getFullYear())
const full = computed(() => !!data.value?.wrapped.full)
const slides = computed(() => (sum.value ? slidesFor(sum.value) : []))
const current = computed(() => slides.value[index.value])
const filmMs = computed(() => Math.min(9000, Math.max(3000, (sum.value?.frames.length || 0) * 220)))
const DURATION = { intro: 5000, numbers: 6500, loop: 6500, rival: 6500, month: 6500, bests: 7000 }
const duration = (name) => (name === 'map' ? (reduced.value ? 5000 : filmMs.value + 3500) : DURATION[name] ?? Infinity)
const running = computed(() => !loading.value && !paused.value && !holding.value && !hidden.value && Number.isFinite(duration(current.value)))
const fill = (i) => (i < index.value ? 1 : i > index.value ? 0 : Number.isFinite(duration(current.value)) ? Math.min(1, elapsed.value / duration(current.value)) : 1)

const nums = computed(() => (sum.value ? headline(sum.value.totals) : []))
const modesLine = computed(() => {
  const m = sum.value?.totals.modes || {}
  const parts = Object.entries(m).filter(([, n]) => n).map(([k, n]) => `${n} ${MODE_LABEL[k].toLowerCase()}${n === 1 ? '' : 's'}`)
  return parts.length > 1 ? parts.join(', ') : ''
})
const loopD = computed(() => (sum.value?.loop ? loopPath(sum.value.loop.ring, 240, 18) : ''))
const anyPb = computed(() => (sum.value?.bests || []).some((b) => b.pb))
const rival = computed(() => sum.value?.rival)
const slideLabel = computed(() => `Slide ${index.value + 1} of ${slides.value.length}`)

// ---- moving through the story ----
let raf = 0
let last = 0
function frame(now) {
  const dt = last ? Math.min(100, now - last) : 0
  last = now
  if (running.value) {
    elapsed.value += dt
    if (elapsed.value >= duration(current.value)) next()
  }
  raf = requestAnimationFrame(frame)
}
function go(i) {
  if (i < 0 || i >= slides.value.length) return
  index.value = i
  elapsed.value = 0
}
function next() {
  if (index.value < slides.value.length - 1) go(index.value + 1)
  else elapsed.value = duration(current.value) // stay on the last slide
}
function prev() {
  if (index.value > 0) go(index.value - 1)
  else elapsed.value = 0
}
function close() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'you' })
}
function togglePause() { paused.value = !paused.value }

// Tap, hold and swipe on the two halves of the screen
let down = null
const HOLD_MS = 260
function onDown(e) {
  down = { x: e.clientX, y: e.clientY, at: performance.now() }
  holding.value = true
}
function onUp(e, side) {
  holding.value = false
  if (!down) return
  const dx = e.clientX - down.x
  const dy = e.clientY - down.y
  const held = performance.now() - down.at
  down = null
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? next() : prev()
  if (dy > 90 && Math.abs(dy) > Math.abs(dx)) return close() // swipe down closes, like stories
  if (held < HOLD_MS) side === 'next' ? next() : prev()
}
function onCancel() { holding.value = false; down = null }
// Keyboard (Enter or Space on the focused button) arrives as a click with no pointer
function onKeyClick(e, side) { if (e.detail === 0) side === 'next' ? next() : prev() }

function onKey(e) {
  if (e.target?.closest?.('input, textarea, select')) return
  if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
  else if (e.key === 'Escape') { e.preventDefault(); close() }
  else if (e.key === 'p' || e.key === 'P') togglePause()
}
const onVisible = () => { hidden.value = document.visibilityState === 'hidden' }

// ---- the share card ----
let canvas = null
async function renderCard() {
  if (!sum.value || !slides.value.includes('share')) return
  canvas ||= document.createElement('canvas')
  await document.fonts?.ready
  drawCard(canvas, { summary: sum.value, colour: colour.value, name: user.value.name || '', showName: showName.value, full: full.value })
  cardUrl.value = canvas.toDataURL('image/png')
}
watch(showName, renderCard)
async function share() {
  shareNote.value = ''
  const blob = await cardBlob(canvas)
  const how = await shareCard(blob, year.value)
  if (how === 'saved') shareNote.value = 'Saved. Look for it in your downloads.'
}
async function save() {
  saveCard(await cardBlob(canvas), year.value)
  shareNote.value = 'Saved. Look for it in your downloads.'
}
function again() { go(0) }

// Focus follows the slide, so screen readers hear each one
function focusHead() { stage.value?.querySelector('.slide-h')?.focus({ preventScroll: true }) }

onMounted(async () => {
  try {
    reduced.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
  } catch { reduced.value = false }
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisible)
  raf = requestAnimationFrame(frame)
  try {
    data.value = await loadWrapped({ full: route.query.full === '1', onProgress: (done, total) => { progress.value = { done, total } } })
    markWrappedSeen(data.value.wrapped.year)
    await renderCard()
  } catch (e) {
    error.value = e?.message || 'Your year would not load just now.'
  } finally {
    loading.value = false
    elapsed.value = 0
  }
  await nextTick()
  focusHead()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <div class="wrapped" :class="[`on-${current || 'loading'}`, { reduced }]" :style="{ '--me': colour }"
    role="region" aria-roledescription="story" :aria-label="data ? data.wrapped.title : 'Your year in Foothold'">
    <div v-if="slides.length" class="bars" aria-hidden="true">
      <span v-for="(s, i) in slides" :key="s" class="bar"><span :style="{ transform: `scaleX(${fill(i)})` }"></span></span>
    </div>
    <div class="topbtns">
      <button v-if="slides.length && Number.isFinite(duration(current))" class="round" type="button" :aria-label="paused ? 'Play the story' : 'Pause the story'" :aria-pressed="paused" @click="togglePause">
        <svg v-if="paused" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
        <svg v-else viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z" fill="currentColor" /></svg>
      </button>
      <button class="round" type="button" aria-label="Close your year in review" @click="close">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
      </button>
    </div>

    <div v-if="loading" class="slide center loading" role="status">
      <div class="hexspin" aria-hidden="true"></div>
      <p class="kicker">Rolling the tape on your year</p>
      <p v-if="progress.total" class="muted">Mapping {{ progress.done }} of {{ progress.total }} outings</p>
    </div>

    <div v-else-if="error" class="slide center" role="alert">
      <h1 class="slide-h" tabindex="-1">Your year would not load just now.</h1>
      <p class="muted">{{ error }} Give it another go in a moment.</p>
      <button class="cta" type="button" @click="close">Back to You</button>
    </div>

    <div v-else ref="stage" class="stage">
      <p class="sr-only" aria-live="polite">{{ slideLabel }}</p>
      <Transition :name="reduced ? 'fade' : 'slide'" mode="out-in" @after-enter="focusHead">
        <section v-if="current === 'intro'" key="intro" class="slide center intro" :aria-label="slideLabel">
          <Crest class="crest" :crest="user.crest" :colour="colour" :id="user.id" :size="132" />
          <p class="kicker">{{ full ? `Foothold Wrapped ${year}` : 'Your year so far' }}</p>
          <h1 class="slide-h" tabindex="-1"><span class="yr">{{ year }}.</span>
            <span v-if="sum.totals.activities">You took ground.</span><span v-else>Your ground is waiting.</span></h1>
          <p v-if="!full && sum.totals.activities" class="muted">The full year lands on 1 December. Here's how it's tracking.</p>
        </section>

        <section v-else-if="current === 'empty'" key="empty" class="slide center" :aria-label="slideLabel">
          <h2 class="slide-h" tabindex="-1">Every map starts with one loop.</h2>
          <p class="lede">Head out, close a loop, and the hexes inside turn your colour. Your year in review fills in from there.</p>
          <RouterLink class="cta" :to="{ name: 'record' }">Record an outing</RouterLink>
        </section>

        <section v-else-if="current === 'map'" key="map" class="slide film-slide" :aria-label="slideLabel">
          <YearFilm :frames="sum.frames" :colour="colour" :t="elapsed" :duration="filmMs" :still="reduced" :year="year" />
          <div class="film-head">
            <h2 class="slide-h" tabindex="-1">Week by week, it added up.</h2>
          </div>
        </section>

        <section v-else-if="current === 'numbers'" key="numbers" class="slide numbers" :aria-label="slideLabel">
          <h2 class="slide-h" tabindex="-1">Your {{ full ? 'year' : 'year so far' }} in numbers</h2>
          <ul class="grid">
            <li v-for="(n, i) in nums" :key="n.label" :style="{ '--i': i }"><strong>{{ n.value }}</strong><span>{{ n.label }}</span></li>
          </ul>
          <p v-if="modesLine" class="muted">{{ modesLine }}.</p>
          <p class="lede">Every one of those started with getting out the door. Good on you.</p>
        </section>

        <section v-else-if="current === 'loop'" key="loop" class="slide center loop" :aria-label="slideLabel">
          <p class="kicker">Your favourite loop</p>
          <svg class="shape" viewBox="0 0 240 240" role="img" :aria-label="`The shape of your favourite loop, about ${(sum.loop.perimeterM / 1000).toFixed(1)} km round`">
            <path :d="loopD" class="shape-bg" />
            <path :d="loopD" class="shape-line" pathLength="1" />
          </svg>
          <h2 class="slide-h" tabindex="-1">{{ sum.loop.times }} times round.</h2>
          <p class="lede">About {{ (sum.loop.perimeterM / 1000).toFixed(1) }} km a lap. That block knows your footsteps by now.</p>
        </section>

        <section v-else-if="current === 'rival'" key="rival" class="slide center rival" :aria-label="slideLabel">
          <p class="kicker">Your rival</p>
          <div class="faceoff" aria-hidden="true">
            <Crest :crest="user.crest" :colour="colour" :id="user.id" :size="96" />
            <span class="vs">vs</span>
            <Crest :crest="rival.crest" :colour="rival.colour" :id="rival.userId" :size="96" />
          </div>
          <h2 class="slide-h" tabindex="-1">You and {{ rival.name }} swapped {{ rival.total }} {{ rival.total === 1 ? 'hex' : 'hexes' }}.</h2>
          <p class="lede">{{ rivalLine(rival, year) }}</p>
        </section>

        <section v-else-if="current === 'month'" key="month" class="slide center month" :aria-label="slideLabel">
          <p class="kicker">Your best month</p>
          <h2 class="slide-h big" tabindex="-1">{{ sum.month.name }}</h2>
          <p class="lede">{{ sum.month.km }} km over {{ sum.month.count }} {{ sum.month.count === 1 ? 'outing' : 'outings' }}. You were flying.</p>
          <div v-if="sum.streak >= 2" class="streak">
            <strong>{{ sum.streak }}</strong>
            <span>weeks in a row, your longest streak this year</span>
          </div>
        </section>

        <section v-else-if="current === 'bests'" key="bests" class="slide bests" :aria-label="slideLabel">
          <p class="kicker">{{ anyPb ? 'Personal bests set this year' : 'Your fastest this year' }}</p>
          <h2 class="slide-h" tabindex="-1">{{ anyPb ? 'New marks on the board.' : 'Quick feet, all year.' }}</h2>
          <ul class="pbs">
            <li v-for="b in sum.bests" :key="b.mode + b.key">
              <span class="pb-label">{{ b.label }}<small v-if="b.mode !== 'run'"> {{ MODE_LABEL[b.mode].toLowerCase() }}</small></span>
              <strong>{{ bestText(b) }}</strong>
              <span v-if="b.pb" class="chip">Record</span>
            </li>
          </ul>
        </section>

        <section v-else-if="current === 'share'" key="share" class="slide share" :aria-label="slideLabel">
          <h2 class="slide-h" tabindex="-1">Show them your ground</h2>
          <img v-if="cardUrl" class="card" :src="cardUrl" :alt="`Your ${year} summary card: ${nums.map((n) => `${n.value} ${n.label}`).join(', ')}`" />
          <label class="toggle">
            <input v-model="showName" type="checkbox" />
            <span class="switch" aria-hidden="true"></span>
            <span>Show my name</span>
          </label>
          <div class="actions">
            <button class="cta" type="button" @click="share">Share</button>
            <button class="cta ghost" type="button" @click="save">Save image</button>
          </div>
          <p class="note" role="status">{{ shareNote }}</p>
          <button class="link" type="button" @click="again">Watch it again</button>
        </section>
      </Transition>

      <!-- Tap zones: left goes back, right goes on. Hold either to pause. -->
      <button class="zone prev" :class="{ narrow: current === 'share' || current === 'empty' }" type="button" aria-label="Previous slide"
        @pointerdown="onDown" @pointerup="onUp($event, 'prev')" @pointercancel="onCancel" @pointerleave="onCancel" @click="onKeyClick($event, 'prev')" @contextmenu.prevent></button>
      <button v-if="current !== 'share' && current !== 'empty'" class="zone next" type="button" aria-label="Next slide"
        @pointerdown="onDown" @pointerup="onUp($event, 'next')" @pointercancel="onCancel" @pointerleave="onCancel" @click="onKeyClick($event, 'next')" @contextmenu.prevent></button>
    </div>
  </div>
</template>

<style scoped>
.wrapped { position: fixed; inset: 0; z-index: 50; background: #16302A; color: #F3F5EF; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; transition: background-color 0.5s; }
.wrapped.on-numbers { background: #1D3F37; }
.wrapped.on-loop { background: #10231F; }
.wrapped.on-rival { background: #2A2440; }
.wrapped.on-month { background: #13352E; }
.wrapped.on-bests { background: #1A2B45; }
.bars { position: absolute; z-index: 4; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px; display: flex; gap: 4px; }
.bar { flex: 1; height: 3px; border-radius: 2px; background: rgba(243, 245, 239, 0.3); overflow: hidden; }
.bar > span { display: block; height: 100%; background: #fff; transform-origin: left; }
.on-map .bar { background: rgba(22, 48, 42, 0.25); }
.on-map .bar > span { background: #16302A; }
.topbtns { position: absolute; z-index: 5; top: calc(22px + env(safe-area-inset-top)); right: 10px; display: flex; gap: 6px; }
.round { width: 44px; height: 44px; border: 0; border-radius: 50%; display: grid; place-items: center; background: rgba(22, 48, 42, 0.55); color: #fff; cursor: pointer; }
.round:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.stage { position: absolute; inset: 0; }
.slide { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 14px; padding: calc(84px + env(safe-area-inset-top)) 24px calc(40px + env(safe-area-inset-bottom)); }
.slide.center { align-items: center; text-align: center; }
.slide-h { margin: 0; font-size: 2.1rem; line-height: 1.08; font-weight: 850; font-stretch: 112%; letter-spacing: -0.01em; outline: none; max-width: 18ch; }
.slide-h.big { font-size: calc(18vw / var(--zoom, 1)); max-width: none; }
.kicker { margin: 0; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.8rem; color: rgba(243, 245, 239, 0.75); }
.lede { margin: 0; font-size: 1.1rem; line-height: 1.4; color: rgba(243, 245, 239, 0.88); max-width: 30ch; }
.muted { margin: 0; color: rgba(243, 245, 239, 0.7); }
.intro .yr { display: block; font-size: calc(26vw / var(--zoom, 1)); line-height: 0.95; color: var(--me); filter: brightness(1.45); }
.intro .slide-h { max-width: none; }
.intro .crest { filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.35)); margin-bottom: 6px; }

.film-slide { padding: 0; }
.film-head { position: absolute; z-index: 2; top: calc(64px + env(safe-area-inset-top)); left: 16px; right: 16px; }
.film-head .slide-h { color: #16302A; font-size: 1.7rem; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6); }
/* Night mode: the film's street map is dark, so its title and story bars go light */
html.night .film-head .slide-h { color: #F3F5EF; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6); }
html.night .on-map .bar { background: rgba(243, 245, 239, 0.3); }
html.night .on-map .bar > span { background: #fff; }

.numbers .grid { list-style: none; margin: 8px 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 22px 16px; }
.numbers .grid li { display: grid; gap: 2px; animation: rise 0.6s both; animation-delay: calc(var(--i) * 0.18s + 0.2s); }
.numbers .grid strong { font-size: 2.9rem; font-weight: 900; font-stretch: 115%; line-height: 1; font-variant-numeric: tabular-nums; color: #fff; }
.numbers .grid span { color: rgba(243, 245, 239, 0.75); font-weight: 650; }

.shape { width: min(62vw, 260px); height: auto; overflow: visible; }
.shape-bg { fill: color-mix(in srgb, var(--me) 22%, transparent); stroke: none; }
.shape-line { fill: none; stroke: var(--me); stroke-width: 6; stroke-linejoin: round; stroke-linecap: round; filter: brightness(1.4); stroke-dasharray: 1; stroke-dashoffset: 1; animation: trace 2.4s 0.3s ease-in-out forwards; }

.faceoff { display: flex; align-items: center; gap: 18px; margin: 8px 0; }
.vs { font-weight: 900; font-size: 1.4rem; color: rgba(243, 245, 239, 0.7); font-stretch: 115%; }

.streak { margin-top: 18px; display: grid; justify-items: center; gap: 2px; padding: 16px 20px; border-radius: 16px; background: rgba(243, 245, 239, 0.08); }
.streak strong { font-size: 2.6rem; font-weight: 900; line-height: 1; }
.streak span { color: rgba(243, 245, 239, 0.8); }

.pbs { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 10px; }
.pbs li { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 12px; padding: 14px 16px; border-radius: 14px; background: rgba(243, 245, 239, 0.08); }
.pb-label { font-weight: 700; }
.pb-label small { font-weight: 600; color: rgba(243, 245, 239, 0.7); font-size: 0.85rem; }
.pbs strong { font-size: 1.6rem; font-weight: 900; font-variant-numeric: tabular-nums; }
.pbs .chip { grid-column: 1; justify-self: start; padding: 2px 8px; border-radius: 999px; background: var(--me); color: #fff; font-size: 0.72rem; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; }

.share { align-items: center; text-align: center; justify-content: flex-start; gap: 12px; z-index: 3; overflow-y: auto; touch-action: pan-y; }
.share .slide-h { font-size: 1.6rem; }
.card { width: auto; height: min(46vh, 520px); aspect-ratio: 9 / 16; border-radius: 14px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45); }
.toggle { display: inline-flex; align-items: center; gap: 10px; font-weight: 650; cursor: pointer; min-height: 44px; }
.toggle input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch { width: 44px; height: 26px; border-radius: 13px; background: rgba(243, 245, 239, 0.3); position: relative; transition: background 0.2s; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
.toggle input:checked + .switch { background: var(--me); }
.toggle input:checked + .switch::after { transform: translateX(18px); }
.toggle input:focus-visible + .switch { outline: 3px solid #fff; outline-offset: 2px; }
.actions { display: flex; gap: 10px; width: 100%; max-width: 340px; }
.actions .cta { flex: 1; }
.cta { display: inline-flex; justify-content: center; align-items: center; min-height: 48px; padding: 0 22px; border: 0; border-radius: 999px; background: #F3F5EF; color: #16302A; font: inherit; font-weight: 800; text-decoration: none; cursor: pointer; position: relative; z-index: 3; }
.cta.ghost { background: rgba(243, 245, 239, 0.14); color: #fff; }
.cta:focus-visible, .link:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.note { margin: 0; min-height: 1.2em; font-size: 0.9rem; color: rgba(243, 245, 239, 0.8); }
.link { background: none; border: 0; color: #fff; font: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; padding: 10px; cursor: pointer; }

.zone { position: absolute; z-index: 2; top: 0; bottom: 0; border: 0; padding: 0; margin: 0; background: transparent; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.zone.prev { left: 0; width: 30%; }
.zone.prev.narrow { width: 16px; z-index: 4; }
.zone.next { right: 0; width: 70%; }
.zone:focus-visible { outline: 3px solid rgba(255, 255, 255, 0.7); outline-offset: -6px; }

.loading .hexspin { width: 54px; height: 62px; background: var(--me); clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); animation: spin 1.6s linear infinite; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.slide-enter-active, .slide-leave-active { transition: opacity 0.28s, transform 0.28s; }
.slide-enter-from { opacity: 0; transform: translateX(28px); }
.slide-leave-to { opacity: 0; transform: translateX(-28px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes trace { to { stroke-dashoffset: 0; } }
@keyframes spin { to { transform: rotate(360deg); } }

.reduced .numbers .grid li { animation: none; }
.reduced .shape-line { animation: none; stroke-dashoffset: 0; }
.reduced .loading .hexspin { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .numbers .grid li, .loading .hexspin { animation: none; }
  .shape-line { animation: none; stroke-dashoffset: 0; }
  .wrapped { transition: none; }
}
@media (max-height: 680px) {
  .slide-h { font-size: 1.8rem; }
  .numbers .grid strong { font-size: 2.3rem; }
  .intro .yr { font-size: calc(22vw / var(--zoom, 1)); }
}
</style>
