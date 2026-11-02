<script setup>
// Route planner: tap the map to drop points, see the distance, the time at your usual pace and which hexes the loop would take, then save it, run it or send it to a watch.
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Marker, LngLatBounds } from 'maplibre-gl'
import { cellToBoundary } from 'h3-js'
import TerritoryMap from '../../components/TerritoryMap.vue'
import { api } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { km, pace, duration, speedKmh, MODE_LABEL, plural } from '../../lib/format.js'
import { planRoute, usualPace, rivalLine, previewGroups, routeTrackPoints, escapeXml } from '../../lib/planner.js'
import { suggestLoop } from '../../lib/coach/routes.js'
import { toGpx } from '../../lib/tracks.js'
import { setPlanned } from '../../lib/plannedRoute.js'

const route = useRoute()
const router = useRouter()

const waypoints = ref([]) // [[lng, lat], ...]
const history = ref([])
const closed = ref(true)
const mode = ref(store.mode)
const name = ref('')
const editingId = ref(null)
const open = ref(false)
const activities = ref([])
const cellList = ref([])
const saved = ref([])
const busy = ref(false)
const map = shallowRef(null)
const bbox = ref(null)
let markers = []
let moveTimer = 0

// ---- the game state the preview is worked out against ----
const cellsMap = computed(() => new Map(cellList.value.map((c) => [c.h3, {
  h3: c.h3, owner: c.mine ? store.user.id : c.owner, strength: c.strength, lastVisit: Date.now(), visits: 1,
}])))
const names = computed(() => new Map(cellList.value.filter((c) => !c.mine).map((c) => [c.owner, { name: c.ownerName, colour: c.ownerColour }])))
const paceS = computed(() => usualPace(activities.value, mode.value))
const hasHistory = computed(() => activities.value.some((a) => a.mode === mode.value && !a.rejected && a.paceSPerKm))

const plan = computed(() => planRoute({
  waypoints: waypoints.value, closed: closed.value, mode: mode.value, paceSPerKm: paceS.value,
  cells: cellsMap.value, me: store.user.id, names: names.value,
}))
const cap = computed(() => plan.value.capture)
const paceText = computed(() => mode.value === 'ride' ? `${speedKmh(paceS.value)} km/h` : `${pace(paceS.value)} /km`)
const hint = computed(() => {
  const n = waypoints.value.length
  if (!n) return 'Tap the map to drop your start.'
  if (n < 3) return 'Keep tapping to add points. Drag a point to move it.'
  return null
})
const status = computed(() => {
  if (waypoints.value.length < 3) return null
  if (plan.value.warning) return { bad: true, text: plan.value.warning.text }
  return { bad: false, text: `This loop takes ${plural(cap.value.total, 'hex', 'hexes')}.` }
})

// ---- editing ----
function commit(next) {
  history.value.push(waypoints.value)
  if (history.value.length > 100) history.value.shift()
  waypoints.value = next
}
function undo() {
  if (history.value.length) waypoints.value = history.value.pop()
}
function clearAll() {
  if (!waypoints.value.length) return
  commit([])
  editingId.value = null
  name.value = ''
}

function onMapClick(e) {
  if (e.originalEvent?.target?.closest?.('.wp')) return
  commit([...waypoints.value, [e.lngLat.lng, e.lngLat.lat]])
}

function drawMarkers() {
  for (const m of markers) m.remove()
  markers = []
  if (!map.value) return
  waypoints.value.forEach((p, i) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'wp' + (i === 0 ? ' start' : '')
    el.setAttribute('aria-label', i === 0 ? 'Start point. Drag to move.' : `Point ${i + 1}. Drag to move.`)
    el.innerHTML = '<span></span>'
    // Tapping the start closes the loop
    if (i === 0) el.addEventListener('click', () => { if (waypoints.value.length >= 3) closed.value = true })
    const mk = new Marker({ element: el, draggable: true }).setLngLat(p).addTo(map.value)
    mk.on('drag', () => {
      const ll = mk.getLngLat()
      const next = waypoints.value.slice()
      next[i] = [ll.lng, ll.lat]
      setLine(next)
    })
    mk.on('dragend', () => {
      const ll = mk.getLngLat()
      const next = waypoints.value.slice()
      next[i] = [ll.lng, ll.lat]
      commit(next)
    })
    markers.push(mk)
  })
}

