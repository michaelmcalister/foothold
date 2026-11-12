// Usage analytics (PostHog), so we can see what people use and whether they
// come back. Off unless /api/config sends a posthogKey (POSTHOG_KEY in
// wrangler.toml), never from a developer's own machine, never in practice
// mode, and players can switch it off in Settings. What's sent: the screen
// as a path with ids taken out ("/app/activity/:id"), a few named moments
// ("run_saved") with small numbers, and the random account id. Never places,
// tracks, names, emails, what's typed or what's on screen: no autocapture,
// no session replay, no heatmaps. Every event carries app: 'foothold', as
// the PostHog project is shared with FormTrack.
import { scrubText } from './monitoring.js'

const OFF_KEY = 'fh-analytics-off'
let ph = null
let userId = null

/** On unless switched off on this phone, or the browser asks not to be tracked. */
export function analyticsOn() {
  try { if (localStorage.getItem(OFF_KEY) === '1') return false } catch { /* storage off */ }
  return !(typeof navigator !== 'undefined' && (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1'))
}

/** Settings: off stops sending at once and forgets the analytics id on this phone. */
export function setAnalytics(on) {
  try { if (on) localStorage.removeItem(OFF_KEY); else localStorage.setItem(OFF_KEY, '1') } catch { /* storage off */ }
  if (!ph) return
  if (on) ph.opt_in_capturing()
  else { ph.opt_out_capturing(); ph.reset() }
}

// a path segment that is an id or a code (uuids, invite and group codes, mission ids stay)
const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const idLike = (s) => IS_UUID.test(s) || /^device-/.test(s) || /^[A-Za-z0-9_-]{20,}$/.test(s) || (/^[A-Z0-9]{6}$/.test(s) && /\d/.test(s))

/** A screen's path with ids and query strings taken out. Pure. */
export function cleanPath(p) {
  const path = String(p || '/').split(/[?#]/)[0]
  return path.split('/').map((s) => (idLike(s) ? ':id' : s)).join('/') || '/'
}

const URL_PROPS = ['$current_url', '$pathname', '$referrer', '$initial_referrer', '$initial_current_url', '$prev_pageview_pathname', '$initial_pathname']

/** Every event's properties, cleaned (PostHog calls this on each one). Pure. */
export function cleanProps(props) {
  if (!props) return props
  for (const k of Object.keys(props)) {
    const v = props[k]
    if (typeof v !== 'string') continue
    if (URL_PROPS.includes(k) && v !== '$direct') {
      let u = null
      try { u = new URL(v) } catch { /* a bare path */ }
      // the app's screens live after the #, so the hash is the path that matters
      props[k] = u ? u.origin + cleanPath(u.hash ? u.hash.slice(1) : u.pathname) : cleanPath(v)
    } else props[k] = scrubText(v, 200)
  }
  return props
}

/** Only small, safe values: numbers, true or false, and short words. Pure. */
export function safeProps(props = {}) {
  const out = {}
  for (const [k, v] of Object.entries(props)) {
    if (/lat|lng|lon|place|suburb|street|name|email|text/i.test(k)) continue
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.round(v * 100) / 100
    else if (typeof v === 'boolean') out[k] = v
    else if (typeof v === 'string' && v.length <= 40 && !/\s{2}|@/.test(v)) out[k] = v
  }
  return out
}

/** Call once after the app mounts, with /api/config. */
export async function initAnalytics(router, conf = {}, { practice = false } = {}) {
  if (typeof window === 'undefined' || !conf?.posthogKey || practice) return
  if (/^(localhost|127\.|\[::1\]|.*\.localhost$)/.test(location.hostname)) return
  try {
    const { default: posthog } = await import('posthog-js')
    posthog.init(conf.posthogKey, {
      api_host: conf.posthogHost || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      persistence: 'localStorage', // no cookies
      autocapture: false,
      capture_pageview: false, // sent below, as a clean path
      capture_pageleave: true,
      capture_exceptions: false, // Sentry has errors
      capture_dead_clicks: false,
      enable_heatmaps: false,
      disable_session_recording: true,
      disable_surveys: true,
      enable_recording_console_log: false,
      mask_all_text: true,
      mask_all_element_attributes: true,
      disable_external_dependency_loading: true, // nothing loaded from PostHog's servers
      ip: false,
      sanitize_properties: (p) => cleanProps(p),
      opt_out_capturing_by_default: !analyticsOn(),
    })
    posthog.register({ app: 'foothold' })
    ph = posthog
    if (!analyticsOn()) posthog.opt_out_capturing()
    if (userId) posthog.identify(userId)
    const view = (path) => ph?.capture('$pageview', { $current_url: location.origin + '/#' + cleanPath(path) })
    view(router.currentRoute.value.path)
    router.afterEach((to, from) => { if (to.path !== from.path) view(to.path) })
  } catch { /* analytics never stops the app */ }
}

/** Signed in (the random account id only), or signed out (null). */
export function identify(id) {
  userId = id ? String(id) : null
  if (!ph) return
  if (userId) ph.identify(userId)
  else ph.reset()
}

/** A named moment worth counting ("run_saved"). Never places, names or free text. */
export function track(event, props = {}) {
  ph?.capture(event, safeProps(props))
}
