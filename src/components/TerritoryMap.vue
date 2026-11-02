<script setup>
// The live territory map: OpenFreeMap streets underneath, hexes on top
// (yours in cobalt, rivals in their colours, faded by strength), plus an
// optional track, closed loops, a suggested loop and the player's dot.
// With `explored` set, everywhere your tracks haven't been is dimmed (fog of war).
// With `heat` on, hexes are shaded by how often they changed hands lately.
// Strongholds show as crown badges in the holder's colour; tap one to pick it.
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { Map as MLMap, LngLatBounds, Marker, setWorkerUrl } from 'maplibre-gl'
// MapLibre 6 runs its tile work in a module worker; let Vite bundle it.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
setWorkerUrl(mapWorkerUrl)
import 'maplibre-gl/dist/maplibre-gl.css'
import { cellToBoundary, cellToLatLng } from 'h3-js'
import { fogMask } from '../lib/engine/explore.js'

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
  explored: { type: Array, default: null }, // h3 ids you've been through; null keeps the normal map
  heat: { type: Boolean, default: false }, // hot spots: shade by recent flips instead of owner
  strongholds: { type: Array, default: () => [] }, // [{ id, name, start: {lat,lng}, holder: { colour, me } | null }]
  strongholdRoute: { type: Array, default: null }, // [{lat,lng}] of the picked stronghold
})
const emit = defineEmits(['cell', 'moved', 'ready', 'stronghold'])

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
        owner: c.owner,
        crest: c.ownerCrest || '',
        days: c.daysToWild,
        heat: c.heat || 0,
        flips: c.flips || 0,
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

// Paint for the two looks: owners (the default) and hot spots
const OWNER_PAINT = {
  'cells-fill': {
    'fill-color': ['get', 'colour'],
    // Yours stands out; rivals' ground is lighter. Stronger ground is more solid.
    'fill-opacity': ['+', ['case', ['==', ['get', 'mine'], 1], 0.28, 0.1], ['*', 0.003, ['get', 'strength']], ['*', 0.25, ['get', 'hi']]],
  },
  'cells-line': { 'line-color': ['get', 'colour'], 'line-opacity': 0.7 },
}
const HEAT_COLOUR = ['interpolate', ['linear'], ['get', 'heat'], 0, '#B9C2B3', 1, '#F2B33D', 3, '#E5604D', 6, '#9E1F1A']
const HEAT_PAINT = {
  'cells-fill': {
    'fill-color': HEAT_COLOUR,
    'fill-opacity': ['case', ['>', ['get', 'heat'], 0], ['min', 0.8, ['+', 0.4, ['*', 0.08, ['get', 'heat']]]], 0.08],
  },
  'cells-line': { 'line-color': HEAT_COLOUR, 'line-opacity': ['case', ['>', ['get', 'heat'], 0], 0.8, 0.25] },
}
function applyPaint() {
  const m = map.value
  if (!loaded.value || !m) return
  for (const [layer, paint] of Object.entries(props.heat ? HEAT_PAINT : OWNER_PAINT)) {
    for (const [k, v] of Object.entries(paint)) m.setPaintProperty(layer, k, v)
  }
}
// Crown badges for strongholds, as DOM markers so they work on any map style
const CROWN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 18h18l-1.5-10-4.5 4-3-7-3 7-4.5-4z" fill="currentColor"/></svg>'
let markers = []
function syncStrongholds() {
  if (!map.value) return
  for (const mk of markers) mk.remove()
  markers = props.strongholds.filter((s) => s.start).map((s) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'crown' + (s.holder?.me ? ' mine' : '') + (s.holder ? '' : ' open')
    el.style.setProperty('--holder', s.holder?.me ? '#2E55E6' : s.holder?.colour || '#16302A')
    el.setAttribute('aria-label', s.holder ? `${s.name}. Crown held by ${s.holder.me ? 'you' : s.holder.name}` : `${s.name}. Nobody holds the crown yet`)
    el.innerHTML = CROWN
    for (const ev of ['mousedown', 'touchstart', 'pointerdown', 'dblclick']) el.addEventListener(ev, (e) => e.stopPropagation())
    el.addEventListener('click', (e) => { e.stopPropagation(); emit('stronghold', s.id) })
    return new Marker({ element: el, anchor: 'center' }).setLngLat([s.start.lng, s.start.lat]).addTo(map.value)
  })
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
  setData('fog', props.explored ? fogMask(props.explored, props.centre) : empty)
  setData('shroute', props.strongholdRoute?.length > 1 ? line(props.strongholdRoute) : empty)
  syncStrongholds()
}