// ---- map layers for the preview ----
const empty = { type: 'FeatureCollection', features: [] }
function setLine(pts = waypoints.value) {
  const line = closed.value && pts.length >= 3 ? [...pts, pts[0]] : pts
  map.value?.getSource('plan-line')?.setData(line.length > 1
    ? { type: 'Feature', properties: { ok: plan.value.counts ? 1 : 0 }, geometry: { type: 'LineString', coordinates: line } }
    : empty)
}
function setPreview() {
  const features = []
  for (const g of previewGroups(cap.value)) {
    for (const h of g.hexes) features.push({ type: 'Feature', properties: { kind: g.kind, colour: g.colour }, geometry: { type: 'Polygon', coordinates: [cellToBoundary(h, true)] } })
  }
  map.value?.getSource('plan-hex')?.setData({ type: 'FeatureCollection', features })
}

function onReady(m) {
  map.value = m
  m.addSource('plan-hex', { type: 'geojson', data: empty })
  m.addSource('plan-line', { type: 'geojson', data: empty })
  m.addLayer({
    id: 'plan-hex-fill', type: 'fill', source: 'plan-hex',
    paint: {
      'fill-color': ['get', 'colour'],
      'fill-opacity': ['match', ['get', 'kind'], 'wild', 0.4, 'mine', 0.18, 'take', 0.5, 0.12],
    },
  }, 'zones')
  m.addLayer({
    id: 'plan-hex-line', type: 'line', source: 'plan-hex',
    paint: {
      'line-color': ['case', ['==', ['get', 'kind'], 'take'], '#2E55E6', ['get', 'colour']],
      'line-width': ['case', ['==', ['get', 'kind'], 'take'], 2, 0.8],
      'line-opacity': 0.85,
    },
  }, 'zones')
  m.addLayer({
    id: 'plan-line', type: 'line', source: 'plan-line',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['case', ['==', ['get', 'ok'], 1], '#2E55E6', '#16302A'], 'line-width': 4 },
  })
  m.on('click', onMapClick)
  drawMarkers()
  setLine()
  setPreview()
  if (waypoints.value.length > 1) fitRoute()
}

function fitRoute() {
  const pts = waypoints.value
  if (!map.value || pts.length < 2) return
  const b = pts.reduce((bb, p) => bb.extend(p), new LngLatBounds(pts[0], pts[0]))
  map.value.fitBounds(b, { padding: { top: 70, bottom: 260, left: 40, right: 40 }, duration: 0, maxZoom: 16 })
}

watch(waypoints, () => { drawMarkers(); setLine(); setPreview() })
watch(plan, () => { setLine(); setPreview() })
watch(closed, () => setLine())

// ---- territory around what's on screen and around the route ----
async function loadCells() {
  const pts = waypoints.value
  let [w, s, e, n] = bbox.value || [store.centre.lng, store.centre.lat, store.centre.lng, store.centre.lat]
  for (const [lng, lat] of pts) { w = Math.min(w, lng); e = Math.max(e, lng); s = Math.min(s, lat); n = Math.max(n, lat) }
  const pad = 0.02
  const { cells } = await api.territory({ mode: mode.value, bbox: [w - pad, s - pad, e + pad, n + pad] })
  cellList.value = cells
}
function onMoved({ bbox: b }) {
  bbox.value = b
  clearTimeout(moveTimer)
  moveTimer = setTimeout(loadCells, 250)
}
watch(mode, loadCells)

// ---- snap to the suggested loop ----
async function snap() {
  busy.value = true
  try {
    const start = waypoints.value.length ? { lng: waypoints.value[0][0], lat: waypoints.value[0][1] } : (map.value ? map.value.getCenter() : store.centre)
    const usual = { run: 4, walk: 3, ride: 12 }[mode.value]
    const asked = Number(route.query.km)
    const targetKm = plan.value.distanceM >= 500 ? plan.value.distanceM / 1000 : Number.isFinite(asked) && asked > 0 ? asked : usual
    await loadCells()
    const s = suggestLoop({ start: { lat: start.lat, lng: start.lng }, targetKm, cells: cellsMap.value, me: store.user.id, mode: mode.value, names: new Map([...names.value].map(([id, p]) => [id, p.name])) })
    // Every third point of the oval: enough to keep the shape, few enough to drag
    const ring = s.ring.slice(0, -1).filter((_, i) => i % 3 === 0)
    closed.value = true
    commit(ring)
    fitRoute()
    toast(s.note)
  } finally {
    busy.value = false
  }
}

