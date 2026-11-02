// Daily FormTrack readiness snapshots kept on this device, because the server summary only has today's score.
import { toISO } from './coach/dates.js'

const KEY = 'fh-readiness'
const KEEP_DAYS = 200

/** { 'YYYY-MM-DD': score } saved so far on this device */
export function readinessHistory() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/** Keep today's readiness from a FormTrack summary ({ readiness }) */
export function recordReadiness(summary, now = Date.now()) {
  const score = summary?.readiness
  if (!Number.isFinite(score)) return
  try {
    const all = { ...readinessHistory(), [toISO(now)]: Math.round(score) }
    const days = Object.keys(all).sort().slice(-KEEP_DAYS)
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(days.map((d) => [d, all[d]]))))
  } catch { /* storage can be off; the trend just skips readiness */ }
}

/** Forget them all (on unlinking FormTrack or deleting data) */
export function clearReadiness() {
  try { localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
}
