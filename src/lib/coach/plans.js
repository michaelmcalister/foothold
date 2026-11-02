// Conservative adaptive training plans: start from real recent volume, ramp at most 10% a week, deload every 4th week, taper, and warn rather than cram.
import { weeklyKm } from '../engine/load.js'
import { estimateFitness, formatRange, formatPace, RACE_M } from './paces.js'
import { DAYS, DAY_LABEL, toISO, toMs, addDays, dayIndex, dayName, diffDays, mondayOnOrAfter, fmtDate } from './dates.js'

export const GOALS = ['5k', '10k', 'half', 'marathon', 'base', 'return']
export const QUALITY = ['tempo', 'intervals']
// Session kinds a runner may ask to leave out. Hills are never prescribed, so avoiding them changes nothing here.
export const AVOIDABLE = ['intervals', 'tempo', 'hills']
export const RUN_TYPES = ['easy', 'long', 'tempo', 'intervals', 'strides', 'recovery', 'race', 'runwalk']
export const LONG_CAP_KM = { '5k': 10, '10k': 14, half: 21, marathon: 32, base: 16, return: 8 }
export const RAMP = 1.1
export const DELOAD = 0.75
export const DELOAD_EVERY = 4
export const TAPER_WEEKS = { '5k': 1, '10k': 1, half: 2, marathon: 3 }
const TAPER_SHAPE = { 1: [0.6], 2: [0.75, 0.55], 3: [0.8, 0.65, 0.45] }
const PEAK_KM = { '5k': 30, '10k': 40, half: 50, marathon: 70, base: 60, return: 25 }
const PER_DAY_MAX = { '5k': 8, '10k': 10, half: 12, marathon: 15, base: 12, return: 6 }
const DEFAULT_WEEKS = { '5k': 8, '10k': 10, half: 12, marathon: 16, base: 8, return: 6 }
// What a safe build should reach before race day.
const MIN_BUILD = { '5k': 3, '10k': 5, half: 8, marathon: 12 }
const NEED_LONG = { '5k': 4, '10k': 7, half: 12, marathon: 18 }
const LOWER_GOAL = { marathon: 'half', half: '10k', '10k': '5k', '5k': null }
const GOAL_LABEL = { '5k': '5K', '10k': '10K', half: 'half marathon', marathon: 'marathon', base: 'base building', return: 'return to running' }
const MIN_WEEK_KM = 5
const LONG_STEP_KM = 1.5
// Other run days, as days before the long run (so the pattern repeats cleanly week to week).
const OFFSETS = { 2: [3], 3: [3, 5], 4: [2, 4, 6], 5: [2, 3, 5, 6], 6: [1, 2, 3, 4, 5] }

export const isRun = (s) => RUN_TYPES.includes(s.type)
export const isQuality = (s) => QUALITY.includes(s.type)
const r1 = (x) => Math.round(x * 10) / 10
const f1 = (x) => Math.floor(x * 10 + 1e-9) / 10

// History beats self-report: if the runner says they do more than the app has seen, trust the app.
export function calibrateVolume({ currentWeeklyKm = 0, longestRecentKm = 0, activities = [], today }) {
  const now = toMs(today) + 86400000
  const runs = (activities || []).filter((a) => (a.mode ?? 'run') === 'run' && now - a.startedAt <= 28 * 86400000 && now - a.startedAt >= 0)
  let weekly = currentWeeklyKm || 0
  let longest = longestRecentKm || 0
  let source = 'self'
  if (runs.length >= 3) {
    const wk = weeklyKm(runs, now, 4, 'run')
    const hist = wk.reduce((s, k) => s + k, 0) / 4
    const histLong = Math.max(...runs.map((a) => a.distanceM / 1000))
    weekly = weekly ? Math.min(weekly, hist * 1.1) : hist
    longest = longest ? Math.min(longest, histLong) : histLong
    source = 'history'
  }
  return { weeklyKm: r1(weekly), longestKm: r1(longest), source }
}

