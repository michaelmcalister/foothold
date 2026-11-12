// The Foothold API worker: every /api route in docs/API.md, the hourly cron
// (worker/cron.js), and the built app as static assets for everything else.

import { processActivity, loadCheck, battleScore, hexIsPrivate, seasonById } from '../src/lib/engine/index.js'
import { isCrest } from '../src/lib/crests.js'
import { DAY, WEEK, MAX_BODY, SOURCES, FEEDBACK_KINDS, VERB, json, err, bad, isNum, modeOf } from './http.js'
import { cleanPoints, cleanZones, bboxOf, pad } from './validate.js'
import { territory, stats, leaderboard, season, feed } from './boards.js'
import {
  uid, parse, userOut, players, packTrack, unpackTrack, activityOut, ACTIVITY_COLS, cellsIn, cellsByIds, upsertCell, batched, hexCount, rowToBattle, upsertBattle, notify, hit,
} from './db.js'
import { encryptSecret, decryptSecret } from './crypto.js'
import { extractToken, fetchSummary, logCardio } from './formtrack.js'
import { authConfig, userFor } from './auth.js'
import { runCron } from './cron.js'
import { secure } from './headers.js'
import { handleShortLink } from './links.js'
import { reportError } from './sentry.js'
import { missionsRoute } from './missions.js'
import { storyFlagRoute } from './storyflags.js'
import { storySeason } from './storySeason.js'
import { handleNearby } from './nearby.js'
import { billingRoute, handleStripeWebhook, premiumConfig, premiumOn, planOf, cancelForDelete } from './billing.js'
import { pushRoute, pushConfig, pushWaiting, DEFAULT_PREFS as DEFAULT_PUSH } from './push.js'
import { cleanRoute, MAX_ROUTES } from '../src/lib/planner.js'
import { cleanCheckin } from '../src/lib/coach/checkin.js'
import { handleAudio } from './audioLibrary.js'
import { handleTts, ttsConfig } from './tts.js'
import { handleElevation } from './elevation.js'
import { handleRoute } from './routing.js'
import { handleAiPlan, aiConfig } from './aiplan.js'
import { weekStatements, explored, quests, week } from './weekly.js'
import { afterActivity, afterDelete, strongholdRoutes } from './strongholds.js'
import { socialRoute, swapStatements, activityCommentDeletes } from './social.js'
import { exportAccount, deleteAccount } from './account.js'
import { streak } from './habits.js'
import { divisionRoute } from './divisions.js'
import { routeShareRoute } from './routeShares.js'
import { yearInReview } from './wrapped.js'
import { adminRoute, isAdmin } from './admin.js'
import { cleanPlannedAt } from '../src/lib/routeShare.js'
import { detectAfterSave, hillsForActivity, hillsAfterDelete, hillRoute } from './hills.js'

