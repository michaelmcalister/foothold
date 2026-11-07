// Foothold Wrapped on the server: GET /api/me/year?year=2026, a light summary
// of your own year for the year in review (src/lib/wrapped.js does the maths
// on the phone). It returns only your own activities (no tracks), who you
// swapped ground with (their name, colour and crest, as the rivals list
// shows), and your personal bests. Nothing about anyone else's activities.

import { parse, players } from './db.js'
import { yearBounds, yearOf } from '../src/lib/wrapped.js'

const MAX_ACTIVITIES = 3000
const MAX_RIVALS = 10
const bad = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }

/** GET /api/me/year?year= (defaults to this year, Sydney time) */
export async function yearInReview(env, user, url, now = Date.now()) {
  const raw = url.searchParams.get('year')
  const thisYear = yearOf(now)
  const year = raw == null || raw === '' ? thisYear : Number(raw)
  if (!Number.isInteger(year) || year < 2020 || year > thisYear) bad(`Pick a year from 2020 to ${thisYear}.`)
  const { start, end } = yearBounds(year)

  const acts = (await env.DB.prepare(
    `SELECT id, mode, started_at, distance_m, duration_s, moving_s, pace_s_per_km, elev_gain_m, loops, claimed, taken, bests
     FROM activities WHERE user_id = ? AND rejected = 0 AND started_at >= ? AND started_at < ?
     ORDER BY started_at DESC LIMIT ?`,
  ).bind(user.id, start, end, MAX_ACTIVITIES).all()).results

  // Ground that changed hands between you and someone else this year
  const took = (await env.DB.prepare('SELECT loser AS id, SUM(n) AS n FROM swaps WHERE taker = ? AND loser != ? AND at >= ? AND at < ? GROUP BY loser')
    .bind(user.id, user.id, start, end).all()).results
  const lost = (await env.DB.prepare('SELECT taker AS id, SUM(n) AS n FROM swaps WHERE loser = ? AND taker != ? AND at >= ? AND at < ? GROUP BY taker')
    .bind(user.id, user.id, start, end).all()).results
  const sums = new Map()
  const get = (id) => sums.get(id) || sums.set(id, { tookFromThem: 0, tookFromYou: 0 }).get(id)
  for (const r of took) get(r.id).tookFromThem += r.n || 0
  for (const r of lost) get(r.id).tookFromYou += r.n || 0
  const top = [...sums].sort((a, b) => (b[1].tookFromThem + b[1].tookFromYou) - (a[1].tookFromThem + a[1].tookFromYou)).slice(0, MAX_RIVALS)
  const names = await players(env, top.map(([id]) => id))
  const rivals = top.filter(([id]) => names.has(id)).map(([id, s]) => {
    const p = names.get(id)
    return { userId: id, name: p.name || 'Someone', colour: p.colour || '#888888', crest: p.crest || null, ...s }
  })

  const bests = { run: [], walk: [], ride: [] }
  for (const r of (await env.DB.prepare('SELECT mode, key, value, activity_id, at FROM personal_bests WHERE user_id = ?').bind(user.id).all()).results) {
    if (bests[r.mode]) bests[r.mode].push({ key: r.key, value: r.value, activityId: r.activity_id, at: r.at })
  }

  return {
    year,
    start,
    end,
    activities: acts.map((r) => ({
      id: r.id, mode: r.mode, startedAt: r.started_at, distanceM: r.distance_m, durationS: r.duration_s, movingS: r.moving_s,
      paceSPerKm: r.pace_s_per_km, elevGainM: r.elev_gain_m, loops: r.loops, claimed: r.claimed, taken: r.taken, rejected: false,
      bests: parse(r.bests, null),
    })),
    rivals,
    bests,
  }
}