// Weekly volumes for a build: 10% max rise, a 75% deload every 4th week, back to the pre deload level after.
export function buildRamp({ startKm, peakKm, weeks, startLongKm = 0, longCap = 32 }) {
  const out = []
  let level = startKm
  let long = Math.max(0, startLongKm)
  for (let i = 0; i < weeks; i++) {
    const deload = (i + 1) % DELOAD_EVERY === 0
    if (i > 0 && !deload && !out[i - 1].deload) level = Math.min(Math.max(peakKm, startKm), f1(level * RAMP))
    if (deload) {
      const km = r1(level * DELOAD)
      out.push({ km, deload: true, longKm: r1(Math.min(km * 0.3, longCap, long * 0.85 || km * 0.3)) })
    } else {
      const wantLong = i === 0 ? Math.max(long, 0) : long + LONG_STEP_KM
      long = r1(Math.min(level * 0.3, longCap, Math.max(wantLong, Math.min(level * 0.3, 3))))
      out.push({ km: r1(level), deload: false, longKm: long })
    }
  }
  return out
}

function feasible(goal, buildWeeks, startKm, peakKm, startLong) {
  if (!MIN_BUILD[goal]) return true
  const ramp = buildRamp({ startKm, peakKm, weeks: buildWeeks, startLongKm: startLong, longCap: LONG_CAP_KM[goal] })
  const longMax = Math.max(0, ...ramp.map((w) => w.longKm))
  return buildWeeks >= MIN_BUILD[goal] && longMax >= NEED_LONG[goal]
}

function peakFor(goal, daysPerWeek, startKm) {
  return Math.max(startKm, Math.min(PEAK_KM[goal], daysPerWeek * PER_DAY_MAX[goal]))
}

// ---------- session builders ----------

function mk(planId, weekIndex, date, type, fields) {
  return {
    id: `${planId}-w${weekIndex + 1}-${date}-${type}`,
    date,
    day: dayName(date),
    type,
    territory: ['easy', 'long', 'recovery', 'runwalk'].includes(type),
    formtrack: type === 'strength',
    status: 'planned',
    ...fields,
  }
}

function easySession(ctx, date, km, type = 'easy') {
  const pace = ctx.paces[type === 'recovery' ? 'recovery' : 'easy']
  const titles = { easy: `Easy ${km} km`, recovery: `Recovery jog ${km} km` }
  const desc = type === 'recovery'
    ? `Very gentle, shorter than you think. Around ${formatRange(pace)}. Walk breaks are fine.`
    : `Relaxed and chatty, around ${formatRange(pace)}. Pick a loop that takes some ground.`
  return mk(ctx.planId, ctx.week, date, type, { title: titles[type], description: desc, distanceKm: km, durationMin: Math.round((km * (pace[0] + pace[1])) / 2 / 60), paceRange: pace })
}

function longSession(ctx, date, km) {
  const pace = ctx.paces.long
  return mk(ctx.planId, ctx.week, date, 'long', {
    title: `Long run ${km} km`,
    description: `Steady and comfortable, around ${formatRange(pace)}. Slow down on hills. This is about time on your feet, not speed.`,
    distanceKm: km,
    durationMin: Math.round((km * (pace[0] + pace[1])) / 2 / 60),
    paceRange: pace,
  })
}

function stridesSession(ctx, date, km) {
  const pace = ctx.paces.easy
  return mk(ctx.planId, ctx.week, date, 'strides', {
    title: `Easy ${km} km with strides`,
    description: `Easy running, then 6 relaxed strides of about 20 seconds with a full walk back. Quick and tall, not a sprint.`,
    distanceKm: km,
    durationMin: Math.round((km * (pace[0] + pace[1])) / 2 / 60) + 5,
    paceRange: pace,
    steps: [
      { kind: 'run', distanceM: Math.round(km * 1000), pace },
      { kind: 'stride', repeat: 6, durationS: 20, recoverS: 60 },
    ],
  })
}

