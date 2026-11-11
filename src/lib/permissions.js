// The first time the app opens, Foothold explains each permission it needs
// (in a friendly way), then asks for it, one at a time: location for the map,
// the microphone for shouting answers in missions, and on Android the
// "Foothold is recording" notice. Only in the iPhone and Android apps (the
// website asks as it goes). PermissionsIntro.vue shows it.
import { isNativeApp, isAndroidApp, allowRecordingNotice } from './native.js'
import { primeMicrophone } from './audio/listen.js'

const SEEN = 'fh-perms-asked'

export const PERMISSIONS = [
  {
    id: 'location',
    icon: '📍',
    title: 'Can we tag along?',
    blurb: 'Foothold draws your run on the map and turns it into territory. No location, no land grab. We only look while you are recording. Promise.',
    tip: 'Choose to allow it while using the app.',
    button: 'Sure, tag along',
  },
  {
    id: 'microphone',
    icon: '🎙️',
    title: 'Shout it out',
    blurb: 'In missions, the characters ask you questions. Yell A, B or C mid stride instead of fumbling with your phone. We only listen right after a question.',
    tip: 'Allow the microphone and speech recognition.',
    button: 'Mic check, one two',
  },
  {
    id: 'notifications',
    icon: '🔔',
    title: 'A tap on the shoulder',
    blurb: 'Android needs a little "Foothold is recording" notice to keep your run going with the screen off. That is it. No spam, no nagging. Cross our hearts.',
    tip: 'Tap Allow.',
    button: 'Fair enough',
    android: true,
  },
]

/** The permissions this phone will be asked for, in order. */
export function permissionsFor({ android = isAndroidApp() } = {}) {
  return PERMISSIONS.filter((p) => !p.android || android)
}

/** True the first time the app opens (never on the website). */
export function shouldExplainPermissions({ native = isNativeApp(), storage = globalThis.localStorage } = {}) {
  if (!native) return false
  try { return !storage?.getItem(SEEN) } catch { return true }
}

export function markPermissionsExplained(storage = globalThis.localStorage) {
  try { storage?.setItem(SEEN, '1') } catch { /* fine: it just shows again next time */ }
}

// Location: the background location plugin only asks when a watcher starts,
// so start one, wait for the answer (or a position), then stop it
async function askLocation(timeoutMs = 20000) {
  const { registerPlugin } = await import('@capacitor/core')
  const BackgroundGeolocation = registerPlugin('BackgroundGeolocation')
  let id = null
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs)
    BackgroundGeolocation.addWatcher({ requestPermissions: true, stale: true, distanceFilter: 50 }, () => { clearTimeout(timer); resolve() })
      .then((w) => { id = w })
      .catch(() => { clearTimeout(timer); resolve() })
  })
  if (id != null) await BackgroundGeolocation.removeWatcher({ id }).catch(() => {})
}

const ASK = {
  location: askLocation,
  microphone: primeMicrophone,
  notifications: allowRecordingNotice,
}

/**
 * Shows the phone's own prompt for one permission. Never throws, and never
 * waits more than timeoutMs: some phones never report back (the iPhone's
 * speech prompt can go quiet), and the welcome must not get stuck.
 */
export async function askPermission(id, ask = ASK, timeoutMs = 12000) {
  let timer
  const waited = new Promise((resolve) => { timer = setTimeout(resolve, timeoutMs) })
  const asked = Promise.resolve().then(() => ask[id]?.()).catch(() => { /* declined or not available: the app asks again when it needs it */ })
  await Promise.race([asked, waited])
  clearTimeout(timer)
}
