// Service worker: keeps the app shell and map tiles available offline so
// the map opens on a run with patchy signal. API calls always go to the network.
const SHELL = 'foothold-shell-v1'
const TILES = 'foothold-tiles-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, TILES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.pathname.includes('/api/')) return

  // Map tiles, styles and fonts: cache first, refresh in the background
  if (url.hostname.endsWith('openfreemap.org')) {
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(e.request)
        const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r }).catch(() => hit)
        return hit || net
      }),
    )
    return
  }

  // App files: network first so updates land, cache as a fallback offline
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r.ok) {
            const copy = r.clone()
            caches.open(SHELL).then((c) => c.put(e.request, copy))
          }
          return r
        })
        .catch(() => caches.match(e.request).then((m) => m || caches.match('./index.html'))),
    )
  }
})

// Push notifications (worker/push.js): show them, and open the right screen when tapped
self.addEventListener('push', (e) => {
  let m = {}
  try { m = e.data ? e.data.json() : {} } catch { m = { body: e.data?.text() } }
  e.waitUntil(self.registration.showNotification(m.title || 'Foothold', {
    body: m.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'foothold',
    renotify: true,
    data: { url: m.url || '/app/notifications' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const path = e.notification.data?.url || '/app/notifications'
  const target = new URL(self.registration.scope).origin + path
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope))
      if (open) return open.focus().then(() => open.navigate(target)).catch(() => self.clients.openWindow(target))
      return self.clients.openWindow(target)
    }),
  )
})
