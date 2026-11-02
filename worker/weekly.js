// Weekly quests, the explored map and the weekly recap on the server: what each
// activity passed through, the log of hexes rivals took, the three routes that
// read them, and the Monday "your week is ready" notice for the cron.

import { visitedCells, mergeExplored, weekOf, weekFor, prevWeek, isWeekKey, weekdayOf, weeklyQuests, weekRecap, MODES } from '../src/lib/engine/index.js'
import { parse, unpackTrack, rowToCell, notify, batched } from './db.js'

const WEEK = 7 * 86400000
const bad = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }

/** Statements to add after an activity is saved: its visited hexes and anyone's lost ground */
export function weekStatements(env, userId, activityId, mode, res, now = Date.now()) {
  const out = []
  if (!res.activity.rejected) {
    out.push(env.DB.prepare('UPDATE activities SET visited = ? WHERE id = ?').bind(JSON.stringify(visitedCells(res.track)), activityId))
  }
  for (const t of res.diff?.taken || []) {
    out.push(env.DB.prepare('INSERT INTO hex_losses (user_id, mode, h3, at, by_user) VALUES (?, ?, ?, ?, ?)').bind(t.from, mode, t.h3, now, userId))
  }
  return out
}

// Activities saved before explored hexes were kept: work a few out per request from their tracks
async function backfill(env, userId, limit = 20) {
  const rows = (await env.DB.prepare('SELECT id, track FROM activities WHERE user_id = ? AND rejected = 0 AND visited IS NULL LIMIT ?').bind(userId, limit).all()).results
  await batched(env, rows.map((r) => env.DB.prepare('UPDATE activities SET visited = ? WHERE id = ?').bind(JSON.stringify(visitedCells(unpackTrack(r.track))), r.id)))
}

async function weekInput(env, user, week, now) {
  await backfill(env, user.id)
  const acts = (await env.DB.prepare(
    `SELECT id, mode, started_at, distance_m, moving_s, loops, claimed, reinforced, taken, held, rejected, visited
     FROM activities WHERE user_id = ? AND started_at < ? ORDER BY started_at DESC LIMIT 3000`,
  ).bind(user.id, week.end).all()).results
  const cells = (await env.DB.prepare('SELECT * FROM cells WHERE owner = ? LIMIT 20000').bind(user.id).all()).results
    .map((r) => ({ ...rowToCell(r), mode: r.mode }))
  const losses = (await env.DB.prepare('SELECT mode, h3, at FROM hex_losses WHERE user_id = ? AND at >= ? AND at < ?')
    .bind(user.id, week.start - 5 * WEEK, week.end).all()).results
  return {
    userId: user.id,
    week,
    now,
    activities: acts.map((r) => ({
      id: r.id, mode: r.mode, startedAt: r.started_at, distanceM: r.distance_m, movingS: r.moving_s,
      loops: r.loops, claimed: r.claimed, reinforced: r.reinforced, taken: r.taken, held: r.held, rejected: !!r.rejected,
    })),
    visits: acts.filter((r) => r.visited && !r.rejected).map((r) => ({ id: r.id, at: r.started_at, mode: r.mode, cells: parse(r.visited, []) })),
    cells,
    losses,
  }
}

/** GET /api/explored?mode= */
export async function explored(env, user, url) {
  const mode = url.searchParams.get('mode') || null
  if (mode && !MODES.includes(mode)) bad('Mode must be run, walk or ride.')
  await backfill(env, user.id)
  const rows = (await env.DB.prepare(
    `SELECT mode, started_at, visited FROM activities WHERE user_id = ? AND rejected = 0 AND visited IS NOT NULL ${mode ? 'AND mode = ?' : ''}
     ORDER BY started_at DESC LIMIT 5000`,
  ).bind(...(mode ? [user.id, mode] : [user.id])).all()).results
  return mergeExplored(rows.map((r) => ({ at: r.started_at, mode: r.mode, cells: parse(r.visited, []) })), { mode })
}

/** GET /api/quests */
export async function quests(env, user, now = Date.now()) {
  const week = weekOf(now)
  return { week, quests: weeklyQuests(await weekInput(env, user, week, now)) }
}

/** GET /api/week?w=YYYY-MM-DD */
export async function week(env, user, url, now = Date.now()) {
  const w = url.searchParams.get('w')
  if (w && !isWeekKey(w)) bad('Pick a week as YYYY-MM-DD.')
  const wk = w ? weekFor(w) : weekOf(now)
  if (wk.start > now) bad("That week hasn't started yet.")
  if (wk.end < Date.UTC(2015, 0, 1)) bad('That week is too long ago.')
  return { recap: weekRecap(await weekInput(env, user, wk, now)) }
}

/** Cron, on Monday in Sydney: tell everyone who got out last week that their recap is ready (once a week) */
export async function weekReadyNotices(env, now = Date.now()) {
  if (weekdayOf(now) !== 'Monday') return 0
  const wk = weekOf(now)
  const pw = prevWeek(wk)
  const rows = (await env.DB.prepare('SELECT DISTINCT user_id FROM activities WHERE rejected = 0 AND started_at >= ? AND started_at < ? LIMIT 10000')
    .bind(pw.start, pw.end).all()).results
  await batched(env, rows.map((r) => notify(env, r.user_id, 'week', 'Your week in Foothold is ready. Want a look?', { at: now, dayKey: `week:${wk.key}` })))
  return rows.length
}
