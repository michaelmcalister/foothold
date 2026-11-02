// Personal bests and strongholds on the server: works out records and
// stronghold efforts when an activity is saved, tidies them when one is
// deleted, and serves /api/bests and /api/strongholds (docs/API.md).

import {
  bestEfforts, mergeBests, rebuildBests, bestsList, prepareStronghold, strongholdsRun,
  rankStandings, crownOf, crownMessage, STRONGHOLD, MODES,
} from '../src/lib/engine/index.js'
import { uid, parse, players, notify, batched } from './db.js'

const DAY = 86400000
const bad = (message, status = 400, code) => { throw Object.assign(new Error(message), { status, code }) }

// Tables holding a player's own data from this feature, for export and delete
export const USER_DATA = [
  { table: 'personal_bests', column: 'user_id' },
  { table: 'stronghold_efforts', column: 'user_id' },
]

// Prepared routes, kept between requests on the same isolate
const prepared = new Map()
function prep(row) {
  const key = `${row.id}:${row.line.length}`
  if (!prepared.has(key)) prepared.set(key, { ...prepareStronghold({ id: row.id, name: row.name, line: row.line }), line: row.line })
  return prepared.get(key)
}

/** Strongholds whose bounds overlap [w, s, e, n] */
export async function strongholdsIn(env, [w, s, e, n], limit = 200) {
  const rows = (await env.DB.prepare('SELECT * FROM strongholds WHERE max_lat >= ? AND min_lat <= ? AND max_lng >= ? AND min_lng <= ? LIMIT ?')
    .bind(s, n, w, e, limit).all()).results
  return rows.map(prep)
}

/** Per-player totals for a set of strongholds: id -> ranked standings */
async function boards(env, ids, mode, now) {
  const out = new Map(ids.map((id) => [id, []]))
  const since = now - STRONGHOLD.windowDays * DAY
  for (let i = 0; i < ids.length; i += 80) {
    const part = ids.slice(i, i + 80)
    const rows = (await env.DB.prepare(
      `SELECT e.stronghold_id, e.user_id,
         SUM(CASE WHEN e.at >= ? THEN 1 ELSE 0 END) AS efforts,
         MAX(CASE WHEN e.at >= ? THEN e.at ELSE 0 END) AS last,
         MIN(e.elapsed_s) AS best_s,
         (SELECT x.at FROM stronghold_efforts x WHERE x.stronghold_id = e.stronghold_id AND x.mode = e.mode AND x.user_id = e.user_id ORDER BY x.elapsed_s, x.at LIMIT 1) AS best_at
       FROM stronghold_efforts e
       WHERE e.mode = ? AND e.stronghold_id IN (${part.map(() => '?').join(',')})
       GROUP BY e.stronghold_id, e.user_id`,
    ).bind(since, since, mode, ...part).all()).results
    for (const r of rows) out.get(r.stronghold_id).push({ userId: r.user_id, efforts: r.efforts, last: r.last, bestS: r.best_s, bestAt: r.best_at })
  }
  return out
}

function withEffort(list, userId, at, elapsedS) {
  const next = list.map((u) => ({ ...u }))
  let me = next.find((u) => u.userId === userId)
  if (!me) { me = { userId, efforts: 0, last: 0, bestS: null, bestAt: null }; next.push(me) }
  me.efforts++
  me.last = Math.max(me.last, at)
  if (me.bestS == null || elapsedS < me.bestS) { me.bestS = elapsedS; me.bestAt = at }
  return next
}

function strongholdOut(sh, mode, st, names, userId) {
  const c = crownOf(st, userId)
  const me = st.byTime.find((u) => u.userId === userId)
  const h = c.holder && names.get(c.holder.userId)
  return {
    id: sh.id, name: sh.name, mode, line: sh.line, start: sh.start, distanceM: sh.distanceM,
    centre: { lat: (sh.bbox[1] + sh.bbox[3]) / 2, lng: (sh.bbox[0] + sh.bbox[2]) / 2 },
    holder: c.holder ? { userId: c.holder.userId, name: h?.name || 'Someone', colour: h?.colour || '#888888', efforts: c.holder.efforts, me: c.holds } : null,
    mine: { efforts: c.mine, bestS: me?.bestS ?? null, holds: c.holds, toCrown: c.toCrown },
  }
}

/**
 * Called by postActivity once the activity is processed. Returns statements
 * to run in the same batch, plus what to tell the player.
 */
