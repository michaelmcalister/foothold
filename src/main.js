import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router.js'
import { initAuth } from './lib/auth.js'

// Finish any Auth0 sign-in before the routes run (no-op in the practice map)
initAuth().finally(() => createApp(App).use(router).mount('#app'))

// Offline support and home-screen install (production builds only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}))
}
