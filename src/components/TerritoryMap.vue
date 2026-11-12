<script setup>
// The live territory map: OpenFreeMap streets underneath, hexes on top
// (yours in cobalt, rivals in their colours, faded by strength), plus an
// optional track, closed loops, a suggested loop and the player's dot. Parks,
// bush and water get soft tints (theme.js), and `terrain` shades the hills.
// With `explored` set, everywhere your tracks haven't been is dimmed (fog of war).
// With `heat` on, hexes are shaded by how often they changed hands lately.
// Strongholds show as crown badges in the holder's colour; tap one to pick it.
// Hills (King of the hill) draw as a line with a small crown at the top, and
// the hexes around them glow the holder's colour as a soft outline.
// In night mode it uses OpenFreeMap's dark style, and swaps style live when
// the look changes (parents that add their own layers listen for `restyled`).
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { Map as MLMap, LngLatBounds, Marker, setWorkerUrl } from 'maplibre-gl'
// MapLibre 6 runs its tile work in a module worker; let Vite bundle it.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
setWorkerUrl(mapWorkerUrl)
import 'maplibre-gl/dist/maplibre-gl.css'
import { cellToBoundary, cellToLatLng } from 'h3-js'
import { fogMask } from '../lib/engine/explore.js'
import { hillGlow } from '../lib/engine/hills.js'
import { theme, mapStyleUrl, mapColours, tintStyle, TERRAIN_TILES, hillshadePaint } from '../lib/theme.js'

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
  ghost: { type: Object, default: null }, // the ghost you're racing: { lat, lng }
  follow: { type: Boolean, default: false },
  fit: { type: Boolean, default: false }, // fit to track/loops when they load
  interactive: { type: Boolean, default: true },
  explored: { type: Array, default: null }, // h3 ids you've been through; null keeps the normal map
  heat: { type: Boolean, default: false }, // hot spots: shade by recent flips instead of owner
  strongholds: { type: Array, default: () => [] }, // [{ id, name, start: {lat,lng}, holder: { colour, me } | null }]
  strongholdRoute: { type: Array, default: null }, // [{lat,lng}] of the picked stronghold
  hills: { type: Array, default: () => [] }, // [{ id, name, line: [[lng,lat]], top: {lat,lng}, holder: { colour, me, name } | null }]
  terrain: { type: Boolean, default: false }, // shade the hills
  asleep: { type: Boolean, default: false }, // nobody is looking (Pocket mode, screen off): skip live redraws
})
const emit = defineEmits(['cell', 'moved', 'ready', 'restyled', 'stronghold', 'hill'])

const el = ref(null)
const map = shallowRef(null)
const loaded = ref(false)

// The colours drawn on top of the streets, for the current look (day or night)
const colours = () => mapColours(theme.look)
const empty = { type: 'FeatureCollection', features: [] }

