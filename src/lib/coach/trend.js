// Fitness trend over the last 6 months, week by week: rolling predicted 5K, easy-run pace and heart rate, volume and readiness, with a kind headline.
import { estimateFitness, formatTime, RACE_M } from './paces.js'
import { toISO, toMs, addDays, mondayOf, diffDays, DAY_MS } from './dates.js'

export const TREND_WEEKS = 26
export const TREND_WINDOW_DAYS = 56 // the rolling window each week's 5K comes from
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const r1 = (x) => Math.round(x * 10) / 10
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
function median(xs) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const isRunAct = (a) => (a.mode ?? 'run') === 'run' && !a.rejected && a.distanceM > 0 && a.movingS > 0
export const weekLabel = (iso) => { const d = new Date(toMs(iso)); return `${d.getUTCDate()} ${SHORT[d.getUTCMonth()]}` }
const monthOf = (iso) => MONTHS[new Date(toMs(iso)).getUTCMonth()]

/** Average heart rate along a track, when at least half the points carry one. */
export function trackHr(track = []) {
  const hr = track.filter((p) => Number.isFinite(p.hr) && p.hr > 30 && p.hr < 230)
  if (hr.length < 20 || hr.length < track.length * 0.5) return null
  return Math.round(mean(hr.map((p) => p.hr)))
}

/**
 * An easy run: at least 2 km, slower than about 1.15 times 5K pace, and not a walk.
 * fiveKS is the fitness at the time.
 */
export function isEasyRun(a, fiveKS) {
  if (!isRunAct(a) || a.distanceM < 2000) return false
  const paceS = a.movingS / (a.distanceM / 1000)
  return paceS <= 720 && paceS >= (fiveKS / 5) * 1.15
}

/**
 * activities: [{ id, mode, startedAt, distanceM, movingS, rejected }]
 * tracks: { [activityId]: Point[] } for heart rate (optional, any subset)
 * readiness: { 'YYYY-MM-DD': 0 to 100 } daily snapshots (optional)
 */
export function fitnessTrend({ activities = [], tracks = {}, readiness = {}, now = Date.now(), weeks = TREND_WEEKS } = {}) {
  const runs = activities.filter(isRunAct)
  const thisMon = mondayOf(toISO(now))
  const rows = []
  for (let k = weeks - 1; k >= 0; k--) {
    const start = addDays(thisMon, -7 * k)
    const end = addDays(start, 7)
    const inWeek = runs.filter((a) => { const d = toISO(a.startedAt); return d >= start && d < end })
    // Fitness as it stood at the end of this week, from the trailing window only
    const at = k === 0 ? now : toMs(end) - 1
    const fit = estimateFitness(runs, { now: at, days: TREND_WINDOW_DAYS })
    const has = fit.efforts > 0
    const ref5k = has ? fit.fiveKS : null
    const easy = ref5k ? inWeek.filter((a) => isEasyRun(a, ref5k)) : []
    const easyPaces = easy.map((a) => a.movingS / (a.distanceM / 1000))
    const hrs = easy.map((a) => ({ a, hr: trackHr(tracks[a.id] || []) })).filter((x) => x.hr)
    const days = Object.entries(readiness || {}).filter(([d, v]) => d >= start && d < end && Number.isFinite(v)).map(([, v]) => v)
    rows.push({
      start,
      label: weekLabel(start),
      km: r1(inWeek.reduce((s, a) => s + a.distanceM, 0) / 1000),
      runs: inWeek.length,
      fiveKS: ref5k,
      confidence: has ? fit.confidence : null,
      easyRuns: easy.length,
      easyPaceS: easyPaces.length ? Math.round(median(easyPaces)) : null,
      easyHr: hrs.length ? Math.round(mean(hrs.map((x) => x.hr))) : null,
      // Heartbeats per km on easy runs: fewer beats for the same km means a fitter engine
      beatsPerKm: hrs.length ? Math.round(mean(hrs.map(({ a, hr }) => hr * (a.movingS / (a.distanceM / 1000)) / 60))) : null,
      readiness: days.length ? Math.round(mean(days)) : null,
    })
  }
  const current = estimateFitness(runs, { now, days: TREND_WINDOW_DAYS })
  return {
    weeks: rows,
    current: current.efforts ? current : null,
    headline: headline(rows),
    races: current.efforts ? racePanel(current, runs, now) : [],
    hasHr: rows.some((r) => r.beatsPerKm != null),
    hasReadiness: rows.some((r) => r.readiness != null),
    totalRuns: runs.filter((a) => now - a.startedAt <= weeks * 7 * DAY_MS).length,
  }
}

/** Predicted 5K per week for charts: thin early weeks are left out once there is a week we trust. */
export function fiveKSeries(rows) {
  const firstSure = rows.findIndex((r) => r.fiveKS != null && r.confidence !== 'low')
  return rows.map((r, i) => ({ label: r.label, value: firstSure > 0 && i < firstSure ? null : r.fiveKS }))
}

/** The kind, specific line at the top. Never framed as a loss. */
export function headline(rows) {
  const withFit = rows.filter((r) => r.fiveKS != null)
  const cur = withFit[withFit.length - 1]
  if (!cur) return { tone: 'none', text: 'Your fitness trend starts here. Runs of 3 km or more build the picture.', note: null }
  // Compare with the first week we trust, so a thin start doesn't flatter the gain
  const early = withFit.filter((r) => diffDays(r.start, cur.start) >= 28)
  const base = early.find((r) => r.confidence !== 'low') || early[0]
  const note = cur.confidence === 'low'
    ? 'Based on only a few runs so far, so treat it as a rough guide.'
    : cur.confidence === 'medium' ? 'A fair guide. More runs of 5 km or more will sharpen it.' : 'Based on plenty of recent runs.'
  if (base) {
    const gain = base.fiveKS - cur.fiveKS
    if (gain >= 10) {
      const when = monthOf(base.start) === monthOf(cur.start) ? `${Math.round(diffDays(base.start, cur.start) / 7)} weeks ago` : `in ${monthOf(base.start)}`
      return { tone: 'better', gainS: Math.round(gain), text: `Your predicted 5K is ${formatTime(gain)} faster than ${when}.`, note }
    }
    return { tone: 'steady', text: 'Holding steady. Consistency is how fitness builds.', note }
  }
  return { tone: 'early', text: 'Early days. Keep running and your trend will show here.', note }
}

const LEVELS = ['low', 'medium', 'high']
const down = (c, n = 1) => LEVELS[Math.max(0, LEVELS.indexOf(c) - n)]

/** Race predictions with honest confidence: longer races are a bigger stretch from shorter runs. */
export function racePanel(fit, runs = [], now = Date.now()) {
  const recent = runs.filter((a) => now - a.startedAt <= TREND_WINDOW_DAYS * DAY_MS)
  const longest = recent.reduce((m, a) => Math.max(m, a.distanceM), 0)
  const LABEL = { '5k': '5K', '10k': '10K', half: 'Half marathon', marathon: 'Marathon' }
  return Object.keys(RACE_M).map((key) => {
    let confidence = fit.confidence
    if (key === '10k' && longest < 8000) confidence = down(confidence)
    if (key === 'half' && longest < 15000) confidence = down(confidence)
    if (key === 'marathon') confidence = down(confidence, longest >= 25000 ? 1 : 2)
    return { key, label: LABEL[key], timeS: fit.predictions[key], confidence }
  })
}
