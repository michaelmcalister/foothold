<script setup>
// One run chart against distance: elevation (filled), pace or heart rate (line).
// Touch or hover to read a point; charts on the same run share the readout
// line through v-model:scrub. Arrow keys move it too, and a table view lists
// the value at each kilometre.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  ds: { type: Array, required: true }, // metres from the start, one per value
  values: { type: Array, required: true }, // number or null (a gap)
  format: { type: Function, default: (v) => String(Math.round(v)) },
  title: { type: String, required: true },
  sub: { type: String, default: '' },
  summary: { type: String, default: '' }, // one sentence for screen readers
  valueName: { type: String, default: 'Value' },
  kind: { type: String, default: 'line' }, // 'line' | 'area'
  step: { type: Number, default: 1 }, // tick rounding, in the value's units
  minSpan: { type: Number, default: 0 }, // smallest y range, so flat stays flat
  trim: { type: Boolean, default: false }, // ignore the odd extreme value when scaling
  scrub: { type: Number, default: null },
  height: { type: Number, default: 128 },
})
const emit = defineEmits(['update:scrub'])

const box = ref(null)
const width = ref(320)
let ro = null
onMounted(() => {
  const measure = () => { if (box.value) width.value = Math.max(200, Math.round(box.value.clientWidth)) }
  measure()
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(box.value) }
})
onBeforeUnmount(() => ro?.disconnect())

const pad = { l: 46, r: 12, t: 10, b: 22 }
const H = computed(() => props.height)
const innerW = computed(() => width.value - pad.l - pad.r)
const innerH = computed(() => H.value - pad.t - pad.b)
const total = computed(() => props.ds[props.ds.length - 1] || 1)
const present = computed(() => props.values.filter(Number.isFinite))

const domain = computed(() => {
  const xs = [...present.value].sort((a, b) => a - b)
  if (!xs.length) return [0, 1]
  const q = (f) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(f * (xs.length - 1))))]
  let lo = props.trim ? q(0.02) : xs[0]
  let hi = props.trim ? q(0.98) : xs[xs.length - 1]
  const span = Math.max(hi - lo, props.minSpan, props.step * 2)
  const mid = (lo + hi) / 2
  lo = Math.floor((mid - span * 0.6) / props.step) * props.step
  hi = Math.ceil((mid + span * 0.6) / props.step) * props.step
  if (props.kind === 'area' && xs[0] >= 0) lo = Math.max(0, lo)
  return [lo, hi]
})
const ticks = computed(() => {
  if (!present.value.length) return []
  const [lo, hi] = domain.value
  const mid = Math.round((lo + hi) / 2 / props.step) * props.step
  return [...new Set([lo, mid, hi])]
})
const x = (d) => pad.l + (d / total.value) * innerW.value
const y = (v) => {
  const [lo, hi] = domain.value
  const c = Math.min(hi, Math.max(lo, v)) // a trimmed extreme sits on the edge
  return pad.t + innerH.value - ((c - lo) / (hi - lo || 1)) * innerH.value
}

// Runs of values with no gap, as SVG paths
const runs = computed(() => {
  const out = []
  let cur = []
  props.values.forEach((v, i) => {
    if (!Number.isFinite(v)) { if (cur.length > 1) out.push(cur); cur = []; return }
    cur.push(i)
  })
  if (cur.length > 1) out.push(cur)
  return out
})
const line = (idx) => 'M' + idx.map((i) => `${x(props.ds[i]).toFixed(1)},${y(props.values[i]).toFixed(1)}`).join('L')
const lines = computed(() => runs.value.map(line))
const areas = computed(() => props.kind !== 'area' ? [] : runs.value.map((idx) => {
  const base = (pad.t + innerH.value).toFixed(1)
  return `${line(idx)}L${x(props.ds[idx[idx.length - 1]]).toFixed(1)},${base}L${x(props.ds[idx[0]]).toFixed(1)},${base}Z`
}))

// Distance labels: a round step that fits a phone
const kmStep = computed(() => {
  const k = total.value / 1000
  return k <= 3 ? 1 : k <= 8 ? 2 : k <= 20 ? 5 : k <= 50 ? 10 : 25
})
const xTicks = computed(() => {
  const out = []
  for (let k = 0; k * 1000 <= total.value + 1; k += kmStep.value) out.push(k)
  return out
})

// Readout
function nearest(px) {
  const d = ((px - pad.l) / innerW.value) * total.value
  let lo = 0, hi = props.ds.length - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (props.ds[m] < d) lo = m; else hi = m }
  return Math.abs(props.ds[lo] - d) <= Math.abs(props.ds[hi] - d) ? lo : hi
}
function pick(ev) {
  const rect = ev.currentTarget.getBoundingClientRect()
  emit('update:scrub', nearest(((ev.clientX - rect.left) / rect.width) * width.value))
}
function key(ev) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return
  ev.preventDefault()
  const n = props.ds.length
  const stepI = Math.max(1, Math.round(n / 40))
  const i = props.scrub ?? 0
  const next = ev.key === 'ArrowLeft' ? Math.max(0, i - stepI) : ev.key === 'ArrowRight' ? Math.min(n - 1, i + stepI) : ev.key === 'Home' ? 0 : n - 1
  emit('update:scrub', next)
}
const kmText = (d) => `${(d / 1000).toFixed(2)} km`
const readout = computed(() => {
  const i = props.scrub
  if (i == null || i >= props.ds.length) return null
  const v = props.values[i]
  return { at: kmText(props.ds[i]), text: Number.isFinite(v) ? props.format(v) : 'No reading', left: Math.min(Math.max(x(props.ds[i]), 56), width.value - 56) }
})

