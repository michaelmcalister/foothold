// AI built plans on the app side: is it switched on, the compact history summary we send (never names, emails, places or tracks),
// the on-device consent choice, and attaching the coach's words to a plan the engine built.
import { api } from './api/index.js'
import { weeklyKm } from './engine/load.js'
import { estimateFitness, toISO, toMs, diffDays } from './coach/index.js'

export const MODEL_FAMILY = 'Claude'
const CONSENT_KEY = 'fh-ai-plan-consent'
const DAY = 86400000

let available = null
/** true when the server says AI plans are on. False on builds with no server (GitHub Pages). */
export function aiPlansAvailable() {
  if (!available) available = Promise.resolve().then(() => api.aiConfig?.()).then((c) => !!c?.ai?.plans).catch(() => false)
  return available
}
export const resetAiAvailability = () => { available = null }

export function hasAiConsent() {
  try { return localStorage.getItem(CONSENT_KEY) === 'yes' } catch { return false }
}
export function setAiConsent(yes) {
  try { yes ? localStorage.setItem(CONSENT_KEY, 'yes') : localStorage.removeItem(CONSENT_KEY) } catch { /* private mode: ask again next time */ }
}

/**
 * The summary the coach model sees: eight weeks of km (oldest first), longest
 * recent run, run count, fitness estimate, current goal, FormTrack yes or no, today.
 */
export function planContext({ runs = [], plan = null, formtrackLinked = false, today = toISO(Date.now()) } = {}) {
  const now = toMs(today) + DAY
  const mine = runs.filter((a) => (a.mode ?? 'run') === 'run' && !a.rejected)
  const recent = mine.filter((a) => now - a.startedAt <= 28 * DAY && now - a.startedAt >= 0)
  const f = estimateFitness(mine, { now })
  return {
    weeklyKm: weeklyKm(mine, now, 8, 'run').reverse(),
    longestKm: Math.round(recent.reduce((m, a) => Math.max(m, a.distanceM || 0), 0) / 100) / 10,
    runCount: mine.filter((a) => now - a.startedAt <= 56 * DAY).length,
    fiveKS: f.fiveKS,
    predictions: f.predictions,
    confidence: f.confidence,
    currentGoal: plan?.goal ?? null,
    formtrackLinked: !!formtrackLinked,
    today,
  }
}

/** Ask the server. Returns { settings, coach, model } or { questions }. Throws with a plain message. */
export function requestAiPlan({ brief, answers, context }) {
  return api.planAi({ brief, answers: answers?.length ? answers : undefined, context })
}

/** Put the coach's words on an engine plan, with phases trimmed to the plan's real length. */
export function attachAi(plan, { coach, model }, now = Date.now()) {
  const n = plan.weeks.length
  const phases = (coach.phases || [])
    .filter((p) => p.fromWeek <= n)
    .map((p) => ({ ...p, toWeek: Math.min(p.toWeek, n) }))
  plan.ai = {
    headline: coach.headline,
    overview: coach.overview || '',
    phases,
    tips: coach.tips || [],
    safety: coach.safety || null,
    model: model || null,
    family: MODEL_FAMILY,
    createdAt: new Date(now).toISOString(),
  }
  return plan
}

/** The phase note for the week holding today, if the coach wrote one. */
export function currentPhase(plan, today = toISO(Date.now())) {
  if (!plan?.ai?.phases?.length) return null
  const i = plan.weeks.findIndex((w) => diffDays(w.startDate, today) >= 0 && diffDays(w.startDate, today) < 7)
  const week = i >= 0 ? i + 1 : diffDays(plan.startDate, today) < 0 ? 1 : plan.weeks.length
  return plan.ai.phases.find((p) => week >= p.fromWeek && week <= p.toWeek) || null
}
