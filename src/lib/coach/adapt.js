// Adapts a plan to real life (done, missed, sick, injury, edits, holidays) without ever cramming missed volume back in.
import { loadCheck } from '../engine/load.js'
import { makeSession, generatePlan, isRun, isQuality, sumRunKm, LONG_CAP_KM, RAMP } from './plans.js'
import { toISO, toMs, addDays, diffDays, dayName, fmtDate, DAY_MS } from './dates.js'

const r1 = (x) => Math.round(x * 10) / 10
const OPEN = ['planned']
const isOpen = (s) => OPEN.includes(s.status)
const runOpen = (s) => isRun(s) && isOpen(s)
const COMEBACK = 0.7

function clone(plan) {
  return typeof structuredClone === 'function' ? structuredClone(plan) : JSON.parse(JSON.stringify(plan))
}
export function allSessions(plan) {
  return plan.weeks.flatMap((w) => w.sessions)
}
function findSession(plan, id) {
  for (const w of plan.weeks) {
    const s = w.sessions.find((x) => x.id === id)
    if (s) return { week: w, session: s }
  }
  return { week: null, session: null }
}
function weekOf(plan, iso) {
  return plan.weeks.find((w) => diffDays(w.startDate, iso) >= 0 && diffDays(w.startDate, iso) < 7) || null
}
const liveKm = (w) => sumRunKm(w.sessions.filter((s) => !['skipped', 'missed', 'cancelled'].includes(s.status)))
function refresh(plan) {
  plan.weeks.forEach((w, i) => {
    w.index = i
    w.sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type === 'strength' ? 1 : -1))
    w.targetKm = liveKm(w)
  })
  const last = plan.weeks[plan.weeks.length - 1]
  const dates = last.sessions.map((s) => s.date).sort()
  plan.endDate = dates.length ? dates[dates.length - 1] : addDays(last.startDate, 6)
}

// Replace a session with a rebuilt one of another type or distance, keeping its identity and history.
function rebuild(plan, week, s, type, km, extra = {}) {
  if (s.runWalk) {
    const f = km != null && s.distanceKm ? km / s.distanceKm : 1
    Object.assign(s, { distanceKm: r1((s.distanceKm || 0) * f), durationMin: Math.round((s.durationMin || 0) * f) }, extra)
    return s
  }
  const fresh = makeSession(plan, type, s.date, km, { weekKm: week ? liveKm(week) : null, id: s.id })
  const keep = { id: s.id, status: s.status, original: s.original || { type: s.type, distanceKm: s.distanceKm, date: s.date } }
  for (const k of Object.keys(s)) delete s[k]
  Object.assign(s, fresh, keep, extra)
  return s
}
function scale(plan, week, s, factor, { easyOnly = false } = {}) {
  if (!isRun(s) || s.type === 'race') return
  const type = easyOnly && (isQuality(s) || s.type === 'strides') ? 'easy' : s.type
  const km = Math.max(1.5, r1((s.distanceKm || 0) * factor))
  rebuild(plan, week, s, type, km, { adapted: true })
}

// Keep future weeks within 10% of the week before, so a comeback never jumps straight back to full load.
function reRamp(plan, fromWeekIdx, baselineKm = 0) {
  let prev = null
  for (let i = Math.max(0, fromWeekIdx); i < plan.weeks.length; i++) {
    const w = plan.weeks[i]
    const km = liveKm(w)
    if (prev == null) { prev = km; continue }
    if (w.taper) { prev = Math.min(prev, km); continue }
    const allowed = w.deload ? prev * 0.85 : Math.max(prev * RAMP, baselineKm)
    if (km > allowed + 0.05 && km > 0) {
      const f = allowed / km
      for (const s of w.sessions) if (runOpen(s) && s.type !== 'race') scale(plan, w, s, f)
    }
    if (!w.deload) prev = liveKm(w) // after a deload, compare with the level before it
  }
}

function lastHealthyKm(plan, beforeIdx) {
  for (let i = beforeIdx - 1; i >= 0; i--) if (!plan.weeks[i].deload) return plan.weeks[i].targetKm
  return plan.weeks[beforeIdx]?.targetKm ?? 0
}

