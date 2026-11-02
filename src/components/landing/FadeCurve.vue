<script setup>
// How held ground fades: full strength for 14 days, then it halves every
// three weeks until it drops below the wild line. When the drawing scrolls
// into view a hex rides down the curve and pales as it goes. This is the
// page's one orchestrated moment after the hero.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { hexPoints } from './hex.js'

const GRACE = 14
const HALF = 21
const WILD = 5
const DAYS = 112
const X0 = 34, X1 = 318, Y0 = 22, Y1 = 132

const strength = d => (d <= GRACE ? 100 : 100 * Math.pow(0.5, (d - GRACE) / HALF))
const x = d => X0 + (d / DAYS) * (X1 - X0)
const y = s => Y1 - (s / 100) * (Y1 - Y0)

const pts = []
for (let d = 0; d <= DAYS; d += 1) pts.push(`${x(d).toFixed(1)} ${y(strength(d)).toFixed(1)}`)
const curve = 'M' + pts.join(' L')
const wildDay = GRACE + HALF * Math.log2(100 / WILD)
const halves = [GRACE + HALF, GRACE + 2 * HALF, GRACE + 3 * HALF]

const root = ref(null)
const pathEl = ref(null)
const day = ref(GRACE)
const drawn = ref(true)
let raf = 0
let io = null

const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function play() {
  const el = pathEl.value
  if (!el) return
  const len = el.getTotalLength()
  el.style.strokeDasharray = String(len)
  drawn.value = false
  let start = 0
  const dur = 3200
  const step = t => {
    if (!start) start = t
    const k = Math.min(1, (t - start) / dur)
    const d = k * wildDay
    day.value = d
    el.style.strokeDashoffset = String(len * (1 - (x(d) - X0) / (X1 - X0)))
    if (k < 1) raf = requestAnimationFrame(step)
    else { drawn.value = true; el.style.strokeDashoffset = '0' }
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => {
  if (reduce || typeof IntersectionObserver === 'undefined') return
  day.value = 0
  drawn.value = false
  pathEl.value.style.strokeDasharray = String(pathEl.value.getTotalLength())
  pathEl.value.style.strokeDashoffset = String(pathEl.value.getTotalLength())
  io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); play() }
  }, { threshold: 0.6 })
  io.observe(root.value)
})
onBeforeUnmount(() => { cancelAnimationFrame(raf); io?.disconnect() })

const fmt = d => Math.round(d)
</script>

<template>
  <figure ref="root" class="lp-fig">
    <svg class="lp-vg" viewBox="0 0 330 168" role="img"
         aria-label="A chart of ground strength over time. It stays full for 14 days, then halves every three weeks and goes wild after about 15 weeks.">
      <line :x1="X0" :y1="y(WILD)" :x2="X1" :y2="y(WILD)" class="v-wildline" />
      <text :x="X0 + 4" :y="y(WILD) - 5" class="v-label small">wild below here</text>
      <line v-for="h in halves" :key="h" :x1="x(h)" :y1="Y1" :x2="x(h)" :y2="y(strength(h))" class="v-tick" />
      <line :x1="x(GRACE)" :y1="Y1" :x2="x(GRACE)" :y2="Y0" class="v-tick strong" />
      <path ref="pathEl" :d="curve" class="v-curve" />
      <polygon :points="hexPoints(x(day), y(strength(day)), 12, 0)" class="v-ridehex"
               :style="{ fillOpacity: Math.max(0.08, strength(day) / 100) }" />
      <line :x1="X0" :y1="Y1" :x2="X1" :y2="Y1" class="v-axis" />
      <text :x="X0" y="152" class="v-label small">today</text>
      <text :x="x(GRACE) + 4" y="152" class="v-label small">14 days</text>
      <text :x="x(halves[0]) + 6" :y="y(strength(halves[0])) - 6" class="v-label small">half after 5 weeks</text>
      <text :x="x(DAYS)" y="152" text-anchor="end" class="v-label small">15 weeks</text>
      <text :x="X0 - 6" :y="Y0 + 4" text-anchor="end" class="v-label small">full</text>
    </svg>
    <figcaption class="lp-cap" aria-hidden="true">
      <template v-if="drawn && day >= wildDay - 1">Untouched for 15 weeks: wild again.</template>
      <template v-else-if="day <= GRACE">Day {{ fmt(day) }}: full strength.</template>
      <template v-else>Day {{ fmt(day) }}: {{ Math.round(strength(day)) }}% strength.</template>
    </figcaption>
  </figure>
</template>
