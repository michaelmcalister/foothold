// Push notifications on this phone or browser (worker/push.js sends them).
// In a browser: the Push API with the server's VAPID key, delivered to
// public/sw.js. In the iPhone and Android apps: Firebase Cloud Messaging
// (@capacitor-firebase/messaging), which needs the Firebase files added to
// the native projects (docs/PUSH.md); until then it quietly says no.
// Nothing here runs unless the player switches push on, or already has.
import { track } from './analytics.js'
import { api } from './api/index.js'
import { isNativeApp, isIOSApp } from './native.js'

const KEY = 'fh-push' // 'on' once this device subscribed

const b64uToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))
const mark = (v) => { try { v ? localStorage.setItem(KEY, 'on') : localStorage.removeItem(KEY) } catch { /* private mode */ } }
export const pushWasOn = () => { try { return localStorage.getItem(KEY) === 'on' } catch { return false } }

/** Can this device get pushes at all, given what the server offers? */
export function pushPossible(config) {
  if (!config) return false
  if (isNativeApp()) return !!config.app
  return !!config.web && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function nativeMessaging() {
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging')
  return FirebaseMessaging
}

/** Ask, subscribe and tell the server. Returns 'on', 'denied' or 'unavailable'. */
export async function enablePush(config) {
  if (!pushPossible(config)) return 'unavailable'
  try {
    if (isNativeApp()) {
      const FM = await nativeMessaging()
      const { receive } = await FM.requestPermissions()
      if (receive !== 'granted') return 'denied'
      if (!isIOSApp()) await FM.createChannel({ id: 'foothold', name: 'Foothold', description: 'Rivals, your ground and stories', importance: 3 }).catch(() => {})
      const { token } = await FM.getToken()
      if (!token) return 'unavailable'
      await api.pushSubscribe({ kind: 'fcm', token, platform: isIOSApp() ? 'ios' : 'android' })
      listenForTaps(FM)
    } else {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return 'denied'
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(config.web) }))
      const j = sub.toJSON()
      await api.pushSubscribe({ kind: 'web', endpoint: j.endpoint, keys: j.keys })
    }
    mark(true)
    track('push_on', { native: isNativeApp() })
    return 'on'
  } catch (e) {
    console.warn('push', e?.message)
    return 'unavailable'
  }
}

/** Stop pushes to this device. */
export async function disablePush() {
  mark(false)
  try {
    if (isNativeApp()) {
      const FM = await nativeMessaging()
      const { token } = await FM.getToken().catch(() => ({}))
      await api.pushUnsubscribe(token ? { token } : {})
      await FM.deleteToken().catch(() => {})
    } else {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) { await api.pushUnsubscribe({ endpoint: sub.endpoint }); await sub.unsubscribe() }
    }
  } catch { /* already off */ }
}

let listening = false
function listenForTaps(FM) {
  if (listening) return
  listening = true
  FM.addListener('notificationActionPerformed', (e) => {
    const url = e?.notification?.data?.url
    if (typeof url === 'string' && url.startsWith('/app')) window.dispatchEvent(new CustomEvent('fh-open', { detail: url }))
  })
}

/** On start, keep an existing subscription fresh (tokens change). Never asks. */
export async function refreshPush(config) {
  if (!pushWasOn() || !pushPossible(config)) return
  try {
    if (isNativeApp()) {
      const FM = await nativeMessaging()
      if ((await FM.checkPermissions()).receive !== 'granted') return
      const { token } = await FM.getToken()
      if (token) await api.pushSubscribe({ kind: 'fcm', token, platform: isIOSApp() ? 'ios' : 'android' })
      listenForTaps(FM)
    } else if (Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) { const j = sub.toJSON(); await api.pushSubscribe({ kind: 'web', endpoint: j.endpoint, keys: j.keys }) }
    }
  } catch { /* try again next start */ }
}
