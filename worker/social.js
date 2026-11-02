// Social routes for the Worker: comments on activities (with reports), the rivals list and private leagues (docs/API.md).

import { uid, players, rowToBattle, notify } from './db.js'
import { checkText } from '../src/lib/social/filter.js'
import {
  MAX_MEMBERS, MAX_LEAGUES, SWAP_DAYS, GAIN_DAYS, makeCode, normaliseCode, rankTable, rivalSums, sortRivals,
} from '../src/lib/social/leagues.js'
import { MODES } from '../src/lib/engine/index.js'

const DAY = 86400000
const MAX_COMMENTS_PER_ACTIVITY = 200
const NOUN = { run: 'run', walk: 'walk', ride: 'ride' }

const bad = (message, status = 400, code) => { throw Object.assign(new Error(message), { status, code }) }
const modeOf = (v) => (v == null || v === '' ? 'run' : MODES.includes(v) ? v : bad('Mode must be run, walk or ride.'))

// ---- comments ----

function commentOut(r, viewerId, ownerId) {
  const mine = r.user_id === viewerId
  return { id: r.id, userId: r.user_id, name: r.name || 'Someone', colour: r.colour || '#888888', text: r.text, at: r.at, mine, canDelete: mine || ownerId === viewerId }
}

async function listComments(env, activity, viewerId) {
  // Comments the viewer reported stay hidden from them while the owner reviews
  const rows = (await env.DB.prepare(
    `SELECT c.id, c.user_id, c.text, c.at, u.name, u.colour FROM comments c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.activity_id = ? AND NOT EXISTS (SELECT 1 FROM reports r WHERE r.comment_id = c.id AND r.reporter = ?)
     ORDER BY c.at ASC LIMIT ?`,
  ).bind(activity.id, viewerId, MAX_COMMENTS_PER_ACTIVITY).all()).results
  return rows.map((r) => commentOut(r, viewerId, activity.user_id))
}

async function commentCount(env, activityId) {
  return (await env.DB.prepare('SELECT COUNT(*) AS n FROM comments WHERE activity_id = ?').bind(activityId).first())?.n || 0
}

