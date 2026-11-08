// D1 helpers: row to API shape mappers, new players, cell loading and
// saving, notifications and the light rate limits.

import { cellCentre, FADE_GRACE_DAYS, FADE_HALF_LIFE_DAYS, WILD_BELOW } from '../src/lib/engine/index.js'

const DAY = 86400000
export const uid = () => crypto.randomUUID()

export const parse = (s, d) => {
  if (s == null) return d
  try {
    return JSON.parse(s)
  } catch {
    return d
  }
}

// ---- players ----

const ADJECTIVES = ['Swift', 'Sunny', 'Brave', 'Steady', 'Plucky', 'Nimble', 'Bold', 'Lucky', 'Quiet', 'Rapid', 'Keen', 'Breezy', 'Gritty', 'Jolly', 'Clever', 'Wild']
const ANIMALS = ['Wombat', 'Quokka', 'Emu', 'Kookaburra', 'Wallaby', 'Possum', 'Galah', 'Dingo', 'Numbat', 'Echidna', 'Platypus', 'Magpie', 'Bilby', 'Lorikeet', 'Koala', 'Cockatoo']
export const COLOURS = ['#2E55E6', '#E8A817', '#E5604D', '#1A9E8F', '#8A5CD8', '#D6418E', '#6E8B22', '#E07B22', '#2C8FD6', '#B5487A']

const pick = (list) => list[crypto.getRandomValues(new Uint32Array(1))[0] % list.length]
export const friendlyName = () => `${pick(ADJECTIVES)} ${pick(ANIMALS)}`

/** A new player with a random friendly name and colour */
export async function newUser(env, { authSub = null, deviceId = null }) {
  const id = uid()
  // INSERT OR IGNORE so two first requests at once don't fail; we re-read either way
  await env.DB.prepare('INSERT OR IGNORE INTO users (id, auth_sub, device_id, name, colour, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, authSub, deviceId, friendlyName(), pick(COLOURS), Date.now()).run()
  const col = authSub ? 'auth_sub' : 'device_id'
  return env.DB.prepare(`SELECT * FROM users WHERE ${col} = ?`).bind(authSub || deviceId).first()
}

export function userOut(row) {
  const prefs = parse(row.prefs, {})
  return {
    id: row.id,
    name: row.name,
    colour: row.colour,
    crest: row.crest || null,
    units: prefs.units || 'metric',
    mode: row.mode,
    zones: parse(row.zones, []),
    clubId: row.club_id || null,
    createdAt: row.created_at,
    onboarded: !!prefs.onboarded,
    goal: prefs.goal ?? null,
    homeCentre: prefs.homeCentre ?? null,
    seasonSeen: prefs.seasonSeen ?? null,
    foundingAt: prefs.foundingAt ?? null, // when the Founding foothold badge was earned (first week journey)
    formtrack: { linked: !!row.formtrack_token_enc, linkedAt: row.formtrack_linked_at || null },
  }
}

/** id -> { name, colour, crest } for a set of user ids */
export async function players(env, ids) {
  const out = new Map()
  const list = [...new Set(ids)].filter(Boolean)
  for (let i = 0; i < list.length; i += 90) {
    const part = list.slice(i, i + 90)
    const rows = (await env.DB.prepare(`SELECT id, name, colour, crest FROM users WHERE id IN (${part.map(() => '?').join(',')})`).bind(...part).all()).results
    for (const r of rows) out.set(r.id, { name: r.name, colour: r.colour, crest: r.crest || null })
  }
  return out
}

// ---- activities ----

// Tracks are stored compactly: { t0, p: [[lat, lng, dtMs, alt?, hr?, cad?]] }
// with coordinates at 6 decimal places (about 10 cm).
const MAX_TRACK_CHARS = 1_500_000 // D1 caps a value at 2 MB
const r6 = (n) => Math.round(n * 1e6) / 1e6
export function packTrack(points) {
  let pts = points
  for (;;) {
    const t0 = pts[0]?.t ?? 0
    const p = pts.map((q) => {
      const row = [r6(q.lat), r6(q.lng), (q.t ?? t0) - t0]
      if (q.alt != null || q.hr != null || q.cad != null) row.push(q.alt != null ? Math.round(q.alt * 10) / 10 : null)
      if (q.hr != null || q.cad != null) row.push(q.hr ?? null)
      if (q.cad != null) row.push(q.cad)
      return row
    })
    const s = JSON.stringify({ t0, p })
    if (s.length <= MAX_TRACK_CHARS || pts.length < 100) return s
    pts = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1) // thin very long tracks
  }
}
export function unpackTrack(s) {
  const v = parse(s, null)
  if (!v?.p) return []
  return v.p.map(([lat, lng, dt, alt, hr, cad]) => {
    const q = { lat, lng, t: v.t0 + dt }
    if (alt != null) q.alt = alt
    if (hr != null) q.hr = hr
    if (cad != null) q.cad = cad
    return q
  })
}