function qualitySession(ctx, date, km, type, weekKm) {
  const hardCap = Math.max(1.2, weekKm * 0.1) // two of these stay within the 20%
  const hard = r1(Math.max(1, Math.min(km - 2, hardCap)))
  const wu = r1((km - hard) * 0.6)
  const cd = r1(km - hard - wu)
  if (type === 'progression') {
    // A tempo session in fartlek style: easy, then build gradually to tempo pace. For runners who'd rather skip track intervals.
    const pace = ctx.paces.tempo
    return mk(ctx.planId, ctx.week, date, 'tempo', {
      variant: 'progression',
      title: `Progression ${km} km`,
      description: `Start easy for ${wu} km. Then build bit by bit over ${hard} km until you reach ${formatRange(pace)}, as if you're chasing the next lamp post. Cool down easy.`,
      distanceKm: km,
      durationMin: Math.round((wu + cd) * ctx.paces.easy[1] / 60 + hard * pace[1] / 60),
      paceRange: pace,
      steps: [
        { kind: 'warmup', distanceM: Math.round(wu * 1000), pace: ctx.paces.easy },
        { kind: 'tempo', distanceM: Math.round(hard * 1000), pace, build: true },
        { kind: 'cooldown', distanceM: Math.round(cd * 1000), pace: ctx.paces.easy },
      ],
    })
  }
  if (type === 'tempo') {
    const pace = ctx.paces.tempo
    return mk(ctx.planId, ctx.week, date, 'tempo', {
      title: `Tempo ${km} km`,
      description: `Warm up easy for ${wu} km, then ${hard} km comfortably hard at ${formatRange(pace)}. You could say a short sentence. Cool down easy.`,
      distanceKm: km,
      durationMin: Math.round((wu + cd) * ctx.paces.easy[1] / 60 + hard * pace[1] / 60),
      paceRange: pace,
      steps: [
        { kind: 'warmup', distanceM: Math.round(wu * 1000), pace: ctx.paces.easy },
        { kind: 'tempo', distanceM: Math.round(hard * 1000), pace },
        { kind: 'cooldown', distanceM: Math.round(cd * 1000), pace: ctx.paces.easy },
      ],
    })
  }
  const pace = ctx.paces.intervals
  const rep = hard < 3 ? 400 : hard < 5 ? 800 : 1000
  const reps = Math.max(3, Math.min(10, Math.floor((hard * 1000) / rep)))
  return mk(ctx.planId, ctx.week, date, 'intervals', {
    title: `Intervals ${reps} x ${rep} m`,
    description: `Warm up easy for ${wu} km. Then ${reps} reps of ${rep} m at ${formatRange(pace)}, with 90 seconds easy jogging or walking between. Cool down easy. Stop early if your form falls apart.`,
    distanceKm: km,
    durationMin: Math.round((km - (reps * rep) / 1000) * ctx.paces.easy[1] / 60 + (reps * rep / 1000) * pace[1] / 60 + reps * 1.5),
    paceRange: pace,
    steps: [
      { kind: 'warmup', distanceM: Math.round(wu * 1000), pace: ctx.paces.easy },
      { kind: 'interval', repeat: reps, distanceM: rep, pace, recoverS: 90 },
      { kind: 'cooldown', distanceM: Math.round(cd * 1000), pace: ctx.paces.easy },
    ],
  })
}

export function strengthSession(ctx, date) {
  return mk(ctx.planId, ctx.week, date, 'strength', {
    title: 'Strength for runners',
    description: 'About 25 minutes in FormTrack: calves, glutes, single leg work and core. Keep it smooth, no grinding reps.',
    durationMin: 25,
  })
}

function restSession(ctx, date) {
  return mk(ctx.planId, ctx.week, date, 'rest', { title: 'Rest day', description: 'Nothing planned. A walk is fine if you feel like it.' })
}

function raceSession(ctx, date, goal) {
  const km = r1(RACE_M[goal] / 1000)
  const pred = ctx.fitness.predictions[goal]
  return mk(ctx.planId, ctx.week, date, 'race', {
    title: `Race day: ${GOAL_LABEL[goal]}`,
    description: `Start slower than you want to and build. Your current estimate is about ${formatPace(pred / (RACE_M[goal] / 1000))} per km. Enjoy it.`,
    distanceKm: km,
    durationMin: Math.round(pred / 60),
    paceRange: [Math.round(pred / (RACE_M[goal] / 1000)), Math.round(pred / (RACE_M[goal] / 1000) * 1.03)],
  })
}