async function comments(ctx, activityId, commentId, action) {
  const { env, user, m, body, now, limit } = ctx
  const activity = await env.DB.prepare('SELECT id, user_id, mode FROM activities WHERE id = ?').bind(activityId).first()
  if (!activity) bad('That activity is gone.', 404, 'not_found')

  if (!commentId && m === 'GET') {
    const list = await listComments(env, activity, user.id)
    return { comments: list, count: list.length }
  }
  if (!commentId && m === 'POST') {
    const check = checkText(body.text)
    if (!check.ok) bad(check.message, 400, check.code)
    await limit('comment', "You've left a lot of comments this hour. Take a breather and try again soon.")
    if ((await commentCount(env, activity.id)) >= MAX_COMMENTS_PER_ACTIVITY) bad('This activity has plenty of comments already.', 409, 'comments_full')
    const id = uid()
    const stmts = [env.DB.prepare('INSERT INTO comments (id, activity_id, user_id, text, at) VALUES (?, ?, ?, ?, ?)').bind(id, activity.id, user.id, check.text, now)]
    if (activity.user_id !== user.id) stmts.push(notify(env, activity.user_id, 'comment', `${user.name} left a comment on your ${NOUN[activity.mode] || 'activity'}.`, { at: now }))
    await env.DB.batch(stmts)
    return {
      comment: commentOut({ id, user_id: user.id, text: check.text, at: now, name: user.name, colour: user.colour }, user.id, activity.user_id),
      count: await commentCount(env, activity.id),
    }
  }

  if (!commentId) return undefined
  const c = await env.DB.prepare('SELECT id, user_id, text FROM comments WHERE id = ? AND activity_id = ?').bind(commentId, activity.id).first()
  if (!c) bad('That comment is gone.', 404, 'not_found')

  if (!action && m === 'DELETE') {
    // Authors can take back their own words; owners can tidy their own activity
    if (c.user_id !== user.id && activity.user_id !== user.id) bad('You can only delete your own comments, or comments on your own activities.', 403)
    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(c.id).run()
    return { ok: true, count: await commentCount(env, activity.id) }
  }
  if (action === '/report' && m === 'POST') {
    if (c.user_id === user.id) bad('That is your own comment. You can delete it instead.')
    const reason = typeof body.reason === 'string' ? body.reason.replace(/\s+/g, ' ').trim().slice(0, 200) : null
    await limit('report', "Thanks, you've sent lots of reports today. We'll look at them soon.")
    await env.DB.prepare(
      'INSERT OR IGNORE INTO reports (id, comment_id, activity_id, reporter, author, text, reason, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(uid(), c.id, activity.id, user.id, c.user_id, c.text, reason || null, now).run()
    return { ok: true }
  }
  return undefined
}

/** Statements that record who took ground from whom in one activity */
export function swapStatements(env, { activityId, mode, taker, taken, at }) {
  const byLoser = new Map()
  for (const t of taken || []) if (t.from && t.from !== taker) byLoser.set(t.from, (byLoser.get(t.from) || 0) + 1)
  return [...byLoser].map(([loser, n]) => env.DB.prepare('INSERT OR IGNORE INTO swaps (activity_id, mode, taker, loser, n, at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(activityId, mode, taker, loser, n, at))
}

// ---- rivals ----

async function rivals(ctx) {
  const { env, user, url, now, decorateBattles } = ctx
  const mode = modeOf(url.searchParams.get('mode'))
  const battles = (await env.DB.prepare('SELECT * FROM battles WHERE attacker = ? OR defender = ? ORDER BY started_at DESC LIMIT 500').bind(user.id, user.id).all()).results.map(rowToBattle)
  const swaps = (await env.DB.prepare('SELECT taker, loser, n, at FROM swaps WHERE (taker = ? OR loser = ?) AND at >= ?')
    .bind(user.id, user.id, now - SWAP_DAYS * DAY).all()).results
  const sums = rivalSums(user.id, battles, swaps, now)
  const ids = [...sums.keys()]
  const names = await players(env, ids)
  const last = new Map()
  const held = new Map()
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90)
    const qs = part.map(() => '?').join(',')
    for (const r of (await env.DB.prepare(`SELECT user_id, MAX(started_at) AS t FROM activities WHERE rejected = 0 AND user_id IN (${qs}) GROUP BY user_id`).bind(...part).all()).results) last.set(r.user_id, r.t)
    // Public ground only: privacy zone hexes are never counted for anyone else
    for (const r of (await env.DB.prepare(`SELECT owner, COUNT(*) AS n FROM cells WHERE mode = ? AND private = 0 AND wild_at > ? AND owner IN (${qs}) GROUP BY owner`).bind(mode, now, ...part).all()).results) held.set(r.owner, r.n)
  }
  const list = []
  for (const [id, s] of sums) {
    const p = names.get(id) || { name: 'Someone', colour: '#888888' }
    list.push({
      userId: id,
      name: p.name,
      colour: p.colour,
      crest: p.crest || null, // their chosen emblem (src/lib/crests.js); null picks a default from their id
      swaps: s.swaps,
      tookFromThem: s.tookFromThem,
      tookFromYou: s.tookFromYou,
      record: s.record,
      battle: s.live ? (await decorateBattles(env, [s.live], now))[0] : null,
      lastActive: last.get(id) ?? null,
      hexes: held.get(id) || 0,
    })
  }
  const mine = await env.DB.prepare('SELECT COUNT(*) AS n FROM cells WHERE owner = ? AND mode = ? AND private = 0 AND wild_at > ?').bind(user.id, mode, now).first()
  return { rivals: sortRivals(list).slice(0, 50), you: { hexes: mine?.n || 0 }, days: SWAP_DAYS }
}

// ---- leagues ----

const leagueOut = (r, userId) => ({ id: r.id, name: r.name, code: r.code, members: r.members, mine: true, createdByMe: r.created_by === userId, createdAt: r.created_at })

async function myLeagues(env, userId) {
  return (await env.DB.prepare(
    `SELECT l.*, (SELECT COUNT(*) FROM league_members x WHERE x.league_id = l.id) AS members
     FROM leagues l JOIN league_members m ON m.league_id = l.id AND m.user_id = ? ORDER BY m.joined_at`,
  ).bind(userId).all()).results.map((r) => leagueOut(r, userId))
}

async function leagueRow(env, where, arg) {
  return env.DB.prepare(`SELECT l.*, (SELECT COUNT(*) FROM league_members x WHERE x.league_id = l.id) AS members FROM leagues l WHERE ${where} = ?`).bind(arg).first()
}

async function leagueTable(ctx, id) {
  const { env, user, url, now } = ctx
  const mode = modeOf(url.searchParams.get('mode'))
  const row = await leagueRow(env, 'l.id', id)
  if (!row) bad('That league is gone.', 404, 'not_found')
  const member = await env.DB.prepare('SELECT 1 AS x FROM league_members WHERE league_id = ? AND user_id = ?').bind(id, user.id).first()
  if (!member) bad('Join this league with its invite code to see the table.', 403, 'not_member')
  // Public ground only, for everyone, so a table never hints at privacy zone ground
  const rows = (await env.DB.prepare(
    `SELECT m.user_id, m.joined_at, u.name, u.colour,
       (SELECT COUNT(*) FROM cells x WHERE x.owner = m.user_id AND x.mode = ? AND x.private = 0 AND x.wild_at > ?) AS hexes,
       (SELECT COUNT(*) FROM cells x WHERE x.owner = m.user_id AND x.mode = ? AND x.private = 0 AND x.wild_at > ? AND x.claimed_at >= ?) AS gained
     FROM league_members m JOIN users u ON u.id = m.user_id WHERE m.league_id = ?`,
  ).bind(mode, now, mode, now, now - GAIN_DAYS * DAY, id).all()).results
  const table = rankTable(rows.map((r) => ({ userId: r.user_id, name: r.name, colour: r.colour, hexes: r.hexes, gained7d: r.gained, me: r.user_id === user.id })))
  const members = rows.map((r) => ({ userId: r.user_id, name: r.name, colour: r.colour, joinedAt: r.joined_at, me: r.user_id === user.id, owner: r.user_id === row.created_by }))
    .sort((a, b) => a.joinedAt - b.joinedAt)
  return { league: leagueOut(row, user.id), table, members, mode, days: GAIN_DAYS }
}

async function leagues(ctx, id, action) {
  const { env, user, m, body, now, limit } = ctx
  if (!id && m === 'GET') return { leagues: await myLeagues(env, user.id), max: MAX_LEAGUES, maxMembers: MAX_MEMBERS }
  if (!id && m === 'POST') {
    const check = checkText(body.name, { min: 3, max: 40, what: 'name' })
    if (!check.ok) bad(check.code === 'empty' ? 'Give your league a name of at least three letters.' : check.message, 400, check.code)
    const mine = await myLeagues(env, user.id)
    if (mine.length >= MAX_LEAGUES) bad(`You're in ${MAX_LEAGUES} leagues already. Leave one to start another.`, 409, 'league_limit')
    await limit('league', "You've started a few leagues today. Try again tomorrow.")
    let code = null
    for (let i = 0; i < 8 && !code; i++) {
      const c = makeCode(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32)
      if (!(await env.DB.prepare('SELECT 1 AS x FROM leagues WHERE code = ?').bind(c).first())) code = c
    }
    if (!code) bad('We could not make an invite code just now. Try again in a moment.', 503)
    const lid = uid()
    await env.DB.batch([
      env.DB.prepare('INSERT INTO leagues (id, name, code, created_by, created_at) VALUES (?, ?, ?, ?, ?)').bind(lid, check.text, code, user.id, now),
      env.DB.prepare('INSERT INTO league_members (league_id, user_id, joined_at) VALUES (?, ?, ?)').bind(lid, user.id, now),
    ])
    return { league: leagueOut(await leagueRow(env, 'l.id', lid), user.id) }
  }
  if (id === 'join' && !action && m === 'POST') {
    // Limited so nobody can guess their way into a league
    await limit('leagueJoin', 'Too many tries. Wait a little before joining a league again.')
    const code = normaliseCode(body.code)
    if (!code) bad('An invite code has six letters and numbers, like K7P2QX.', 400, 'bad_code')
    const row = await leagueRow(env, 'l.code', code)
    if (!row) bad("We couldn't find a league with that code. Check it with whoever sent it.", 404, 'not_found')
    const already = await env.DB.prepare('SELECT 1 AS x FROM league_members WHERE league_id = ? AND user_id = ?').bind(row.id, user.id).first()
    if (already) return { league: leagueOut(row, user.id), already: true }
    if (row.members >= MAX_MEMBERS) bad(`${row.name} is full. A league can have up to ${MAX_MEMBERS} members.`, 409, 'league_full')
    if ((await myLeagues(env, user.id)).length >= MAX_LEAGUES) bad(`You're in ${MAX_LEAGUES} leagues already. Leave one to join this one.`, 409, 'league_limit')
    await env.DB.prepare('INSERT OR IGNORE INTO league_members (league_id, user_id, joined_at) VALUES (?, ?, ?)').bind(row.id, user.id, now).run()
    return { league: leagueOut(await leagueRow(env, 'l.id', row.id), user.id) }
  }
  if (id && id !== 'join' && action === '/leave' && m === 'POST') {
    await env.DB.prepare('DELETE FROM league_members WHERE league_id = ? AND user_id = ?').bind(id, user.id).run()
    // The last one out closes the league
    await env.DB.prepare('DELETE FROM leagues WHERE id = ? AND NOT EXISTS (SELECT 1 FROM league_members WHERE league_id = ?)').bind(id, id).run()
    return { ok: true }
  }
  if (id && id !== 'join' && !action && m === 'GET') return leagueTable(ctx, id)
  return undefined
}

/**
 * Handle a social route, or return undefined if the path isn't one.
 * ctx: { env, user, url, m, path, body, now, limit, decorateBattles }
 */
export async function socialRoute(ctx) {
  const { path, m } = ctx
  const cm = path.match(/^\/api\/activities\/([A-Za-z0-9-]{1,64})\/comments(?:\/([A-Za-z0-9-]{1,64})(\/report)?)?$/)
  if (cm) return comments(ctx, cm[1], cm[2], cm[3])
  if (path === '/api/rivals' && m === 'GET') return rivals(ctx)
  const lm = path.match(/^\/api\/leagues(?:\/([A-Za-z0-9-]{1,64})(\/leave)?)?$/)
  if (lm) return leagues(ctx, lm[1], lm[2])
  return undefined
}

// ---- export and delete (worker/account.js) ----

/** Everything social this player wrote or joined, for their data export */
export async function socialExport(env, userId) {
  const all = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results
  return {
    comments: await all('SELECT id, activity_id AS activityId, text, at FROM comments WHERE user_id = ? ORDER BY at', userId),
    reports: await all('SELECT comment_id AS commentId, activity_id AS activityId, reason, status, at FROM reports WHERE reporter = ? ORDER BY at', userId),
    leagues: await all('SELECT l.id, l.name, l.code, m.joined_at AS joinedAt, l.created_by = ? AS createdByMe FROM league_members m JOIN leagues l ON l.id = m.league_id WHERE m.user_id = ?', userId, userId),
    swaps: await all('SELECT activity_id AS activityId, mode, taker, loser, n, at FROM swaps WHERE taker = ? OR loser = ? ORDER BY at', userId, userId),
  }
}

/** Statements that remove this player's social data (run before the user row goes) */
export function socialDeleteStatements(env, userId) {
  const p = (sql, ...args) => env.DB.prepare(sql).bind(...args)
  return [
    p('DELETE FROM comments WHERE user_id = ? OR activity_id IN (SELECT id FROM activities WHERE user_id = ?)', userId, userId),
    p('DELETE FROM reports WHERE reporter = ? OR author = ? OR activity_id IN (SELECT id FROM activities WHERE user_id = ?)', userId, userId, userId),
    p('DELETE FROM swaps WHERE taker = ? OR loser = ?', userId, userId),
    p('DELETE FROM league_members WHERE user_id = ?', userId),
    p('DELETE FROM leagues WHERE NOT EXISTS (SELECT 1 FROM league_members m WHERE m.league_id = leagues.id)'),
  ]
}

/** Statements that remove an activity's comments and their reports when the activity goes */
export function activityCommentDeletes(env, activityId) {
  return [
    env.DB.prepare('DELETE FROM comments WHERE activity_id = ?').bind(activityId),
    env.DB.prepare('DELETE FROM reports WHERE activity_id = ?').bind(activityId),
  ]
}
