// The Foothold API worker: every /api route in docs/API.md, the hourly cron
// (worker/cron.js), and the built app as static assets for everything else.

import {
  processActivity, currentStrength, daysUntilWild, levelFor, loadCheck, weeklyKm, battleScore,
  hexIsPrivate, HEX_KM2, MODES, seasonFor, seasonOut, seasonById, previousSeason, seasonSummary, showSummary, heatOf,
} from '../src/lib/engine/index.js'
import { isCrest } from '../src/lib/crests.js'
import {
  uid, parse, userOut, players, packTrack, unpackTrack, activityOut, ACTIVITY_COLS, rowToCell,
  cellsIn, cellsByIds, upsertCell, batched, hexCount, rowToBattle, upsertBattle, notify, hit,
} from './db.js'
import { encryptSecret, decryptSecret } from './crypto.js'
import { extractToken, fetchSummary, logCardio } from './formtrack.js'
import { authConfig, userFor } from './auth.js'
import { runCron } from './cron.js'
import { cleanRoute, MAX_ROUTES } from '../src/lib/planner.js'
import { handleTts, ttsConfig } from './tts.js'
import { handleAiPlan, aiConfig } from './aiplan.js'
import { weekStatements, explored, quests, week } from './weekly.js'
import { afterActivity, afterDelete, strongholdRoutes } from './strongholds.js'
import { socialRoute, swapStatements, activityCommentDeletes } from './social.js'
import { exportAccount, deleteAccount } from './account.js'
import { divisionRoute } from './divisions.js'

const DAY = 86400000
const WEEK = 7 * DAY
const MAX_POINTS = 50_000
const MAX_BODY = 12_000_000 // bytes; 50k points with heart rate and cadence fit comfortably
const SOURCES = ['phone', 'watch', 'import']
const FEEDBACK_KINDS = ['bug', 'idea', 'other']
const VERB = { run: 'in a run', walk: 'on a walk', ride: 'on a ride' }

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } })
const err = (error, status = 400, code) => json(code ? { error, code } : { error }, status)
// Throw from anywhere in a route to send a 4xx with a plain English message
const bad = (message, status = 400, code) => { throw Object.assign(new Error(message), { status, code }) }

const km2 = (hexes) => Math.round(hexes * HEX_KM2 * 100) / 100
const isNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi
const modeOf = (v, fallback = 'run') => {
  if (v == null || v === '') return fallback
  if (!MODES.includes(v)) bad('Mode must be run, walk or ride.')
  return v
}

// ---- CORS, for the app when it's served from somewhere else (GitHub Pages) ----
function corsHeaders(req, env) {
  const origin = req.headers.get('origin')
  if (!origin) return {}
  const allowed = [env.APP_URL, ...String(env.ALLOWED_ORIGINS || '').split(',')].map((s) => String(s || '').trim().replace(/\/$/, '')).filter(Boolean)
  if (!allowed.includes(origin)) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-device-id',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

// ---- input checks ----

function cleanPoints(points) {
  if (!Array.isArray(points)) bad('Send the activity as a list of GPS points.')
  if (points.length < 10) bad('That activity is too short to save.')
  if (points.length > MAX_POINTS) bad(`That activity has more than ${MAX_POINTS.toLocaleString('en-AU')} points. Split it into shorter ones.`)
  const tMin = Date.UTC(2015, 0, 1)
  const tMax = Date.now() + DAY
  const out = new Array(points.length)
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const where = `Point ${i + 1}`
    if (!p || typeof p !== 'object') bad(`${where} isn't a GPS point.`)
    if (!isNum(p.lat, -90, 90) || !isNum(p.lng, -180, 180)) bad(`${where} has a latitude or longitude out of range.`)
    if (!isNum(p.t, tMin, tMax)) bad(`${where} has a time that isn't epoch milliseconds between 2015 and now.`)
    const q = { lat: p.lat, lng: p.lng, t: p.t }
    if (p.alt != null) { if (!isNum(p.alt, -500, 9000)) bad(`${where} has an altitude out of range.`); q.alt = p.alt }
    if (p.acc != null) { if (!isNum(p.acc, 0, 100000)) bad(`${where} has an accuracy out of range.`); q.acc = p.acc }
    if (p.hr != null) { if (!isNum(p.hr, 20, 250)) bad(`${where} has a heart rate out of range.`); q.hr = p.hr }
    if (p.cad != null) { if (!isNum(p.cad, 0, 300)) bad(`${where} has a cadence out of range.`); q.cad = p.cad }
    out[i] = q
  }
  return out
}

function cleanZones(zones) {
  if (!Array.isArray(zones)) bad('Privacy zones must be a list.')
  if (zones.length > 5) bad('You can have up to five privacy zones.')
  return zones.map((z) => {
    if (!z || !isNum(z.lat, -90, 90) || !isNum(z.lng, -180, 180)) bad('Each privacy zone needs a valid latitude and longitude.')
    const radiusM = z.radiusM == null ? 400 : z.radiusM
    if (!isNum(radiusM, 100, 2000)) bad('A privacy zone radius must be between 100 and 2000 metres.')
    return { lat: z.lat, lng: z.lng, radiusM: Math.round(radiusM), label: String(z.label || 'Private').trim().slice(0, 30) || 'Private' }
  })
}

function bboxOf(points) {
  let w = 180, s = 90, e = -180, n = -90
  for (const p of points) {
    if (p.lng < w) w = p.lng
    if (p.lng > e) e = p.lng
    if (p.lat < s) s = p.lat
    if (p.lat > n) n = p.lat
  }
  return [w, s, e, n]
}
function pad([w, s, e, n], m) {
  const dLat = m / 111320
  const dLng = m / (111320 * Math.max(0.05, Math.cos(((s + n) / 2) * Math.PI / 180)))
  return [w - dLng, s - dLat, e + dLng, n + dLat]
}
function parseBbox(v) {
  if (v == null || v === '') return null
  const b = String(v).split(',').map(Number)
  if (b.length !== 4 || !isNum(b[0], -180, 180) || !isNum(b[2], -180, 180) || !isNum(b[1], -90, 90) || !isNum(b[3], -90, 90) || b[0] >= b[2] || b[1] >= b[3]) {
    bad('bbox must be west,south,east,north in degrees.')
  }
  return b
}

