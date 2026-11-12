// The map and the leaderboards: territory in a box, your stats, season and
// all time boards, the season itself and the local feed.
import { DAY, WEEK, bad, km2, isNum, modeOf } from './http.js'
import { pad, parseBbox } from './validate.js'
import { currentStrength, daysUntilWild, levelFor, weeklyKm, seasonFor, seasonOut, previousSeason, seasonSummary, showSummary, heatOf } from '../src/lib/engine/index.js'
import { parse, players, activityOut, ACTIVITY_COLS, rowToCell, hexCount } from './db.js'

export async function territory(env, user, url) {
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

export async function stats(env, user, url) {
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
export async function seasonCounts(env, user, mode, season, scope, centre) {
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

export async function leaderboard(env, user, url) {
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
export async function boardCentre(env, user, url) {
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
export async function season(env, user, now = Date.now()) {
  const cur = seasonFor(now)
  const prev = previousSeason(cur)
  const rows = (await env.DB.prepare(
    'SELECT user_id, SUM(claimed + taken) AS n FROM activities WHERE rejected = 0 AND started_at >= ? AND started_at < ? GROUP BY user_id HAVING n > 0',
  ).bind(prev.startsAt, prev.endsAt).all()).results
  const previous = seasonSummary(new Map(rows.map((r) => [r.user_id, r.n])), user.id, prev)
  const seen = parse(user.prefs, {}).seasonSeen ?? null
  return { season: seasonOut(cur, now), previous, showSummary: showSummary(previous, cur, seen, now) }
}

export async function feed(env, user) {
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
