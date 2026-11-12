// Capture the story: finish a story episode at its real place (your run
// passes within FLAG_M of where the story is set) and you plant your flag
// there, once per episode. Each place keeps a board: how many runners have
// solved it there, who was first, and the latest few. Names are the game
// names players already show on leaderboards; never where anyone lives.
import { players, unpackTrack } from './db.js'
import { MISSIONS } from '../src/lib/missions/scripts.js'
import { placeOf, kmBetween } from '../src/lib/missions/places.js'

export const FLAG_M = 600

const byId = new Map(MISSIONS.map((m) => [m.id, m]))

/** Did this track pass close enough to the story's place? Pure. */
export function reachedPlace(points, place, metres = FLAG_M) {
  if (!place || !points?.length) return false
  const step = Math.max(1, Math.floor(points.length / 2000)) // a sample is plenty
  for (let i = 0; i < points.length; i += step) if (kmBetween(points[i], place) * 1000 <= metres) return true
  return kmBetween(points[points.length - 1], place) * 1000 <= metres
}

async function board(env, missionId, viewer) {
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM story_flags WHERE mission_id = ?').bind(missionId).first()
  const first = await env.DB.prepare('SELECT user_id, at FROM story_flags WHERE mission_id = ? ORDER BY at LIMIT 1').bind(missionId).first()
  const recent = (await env.DB.prepare('SELECT user_id, at FROM story_flags WHERE mission_id = ? ORDER BY at DESC LIMIT 5').bind(missionId).all()).results
  const mine = viewer ? await env.DB.prepare('SELECT at FROM story_flags WHERE mission_id = ? AND user_id = ?').bind(missionId, viewer).first() : null
  const names = await players(env, [first?.user_id, ...recent.map((r) => r.user_id)].filter(Boolean))
  const who = (id) => ({ name: names.get(id)?.name || 'A runner', colour: names.get(id)?.colour || '#2E55E6' })
  return {
    missionId,
    count: total?.n || 0,
    first: first ? { ...who(first.user_id), at: first.at } : null,
    recent: recent.map((r) => ({ ...who(r.user_id), at: r.at })),
    mine: mine ? { at: mine.at } : null,
  }
}

/** POST /api/stories/flag and GET /api/stories/flags. Returns undefined for other paths. */
export async function storyFlagRoute({ env, user, path, m, body, url, now }) {
  if (path === '/api/stories/flags' && m === 'GET') {
    const id = url.searchParams.get('mission')
    if (!byId.has(id)) return { status: 404, error: 'That story isn’t one we know.' }
    return board(env, id, user.id)
  }
  if (path === '/api/stories/flag' && m === 'POST') {
    const mission = byId.get(body?.missionId)
    const place = placeOf(mission)
    if (!mission || !place) return { status: 400, error: 'That story isn’t set in a real place.' }
    const act = await env.DB.prepare('SELECT id, track, rejected FROM activities WHERE id = ? AND user_id = ?').bind(String(body?.activityId || ''), user.id).first()
    if (!act || act.rejected) return { status: 404, error: 'That run isn’t one we can use.' }
    if (!reachedPlace(unpackTrack(act.track), place)) return { planted: false, place: place.name, ...(await board(env, mission.id, user.id)) }
    const r = await env.DB.prepare('INSERT OR IGNORE INTO story_flags (user_id, mission_id, activity_id, at) VALUES (?, ?, ?, ?)').bind(user.id, mission.id, act.id, now).run()
    const out = await board(env, mission.id, user.id)
    return { planted: (r.meta?.changes ?? 1) > 0, place: place.name, ...out }
  }
  return undefined
}
