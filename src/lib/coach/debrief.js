// Coach's notes after an activity: 2 to 4 short, rule-based notes (not AI) on how it felt, the plan, pacing, heart rate, load and ground.
import { distance } from '../engine/geo.js'
import { loadCheck } from '../engine/load.js'
import { isRun } from './plans.js'
import { toISO } from './dates.js'
import { formatPace, formatRange } from './paces.js'
import { areaWords } from './checkin.js'

const EASY = ['easy', 'long', 'recovery', 'strides']
const r1 = (x) => Math.round(x * 10) / 10
const kmText = (k) => `${r1(k)} km`

// Seconds per full kilometre along the track.
export function kmSplits(track = []) {
  const out = []
  let d = 0
  let lastT = track[0]?.t
  let next = 1000
  for (let i = 1; i < track.length; i++) {
    d += distance(track[i - 1], track[i])
    if (d >= next) {
      out.push((track[i].t - lastT) / 1000)
      lastT = track[i].t
      next += 1000
    }
  }
  return out
}

// The run planned for the day this activity started, if there was one.
export function plannedFor(plan, activity) {
  if (!plan?.weeks || !activity) return null
  const day = toISO(activity.startedAt)
  const same = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.date === day && isRun(s) && ['planned', 'done'].includes(s.status))
  return same.find((s) => s.actual?.activityId === activity.id) || same.find((s) => s.status === 'planned') || same[0] || null
}

function planNote(a, planned, splits) {
  const kmDone = (a.distanceM || 0) / 1000
  const want = planned.distanceKm || 0
  const parts = []
  let fast = false
  let longer = false
  if (want > 0) {
    if (kmDone > want * 1.25 && kmDone - want >= 1.5) { parts.push(`You ran ${kmText(kmDone)}, a fair bit more than the ${kmText(want)} planned.`); longer = true }
    else if (kmDone < want * 0.8) parts.push(`You ran ${kmText(kmDone)} of the ${kmText(want)} planned. Every run counts, and there's nothing to make up.`)
    else parts.push(`You ran ${kmText(kmDone)} with ${kmText(want)} planned. Spot on.`)
  }
  const range = planned.paceRange
  const paceS = a.paceSPerKm
  if (range && paceS && !planned.runWalk) {
    if (EASY.includes(planned.type)) {
      if (paceS < range[0] - 10) { parts.push(`Your pace was ${formatPace(paceS)} per km, quicker than the easy range of ${formatRange(range)}. Easy days build your base, so slower is the win here.`); fast = true }
      else if (paceS <= range[1] + 15) parts.push(`Your pace of ${formatPace(paceS)} per km sat right in your easy range.`)
      else parts.push(`Your pace was ${formatPace(paceS)} per km, a touch slower than planned. That's fine on an easy day.`)
    } else if (['tempo', 'intervals'].includes(planned.type) && splits.length) {
      const best = Math.min(...splits)
      if (best <= range[1] + 5) parts.push(`Your quickest km was ${formatPace(best)}, right on ${planned.type} pace.`)
      else parts.push(`Your quickest km was ${formatPace(best)}. ${planned.type === 'tempo' ? 'Tempo' : 'Interval'} pace comes with time, so no rush.`)
    } else if (planned.type === 'race') {
      parts.push(`You averaged ${formatPace(paceS)} per km. Well done on getting to the start line.`)
    }
  }
  if (!parts.length) return null
  return { kind: 'plan', fast, longer, text: `${planned.title}: ${parts.join(' ')}` }
}

function splitNote(splits, planned) {
  if (splits.length < 3 || ['intervals', 'strides'].includes(planned?.type)) return null
  const half = Math.floor(splits.length / 2)
  const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
  const first = avg(splits.slice(0, half))
  const second = avg(splits.slice(splits.length - half))
  const change = (second - first) / first
  if (change < -0.02) return { kind: 'split', split: 'negative', text: 'You finished faster than you started: a negative split. That is great pacing.' }
  if (change <= 0.04) return { kind: 'split', split: 'even', text: 'Your km splits were nice and even.' }
  return { kind: 'split', split: 'positive', text: `Your second half was about ${Math.round(change * 100)}% slower than your first. Starting a little easier can help you finish strong.` }
}

