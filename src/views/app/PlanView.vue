<script setup>
// Route planner: tap the map to drop points and the route follows the paths
// between them (drag a point and only its two pieces reroute). See distance,
// time at your usual pace, the climb and which hexes the loop would take.
// Auto-build a loop (and ask for another), trace a rival's ground to take it
// back, filter saved routes by climb, then save, run or send it to a watch.
// A hill page (King of the hill) opens here with ?hill=id and the hill's line.
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Marker, LngLatBounds } from 'maplibre-gl'
import { cellToBoundary } from 'h3-js'
import TerritoryMap from '../../components/TerritoryMap.vue'
import { api } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { km, pace, duration, speedKmh, MODE_LABEL, plural } from '../../lib/format.js'
import { routeLine, planRoute, usualPace, rivalLine, previewGroups, routeTrackPoints, escapeXml, pathLine, routePairs, pointsFor, groundOutline } from '../../lib/planner.js'
import { loopOptions } from '../../lib/coach/routes.js'
import { fillPaths, knownPaths, canSnap, routeVia } from '../../lib/paths.js'
import { streetLoopsFor } from '../../lib/suggest.js'
import { placeSteps } from '../../lib/directions.js'
import { withDistance, sampleByDistance, heights } from '../../lib/runStats.js'
import { elevationFor } from '../../lib/elevation.js'
import ProfileChart from '../../components/ProfileChart.vue'
import SendRouteSheet from '../../components/SendRouteSheet.vue'
import SharedRoutes from '../../components/SharedRoutes.vue'
import RouteWhen from '../../components/RouteWhen.vue'
import { addRouteToCalendar } from '../../lib/routeShare.js'
import { cellToLatLng } from 'h3-js'
import { toGpx } from '../../lib/tracks.js'
import { setPlanned, planned } from '../../lib/plannedRoute.js'
import { theme, mapColours } from '../../lib/theme.js'

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
const follow = ref(canSnap()) // follow paths between points
const pathsTick = ref(0) // bumps as paths arrive, so the line redraws
const finding = ref(false)
const elev = ref(null) // { ds, alts } for the route on screen
const climbFilter = ref('any')
const plannedAt = ref(null) // a day and time to run it (ms) or null
const sending = ref(null) // the saved route being sent to the crew
let markers = []
let moveTimer = 0

// ---- the game state the preview is worked out against ----
const cellsMap = computed(() => new Map(cellList.value.map((c) => [c.h3, {
  h3: c.h3, owner: c.mine ? store.user.id : c.owner, strength: c.strength, lastVisit: Date.now(), visits: 1,
}])))
const names = computed(() => new Map(cellList.value.filter((c) => !c.mine).map((c) => [c.owner, { name: c.ownerName, colour: c.ownerColour }])))
const paceS = computed(() => usualPace(activities.value, mode.value))
const hasHistory = computed(() => activities.value.some((a) => a.mode === mode.value && !a.rejected && a.paceSPerKm))

const plan = computed(() => {
  void pathsTick.value
  return planRoute({
    waypoints: waypoints.value, closed: closed.value, mode: mode.value, paceSPerKm: paceS.value,
    cells: cellsMap.value, me: store.user.id, names: names.value, paths: follow.value ? knownPaths() : null,
  })
})
const climb = computed(() => (elev.value ? heights(elev.value.alts) : null))
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
  plannedAt.value = null
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
  // Pieces with a known path follow it; a piece being dragged is straight until it lands
  const line = pathLine(pts, closed.value, mode.value, follow.value ? knownPaths() : new Map())
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

// The planner's own layers. Added when the map is ready, and again after
// night mode swaps the street style (which clears them).
function addPlanLayers(m) {
  const c = mapColours(theme.look)
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
      'line-color': ['case', ['==', ['get', 'kind'], 'take'], c.you, ['get', 'colour']],
      'line-width': ['case', ['==', ['get', 'kind'], 'take'], 2, 0.8],
      'line-opacity': 0.85,
    },
  }, 'zones')
  m.addLayer({
    id: 'plan-line', type: 'line', source: 'plan-line',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['case', ['==', ['get', 'ok'], 1], c.you, c.ink], 'line-width': 4 },
  })
}
function onRestyled(m) {
  addPlanLayers(m)
  setLine()
  setPreview()
}
function onReady(m) {
  map.value = m
  addPlanLayers(m)
  m.on('click', onMapClick)
  drawMarkers()
  setLine()
  setPreview()
  if (waypoints.value.length > 1) fitRoute()
}

