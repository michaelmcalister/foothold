// A player's data export (GET /api/me/export) and account delete (DELETE /api/me): every table that holds their data.

import { userOut, activityOut, ACTIVITY_COLS, unpackTrack, parse, batched } from './db.js'
import { socialExport, socialDeleteStatements } from './social.js'

// Tables keyed by the player, beyond users and activities. Add new ones here.
export const USER_TABLES = [
  { table: 'club_members', col: 'user_id' },
  { table: 'kudos', col: 'user_id' },
  { table: 'notifications', col: 'user_id' },
  { table: 'plans', col: 'user_id' },
  { table: 'feedback', col: 'user_id' },
  { table: 'routes', col: 'user_id' }, // planned routes
  { table: 'hex_losses', col: 'user_id' }, // ground rivals took from you (weekly recap)
  { table: 'personal_bests', col: 'user_id' },
  { table: 'stronghold_efforts', col: 'user_id' },
]

export async function exportAccount(env, user) {
  const rows = (await env.DB.prepare(`SELECT ${ACTIVITY_COLS}, a.track FROM activities a WHERE a.user_id = ? ORDER BY a.started_at`).bind(user.id).all()).results
  const out = {
    user: userOut(user),
    activities: rows.map((r) => ({ ...activityOut(r, user.id), track: unpackTrack(r.track) })),
  }
  for (const { table, col } of USER_TABLES) {
    out[table] = (await env.DB.prepare(`SELECT * FROM ${table} WHERE ${col} = ?`).bind(user.id).all()).results
  }
  if (out.plans?.[0]) out.plans = out.plans.map((p) => ({ ...p, plan: parse(p.plan, null) }))
  Object.assign(out, await socialExport(env, user.id))
  return out
}

export async function deleteAccount(env, user) {
  const p = (sql, ...args) => env.DB.prepare(sql).bind(...args)
  const stmts = [
    ...socialDeleteStatements(env, user.id),
    p('DELETE FROM kudos WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ?)', user.id),
    ...USER_TABLES.map(({ table, col }) => p(`DELETE FROM ${table} WHERE ${col} = ?`, user.id)),
    p('DELETE FROM battles WHERE attacker = ? OR defender = ?', user.id, user.id),
    p('DELETE FROM hex_losses WHERE by_user = ?', user.id), // others' log of ground you took names you
    p('DELETE FROM cells WHERE owner = ?', user.id), // their ground goes wild
    p('DELETE FROM activities WHERE user_id = ?', user.id),
    p('DELETE FROM rate_limits WHERE key = ?', user.id),
    p('DELETE FROM users WHERE id = ?', user.id),
  ]
  await batched(env, stmts)
  return { ok: true }
}