function bodyNote(track, mode) {
  const hrPts = track.filter((p) => Number.isFinite(p.hr))
  const cadPts = mode === 'run' ? track.filter((p) => Number.isFinite(p.cad) && p.cad > 0) : []
  const bits = []
  let drift = false
  if (hrPts.length >= 20 && hrPts.length >= track.length * 0.5) {
    const avg = Math.round(hrPts.reduce((s, p) => s + p.hr, 0) / hrPts.length)
    const half = Math.floor(hrPts.length / 2)
    const a1 = hrPts.slice(0, half).reduce((s, p) => s + p.hr, 0) / half
    const a2 = hrPts.slice(half).reduce((s, p) => s + p.hr, 0) / (hrPts.length - half)
    const rise = (a2 - a1) / a1
    if (rise > 0.08) { bits.push(`Your heart rate averaged ${avg} bpm and crept up about ${Math.round(rise * 100)}% in the second half. Heat, hills or a quick start can do that.`); drift = true }
    else bits.push(`Your heart rate averaged ${avg} bpm and stayed steady.`)
  }
  if (cadPts.length >= 20 && cadPts.length >= track.length * 0.5) {
    const avg = Math.round(cadPts.reduce((s, p) => s + p.cad, 0) / cadPts.length)
    if (avg < 155) bits.push(`Cadence averaged ${avg} steps per minute. Slightly shorter, quicker steps can feel smoother.`)
    else bits.push(`Cadence averaged ${avg} steps per minute, a good rhythm.`)
  }
  return bits.length ? { kind: 'body', drift, text: bits.join(' ') } : null
}

function loadNote(a, recent, now) {
  const list = (recent || []).filter((x) => x.id !== a.id && !x.rejected)
  list.push(a)
  const lc = loadCheck(list, 0, now, a.mode)
  if (lc.level === 'ok') return lc.ratio ? { kind: 'load', level: 'ok', text: `That makes ${kmText(lc.thisWeekKm)} this week, in line with your usual ${kmText(lc.usualKm)}.` } : null
  const text = lc.ratio
    ? `That makes ${kmText(lc.thisWeekKm)} this week, about ${Math.round((lc.ratio - 1) * 100)}% above your usual ${kmText(lc.usualKm)}. Your legs will thank you for a lighter day or two.`
    : `That makes ${kmText(lc.thisWeekKm)} this week, a big week for where you're at. Your legs will thank you for a lighter day or two.`
  return { kind: 'load', level: lc.level, text }
}

function territoryNote(a, result) {
  const diff = result?.diff
  const claimed = diff ? diff.claimed.length : a.claimed || 0
  const taken = diff ? diff.taken.length : a.taken || 0
  const reinforced = diff ? diff.reinforced.length : a.reinforced || 0
  if (!a.loops) return { kind: 'territory', text: "No loop this time, but it still counts towards your week." }
  if (taken) {
    const names = [...new Set((result?.battles || []).map((b) => b.defenderName).filter(Boolean))]
    return { kind: 'territory', text: `You took ${taken} ${taken === 1 ? 'hex' : 'hexes'}${names.length === 1 ? ` from ${names[0]}` : ''}. Another run through them this week keeps them yours.` }
  }
  if (claimed) return { kind: 'territory', text: `Your loop added ${claimed} new ${claimed === 1 ? 'hex' : 'hexes'} to your ground.` }
  if (reinforced) return { kind: 'territory', text: `You strengthened ${reinforced} ${reinforced === 1 ? 'hex' : 'hexes'} you already held, so they'll hold out longer.` }
  return { kind: 'territory', text: 'Your loop closed. Try one that pushes into new streets next time.' }
}