function fitRoute() {
  const pts = plan.value.line.length > 1 ? plan.value.line : waypoints.value
  if (!map.value || pts.length < 2) return
  const b = pts.reduce((bb, p) => bb.extend(p), new LngLatBounds(pts[0], pts[0]))
  map.value.fitBounds(b, { padding: { top: 70, bottom: 260, left: 40, right: 40 }, duration: 0, maxZoom: 16 })
}

watch(waypoints, () => { drawMarkers(); setLine(); setPreview() })
watch(plan, () => { setLine(); setPreview() })
watch(closed, () => setLine())

// ---- paths between the points ----
async function snapPaths() {
  if (!follow.value || waypoints.value.length < 2) return
  finding.value = true
  try { await fillPaths(routePairs(waypoints.value, closed.value), mode.value, () => pathsTick.value++) } finally { finding.value = false }
}
watch([waypoints, closed, mode, follow], snapPaths)

// ---- the climb along the route (after the line settles) ----
let elevTimer = 0
watch(() => plan.value.line, (line) => {
  clearTimeout(elevTimer)
  if (line.length < 2 || plan.value.distanceM < 200) { elev.value = null; return }
  elevTimer = setTimeout(async () => {
    const samples = sampleByDistance(withDistance(line.map(([lng, lat]) => ({ lat, lng }))), 160)
    const r = await elevationFor({}, samples).catch(() => null)
    if (r && line === plan.value.line) elev.value = { ds: samples.map((x) => x.d), alts: r.alts }
  }, 700)
})

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

// ---- auto-build a loop, and another ----
let options = []
let optionAt = -1
const built = ref(false)
let streetOpts = []
async function autoBuild() {
  busy.value = true
  try {
    const start = waypoints.value.length ? { lng: waypoints.value[0][0], lat: waypoints.value[0][1] } : (map.value ? map.value.getCenter() : store.centre)
    const usual = { run: 4, walk: 3, ride: 12 }[mode.value]
    const asked = Number(route.query.km)
    if (!built.value) {
      options = []
      streetOpts = []
      optionAt = -1
    }
    const targetKm = !built.value && plan.value.distanceM >= 500 ? plan.value.distanceM / 1000 : options.targetKm || (Number.isFinite(asked) && asked > 0 ? asked : usual)
    options.targetKm = targetKm
    // Real streets when the route lookup is there: loops chosen for the ground they take
    if (canSnap()) {
      if (optionAt + 1 >= streetOpts.length) {
        const r = await streetLoopsFor({ lat: start.lat, lng: start.lng }, mode.value, targetKm, { skip: streetOpts.map((o) => o.headingDeg) })
        if (r.streets) streetOpts.push(...r.loops)
      }
      if (streetOpts.length) {
        optionAt = (optionAt + 1) % streetOpts.length
        const o = streetOpts[optionAt]
        closed.value = true
        follow.value = true
        commit(pointsFor(o.line.slice(0, -1), 14))
        built.value = true
        await snapPaths()
        fitRoute()
        toast(o.note)
        return
      }
    }
    // No street lookup: a rough oval to start from
    if (!options.length) {
      await loadCells()
      const opts = loopOptions({ start: { lat: start.lat, lng: start.lng }, targetKm, cells: cellsMap.value, me: store.user.id, mode: mode.value })
      options.push(...opts)
    }
    optionAt = (optionAt + 1) % options.length
    const o = options[optionAt]
    // About eight points round the shape: the paths fill in between, and each one can be dragged
    const ring = o.ring.slice(0, -1)
    const step = Math.max(1, Math.round(ring.length / 8))
    closed.value = true
    follow.value = canSnap()
    commit(ring.filter((_, i) => i % step === 0))
    built.value = true
    await snapPaths()
    fitRoute()
    const est = o.s
    toast(`Loop to the ${o.heading}: about ${plural(est.wild + est.rival, 'hex', 'hexes')} to take.`)
  } finally {
    busy.value = false
  }
}

