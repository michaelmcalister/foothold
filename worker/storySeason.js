// GET /api/story-season: how the Summer of Stories is going (lib/storySeason.js).
// The community total is every saved run, walk and ride since the season
// began, cached for ten minutes. When the goal is first reached, everyone
// active this season gets a notice that the finale is open.
import { STORY_SEASON, seasonState, finaleOpen } from '../src/lib/storySeason.js'
import { notify } from './db.js'

const goalOf = (env) => Number(env.SEASON_GOAL_KM) > 0 ? Number(env.SEASON_GOAL_KM) : STORY_SEASON.goalKm

async function totalKm(env, now) {
  const r = await env.DB.prepare('SELECT COALESCE(SUM(distance_m), 0) AS m, COUNT(DISTINCT user_id) AS people FROM activities WHERE rejected = 0 AND started_at >= ? AND started_at < ?')
    .bind(STORY_SEASON.startsAt, Math.min(now, seasonState(now).endsAt)).first()
  return { km: Math.round((r?.m || 0) / 100) / 10, people: r?.people || 0 }
}

export async function storySeason(env, now = Date.now(), cache = globalThis.caches?.default) {
  const key = new Request(`https://season.foothold.cache/${STORY_SEASON.id}/${Math.floor(now / 600000)}`)
  const hit = cache ? await cache.match(key).catch(() => null) : null
  if (hit) return hit.json()
  const st = seasonState(now)
  const { km, people } = st.started ? await totalKm(env, now) : { km: 0, people: 0 }
  const goalKm = goalOf(env)
  const out = { id: STORY_SEASON.id, title: STORY_SEASON.title, ...st, goalKm, km, people, reached: km >= goalKm, finaleOpen: finaleOpen(now, km >= goalKm), finaleMission: STORY_SEASON.finaleMission }
  if (cache) await cache.put(key, new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=600' } })).catch(() => {})
  return out
}

/** Cron: the first time the goal is reached, tell this season's runners (once each). */
export async function seasonGoalNotices(env, now = Date.now()) {
  const s = await storySeason(env, now, null)
  if (!s.started || s.over || !s.finaleOpen) return 0
  const users = (await env.DB.prepare('SELECT DISTINCT user_id FROM activities WHERE rejected = 0 AND started_at >= ? LIMIT 5000').bind(STORY_SEASON.startsAt).all()).results
  const text = s.reached
    ? `Together you ran ${Math.round(s.km).toLocaleString('en-AU')} km. The finale of ${s.title} is open: The Gathering.`
    : `It’s finale weekend for ${s.title}. The Gathering is open. Fancy a run?`
  const stmts = users.map((u) => notify(env, u.user_id, 'season', text, { at: now, dayKey: `finale:${s.id}` }))
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50))
  return stmts.length
}
