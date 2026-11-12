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
  offline: false, // started without the server: showing the last known player
  bootError: null, // couldn't start at all (offline on the very first open)
})

// The last player the server sent, so the app still opens offline (a run
// can be recorded and saved once back online). Only on this phone.
const ME_KEY = 'fh-me'
const keepMe = (user) => { try { localStorage.setItem(ME_KEY, JSON.stringify(user)) } catch { /* storage full */ } }
const lastMe = () => { try { return JSON.parse(localStorage.getItem(ME_KEY) || 'null') } catch { return null } }

let toastTimer = 0
export function toast(text, ms = 3200) {
  store.toast = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { store.toast = null }, ms)
}

export async function boot() {
  store.bootError = null
  let user
  try {
    user = (await api.me()).user
    keepMe(user)
    store.offline = false
  } catch (e) {
    user = lastMe()
    if (!user) { store.bootError = navigator.onLine === false ? "You're offline, and Foothold needs a connection the first time it opens." : e.message; return }
    store.offline = true
    toast("You're offline. You can still record, and it saves when you're back online.", 6000)
  }
  store.user = user
  store.mode = user.mode || 'run'
  const here = user.homeCentre || null
  store.centre = here || SYDNEY
  store.ready = true
  locate().catch(() => {})
  await refresh().catch(() => {}) // offline: the last known numbers stay
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
  keepMe(user)
  store.offline = false
  store.stats = stats
  store.unread = notes.items.filter((n) => !n.read).length
}

export async function setMode(mode) {
  store.mode = mode
  await api.updateMe({ mode })
  await refresh()
}