function fitTo() {
  let pts = [...props.track.map((p) => [p.lng, p.lat]), ...props.loops.flat(), ...(props.suggestion || [])]
  // Nothing else to fit: fit the hexes (the weekly recap's map)
  if (pts.length < 2) pts = props.cells.map((c) => cellToLatLng(c.h3)).map(([lat, lng]) => [lng, lat])
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
    m.addSource('fog', { type: 'geojson', data: empty })
    m.addLayer({ id: 'fog', type: 'fill', source: 'fog', paint: { 'fill-color': '#16302A', 'fill-opacity': 0.42 } })
    m.addSource('shroute', { type: 'geojson', data: empty })
    m.addLayer({
      id: 'cells-fill', type: 'fill', source: 'cells',
      paint: { ...OWNER_PAINT['cells-fill'] },
    })
    m.addLayer({
      id: 'cells-line', type: 'line', source: 'cells',
      paint: { ...OWNER_PAINT['cells-line'], 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 16, 1.2] },
    })
    m.addLayer({ id: 'zones', type: 'line', source: 'zones', paint: { 'line-color': '#16302A', 'line-width': 2, 'line-dasharray': [2, 2] } })
    m.addLayer({ id: 'suggest', type: 'line', source: 'suggest', paint: { 'line-color': '#16302A', 'line-width': 3, 'line-dasharray': [1.5, 1.2] } })
    m.addLayer({ id: 'shroute', type: 'line', source: 'shroute', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#16302A', 'line-width': 4, 'line-dasharray': [1, 1.4], 'line-opacity': 0.85 } })
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
    applyPaint()
    if (props.fit) fitTo()
    emit('ready', m)
    const b = m.getBounds()
    emit('moved', { bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], centre: m.getCenter() })
  })
})

onBeforeUnmount(() => { for (const mk of markers) mk.remove(); map.value?.remove() })

watch(() => [props.cells, props.highlight], () => {
  setData('cells', cellFeatures(props.cells, props.highlight))
  if (props.fit && !props.track.length && !props.loops.length) fitTo()
})
watch(() => props.explored, (ids) => setData('fog', ids ? fogMask(ids, props.centre) : empty))
watch(() => props.heat, applyPaint)
watch(() => props.track, () => {
  setData('track', props.track.length > 1 ? line(props.track) : empty)
}, { deep: false })
watch(() => props.track.length, () => setData('track', props.track.length > 1 ? line(props.track) : empty))
watch(() => props.loops, () => { setData('loops', rings(props.loops)); if (props.fit) fitTo() })
watch(() => props.suggestion, () => { setData('suggest', props.suggestion ? rings([props.suggestion]) : empty); if (props.suggestion) fitTo() })
watch(() => props.strongholds, syncStrongholds)
watch(() => props.strongholdRoute, () => setData('shroute', props.strongholdRoute?.length > 1 ? line(props.strongholdRoute) : empty))
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
.tmap :deep(.crown) {
  width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--holder); background: #fff; color: var(--holder);
  display: grid; place-items: center; padding: 0; cursor: pointer; box-shadow: 0 2px 8px -3px rgba(22, 48, 42, 0.6);
}
.tmap :deep(.crown.mine) { background: #2E55E6; color: #fff; border-color: #fff; }
.tmap :deep(.crown.open) { border-style: dashed; color: #16302A; }
</style>