// Shared by sick and holiday: skip a window, ease back in, and push the plan later when there's room.
function pause(plan, from, to, { reason, changes, warnings, comeback = COMEBACK, keepEasy = false }) {
  const days = diffDays(from, to) + 1
  let skipped = 0
  for (const w of plan.weeks) for (const s of w.sessions) {
    if (s.date < from || s.date > to || !isOpen(s)) continue
    if (keepEasy && ['easy', 'recovery'].includes(s.type)) { s.optional = true; continue }
    if (keepEasy && isQuality(s)) { rebuild(plan, w, s, 'easy', s.distanceKm, { optional: true }); continue }
    s.status = 'skipped'
    s.reason = reason
    if (s.type !== 'rest') skipped++
  }
  if (skipped) changes.push(`Skipped ${skipped} session${skipped === 1 ? '' : 's'} from ${fmtDate(from)} to ${fmtDate(to)}. You don't need to make them up.`)

  const firstIdx = plan.weeks.findIndex((w) => diffDays(w.startDate, from) < 7 && diffDays(w.startDate, from) >= 0)
  const lastIdx = plan.weeks.findIndex((w) => diffDays(w.startDate, to) < 7 && diffDays(w.startDate, to) >= 0)
  const fi = firstIdx < 0 ? 0 : firstIdx
  const li = lastIdx < 0 ? plan.weeks.length - 1 : lastIdx
  const baseline = days <= 7 ? lastHealthyKm(plan, fi) : 0

  // Extend: no race, or the race is after the current end with room to spare.
  const buffer = plan.raceDate ? Math.floor(diffDays(plan.endDate, plan.raceDate) / 7) : Infinity
  const wantWeeks = Math.ceil(days / 7)
  const addWeeks = days >= 3 && !keepEasy ? Math.min(wantWeeks, buffer) : 0
  if (addWeeks > 0 && fi >= 0 && fi < plan.weeks.length) {
    const shift = addWeeks * 7
    for (let i = li + 1; i < plan.weeks.length; i++) {
      const w = plan.weeks[i]
      w.startDate = addDays(w.startDate, shift)
      for (const s of w.sessions) { s.date = addDays(s.date, shift); s.day = dayName(s.date); s.id = `${s.id}-x${addWeeks}` }
    }
    // Redo the weeks that were lost, as fresh copies straight after the break.
    const copies = []
    for (let k = 0; k < addWeeks; k++) {
      const src = plan.weeks[Math.min(fi + k, li)]
      const start = addDays(plan.weeks[li].startDate, 7 * (k + 1))
      copies.push({
        index: 0,
        startDate: start,
        focus: 'Back into it',
        deload: false,
        added: true,
        targetKm: 0,
        sessions: src.sessions.map((s) => {
          const date = addDays(start, diffDays(src.startDate, s.date))
          const c = { ...clone(s), id: `${s.id}-redo${k}`, date, day: dayName(date), status: 'planned' }
          delete c.reason
          delete c.actual
          return c
        }),
      })
    }
    plan.weeks.splice(li + 1, 0, ...copies)
    plan.extendedBy = (plan.extendedBy || 0) + addWeeks
    changes.push(`Added ${addWeeks} week${addWeeks === 1 ? '' : 's'} so you can pick up where you left off.`)
  } else if (days >= 3 && plan.raceDate && !keepEasy) {
    warnings.push(`Your race on ${fmtDate(plan.raceDate)} stays put, so we've eased you back in rather than squeezing the missed kilometres in. If the build now feels rushed, a later race is a good option.`)
  }
  refresh(plan)

  // Comeback: the seven days after the break at about 70%, easy only.
  const resumeTo = addDays(to, 7)
  let eased = 0
  for (const w of plan.weeks) for (const s of w.sessions) {
    if (s.date <= to || s.date > resumeTo || !runOpen(s) || s.type === 'race') continue
    scale(plan, w, s, comeback, { easyOnly: true })
    eased++
  }
  if (eased) changes.push(`The week after (${fmtDate(addDays(to, 1))} on) is about ${Math.round(comeback * 100)}% of normal and all easy.`)
  refresh(plan)
  const resumeWeek = plan.weeks.findIndex((w) => diffDays(w.startDate, addDays(to, 1)) < 7 && diffDays(w.startDate, addDays(to, 1)) >= 0)
  reRamp(plan, Math.max(0, resumeWeek), baseline)
  refresh(plan)
}