// Run/walk for coming back from injury: time based, gentle.
const RUNWALK = [
  { run: 60, walk: 120 }, { run: 90, walk: 90 }, { run: 120, walk: 90 }, { run: 120, walk: 60 },
  { run: 180, walk: 60 }, { run: 300, walk: 60 }, { run: 480, walk: 60 }, { run: 600, walk: 60 },
]
function runWalkSession(ctx, date, minutes, stage, label) {
  const { run, walk } = RUNWALK[Math.min(stage, RUNWALK.length - 1)]
  const reps = Math.max(3, Math.round((minutes * 60) / (run + walk)))
  const mins = Math.round((reps * (run + walk)) / 60)
  const runKmh = 3600 / ctx.paces.recovery[1]
  const km = r1((reps * run / 3600) * runKmh + (reps * walk / 3600) * 5.5)
  const fmt = (s) => (s % 60 ? `${s} seconds` : `${s / 60} minute${s === 60 ? '' : 's'}`)
  return mk(ctx.planId, ctx.week, date, 'easy', {
    runWalk: true,
    title: `${label} ${mins} min`,
    description: `${reps} rounds of ${fmt(run)} gentle running and ${fmt(walk)} walking. If anything hurts, walk home and log it. Pain free is the goal.`,
    durationMin: mins,
    distanceKm: km,
    paceRange: ctx.paces.recovery,
    steps: [{ kind: 'run', repeat: reps, durationS: run, pace: ctx.paces.recovery, recoverS: walk, recoverKind: 'walk' }],
  })
}

// ---------- weekly layout ----------

function runDays(longRunDay, daysPerWeek, chosen = null) {
  if (chosen) return chosen
  const L = DAYS.indexOf(longRunDay)
  const offs = OFFSETS[daysPerWeek]
  return [L, ...offs.map((o) => (L - o + 7) % 7)].sort((a, b) => a - b)
}

// The runner's own weekdays, made consistent: real day keys only, 2 to 6 of them, and the long run on one of them
// (their long run day if it's in the list, else Sunday, Saturday or the last one). Returns null to use the default layout.
export function normaliseRunDays(list, longRunDay = 'sun') {
  if (!Array.isArray(list)) return null
  const idx = [...new Set(list.map((d) => DAYS.indexOf(String(d).toLowerCase().slice(0, 3))).filter((i) => i >= 0))].sort((a, b) => a - b)
  if (idx.length < 2 || idx.length > 6) return null
  let L = DAYS.indexOf(longRunDay)
  if (!idx.includes(L)) L = idx.includes(6) ? 6 : idx.includes(5) ? 5 : idx[idx.length - 1]
  return { days: idx, longRunDay: DAYS[L], daysPerWeek: idx.length }
}

// Spread n days out of a chosen set, always keeping the long run day (the return plan runs at most 4 days).
function spreadDays(days, L, n) {
  if (days.length <= n) return days
  const out = [L]
  const gap = (d) => Math.min(...out.map((o) => Math.min(Math.abs(o - d), 7 - Math.abs(o - d))))
  while (out.length < n) {
    const next = days.filter((d) => !out.includes(d)).sort((a, b) => gap(b) - gap(a) || a - b)[0]
    out.push(next)
  }
  return out.sort((a, b) => a - b)
}

// Quality types left after the runner's avoid list: no intervals means tempo and progression runs, no tempo means intervals, neither means strides only.
export function allowedQuality(goal, avoid = []) {
  const no = new Set(avoid || [])
  const preferred = goal === '5k' || goal === '10k' ? ['intervals', 'tempo'] : ['tempo', 'intervals']
  if (no.has('intervals') && no.has('tempo')) return []
  if (no.has('intervals')) return ['tempo', 'progression']
  if (no.has('tempo')) return ['intervals']
  return preferred
}

// Pick quality days: not the long run day, not the day before it, never next to each other (cyclic, so weeks join safely).
export function pickQualityDays(days, longIdx, count) {
  const adj = (a, b) => Math.abs(a - b) === 1 || Math.abs(a - b) === 6
  const cands = days.filter((d) => d !== longIdx && !adj(d, longIdx)).concat(days.filter((d) => d !== longIdx && adj(d, longIdx) && d !== (longIdx + 6) % 7))
  const out = []
  for (const d of cands) {
    if (out.length >= count) break
    if (out.every((q) => !adj(q, d) && q !== d)) out.push(d)
  }
  return out.sort((a, b) => a - b)
}

