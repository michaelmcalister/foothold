// Recap driver for Google's photorealistic 3D map (Maps JavaScript API,
// maps3d library). Loads Google's script with the browser key, then flies the
// camera, draws the trail and the hexes taken. The track is drawn on the
// phone; Google only loads the 3D imagery for the area the camera looks at.

let loading = null

// Google's script loader, trimmed: one script tag, resolves once importLibrary exists
function loadScript(key) {
  if (window.google?.maps?.importLibrary) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const cb = '__footholdMaps' + Date.now()
    window[cb] = () => { delete window[cb]; resolve() }
    const s = document.createElement('script')
    const q = new URLSearchParams({ key, v: 'weekly', loading: 'async', callback: cb, language: 'en-AU', region: 'AU' })
    s.src = `https://maps.googleapis.com/maps/api/js?${q}`
    s.async = true
    s.onerror = () => { loading = null; reject(new Error('Google Maps did not load')) }
    document.head.append(s)
  })
  return loading
}

// Google tells us about a bad or blocked key through this global hook
function watchAuthFailure(onFail) {
  window.gm_authFailure = () => onFail(new Error('Google Maps key was refused'))
}

const centreOf = (c) => ({ lat: c.lat, lng: c.lng, altitude: c.alt || 0 })
const cameraOf = (c) => ({ center: centreOf(c), range: c.range, tilt: c.tilt, heading: c.heading })

export async function createGoogleDriver(el, { key, start, colour = '#2E55E6' }) {
  let failed = null
  watchAuthFailure((e) => { failed = e })
  await loadScript(key)
  const lib = await google.maps.importLibrary('maps3d')
  const { Map3DElement, Polyline3DElement, Polygon3DElement } = lib
  const Marker3D = lib.Marker3DElement
  if (failed) throw failed

  const TRAIL_UP_M = 2 // metres above the surface under it
  const map = new Map3DElement({
    ...cameraOf(start),
    mode: 'SATELLITE',
    defaultUIHidden: true,
    gestureHandling: 'COOPERATIVE',
  })
  map.style.width = '100%'
  map.style.height = '100%'
  el.append(map)

  // The trail: a bold line with a white edge, over a soft dark shadow so it
  // stands out on bright satellite ground as well as dark trees and water.
  // It sits a little above the 3D surface (RELATIVE_TO_MESH), so it runs
  // along bridge decks and paths instead of the ground hidden under them.
  const shadow = new Polyline3DElement({
    strokeColor: 'rgba(0, 0, 0, 0.4)',
    strokeWidth: 30,
    altitudeMode: 'RELATIVE_TO_MESH',
    drawsOccludedSegments: true,
  })
  const trail = new Polyline3DElement({
    strokeColor: colour,
    outerColor: '#FFFFFF',
    strokeWidth: 20,
    outerWidth: 0.45,
    altitudeMode: 'RELATIVE_TO_MESH',
    drawsOccludedSegments: true,
  })
  let hexEls = []
  let ghostEl = null
  let lastGhost = 0
  let lastTrail = 0

  // Resolve when Google says the move finished, or a little after it should have
  function untilAnimationEnd(ms) {
    return new Promise((resolve) => {
      const done = () => { clearTimeout(t); map.removeEventListener('gmp-animationend', done); resolve() }
      const t = setTimeout(done, ms + 1500)
      map.addEventListener('gmp-animationend', done)
    })
  }

  return {
    kind: 'google',
    get failed() { return failed },
    // Resolves once Google has finished drawing the opening view (or after a
    // few seconds regardless), so the recap starts on a picture, not a blank
    ready(timeoutMs = 9000) {
      return new Promise((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          clearTimeout(timer)
          map.removeEventListener('gmp-steadychange', onSteady)
          resolve()
        }
        const onSteady = (e) => { if (e.isSteady) finish() }
        const timer = setTimeout(finish, timeoutMs)
        map.addEventListener('gmp-steadychange', onSteady)
      })
    },
    setCamera(c) {
      map.center = centreOf(c)
      map.range = c.range
      map.tilt = c.tilt
      map.heading = c.heading
    },
    flyTo(c, ms) {
      map.stopCameraAnimation?.()
      const end = untilAnimationEnd(ms)
      map.flyCameraTo({ endCamera: cameraOf(c), durationMillis: ms })
      return end
    },
    orbit(c, ms) {
      map.stopCameraAnimation?.()
      const end = untilAnimationEnd(ms)
      map.flyCameraAround({ camera: cameraOf(c), durationMillis: ms, repeatCount: 1 })
      return end
    },
    stop() { map.stopCameraAnimation?.() },
    setTrail(points, force = false) {
      // Redrawing a long line every frame is wasteful; a few times a second looks the same
      const now = performance.now()
      if (!force && now - lastTrail < 120) return
      lastTrail = now
      // Google refuses an empty path, so take the line off the map until there's something to draw
      if (points.length < 2) { shadow.remove(); trail.remove(); return }
      const path = points.map((p) => ({ lat: p.lat, lng: p.lng, altitude: TRAIL_UP_M }))
      shadow.path = path
      trail.path = path
      if (!shadow.isConnected) map.append(shadow)
      if (!trail.isConnected) map.append(trail) // after the shadow, so it sits on top
    },
    // The ghost you raced, as a marker beside the trail (null hides it)
    setGhost(p) {
      if (!Marker3D) return
      const now = performance.now()
      if (p && now - lastGhost < 120) return
      lastGhost = now
      if (!p) { ghostEl?.remove(); return }
      if (!ghostEl) ghostEl = new Marker3D({ altitudeMode: 'CLAMP_TO_GROUND', label: 'Ghost' })
      ghostEl.position = { lat: p.lat, lng: p.lng }
      if (!ghostEl.isConnected) map.append(ghostEl)
    },
    setHexes(rings) {
      for (const h of hexEls) h.remove()
      hexEls = rings.slice(0, 400).map((ring) => {
        const p = new Polygon3DElement({
          fillColor: colour + '59',
          strokeColor: colour + 'CC',
          strokeWidth: 2,
          altitudeMode: 'CLAMP_TO_GROUND',
          drawsOccludedSegments: false,
        })
        p.path = ring.map(([lng, lat]) => ({ lat, lng }))
        map.append(p)
        return p
      })
    },
    destroy() {
      map.stopCameraAnimation?.()
      map.remove()
      if (window.gm_authFailure) delete window.gm_authFailure
    },
  }
}