// ---- save, run, export ----
async function save() {
  if (plan.value.line.length < 2) return
  busy.value = true
  try {
    const { route: r } = await api.saveRoute({ id: editingId.value || undefined, name: name.value, mode: mode.value, ring: plan.value.line })
    editingId.value = r.id
    name.value = r.name
    toast('Route saved.')
    await loadSaved()
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = false
  }
}
async function loadSaved() {
  try { saved.value = (await api.routes()).routes } catch { saved.value = [] }
}
function openSaved(r) {
  const ring = r.ring
  const isClosed = ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
  closed.value = isClosed
  mode.value = r.mode
  name.value = r.name
  editingId.value = r.id
  commit(isClosed ? ring.slice(0, -1) : ring.slice())
  fitRoute()
  open.value = false
}
async function removeSaved(r) {
  if (!confirm(`Delete "${r.name}"? This only removes the plan, not any ground.`)) return
  try {
    await api.deleteRoute(r.id)
    if (editingId.value === r.id) editingId.value = null
    await loadSaved()
  } catch (e) {
    toast(e.message)
  }
}

function runIt() {
  if (plan.value.line.length < 2) return
  setPlanned({ name: name.value || 'Planned route', mode: mode.value, ring: plan.value.line })
  router.push({ name: 'record', query: { route: 'planned' } })
}

