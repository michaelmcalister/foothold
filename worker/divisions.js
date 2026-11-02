// Weekly divisions on the server: the Monday grouping, late joiners, finishing last week (top 5 move up, nobody moves down), and GET /api/division and /api/division/history.

import { latLngToCell } from 'h3-js'
import {
  weekOf, weekFor, prevWeek, groupPlayers, pickDivision, rankDivision, tierOut, clampTier, daysLeftIn,
  placedText, promotedText, ACTIVE_DAYS, PROMOTE_TOP, PER_HEX, PER_OUTING, MAX_OUTINGS, DIVISION_SIZE,
} from '../src/lib/engine/index.js'
import { uid, players, notify, batched } from './db.js'

const DAY = 86400000
const CITY_RES = 4 // H3 resolution 4 is about 1,800 km²: one city and its suburbs

const cityOf = (lat, lng) => {
  if (lat == null || lng == null) return null
  try { return latLngToCell(lat, lng, CITY_RES) } catch { return null }
}

async function inChunks(env, ids, sql, ...before) {
  const out = []
  const list = [...new Set(ids)].filter(Boolean)
  for (let i = 0; i < list.length; i += 90) {
    const part = list.slice(i, i + 90)
    out.push(...(await env.DB.prepare(sql.replace('(?)', `(${part.map(() => '?').join(',')})`)).bind(...before, ...part).all()).results)
  }
  return out
}

/** userId -> { hexes, outings, score } for a week (every map) */
async function scoresFor(env, ids, week) {
  const rows = await inChunks(env, ids,
    'SELECT user_id, SUM(claimed + taken) AS hexes, COUNT(*) AS outings FROM activities WHERE rejected = 0 AND started_at >= ? AND started_at < ? AND user_id IN (?) GROUP BY user_id',
    week.start, week.end)
  const out = new Map()
  for (const r of rows) {
    const hexes = r.hexes || 0
    out.set(r.user_id, { hexes, outings: r.outings, score: hexes * PER_HEX + Math.min(r.outings, MAX_OUTINGS) * PER_OUTING })
  }
  return out
}
const zero = { hexes: 0, outings: 0, score: 0 }

/** userId -> tier to place them at: their latest division, plus one if it moved them up */
async function tiersFor(env, ids) {
  const rows = await inChunks(env, ids, 'SELECT user_id, week, tier, promoted FROM division_members WHERE user_id IN (?)')
  const out = new Map()
  for (const r of rows) {
    const cur = out.get(r.user_id)
    if (!cur || r.week > cur.week) out.set(r.user_id, r)
  }
  return new Map([...out].map(([id, r]) => [id, clampTier(r.tier + (r.promoted ? 1 : 0))]))
}

// Everyone with an outing in the last 14 days, with where they last went (for the city)
// When server bots exist, leave them out here (users.is_bot = 0) and seat them after grouping.
async function activePlayers(env, now, only = null) {
  const sql = `SELECT user_id, lat, lng, started_at FROM activities WHERE rejected = 0 AND started_at >= ? AND started_at <= ?${only ? ' AND user_id = ?' : ''}
     ORDER BY started_at DESC LIMIT 50000`
  const rows = (await env.DB.prepare(sql).bind(now - ACTIVE_DAYS * DAY, now + DAY, ...(only ? [only] : [])).all()).results
  const out = new Map()
  for (const r of rows) {
    const p = out.get(r.user_id)
    if (!p) out.set(r.user_id, { userId: r.user_id, lat: r.lat, lng: r.lng })
    else if (p.lat == null && r.lat != null) Object.assign(p, { lat: r.lat, lng: r.lng })
  }
  return [...out.values()].map((p) => ({ userId: p.userId, city: cityOf(p.lat, p.lng) }))
}

// ---- finishing a week ----

/** Rank and store every division whose week has ended; promote the top 5 (if they scored). Safe to run again. */
export async function finaliseWeeks(env, now = Date.now()) {
  const cur = weekOf(now).key
  const divs = (await env.DB.prepare('SELECT * FROM divisions WHERE finalised_at IS NULL AND week < ? ORDER BY week LIMIT 200').bind(cur).all()).results
  let promoted = 0
  for (const d of divs) {
    const week = weekFor(d.week)
    const members = (await env.DB.prepare('SELECT user_id FROM division_members WHERE division_id = ?').bind(d.id).all()).results.map((r) => r.user_id)
    const sc = await scoresFor(env, members, week)
    const table = rankDivision(members.map((id) => ({ userId: id, ...(sc.get(id) || zero) })), d.tier)
    const stmts = []
    for (const r of table) {
      stmts.push(env.DB.prepare('UPDATE division_members SET score = ?, hexes = ?, outings = ?, rank = ?, promoted = ?, updated_at = ? WHERE division_id = ? AND user_id = ?')
        .bind(r.score, r.hexes, r.outings, r.rank, r.promotes ? 1 : 0, now, d.id, r.userId))
      if (r.promotes) {
        promoted++
        stmts.push(notify(env, r.userId, 'division', promotedText(d.tier + 1), { at: now, dayKey: `promoted:${d.week}` }))
      } else if (r.top) {
        stmts.push(notify(env, r.userId, 'division', `You finished in the top ${PROMOTE_TOP} of your ${tierOut(d.tier).name} division. Lovely work.`, { at: now, dayKey: `promoted:${d.week}` }))
      }
    }
    stmts.push(env.DB.prepare('UPDATE divisions SET finalised_at = ? WHERE id = ? AND finalised_at IS NULL').bind(now, d.id))
    await batched(env, stmts)
  }
  return promoted
}

