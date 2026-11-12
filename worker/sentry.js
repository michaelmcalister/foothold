// Server error reports to Sentry (the same tiny sender as the app,
// src/lib/monitoring.js). Only the error's message, stack and which route it
// was: never request bodies, tokens, locations or who asked. Off without
// SENTRY_DSN.
import { eventFor, send } from '../src/lib/monitoring.js'

export function reportError(env, ctx, error, where, fetcher) {
  if (!env?.SENTRY_DSN) return
  const job = send(env.SENTRY_DSN, eventFor(error, { where, platform: 'node', tags: { side: 'worker' } }), fetcher).catch(() => {})
  if (ctx?.waitUntil) ctx.waitUntil(job)
  return job
}
