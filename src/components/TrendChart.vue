<script setup>
// One small SVG chart for the fitness trend: a line or weekly bars, with a hover and keyboard readout and a table view. Spark mode is the bare line.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  rows: { type: Array, required: true }, // [{ label, value: number|null }]
  kind: { type: String, default: 'line' }, // 'line' | 'bar'
  format: { type: Function, default: (v) => String(v) },
  title: { type: String, default: '' },
  summary: { type: String, default: '' }, // one sentence for screen readers
  valueName: { type: String, default: 'Value' }, // the table's value column
  step: { type: Number, default: 1 }, // tick rounding, in the value's units
  spark: { type: Boolean, default: false },
  height: { type: Number, default: 132 },
})

const box = ref(null)
const width = ref(320)
let ro = null
onMounted(() => {
  const measure = () => { if (box.value) width.value = Math.max(160, Math.round(box.value.clientWidth)) }
  measure()
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(box.value) }
})
onBeforeUnmount(() => ro?.disconnect())

const H = computed(() => props.spark ? 44 : props.height)
const pad = computed(() => props.spark ? { l: 4, r: 8, t: 6, b: 6 } : { l: 44, r: 12, t: 12, b: 24 })
const vals = computed(() => props.rows.map((r) => (Number.isFinite(r.value) ? r.value : null)))
const present = computed(() => vals.value.filter((v) => v != null))

const domain = computed(() => {
  const xs = present.value
  if (!xs.length) return [0, 1]
  const s = props.step
  if (props.kind === 'bar') return [0, Math.max(s, Math.ceil(Math.max(...xs) / s) * s)]
  let lo = Math.min(...xs), hi = Math.max(...xs)
  const spread = Math.max(hi - lo, s * 2)
  lo = Math.floor((lo - spread * 0.15) / s) * s
  hi = Math.ceil((hi + spread * 0.15) / s) * s
  return [Math.max(0, lo), hi]
})
const ticks = computed(() => {
  const [lo, hi] = domain.value
  if (props.kind === 'bar') return [lo, hi]
  const mid = Math.round((lo + hi) / 2 / props.step) * props.step
  return [...new Set([lo, mid, hi])]
})
const innerW = computed(() => width.value - pad.value.l - pad.value.r)
const innerH = computed(() => H.value - pad.value.t - pad.value.b)
const n = computed(() => props.rows.length)
const band = computed(() => innerW.value / Math.max(1, n.value))
const x = (i) => pad.value.l + (props.kind === 'bar' ? band.value * (i + 0.5) : n.value > 1 ? (innerW.value * i) / (n.value - 1) : innerW.value / 2)
const y = (v) => {
  const [lo, hi] = domain.value
  return pad.value.t + innerH.value - ((v - lo) / (hi - lo || 1)) * innerH.value
}

// Lines break where a week has no value
const paths = computed(() => {
  const out = []
  let cur = []
  vals.value.forEach((v, i) => {
    if (v == null) { if (cur.length) out.push(cur); cur = []; return }
    cur.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  })
  if (cur.length) out.push(cur)
  return out.map((pts) => (pts.length === 1 ? null : 'M' + pts.join('L'))).filter(Boolean)
})
const lonely = computed(() => vals.value.map((v, i) => ({ v, i })).filter(({ v, i }) => v != null && vals.value[i - 1] == null && vals.value[i + 1] == null))
const lastIdx = computed(() => { for (let i = vals.value.length - 1; i >= 0; i--) if (vals.value[i] != null) return i; return -1 })