// ---- take it back: trace a rival's ground as a route ----
async function copyGround(h3) {
  const [lat, lng] = cellToLatLng(h3)
  bbox.value = [lng - 0.02, lat - 0.02, lng + 0.02, lat + 0.02]
  await loadCells()
  const out = groundOutline(cellList.value, h3)
  if (!out) { toast("That ground isn't there any more."); return }
  const owner = cellList.value.find((c) => c.h3 === h3)
  closed.value = true
  follow.value = canSnap()
  commit(pointsFor(out.ring.slice(0, -1), 14))
  name.value = owner && !owner.mine ? `Take back from ${owner.ownerName || 'a rival'}` : 'Round my ground'
  await snapPaths()
  fitRoute()
}

// ---- save, run, export ----
async function save() {
  if (plan.value.line.length < 2) return
  busy.value = true
  try {
    const { route: r } = await api.saveRoute({
      id: editingId.value || undefined, name: name.value, mode: mode.value, ring: plan.value.line.slice(0, 2000),
      waypoints: follow.value ? routeLine(waypoints.value, false) : null, climbM: climb.value ? climb.value.gain : null,
      plannedAt: plannedAt.value,
    })
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
  plannedAt.value = r.plannedAt ?? null
  const body = isClosed ? ring.slice(0, -1) : ring.slice()
  if (r.waypoints?.length >= 2) { follow.value = canSnap(); commit(r.waypoints.slice()) } // drawn on paths: the same points snap the same way
  else if (body.length > 40) { follow.value = canSnap(); commit(pointsFor(body, 14)) } // a long line: a few points to drag
  else { follow.value = false; commit(body) } // drawn with straight lines: keep it exactly
  fitRoute()
  open.value = false
}
// A route someone sent you: opens like a saved one, and Save makes it yours
function openShared(r) {
  const ring = r.ring
  const isClosed = ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
  closed.value = isClosed
  mode.value = r.mode
  name.value = r.name
  plannedAt.value = r.plannedAt ?? null
  editingId.value = null
  const body = isClosed ? ring.slice(0, -1) : ring.slice()
  if (body.length > 40) { follow.value = canSnap(); commit(pointsFor(body, 14)) } else { follow.value = false; commit(body) }
  fitRoute()
  open.value = false
}
function addToCalendar() {
  addRouteToCalendar({ id: editingId.value, name: name.value || 'Planned route', mode: mode.value, distanceM: plan.value.distanceM, plannedAt: plannedAt.value })
}

const CLIMBS = { any: Infinity, 25: 25, 50: 50, 100: 100 }
const shownSaved = computed(() => {
  const max = CLIMBS[climbFilter.value]
  const list = saved.value.filter((r) => max === Infinity || (r.climbM != null && r.climbM <= max))
  return climbFilter.value === 'any' ? list : list.sort((a, b) => a.climbM - b.climbM)
})
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

async function runIt() {
  if (plan.value.line.length < 2) return
  // Turn by turn directions for the same points, when the route lookup is there
  let steps = null
  const wps = waypoints.value
  if (follow.value && canSnap() && wps.length >= 2 && wps.length <= 24) {
    busy.value = true
    const r = await routeVia(closed.value ? [...wps, wps[0]] : wps, mode.value).catch(() => null)
    busy.value = false
    if (r?.steps?.length) steps = placeSteps(plan.value.line, r.steps, { loop: closed.value })
  }
  setPlanned({ name: name.value || 'Planned route', mode: mode.value, ring: plan.value.line, steps })
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
  if (route.query.suggest) await autoBuild()
  // From Suggest a loop on the map: the street loop, ready to change
  if (route.query.from === 'loop' && planned.route) openShared({ ring: planned.route.ring, mode: planned.route.mode, name: planned.route.name })
  if (route.query.copy) await copyGround(String(route.query.copy))
  // From a hill page (King of the hill): its line, ready to run or build a loop round
  if (route.query.hill) {
    try {
      const { hill } = await api.hill(String(route.query.hill))
      openShared({ ring: hill.line, mode: hill.mode, name: `Up ${hill.name.replace(/^The /, 'the ')}` })
    } catch (e) { toast(e.message) }
  }
})
onBeforeUnmount(() => { clearTimeout(moveTimer); clearTimeout(elevTimer); for (const m of markers) m.remove() })
</script>