// feel is stored as text: '1' to '5', or 'hurt'
export const feelOut = (v) => (v == null ? null : v === 'hurt' ? 'hurt' : Number(v) || null)

/** Activity shape from a row. Others never see where it started, or how it felt. */
export function activityOut(row, viewerId, kudosGiven = false) {
  const a = {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    source: row.source,
    startedAt: row.started_at,
    distanceM: row.distance_m,
    durationS: row.duration_s,
    movingS: row.moving_s,
    paceSPerKm: row.pace_s_per_km,
    elevGainM: row.elev_gain_m,
    loops: row.loops,
    gain: row.gain,
    claimed: row.claimed,
    reinforced: row.reinforced,
    taken: row.taken,
    held: row.held,
    trust: row.trust,
    flags: parse(row.flags, []),
    rejected: !!row.rejected,
    rejectReason: row.reject_reason || null,
    kudos: row.kudos ?? 0,
    comments: row.comments ?? 0,
    kudosGiven: !!kudosGiven,
    mine: row.user_id === viewerId,
    bests: parse(row.bests, null), // personal best efforts found in it (engine/bests.js)
  }
  const appeal = parse(row.appeal, null)
  if (appeal) a.appeal = appeal
  if (row.user_id === viewerId) {
    a.start = parse(row.start, null)
    a.bbox = parse(row.bbox, null)
    // Post-run check-in (migrations/0010_checkins.sql): only the owner sees how it felt
    a.feel = feelOut(row.feel)
    a.hurt = parse(row.hurt, null)
    a.checkinAt = row.checkin_at ?? null
  }
  return a
}

// Columns for activity lists, without the heavy track JSON
export const ACTIVITY_COLS = `a.id, a.user_id, a.mode, a.source, a.started_at, a.distance_m, a.duration_s, a.moving_s, a.pace_s_per_km, a.elev_gain_m,
  a.loops, a.gain, a.claimed, a.reinforced, a.taken, a.held, a.trust, a.flags, a.rejected, a.reject_reason, a.appeal, a.start, a.bbox, a.bests,
  a.feel, a.hurt, a.checkin_at,
  (SELECT COUNT(*) FROM kudos k WHERE k.activity_id = a.id) AS kudos,
  (SELECT COUNT(*) FROM comments c WHERE c.activity_id = a.id) AS comments`

// ---- cells ----

/** When a hex fades to wild if nobody visits (matches currentStrength in the engine) */
export function wildAt(cell) {
  const last = cell.lastVisit ?? cell.claimedAt
  const extra = cell.strength > WILD_BELOW ? FADE_HALF_LIFE_DAYS * Math.log2(cell.strength / WILD_BELOW) : 0
  return Math.round(last + (FADE_GRACE_DAYS + extra) * DAY)
}

export function rowToCell(r) {
  const c = { h3: r.h3, owner: r.owner, strength: r.strength, visits: r.visits, lastVisit: r.last_visit, claimedAt: r.claimed_at, private: r.private ? true : undefined }
  if (r.flips) Object.assign(c, { flips: r.flips, lastFlip: r.last_flip ?? undefined, recentFlips: r.recent_flips || 0 })
  if (r.season_reset) c.seasonReset = r.season_reset
  return c
}

/** Live cells in [w, s, e, n] for one mode, as a Map for the engine */
export async function cellsIn(env, mode, [w, s, e, n], now = Date.now()) {
  const rows = (await env.DB.prepare('SELECT * FROM cells WHERE mode = ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? AND wild_at > ?')
    .bind(mode, s, n, w, e, now).all()).results
  return new Map(rows.map((r) => [r.h3, rowToCell(r)]))
}

export async function cellsByIds(env, mode, ids) {
  const out = new Map()
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90)
    const rows = (await env.DB.prepare(`SELECT * FROM cells WHERE mode = ? AND h3 IN (${part.map(() => '?').join(',')})`).bind(mode, ...part).all()).results
    for (const r of rows) out.set(r.h3, rowToCell(r))
  }
  return out
}

