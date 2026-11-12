// Story progress kept with the account (src/lib/missions/progress.js syncs
// it), so a new phone keeps your place in every series. Also the weekly
// story nudge: a player part way through a series who hasn't run for a few
// days gets one notice a week that their next episode is waiting.
import { notify } from './db.js'
import { MISSIONS, CHAINS, SAGAS } from '../src/lib/missions/scripts.js'

const known = new Set(MISSIONS.map((m) => m.id))
const DAY = 86400000

/** GET and POST /api/missions/progress. Returns undefined for other paths. */
export async function missionsRoute({ env, user, path, m, body, now }) {
  if (path !== '/api/missions/progress') return undefined
  if (m === 'GET') {
    const rows = (await env.DB.prepare('SELECT mission_id, tries, completed, last_at FROM mission_progress WHERE user_id = ?').bind(user.id).all()).results
    return { progress: Object.fromEntries(rows.map((r) => [r.mission_id, { tries: r.tries, completed: r.completed, lastAt: r.last_at }])) }
  }
  if (m === 'POST') {
    // One try, or a whole device's progress at once (the first sync)
    const items = Array.isArray(body?.items) ? body.items.slice(0, 500) : [body]
    const stmts = []
    for (const it of items) {
      if (!it || !known.has(it.id)) continue
      const tries = Math.max(0, Math.min(1000, Math.floor(Number(it.tries ?? 1)) || 0))
      const completed = Math.max(0, Math.min(tries, Math.floor(Number(it.completed ?? 0)) || 0))
      const at = Number.isFinite(it.lastAt) ? Math.min(now, it.lastAt) : now
      // merge: keep the larger counts, so syncing twice never doubles anything
      stmts.push(env.DB.prepare(
        `INSERT INTO mission_progress (user_id, mission_id, tries, completed, last_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, mission_id) DO UPDATE SET
           tries = CASE WHEN ? = 1 THEN mission_progress.tries + 1 ELSE MAX(mission_progress.tries, excluded.tries) END,
           completed = CASE WHEN ? = 1 THEN mission_progress.completed + excluded.completed ELSE MAX(mission_progress.completed, excluded.completed) END,
           last_at = MAX(mission_progress.last_at, excluded.last_at)`,
      ).bind(user.id, it.id, it.add ? 1 : tries, completed, at, it.add ? 1 : 0, it.add ? 1 : 0))
    }
    if (!stmts.length) return { status: 400, error: "That isn't a story we know." }
    await env.DB.batch(stmts)
    return missionsRoute({ env, user, path, m: 'GET', body, now })
  }
  return undefined
}

/** The next episode in each series this player has started: [{ saga, title, mission }] */
export function nextEpisodes(progress) {
  const out = []
  for (const [saga, chain] of Object.entries(CHAINS)) {
    if (!chain.some((id) => progress[id]?.tries)) continue
    const next = chain.find((id) => !progress[id]?.tries)
    if (!next) continue
    const mission = MISSIONS.find((x) => x.id === next)
    out.push({ saga, title: SAGAS.find((s) => s.id === saga)?.title || '', mission, lastAt: Math.max(...chain.map((id) => progress[id]?.lastAt || 0)) })
  }
  return out.sort((a, b) => b.lastAt - a.lastAt)
}

/** The story nudge text for one waiting episode. */
export const storyNudgeText = (n) => `Episode ${n.mission.episode} of ${n.title} is waiting: ${n.mission.title}. Fancy a run?`

/**
 * The cron: once a week, players part way through a series, who haven't run
 * for three days, get one kind nudge. Returns how many.
 */
export async function storyNudges(env, now = Date.now()) {
  const rows = (await env.DB.prepare(
    `SELECT p.user_id, p.mission_id, p.tries, p.completed, p.last_at FROM mission_progress p
     WHERE p.user_id IN (SELECT user_id FROM mission_progress WHERE last_at >= ?)
       AND p.user_id NOT IN (SELECT user_id FROM activities WHERE started_at >= ?)`,
  ).bind(now - 60 * DAY, now - 3 * DAY).all()).results
  const byUser = new Map()
  for (const r of rows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, {})
    byUser.get(r.user_id)[r.mission_id] = { tries: r.tries, completed: r.completed, lastAt: r.last_at }
  }
  const week = Math.floor(now / (7 * DAY))
  const stmts = []
  for (const [userId, progress] of byUser) {
    const [first] = nextEpisodes(progress)
    if (first) stmts.push(notify(env, userId, 'story', storyNudgeText(first), { at: now, dayKey: `story:${week}` }))
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50))
  return stmts.length
}
