// App-wide state: the player, their current map mode, last known
// location and unread notifications. Screens read from here and call
// refresh() after anything that changes the game.

import { reactive } from 'vue'
import { api } from './api/index.js'
import { whereAmI } from './recorder.js'

export const SYDNEY = { lat: -33.9115, lng: 151.1555 } // Marrickville, a fallback when location is off

export const store = reactive({
  ready: false,
  user: null,
  mode: 'run',
  stats: null,
  unread: 0,
  centre: null,
  located: false,
  toast: null,
})

let toastTimer = 0
export function toast(text, ms = 3200) {
  store.toast = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { store.toast = null }, ms)
}

export async function boot() {
  const { user } = await api.me()
  store.user = user
  store.mode = user.mode || 'run'
  const here = user.homeCentre || null
  store.centre = here || SYDNEY
  store.ready = true
  locate()
  await refresh()
}

export async function locate() {
  const p = await whereAmI()
  if (p) {
    store.centre = p
    store.located = true
    if (!store.user.homeCentre) api.updateMe({ homeCentre: p })
  }
  await api.ensureWorld(store.centre)
  return p
}

export async function refresh() {
  const [{ user }, stats, notes] = await Promise.all([api.me(), api.stats({ mode: store.mode }), api.notifications()])
  store.user = user
  store.stats = stats
  store.unread = notes.items.filter((n) => !n.read).length
}

export async function setMode(mode) {
  store.mode = mode
  await api.updateMe({ mode })
  await refresh()
}