function layoutWeek(ctx, { weekStart, km, longKm, qualityCount, qualityTypes, strides, strength, recovery, raceDate, goal }) {
  const { daysPerWeek, longRunDay } = ctx
  const L = DAYS.indexOf(longRunDay)
  const days = runDays(longRunDay, daysPerWeek, ctx.runDays)
  const qDays = pickQualityDays(days, L, qualityCount)
  const sessions = []
  const raceIdx = raceDate ? diffDays(weekStart, raceDate) : null
  const runSlots = days.filter((d) => raceIdx == null || d < raceIdx - 1 || (d === raceIdx))
  // Long run (or the race) first, then share the rest.
  let remaining = km
  const plan = []
  for (const d of runSlots) {
    if (raceIdx != null && d === raceIdx) { plan.push({ d, kind: 'race' }); continue }
    if (raceIdx == null && d === L) { plan.push({ d, kind: 'long', km: longKm }); remaining -= longKm; continue }
    if (qDays.includes(d) && raceIdx == null) plan.push({ d, kind: 'quality' })
    else plan.push({ d, kind: 'easy' })
  }
  if (raceIdx != null && raceIdx >= 0 && raceIdx < 7 && !runSlots.includes(raceIdx)) plan.push({ d: raceIdx, kind: 'race' })
  if (raceIdx != null) remaining = Math.max(0, km - RACE_M[goal] / 1000)
  // Recovery run: the day after the long run if it's a run day.
  if (recovery) {
    const after = plan.find((p) => p.kind === 'easy' && p.d === (L + 1) % 7)
    if (after) after.kind = 'recovery'
  }
  const shares = plan.filter((p) => !['long', 'race'].includes(p.kind))
  const w = (p) => (p.kind === 'recovery' ? 0.65 : 1)
  const totalW = shares.reduce((s, p) => s + w(p), 0)
  for (const p of shares) p.km = totalW ? Math.max(1.5, r1((remaining * w(p)) / totalW)) : 0
  // Make the run sessions add up to the week target exactly (fix rounding on the biggest easy run).
  if (raceIdx == null && shares.length) {
    const sum = plan.reduce((s, p) => s + (p.km || 0), 0)
    const fix = shares.filter((p) => p.kind === 'easy').sort((a, b) => b.km - a.km)[0] || shares[0]
    fix.km = r1(fix.km + (km - sum))
  }
  plan.sort((a, b) => a.d - b.d)
  let qi = 0
  let stridesDone = !strides
  for (const p of plan) {
    const date = addDays(weekStart, p.d)
    if (p.kind === 'race') sessions.push(raceSession(ctx, date, goal))
    else if (p.kind === 'long') sessions.push(longSession(ctx, date, p.km))
    else if (p.kind === 'quality') sessions.push(qualitySession(ctx, date, p.km, qualityTypes[qi++ % qualityTypes.length], km))
    else if (p.kind === 'recovery') sessions.push(easySession(ctx, date, p.km, 'recovery'))
    else if (!stridesDone && p.d !== (L + 6) % 7 && (p.d !== (L + 1) % 7 || plan.filter((x) => x.kind === 'easy').length === 1)) { sessions.push(stridesSession(ctx, date, p.km)); stridesDone = true }
    else sessions.push(easySession(ctx, date, p.km))
  }
  addStrengthAndRest(ctx, sessions, weekStart, strength, raceIdx)
  return sessions
}

function addStrengthAndRest(ctx, sessions, weekStart, strength, raceIdx = null) {
  const L = DAYS.indexOf(ctx.longRunDay)
  const used = new Set(sessions.map((s) => dayIndex(s.date)))
  const qIdx = sessions.filter(isQuality).map((s) => dayIndex(s.date))
  if (strength > 0) {
    // Easy days first (not before the long run or a quality day), then rest days.
    const easy = sessions.filter((s) => ['easy', 'recovery', 'strides', 'runwalk'].includes(s.type)).map((s) => dayIndex(s.date))
    const rest = [0, 1, 2, 3, 4, 5, 6].filter((d) => !used.has(d))
    const bad = (d) => d === (L + 6) % 7 || qIdx.includes((d + 1) % 7) || (raceIdx != null && raceIdx - d <= 2 && raceIdx - d >= -1)
    const picks = []
    for (const d of [...easy, ...rest]) {
      if (picks.length >= strength) break
      if (bad(d) || picks.some((p) => Math.abs(p - d) < 2)) continue
      picks.push(d)
    }
    for (const d of picks) sessions.push(strengthSession(ctx, addDays(weekStart, d)))
  }
  const all = new Set(sessions.map((s) => dayIndex(s.date)))
  for (let d = 0; d < 7; d++) {
    if (raceIdx != null && d > raceIdx) continue
    if (!all.has(d)) sessions.push(restSession(ctx, addDays(weekStart, d)))
  }
  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type === 'strength' ? 1 : -1))
}

