// Error reports to Sentry, so we hear when the app breaks on someone's
// phone. Tiny on purpose (no SDK): it sends the error's message, its stack
// (file names and line numbers only) and the screen's route name. Never
// locations, names, emails, run data or what was on screen. Off unless
// /api/config sends a sentryDsn (SENTRY_DSN in wrangler.toml), and never
// from a developer's own machine. Shared by the worker (worker/sentry.js).

// Offline blips and old browser noise we can't fix
const IGNORE = [/Failed to fetch/i, /NetworkError/i, /Load failed/i, /ResizeObserver loop/i, /AbortError/i, /The operation was aborted/i]
const MAX_PER_SESSION = 20

/** Parse a DSN into the address and key events go to, or null. */
export function parseDsn(dsn) {
  const m = /^https:\/\/([a-f0-9]+)@([^/]+)\/(\d+)$/.exec(String(dsn || '').trim())
  if (!m) return null
  return { key: m[1], url: `https://${m[2]}/api/${m[3]}/envelope/?sentry_key=${m[1]}&sentry_version=7` }
}

// Anything that looks like a coordinate pair, an email or a long token goes
const SCRUB = [
  [/-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}/g, '[place]'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]'],
  [/\b(eyJ[\w-]+\.[\w-]+\.[\w-]+|[A-Za-z0-9_-]{32,})\b/g, '[token]'],
]
export function scrubText(s, max = 500) {
  let out = String(s ?? '')
  for (const [re, to] of SCRUB) out = out.replace(re, to)
  return out.slice(0, max)
}

/** Stack frames as Sentry wants them: file (no query string), function and line. */
export function framesOf(stack) {
  const frames = []
  for (const l of String(stack || '').split('\n').slice(0, 30)) {
    const m = /(?:at\s+(?:(.*?)\s+\()?|([^@]*)@)(.*?):(\d+):(\d+)\)?\s*$/.exec(l.trim())
    if (!m) continue
    frames.push({ function: (m[1] || m[2] || '?').slice(0, 80), filename: m[3].replace(/[?#].*$/, '').replace(/^.*\/assets\//, '/assets/'), lineno: Number(m[4]), colno: Number(m[5]) })
  }
  return frames.reverse() // Sentry wants the call that failed last
}

/** The Sentry event for an error, already scrubbed. */
export function eventFor(error, { where = '', release = '', platform = 'javascript', tags = {} } = {}) {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error')
  return {
    event_id: (globalThis.crypto?.randomUUID?.() || String(Math.random()).slice(2) + Date.now()).replace(/-/g, '').slice(0, 32).padEnd(32, '0'),
    timestamp: Date.now() / 1000,
    platform,
    level: 'error',
    release: release || undefined,
    environment: 'production',
    tags: { where: scrubText(where, 80), ...tags },
    exception: { values: [{ type: scrubText(e.name, 60), value: scrubText(e.message), stacktrace: { frames: framesOf(e.stack) } }] },
  }
}

/** POST one event as a Sentry envelope. Never throws. */
export async function send(dsn, event, fetcher = globalThis.fetch) {
  const d = parseDsn(dsn)
  if (!d || !fetcher) return false
  const body = `${JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: 'event' })}\n${JSON.stringify(event)}`
  try {
    const r = await fetcher(d.url, { method: 'POST', body, headers: { 'content-type': 'application/x-sentry-envelope' }, keepalive: true })
    return r.ok
  } catch {
    return false
  }
}

let dsn = null
let sent = 0
let routeName = () => ''
const seen = new Set()

/** Report an error from the app (also used by the global handlers). */
export function report(error, where) {
  if (!dsn || sent >= MAX_PER_SESSION) return
  const msg = String(error?.message || error || '')
  if (IGNORE.some((re) => re.test(msg))) return
  const key = msg + (error?.stack || '').slice(0, 200)
  if (seen.has(key)) return // once per session is plenty
  seen.add(key)
  sent++
  send(dsn, eventFor(error, { where: where || routeName(), release: import.meta.env?.VITE_RELEASE || '' }))
}

/** Call once after the app mounts, with the result of /api/config. */
export function initMonitoring(app, router, conf = {}) {
  if (typeof window === 'undefined' || !conf?.sentryDsn) return
  if (/^(localhost|127\.|\[::1\]|.*\.localhost$)/.test(location.hostname)) return
  dsn = conf.sentryDsn
  routeName = () => String(router?.currentRoute?.value?.name || '')
  app.config.errorHandler = (err, _vm, info) => { report(err, `${routeName()} ${info || ''}`.trim()); console.error(err) }
  window.addEventListener('error', (e) => report(e.error || e.message))
  window.addEventListener('unhandledrejection', (e) => report(e.reason))
}
