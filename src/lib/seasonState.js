// The story season as the app last heard it (worker/storySeason.js), shared
// by the map's season chip and its card so it's fetched once. Refreshed
// after ten minutes.
import { ref } from 'vue'
import { api } from './api/index.js'

export const season = ref(null)
let at = 0
let pending = null

export function loadSeason() {
  if (pending) return pending
  if (season.value && Date.now() - at < 600000) return Promise.resolve(season.value)
  pending = api.storySeason()
    .then((s) => { season.value = s; at = Date.now(); return s })
    .catch(() => season.value)
    .finally(() => { pending = null })
  return pending
}