export function sumRunKm(sessions) {
  return r1(sessions.filter(isRun).reduce((s, x) => s + (x.distanceKm || 0), 0))
}

// ---------- the plan ----------

export function generatePlan(opts = {}) {
  const {
    goal = 'base', raceDate = null, weeks: weeksOpt = null, daysPerWeek: dpwIn = 3, longRunDay: lrIn = 'sun',
    currentWeeklyKm = 0, longestRecentKm = 0, recent5kS = null, activities = [], includeStrength = false,
    runDays: runDaysIn = null, avoid: avoidIn = [],
  } = opts
  if (!GOALS.includes(goal)) throw new Error(`Unknown goal: ${goal}`)
  const today = toISO(opts.today ?? Date.now())
  // Specific weekdays win over a plain count; they also settle which day the long run is on.
  const chosen = normaliseRunDays(runDaysIn, lrIn)
  const longRunDay = chosen ? chosen.longRunDay : DAYS.includes(lrIn) ? lrIn : 'sun'
  const daysPerWeek = chosen ? chosen.daysPerWeek : Math.max(2, Math.min(6, Math.round(dpwIn)))
  const avoid = (Array.isArray(avoidIn) ? avoidIn : []).filter((a) => AVOIDABLE.includes(a))
  const layout = { daysPerWeek, longRunDay, ...(chosen ? { runDays: chosen.days.map((i) => DAYS[i]) } : {}), ...(avoid.length ? { avoid } : {}) }
  const warnings = []
  const notes = []
  const fitness = estimateFitness(activities, { now: toMs(today) + 86400000, recent5kS })
  const vol = calibrateVolume({ currentWeeklyKm, longestRecentKm, activities, today })
  if (vol.source === 'history' && currentWeeklyKm && vol.weeklyKm < currentWeeklyKm * 0.9) {
    notes.push(`Your recent runs average about ${vol.weeklyKm} km a week, so we've started there rather than ${currentWeeklyKm} km.`)
  }
  let startDate = mondayOnOrAfter(today)
  const race = raceDate && ['5k', '10k', 'half', 'marathon'].includes(goal) ? toISO(raceDate) : null
  if (race && diffDays(today, race) < 7 && diffDays(today, race) >= 0) startDate = addDays(mondayOnOrAfter(today), -7 * (dayIndex(today) === 0 ? 0 : 1))
  if (race && diffDays(startDate, race) < 0) startDate = addDays(startDate, -7)
  const planId = `plan-${goal}-${startDate}`
  const ctx = { planId, week: 0, daysPerWeek, longRunDay, runDays: chosen ? chosen.days : null, paces: fitness.paces, fitness }

  let startKm = Math.max(MIN_WEEK_KM, vol.weeklyKm)
  if (vol.weeklyKm < MIN_WEEK_KM && !['return', 'base'].includes(goal)) {
    notes.push(`You're starting from a light base, so the first weeks are short and easy. A run/walk start might suit you even better.`)
  }

  let total
  if (race) total = Math.max(1, Math.floor(diffDays(startDate, race) / 7) + 1)
  else total = weeksOpt || DEFAULT_WEEKS[goal]
  total = Math.max(1, Math.min(52, total))

  if (goal === 'return') {
    return finish(returnPlan(ctx, { startDate, total, startKm: vol.weeklyKm, includeStrength, daysPerWeek }), { planId, goal, startDate, race, fitness, vol, warnings, notes, opts, today, layout })
  }

  const peak = peakFor(goal, daysPerWeek, startKm)
  let taper = race ? TAPER_WEEKS[goal] : 0
  if (race && total - taper < 2) taper = Math.min(1, total - 1)
  const build = total - taper
  const startLong = Math.min(vol.longestKm || startKm * 0.3, startKm * 0.3)

  // Too soon? Keep the safe ramp and say so.
  if (race && !feasible(goal, build, startKm, peak, startLong)) {
    let need = build
    while (need < 52 && !feasible(goal, need, startKm, peak, startLong)) need++
    const t = TAPER_WEEKS[goal]
    const later = addDays(startDate, (need + t - 1) * 7 + dayIndex(race))
    warnings.push(`${fmtDate(race)} is too soon to build safely for a ${GOAL_LABEL[goal]} from about ${r1(startKm)} km a week. We've kept the build gentle rather than rushing it.`)
    if (need < 52) warnings.push(`A race on or after ${fmtDate(later)} would give you time to get there safely.`)
    let lower = LOWER_GOAL[goal]
    while (lower && !feasible(lower, total - TAPER_WEEKS[lower], startKm, peakFor(lower, daysPerWeek, startKm), startLong)) lower = LOWER_GOAL[lower]
    if (lower) warnings.push(`Or keep the date and aim for the ${GOAL_LABEL[lower]} instead.`)
  }
  if (race && diffDays(today, race) < 0) warnings.push('That race date has already passed.')
  const qualityTypes = allowedQuality(goal, avoid)
  if (!qualityTypes.length && goal !== 'base') notes.push(`No tempo or interval sessions, as you asked. Strides each week keep your legs quick.`)

  const ramp = buildRamp({ startKm, peakKm: peak, weeks: build, startLongKm: startLong, longCap: LONG_CAP_KM[goal] })
  const weeks = []
  for (let i = 0; i < build; i++) {
    const r = ramp[i]
    ctx.week = i
    // Two quality days only with 5+ run days, so easy running stays about 80% of the week.
    let q = goal === 'base' || !qualityTypes.length ? 0 : daysPerWeek <= 2 ? 0 : daysPerWeek >= 5 && i >= 2 && !r.deload ? 2 : 1
    const types = q === 1 ? [qualityTypes[i % qualityTypes.length]] : qualityTypes
    const weekStart = addDays(startDate, i * 7)
    const sessions = layoutWeek(ctx, {
      weekStart, km: r.km, longKm: r.longKm, qualityCount: q, qualityTypes: types,
      strides: goal === 'base' ? i >= 2 : q < 2, strength: includeStrength ? (r.deload || daysPerWeek >= 5 ? 1 : 2) : 0,
      recovery: daysPerWeek >= 5, goal,
    })
    const focus = r.deload ? 'Lighter week to absorb the work' : goal === 'base' ? 'Aerobic base' : i < 2 ? 'Settle in' : 'Build'
    weeks.push({ index: i, startDate: weekStart, focus, deload: r.deload, targetKm: sumRunKm(sessions), sessions })
  }
  const peakLevel = Math.max(...ramp.filter((w) => !w.deload).map((w) => w.km), startKm)
  const shape = TAPER_SHAPE[taper] || []
  for (let t = 0; t < taper; t++) {
    const i = build + t
    ctx.week = i
    const weekStart = addDays(startDate, i * 7)
    const isRaceWeek = t === taper - 1
    const km = r1(peakLevel * shape[t])
    const longKm = r1(Math.min(km * 0.3, LONG_CAP_KM[goal]))
    const sessions = isRaceWeek
      ? layoutWeek(ctx, { weekStart, km: r1(RACE_M[goal] / 1000 + Math.min(km * 0.5, 3 * (daysPerWeek - 1))), longKm, qualityCount: 0, qualityTypes: [], strides: true, strength: 0, recovery: false, raceDate: race, goal })
      : layoutWeek(ctx, { weekStart, km, longKm, qualityCount: qualityTypes.length ? 1 : 0, qualityTypes: [taperQuality(goal, qualityTypes)], strides: !qualityTypes.length, strength: includeStrength ? 1 : 0, recovery: false, goal })
    weeks.push({ index: i, startDate: weekStart, focus: isRaceWeek ? 'Race week' : 'Taper', deload: false, taper: true, targetKm: sumRunKm(sessions), sessions })
  }
  return finish(weeks, { planId, goal, startDate, race, fitness, vol, warnings, notes, opts, today, layout })
}