<template>
  <div class="plan">
    <div class="maparea">
      <TerritoryMap :centre="store.centre" :zoom="15" :cells="cellList" :me="store.located ? store.centre : null" @moved="onMoved" @ready="onReady" @restyled="onRestyled" />
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
          <span v-if="climb"><strong>{{ climb.gain }}</strong> m up</span>
        </span>
        <span class="more small">{{ open ? 'Less' : 'Details' }}</span>
      </button>

      <p v-if="finding" class="status small finding" aria-live="polite">Finding paths between your points.</p>
      <p v-else-if="status" class="status small" :class="{ warn: status.bad }" aria-live="polite">{{ status.text }}</p>

      <div v-if="open" class="details">
        <div class="seg" role="group" aria-label="Activity type">
          <button v-for="m in ['run', 'walk', 'ride']" :key="m" type="button" :aria-pressed="mode === m" @click="mode = m">{{ MODE_LABEL[m] }}</button>
        </div>
        <p class="small muted">
          Time at {{ hasHistory ? 'your usual pace' : 'an easy pace' }} of {{ paceText }}.
          {{ follow ? 'The route follows paths and streets between your points.' : 'Straight lines between points, so the streets may add a little.' }}
        </p>

        <ProfileChart
          v-if="elev" :ds="elev.ds" :values="elev.alts" kind="area" :height="96" :step="5" :min-span="30"
          :format="(v) => `${Math.round(v)} m`" title="Elevation"
          :sub="`Highest point ${climb.high} m. Climbs ${climb.gain} m in total.`"
          :summary="`Elevation along the route, from ${climb.low} m to ${climb.high} m, climbing ${climb.gain} m.`" value-name="Height"
        />

        <p v-if="cap" class="small"><strong>About {{ cap.areaKm2 < 0.1 ? cap.areaKm2.toFixed(2) : cap.areaKm2.toFixed(1) }} km²</strong> of ground inside the loop.</p>
        <ul v-if="cap" class="capture">
          <li v-if="cap.wild.length"><span class="hexdot" style="background: #2E55E6" aria-hidden="true"></span>{{ plural(cap.wild.length, 'wild hex', 'wild hexes') }} become yours.</li>
          <li v-if="cap.mine.length"><span class="hexdot" style="background: rgba(46, 85, 230, 0.4)" aria-hidden="true"></span>{{ cap.mine.length }} of yours get stronger.</li>
          <li v-for="r in cap.rivals" :key="r.id"><span class="hexdot" :style="{ background: r.colour }" aria-hidden="true"></span>{{ rivalLine(r) }}</li>
        </ul>

        <button class="btn quiet block" type="button" :disabled="busy" @click="autoBuild">{{ built ? 'Try another loop' : 'Auto-build a loop from here' }}</button>

        <div class="field">
          <label for="route-name">Name</label>
          <input id="route-name" v-model="name" maxlength="60" placeholder="Park loop" autocomplete="off" />
        </div>
        <RouteWhen v-model="plannedAt" id-prefix="plan" />
        <button v-if="plannedAt != null" class="btn quiet block" type="button" @click="addToCalendar">Add to calendar</button>
        <div class="two">
          <button class="btn secondary" type="button" :disabled="busy || plan.line.length < 2" @click="save">{{ editingId ? 'Save changes' : 'Save route' }}</button>
          <button class="btn secondary" type="button" :disabled="plan.line.length < 2" @click="exportGpx">Export GPX</button>
        </div>

        <button v-if="editingId" class="btn quiet block" type="button" @click="sending = saved.find((x) => x.id === editingId) || null">Send to your crew</button>

        <SharedRoutes @open="openShared" />

        <div v-if="saved.length" class="saved">
          <div class="savedhead">
            <h3>Saved routes</h3>
            <label class="climbf small">
              <span>Climb</span>
              <select v-model="climbFilter" aria-label="Filter saved routes by climb">
                <option value="any">Any</option>
                <option value="25">Under 25 m</option>
                <option value="50">Under 50 m</option>
                <option value="100">Under 100 m</option>
              </select>
            </label>
          </div>
          <p v-if="!shownSaved.length" class="small muted">No saved routes climb that little. Routes saved before climbs were measured don't show here: open one and save it again.</p>
          <ul class="rows">
            <li v-for="r in shownSaved" :key="r.id" class="row">
              <button class="open" type="button" @click="openSaved(r)">
                <strong>{{ r.name }}</strong>
                <span class="small muted">{{ MODE_LABEL[r.mode] }}, {{ km(r.distanceM) }} km<template v-if="r.climbM != null">, {{ r.climbM }} m up</template></span>
              </button>
              <span class="rowbtns">
                <button class="del" type="button" :aria-label="`Send ${r.name}`" @click="sending = r">Send</button>
                <button class="del" type="button" :aria-label="`Delete ${r.name}`" @click="removeSaved(r)">Delete</button>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div class="tools">
        <button class="btn quiet small" type="button" :disabled="!history.length" @click="undo">Undo</button>
        <button class="btn quiet small" type="button" :disabled="!waypoints.length" @click="clearAll">Clear</button>
        <label v-if="canSnap()" class="toggle">
          <input v-model="follow" type="checkbox" />
          <span>Follow paths</span>
        </label>
        <label class="toggle" :class="{ first: !canSnap() }">
          <input v-model="closed" type="checkbox" />
          <span>Close the loop</span>
        </label>
      </div>
      <button class="btn block go" type="button" :disabled="plan.line.length < 2" @click="runIt">Run this route</button>
    </section>
    <SendRouteSheet v-if="sending" :route="sending" @close="sending = null" @sent="loadSaved" />
  </div>
