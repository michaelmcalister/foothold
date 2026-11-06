// Routes sent to your crew (docs/API.md): GET /api/crew, POST /api/routes/:id/share, GET /api/routes/shared and DELETE /api/routes/shared/:shareId.
// Your crew is everyone in your club and your private leagues. Nobody else can be sent a route.

import { uid, parse, notify, batched } from './db.js'
import { cleanPlannedAt, shareNotice, MAX_SHARE_TO } from '../src/lib/routeShare.js'

const MAX_SHARED = 100 // the most a recipient sees at once, newest first

const bad = (message, status = 400, code) => { throw Object.assign(new Error(message), { status, code }) }

/** Everyone in this player's club and leagues, without them, by name */
export async function crewOf(env, userId) {
  const rows = (await env.DB.prepare(
    `SELECT u.id, u.name, u.colour, u.crest FROM users u
     WHERE u.id != ? AND (
       u.id IN (SELECT m.user_id FROM club_members m WHERE m.club_id IN (SELECT club_id FROM club_members WHERE user_id = ?))
       OR u.id IN (SELECT x.user_id FROM league_members x WHERE x.league_id IN (SELECT league_id FROM league_members WHERE user_id = ?))
     )
     ORDER BY lower(u.name), u.id LIMIT 500`,
  ).bind(userId, userId, userId).all()).results
  return rows.map((r) => ({ id: r.id, name: r.name, colour: r.colour, crest: r.crest || null }))
}

const shareOut = (r) => ({
  id: r.id,
  route: { name: r.name, mode: r.mode, ring: parse(r.ring, []), distanceM: r.distance_m },
  from: { id: r.from_user, name: r.from_name || 'Someone', colour: r.from_colour || '#888888', crest: r.from_crest || null },
  plannedAt: r.planned_at ?? null,
  sharedAt: r.created_at,
})

async function share(ctx, routeId) {
  const { env, user, body, now, limit } = ctx
  const route = await env.DB.prepare('SELECT * FROM routes WHERE id = ? AND user_id = ?').bind(routeId, user.id).first()
  if (!route) bad('That route is gone.', 404, 'not_found')
  const to = body.to
  if (!Array.isArray(to) || !to.length || to.some((x) => typeof x !== 'string' || !x || x.length > 64)) bad('Pick who to send it to.', 400, 'bad_recipients')
  const ids = [...new Set(to)]
  if (ids.length > MAX_SHARE_TO) bad(`Send it to up to ${MAX_SHARE_TO} people at a time.`, 400, 'too_many_recipients')
  let plannedAt
  try { plannedAt = 'plannedAt' in body ? cleanPlannedAt(body.plannedAt, now) : (route.planned_at ?? null) } catch (e) { bad(e.message) }
  const crew = new Set((await crewOf(env, user.id)).map((c) => c.id))
  if (ids.some((id) => !crew.has(id))) bad('You can only send routes to people in your clubs and leagues.', 403, 'not_crew')
  await limit('routeShare', "You've sent lots of routes today. Try again tomorrow.")

  const text = shareNotice(user.name, route.name, plannedAt)
  const stmts = []
  for (const id of ids) {
    // Sending the same route again replaces the copy they have, so their list doesn't fill with repeats
    stmts.push(env.DB.prepare('DELETE FROM route_shares WHERE route_id = ? AND from_user = ? AND to_user = ? AND hidden = 0').bind(route.id, user.id, id))
    stmts.push(env.DB.prepare(
      `INSERT INTO route_shares (id, route_id, from_user, to_user, name, mode, ring, distance_m, planned_at, created_at, hidden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    ).bind(uid(), route.id, user.id, id, route.name, route.mode, route.ring, route.distance_m, plannedAt, now))
    stmts.push(notify(env, id, 'route', text, { at: now }))
  }
  await batched(env, stmts)
  return { ok: true, sent: ids, plannedAt }
}

async function sharedWithMe(env, userId) {
  const rows = (await env.DB.prepare(
    `SELECT s.*, u.name AS from_name, u.colour AS from_colour, u.crest AS from_crest
     FROM route_shares s LEFT JOIN users u ON u.id = s.from_user
     WHERE s.to_user = ? AND s.hidden = 0 ORDER BY s.created_at DESC LIMIT ?`,
  ).bind(userId, MAX_SHARED).all()).results
  return { shared: rows.map(shareOut) }
}

/**
 * Handle a route sharing path, or return undefined if the path isn't one.
 * ctx: { env, user, m, path, body, now, limit }
 */
export async function routeShareRoute(ctx) {
  const { env, user, m, path } = ctx
  if (path === '/api/crew' && m === 'GET') return { crew: await crewOf(env, user.id) }
  if (path === '/api/routes/shared' && m === 'GET') return sharedWithMe(env, user.id)
  const hm = path.match(/^\/api\/routes\/shared\/([A-Za-z0-9-]{1,64})$/)
  if (hm && m === 'DELETE') {
    const res = await env.DB.prepare('UPDATE route_shares SET hidden = 1 WHERE id = ? AND to_user = ? AND hidden = 0').bind(hm[1], user.id).run()
    if (!res.meta?.changes) bad('That shared route is gone.', 404, 'not_found')
    return { ok: true }
  }
  const sm = path.match(/^\/api\/routes\/([A-Za-z0-9-]{1,64})\/share$/)
  if (sm && m === 'POST') return share(ctx, sm[1])
  return undefined
}