function taperQuality(goal, allowed) {
  const want = goal === 'marathon' || goal === 'half' ? 'tempo' : 'intervals'
  return allowed.includes(want) ? want : allowed[0]
}

function finish(weeks, { planId, goal, startDate, race, fitness, vol, warnings, notes, opts, today, layout }) {
  const last = weeks[weeks.length - 1]
  const endDate = last.sessions.length ? last.sessions[last.sessions.length - 1].date : addDays(last.startDate, 6)
  const { activities, runDays: _rd, avoid: _av, ...settings } = opts
  if (fitness.confidence === 'low') notes.push(`We don't have much run history yet, so paces start on the cautious side and will sharpen as you log runs.`)
  return {
    id: planId,
    goal,
    title: goal === 'base' ? 'Base building' : goal === 'return' ? 'Return to running' : `${GOAL_LABEL[goal][0].toUpperCase()}${GOAL_LABEL[goal].slice(1)} plan`,
    createdAt: today,
    startDate,
    endDate,
    raceDate: race,
    settings: { ...settings, ...layout, today },
    fitness: { fiveKS: fitness.fiveKS, confidence: fitness.confidence, source: fitness.source, paces: fitness.paces, predictions: fitness.predictions },
    volume: vol,
    weeks,
    notes,
    warnings,
  }
}

