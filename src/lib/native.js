// Running as the iPhone or Android app (Capacitor) rather than in a browser. In the app
// a few things go through native plugins instead of the browser: background
// GPS (recorder.js), sign-in in a secure sheet (auth.js, spotify.js), speech
// recognition (audio/listen.js) and keeping the screen awake. The plugins are
// loaded only inside the app, so the website never downloads them.
// docs/IOS.md and docs/ANDROID.md have the build steps.

/** The app's id, also its own link scheme (au.net.mcalister.foothold://...). */
export const APP_ID = 'au.net.mcalister.foothold'

/** True inside the iPhone (or Android) app. */
export const isNativeApp = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

/** True inside the Android app. */
export const isAndroidApp = () => isNativeApp() && window.Capacitor?.getPlatform?.() === 'android'

/**
 * Android 13 and later only shows the "Foothold is recording" notification
 * (which keeps GPS going with the screen off) once you allow notifications.
 * Asks once, before the first recording. Never throws.
 */
export async function allowRecordingNotice() {
  if (!isAndroidApp()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.checkPermissions()
    if (display === 'prompt' || display === 'prompt-with-rationale') await LocalNotifications.requestPermissions()
  } catch { /* plugin missing or refused: GPS still records */ }
}

/** The website's address, for links people share (the app's own address isn't a web link). */
export const webOrigin = () => {
  const server = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  return isNativeApp() && /^https:/.test(server) ? server : location.origin
}

/** One of the app's own links, e.g. appLink('spotify-callback'). */
export const appLink = (path) => `${APP_ID}://${path}`

/**
 * In the app the screens are bundled, so a relative /api/... request would go
 * nowhere. Send those to the Foothold server the build points at instead.
 * Called once from main.js; does nothing on the website.
 */
export function routeApiToServer(server = import.meta.env.VITE_API_URL || '') {
  const base = String(server).replace(/\/$/, '')
  if (!isNativeApp() || !/^https:/.test(base) || window.__fhApiRouted) return
  window.__fhApiRouted = true
  const prefix = (import.meta.env.BASE_URL || '/') + 'api/'
  const real = window.fetch.bind(window)
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith(prefix)) input = base + '/api/' + input.slice(prefix.length)
    return real(input, init)
  }
}

const linkHandlers = new Set()
let listening = false

/**
 * Call fn(url) whenever the app is opened by one of its own links (a sign-in
 * coming back from the secure sheet). Returns a function that stops it.
 */
export function onAppLink(fn) {
  linkHandlers.add(fn)
  if (!listening && isNativeApp()) {
    listening = true
    import('@capacitor/app').then(({ App }) => App.addListener('appUrlOpen', ({ url }) => {
      for (const h of linkHandlers) { try { h(url) } catch (e) { console.warn('app link', e) } }
    })).catch((e) => console.warn('app links unavailable', e))
  }
  return () => linkHandlers.delete(fn)
}

/** Open a web page in the secure in-app browser sheet (sign-ins). */
export async function openSheet(url) {
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url, presentationStyle: 'popover' })
}

/** Close the sheet once a sign-in has come back. */
export async function closeSheet() {
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.close()
  } catch { /* already closed */ }
}

/** Keep the screen on during a run (true) or let it sleep again (false). */
export async function keepScreenOn(on) {
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake')
    await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep())
    return true
  } catch { return false }
}