// ---- CORS, for the app when it's served from somewhere else (GitHub Pages) ----
// Add the CORS headers to a response. Responses from the cache, R2 or
// fetch() have read-only headers (setting one throws), so copy it first.
// The website itself never needs them; the iPhone and Android apps do.
export function withCors(res, cors) {
  if (!Object.keys(cors).length) return res
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v)
  return out
}

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

  // King of the hill (worker/hills.js): climbs need terrain heights, so after the response when we can
  if (!a.rejected) {
    const hills = detectAfterSave(env, user, { id, mode, source, track: res.track, zones, startedAt: a.startedAt, now })
      .catch((e) => console.error('hills', e?.message))
    if (ctx?.waitUntil) ctx.waitUntil(hills)
    else await hills
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

const routeOut = (r) => ({ id: r.id, name: r.name, mode: r.mode, ring: parse(r.ring, []), distanceM: r.distance_m, waypoints: parse(r.waypoints, null), climbM: r.climb_m ?? null, plannedAt: r.planned_at ?? null, createdAt: r.created_at, updatedAt: r.updated_at })

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
  // King of the hill (worker/hills.js)
  const hill = await hillRoute({ env, user, url, m, path })
  if (hill !== undefined) return json(hill)
  // Routes sent to your crew (worker/routeShares.js)
  const shared = await routeShareRoute({ env, user, m, path, body, now, limit })
  if (shared !== undefined) return json(shared)

  // Story progress kept with the account (worker/missions.js)
  {
    const out = await missionsRoute({ env, user, path, m, body, now })
    if (out !== undefined) return out.error ? err(out.error, out.status || 400) : json(out)
  }

  // Names from around you, for stories set on your own streets (worker/nearby.js)
  if (path === '/api/nearby' && m === 'GET') {
    await limit('route', 'That’s a lot of looking around. Try again in a bit.')
    const out = await handleNearby(url)
    return out.error ? err(out.error, out.status) : json(out)
  }

  // The story season: featured series, the community goal, the finale (worker/storySeason.js)
  if (path === '/api/story-season' && m === 'GET') return json(await storySeason(env, now))

  // Capture the story: flags planted where stories are set (worker/storyflags.js)
  {
    const out = await storyFlagRoute({ env, user, path, m, body, url, now })
    if (out !== undefined) return out.error ? err(out.error, out.status || 400) : json(out)
  }

  // Foothold Plus (worker/billing.js), switched off until PREMIUM_ON = "1"
  {
    const out = await billingRoute({ env, user, path, m, now })
    if (out !== undefined) return out.error ? err(out.error, out.status || 400) : json(out)
  }

  // Push notifications: subscribe, unsubscribe, test (worker/push.js)
  if (path.startsWith('/api/push')) {
    const out = await pushRoute({ env, user, path, m, body, now })
    if (out !== undefined) return out.error ? err(out.error, out.status || 400) : json(out)
  }

  // The owner's admin page (worker/admin.js)
  const admin = await adminRoute({ env, user, url, m, path, body, now })
  if (admin !== undefined) return admin.error ? err(admin.error, admin.status || 400) : json(admin)

  // Profile
  if (path === '/api/me' && m === 'GET') {
    const me = isAdmin(env, user) ? { ...userOut(user), admin: true } : userOut(user)
    if (premiumOn(env)) me.plan = await planOf(env, user.id, now) // Foothold Plus, when it's switched on
    return json({ user: me })
  }
  if (path === '/api/me/export' && m === 'GET') return json(await exportAccount(env, user))
  if (path === '/api/me/year' && m === 'GET') return json(await yearInReview(env, user, url, now)) // Foothold Wrapped (worker/wrapped.js)
  if (path === '/api/me' && m === 'DELETE') {
    await cancelForDelete(env, user.id) // no more Plus charges once the account is gone
    return json(await deleteAccount(env, user))
  }
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
    if ('foundingAt' in body) {
      // The first week badge: kept once earned, so it can only be set, never moved or cleared
      if (!isNum(body.foundingAt, Date.UTC(2020, 0, 1), now + 86400000)) bad('foundingAt must be a time.')
      if (prefs.foundingAt == null) { prefs.foundingAt = body.foundingAt; prefsChanged = true }
    }
    if ('push' in body) {
      // Which notices may become push notifications (worker/push.js GROUPS)
      const p = body.push
      if (!p || typeof p !== 'object') bad('Push settings must be a set of switches.')
      prefs.push = Object.fromEntries(Object.keys(DEFAULT_PUSH).map((k) => [k, k in p ? !!p[k] : (prefs.push?.[k] ?? DEFAULT_PUSH[k])]))
      prefsChanged = true
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
  const am = path.match(/^\/api\/activities\/([A-Za-z0-9-]{1,64})(\/appeal|\/kudos|\/checkin)?$/)
  if (am) {
    const id = am[1]
    const sub = am[2] || ''
    const row = await env.DB.prepare(`SELECT ${ACTIVITY_COLS}, a.track, a.public_track,
        EXISTS (SELECT 1 FROM kudos k WHERE k.activity_id = a.id AND k.user_id = ?) AS given
      FROM activities a WHERE a.id = ?`).bind(user.id, id).first()
    if (!row) return err('That activity is gone.', 404, 'not_found')
    const mine = row.user_id === user.id
    if (!sub && m === 'GET') {
      return json({ activity: activityOut(row, user.id, row.given), track: unpackTrack(mine ? row.track : row.public_track), hills: await hillsForActivity(env, user.id, id) })
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
      await hillsAfterDelete(env, id) // its hill times go, and crowns pass to the next fastest
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
    if (sub === '/checkin' && m === 'POST') {
      // How it felt (src/lib/coach/checkin.js). Answering again replaces it; { dismissed: true } stops the prompt.
      if (!mine) return err('You can only check in on your own activities.', 403)
      let c
      try { c = cleanCheckin(body) } catch (e) { bad(e.message, 400, 'bad_checkin') }
      const feel = c.feel == null ? null : String(c.feel)
      const hurt = c.hurt ? JSON.stringify(c.hurt) : null
      await env.DB.prepare('UPDATE activities SET feel = ?, hurt = ?, checkin_at = ? WHERE id = ? AND user_id = ?').bind(feel, hurt, now, id, user.id).run()
      return json({ activity: activityOut({ ...row, feel, hurt, checkin_at: now }, user.id, row.given) })
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
  // Weekly streak with banked rest weeks (worker/habits.js)
  if (path === '/api/streak' && m === 'GET') return json(await streak(env, user, now))
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
    // A day and time for it (ms or null). Left out, an update keeps the one it has, so older apps don't clear it.
    let plannedAt
    try { plannedAt = 'plannedAt' in body ? cleanPlannedAt(body.plannedAt, now) : undefined } catch (e) { bad(e.message) }
    const id = body.id == null ? null : String(body.id)
    if (id) {
      const wps = r.waypoints ? JSON.stringify(r.waypoints) : null
      const res = await (plannedAt === undefined
        ? env.DB.prepare('UPDATE routes SET name = ?, mode = ?, ring = ?, distance_m = ?, waypoints = ?, climb_m = ?, updated_at = ? WHERE id = ? AND user_id = ?')
          .bind(r.name, r.mode, JSON.stringify(r.ring), r.distanceM, wps, r.climbM, now, id, user.id)
        : env.DB.prepare('UPDATE routes SET name = ?, mode = ?, ring = ?, distance_m = ?, waypoints = ?, climb_m = ?, planned_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
          .bind(r.name, r.mode, JSON.stringify(r.ring), r.distanceM, wps, r.climbM, plannedAt, now, id, user.id)).run()
      if (!res.meta?.changes) return err('That route is gone.', 404, 'not_found')
      return json({ route: routeOut(await env.DB.prepare('SELECT * FROM routes WHERE id = ?').bind(id).first()) })
    }
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM routes WHERE user_id = ?').bind(user.id).first()
    if ((n?.n || 0) >= MAX_ROUTES) bad(`You have ${MAX_ROUTES} saved routes. Delete one to save another.`, 409, 'too_many_routes')
    const newId = uid()
    await env.DB.prepare('INSERT INTO routes (id, user_id, name, mode, ring, distance_m, waypoints, climb_m, planned_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId, user.id, r.name, r.mode, JSON.stringify(r.ring), r.distanceM, r.waypoints ? JSON.stringify(r.waypoints) : null, r.climbM, plannedAt ?? null, now, now).run()
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

  // Asking for a story set somewhere near you (the mission browser). Kept with
  // feedback, so export and delete already cover it. "Near" is rounded to
  // about a kilometre, and only sent if they tick the box.
  if (path === '/api/story-requests' && m === 'POST') {
    const text = storyRequestText(body)
    if (text.error) bad(text.error)
    await limit('feedback', "Thanks, that's plenty for today. Send more tomorrow.")
    await env.DB.prepare('INSERT INTO feedback (id, user_id, kind, text, at) VALUES (?, ?, ?, ?, ?)').bind(uid(), user.id, 'story', text.text, now).run()
    return json({ ok: true })
  }

  return err('Not found.', 404, 'not_found')
}

/** A story request as one line of feedback text, or { error } in plain words. */
export function storyRequestText(body) {
  const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const place = clean(body?.place, 120)
  const story = clean(body?.story, 1000)
  if (!place) return { error: 'Tell us the place first.' }
  const lat = Number(body?.near?.lat)
  const lng = Number(body?.near?.lng)
  const near = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? ` | Near: ${lat.toFixed(2)}, ${lng.toFixed(2)}` : ''
  return { text: `Place: ${place}${story ? ` | Story: ${story}` : ''}${near}` }
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
    const premium = premiumConfig(env) // Foothold Plus, only once it's switched on
    if (premium) out.premium = premium
    const push = pushConfig(env) // push notifications, when their keys are set
    if (push) out.push = push
    if (env.SENTRY_DSN) out.sentryDsn = String(env.SENTRY_DSN) // error reports (public; src/lib/monitoring.js)
    res = json(out)
    return withCors(res, cors)
  }
  // Public, rate limited: the voice coach speaks on the practice map too
  // Stripe tells us about Plus payments here (signed, no sign-in; worker/billing.js)
  if (url.pathname === '/api/billing/webhook' && req.method === 'POST') return handleStripeWebhook(req, env)
  if (url.pathname === '/api/tts' && req.method === 'POST') {
    res = await handleTts(req, env)
    return withCors(res, cors)
  }
  // Public: recorded ambience and music (made once with ElevenLabs, then served from R2)
  {
    const m = /^\/api\/audio\/(ambience|track|sfx)\/([a-z0-9-]{1,40})$/.exec(url.pathname)
    if (m && req.method === 'GET') {
      res = await handleAudio(req, env, m[1], m[2])
      return withCors(res, cors)
    }
  }
  // Public, rate limited: heights for the elevation chart (grid corners only, never the route)
  // Public, rate limited: snap a drawn route to paths you can run
  if (url.pathname === '/api/route' && req.method === 'POST') {
    res = await handleRoute(req, env)
    return withCors(res, cors)
  }
  if (url.pathname === '/api/elevation' && req.method === 'POST') {
    res = await handleElevation(req, env)
    return withCors(res, cors)
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
    return withCors(res, cors)
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
      reportError(env, ctx, e, `${req.method} ${url.pathname.replace(/\/[0-9a-f-]{8,}/gi, '/:id')}`)
      res = err('Something went wrong on our side. Try again in a moment.', 500)
    }
  }
  return withCors(res, cors)
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api/')) return secure(await handleApi(req, env, ctx), url.pathname)
    const short = handleShortLink(url) // /l/CODE: league invites that preview nicely
    if (short) return secure(short, url.pathname)
    if (env.ASSETS) return secure(await env.ASSETS.fetch(req), url.pathname)
    return new Response('Not found', { status: 404 })
  },
  async scheduled(event, env, ctx) {
    const now = Number(event?.scheduledTime) || Date.now()
    // Every 15 minutes: push waiting notices. On the hour: the game's jobs first.
    const jobs = event?.cron === '*/15 * * * *' ? Promise.resolve() : runCron(env, now)
    ctx.waitUntil(jobs.then(() => pushWaiting(env, now)).catch((e) => reportError(env, null, e, 'cron')))
  },
}