// Return from injury: run/walk, time based, no quality for at least three weeks, +10% time a week.
function returnPlan(ctx, { startDate, total, startKm, includeStrength, daysPerWeek }) {
  const dpw = Math.min(daysPerWeek, 4)
  const L = DAYS.indexOf(ctx.longRunDay)
  const days = ctx.runDays ? spreadDays(ctx.runDays, L, dpw) : runDays(ctx.longRunDay, Math.max(2, dpw))
  const weeks = []
  let minutes = Math.max(15, Math.min(25, startKm ? startKm * 2 : 18)) // per session
  let stage = 0
  for (let i = 0; i < total; i++) {
    ctx.week = i
    const deload = (i + 1) % DELOAD_EVERY === 0
    if (i > 0 && !deload && !weeks[i - 1].deload) { minutes = Math.round(minutes * RAMP); stage++ }
    const mins = deload ? Math.round(minutes * DELOAD) : minutes
    const st = deload ? Math.max(0, stage - 1) : stage
    const weekStart = addDays(startDate, i * 7)
    const sessions = []
    for (const d of days) {
      const date = addDays(weekStart, d)
      const lng = d === L
      const m = lng ? Math.round(mins * 1.15) : mins
      if (i >= 4 && !deload && !lng && d === days.find((x) => x !== L) && RUNWALK[Math.min(st, RUNWALK.length - 1)].run >= 300) {
        const s = runWalkSession(ctx, date, m, st, 'Run/walk with strides')
        s.description += ' Finish with 4 gentle strides if everything feels good.'
        sessions.push(s)
      } else sessions.push(runWalkSession(ctx, date, m, st, lng ? 'Longer run/walk' : 'Run/walk'))
    }
    addStrengthAndRest(ctx, sessions, weekStart, includeStrength ? (i < 2 ? 1 : 2) : 0)
    weeks.push({ index: i, startDate: weekStart, focus: deload ? 'Lighter week' : i < 3 ? 'Gentle return' : 'Rebuild', deload, targetKm: sumRunKm(sessions), sessions })
  }
  return weeks
}

export function goalLabel(goal) {
  return GOAL_LABEL[goal] || goal
}
export { DAY_LABEL }

// Rebuild one session of a given type for an existing plan (used when adapting or editing).
export function makeSession(plan, type, date, km, { weekKm = null, id = null } = {}) {
  const ctx = { planId: plan.id, week: 0, daysPerWeek: plan.settings?.daysPerWeek ?? 3, longRunDay: plan.settings?.longRunDay ?? 'sun', paces: plan.fitness.paces, fitness: plan.fitness }
  const k = km != null ? r1(km) : null
  let s
  if (type === 'easy' || type === 'recovery') s = easySession(ctx, date, k ?? 4, type)
  else if (type === 'long') s = longSession(ctx, date, k ?? 8)
  else if (type === 'strides') s = stridesSession(ctx, date, k ?? 4)
  else if (type === 'tempo' || type === 'intervals') s = qualitySession(ctx, date, k ?? 6, type, weekKm ?? (k ?? 6) * 4)
  else if (type === 'strength') s = strengthSession(ctx, date)
  else s = restSession(ctx, date)
  if (id) s.id = id
  return s
}
