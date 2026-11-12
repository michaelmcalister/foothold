// Story missions (the Trailkeepers, Ember Run and The Night Job): scripts, the engine that plays them during a run, progress
// on this device, and the small helpers the Record and Result screens use.
import { CHAIN, missionById } from './scripts.js'
import { surgeCount } from './engine.js'
import { metaLine } from './catalogue.js'
export * from './scripts.js'
export * from './engine.js'
export * from './progress.js'

/** "20 min · Gentle · 3 surges" for the picker. */
export function missionMeta(m) {
  return metaLine(m, m.beats ? surgeCount(m) : m.surges)
}

/**
 * Which mission suits today's planned session, if any. Easy days get the
 * steady scout; tempo and interval days get the latest open surge mission.
 * Returns { id, text } or null.
 */
export function suggestMission(sessionType, unlocked) {
  if (!sessionType) return null
  if (['easy', 'recovery', 'long'].includes(sessionType)) {
    return { id: 'steady-scout', text: `Today's ${sessionType === 'long' ? 'long' : 'easy'} run, as a mission? Try Steady Scout.` }
  }
  if (['tempo', 'intervals', 'fartlek'].includes(sessionType)) {
    const open = CHAIN.filter((id) => unlocked.has(id))
    const pick = [...open].reverse().find((id) => ['magpie-season', 'hilltop-crown'].includes(id)) || open[open.length - 1]
    const m = missionById(pick)
    if (!m) return null
    return { id: m.id, text: `Today's ${sessionType === 'tempo' ? 'tempo run' : 'intervals'}, as a mission? Try ${m.title}.` }
  }
  return null
}

/** The result screen's heading for a mission run. */
export function missionHeadline(s) {
  if (!s) return ''
  const surges = s.surgesTotal ? `, ${s.surgesDone} of ${s.surgesTotal} ${s.surgesTotal === 1 ? 'surge' : 'surges'}` : ''
  const quiz = s.quizTotal ? `, ${s.quizRight} of ${s.quizTotal} ${s.quizTotal === 1 ? 'question' : 'questions'} right` : ''
  const points = s.score != null ? `, ${s.score.toLocaleString('en-AU')} points` : ''
  return `${s.completed ? 'Mission complete' : 'Mission played'}: ${s.title}${surges}${quiz}${points}`
}