// Table view: the value at each kilometre and at the finish
const tableRows = computed(() => {
  const marks = []
  for (let k = 0; k * 1000 < total.value; k++) marks.push(k * 1000)
  marks.push(total.value)
  return marks.map((m) => {
    const i = nearest(x(m))
    const v = props.values[i]
    return { at: kmText(m), text: Number.isFinite(v) ? props.format(v) : 'None' }
  })
})
</script>

<template>
  <figure class="profile">
    <figcaption>
      <span class="t">{{ title }}</span>
      <span v-if="sub" class="s">{{ sub }}</span>
    </figcaption>
    <div ref="box" class="plot">
      <svg
        :width="width" :height="H" :viewBox="`0 0 ${width} ${H}`" role="img" :aria-label="summary || title" tabindex="0"
        @pointermove="pick" @pointerdown="pick" @pointerleave="emit('update:scrub', null)"
        @keydown="key" @blur="emit('update:scrub', null)"
      >
        <g class="axis">
          <template v-for="t in ticks" :key="t">
            <line :x1="pad.l" :x2="width - pad.r" :y1="y(t)" :y2="y(t)" class="grid" />
            <text :x="pad.l - 6" :y="y(t) + 4" text-anchor="end">{{ format(t) }}</text>
          </template>
          <text v-for="(k, j) in xTicks" :key="k" :x="x(k * 1000)" :y="H - 6" :text-anchor="j === 0 ? 'start' : 'middle'">{{ j === xTicks.length - 1 ? `${k} km` : k }}</text>
        </g>
        <path v-for="(d, k) in areas" :key="'a' + k" :d="d" class="area" />
        <path v-for="(d, k) in lines" :key="'l' + k" :d="d" class="line" />
        <g v-if="readout">
          <line :x1="x(ds[scrub])" :x2="x(ds[scrub])" :y1="pad.t" :y2="pad.t + innerH" class="cross" />
          <circle v-if="Number.isFinite(values[scrub])" :cx="x(ds[scrub])" :cy="y(values[scrub])" r="5" class="dot" />
        </g>
      </svg>
      <div v-if="readout" class="tip" :style="{ left: readout.left + 'px' }" aria-live="polite">
        <span class="tl">{{ readout.at }}</span><strong>{{ readout.text }}</strong>
      </div>
    </div>
    <details class="tbl">
      <summary>Show as a table</summary>
      <table>
        <thead><tr><th scope="col">Distance</th><th scope="col">{{ valueName }}</th></tr></thead>
        <tbody><tr v-for="r in tableRows" :key="r.at"><td>{{ r.at }}</td><td>{{ r.text }}</td></tr></tbody>
      </table>
    </details>
  </figure>
</template>

<style scoped>
.profile { margin: 0; display: grid; gap: 6px; min-width: 0; }
figcaption { display: grid; gap: 2px; }
.t { font-weight: 750; font-size: 0.95rem; }
.s { font-size: 0.85rem; color: var(--ink-60); }
.plot { position: relative; min-width: 0; width: 100%; margin-top: 18px; }
svg { display: block; touch-action: pan-y; outline: none; overflow: visible; }
svg:focus-visible { outline: 3px solid var(--you); outline-offset: 2px; border-radius: 6px; }
.axis text { font-size: 11px; fill: var(--ink-60); font-variant-numeric: tabular-nums; }
.grid { stroke: var(--ink-15); stroke-width: 1; }
.area { fill: var(--you); fill-opacity: 0.16; stroke: none; }
.line { fill: none; stroke: var(--you); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.cross { stroke: var(--ink-40); stroke-width: 1; }
.dot { fill: var(--you); stroke: var(--card); stroke-width: 2; }
.tip { position: absolute; top: -6px; transform: translate(-50%, -100%); background: var(--ink); color: var(--on-ink); border-radius: 8px; padding: 5px 9px; font-size: 0.8rem; white-space: nowrap; pointer-events: none; display: grid; gap: 1px; text-align: center; z-index: 2; }
.tip .tl { color: var(--on-ink-muted); font-size: 0.75rem; }
.tbl summary { font-size: 0.85rem; color: var(--you-ink); font-weight: 650; cursor: pointer; width: fit-content; }
.tbl table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: 0.9rem; margin-top: 6px; }
.tbl th { text-align: left; font-size: 0.8rem; color: var(--ink-60); font-weight: 600; padding: 4px 0; }
.tbl td { padding: 5px 0; border-top: 1px solid var(--line); }
</style>