export function upsertCell(env, mode, c) {
  const { lat, lng } = cellCentre(c.h3)
  return env.DB.prepare(
    `INSERT INTO cells (mode, h3, owner, strength, visits, last_visit, claimed_at, private, lat, lng, wild_at, flips, last_flip, recent_flips)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (mode, h3) DO UPDATE SET owner = excluded.owner, strength = excluded.strength, visits = excluded.visits,
       last_visit = excluded.last_visit, claimed_at = excluded.claimed_at, private = excluded.private, wild_at = excluded.wild_at,
       flips = excluded.flips, last_flip = excluded.last_flip, recent_flips = excluded.recent_flips`,
  ).bind(mode, c.h3, c.owner, c.strength, c.visits || 1, c.lastVisit ?? c.claimedAt, c.claimedAt ?? c.lastVisit, c.private ? 1 : 0, lat, lng, wildAt(c),
    c.flips || 0, c.lastFlip ?? null, c.recentFlips || 0)
}

/** Run statements in batches D1 is comfortable with */
export async function batched(env, stmts, size = 100) {
  for (let i = 0; i < stmts.length; i += size) await env.DB.batch(stmts.slice(i, i + size))
}

export async function hexCount(env, userId, mode, now = Date.now()) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM cells WHERE owner = ? AND mode = ? AND wild_at > ?').bind(userId, mode, now).first()
  return r?.n || 0
}

// ---- battles ----

export function rowToBattle(r) {
  return { id: r.id, mode: r.mode, attacker: r.attacker, defender: r.defender, hexes: parse(r.hexes, []), startedAt: r.started_at, endsAt: r.ends_at, endedAt: r.ended_at ?? undefined, winner: r.winner ?? undefined, finalScore: parse(r.final_score, undefined) }
}

export function upsertBattle(env, b) {
  return env.DB.prepare(
    `INSERT INTO battles (id, mode, attacker, defender, hexes, started_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET hexes = excluded.hexes`,
  ).bind(b.id, b.mode, b.attacker, b.defender, JSON.stringify(b.hexes), b.startedAt, b.endsAt)
}

// ---- notifications ----

export function notify(env, userId, kind, text, { at = Date.now(), dayKey = null } = {}) {
  return env.DB.prepare('INSERT OR IGNORE INTO notifications (id, user_id, at, kind, text, day_key) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(uid(), userId, at, kind, text, dayKey)
}

// ---- rate limits ----

// Fixed-window counters, per player per window. Light: they only stop floods.
export const LIMITS = {
  write: { max: 60, sec: 60 }, // any POST, PUT or DELETE
  activity: { max: 40, sec: 86400 }, // recorded on the phone
  import: { max: 400, sec: 86400 }, // from a watch or a Strava export, which can be years of runs at once
  route: { max: 400, sec: 3600 }, // fresh path lookups per address per hour (drawing makes many)
  elevation: { max: 60, sec: 3600 }, // fresh height lookups per address per hour (repeats come from the cache)
  audio: { max: 30, sec: 3600 }, // new recorded sounds made per address per hour (each is made once, ever)
  tts: { max: 150, sec: 3600 }, // new voice lines per address per hour (repeats come from the cache)
  feedback: { max: 10, sec: 86400 },
  club: { max: 5, sec: 86400 },
  formtrack: { max: 10, sec: 3600 },
  comment: { max: 30, sec: 3600 },
  report: { max: 20, sec: 86400 },
  league: { max: 10, sec: 86400 },
  leagueJoin: { max: 20, sec: 3600 },
  routeShare: { max: 30, sec: 86400 }, // routes sent to your crew (each send is up to 20 people)
  aiPlanHour: { max: 5, sec: 3600 }, // AI plan builds per address
  aiPlanDay: { max: 15, sec: 86400 },
  aiPlanUser: { max: 15, sec: 86400 }, // per signed-in player
}

/** Count one use. Fails open if the table is missing so a hiccup can't lock everyone out. */
export async function hit(env, bucket, key) {
  const lim = LIMITS[bucket]
  if (!lim || !key) return { ok: true }
  const now = Math.floor(Date.now() / 1000)
  const win = now - (now % lim.sec)
  try {
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (bucket, key, win, count) VALUES (?, ?, ?, 1)
       ON CONFLICT (bucket, key, win) DO UPDATE SET count = count + 1
       RETURNING count`,
    ).bind(bucket, String(key), win).first()
    return { ok: (row?.count ?? 1) <= lim.max, retryAfter: win + lim.sec - now }
  } catch {
    return { ok: true }
  }
}