// ---- the Monday grouping ----

function memberInsert(env, divisionId, week, tier, userId, now) {
  return env.DB.prepare('INSERT OR IGNORE INTO division_members (division_id, user_id, week, tier, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(divisionId, userId, week, tier, now, now)
}

/** Group this week's active players, once a week. Returns how many were placed. */
export async function groupWeek(env, now = Date.now()) {
  const wk = weekOf(now)
  if (await env.DB.prepare('SELECT week FROM division_weeks WHERE week = ?').bind(wk.key).first()) return 0
  const active = await activePlayers(env, now)
  const ids = active.map((p) => p.userId)
  const tiers = await tiersFor(env, ids)
  const form = await scoresFor(env, ids, prevWeek(wk))
  const groups = groupPlayers(active.map((p) => ({ ...p, tier: tiers.get(p.userId) ?? 0, form: form.get(p.userId)?.score || 0 })))
  // The marker goes first: if another run got here at the same moment, its insert fails and nothing doubles up
  const stmts = [env.DB.prepare('INSERT INTO division_weeks (week, grouped_at, players) VALUES (?, ?, ?)').bind(wk.key, now, ids.length)]
  for (const g of groups) {
    const id = uid()
    stmts.push(env.DB.prepare('INSERT INTO divisions (id, week, tier, mode, city, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, wk.key, g.tier, 'all', g.city, now))
    for (const u of g.members) {
      stmts.push(memberInsert(env, id, wk.key, g.tier, u, now))
      stmts.push(notify(env, u, 'division', placedText(g.tier), { at: now, dayKey: `division:${wk.key}` }))
    }
  }
  try {
    await batched(env, stmts)
  } catch (e) {
    if (await env.DB.prepare('SELECT week FROM division_weeks WHERE week = ?').bind(wk.key).first()) return 0 // someone else grouped it
    throw e
  }
  return ids.length
}

/** Put one player who got out this week (or first got out) into a division of their tier with room */
async function placeLate(env, userId, city, now, open) {
  const wk = weekOf(now)
  const tier = (await tiersFor(env, [userId])).get(userId) ?? 0
  let d = pickDivision(open, tier, city)
  const stmts = []
  if (!d) {
    d = { id: uid(), tier, city, size: 0 }
    open.push(d)
    stmts.push(env.DB.prepare('INSERT INTO divisions (id, week, tier, mode, city, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(d.id, wk.key, tier, 'all', city, now))
  }
  d.size++
  stmts.push(memberInsert(env, d.id, wk.key, tier, userId, now))
  stmts.push(notify(env, userId, 'division', placedText(tier), { at: now, dayKey: `division:${wk.key}` }))
  await batched(env, stmts)
}

async function openDivisions(env, weekKey) {
  return (await env.DB.prepare(
    'SELECT d.id, d.tier, d.city, (SELECT COUNT(*) FROM division_members m WHERE m.division_id = d.id) AS size FROM divisions d WHERE d.week = ?',
  ).bind(weekKey).all()).results
}

/** Active players not yet in a division this week (new players, or back after a break) */
export async function lateJoiners(env, now = Date.now(), only = null) {
  const wk = weekOf(now)
  const active = await activePlayers(env, now, only)
  if (!active.length) return 0
  const placed = new Set((await inChunks(env, active.map((p) => p.userId), 'SELECT user_id FROM division_members WHERE week = ? AND user_id IN (?)', wk.key)).map((r) => r.user_id))
  const todo = active.filter((p) => !placed.has(p.userId)).slice(0, 500)
  if (!todo.length) return 0
  const open = await openDivisions(env, wk.key)
  for (const p of todo) await placeLate(env, p.userId, p.city, now, open)
  return todo.length
}

/** Hourly: finish weeks that have ended, group the new week (the first run after midnight on Monday), seat late joiners */
export async function divisionCron(env, now = Date.now()) {
  const promoted = await finaliseWeeks(env, now)
  const grouped = await groupWeek(env, now)
  const late = await lateJoiners(env, now)
  return { promoted, grouped, late }
}

// ---- the routes ----

async function myRows(env, userId, limit = 60) {
  return (await env.DB.prepare(
    `SELECT m.*, d.finalised_at, (SELECT COUNT(*) FROM division_members x WHERE x.division_id = m.division_id) AS size
     FROM division_members m JOIN divisions d ON d.id = m.division_id WHERE m.user_id = ? ORDER BY m.week DESC LIMIT ?`,
  ).bind(userId, limit).all()).results
}

function tiersOf(rows, curKey) {
  let tier = 0
  const latest = rows[0]
  if (latest) tier = latest.week === curKey || !latest.finalised_at ? latest.tier : latest.tier + (latest.promoted ? 1 : 0)
  let best = tier
  for (const r of rows) best = Math.max(best, r.tier + (r.finalised_at && r.promoted ? 1 : 0))
  return { tier: clampTier(tier), best: clampTier(best) }
}

/** GET /api/division: this week's table, your tier and best, days left */
export async function division(env, user, now = Date.now()) {
  // Catch up if the hourly job hasn't yet this week, then seat this player if they've been out lately
  await finaliseWeeks(env, now)
  await groupWeek(env, now)
  await lateJoiners(env, now, user.id)
  const wk = weekOf(now)
  const rows = await myRows(env, user.id)
  const { tier, best } = tiersOf(rows, wk.key)
  const mine = rows.find((r) => r.week === wk.key) || null
  const last = rows.find((r) => r.week === prevWeek(wk).key && r.finalised_at) || null
  const out = {
    week: wk,
    daysLeft: daysLeftIn(wk, now),
    endsAt: wk.end,
    tier: tierOut(tier),
    bestTier: tierOut(best),
    active: !!mine,
    division: null,
    table: [],
    you: null,
    promotion: last?.promoted ? { week: last.week, tier: tierOut(last.tier + 1) } : null,
    last: last ? { week: last.week, tier: tierOut(last.tier), rank: last.rank, size: last.size, promoted: !!last.promoted } : null,
    scoring: { perHex: PER_HEX, perOuting: PER_OUTING, maxOutings: MAX_OUTINGS, promoteTop: PROMOTE_TOP, size: DIVISION_SIZE, activeDays: ACTIVE_DAYS },
  }
  if (!mine) return out
  const members = (await env.DB.prepare('SELECT user_id, score, hexes, outings FROM division_members WHERE division_id = ?').bind(mine.division_id).all()).results
  const ids = members.map((m) => m.user_id)
  const sc = await scoresFor(env, ids, wk)
  // Refresh the cached scores that moved
  const stale = members.filter((m) => { const s = sc.get(m.user_id) || zero; return s.score !== m.score || s.hexes !== m.hexes || s.outings !== m.outings })
  await batched(env, stale.map((m) => {
    const s = sc.get(m.user_id) || zero
    return env.DB.prepare('UPDATE division_members SET score = ?, hexes = ?, outings = ?, updated_at = ? WHERE division_id = ? AND user_id = ?').bind(s.score, s.hexes, s.outings, now, mine.division_id, m.user_id)
  }))
  const names = await players(env, ids)
  const table = rankDivision(ids.map((id) => {
    const p = names.get(id) || {}
    return { userId: id, name: p.name || 'Someone', colour: p.colour || '#888888', crest: p.crest || null, ...(sc.get(id) || zero), me: id === user.id }
  }), mine.tier)
  out.division = { id: mine.division_id, tier: tierOut(mine.tier), size: table.length, promoteTop: PROMOTE_TOP }
  out.table = table
  const me = table.find((r) => r.me)
  out.you = me ? { rank: me.rank, score: me.score, hexes: me.hexes, outings: me.outings, promotes: me.promotes } : null
  return out
}

/** GET /api/division/history: your weeks, newest first */
export async function divisionHistory(env, user, now = Date.now()) {
  const wk = weekOf(now)
  const rows = await myRows(env, user.id, 52)
  const { tier, best } = tiersOf(rows, wk.key)
  return {
    history: rows.map((r) => ({
      week: r.week, tier: tierOut(r.tier), rank: r.rank ?? null, size: r.size, score: r.score, hexes: r.hexes, outings: r.outings,
      promoted: !!r.promoted, finalised: !!r.finalised_at,
    })),
    tier: tierOut(tier),
    bestTier: tierOut(best),
  }
}

/** The /api/division routes, or undefined when the path isn't one of them */
export async function divisionRoute({ env, user, m, path, now }) {
  if (m !== 'GET') return undefined
  if (path === '/api/division') return division(env, user, now)
  if (path === '/api/division/history') return divisionHistory(env, user, now)
  return undefined
}