// ---- battles for the app: names, colours and the score ----
async function decorateBattles(env, battles, now = Date.now()) {
  if (!battles.length) return []
  const names = await players(env, battles.flatMap((b) => [b.attacker, b.defender]))
  const out = []
  for (const b of battles) {
    const score = b.finalScore || battleScore(b, await cellsByIds(env, b.mode, b.hexes), now)
    const a = names.get(b.attacker) || {}
    const d = names.get(b.defender) || {}
    const { finalScore, ...rest } = b
    out.push({
      ...rest, attackerName: a.name || 'Someone', defenderName: d.name || 'Someone', attackerColour: a.colour || '#888888', defenderColour: d.colour || '#888888',
      attackerCrest: a.crest || null, defenderCrest: d.crest || null, score,
    })
  }
  return out
}

async function liveBattles(env, userId, mode, now) {
  const rows = (await env.DB.prepare('SELECT * FROM battles WHERE ended_at IS NULL AND ends_at > ? AND mode = ? AND (attacker = ? OR defender = ?)')
    .bind(now, mode, userId, userId).all()).results
  return rows.map(rowToBattle)
}

async function clubOut(env, clubId, viewer, now = Date.now()) {
  const c = await env.DB.prepare(
    `SELECT c.id, c.name,
      (SELECT COUNT(*) FROM club_members m WHERE m.club_id = c.id) AS members,
      (SELECT COUNT(*) FROM cells x JOIN club_members m ON m.user_id = x.owner WHERE m.club_id = c.id AND x.mode = 'run' AND x.wild_at > ?) AS hexes
     FROM clubs c WHERE c.id = ?`,
  ).bind(now, clubId).first()
  return c && { id: c.id, name: c.name, members: c.members, hexes: c.hexes, mine: viewer.club_id === c.id }
}

async function joinClub(env, user, clubId) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM club_members WHERE user_id = ?').bind(user.id),
    env.DB.prepare('INSERT INTO club_members (club_id, user_id, joined_at) VALUES (?, ?, ?)').bind(clubId, user.id, Date.now()),
    env.DB.prepare('UPDATE users SET club_id = ? WHERE id = ?').bind(clubId, user.id),
  ])
  user.club_id = clubId
}

// ---- routes ----

