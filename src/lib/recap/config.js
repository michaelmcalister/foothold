// Finds the Google Maps browser key for run recaps: from the Foothold server's
// /api/config when the app is served by it, else from the build (VITE_GOOGLE_MAPS_KEY).
// No key means recaps use the MapLibre street map instead.
let cached

export function mapsKey() {
  if (!cached) {
    cached = (async () => {
      try {
        const r = await fetch(import.meta.env.BASE_URL + 'api/config', { signal: AbortSignal.timeout(4000) })
        if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
          const key = (await r.json())?.maps?.googleKey
          if (key) return key
        }
      } catch { /* no server here (GitHub Pages) */ }
      return import.meta.env.VITE_GOOGLE_MAPS_KEY || null
    })()
  }
  return cached
}
