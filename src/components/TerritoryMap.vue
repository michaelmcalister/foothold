<script setup>
// The live territory map: OpenFreeMap streets underneath, hexes on top
// (yours in cobalt, rivals in their colours, faded by strength), plus an
// optional track, closed loops, a suggested loop and the player's dot.
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { Map as MLMap, LngLatBounds, setWorkerUrl } from 'maplibre-gl'
// MapLibre 6 runs its tile work in a module worker; let Vite bundle it.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
setWorkerUrl(mapWorkerUrl)
import 'maplibre-gl/dist/maplibre-gl.css'
import { cellToBoundary } from 'h3-js'

const props = defineProps({
  centre: { type: Object, required: true },
  zoom: { type: Number, default: 14.2 },
  cells: { type: Array, default: () => [] },
  highlight: { type: Array, default: () => [] }, // h3 ids to pulse (just claimed)
  track: { type: Array, default: () => [] }, // [{lat,lng}]
  loops: { type: Array, default: () => [] }, // [[lng,lat]...] rings
  suggestion: { type: Array, default: null }, // ring
  zones: { type: Array, default: () => [] },
  me: { type: Object, default: null }, // live position dot
  follow: { type: Boolean, default: false },
  fit: { type: Boolean, default: false }, // fit to track/loops when they load
  interactive: { type: Boolean, default: true },
})
const emit = defineEmits(['cell', 'moved', 'ready'])

const el = ref(null)
const map = shallowRef(null)
const loaded = ref(false)

const STYLE = 'https://tiles.openfreemap.org/styles/positron'
const empty = { type: 'FeatureCollection', features: [] }

function cellFeatures(cells, hi) {
  const hiSet = new Set(hi)
  return {
    type: 'FeatureCollection',
    features: cells.map((c) => ({
      type: 'Feature',
      properties: {
        h3: c.h3,
        colour: c.mine ? '#2E55E6' : c.ownerColour || '#E8A817',
        mine: c.mine ? 1 : 0,
        strength: c.strength,
        hi: hiSet.has(c.h3) ? 1 : 0,
        name: c.ownerName,
        days: c.daysToWild,
      },
      geometry: { type: 'Polygon', coordinates: [cellToBoundary(c.h3, true)] },
    })),
  }
}
const line = (pts) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.map((p) => [p.lng, p.lat]) } })
const rings = (rs) => ({ type: 'FeatureCollection', features: rs.map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [r] } })) })
function circle({ lat, lng, radiusM }) {
  const pts = []
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * Math.PI * 2
    pts.push([lng + (radiusM * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (radiusM * Math.sin(a)) / 110540])
  }
  return pts
}

function setData(id, data) {
  map.value?.getSource(id)?.setData(data)
}

function syncAll() {
  if (!loaded.value) return
  setData('cells', cellFeatures(props.cells, props.highlight))
  setData('track', props.track.length > 1 ? line(props.track) : empty)
  setData('loops', rings(props.loops))
  setData('suggest', props.suggestion ? rings([props.suggestion]) : empty)
  setData('zones', rings(props.zones.map(circle)))
  setData('me', props.me ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [props.me.lng, props.me.lat] } } : empty)
}

function fitTo() {
  const pts = [...props.track.map((p) => [p.lng, p.lat]), ...props.loops.flat(), ...(props.suggestion || [])]
  if (pts.length < 2 || !map.value) return
  const b = pts.reduce((bb, p) => bb.extend(p), new LngLatBounds(pts[0], pts[0]))
  map.value.fitBounds(b, { padding: 48, duration: 0, maxZoom: 16 })
}

// Plain map paper, used when the street style can't load (offline, blocked).
// Hexes and routes still draw on it.
const FALLBACK = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#ECEFE4' } }] }
let styleCache = null
async function loadStyle() {
  if (styleCache) return styleCache
  try {
    const r = await fetch(STYLE, { signal: AbortSignal.timeout(6000) })
    if (!r.ok) throw new Error('style')
    styleCache = await r.json()
  } catch {
    return FALLBACK
  }
  return styleCache
}