async function postActivity(env, user, body, ctx) {
  const mode = modeOf(body.mode)
  const source = body.source == null ? 'phone' : body.source
  if (!SOURCES.includes(source)) bad('Source must be phone, watch or import.')
  if (body.startedAt != null && !isNum(body.startedAt, Date.UTC(2015, 0, 1), Date.now() + DAY)) bad('startedAt must be epoch milliseconds between 2015 and now.')
  const points = cleanPoints(body.points)

  const now = Date.now()
  const zones = parse(user.zones, [])
  const area = pad(bboxOf(points), 2000)
  const cells = await cellsIn(env, mode, area, now)
  const battles = await liveBattles(env, user.id, mode, now)
  const hexesBefore = await hexCount(env, user.id, mode, now)
  const history = (await env.DB.prepare('SELECT mode, started_at, distance_m FROM activities WHERE user_id = ? AND rejected = 0 AND started_at >= ?')
    .bind(user.id, now - 5 * WEEK).all()).results.map((r) => ({ mode: r.mode, startedAt: r.started_at, distanceM: r.distance_m }))
  const load = loadCheck(history, 0, now, mode)

  const id = uid()
  const res = processActivity({ id, userId: user.id, mode, points, source, startedAt: body.startedAt }, { cells, zones, battles, now })
  const a = res.activity
  const centre = a.bbox ? { lat: (a.bbox[1] + a.bbox[3]) / 2, lng: (a.bbox[0] + a.bbox[2]) / 2 } : null

  const stmts = [env.DB.prepare(
    `INSERT INTO activities (id, user_id, mode, source, started_at, distance_m, duration_s, moving_s, pace_s_per_km, elev_gain_m,
      loops, gain, claimed, reinforced, taken, held, trust, flags, rejected, reject_reason, start, bbox, lat, lng, track, public_track, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, user.id, mode, source, a.startedAt, a.distanceM, a.durationS, a.movingS, a.paceSPerKm, a.elevGainM,
    a.loops || 0, a.gain || 0, a.claimed || 0, a.reinforced || 0, a.taken || 0, a.held || 0, a.trust, JSON.stringify(a.flags), a.rejected ? 1 : 0, a.rejectReason,
    a.start ? JSON.stringify(a.start) : null, a.bbox ? JSON.stringify(a.bbox) : null, centre?.lat ?? null, centre?.lng ?? null,
    packTrack(res.track), packTrack(res.publicTrack), now)]

  for (const c of res.updated.values()) stmts.push(upsertCell(env, mode, c))
  // Personal bests and stronghold efforts (worker/strongholds.js)
  const extra = await afterActivity(env, user, { id, mode, res, now })
  stmts.push(...extra.stmts)
  for (const b of res.battles) {
    b.mode = mode
    stmts.push(upsertBattle(env, b))
  }
  stmts.push(...weekStatements(env, user.id, id, mode, res, now)) // visited hexes, lost ground (worker/weekly.js)
  stmts.push(...swapStatements(env, { activityId: id, mode, taker: user.id, taken: res.diff?.taken, at: now }))

  // Tell each player who lost ground, as a question they can answer with a run
  const diff = res.diff || { claimed: [], reinforced: [], taken: [], held: [] }
  const lost = new Map()
  for (const t of diff.taken) lost.set(t.from, (lost.get(t.from) || 0) + 1)
  for (const [defender, n] of lost) {
    stmts.push(notify(env, defender, 'taken', `${user.name} took ${n === 1 ? 'one' : n} of your hexes ${VERB[mode]}. Will you take ${n === 1 ? 'it' : 'them'} back this week?`, { at: now }))
  }
  const names = await players(env, [...lost.keys()])
  for (const b of res.battles) {
    if (b.startedAt === now) {
      stmts.push(notify(env, user.id, 'battle', `You took ${b.hexes.length} hexes from ${names.get(b.defender)?.name || 'a rival'}. A one-week battle has started. Can you hold them?`, { at: now }))
    }
  }
  await batched(env, stmts)

  // Linked to FormTrack: log it there as cardio too, in the background when we can
  if (!a.rejected && user.formtrack_token_enc && env.TOKEN_KEY) {
    const sync = decryptSecret(env.TOKEN_KEY, user.formtrack_token_enc)
      .then((token) => token && logCardio(env, token, { ...a, id }))
      .catch(() => {})
    if (ctx?.waitUntil) ctx.waitUntil(sync)
    else await Promise.race([sync, new Promise((r) => setTimeout(r, 5000))])
  }

  const row = await env.DB.prepare(`SELECT ${ACTIVITY_COLS} FROM activities a WHERE a.id = ?`).bind(id).first()
  return {
    activity: activityOut(row, user.id),
    prs: extra.prs,
    strongholds: extra.strongholds,
    diff,
    battles: await decorateBattles(env, res.battles, now),
    hexesBefore,
    hexesAfter: await hexCount(env, user.id, mode, now),
    load,
    loops: res.loops.map((l) => l.ring),
  }
}

async function territory(env, user, url) {
  const mode = modeOf(url.searchParams.get('mode'))
  const bbox = parseBbox(url.searchParams.get('bbox'))
  const now = Date.now()
  // Others' private hexes (inside their privacy zones) never leave the server
  const rows = bbox
    ? (await env.DB.prepare(
      `SELECT c.*, u.name AS owner_name, u.colour AS owner_colour, u.crest AS owner_crest FROM cells c JOIN users u ON u.id = c.owner
       WHERE c.mode = ? AND c.lat BETWEEN ? AND ? AND c.lng BETWEEN ? AND ? AND c.wild_at > ? AND (c.private = 0 OR c.owner = ?)
       LIMIT 5000`,
    ).bind(mode, bbox[1], bbox[3], bbox[0], bbox[2], now, user.id).all()).results
    : (await env.DB.prepare(
      `SELECT c.*, u.name AS owner_name, u.colour AS owner_colour, u.crest AS owner_crest FROM cells c JOIN users u ON u.id = c.owner
       WHERE c.mode = ? AND c.owner = ? AND c.wild_at > ? LIMIT 5000`,
    ).bind(mode, user.id, now).all()).results
  const out = []
  for (const r of rows) {
    const c = rowToCell(r)
    const strength = currentStrength(c, now)
    if (!strength) continue // wild
    out.push({
      h3: c.h3, owner: c.owner, ownerName: r.owner_name, ownerColour: r.owner_colour, ownerCrest: r.owner_crest || null, mine: c.owner === user.id,
      strength: Math.round(strength), daysToWild: daysUntilWild(c, now), flips: c.flips || 0, heat: heatOf(c, now), lastFlip: c.lastFlip ?? null,
    })
  }
  return { cells: out }
}

async function stats(env, user, url) {
  const mode = modeOf(url.searchParams.get('mode'))
  const now = Date.now()
  const hexes = await hexCount(env, user.id, mode, now)
  const lv = levelFor(hexes)
  const acts = (await env.DB.prepare('SELECT mode, started_at, distance_m FROM activities WHERE user_id = ? AND rejected = 0 AND started_at >= ?')
    .bind(user.id, now - 12 * WEEK).all()).results.map((r) => ({ mode: r.mode, startedAt: r.started_at, distanceM: r.distance_m }))
  const weeks = weeklyKm(acts, now, 12, mode)
  const counts = new Array(12).fill(0)
  for (const a of acts) {
    const w = Math.floor((now - a.startedAt) / WEEK)
    if (w >= 0 && w < 12) counts[w]++
  }
  let streakWeeks = 0
  for (let w = counts[0] ? 0 : 1; w < 12 && counts[w]; w++) streakWeeks++
  const fading = await env.DB.prepare('SELECT COUNT(*) AS n FROM cells WHERE owner = ? AND mode = ? AND wild_at > ? AND wild_at <= ?')
    .bind(user.id, mode, now, now + 3 * DAY).first()
  const totals = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(distance_m), 0) AS m FROM activities WHERE user_id = ? AND rejected = 0 AND mode = ?')
    .bind(user.id, mode).first()
  return {
    hexes,
    km2: km2(hexes),
    level: lv.level,
    next: lv.next,
    toNext: lv.toNext,
    weekKm: weeks.slice(0, 5),
    weekKm12: weeks,
    streakWeeks,
    fadingSoon: fading?.n || 0,
    activities: totals?.n || 0,
    totalKm: Math.round((totals?.m || 0) / 100) / 10,
  }
}

// Hexes each player gained (claimed plus taken) in a season, by scope
async function seasonCounts(env, user, mode, season, scope, centre) {
  const base = 'SELECT a.user_id AS owner, SUM(a.claimed + a.taken) AS n FROM activities a WHERE a.rejected = 0 AND a.mode = ? AND a.started_at >= ? AND a.started_at < ?'
  const args = [mode, season.startsAt, season.endsAt]
  let extra = ''
  if (scope === 'club') {
    if (!user.club_id) return []
    extra = ' AND a.user_id IN (SELECT user_id FROM club_members WHERE club_id = ?)'
    args.push(user.club_id)
  } else if (scope === 'me') {
    extra = ' AND a.user_id = ?'
    args.push(user.id)
  } else if (centre) {
    const [w, s, e, n] = pad([centre.lng, centre.lat, centre.lng, centre.lat], 5000)
    extra = ' AND a.lat BETWEEN ? AND ? AND a.lng BETWEEN ? AND ?'
    args.push(s, n, w, e)
  }
  return (await env.DB.prepare(`${base}${extra} GROUP BY a.user_id HAVING n > 0 ORDER BY n DESC LIMIT 100`).bind(...args).all()).results
}

async function leaderboard(env, user, url) {
  const mode = modeOf(url.searchParams.get('mode'))
  const scope = url.searchParams.get('scope') || 'local'
  if (!['local', 'world', 'club'].includes(scope)) bad('Scope must be local, world or club.')
  const board = url.searchParams.get('board') || 'all'
  if (!['all', 'season'].includes(board)) bad('Board must be all or season.')
  const now = Date.now()
  const season = seasonFor(now)
  let counts = []
  if (board === 'season') {
    // Ground gained this season, so someone starting today can still top it
    const centre = scope === 'local' ? await boardCentre(env, user, url) : null
    counts = await seasonCounts(env, user, mode, season, scope, centre)
    const byId = new Map(counts.map((r) => [r.owner, r.n]))
    if (!byId.has(user.id)) byId.set(user.id, scope === 'world' ? (await seasonCounts(env, user, mode, season, 'me'))[0]?.n || 0 : 0)
    const names = await players(env, [...byId.keys()])
    const rows = [...byId].map(([id, gained]) => ({
      userId: id, name: names.get(id)?.name || 'Someone', colour: names.get(id)?.colour || '#888888', crest: names.get(id)?.crest || null, gained, me: id === user.id,
    })).sort((a, b) => b.gained - a.gained || (a.me ? -1 : b.me ? 1 : 0))
    return { rows, season: seasonOut(season, now) }
  }
  if (scope === 'club') {
    counts = user.club_id
      ? (await env.DB.prepare(
        `SELECT m.user_id AS owner, (SELECT COUNT(*) FROM cells x WHERE x.owner = m.user_id AND x.mode = ? AND x.wild_at > ?) AS n
         FROM club_members m WHERE m.club_id = ?`,
      ).bind(mode, now, user.club_id).all()).results
      : []
  } else {
    const centre = scope === 'local' ? await boardCentre(env, user, url) : null
    if (centre) {
      // Everyone holding ground within about 5 km, counting their hexes in that area
      const [w, s, e, n] = pad([centre.lng, centre.lat, centre.lng, centre.lat], 5000)
      counts = (await env.DB.prepare(
        'SELECT owner, COUNT(*) AS n FROM cells WHERE mode = ? AND wild_at > ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? GROUP BY owner ORDER BY n DESC LIMIT 100',
      ).bind(mode, now, s, n, w, e).all()).results
    } else {
      counts = (await env.DB.prepare('SELECT owner, COUNT(*) AS n FROM cells WHERE mode = ? AND wild_at > ? GROUP BY owner ORDER BY n DESC LIMIT 100')
        .bind(mode, now).all()).results
    }
  }
  const byId = new Map(counts.map((r) => [r.owner, r.n]))
  if (!byId.has(user.id)) byId.set(user.id, scope === 'world' ? await hexCount(env, user.id, mode, now) : 0)
  const names = await players(env, [...byId.keys()])
  const rows = [...byId].map(([id, hexes]) => ({
    userId: id, name: names.get(id)?.name || 'Someone', colour: names.get(id)?.colour || '#888888', crest: names.get(id)?.crest || null, hexes, km2: km2(hexes), me: id === user.id,
  })).sort((a, b) => b.hexes - a.hexes || (a.me ? -1 : b.me ? 1 : 0))
  return { rows, season: seasonOut(season, now) }
}

// Where "near you" is for a leaderboard: the location sent, else where this player last went out
async function boardCentre(env, user, url) {
  const lat = url.searchParams.get('lat')
  const lng = url.searchParams.get('lng')
  if (lat != null || lng != null) {
    if (!isNum(Number(lat), -90, 90) || !isNum(Number(lng), -180, 180) || lat === '' || lng === '') bad('lat and lng must be valid coordinates.')
    return { lat: Number(lat), lng: Number(lng) }
  }
  const last = await env.DB.prepare('SELECT lat, lng FROM activities WHERE user_id = ? AND lat IS NOT NULL ORDER BY started_at DESC LIMIT 1').bind(user.id).first()
  return last ? { lat: last.lat, lng: last.lng } : null
}

// This season, and how the player went in the last one (every map, every player)
async function season(env, user, now = Date.now()) {
  const cur = seasonFor(now)
  const prev = previousSeason(cur)
  const rows = (await env.DB.prepare(
    'SELECT user_id, SUM(claimed + taken) AS n FROM activities WHERE rejected = 0 AND started_at >= ? AND started_at < ? GROUP BY user_id HAVING n > 0',
  ).bind(prev.startsAt, prev.endsAt).all()).results
  const previous = seasonSummary(new Map(rows.map((r) => [r.user_id, r.n])), user.id, prev)
  const seen = parse(user.prefs, {}).seasonSeen ?? null
  return { season: seasonOut(cur, now), previous, showSummary: showSummary(previous, cur, seen, now) }
}

async function feed(env, user) {
  const last = await env.DB.prepare('SELECT lat, lng FROM activities WHERE user_id = ? AND lat IS NOT NULL ORDER BY started_at DESC LIMIT 1').bind(user.id).first()
  const where = ['a.user_id = ?']
  const args = [user.id]
  if (user.club_id) { where.push('a.user_id IN (SELECT user_id FROM club_members WHERE club_id = ?)'); args.push(user.club_id) }
  where.push('a.user_id IN (SELECT defender FROM battles WHERE attacker = ? UNION SELECT attacker FROM battles WHERE defender = ?)')
  args.push(user.id, user.id)
  if (last) {
    // Activities near where this player goes out, about 10 km around
    const [w, s, e, n] = pad([last.lng, last.lat, last.lng, last.lat], 10000)
    where.push('(a.lat BETWEEN ? AND ? AND a.lng BETWEEN ? AND ?)')
    args.push(s, n, w, e)
  } else {
    where.push('1 = 1') // brand new: show what's happening anywhere
  }
  const rows = (await env.DB.prepare(
    `SELECT ${ACTIVITY_COLS}, u.name AS user_name, u.colour AS user_colour, u.crest AS user_crest,
       EXISTS (SELECT 1 FROM kudos k WHERE k.activity_id = a.id AND k.user_id = ?) AS given
     FROM activities a JOIN users u ON u.id = a.user_id
     WHERE a.rejected = 0 AND (${where.join(' OR ')})
     ORDER BY a.started_at DESC LIMIT 30`,
  ).bind(user.id, ...args).all()).results
  return { items: rows.map((r) => ({ activity: activityOut(r, user.id, r.given), userName: r.user_name, userColour: r.user_colour, userCrest: r.user_crest || null, mine: r.user_id === user.id })) }
}

const routeOut = (r) => ({ id: r.id, name: r.name, mode: r.mode, ring: parse(r.ring, []), distanceM: r.distance_m, createdAt: r.created_at, updatedAt: r.updated_at })

async function route(req, env, url, user, ctx) {
  const path = url.pathname
  const m = req.method
  const now = Date.now()
  let body = {}
  if (m === 'POST' || m === 'PUT') {
    if (Number(req.headers.get('content-length') || 0) > MAX_BODY) bad('That upload is too big.', 413)
    const text = await req.text()
    if (text.length > MAX_BODY) bad('That upload is too big.', 413)
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        bad("That request wasn't valid JSON.")
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) bad('Send a JSON object.')
    }
  }
  // A light burst guard on every write
  if (m !== 'GET') {
    const r = await hit(env, 'write', user.id)
    if (!r.ok) return json({ error: 'Slow down a little. Try again in a minute.', code: 'rate_limited' }, 429, { 'retry-after': String(r.retryAfter || 60) })
  }
  const limit = async (bucket, message) => {
    const r = await hit(env, bucket, user.id)
    if (!r.ok) throw Object.assign(new Error(message), { status: 429, code: 'rate_limited', retryAfter: r.retryAfter })
  }

  // Comments, rivals and leagues (worker/social.js)
  const social = await socialRoute({ env, user, url, m, path, body, now, limit, decorateBattles })
  if (social !== undefined) return json(social)
  // Weekly divisions (worker/divisions.js)
  const div = await divisionRoute({ env, user, m, path, now })
  if (div !== undefined) return json(div)

  // Profile
  if (path === '/api/me' && m === 'GET') return json({ user: userOut(user) })
  if (path === '/api/me/export' && m === 'GET') return json(await exportAccount(env, user))
  if (path === '/api/me' && m === 'DELETE') return json(await deleteAccount(env, user))
  if (path === '/api/me' && m === 'PUT') {
    const sets = []
    const args = []
    if ('name' in body) {
      const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim().slice(0, 30) : ''
      if (name.length < 2) bad('Pick a name of at least two letters.')
      sets.push('name = ?'); args.push(name)
    }
    if ('colour' in body) {
      if (typeof body.colour !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(body.colour)) bad('Colour must look like #2E55E6.')
      sets.push('colour = ?'); args.push(body.colour.toUpperCase())
    }
    if ('mode' in body) { sets.push('mode = ?'); args.push(modeOf(body.mode)) }
    if ('crest' in body) {
      if (body.crest !== null && !isCrest(body.crest)) bad("That crest isn't one of the choices.")
      sets.push('crest = ?'); args.push(body.crest)
    }
    let zones = null
    if ('zones' in body) { zones = cleanZones(body.zones); sets.push('zones = ?'); args.push(JSON.stringify(zones)) }
    // App preferences the local adapter also keeps
    const prefs = parse(user.prefs, {})
    let prefsChanged = false
    if ('units' in body) { if (!['metric', 'imperial'].includes(body.units)) bad('Units must be metric or imperial.'); prefs.units = body.units; prefsChanged = true }
    if ('onboarded' in body) { prefs.onboarded = !!body.onboarded; prefsChanged = true }
    if ('goal' in body) {
      const g = body.goal
      if (g != null && (typeof g !== 'object' || JSON.stringify(g).length > 2000) && (typeof g !== 'string' || g.length > 200)) bad("That goal isn't something we can save.")
      prefs.goal = g ?? null; prefsChanged = true
    }
    if ('homeCentre' in body) {
      const h = body.homeCentre
      if (h != null && (!isNum(h?.lat, -90, 90) || !isNum(h?.lng, -180, 180))) bad('homeCentre needs a valid latitude and longitude.')
      prefs.homeCentre = h ? { lat: h.lat, lng: h.lng } : null; prefsChanged = true
    }
    if ('seasonSeen' in body) {
      if (body.seasonSeen !== null && !seasonById(body.seasonSeen)) bad("That season isn't one we know.")
      prefs.seasonSeen = body.seasonSeen; prefsChanged = true
    }
    if (prefsChanged) { sets.push('prefs = ?'); args.push(JSON.stringify(prefs)) }
    if (sets.length) await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...args, user.id).run()
    if (zones) {
      // New zones: re-mark which of this player's hexes are private
      const owned = (await env.DB.prepare('SELECT mode, h3, private FROM cells WHERE owner = ?').bind(user.id).all()).results
      const stmts = []
      for (const c of owned) {
        const p = hexIsPrivate(c.h3, zones) ? 1 : 0
        if (p !== c.private) stmts.push(env.DB.prepare('UPDATE cells SET private = ? WHERE mode = ? AND h3 = ?').bind(p, c.mode, c.h3))
      }
      await batched(env, stmts)
    }
    return json({ user: userOut(await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first()) })
  }

  // Activities
  if (path === '/api/activities' && m === 'POST') {
    // Imports get a bigger allowance: moving years of history across is normal
    if (body?.source === 'import') await limit('import', "That's a lot of imports for one day. The rest can come across tomorrow.")
    else await limit('activity', "That's a lot of activities for one day. Try again tomorrow.")
    return json(await postActivity(env, user, body, ctx))
  }
  if (path === '/api/activities' && m === 'GET') {
    const lim = Math.max(1, Math.min(200, Math.round(Number(url.searchParams.get('limit')) || 50)))
    const rows = (await env.DB.prepare(
      `SELECT ${ACTIVITY_COLS}, EXISTS (SELECT 1 FROM kudos k WHERE k.activity_id = a.id AND k.user_id = ?) AS given
       FROM activities a WHERE a.user_id = ? ORDER BY a.started_at DESC LIMIT ?`,
    ).bind(user.id, user.id, lim).all()).results
    return json({ activities: rows.map((r) => activityOut(r, user.id, r.given)) })
  }
  const am = path.match(/^\/api\/activities\/([A-Za-z0-9-]{1,64})(\/appeal|\/kudos)?$/)
  if (am) {
    const id = am[1]
    const sub = am[2] || ''
    const row = await env.DB.prepare(`SELECT ${ACTIVITY_COLS}, a.track, a.public_track,
        EXISTS (SELECT 1 FROM kudos k WHERE k.activity_id = a.id AND k.user_id = ?) AS given
      FROM activities a WHERE a.id = ?`).bind(user.id, id).first()
    if (!row) return err('That activity is gone.', 404, 'not_found')
    const mine = row.user_id === user.id
    if (!sub && m === 'GET') {
      return json({ activity: activityOut(row, user.id, row.given), track: unpackTrack(mine ? row.track : row.public_track) })
    }
    if (!sub && m === 'DELETE') {
      if (!mine) return err('You can only delete your own activities.', 403)
      // Ground already taken stays taken; only the record goes
      await env.DB.batch([
        env.DB.prepare('DELETE FROM kudos WHERE activity_id = ?').bind(id),
        ...activityCommentDeletes(env, id),
        env.DB.prepare('DELETE FROM activities WHERE id = ? AND user_id = ?').bind(id, user.id),
      ])
      await afterDelete(env, user, { id, mode: row.mode })
      return json({ ok: true })
    }
    if (sub === '/appeal' && m === 'POST') {
      if (!mine) return err('You can only appeal your own activities.', 403)
      const note = body.note == null ? '' : body.note
      if (typeof note !== 'string') bad('The appeal note must be text.')
      const old = parse(row.appeal, null)
      if (old && old.status !== 'open') bad('This appeal has already been decided.', 409, 'appeal_decided')
      const appeal = { note: note.trim().slice(0, 500), status: 'open', at: now }
      await env.DB.prepare('UPDATE activities SET appeal = ? WHERE id = ?').bind(JSON.stringify(appeal), id).run()
      return json({ activity: { ...activityOut(row, user.id, row.given), appeal } })
    }
    if (sub === '/kudos' && m === 'POST') {
      // A toggle: tap again to take it back
      const given = !row.given
      await env.DB.prepare(given ? 'INSERT OR IGNORE INTO kudos (activity_id, user_id, at) VALUES (?, ?, ?)' : 'DELETE FROM kudos WHERE activity_id = ? AND user_id = ?')
        .bind(...(given ? [id, user.id, now] : [id, user.id])).run()
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM kudos WHERE activity_id = ?').bind(id).first()
      return json({ kudos: n?.n || 0, given })
    }
  }

  // Territory and standing
  if (path === '/api/territory' && m === 'GET') return json(await territory(env, user, url))
  if (path === '/api/stats' && m === 'GET') return json(await stats(env, user, url))
  if (path === '/api/leaderboard' && m === 'GET') return json(await leaderboard(env, user, url))
  if (path === '/api/season' && m === 'GET') return json(await season(env, user, now))

  if (path === '/api/battles' && m === 'GET') {
    const rows = (await env.DB.prepare('SELECT * FROM battles WHERE attacker = ? OR defender = ? ORDER BY started_at DESC LIMIT 200').bind(user.id, user.id).all()).results
    const all = rows.map(rowToBattle)
    return json({
      live: await decorateBattles(env, all.filter((b) => !b.endedAt), now),
      past: await decorateBattles(env, all.filter((b) => b.endedAt).sort((a, b) => b.endedAt - a.endedAt).slice(0, 20), now),
    })
  }
  if (path === '/api/feed' && m === 'GET') return json(await feed(env, user))

  // Quests, the explored map and the weekly recap (worker/weekly.js)
  if (path === '/api/explored' && m === 'GET') return json(await explored(env, user, url))
  if (path === '/api/quests' && m === 'GET') return json(await quests(env, user, now))
  if (path === '/api/week' && m === 'GET') return json(await week(env, user, url, now))
  // Personal bests and strongholds
  if (path === '/api/bests' || path.startsWith('/api/strongholds')) {
    const out = await strongholdRoutes(env, user, url, m, now)
    if (out) return json(out)
  }

  // Clubs
  if (path === '/api/clubs' && m === 'GET') {
    const rows = (await env.DB.prepare(
      `SELECT c.id, c.name,
        (SELECT COUNT(*) FROM club_members m WHERE m.club_id = c.id) AS members,
        (SELECT COUNT(*) FROM cells x JOIN club_members m ON m.user_id = x.owner WHERE m.club_id = c.id AND x.mode = 'run' AND x.wild_at > ?) AS hexes
       FROM clubs c ORDER BY hexes DESC, members DESC LIMIT 100`,
    ).bind(now).all()).results
    const clubs = rows.map((c) => ({ id: c.id, name: c.name, members: c.members, hexes: c.hexes, mine: c.id === user.club_id }))
    if (user.club_id && !clubs.some((c) => c.mine)) {
      const mineClub = await clubOut(env, user.club_id, user, now)
      if (mineClub) clubs.push(mineClub)
    }
    return json({ clubs })
  }
  if (path === '/api/clubs' && m === 'POST') {
    const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim().slice(0, 40) : ''
    if (name.length < 3) bad('Give your club a name of at least three letters.')
    await limit('club', "You've made a few clubs today. Try again tomorrow.")
    const taken = await env.DB.prepare('SELECT 1 AS x FROM clubs WHERE lower(name) = lower(?)').bind(name).first()
    if (taken) bad('A club with that name already exists. Want to join it instead?', 409, 'club_exists')
    const id = uid()
    await env.DB.prepare('INSERT INTO clubs (id, name, created_by, created_at) VALUES (?, ?, ?, ?)').bind(id, name, user.id, now).run()
    await joinClub(env, user, id)
    return json({ club: await clubOut(env, id, user, now) })
  }
  const cm = path.match(/^\/api\/clubs\/([A-Za-z0-9-]{1,64})\/(join|leave)$/)
  if (cm && m === 'POST') {
    const [, id, action] = cm
    if (action === 'join') {
      const exists = await env.DB.prepare('SELECT id FROM clubs WHERE id = ?').bind(id).first()
      if (!exists) return err('That club is gone.', 404, 'not_found')
      await joinClub(env, user, id)
      return json({ club: await clubOut(env, id, user, now) })
    }
    // 'mine' leaves whichever club you're in
    await env.DB.batch([
      id === 'mine' ? env.DB.prepare('DELETE FROM club_members WHERE user_id = ?').bind(user.id) : env.DB.prepare('DELETE FROM club_members WHERE user_id = ? AND club_id = ?').bind(user.id, id),
      env.DB.prepare('UPDATE users SET club_id = NULL WHERE id = ? AND (? = \'mine\' OR club_id = ?)').bind(user.id, id, id),
    ])
    return json({ ok: true })
  }

  // Training plan (written by the coach in the app)
  if (path === '/api/plan' && m === 'GET') {
    const row = await env.DB.prepare('SELECT plan FROM plans WHERE user_id = ?').bind(user.id).first()
    return json({ plan: row ? parse(row.plan, null) : null })
  }
  if (path === '/api/plan' && m === 'PUT') {
    const plan = body.plan ?? null
    if (plan !== null && (typeof plan !== 'object' || Array.isArray(plan))) bad('The plan must be an object.')
    if (plan === null) {
      await env.DB.prepare('DELETE FROM plans WHERE user_id = ?').bind(user.id).run()
    } else {
      const s = JSON.stringify(plan)
      if (s.length > 100_000) bad('That plan is too big to save.', 413)
      await env.DB.prepare('INSERT INTO plans (user_id, plan, updated_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET plan = excluded.plan, updated_at = excluded.updated_at')
        .bind(user.id, s, now).run()
    }
    return json({ plan })
  }

  // Planned routes (the route planner), private to the player
  if (path === '/api/routes' && m === 'GET') {
    const rows = (await env.DB.prepare('SELECT * FROM routes WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?').bind(user.id, MAX_ROUTES).all()).results
    return json({ routes: rows.map(routeOut) })
  }
  if (path === '/api/routes' && m === 'POST') {
    let r
    try { r = cleanRoute(body) } catch (e) { bad(e.message) }
    const id = body.id == null ? null : String(body.id)
    if (id) {
      const res = await env.DB.prepare('UPDATE routes SET name = ?, mode = ?, ring = ?, distance_m = ?, updated_at = ? WHERE id = ? AND user_id = ?')
        .bind(r.name, r.mode, JSON.stringify(r.ring), r.distanceM, now, id, user.id).run()
      if (!res.meta?.changes) return err('That route is gone.', 404, 'not_found')
      return json({ route: routeOut(await env.DB.prepare('SELECT * FROM routes WHERE id = ?').bind(id).first()) })
    }
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM routes WHERE user_id = ?').bind(user.id).first()
    if ((n?.n || 0) >= MAX_ROUTES) bad(`You have ${MAX_ROUTES} saved routes. Delete one to save another.`, 409, 'too_many_routes')
    const newId = uid()
    await env.DB.prepare('INSERT INTO routes (id, user_id, name, mode, ring, distance_m, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId, user.id, r.name, r.mode, JSON.stringify(r.ring), r.distanceM, now, now).run()
    return json({ route: routeOut(await env.DB.prepare('SELECT * FROM routes WHERE id = ?').bind(newId).first()) })
  }
  const rm = path.match(/^\/api\/routes\/([A-Za-z0-9-]{1,64})$/)
  if (rm && m === 'DELETE') {
    const res = await env.DB.prepare('DELETE FROM routes WHERE id = ? AND user_id = ?').bind(rm[1], user.id).run()
    if (!res.meta?.changes) return err('That route is gone.', 404, 'not_found')
    return json({ ok: true })
  }

  // Notifications
  if (path === '/api/notifications' && m === 'GET') {
    const rows = (await env.DB.prepare('SELECT id, at, kind, text, read FROM notifications WHERE user_id = ? ORDER BY at DESC LIMIT 60').bind(user.id).all()).results
    return json({ items: rows.map((r) => ({ id: r.id, at: r.at, kind: r.kind, text: r.text, read: !!r.read })) })
  }
  if (path === '/api/notifications/read' && m === 'POST') {
    if (body.ids == null) {
      await env.DB.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').bind(user.id).run()
    } else {
      if (!Array.isArray(body.ids) || body.ids.length > 200 || body.ids.some((x) => typeof x !== 'string' || x.length > 64)) bad('ids must be a list of up to 200 notification ids.')
      const stmts = body.ids.map((id) => env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').bind(id, user.id))
      await batched(env, stmts)
    }
    return json({ ok: true })
  }

  // FormTrack link
  if (path === '/api/integrations/formtrack' && m === 'POST') {
    // A bare ftk_ token, or the whole link FormTrack shows
    const token = extractToken(body.token)
    if (!token) bad('That doesn\'t look like a FormTrack token. It starts with ftk_ and you can make one in FormTrack under Settings, Connections.', 400, 'formtrack_token')
    if (!env.TOKEN_KEY) bad("Linking FormTrack isn't switched on yet.", 503, 'not_configured')
    await limit('formtrack', 'Too many tries. Wait a bit before linking FormTrack again.')
    const summary = await fetchSummary(env, token, now) // throws a friendly error if FormTrack says no
    await env.DB.prepare('UPDATE users SET formtrack_token_enc = ?, formtrack_linked_at = ? WHERE id = ?').bind(await encryptSecret(env.TOKEN_KEY, token), now, user.id).run()
    return json({ linked: true, summary })
  }
  if (path === '/api/integrations/formtrack' && m === 'DELETE') {
    await env.DB.prepare('UPDATE users SET formtrack_token_enc = NULL, formtrack_linked_at = NULL WHERE id = ?').bind(user.id).run()
    return json({ linked: false })
  }
  if (path === '/api/integrations/formtrack/summary' && m === 'GET') {
    if (!user.formtrack_token_enc) return err("FormTrack isn't linked yet.", 404, 'not_linked')
    const token = env.TOKEN_KEY ? await decryptSecret(env.TOKEN_KEY, user.formtrack_token_enc) : null
    if (!token) return err('Link FormTrack again to keep your strength sessions in your plan.', 409, 'relink')
    try {
      return json(await fetchSummary(env, token, now))
    } catch (e) {
      // Revoked in FormTrack: unlink here too so the app shows the right state
      if (e.code === 'formtrack_token') await env.DB.prepare('UPDATE users SET formtrack_token_enc = NULL, formtrack_linked_at = NULL WHERE id = ?').bind(user.id).run()
      throw e
    }
  }

  // Feedback
  if (path === '/api/feedback' && m === 'POST') {
    if (!FEEDBACK_KINDS.includes(body.kind)) bad('Kind must be bug, idea or other.')
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) bad('Tell us a little about it first.')
    if (text.length > 2000) bad('Keep it under 2000 characters.')
    await limit('feedback', "Thanks, that's plenty for today. Send more tomorrow.")
    await env.DB.prepare('INSERT INTO feedback (id, user_id, kind, text, at) VALUES (?, ?, ?, ?, ?)').bind(uid(), user.id, body.kind, text, now).run()
    return json({ ok: true })
  }

  return err('Not found.', 404, 'not_found')
}

export async function handleApi(req, env, ctx) {
  const url = new URL(req.url)
  const cors = corsHeaders(req, env)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  let res
  // Public: what the app needs to start Auth0 sign-in
  if (url.pathname === '/api/config' && req.method === 'GET') {
    const cfg = authConfig(env)
    const out = cfg ? { auth0: { domain: cfg.domain, clientId: cfg.clientId, audience: cfg.audience } } : {}
    // Google Maps browser key for run recaps. It is a public key, locked to
    // this app's addresses in Google Cloud, so it is fine to hand to the app.
    if (env.ALLOW_DEVICE_IDS === '1') out.devices = true // local development: the app may use device ids
    if (env.GOOGLE_MAPS_KEY) out.maps = { googleKey: String(env.GOOGLE_MAPS_KEY) }
    // Spotify app id for music during runs (public; sign-in uses PKCE, no secret)
    if (env.SPOTIFY_CLIENT_ID) out.spotify = { clientId: String(env.SPOTIFY_CLIENT_ID) }
    const tts = ttsConfig(env) // the Australian voice coach (ElevenLabs), when its key is set
    if (tts) out.tts = tts
    const ai = aiConfig(env) // AI built plans (Claude), when its key is set
    if (ai) out.ai = ai
    res = json(out)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
  // Public, rate limited: the voice coach speaks on the practice map too
  if (url.pathname === '/api/tts' && req.method === 'POST') {
    res = await handleTts(req, env)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
  // Public, rate limited and spend capped: AI built plans work on the practice map too.
  // A signed-in player is also limited per account.
  if (url.pathname === '/api/plan/ai' && req.method === 'POST') {
    let user = null
    if (req.headers.get('authorization') || req.headers.get('x-device-id')) {
      try { user = (await userFor(req, env)).user || null } catch { user = null }
    }
    try {
      res = await handleAiPlan(req, env, { user })
    } catch (e) {
      console.error('ai plan route', e?.message) // never the request body
      res = err('Something went wrong on our side. Try again in a moment.', 500)
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
  try {
    const who = await userFor(req, env)
    res = who.user ? await route(req, env, url, who.user, ctx) : err(who.error, who.status, 'signin')
  } catch (e) {
    if (e.status && e.status < 600) {
      res = json(e.code ? { error: e.message, code: e.code } : { error: e.message }, e.status, e.retryAfter ? { 'retry-after': String(e.retryAfter) } : {})
    } else {
      // Path and message only: never request bodies, tokens or locations
      console.error('API error', req.method, url.pathname, e?.message)
      res = err('Something went wrong on our side. Try again in a moment.', 500)
    }
  }
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
  return res
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api/')) return handleApi(req, env, ctx)
    if (env.ASSETS) return env.ASSETS.fetch(req)
    return new Response('Not found', { status: 404 })
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCron(env, Number(event?.scheduledTime) || Date.now()))
  },
}
