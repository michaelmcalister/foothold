// Small helpers every API module shares: JSON replies, errors that become
// 4xx replies, number checks and the activity modes.
import { HEX_KM2, MODES } from '../src/lib/engine/index.js'

export const DAY = 86400000
export const WEEK = 7 * DAY
export const MAX_POINTS = 50_000
export const MAX_BODY = 12_000_000 // bytes; 50k points with heart rate and cadence fit comfortably
export const SOURCES = ['phone', 'watch', 'import']
export const FEEDBACK_KINDS = ['bug', 'idea', 'other']
export const VERB = { run: 'in a run', walk: 'on a walk', ride: 'on a ride' }

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } })
export const err = (error, status = 400, code) => json(code ? { error, code } : { error }, status)
// Throw from anywhere in a route to send a 4xx with a plain English message
export const bad = (message, status = 400, code) => { throw Object.assign(new Error(message), { status, code }) }

export const km2 = (hexes) => Math.round(hexes * HEX_KM2 * 100) / 100
export const isNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi
export const modeOf = (v, fallback = 'run') => {
  if (v == null || v === '') return fallback
  if (!MODES.includes(v)) bad('Mode must be run, walk or ride.')
  return v
}
