<script setup>
// Foothold Wrapped, the map film: your area on a MapLibre street map, with
// the hexes you took appearing week by week and a date ticker, ending on the
// year's full footprint. The hexes draw on a canvas lined up with the map, so
// they still show when the street tiles can't load. The parent drives time
// (`t`, in ms), so pausing the story pauses the film. `still` shows the
// final footprint straight away (reduced motion).
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { hexRings, fitView, drawRings } from '../../lib/wrappedCard.js'

const props = defineProps({
  frames: { type: Array, required: true }, // from filmFrames in src/lib/wrapped.js
  colour: { type: String, default: '#2E55E6' },
  t: { type: Number, default: 0 },
  duration: { type: Number, default: 6000 }, // how long the frames take to play
  still: { type: Boolean, default: false },
  year: { type: Number, required: true },
})

const box = ref(null)
const mapEl = ref(null)
const canvas = ref(null)
let map = null
let polys = [] // per frame: projected rings of the hexes new that week
let size = { w: 0, h: 0, dpr: 1 }
let drawn = -2

const STYLE = 'https://tiles.openfreemap.org/styles/positron'
const FALLBACK = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#ECEFE4' } }] }

const frameAt = computed(() => {
  if (props.still || !props.frames.length) return props.frames.length - 1
  return Math.min(props.frames.length - 1, Math.floor((props.t / props.duration) * props.frames.length))
})
const ended = computed(() => props.still || props.t >= props.duration)
const ticker = computed(() => {
  const f = props.frames[Math.max(0, frameAt.value)]
  if (!f) return { when: '', total: 0 }
  return { when: ended.value ? `Your ${props.year} footprint` : `Week of ${f.label}`, total: f.total }
})

function layout() {
  const r = box.value.getBoundingClientRect()
  size = { w: Math.max(1, r.width), h: Math.max(1, r.height), dpr: Math.min(3, window.devicePixelRatio || 1) }
  const c = canvas.value
  c.width = Math.round(size.w * size.dpr)
  c.height = Math.round(size.h * size.dpr)
  // Leave room at the top for the story bar and title, and at the bottom for the ticker
  const top = 150, bottom = 110
  const all = hexRings(props.frames.flatMap((f) => f.added))
  const fit = fitView(all.flat(), size.w, size.h - top - bottom, { pad: 24 })
  const projected = all.map((ring) => ring.map((p) => { const [x, y] = fit.project(p); return [x, y + top] }))
  let i = 0
  polys = props.frames.map((f) => f.added.map(() => projected[i++]))
  drawn = -2
  // The map's camera shows the same view: the canvas middle, at the same zoom
  return { center: fit.unproject([size.w / 2, size.h / 2 - top]), zoom: fit.zoom }
}

function draw() {
  const k = frameAt.value
  const pulse = ended.value ? -1 : k
  const key = k * 10 + (pulse === k ? 1 : 0)
  if (key === drawn) return
  drawn = key
  const ctx = canvas.value.getContext('2d')
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
  ctx.clearRect(0, 0, size.w, size.h)
  const old = []
  for (let i = 0; i < k; i++) old.push(...polys[i])
  drawRings(ctx, old, { fill: props.colour, stroke: props.colour, alpha: 0.5, width: 0.8 })
  if (k >= 0) drawRings(ctx, polys[k], pulse === k ? { fill: '#FFFFFF', stroke: props.colour, alpha: 0.9, width: 1.6 } : { fill: props.colour, stroke: props.colour, alpha: 0.5, width: 0.8 })
}

async function loadStyle() {
  try {
    const r = await fetch(STYLE, { signal: AbortSignal.timeout(5000) })
    if (r.ok) return await r.json()
  } catch { /* offline or blocked: plain paper */ }
  return FALLBACK
}

async function startMap(cam) {
  try {
    const [{ Map: MLMap, setWorkerUrl }, workerUrl] = await Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url').then((m) => m.default),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
    setWorkerUrl(workerUrl)
    const style = await loadStyle()
    if (!mapEl.value) return
    // The map's camera matches the canvas: same centre, same zoom
    map = new MLMap({ container: mapEl.value, style, center: cam.center, zoom: cam.zoom, interactive: false, attributionControl: { compact: true }, fadeDuration: 0 })
    map.on('error', () => {})
  } catch { /* no WebGL: the hexes still draw on plain paper */ }
}

onMounted(() => {
  const cam = layout()
  draw()
  startMap(cam)
})
watch(() => [props.t, props.still], draw)
onBeforeUnmount(() => { map?.remove(); map = null })
</script>

<template>
  <div ref="box" class="film" role="img" :aria-label="`A map of the ${ticker.total} hexes you took in ${year}, appearing week by week.`">
    <div ref="mapEl" class="map"></div>
    <canvas ref="canvas" class="hexes"></canvas>
    <div class="ticker" aria-hidden="true">
      <span class="when">{{ ticker.when }}</span>
      <span class="total"><strong>{{ ticker.total.toLocaleString('en-AU') }}</strong> hexes</span>
    </div>
  </div>
</template>

<style scoped>
.film { position: absolute; inset: 0; background: #ECEFE4; overflow: hidden; }
.map, .hexes { position: absolute; inset: 0; width: 100%; height: 100%; }
.hexes { pointer-events: none; }
.ticker { position: absolute; left: 16px; right: 16px; bottom: calc(24px + env(safe-area-inset-bottom)); display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 12px 16px; border-radius: 14px; background: rgba(22, 48, 42, 0.88); color: #F3F5EF; font-variant-numeric: tabular-nums; }
.when { font-weight: 750; font-stretch: 108%; }
.total { font-size: 0.95rem; color: rgba(243, 245, 239, 0.8); }
.total strong { color: #fff; font-size: 1.25rem; }
.film :deep(.maplibregl-ctrl-bottom-right) { bottom: calc(84px + env(safe-area-inset-bottom)); }
</style>
