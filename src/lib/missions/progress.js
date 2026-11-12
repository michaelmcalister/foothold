// Mission progress: which missions you've tried (any try, however short,
// unlocks the next one; never gated on how fast you went), and each run's
// mission result so the result screen can show it. Kept on this device and,
// when you're signed in, with your account too (worker/missions.js), so a
// new phone keeps your place. syncProgress() merges the two.
import { CATALOGUE as MISSIONS, CATALOGUE_CHAINS as CHAINS, CATALOGUE_SAGAS as SAGAS } from './catalogue.js'
import { api } from '../api/index.js'

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
  const chained = new Set(Object.values(CHAINS).flat())
  const open = new Set(MISSIONS.filter((m) => !chained.has(m.id)).map((m) => m.id))
  for (const chain of Object.values(CHAINS)) {
    for (let i = 0; i < chain.length; i++) {
      open.add(chain[i])
      if (!progress[chain[i]]?.tries) break
    }
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
  // and with the account, when there is one (fire and forget; the next sync catches up)
  api.missionTry?.({ id: summary.id, add: true, completed: summary.completed ? 1 : 0, lastAt: now }).catch(() => {})
}

/** Merge two progress maps, keeping the larger counts and the latest time. Pure. */
export function mergeProgress(a = {}, b = {}) {
  const out = { ...a }
  for (const [id, v] of Object.entries(b)) {
    const w = out[id] || { tries: 0, completed: 0, lastAt: 0 }
    out[id] = { tries: Math.max(w.tries || 0, v.tries || 0), completed: Math.max(w.completed || 0, v.completed || 0), lastAt: Math.max(w.lastAt || 0, v.lastAt || 0) }
  }
  return out
}

/** Bring this device and the account into step. Returns the merged progress. */
export async function syncProgress() {
  const local = loadProgress()
  try {
    const { progress: server } = await api.missionProgress()
    const merged = mergeProgress(local, server)
    write(KEY, merged)
    // Anything this phone knew that the account didn't: send it up once
    const missing = Object.entries(local).filter(([id, v]) => (server[id]?.tries || 0) < v.tries).map(([id, v]) => ({ id, ...v }))
    if (missing.length) await api.missionTry({ items: missing }).catch(() => {})
    return merged
  } catch {
    return local
  }
}

/** The next episode in each series you've started, most recent first: [{ saga, title, mission }]. Pure. */
export function continueList(progress = loadProgress()) {
  const out = []
  for (const [saga, chain] of Object.entries(CHAINS)) {
    if (!chain.some((id) => progress[id]?.tries)) continue
    const next = chain.find((id) => !progress[id]?.tries)
    if (!next) continue
    out.push({ saga, title: SAGAS.find((g) => g.id === saga)?.title || '', mission: MISSIONS.find((m) => m.id === next), lastAt: Math.max(...chain.map((id) => progress[id]?.lastAt || 0)) })
  }
  return out.sort((x, y) => y.lastAt - x.lastAt)
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