onMounted(async () => {
  const style = await loadStyle()
  if (!el.value) return
  const m = new MLMap({
    container: el.value,
    style,
    center: [props.centre.lng, props.centre.lat],
    zoom: props.zoom,
    attributionControl: { compact: true },
    interactive: props.interactive,
    pitchWithRotate: false,
    dragRotate: false,
  })
  map.value = m
  m.on('load', () => {
    m.addSource('cells', { type: 'geojson', data: empty })
    m.addSource('track', { type: 'geojson', data: empty })
    m.addSource('loops', { type: 'geojson', data: empty })
    m.addSource('suggest', { type: 'geojson', data: empty })
    m.addSource('zones', { type: 'geojson', data: empty })
    m.addSource('me', { type: 'geojson', data: empty })
    m.addLayer({
      id: 'cells-fill', type: 'fill', source: 'cells',
      paint: {
        'fill-color': ['get', 'colour'],
        // Yours stands out; rivals' ground is lighter. Stronger ground is more solid.
        'fill-opacity': ['+', ['case', ['==', ['get', 'mine'], 1], 0.28, 0.1], ['*', 0.003, ['get', 'strength']], ['*', 0.25, ['get', 'hi']]],
      },
    })
    m.addLayer({
      id: 'cells-line', type: 'line', source: 'cells',
      paint: { 'line-color': ['get', 'colour'], 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 16, 1.2], 'line-opacity': 0.7 },
    })
    m.addLayer({ id: 'zones', type: 'line', source: 'zones', paint: { 'line-color': '#16302A', 'line-width': 2, 'line-dasharray': [2, 2] } })
    m.addLayer({ id: 'suggest', type: 'line', source: 'suggest', paint: { 'line-color': '#16302A', 'line-width': 3, 'line-dasharray': [1.5, 1.2] } })
    m.addLayer({ id: 'loops', type: 'line', source: 'loops', paint: { 'line-color': '#2E55E6', 'line-width': 3 } })
    m.addLayer({ id: 'track', type: 'line', source: 'track', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#16302A', 'line-width': 4 } })
    m.addLayer({ id: 'me-halo', type: 'circle', source: 'me', paint: { 'circle-radius': 14, 'circle-color': '#2E55E6', 'circle-opacity': 0.18 } })
    m.addLayer({ id: 'me', type: 'circle', source: 'me', paint: { 'circle-radius': 7, 'circle-color': '#2E55E6', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } })
    m.on('click', 'cells-fill', (e) => {
      const f = e.features?.[0]
      if (f) emit('cell', { ...f.properties, lngLat: e.lngLat })
    })
    m.on('mouseenter', 'cells-fill', () => { m.getCanvas().style.cursor = 'pointer' })
    m.on('mouseleave', 'cells-fill', () => { m.getCanvas().style.cursor = '' })
    m.on('moveend', () => {
      const b = m.getBounds()
      emit('moved', { bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], centre: m.getCenter() })
    })
    loaded.value = true
    syncAll()
    if (props.fit) fitTo()
    emit('ready', m)
    const b = m.getBounds()
    emit('moved', { bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], centre: m.getCenter() })
  })
})

onBeforeUnmount(() => map.value?.remove())

watch(() => [props.cells, props.highlight], () => setData('cells', cellFeatures(props.cells, props.highlight)))
watch(() => props.track, () => {
  setData('track', props.track.length > 1 ? line(props.track) : empty)
}, { deep: false })
watch(() => props.track.length, () => setData('track', props.track.length > 1 ? line(props.track) : empty))
watch(() => props.loops, () => { setData('loops', rings(props.loops)); if (props.fit) fitTo() })
watch(() => props.suggestion, () => { setData('suggest', props.suggestion ? rings([props.suggestion]) : empty); if (props.suggestion) fitTo() })
watch(() => props.zones, () => setData('zones', rings(props.zones.map(circle))), { deep: true })
watch(() => props.me, (p) => {
  setData('me', p ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } } : empty)
  if (p && props.follow) map.value?.easeTo({ center: [p.lng, p.lat], duration: 400 })
})
watch(() => props.centre, (c) => {
  if (c && !props.fit) map.value?.easeTo({ center: [c.lng, c.lat], duration: 600 })
})

defineExpose({ map, fitTo })
</script>

<template>
  <div ref="el" class="tmap" />
</template>

<style scoped>
.tmap { width: 100%; height: 100%; min-height: 200px; background: #ECEFE4; }
.tmap :deep(.maplibregl-ctrl-attrib) { font-size: 10px; }
</style>
