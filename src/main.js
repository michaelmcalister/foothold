import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router.js'
import { initAuth } from './lib/auth.js'
import { startTheme, markInApp } from './lib/theme.js'

// Night mode: index.html already set the look before first paint; this keeps
// it in step with the setting and the phone. Night colours only show in the app.
startTheme()
router.afterEach((to) => markInApp(to.path.startsWith('/app')))

// Finish any Auth0 sign-in before the routes run (no-op in the practice map)
// The router read the address when it loaded; sign-in may have changed it since
// (back from Auth0 to #/app), so start the routes from where we are now.
initAuth().finally(async () => {
  await router.replace(location.hash.slice(1) || '/').catch(() => {})
  createApp(App).use(router).mount('#app')
})

// Offline support and home-screen install (production builds only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}))
}