export function adaptPlan(planIn, event, today = Date.now()) {
  const plan = clone(planIn)
  const changes = []
  const warnings = []
  const t = toISO(today)
  const ev = event || {}
  plan.history = [...(plan.history || []), { at: t, type: ev.type }]

  switch (ev.type) {
    case 'completed': {
      const { week, session: s } = findSession(plan, ev.sessionId)
      if (!s) { warnings.push("We couldn't find that session."); break }
      const a = ev.activity || {}
      const km = r1((a.distanceM || 0) / 1000)
      const paceS = a.movingS && a.distanceM ? Math.round(a.movingS / (a.distanceM / 1000)) : null
      s.status = 'done'
      s.actual = { distanceKm: km, movingS: a.movingS ?? null, paceS, activityId: a.id ?? null, startedAt: a.startedAt ?? null }
      changes.push(`Marked ${s.title} as done.`)
      const planned = s.distanceKm || 0
      const longer = planned > 0 && km > planned * 1.25 && km - planned >= 1.5
      const easyType = ['easy', 'long', 'recovery', 'strides'].includes(s.type)
      const harder = easyType && paceS && s.paceRange && paceS < s.paceRange[0] - 20
      const effort = a.perceivedEffort != null && a.perceivedEffort >= 8 && easyType
      if (longer || harder || effort) {
        const next = allSessions(plan).find((x) => runOpen(x) && isQuality(x) && x.date > s.date && diffDays(s.date, x.date) <= 4)
        if (next) {
          const w = weekOf(plan, next.date)
          rebuild(plan, w, next, 'easy', next.distanceKm, { adapted: true })
          changes.push(`That was ${longer ? 'a fair bit longer' : 'quicker and harder'} than planned, so ${fmtDate(next.date)} is now an easy run to let you recover.`)
        }
      }
      refresh(plan)
      break
    }
    case 'missed': {
      const { session: s } = findSession(plan, ev.sessionId)
      if (!s) { warnings.push("We couldn't find that session."); break }
      s.status = 'missed'
      changes.push(`${s.title} is marked as missed. No need to make it up; the rest of the week stays as planned.`)
      refresh(plan)
      break
    }
    case 'sick': {
      const days = Math.max(1, Math.round(ev.days || 1))
      const from = toISO(ev.from || t)
      const to = addDays(from, days - 1)
      pause(plan, from, to, { reason: 'sick', changes, warnings })
      plan.paused = null
      changes.push('Rest up. If it was below the neck (chest, fever, aches), wait until you have been symptom free for a day or two before running.')
      break
    }
    case 'holiday': {
      const from = toISO(ev.from || t)
      const to = toISO(ev.to || from)
      if (to < from) { warnings.push('The holiday ends before it starts.'); break }
      pause(plan, from, to, { reason: 'holiday', changes, warnings, comeback: diffDays(from, to) >= 6 ? 0.8 : 1, keepEasy: !!ev.keepEasy })
      if (ev.keepEasy) changes.push('Easy runs on holiday are optional. Quality sessions are now easy runs.')
      break
    }
    case 'injury': {
      const area = ev.area || 'that spot'
      const sev = ev.severity || 'niggle'
      plan.injuries = [...(plan.injuries || []), { area, severity: sev, at: t }]
      if (sev === 'niggle') {
        const next = allSessions(plan).find((x) => runOpen(x) && isQuality(x) && x.date >= t)
        if (next) {
          rebuild(plan, weekOf(plan, next.date), next, 'easy', Math.max(1.5, r1(next.distanceKm * 0.8)), { adapted: true })
          changes.push(`Swapped ${fmtDate(next.date)}'s session for an easy run while your ${area} settles.`)
        } else changes.push(`Keep your runs easy while your ${area} settles.`)
        changes.push(`If it gets worse or changes how you run, log it as sore.`)
      } else if (sev === 'sore') {
        const end = addDays(t, 4)
        let n = 0
        for (const w of plan.weeks) for (const s of w.sessions) {
          if (s.date < t || s.date > end || !runOpen(s) || s.type === 'race') continue
          scale(plan, w, s, 0.6, { easyOnly: true })
          if (s.type === 'long') rebuild(plan, w, s, 'easy', s.distanceKm, { adapted: true })
          n++
        }
        changes.push(`The next 5 days are easy only, at about 60% of the planned distance${n ? '' : ' (nothing was planned)'}.`)
        changes.push(`Stop any run where your ${area} hurts more as you go.`)
        warnings.push(`If your ${area} is still sore after 5 days, please see a physio before building back up.`)
        refresh(plan)
        reRamp(plan, Math.max(0, plan.weeks.findIndex((w) => diffDays(w.startDate, end) >= 0 && diffDays(w.startDate, end) < 7)))
        refresh(plan)
      } else {
        let n = 0
        for (const w of plan.weeks) for (const s of w.sessions) {
          if (s.date < t || !isOpen(s)) continue
          if (isRun(s) || s.type === 'strength') { s.status = 'cancelled'; s.reason = 'injury'; n++ }
        }
        plan.paused = { reason: 'injury', area, since: t }
        refresh(plan)
        changes.push(`Paused all ${n} upcoming running and strength sessions.`)
        warnings.push(`Pain that changes how you move needs a proper look. Please see a GP or physio about your ${area} before running again.`)
        const st = plan.settings || {}
        plan.offer = {
          goal: 'return',
          message: 'When you get the all clear, a gentle run/walk return plan is ready to go.',
          options: { goal: 'return', daysPerWeek: Math.min(4, st.daysPerWeek || 3), longRunDay: st.longRunDay || 'sun', currentWeeklyKm: 0, includeStrength: !!st.includeStrength },
        }
        try {
          plan.offer.preview = generatePlan({ ...plan.offer.options, today: addDays(t, 7) }).weeks.slice(0, 2).map((w) => ({ index: w.index, targetKm: w.targetKm, focus: w.focus }))
        } catch { /* preview is optional */ }
      }
      break
    }
    case 'edit': {
      const { week, session: s } = findSession(plan, ev.sessionId)
      if (!s) { warnings.push("We couldn't find that session."); break }
      if (s.status === 'done') warnings.push('That session is already done. Editing it only changes the plan, not your logged run.')
      const ch = ev.changes || {}
      const before = { type: s.type, distanceKm: s.distanceKm, date: s.date }
      const type = ch.type || s.type
      const km = ch.distanceKm != null ? Math.max(0, Number(ch.distanceKm)) : s.distanceKm
      if (ch.type || ch.distanceKm != null) {
        if (ch.type && !['easy', 'long', 'tempo', 'intervals', 'strides', 'recovery', 'strength', 'rest'].includes(ch.type)) {
          warnings.push(`We don't know the session type "${ch.type}".`)
          break
        }
        rebuild(plan, week, s, type, ['strength', 'rest'].includes(type) ? null : km, { edited: true })
      }
      let target = week
      if (ch.date) {
        const nd = toISO(ch.date)
        target = weekOf(plan, nd)
        if (!target) { warnings.push(`${fmtDate(nd)} is outside this plan, so the date wasn't changed.`); target = week }
        else {
          s.date = nd
          s.day = dayName(nd)
          s.edited = true
          if (target !== week) {
            week.sessions.splice(week.sessions.indexOf(s), 1)
            target.sessions.push(s)
          }
        }
      }
      for (const k of ['title', 'description', 'durationMin']) if (ch[k] != null) { s[k] = ch[k]; s.edited = true }
      const bits = []
      if (s.type !== before.type) bits.push(`now ${s.type}`)
      if (s.distanceKm !== before.distanceKm && s.distanceKm != null) bits.push(`${s.distanceKm} km`)
      if (s.date !== before.date) bits.push(`moved to ${fmtDate(s.date)}`)
      changes.push(`Updated the session${bits.length ? `: ${bits.join(', ')}` : ''}.`)
      refresh(plan)
      for (const w of new Set([week, target])) warnings.push(...checkWeek(plan, w))
      if (Array.isArray(ev.activities)) {
        const tw = weekOf(plan, t)
        const remaining = tw ? sumRunKm(tw.sessions.filter((x) => runOpen(x) && x.date >= t)) : 0
        const lc = loadCheck(ev.activities, remaining, toMs(t) + DAY_MS, 'run')
        if (lc.level !== 'ok') warnings.push(`With this change your week would be about ${lc.thisWeekKm} km against a usual ${lc.usualKm} km. Worth keeping it a bit lighter.`)
      }
      break
    }
    default:
      warnings.push(`Unknown event: ${ev.type}`)
  }
  plan.warnings = [...new Set(warnings)]
  return { plan, changes, warnings: [...new Set(warnings)] }
}

