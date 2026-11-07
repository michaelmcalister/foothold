// King of the hill on the server: finds climbs in a saved activity (after
// the response, through ctx.waitUntil), records efforts on hills, moves the
// crown and tells the old holder, and serves GET /api/hills and
// GET /api/hills/:id (docs/API.md). The rules are in src/lib/engine/hills.js.

import { detectHills, holderAfter, hillTakenText, HILL } from '../src/lib/engine/hills.js'
import { MODES } from '../src/lib/engine/territory.js'
import { withDistance, sampleByDistance, coverage, smoothByDistance } from '../src/lib/runStats.js'
import { gridPlan, terrainAlts } from '../src/lib/terrain.js'
import { terrainHeights } from './elevation.js'
import { uid, parse, players, notify, batched } from './db.js'

const DAY = 86400000
const NOTIFY_WITHIN = 14 * DAY // an old import doesn't wake anyone up
const bad = (message, status = 400, code) => { throw Object.assign(new Error(message), { status, code }) }

export function rowToHill(r) {
  return {
    id: r.id, key: r.key, name: r.name, mode: r.mode, line: parse(r.line, []), profile: parse(r.profile, null),
    gainM: r.gain_m, lengthM: r.length_m, grade: r.grade,
    start: { lat: r.start_lat, lng: r.start_lng }, end: { lat: r.end_lat, lng: r.end_lng },
    holderUser: r.holder_user || null, holderS: r.holder_s ?? null, createdAt: r.created_at,
  }
}

/** Hills of one mode whose start sits inside [w, s, e, n] */
export async function hillsIn(env, mode, [w, s, e, n], limit = 300) {
  const rows = (await env.DB.prepare('SELECT * FROM hills WHERE mode = ? AND start_lat BETWEEN ? AND ? AND start_lng BETWEEN ? AND ? LIMIT ?')
    .bind(mode, s, n, w, e, limit).all()).results
  return rows.map(rowToHill)
}

// Samples about every 20 m: fine enough for a 250 m climb, cheap for a long ride
function samplesFor(track) {
  const pts = withDistance(track)
  const total = pts[pts.length - 1]?.d || 0
  return sampleByDistance(pts, Math.max(30, Math.min(800, Math.round(total / 20))))
}

// Heights per sample: a watch file's own (barometer) heights for imports,
// otherwise terrain heights. Never the phone's GPS heights: too easy to bend.
async function heightsFor(env, samples, source, fetcher) {
  if (source === 'import' && coverage(samples, 'alt') > 0.8) return smoothByDistance(samples.map((s) => s.alt), samples.map((s) => s.d), 40)
  const plan = gridPlan(samples)
  if (!plan) return null
  const r = await terrainHeights(env, plan.nodes, fetcher ? { fetcher } : {})
  return r.elev ? terrainAlts(plan, r.elev, samples) : null
}

/**
 * After an activity is saved and passed the anti-cheat. Finds climbs and
 * passes over known hills, records the efforts, moves crowns and tells
 * whoever lost one. Returns what it recorded (tests use it).
 */
