// Post-run check-ins ("How did that feel?"): the choices, checking what was sent, and spotting runs that keep feeling too hard.
import { isRun } from './plans.js'
import { toISO, diffDays } from './dates.js'

// feel is 1 to 5 (5 is kept for "all out", from watches or imports) or 'hurt'
export const FEELS = [
  { value: 1, label: 'Easy' },
  { value: 2, label: 'Comfortable' },
  { value: 3, label: 'Hard work' },
  { value: 4, label: 'Very hard' },
  { value: 'hurt', label: 'Something hurt' },
]
// The same list as the coach's injury sheet (CoachView.vue)
export const HURT_AREAS = [
  { value: 'foot', label: 'Foot or ankle' },
  { value: 'shin', label: 'Shin' },
  { value: 'calf', label: 'Calf or achilles' },
  { value: 'knee', label: 'Knee' },
  { value: 'hip', label: 'Hip or glute' },
  { value: 'hamstring', label: 'Hamstring' },
  { value: 'back', label: 'Back' },
  { value: 'other', label: 'Somewhere else' },
]
export const HURT_LEVELS = [
  { value: 'niggle', label: 'A niggle' },
  { value: 'sore', label: 'Sore' },
  { value: 'hurt', label: 'It hurts' },
]
const AREA_WORDS = { foot: 'foot or ankle', shin: 'shin', calf: 'calf or achilles', knee: 'knee', hip: 'hip or glute', hamstring: 'hamstring', back: 'back', other: 'that spot' }
export const areaWords = (a) => AREA_WORDS[a] || 'that spot'

/**
 * Checks a check-in body: { feel, hurt?: { area, level } } or { dismissed: true }.
 * Returns { feel, hurt } (both null when dismissed) or throws an Error with a plain message.
 */
export function cleanCheckin(body = {}) {
  if (body?.dismissed === true) return { feel: null, hurt: null }
  let feel = body?.feel
  if (typeof feel === 'string' && /^[1-5]$/.test(feel)) feel = Number(feel)
  if (!(feel === 'hurt' || (Number.isInteger(feel) && feel >= 1 && feel <= 5))) throw new Error('Pick how it felt: 1 to 5, or hurt.')
  let hurt = null
  if (feel === 'hurt' && body.hurt != null) {
    const { area, level } = body.hurt || {}
    if (!HURT_AREAS.some((x) => x.value === area)) throw new Error("That isn't one of the places we know.")
    if (!HURT_LEVELS.some((x) => x.value === level)) throw new Error('How bad must be niggle, sore or hurts.')
    hurt = { area, level }
  }
  return { feel, hurt }
}

export const feelLabel = (f) => FEELS.find((x) => x.value === f)?.label || (f === 5 ? 'All out' : null)
const veryHard = (a) => Number.isInteger(a.feel) && a.feel >= 4

// The run planned for the day of the activity, if it was an easy kind of run.
const EASY = ['easy', 'long', 'recovery', 'strides']
function easyPlanned(plan, a) {
  if (!plan?.weeks) return null
  const day = toISO(a.startedAt)
  const same = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.date === day && isRun(s))
  const s = same.find((x) => x.actual?.activityId === a.id) || same[0]
  return s && EASY.includes(s.type) ? s : null
}

/**
 * Should the plan ease off? True when the last 3 easy runs all felt very hard,
 * or 2 planned easy runs in the past week did. Quiet for 4 days after it last eased.
 */
export function tiredSignal(plan, activities = [], now = Date.now()) {
  if (!plan?.weeks) return false
  const t = toISO(now)
  const lastTired = (plan.history || []).filter((h) => h.type === 'tired').map((h) => h.at).sort().pop()
  if (lastTired && diffDays(lastTired, t) < 4) return false
  const easy = activities
    .filter((a) => (a.mode ?? 'run') === 'run' && !a.rejected && a.startedAt <= now && easyPlanned(plan, a))
    .sort((x, y) => y.startedAt - x.startedAt)
  const answered = easy.filter((a) => a.feel != null)
  if (answered.length >= 3 && answered.slice(0, 3).every(veryHard)) return true
  const week = answered.filter((a) => diffDays(toISO(a.startedAt), t) <= 6 && veryHard(a))
  return week.length >= 2
}