// The load checks we run whenever someone edits a week.
export function checkWeek(plan, week) {
  const out = []
  if (!week) return out
  const i = plan.weeks.indexOf(week)
  const live = week.sessions.filter((s) => !['skipped', 'missed', 'cancelled'].includes(s.status))
  const km = sumRunKm(live)
  let prev = null
  for (let j = i - 1; j >= 0; j--) { const w = plan.weeks[j]; if (!w.deload) { prev = w.targetKm; break } }
  if (prev && !week.taper && km > prev * RAMP + 0.05) out.push(`Week ${i + 1} is now ${km} km, ${Math.round((km / prev - 1) * 100)}% up on the week before. We suggest keeping rises to 10% or less.`)
  if (week.deload && prev && km > prev * 0.85) out.push(`Week ${i + 1} is meant to be a lighter week. It's now ${km} km.`)
  const q = live.filter(isQuality).sort((a, b) => (a.date < b.date ? -1 : 1))
  if (q.length > 2) out.push(`That's ${q.length} hard sessions in week ${i + 1}. Two is plenty.`)
  for (let k = 1; k < q.length; k++) if (diffDays(q[k - 1].date, q[k].date) <= 1) out.push(`Hard sessions on ${fmtDate(q[k - 1].date)} and ${fmtDate(q[k].date)} are back to back. Try leaving an easy day between them.`)
  const runsByDay = new Map()
  for (const s of live.filter(isRun)) runsByDay.set(s.date, (runsByDay.get(s.date) || 0) + 1)
  for (const [d, n] of runsByDay) if (n > 1) out.push(`There are ${n} runs on ${fmtDate(d)}.`)
  const cap = LONG_CAP_KM[plan.goal] ?? 32
  for (const s of live.filter((x) => isRun(x) && x.type !== 'race')) {
    if (s.distanceKm > cap) out.push(`${s.distanceKm} km is longer than we'd suggest for this plan (${cap} km max).`)
    else if (s.type === 'long' && km > 0 && s.distanceKm > km * 0.3 + 0.05 && km >= 15) out.push(`The long run is ${Math.round((s.distanceKm / km) * 100)}% of the week. Around 30% or less is kinder on your legs.`)
  }
  return out
}

