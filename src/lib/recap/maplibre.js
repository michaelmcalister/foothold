// Recap driver on the MapLibre street map, used when there's no Google key or
// Google's 3D map can't load. Same moves as the Google driver: tilted camera,
// follow the trail, orbit, overview.
import { Map as MLMap, setWorkerUrl } from 'maplibre-gl'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { zoomForRange } from './plan.js'
setWorkerUrl(mapWorkerUrl)

const STYLE = 'https://tiles.openfreemap.org/styles/positron'
const FALLBACK = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#ECEFE4' } }] }
const empty = { type: 'FeatureCollection', features: [] }

async function loadStyle() {
  try {
    const r = await fetch(STYLE, { signal: AbortSignal.timeout(6000) })
    if (r.ok) return await r.json()
  } catch { /* offline or blocked: plain paper */ }
  return FALLBACK
}

export async function createMapLibreDriver(el, { start, colour = '#2E55E6' }) {
  const style = await loadStyle()
  const view = (c) => ({
    center: [c.lng, c.lat],
    zoom: Math.min(19, zoomForRange(c.range, c.lat, el.clientHeight) - 1), // zoomForRange counts 256 px tiles; MapLibre draws 512 px ones
    bearing: c.heading,
    pitch: Math.min(75, c.tilt),
  })
  const map = new MLMap({ container: el, style, ...view(start), maxPitch: 75, interactive: false, attributionControl: { compact: true } })
  await new Promise((resolve) => map.once('load', resolve))
  map.addSource('hexes', { type: 'geojson', data: empty })
  map.addSource('trail', { type: 'geojson', data: empty })
  map.addSource('runner', { type: 'geojson', data: empty })
  map.addSource('ghost', { type: 'geojson', data: empty })
  map.addLayer({ id: 'hex-fill', type: 'fill', source: 'hexes', paint: { 'fill-color': colour, 'fill-opacity': 0.32 } })
  map.addLayer({ id: 'hex-line', type: 'line', source: 'hexes', paint: { 'line-color': colour, 'line-width': 1.2, 'line-opacity': 0.8 } })
  map.addLayer({ id: 'trail-halo', type: 'line', source: 'trail', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 9 } })
  map.addLayer({ id: 'trail', type: 'line', source: 'trail', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': colour, 'line-width': 5 } })
  map.addLayer({ id: 'ghost', type: 'circle', source: 'ghost', paint: { 'circle-radius': 7, 'circle-color': '#FFFFFF', 'circle-opacity': 0.85, 'circle-stroke-width': 2, 'circle-stroke-color': '#16302A' } })
  map.addLayer({ id: 'runner', type: 'circle', source: 'runner', paint: { 'circle-radius': 7, 'circle-color': colour, 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF' } })

  let raf = 0
  let cancelMove = null
  const stop = () => {
    cancelAnimationFrame(raf)
    map.stop()
    cancelMove?.()
    cancelMove = null
  }

  return {
    kind: 'maplibre',
    // Resolves when the street map has drawn the opening view (or after a few seconds)
    ready(timeoutMs = 6000) {
      if (map.loaded() && map.areTilesLoaded()) return Promise.resolve()
      return new Promise((resolve) => {
        const timer = setTimeout(resolve, timeoutMs)
        map.once('idle', () => { clearTimeout(timer); resolve() })
      })
    },
    setCamera(c) { map.jumpTo(view(c)) },
    flyTo(c, ms) {
      stop()
      return new Promise((resolve) => {
        const t = setTimeout(resolve, ms + 400)
        cancelMove = () => { clearTimeout(t); resolve() }
        map.flyTo({ ...view(c), duration: ms, essential: true })
      })
    },
    orbit(c, ms) {
      stop()
      return new Promise((resolve) => {
        const t0 = performance.now()
        cancelMove = resolve
        const frame = (now) => {
          const f = Math.min(1, Math.max(0, (now - t0) / ms))
          map.jumpTo(view({ ...c, heading: c.heading + 360 * f }))
          if (f < 1) raf = requestAnimationFrame(frame)
          else { cancelMove = null; resolve() }
        }
        raf = requestAnimationFrame(frame)
      })
    },
    stop,
    setTrail(points) {
      map.getSource('trail')?.setData(points.length > 1
        ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) } }
        : empty)
      const last = points[points.length - 1]
      map.getSource('runner')?.setData(last ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [last.lng, last.lat] } } : empty)
    },
    // The ghost you raced, as a pale dot (null hides it)
    setGhost(p) {
      map.getSource('ghost')?.setData(p ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } } : empty)
    },
    setHexes(rings) {
      map.getSource('hexes')?.setData({ type: 'FeatureCollection', features: rings.map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [r] } })) })
    },
    destroy() { stop(); map.remove() },
  }
}
