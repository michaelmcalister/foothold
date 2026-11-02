// Hands a planned route from the planner to the record screen, kept for this tab so a reload doesn't lose it.
import { reactive } from 'vue'

const KEY = 'fh-planned-route'

function read() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    return v && Array.isArray(v.ring) ? v : null
  } catch { return null }
}

export const planned = reactive({ route: read() })

// route: { name, mode, ring: [[lng, lat], ...] }
export function setPlanned(route) {
  planned.route = route ? { name: route.name || 'Planned route', mode: route.mode || 'run', ring: route.ring } : null
  try {
    if (planned.route) sessionStorage.setItem(KEY, JSON.stringify(planned.route))
    else sessionStorage.removeItem(KEY)
  } catch { /* storage blocked: the route still works until reload */ }
}
