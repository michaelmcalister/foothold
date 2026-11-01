// Fitness, training paces and race predictions from real run history (Riegel), with honest confidence and conservative fallbacks.
import { DAY_MS } from './dates.js'

export const RACE_M = { '5k': 5000, '10k': 10000, half: 21097.5, marathon: 42195 }
export const DEFAULT_5K_S = 33 * 60 // a gentle default: 6:36 per km
export const SELF_REPORT_MARGIN = 1.03 // self-ratings run optimistic, so slow them a touch

// Riegel: T2 = T1 x (D2 / D1) ^ 1.06
export function riegel(timeS, fromM, toM, k = 1.06) {
  return timeS * Math.pow(toM / fromM, k)
}

// Whole-activity efforts worth trusting, each converted to a 5K equivalent, fastest first.
export function bestEfforts(activities = [], { now = Date.now(), days = 90 } = {}) {
  const out = []
  for (const a of activities) {
    if ((a.mode ?? 'run') !== 'run') continue
    const age = now - a.startedAt
    if (!(age >= 0 && age <= days * DAY_MS)) continue
    if (!(a.distanceM >= 3000) || !(a.movingS > 0)) continue
    const paceS = a.movingS / (a.distanceM / 1000)
    if (paceS < 150 || paceS > 720) continue // GPS glitches and walks
    out.push({ startedAt: a.startedAt, distanceM: a.distanceM, movingS: a.movingS, paceS, fiveKS: riegel(a.movingS, a.distanceM, 5000), ageDays: age / DAY_MS })
  }
  return out.sort((x, y) => x.fiveKS - y.fiveKS)
}

const r5 = (s) => Math.round(s / 5) * 5

// Pace ranges as [fastSPerKm, slowSPerKm], keyed by session type.
export function trainingPaces(fiveKS) {
  const p = fiveKS / 5
  const band = (lo, hi) => [r5(p * lo), r5(p * hi)]
  return {
    easy: band(1.2, 1.32),
    long: band(1.22, 1.35),
    tempo: band(1.06, 1.1),
    intervals: band(0.97, 1.01),
    recovery: band(1.32, 1.45),
  }
}

export function predictRaces(fiveKS) {
  const out = {}
  for (const [k, m] of Object.entries(RACE_M)) out[k] = Math.round(riegel(fiveKS, 5000, m))
  return out
}

// activities: [{ startedAt, distanceM, movingS, mode }]
export function estimateFitness(activities = [], { now = Date.now(), recent5kS = null, days = 90 } = {}) {
  const efforts = bestEfforts(activities, { now, days })
  const recent = efforts.filter((e) => e.ageDays <= 42)
  let fiveKS, source, confidence
  if (efforts.length >= 3) {
    // Average the best two so one lucky GPS day doesn't set the bar.
    fiveKS = (efforts[0].fiveKS + efforts[1].fiveKS) / 2
    source = 'history'
    const hasLong = efforts.some((e) => e.distanceM >= 5000)
    confidence = efforts.length >= 6 && recent.length >= 4 && hasLong ? 'high' : 'medium'
  } else if (recent5kS) {
    const self = recent5kS * SELF_REPORT_MARGIN
    source = 'self'
    if (efforts.length) {
      const hist = efforts[0].fiveKS
      fiveKS = Math.max(self, hist) // take the slower, safer number
      confidence = Math.abs(self - hist) / hist <= 0.08 ? 'medium' : 'low'
    } else {
      fiveKS = self
      confidence = 'low'
    }
  } else if (efforts.length) {
    fiveKS = efforts[0].fiveKS * SELF_REPORT_MARGIN
    source = 'history'
    confidence = 'low'
  } else {
    fiveKS = DEFAULT_5K_S
    source = 'default'
    confidence = 'low'
  }
  fiveKS = Math.round(fiveKS)
  return {
    fiveKS,
    source,
    confidence,
    efforts: efforts.length,
    basis: efforts[0] ? { startedAt: efforts[0].startedAt, distanceM: efforts[0].distanceM, movingS: efforts[0].movingS } : null,
    paces: trainingPaces(fiveKS),
    predictions: predictRaces(fiveKS),
  }
}

export function formatPace(s) {
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
export const formatRange = (r) => `${formatPace(r[0])} to ${formatPace(r[1])} per km`
export function formatTime(s) {
  const t = Math.round(s)
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