function cellFeatures(cells, hi) {
  const hiSet = new Set(hi)
  return {
    type: 'FeatureCollection',
    features: cells.map((c) => ({
      type: 'Feature',
      properties: {
        h3: c.h3,
        colour: c.mine ? colours().you : c.ownerColour || '#E8A817',
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

// Paint for the two views: owners (the default) and hot spots
const ownerPaint = (c) => ({
  'cells-fill': {
    'fill-color': ['get', 'colour'],
    // Yours stands out; rivals' ground is lighter. Stronger ground is more solid.
    'fill-opacity': ['+', ['case', ['==', ['get', 'mine'], 1], c.mineOpacity, c.rivalOpacity], ['*', 0.003, ['get', 'strength']], ['*', 0.25, ['get', 'hi']]],
  },
  'cells-line': { 'line-color': ['get', 'colour'], 'line-opacity': 0.7 },
})
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
  for (const [layer, paint] of Object.entries(props.heat ? HEAT_PAINT : ownerPaint(colours()))) {
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

// Hills: the line, the glow around it and a small crown at the top
const holderColour = (h) => (h.holder?.me ? '#2E55E6' : h.holder?.colour || '#16302A')
const glowCache = new Map()
function hillFeatures(hills) {
  const lines = []
  const glow = []
  for (const h of hills) {
    if (!h.line?.length) continue
    const colour = holderColour(h)
    lines.push({ type: 'Feature', properties: { id: h.id, colour }, geometry: { type: 'LineString', coordinates: h.line } })
    if (!h.holder) continue
    const key = h.id + ':' + h.line.length
    if (!glowCache.has(key)) glowCache.set(key, hillGlow(h.line))
    for (const id of glowCache.get(key)) glow.push({ type: 'Feature', properties: { colour }, geometry: { type: 'Polygon', coordinates: [cellToBoundary(id, true)] } })
  }
  return { lines: { type: 'FeatureCollection', features: lines }, glow: { type: 'FeatureCollection', features: glow } }
}
const HILL_CROWN = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M4 17h16l-1.3-8.5-3.9 3.4L12 6l-2.8 5.9-3.9-3.4z" fill="currentColor"/></svg>'
let hillMarkers = []
function syncHills() {
  if (!map.value) return
  const f = hillFeatures(props.hills)
  setData('hills', f.lines)
  setData('hillglow', f.glow)
  for (const mk of hillMarkers) mk.remove()
  hillMarkers = props.hills.filter((h) => h.top).map((h) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'hillcrown' + (h.holder?.me ? ' mine' : '') + (h.holder ? '' : ' open')
    el.style.setProperty('--holder', holderColour(h))
    el.setAttribute('aria-label', h.holder ? `${h.name}. King of the hill: ${h.holder.me ? 'you' : h.holder.name}` : `${h.name}. Nobody is King of the hill yet`)
    el.innerHTML = HILL_CROWN
    for (const ev of ['mousedown', 'touchstart', 'pointerdown', 'dblclick']) el.addEventListener(ev, (e) => e.stopPropagation())
    el.addEventListener('click', (e) => { e.stopPropagation(); emit('hill', h.id) })
    return new Marker({ element: el, anchor: 'center' }).setLngLat([h.top.lng, h.top.lat]).addTo(map.value)
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
  setData('ghost', props.ghost ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [props.ghost.lng, props.ghost.lat] } } : empty)
  setData('fog', props.explored ? fogMask(props.explored, props.centre) : empty)
  setData('shroute', props.strongholdRoute?.length > 1 ? line(props.strongholdRoute) : empty)
  syncStrongholds()
  syncHills()
}

function fitTo() {
  let pts = [...props.track.map((p) => [p.lng, p.lat]), ...props.loops.flat(), ...(props.suggestion || []), ...props.hills.flatMap((h) => h.line || [])]
  // Nothing else to fit: fit the hexes (the weekly recap's map)
  if (pts.length < 2) pts = props.cells.map((c) => cellToLatLng(c.h3)).map(([lat, lng]) => [lng, lat])
  if (pts.length < 2 || !map.value) return
  const b = pts.reduce((bb, p) => bb.extend(p), new LngLatBounds(pts[0], pts[0]))
  // A dead straight north-south or east-west line has no width to fit: give it some
  if (b.getEast() - b.getWest() < 0.0005 || b.getNorth() - b.getSouth() < 0.0005) {
    const c = b.getCenter()
    b.extend([c.lng - 0.0005, c.lat - 0.0005]).extend([c.lng + 0.0005, c.lat + 0.0005])
  }
  map.value.fitBounds(b, { padding: 48, duration: 0, maxZoom: 16 })
}

// Plain map paper, used when the street style can't load (offline, blocked).
// Hexes and routes still draw on it.
const fallback = (look) => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': mapColours(look).paper } }] })
const styleCache = new Map() // style URL to style
async function loadStyle(look) {
  const url = mapStyleUrl(look)
  if (styleCache.has(url)) return styleCache.get(url)
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!r.ok) throw new Error('style')
    styleCache.set(url, tintStyle(await r.json(), look))
  } catch {
    return fallback(look)
  }
  return styleCache.get(url)
}

// Terrain: hills shaded from open elevation tiles, under the labels and
// everything of ours. Added and removed live; put back after a style change.
function setTerrain(m, on) {
  if (!m) return
  if (!on) {
    if (m.getLayer('hillshade')) m.removeLayer('hillshade')
    return
  }
  if (!m.getSource('dem')) m.addSource('dem', { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 15, attribution: 'Elevation: Mapzen, AWS Terrain Tiles' })
  if (m.getLayer('hillshade')) return
  const labels = m.getStyle().layers.find((l) => l.type === 'symbol')
  m.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem', paint: hillshadePaint(theme.look) }, labels?.id || 'fog')
}
watch(() => props.terrain, (on) => { if (loaded.value) setTerrain(map.value, on) })

// Our own sources and layers on top of the street style. Run on load, and
// again after the style changes (setStyle clears them).
function addOwnLayers(m) {
  const c = colours()
  m.addSource('cells', { type: 'geojson', data: empty })
  m.addSource('track', { type: 'geojson', data: empty })
  m.addSource('loops', { type: 'geojson', data: empty })
  m.addSource('suggest', { type: 'geojson', data: empty })
  m.addSource('zones', { type: 'geojson', data: empty })
  m.addSource('me', { type: 'geojson', data: empty })
  m.addSource('ghost', { type: 'geojson', data: empty })
  m.addSource('fog', { type: 'geojson', data: empty })
  m.addLayer({ id: 'fog', type: 'fill', source: 'fog', paint: { 'fill-color': c.fog, 'fill-opacity': c.fogOpacity } })
  m.addSource('shroute', { type: 'geojson', data: empty })
  m.addSource('hills', { type: 'geojson', data: empty })
  m.addSource('hillglow', { type: 'geojson', data: empty })
  m.addLayer({
    id: 'cells-fill', type: 'fill', source: 'cells',
    paint: { ...ownerPaint(c)['cells-fill'] },
  })
  m.addLayer({
    id: 'cells-line', type: 'line', source: 'cells',
    paint: { ...ownerPaint(c)['cells-line'], 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 16, 1.2] },
  })
  // The glow round a hill: a soft outline in the holder's colour, never a fill like ground
  m.addLayer({ id: 'hillglow', type: 'line', source: 'hillglow', paint: { 'line-color': ['get', 'colour'], 'line-width': 3, 'line-blur': 2.5, 'line-opacity': 0.55 } })
  m.addLayer({ id: 'hills-case', type: 'line', source: 'hills', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': c.casing, 'line-width': 7, 'line-opacity': 0.9 } })
  m.addLayer({ id: 'hills', type: 'line', source: 'hills', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'colour'], 'line-width': 4 } })
  m.addLayer({ id: 'zones', type: 'line', source: 'zones', paint: { 'line-color': c.ink, 'line-width': 2, 'line-dasharray': [2, 2] } })
  m.addLayer({ id: 'suggest', type: 'line', source: 'suggest', paint: { 'line-color': c.ink, 'line-width': 3, 'line-dasharray': [1.5, 1.2] } })
  m.addLayer({ id: 'shroute', type: 'line', source: 'shroute', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': c.ink, 'line-width': 4, 'line-dasharray': [1, 1.4], 'line-opacity': 0.85 } })
  m.addLayer({ id: 'loops', type: 'line', source: 'loops', paint: { 'line-color': c.you, 'line-width': 3 } })
  m.addLayer({ id: 'track-case', type: 'line', source: 'track', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': c.casing, 'line-width': 8 } })
  m.addLayer({ id: 'track', type: 'line', source: 'track', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': c.ink, 'line-width': 4.5 } })
  m.addLayer({ id: 'ghost', type: 'circle', source: 'ghost', paint: { 'circle-radius': 8, 'circle-color': '#FFFFFF', 'circle-opacity': 0.85, 'circle-stroke-color': '#16302A', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.6 } })
  m.addLayer({ id: 'me-halo', type: 'circle', source: 'me', paint: { 'circle-radius': 14, 'circle-color': c.you, 'circle-opacity': 0.18 } })
  m.addLayer({ id: 'me', type: 'circle', source: 'me', paint: { 'circle-radius': 7, 'circle-color': c.you, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } })
}

onMounted(async () => {
  const look = theme.look
  const style = await loadStyle(look)
  if (!el.value) return
  shownLook = look
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
    addOwnLayers(m)
    setTerrain(m, props.terrain)
    // Layer events belong to the map, so they keep working after a style change
    m.on('click', 'hills-case', (e) => { const id = e.features?.[0]?.properties?.id; if (id) emit('hill', id) })
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
    restyle() // the look changed while the map was loading
  })
})

// Night mode switched: swap the street style, then put our layers back on top
let shownLook = null
async function restyle() {
  const look = theme.look
  if (!map.value || !loaded.value || look === shownLook) return
  const style = await loadStyle(look)
  const m = map.value
  if (!m || !loaded.value || look !== theme.look || look === shownLook) return
  shownLook = look
  loaded.value = false
  m.once('style.load', () => {
    addOwnLayers(m)
    setTerrain(m, props.terrain)
    loaded.value = true
    syncAll()
    applyPaint()
    emit('restyled', m)
  })
  m.setStyle(style, { diff: false })
}
watch(() => theme.look, restyle)

onBeforeUnmount(() => { for (const mk of [...markers, ...hillMarkers]) mk.remove(); map.value?.remove() })

watch(() => [props.cells, props.highlight], () => {
  setData('cells', cellFeatures(props.cells, props.highlight))
  if (props.fit && !props.track.length && !props.loops.length) fitTo()
})
watch(() => props.explored, (ids) => setData('fog', ids ? fogMask(ids, props.centre) : empty))
watch(() => props.heat, applyPaint)
// The live track: redrawn at most every 2 seconds, and not at all while
// asleep (Pocket mode's black screen). Drawing the whole line on every GPS
// fix was the run's biggest battery cost.
let trackTimer = null
let trackDirty = false
function drawTrack() {
  trackTimer = null
  if (props.asleep) { trackDirty = true; return }
  trackDirty = false
  setData('track', props.track.length > 1 ? line(props.track) : empty)
}
function trackSoon() {
  if (props.asleep) { trackDirty = true; return }
  if (!trackTimer) trackTimer = setTimeout(drawTrack, props.track.length < 3 ? 0 : 2000)
}
watch(() => props.track, () => { clearTimeout(trackTimer); drawTrack() }, { deep: false }) // a new track: straight away
watch(() => props.track.length, trackSoon)
watch(() => props.asleep, (a) => {
  if (a) return
  if (trackDirty) drawTrack()
  const p = props.me
  if (p) {
    setData('me', { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })
    if (props.follow) map.value?.jumpTo({ center: [p.lng, p.lat] })
  }
})
onBeforeUnmount(() => clearTimeout(trackTimer))
watch(() => props.loops, () => { setData('loops', rings(props.loops)); if (props.fit) fitTo() })
watch(() => props.suggestion, () => { setData('suggest', props.suggestion ? rings([props.suggestion]) : empty); if (props.suggestion) fitTo() })
watch(() => props.strongholds, syncStrongholds)
watch(() => props.hills, syncHills)
watch(() => props.strongholdRoute, () => setData('shroute', props.strongholdRoute?.length > 1 ? line(props.strongholdRoute) : empty))
watch(() => props.zones, () => setData('zones', rings(props.zones.map(circle))), { deep: true })
watch(() => props.me, (p) => {
  if (props.asleep) return
  setData('me', p ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } } : empty)
  if (p && props.follow) map.value?.easeTo({ center: [p.lng, p.lat], duration: 400 })
})
watch(() => props.centre, (c) => {
  if (c && !props.fit) map.value?.easeTo({ center: [c.lng, c.lat], duration: 600 })
})

defineExpose({ map, fitTo })
watch(() => props.ghost, (g) => !props.asleep && setData('ghost', g ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [g.lng, g.lat] } } : empty))
</script>

<template>
  <div ref="el" class="tmap" />
</template>

<style scoped>
.tmap { width: 100%; height: 100%; min-height: 200px; background: var(--map-paper); }
.tmap :deep(.maplibregl-ctrl-attrib) { font-size: 10px; }
.tmap :deep(.crown) {
  width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--holder); background: #fff; color: var(--holder);
  display: grid; place-items: center; padding: 0; cursor: pointer; box-shadow: 0 2px 8px -3px rgba(22, 48, 42, 0.6);
}
.tmap :deep(.crown.mine) { background: #2E55E6; color: #fff; border-color: #fff; }
.tmap :deep(.crown.open) { border-style: dashed; color: #16302A; }
.tmap :deep(.hillcrown) {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--holder); background: #fff; color: var(--holder);
  display: grid; place-items: center; padding: 0; cursor: pointer; box-shadow: 0 2px 6px -2px rgba(22, 48, 42, 0.6);
}
.tmap :deep(.hillcrown::after) { content: ''; position: absolute; inset: -10px; } /* a bigger tap target */
.tmap :deep(.hillcrown.mine) { background: #2E55E6; color: #fff; border-color: #fff; }
.tmap :deep(.hillcrown.open) { border-style: dashed; color: #16302A; }
</style>