// What the runner told us in the post-run check-in (activity.feel, activity.hurt).
function feelNote(a, planned) {
  const f = a.feel
  if (f == null) return null
  const easyDay = planned && EASY.includes(planned.type)
  if (f === 'hurt') {
    const where = a.hurt?.area ? `your ${areaWords(a.hurt.area)}` : 'something'
    const text = a.hurt?.level === 'hurt'
      ? `You said ${where} hurts. Please rest it and see a GP or physio before running again.`
      : `You said ${where} hurt. Keep the next few runs easy and stop if it gets worse.`
    return { kind: 'feel', feel: f, text }
  }
  if (f >= 4) return { kind: 'feel', feel: f, text: `You said that felt ${f >= 5 ? 'all out' : 'very hard'}. Next easy run, go slower than you think.` }
  if (f === 3) return { kind: 'feel', feel: f, text: easyDay ? 'You said that felt hard. Next easy run, go slower than you think.' : 'You said that was hard work. A good, honest effort.' }
  return { kind: 'feel', feel: f, text: easyDay ? `You said that felt ${f === 1 ? 'easy' : 'comfortable'}. That is just how an easy run should feel.` : `You said that felt ${f === 1 ? 'easy' : 'comfortable'}. Nice and controlled.` }
}

function suggestion(found, a, planned) {
  const plan = found.find((n) => n.kind === 'plan')
  const load = found.find((n) => n.kind === 'load')
  const split = found.find((n) => n.kind === 'split')
  const body = found.find((n) => n.kind === 'body')
  let text
  if (a.feel === 'hurt') text = 'Next time, keep it short and easy, and stop if it starts to hurt.'
  else if (load && load.level !== 'ok') text = 'Next time, keep it short and easy, or take a rest day. Ground waits for you.'
  else if (plan?.fast) text = `Next time, aim for ${formatRange(planned.paceRange)}. If you can chat in full sentences, you're there.`
  else if (plan?.longer) text = 'Next time, stick close to the planned distance. Your next session will feel better for it.'
  else if (split?.split === 'positive') text = 'Next time, run the first km 10 to 15 seconds slower and see how the finish feels.'
  else if (body?.drift) text = 'Next time, start a little slower and carry water if it is warm.'
  else if (!a.loops) text = 'Next time, finish within 30 m of where you started to close a loop and claim the ground inside.'
  else text = 'Next time, try a loop next door to this one to grow your ground.'
  return { kind: 'next', text }
}

// activity: the saved activity. track: its points. planned: today's session
// (see plannedFor). recent: other recent activities. result: the save response
// (diff and battles), when there is one.
export function debrief({ activity, track = [], planned = null, recent = [], result = null, now = Date.now() } = {}) {
  const a = activity
  if (!a || a.rejected) return []
  const plan = planned && a.mode === 'run' ? planned : null
  const splits = a.mode === 'ride' ? [] : kmSplits(track)
  const candidates = [
    [0, feelNote(a, plan)],
    [1, plan ? planNote(a, plan, splits) : null],
    [3, a.mode === 'ride' ? null : splitNote(splits, plan)],
    [4, bodyNote(track, a.mode)],
    [2, loadNote(a, recent, now)],
    [5, territoryNote(a, result)],
  ]
  // Warnings about load outrank pacing; a calm load note is the first to go.
  for (const c of candidates) if (c[1]?.kind === 'load' && c[1].level === 'ok') c[0] = 6
  const order = candidates.map((c) => c[1])
  const keep = candidates.filter((c) => c[1]).sort((x, y) => x[0] - y[0]).slice(0, 3).map((c) => c[1])
  const found = order.filter((n) => n && keep.includes(n))
  return [...found, suggestion(found, a, plan)]
}
