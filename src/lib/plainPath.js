// A plain address like /app/notifications (from a push notification, or a
// shared link) opens that screen: the app's own addresses live after the #.
// Imported first in main.js, so it runs before the router reads the address.
const base = import.meta.env.BASE_URL
const rest = location.pathname.startsWith(base) ? location.pathname.slice(base.length - 1) : ''
if (!location.hash && /^\/(app|try|privacy)(\/|$)/.test(rest)) history.replaceState(null, '', base + '#' + rest + location.search)
