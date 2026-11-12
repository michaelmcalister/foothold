import './lib/plainPath.js' // first: before the router reads the address
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router.js'
import { initAuth, serverConfig } from './lib/auth.js'
import { initMonitoring } from './lib/monitoring.js'
import { initAnalytics } from './lib/analytics.js'
import { isLocal } from './lib/api/index.js'
import { startTheme, markInApp } from './lib/theme.js'
import { isNativeApp, routeApiToServer } from './lib/native.js'

// After a deploy, a page left open asks for screens by their old file names,
// which are gone: load the new version once instead of showing a broken screen
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('fh-reloaded') === location.hash) return // once only
    sessionStorage.setItem('fh-reloaded', location.hash)
  } catch { /* storage off: reload anyway */ }
  e.preventDefault()
  location.reload()
})

// In the iPhone app the screens are bundled: send /api calls to the server
routeApiToServer()

// Night mode: index.html already set the look before first paint; this keeps
// it in step with the setting and the phone. Night colours only show in the app.
startTheme()
router.afterEach((to) => markInApp(to.path.startsWith('/app')))

// Finish any Auth0 sign-in before the routes run (no-op in the practice map)
// The router read the address when it loaded; sign-in may have changed it since
// (back from Auth0 to #/app), so start the routes from where we are now.
initAuth().finally(async () => {
  await router.replace(location.hash.slice(1) || '/').catch(() => {})
  const app = createApp(App).use(router)
  initMonitoring(app, router, serverConfig) // error reports, when the server has a Sentry key
  initAnalytics(router, serverConfig, { practice: isLocal }) // usage analytics, when the server has a PostHog key
  app.mount('#app')
})

// Offline support and home-screen install (production builds only)
// (not in the iPhone app, which has its screens built in)
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNativeApp()) {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => reg.active?.postMessage('precache')) // keep every screen for offline
    .catch(() => {}))
}
