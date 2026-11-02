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
  if (failed) throw failed

  const map = new Map3DElement({
    ...cameraOf(start),
    mode: 'SATELLITE',
    defaultUIHidden: true,
    gestureHandling: 'COOPERATIVE',
  })
  map.style.width = '100%'
  map.style.height = '100%'
  el.append(map)

  const trail = new Polyline3DElement({
    strokeColor: colour,
    outerColor: '#FFFFFF',
    strokeWidth: 9,
    outerWidth: 0.35,
    altitudeMode: 'CLAMP_TO_GROUND',
    drawsOccludedSegments: true,
  })
  let hexEls = []
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
      if (points.length < 2) { trail.remove(); return }
      trail.path = points.map((p) => ({ lat: p.lat, lng: p.lng }))
      if (!trail.isConnected) map.append(trail)
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