</template>

<style scoped>
.plan { position: relative; height: 100dvh; overflow: hidden; }
.maparea { position: absolute; inset: 0; }
.maparea > :first-child { position: absolute; inset: 0; }
.back {
  position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 12px; z-index: 2;
  width: 44px; height: 44px; border-radius: 50%; background: var(--card); color: var(--ink);
  display: grid; place-items: center; box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.maphint {
  position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 64px; right: 12px; z-index: 2;
  background: var(--card); border-radius: 12px; padding: 10px 14px; font-weight: 650; font-size: 0.95rem;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.sheet {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 3;
  background: var(--card); border-radius: 18px 18px 0 0; padding: 6px var(--pad) calc(14px + env(safe-area-inset-bottom));
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
.more { color: var(--you-ink); font-weight: 700; }
.status { margin: 0; padding: 8px 12px; border-radius: 10px; background: var(--good-bg); color: var(--good-ink); }
.status.warn { background: var(--notice-bg); color: var(--notice-ink); }
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
.tools { display: flex; gap: 8px 14px; align-items: center; flex-wrap: wrap; }
.status.finding { background: var(--soft); color: var(--ink-60); }
.savedhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.savedhead h3 { margin: 0; }
.climbf { display: inline-flex; align-items: center; gap: 6px; font-weight: 650; }
.rowbtns { display: inline-flex; gap: 6px; }
.climbf select { font: inherit; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--ink); }
.toggle { display: inline-flex; align-items: center; gap: 8px; font-weight: 650; font-size: 0.95rem; min-height: 44px; cursor: pointer; }
.toggle input { width: 22px; height: 22px; accent-color: var(--you); }
.go { min-height: 56px; font-size: 1.1rem; }

/* Waypoint markers: a small dot with a thumb-sized hit area */
:deep(.wp) { width: 44px; height: 44px; border: 0; padding: 0; background: none; display: grid; place-items: center; cursor: grab; touch-action: none; }
:deep(.wp span) { width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 3px solid #16302A; box-sizing: border-box; }
:deep(.wp.start span) { width: 22px; height: 22px; background: #2E55E6; border-color: #fff; box-shadow: 0 0 0 2px #2E55E6; }
</style>