export async function detectAfterSave(env, user, { id, mode, source, track, zones = [], startedAt, now = Date.now(), fetcher = null }) {
  if (!track?.length || track.length < 2) return []
  const samples = samplesFor(track)
  if (samples.length < 2) return []
  const lats = samples.map((s) => s.lat)
  const lngs = samples.map((s) => s.lng)
  const pad = 0.002
  const near = await hillsIn(env, mode, [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad])
  const alts = await heightsFor(env, samples, source, fetcher).catch(() => null)
  const { created, efforts } = detectHills({ samples, alts, hills: near, mode, zones })
  if (!efforts.length) return []

  // New hills first, so efforts can point at them. Two people making the
  // same hill at once both land on the one row (the key is unique).
  const byId = new Map(near.map((h) => [h.id, h]))
  for (let i = 0; i < created.length; i++) {
    const h = created[i]
    await env.DB.prepare(
      `INSERT OR IGNORE INTO hills (id, key, name, mode, line, profile, gain_m, length_m, grade, start_lat, start_lng, end_lat, end_lng, holder_user, holder_s, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
    ).bind(uid(), h.key, h.name, mode, JSON.stringify(h.line), JSON.stringify(h.profile), h.gainM, h.lengthM, h.grade, h.start.lat, h.start.lng, h.end.lat, h.end.lng, now).run()
    const row = await env.DB.prepare('SELECT * FROM hills WHERE key = ?').bind(h.key).first()
    if (row) byId.set(`new:${i}`, rowToHill(row))
  }

  const at = startedAt ?? now
  const stmts = []
  const out = []
  const lost = []
  for (const e of efforts) {
    const hill = byId.get(e.hillId)
    if (!hill) continue
    const next = holderAfter(hill, user.id, e.seconds)
    const moved = next.holder.userId === user.id && (hill.holderUser !== user.id || e.seconds < hill.holderS)
    stmts.push(env.DB.prepare('INSERT INTO hill_efforts (id, hill_id, user_id, activity_id, seconds, took_crown, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(uid(), hill.id, user.id, id, e.seconds, next.tookCrown ? 1 : 0, at))
    if (moved) {
      // Only if nobody got there faster in the meantime
      stmts.push(env.DB.prepare('UPDATE hills SET holder_user = ?, holder_s = ? WHERE id = ? AND (holder_s IS NULL OR holder_s > ?)').bind(user.id, e.seconds, hill.id, e.seconds))
    }
    if (next.from && now - at <= NOTIFY_WITHIN) lost.push({ to: next.from, text: hillTakenText(hill.name, user.name, e.seconds) })
    out.push({ hillId: hill.id, name: hill.name, seconds: e.seconds, tookCrown: next.tookCrown, created: String(e.hillId).startsWith('new:') })
  }
  for (const l of lost) stmts.push(notify(env, l.to, 'hill', l.text, { at: now }))
  await batched(env, stmts)
  return out
}

/** The fastest effort becomes the holder again (after a delete), for these hills */
export function refreshHolderStatements(env, ids) {
  return [...new Set(ids)].map((hid) => env.DB.prepare(
    `UPDATE hills SET
       holder_user = (SELECT user_id FROM hill_efforts WHERE hill_id = ? ORDER BY seconds, created_at LIMIT 1),
       holder_s = (SELECT seconds FROM hill_efforts WHERE hill_id = ? ORDER BY seconds, created_at LIMIT 1)
     WHERE id = ?`,
  ).bind(hid, hid, hid))
}

/** Hills a player holds, so their deletion can hand the crowns on */
export async function heldBy(env, userId) {
  return (await env.DB.prepare('SELECT id FROM hills WHERE holder_user = ?').bind(userId).all()).results.map((r) => r.id)
}

/** An activity was deleted: its efforts go, and its hills' crowns are worked out again */
export async function hillsAfterDelete(env, activityId) {
  const ids = (await env.DB.prepare('SELECT DISTINCT hill_id FROM hill_efforts WHERE activity_id = ?').bind(activityId).all()).results.map((r) => r.hill_id)
  if (!ids.length) return
  await batched(env, [env.DB.prepare('DELETE FROM hill_efforts WHERE activity_id = ?').bind(activityId), ...refreshHolderStatements(env, ids)])
}

// How many people have a best faster than `seconds` on a hill, plus one
async function rankOf(env, hillId, seconds, userId) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM (SELECT user_id, MIN(seconds) AS s FROM hill_efforts WHERE hill_id = ? AND user_id != ? GROUP BY user_id) WHERE s < ?')
    .bind(hillId, userId, seconds).first()
  return (r?.n || 0) + 1
}

/** Hills climbed in one activity: [{ id, name, seconds, rank, tookCrown, holds }] */
export async function hillsForActivity(env, viewerId, activityId) {
  const rows = (await env.DB.prepare(
    `SELECT e.hill_id, e.user_id, e.seconds, e.took_crown, h.name, h.holder_user FROM hill_efforts e JOIN hills h ON h.id = e.hill_id
     WHERE e.activity_id = ? ORDER BY e.created_at`,
  ).bind(activityId).all()).results
  const out = []
  for (const r of rows) {
    out.push({ id: r.hill_id, name: r.name, seconds: r.seconds, rank: await rankOf(env, r.hill_id, r.seconds, r.user_id), tookCrown: !!r.took_crown, holds: r.holder_user === r.user_id && r.user_id === viewerId })
  }
  return out
}

async function holderOut(env, hills, viewerId) {
  const names = await players(env, hills.map((h) => h.holderUser))
  return (h) => {
    const p = h.holderUser && names.get(h.holderUser)
    return h.holderUser ? { userId: h.holderUser, name: p?.name || 'Someone', colour: p?.colour || '#888888', seconds: h.holderS, me: h.holderUser === viewerId } : null
  }
}

function hillOut(h, holder) {
  return { id: h.id, name: h.name, mode: h.mode, line: h.line, gainM: h.gainM, lengthM: h.lengthM, grade: h.grade, start: h.start, end: h.end, top: h.end, holder }
}

function modeParam(url) {
  const m = url.searchParams.get('mode') || 'run'
  if (!MODES.includes(m)) bad('Mode must be run, walk or ride.')
  return m
}
function bboxParam(url) {
  const v = url.searchParams.get('bbox')
  if (v == null || v === '') bad('Send the map area as bbox=west,south,east,north.')
  const b = String(v).split(',').map(Number)
  const ok = b.length === 4 && b.every(Number.isFinite) && b[0] >= -180 && b[2] <= 180 && b[1] >= -90 && b[3] <= 90 && b[0] < b[2] && b[1] < b[3]
  if (!ok) bad('bbox must be west,south,east,north in degrees.')
  if ((b[2] - b[0]) * (b[3] - b[1]) > 4) bad('That map area is too big. Zoom in a little.')
  return b
}

/** GET /api/hills and GET /api/hills/:id. Returns undefined for other paths. */
export async function hillRoute({ env, user, url, m, path }) {
  if (m !== 'GET' || !path.startsWith('/api/hills')) return undefined
  if (path === '/api/hills') {
    const mode = modeParam(url)
    const list = await hillsIn(env, mode, bboxParam(url))
    const who = await holderOut(env, list, user.id)
    return { hills: list.map((h) => hillOut(h, who(h))) }
  }
  const hm = path.match(/^\/api\/hills\/([A-Za-z0-9-]{1,64})$/)
  if (!hm) return undefined
  const row = await env.DB.prepare('SELECT * FROM hills WHERE id = ?').bind(hm[1]).first()
  if (!row) bad('That hill is gone.', 404, 'not_found')
  const h = rowToHill(row)
  const top = (await env.DB.prepare('SELECT user_id, MIN(seconds) AS seconds, MIN(created_at) AS at FROM hill_efforts WHERE hill_id = ? GROUP BY user_id ORDER BY seconds, at LIMIT 10')
    .bind(h.id).all()).results
  const best = await env.DB.prepare('SELECT seconds, created_at AS at, activity_id FROM hill_efforts WHERE hill_id = ? AND user_id = ? ORDER BY seconds, created_at LIMIT 1').bind(h.id, user.id).first()
  const people = (await env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM hill_efforts WHERE hill_id = ?').bind(h.id).first())?.n || 0
  const names = await players(env, [h.holderUser, ...top.map((r) => r.user_id)])
  const who = await holderOut(env, [h], user.id)
  return {
    hill: { ...hillOut(h, who(h)), profile: h.profile, people },
    board: top.map((r, i) => ({ rank: i + 1, userId: r.user_id, name: names.get(r.user_id)?.name || 'Someone', colour: names.get(r.user_id)?.colour || '#888888', seconds: r.seconds, at: r.at, me: r.user_id === user.id })),
    mine: best ? { rank: await rankOf(env, h.id, best.seconds, user.id), seconds: best.seconds, at: best.at, activityId: best.activity_id } : null,
  }
}

export { HILL }