const barW = computed(() => Math.max(3, Math.min(24, band.value - 2)))
function barPath(i, v) {
  const w = barW.value
  const x0 = x(i) - w / 2
  const y0 = y(v)
  const base = y(0)
  const h = base - y0
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x0},${base}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + w - r}Q${x0 + w},${y0} ${x0 + w},${y0 + r}V${base}Z`
}

// Hover and keyboard readout
const active = ref(null)
function pick(ev) {
  const rect = ev.currentTarget.getBoundingClientRect()
  const px = ((ev.clientX - rect.left) / rect.width) * width.value
  let best = null, dist = Infinity
  props.rows.forEach((_, i) => { const d = Math.abs(x(i) - px); if (d < dist) { dist = d; best = i } })
  active.value = best
}
function key(ev) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return
  ev.preventDefault()
  const i = active.value ?? lastIdx.value
  if (ev.key === 'ArrowLeft') active.value = Math.max(0, i - 1)
  else if (ev.key === 'ArrowRight') active.value = Math.min(n.value - 1, i + 1)
  else if (ev.key === 'Home') active.value = 0
  else active.value = n.value - 1
}
const readout = computed(() => {
  const i = active.value
  if (i == null) return null
  const v = vals.value[i]
  return { label: props.rows[i].label, text: v == null ? 'No runs to go on' : props.format(v), left: Math.min(Math.max(x(i), 56), width.value - 56) }
})
const xLabels = computed(() => {
  if (n.value < 2) return []
  const mid = Math.floor((n.value - 1) / 2)
  return [0, mid, n.value - 1].map((i) => ({ i, text: props.rows[i].label, anchor: i === 0 ? 'start' : i === n.value - 1 ? 'end' : 'middle' }))
})
</script>

<template>
  <figure class="trend" :class="{ spark }">
    <figcaption v-if="title && !spark" class="t">{{ title }}</figcaption>
    <div ref="box" class="plot">
      <svg
        :width="width" :height="H" :viewBox="`0 0 ${width} ${H}`"
        :role="spark ? null : 'img'" :aria-hidden="spark ? 'true' : null" :aria-label="spark ? null : summary"
        :tabindex="spark ? null : 0"
        @pointermove="!spark && pick($event)" @pointerdown="!spark && pick($event)" @pointerleave="active = null"
        @keydown="key" @blur="active = null"
      >
        <g v-if="!spark" class="axis">
          <template v-for="t in ticks" :key="t">
            <line :x1="pad.l" :x2="width - pad.r" :y1="y(t)" :y2="y(t)" class="grid" />
            <text :x="pad.l - 6" :y="y(t) + 4" text-anchor="end">{{ format(t) }}</text>
          </template>
          <text v-for="l in xLabels" :key="l.i" :x="l.anchor === 'start' ? pad.l : l.anchor === 'end' ? width - pad.r : x(l.i)" :y="H - 6" :text-anchor="l.anchor">{{ l.text }}</text>
        </g>
        <template v-if="kind === 'bar'">
          <path v-for="(v, i) in vals" v-show="v" :key="i" :d="v ? barPath(i, v) : ''" class="bar" :class="{ now: i === n - 1, on: i === active }" />
        </template>
        <template v-else>
          <path v-for="(d, k) in paths" :key="k" :d="d" class="line" />
          <circle v-for="p in lonely" :key="'l' + p.i" :cx="x(p.i)" :cy="y(p.v)" r="3" class="dot" />
          <circle v-if="lastIdx >= 0" :cx="x(lastIdx)" :cy="y(vals[lastIdx])" r="4" class="end" />
        </template>
        <g v-if="active != null && !spark">
          <line :x1="x(active)" :x2="x(active)" :y1="pad.t" :y2="pad.t + innerH" class="cross" />
          <circle v-if="kind === 'line' && vals[active] != null" :cx="x(active)" :cy="y(vals[active])" r="5" class="end" />
        </g>
      </svg>
      <div v-if="readout" class="tip" :style="{ left: readout.left + 'px' }" aria-live="polite">
        <span class="tl">Week of {{ readout.label }}</span><strong>{{ readout.text }}</strong>
      </div>
    </div>
    <details v-if="!spark" class="tbl">
      <summary>Show as a table</summary>
      <table>
        <thead><tr><th scope="col">Week of</th><th scope="col">{{ valueName }}</th></tr></thead>
        <tbody><tr v-for="(r, i) in rows" :key="i"><td>{{ r.label }}</td><td>{{ vals[i] == null ? 'None' : format(vals[i]) }}</td></tr></tbody>
      </table>
    </details>
  </figure>
</template>

<style scoped>
.trend { margin: 0; display: grid; gap: 6px; min-width: 0; }
.t { font-weight: 750; font-size: 0.95rem; }
.plot { position: relative; min-width: 0; width: 100%; }
svg { display: block; touch-action: pan-y; outline: none; overflow: visible; }
svg:focus-visible { outline: 3px solid var(--you); outline-offset: 2px; border-radius: 6px; }
.axis text { font-size: 11px; fill: var(--ink-60); font-variant-numeric: tabular-nums; }
.grid { stroke: var(--ink-15); stroke-width: 1; }
.line { fill: none; stroke: var(--you); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.dot { fill: var(--you); }
.end { fill: var(--you); stroke: #fff; stroke-width: 2; }
.bar { fill: #AFC0F7; }
.bar.now { fill: var(--you); }
.bar.on { fill: #7F97EE; }
.bar.now.on { fill: #2347CC; }
.cross { stroke: var(--ink-40); stroke-width: 1; }
.tip { position: absolute; top: -6px; transform: translate(-50%, -100%); background: var(--ink); color: var(--on-ink); border-radius: 8px; padding: 5px 9px; font-size: 0.8rem; white-space: nowrap; pointer-events: none; display: grid; gap: 1px; text-align: center; z-index: 2; }
.tip .tl { color: var(--on-ink-muted); font-size: 0.75rem; }
.tbl summary { font-size: 0.85rem; color: var(--you); font-weight: 650; cursor: pointer; width: fit-content; }
.tbl table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: 0.9rem; margin-top: 6px; }
.tbl th { text-align: left; font-size: 0.8rem; color: var(--ink-60); font-weight: 600; padding: 4px 0; }
.tbl td { padding: 5px 0; border-top: 1px solid var(--line); }
.spark .plot { height: 44px; }
</style>