export async function afterActivity(env, user, { id, mode, res, now }) {
  const a = res.activity
  if (a.rejected || !res.track?.length) return { stmts: [], prs: [], strongholds: [], bests: null }
  const stmts = []

  // Personal bests
  const bests = bestEfforts(res.track, mode)
  stmts.push(env.DB.prepare('UPDATE activities SET bests = ? WHERE id = ?').bind(JSON.stringify(bests), id))
  const rows = (await env.DB.prepare('SELECT key, value, activity_id, at FROM personal_bests WHERE user_id = ? AND mode = ?').bind(user.id, mode).all()).results
  const records = Object.fromEntries(rows.map((r) => [r.key, { value: r.value, activityId: r.activity_id, at: r.at }]))
  const { improved } = mergeBests(records, bests, mode, { activityId: id, at: a.startedAt })
  for (const b of improved) {
    stmts.push(env.DB.prepare(
      `INSERT INTO personal_bests (user_id, mode, key, value, activity_id, at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, mode, key) DO UPDATE SET value = excluded.value, activity_id = excluded.activity_id, at = excluded.at`,
    ).bind(user.id, mode, b.key, b.value, id, a.startedAt))
  }

  // Strongholds this track ran
  const near = a.bbox ? await strongholdsIn(env, [a.bbox[0] - 0.01, a.bbox[1] - 0.01, a.bbox[2] + 0.01, a.bbox[3] + 0.01]) : []
  const found = strongholdsRun(res.track, near)
  const before = await boards(env, found.map((f) => f.strongholdId), mode, now)
  const holders = found.map((f) => rankStandings(before.get(f.strongholdId) || []).holder?.userId).filter(Boolean)
  const names = await players(env, [user.id, ...holders])
  const strongholds = []
  for (const f of found) {
    stmts.push(env.DB.prepare('INSERT INTO stronghold_efforts (id, stronghold_id, user_id, activity_id, mode, at, elapsed_s) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(uid(), f.strongholdId, user.id, id, mode, f.startedAt, f.elapsedS))
    const prev = rankStandings(before.get(f.strongholdId) || []).holder
    const after = crownOf(rankStandings(withEffort(before.get(f.strongholdId) || [], user.id, f.startedAt, f.elapsedS)), user.id)
    const tookFrom = after.holds && prev && prev.userId !== user.id ? (names.get(prev.userId)?.name || 'a rival') : null
    if (tookFrom) {
      stmts.push(notify(env, prev.userId, 'stronghold', `${user.name} took the crown on the ${f.name}. Run it again to win it back?`, { at: now }))
    }
    const holderName = after.holder ? (names.get(after.holder.userId)?.name || 'a rival') : null
    const out = { id: f.strongholdId, name: f.name, elapsedS: f.elapsedS, efforts: after.mine, holds: after.holds, toCrown: after.toCrown, tookFrom, holderName }
    strongholds.push({ ...out, message: crownMessage(out) })
  }
  return { stmts, prs: improved, strongholds, bests }
}

/** After an activity is deleted: drop its efforts and rebuild that map's records */
export async function afterDelete(env, user, row) {
  const stmts = [env.DB.prepare('DELETE FROM stronghold_efforts WHERE activity_id = ? AND user_id = ?').bind(row.id, user.id)]
  const used = await env.DB.prepare('SELECT 1 AS x FROM personal_bests WHERE user_id = ? AND activity_id = ? LIMIT 1').bind(user.id, row.id).first()
  if (used) {
    const acts = (await env.DB.prepare('SELECT id, started_at, bests FROM activities WHERE user_id = ? AND mode = ? AND bests IS NOT NULL AND id != ?')
      .bind(user.id, row.mode, row.id).all()).results.map((r) => ({ id: r.id, startedAt: r.started_at, bests: parse(r.bests, null) }))
    const records = rebuildBests(acts, row.mode)
    stmts.push(env.DB.prepare('DELETE FROM personal_bests WHERE user_id = ? AND mode = ?').bind(user.id, row.mode))
    for (const [key, r] of Object.entries(records)) {
      stmts.push(env.DB.prepare('INSERT INTO personal_bests (user_id, mode, key, value, activity_id, at) VALUES (?, ?, ?, ?, ?, ?)').bind(user.id, row.mode, key, r.value, r.activityId, r.at))
    }
  }
  await batched(env, stmts)
}

function modeParam(url) {
  const m = url.searchParams.get('mode') || 'run'
  if (!MODES.includes(m)) bad('Mode must be run, walk or ride.')
  return m
}

function bboxParam(url) {
  const v = url.searchParams.get('bbox')
  if (v == null || v === '') return null
  const b = String(v).split(',').map(Number)
  const ok = b.length === 4 && b.every(Number.isFinite) && b[0] >= -180 && b[2] <= 180 && b[1] >= -90 && b[3] <= 90 && b[0] < b[2] && b[1] < b[3]
  if (!ok) bad('bbox must be west,south,east,north in degrees.')
  return b
}

/** /api/bests and /api/strongholds routes. Returns null for other paths. */
export async function strongholdRoutes(env, user, url, method, now = Date.now()) {
  const path = url.pathname
  if (method !== 'GET') return null

  if (path === '/api/bests') {
    const mode = modeParam(url)
    const rows = (await env.DB.prepare('SELECT key, value, activity_id, at FROM personal_bests WHERE user_id = ? AND mode = ?').bind(user.id, mode).all()).results
    const records = Object.fromEntries(rows.map((r) => [r.key, { value: r.value, activityId: r.activity_id, at: r.at }]))
    return { bests: bestsList(records, mode) }
  }

  if (path === '/api/strongholds') {
    const mode = modeParam(url)
    let box = bboxParam(url)
    if (!box) {
      // No area sent: around where this player last went out, about 20 km
      const last = await env.DB.prepare('SELECT lat, lng FROM activities WHERE user_id = ? AND lat IS NOT NULL ORDER BY started_at DESC LIMIT 1').bind(user.id).first()
      box = last ? [last.lng - 0.22, last.lat - 0.18, last.lng + 0.22, last.lat + 0.18] : [-180, -90, 180, 90]
    }
    const list = await strongholdsIn(env, box)
    const b = await boards(env, list.map((s) => s.id), mode, now)
    const st = new Map(list.map((s) => [s.id, rankStandings(b.get(s.id) || [])]))
    const names = await players(env, [...st.values()].map((x) => x.holder?.userId))
    return { strongholds: list.map((s) => strongholdOut(s, mode, st.get(s.id), names, user.id)) }
  }

  if (path === '/api/strongholds/efforts') {
    const rows = (await env.DB.prepare('SELECT stronghold_id, activity_id, mode, at, elapsed_s FROM stronghold_efforts WHERE user_id = ? ORDER BY at DESC LIMIT 5000').bind(user.id).all()).results
    return { efforts: rows.map((r) => ({ strongholdId: r.stronghold_id, activityId: r.activity_id, mode: r.mode, at: r.at, elapsedS: r.elapsed_s })) }
  }

  const m = path.match(/^\/api\/strongholds\/([A-Za-z0-9-]{1,64})$/)
  if (m) {
    const mode = modeParam(url)
    const row = await env.DB.prepare('SELECT * FROM strongholds WHERE id = ?').bind(m[1]).first()
    if (!row) bad('That stronghold is gone.', 404, 'not_found')
    const sh = prep(row)
    const st = rankStandings((await boards(env, [sh.id], mode, now)).get(sh.id) || [])
    const byEfforts = st.byEfforts.slice(0, 20)
    const byTime = st.byTime.slice(0, 20)
    const names = await players(env, [...byEfforts, ...byTime].map((u) => u.userId))
    const who = (u) => ({ userId: u.userId, name: names.get(u.userId)?.name || 'Someone', colour: names.get(u.userId)?.colour || '#888888', me: u.userId === user.id })
    const recent = (await env.DB.prepare('SELECT activity_id, at, elapsed_s FROM stronghold_efforts WHERE stronghold_id = ? AND mode = ? AND user_id = ? ORDER BY at DESC LIMIT 10')
      .bind(sh.id, mode, user.id).all()).results
    return {
      stronghold: strongholdOut(sh, mode, st, names, user.id),
      byEfforts: byEfforts.map((u) => ({ ...who(u), efforts: u.efforts, last: u.last })),
      byTime: byTime.map((u) => ({ ...who(u), bestS: u.bestS, at: u.bestAt })),
      recent: recent.map((r) => ({ activityId: r.activity_id, at: r.at, elapsedS: r.elapsed_s })),
    }
  }
  return null
}