// The next thing to do, from today on. Rest days are skipped.
export function nextSession(plan, today = Date.now()) {
  if (!plan?.weeks) return null
  const t = toISO(today)
  return allSessions(plan)
    .filter((s) => s.status === 'planned' && s.type !== 'rest' && s.date >= t)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type === 'strength' ? 1 : -1))[0] || null
}

// How this week is going: planned against what actually happened.
export function weekSummary(plan, activities = [], today = Date.now()) {
  const t = toISO(today)
  const w = weekOf(plan, t) || (t < plan.startDate ? plan.weeks[0] : plan.weeks[plan.weeks.length - 1])
  const start = toMs(w.startDate)
  const end = start + 7 * DAY_MS
  const runs = (activities || []).filter((a) => (a.mode ?? 'run') === 'run' && a.startedAt >= start && a.startedAt < end)
  const doneKm = r1(runs.reduce((s, a) => s + (a.distanceM || 0) / 1000, 0))
  const live = w.sessions.filter((s) => s.type !== 'rest' && !['skipped', 'cancelled'].includes(s.status))
  const runSessions = live.filter(isRun)
  const remaining = runSessions.filter((s) => s.status === 'planned' && s.date >= t)
  const remainingKm = sumRunKm(remaining)
  const targetKm = w.targetKm
  const lc = loadCheck(activities || [], remainingKm, Math.min(end, toMs(t) + DAY_MS), 'run')
  const sessionsDone = live.filter((s) => s.status === 'done').length
  const missed = live.filter((s) => s.status === 'missed' || (s.status === 'planned' && s.date < t)).length
  let message
  if (sessionsDone === live.length && live.length) message = 'Week done. Nice work.'
  else if (doneKm >= targetKm && targetKm > 0) message = `You've hit ${doneKm} km already. The rest of the week can be easy.`
  else if (missed) message = `${doneKm} of ${targetKm} km so far. Missed sessions don't need making up.`
  else message = `${doneKm} of ${targetKm} km so far.`
  return {
    index: w.index,
    weekNumber: w.index + 1,
    totalWeeks: plan.weeks.length,
    focus: w.focus,
    deload: !!w.deload,
    startDate: w.startDate,
    endDate: addDays(w.startDate, 6),
    targetKm,
    doneKm,
    remainingKm,
    sessionsDone,
    sessionsTotal: live.length,
    missed,
    next: nextSession(plan, t),
    load: { level: lc.level, usualKm: lc.usualKm, thisWeekKm: lc.thisWeekKm, ratio: lc.ratio },
    onTrack: doneKm + remainingKm >= targetKm * 0.8,
    message,
  }
}
