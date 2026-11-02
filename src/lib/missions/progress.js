// Mission progress on this device: which missions you've tried (any try,
// however short, unlocks the next one; never gated on how fast you went),
// and each run's mission result so the result screen can show it.
import { MISSIONS, CHAIN } from './scripts.js'

const KEY = 'fh-missions'
const RESULTS = 'fh-mission-results'

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {} } catch { return {} }
}
function write(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* private mode: fine */ }
}

/** { [missionId]: { tries, completed, lastAt } } */
export const loadProgress = () => read(KEY)

/** Missions you can pick, given progress. Pure. */
export function unlockedIds(progress = {}) {
  const open = new Set(MISSIONS.filter((m) => !CHAIN.includes(m.id)).map((m) => m.id))
  for (let i = 0; i < CHAIN.length; i++) {
    open.add(CHAIN[i])
    if (!progress[CHAIN[i]]?.tries) break
  }
  return open
}

/** Save a mission try. Any try counts. */
export function recordTry(summary, now = Date.now()) {
  if (!summary?.id) return
  const p = loadProgress()
  const was = p[summary.id] || { tries: 0, completed: 0 }
  p[summary.id] = { tries: was.tries + 1, completed: was.completed + (summary.completed ? 1 : 0), lastAt: now }
  write(KEY, p)
}

/** Keep a run's mission result (the last 20) for its result screen. */
export function saveResult(activityId, summary) {
  if (!activityId || !summary) return
  const all = read(RESULTS)
  all[activityId] = { ...summary, at: Date.now() }
  const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 20)
  write(RESULTS, Object.fromEntries(keep))
}
export const resultFor = (activityId) => read(RESULTS)[activityId] || null
