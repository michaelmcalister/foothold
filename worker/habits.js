// Habit features on the server: GET /api/streak (weekly streak with banked rest weeks, from activity start times) and the cron's milestone celebrations.

import { weeklyStreak, streakMilestoneNote, weekOf, prevWeek } from '../src/lib/engine/index.js'
import { notify, batched } from './db.js'

const MAX_ACTS = 20000

async function startTimes(env, userId) {
  const rows = (await env.DB.prepare('SELECT started_at FROM activities WHERE user_id = ? AND rejected = 0 ORDER BY started_at LIMIT ?')
    .bind(userId, MAX_ACTS).all()).results
  return rows.map((r) => ({ startedAt: r.started_at }))
}

/** GET /api/streak */
export async function streak(env, user, now = Date.now()) {
  return { streak: weeklyStreak({ activities: await startTimes(env, user.id), now }) }
}

/**
 * Cron: celebrate streak milestones (4, 8, 12, 26, 52 weeks), once each per
 * streak. Only ever good news: no reminders, no warnings about streaks.
 * Looks at players who got out this week or last.
 */
export async function streakNotices(env, now = Date.now()) {
  const since = prevWeek(weekOf(now)).start
  const users = (await env.DB.prepare('SELECT DISTINCT user_id FROM activities WHERE rejected = 0 AND started_at >= ? LIMIT 5000').bind(since).all()).results
  // start times for 90 players per query, not one query per player
  const times = new Map()
  const ids = users.map((u) => u.user_id)
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90)
    const rows = (await env.DB.prepare(`SELECT user_id, started_at FROM activities WHERE rejected = 0 AND user_id IN (${part.map(() => '?').join(',')}) ORDER BY started_at`).bind(...part).all()).results
    for (const r of rows) {
      const list = times.get(r.user_id) || []
      if (list.length < MAX_ACTS) list.push({ startedAt: r.started_at })
      times.set(r.user_id, list)
    }
  }
  const stmts = []
  for (const id of ids) {
    const note = streakMilestoneNote(weeklyStreak({ activities: times.get(id) || [], now }))
    if (note) stmts.push(notify(env, id, 'streak', note.text, { at: now, dayKey: note.key }))
  }
  await batched(env, stmts)
  return stmts.length
}