function exportGpx() {
  if (plan.value.line.length < 2) return
  const label = name.value || `Foothold ${mode.value} route`
  const pts = routeTrackPoints(plan.value.line, { paceSPerKm: paceS.value })
  const blob = new Blob([toGpx(pts, escapeXml(label))], { type: 'application/gpx+xml' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'foothold-route'}.gpx`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 2000)
}

onMounted(async () => {
  const [{ activities: acts }] = await Promise.all([api.activities({ limit: 30 }).catch(() => ({ activities: [] })), loadSaved()])
  activities.value = acts
  if (route.query.id) {
    const r = saved.value.find((x) => x.id === route.query.id)
    if (r) openSaved(r)
  }
  if (route.query.suggest) await snap()
})
onBeforeUnmount(() => { clearTimeout(moveTimer); for (const m of markers) m.remove() })
</script>

<template>
  <div class="plan">
    <div class="maparea">
      <TerritoryMap :centre="store.centre" :zoom="15" :cells="cellList" :me="store.located ? store.centre : null" @moved="onMoved" @ready="onReady" />
      <RouterLink class="back" to="/app" aria-label="Back to the map">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </RouterLink>
      <div v-if="hint" class="maphint" aria-live="polite">{{ hint }}</div>
    </div>

    <section class="sheet" :class="{ open }" aria-label="Route details">
      <button class="grab" type="button" :aria-expanded="open" @click="open = !open">
        <span class="bar" aria-hidden="true"></span>
        <span class="nums">
          <span><strong>{{ km(plan.distanceM) }}</strong> km</span>
          <span><strong>{{ duration(plan.timeS) }}</strong></span>
          <span><strong>{{ cap ? cap.total : 0 }}</strong> {{ cap && cap.total === 1 ? 'hex' : 'hexes' }}</span>
        </span>
        <span class="more small">{{ open ? 'Less' : 'Details' }}</span>
      </button>

      <p v-if="status" class="status small" :class="{ warn: status.bad }" aria-live="polite">{{ status.text }}</p>

      <div v-if="open" class="details">
        <div class="seg" role="group" aria-label="Activity type">
          <button v-for="m in ['run', 'walk', 'ride']" :key="m" type="button" :aria-pressed="mode === m" @click="mode = m">{{ MODE_LABEL[m] }}</button>
        </div>
        <p class="small muted">Time at {{ hasHistory ? 'your usual pace' : 'an easy pace' }} of {{ paceText }}. Straight lines between points, so the streets may add a little.</p>

        <ul v-if="cap" class="capture">
          <li v-if="cap.wild.length"><span class="hexdot" style="background: #2E55E6" aria-hidden="true"></span>{{ plural(cap.wild.length, 'wild hex', 'wild hexes') }} become yours.</li>
          <li v-if="cap.mine.length"><span class="hexdot" style="background: rgba(46, 85, 230, 0.4)" aria-hidden="true"></span>{{ cap.mine.length }} of yours get stronger.</li>
          <li v-for="r in cap.rivals" :key="r.id"><span class="hexdot" :style="{ background: r.colour }" aria-hidden="true"></span>{{ rivalLine(r) }}</li>
        </ul>

        <button class="btn quiet block" type="button" :disabled="busy" @click="snap">Snap to the suggested loop</button>

        <div class="field">
          <label for="route-name">Name</label>
          <input id="route-name" v-model="name" maxlength="60" placeholder="Park loop" autocomplete="off" />
        </div>
        <div class="two">
          <button class="btn secondary" type="button" :disabled="busy || plan.line.length < 2" @click="save">{{ editingId ? 'Save changes' : 'Save route' }}</button>
          <button class="btn secondary" type="button" :disabled="plan.line.length < 2" @click="exportGpx">Export GPX</button>
        </div>

        <div v-if="saved.length" class="saved">
          <h3>Saved routes</h3>
          <ul class="rows">
            <li v-for="r in saved" :key="r.id" class="row">
              <button class="open" type="button" @click="openSaved(r)">
                <strong>{{ r.name }}</strong>
                <span class="small muted">{{ MODE_LABEL[r.mode] }}, {{ km(r.distanceM) }} km</span>
              </button>
              <button class="del" type="button" :aria-label="`Delete ${r.name}`" @click="removeSaved(r)">Delete</button>
            </li>
          </ul>
        </div>
      </div>

      <div class="tools">
        <button class="btn quiet small" type="button" :disabled="!history.length" @click="undo">Undo</button>
        <button class="btn quiet small" type="button" :disabled="!waypoints.length" @click="clearAll">Clear</button>
        <label class="toggle">
          <input v-model="closed" type="checkbox" />
          <span>Close the loop</span>
        </label>
      </div>
      <button class="btn block go" type="button" :disabled="plan.line.length < 2" @click="runIt">Run this route</button>
    </section>
  </div>
</template>

<style scoped>
.plan { position: relative; height: 100dvh; overflow: hidden; }
.maparea { position: absolute; inset: 0; }
.maparea > :first-child { position: absolute; inset: 0; }
.back {
  position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 12px; z-index: 2;
  width: 44px; height: 44px; border-radius: 50%; background: #fff; color: var(--ink);
  display: grid; place-items: center; box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.maphint {
  position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 64px; right: 12px; z-index: 2;
  background: #fff; border-radius: 12px; padding: 10px 14px; font-weight: 650; font-size: 0.95rem;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.sheet {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 3;
  background: #fff; border-radius: 18px 18px 0 0; padding: 6px var(--pad) calc(14px + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; gap: 10px; box-shadow: 0 -10px 30px -14px rgba(22, 48, 42, 0.55);
  max-width: 560px; margin: 0 auto; max-height: 78dvh;
}
.sheet > * { min-width: 0; }
.grab {
  display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 6px 10px;
  border: 0; background: none; font: inherit; color: var(--ink); padding: 4px 0; cursor: pointer; text-align: left; min-height: 48px;
}
.grab .bar { grid-column: 1 / -1; justify-self: center; width: 40px; height: 4px; border-radius: 2px; background: var(--ink-15); }
.nums { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.95rem; color: var(--ink-60); }
.nums strong { font-weight: 850; font-stretch: 112%; font-size: 1.3rem; color: var(--ink); font-variant-numeric: tabular-nums; }
.more { color: var(--you); font-weight: 700; }
.status { margin: 0; padding: 8px 12px; border-radius: 10px; background: #E3F2E7; color: #1D4D30; }
.status.warn { background: #FFF4DE; color: #5A3B00; }
.details { flex: 1 1 auto; overflow-y: auto; display: grid; gap: 12px; align-content: start; min-height: 0; overscroll-behavior: contain; }
.capture { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.capture li { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; font-size: 0.95rem; }
.capture .hexdot { width: 18px; height: 16px; margin-top: 2px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.saved { display: grid; gap: 4px; }
.saved .rows { list-style: none; margin: 0; padding: 0; }
.row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; padding: 6px 0; }
.row .open { display: grid; gap: 2px; text-align: left; border: 0; background: none; font: inherit; color: var(--ink); padding: 8px 0; cursor: pointer; min-height: 48px; min-width: 0; }
.row .open strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row .del { border: 0; background: var(--soft); color: var(--ink); font: inherit; font-weight: 650; font-size: 0.9rem; border-radius: 999px; padding: 8px 14px; min-height: 40px; cursor: pointer; }
.tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.toggle { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font-weight: 650; font-size: 0.95rem; min-height: 44px; cursor: pointer; }
.toggle input { width: 22px; height: 22px; accent-color: var(--you); }
.go { min-height: 56px; font-size: 1.1rem; }

/* Waypoint markers: a small dot with a thumb-sized hit area */
:deep(.wp) { width: 44px; height: 44px; border: 0; padding: 0; background: none; display: grid; place-items: center; cursor: grab; touch-action: none; }
:deep(.wp span) { width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 3px solid #16302A; box-sizing: border-box; }
:deep(.wp.start span) { width: 22px; height: 22px; background: #2E55E6; border-color: #fff; box-shadow: 0 0 0 2px #2E55E6; }
</style>
