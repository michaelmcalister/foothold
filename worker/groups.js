// Group runs: two to six friends run the same story episode at the same time,
// from wherever they are. The host makes a group and shares its code (or the
// short link /g/CODE); friends join; the host starts it, and every phone
// counts down to the same moment. During the run each phone sends how many
// surges it has done, and its vote at each choice. Whichever way most of the
// crew voted is the way the story goes for everyone (src/lib/groupRun.js).
// Groups last a day. What members see of each other: player names and
// colours, surges done, finished or not, and votes. Never where anyone is.
import { uid, players } from './db.js'
import { MISSIONS } from '../src/lib/missions/scripts.js'
import { makeCode, normaliseCode } from '../src/lib/social/leagues.js'

export const MAX_MEMBERS = 6
export const COUNTDOWN_MS = 15000
const LIFE_MS = 24 * 3600 * 1000
const known = new Set(MISSIONS.map((m) => m.id))

async function groupOut(env, g, viewer, now) {
  const members = (await env.DB.prepare('SELECT user_id, joined_at, surges, done, seen_at FROM run_group_members WHERE group_id = ? ORDER BY joined_at').bind(g.id).all()).results
  const votes = (await env.DB.prepare('SELECT choice_id, user_id, pick FROM run_group_votes WHERE group_id = ?').bind(g.id).all()).results
  const names = await players(env, members.map((m) => m.user_id))
  const tally = {}
  for (const v of votes) {
    tally[v.choice_id] ||= { counts: {}, mine: null }
    tally[v.choice_id].counts[v.pick] = (tally[v.choice_id].counts[v.pick] || 0) + 1
    if (v.user_id === viewer) tally[v.choice_id].mine = v.pick
  }
  return {
    id: g.id,
    code: g.code,
    missionId: g.mission_id,
    host: g.host === viewer,
    startAt: g.start_at,
    now,
    members: members.map((m) => ({
      you: m.user_id === viewer,
      host: m.user_id === g.host,
      name: names.get(m.user_id)?.name || 'A runner',
      colour: names.get(m.user_id)?.colour || '#2E55E6',
      surges: m.surges,
      done: !!m.done,
      active: now - m.seen_at < 120000,
    })),
    votes: tally,
  }
}

/** The crew's pick for a choice: the most votes; a tie keeps the first vote's pick. Pure. */
export function crewPick(counts = {}, fallback = null) {
  let best = fallback
  let n = 0
  for (const [k, c] of Object.entries(counts)) if (c > n) { best = k; n = c }
  return best
}

async function load(env, id, userId, now) {
  const g = await env.DB.prepare('SELECT * FROM run_groups WHERE id = ?').bind(id).first()
  if (!g || now - g.created_at > LIFE_MS) return null
  const member = await env.DB.prepare('SELECT 1 AS ok FROM run_group_members WHERE group_id = ? AND user_id = ?').bind(id, userId).first()
  return member ? g : null
}

/** /api/groups... Returns undefined for other paths. */
export async function groupRoute({ env, user, path, m, body, now }) {
  if (!path.startsWith('/api/groups')) return undefined
  if (path === '/api/groups' && m === 'POST') {
    if (!known.has(body?.missionId)) return { status: 400, error: 'Pick a story first.' }
    const id = uid()
    let code = makeCode()
    for (let i = 0; i < 5 && (await env.DB.prepare('SELECT 1 FROM run_groups WHERE code = ?').bind(code).first()); i++) code = makeCode()
    await env.DB.batch([
      env.DB.prepare('INSERT INTO run_groups (id, code, host, mission_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, code, user.id, body.missionId, now),
      env.DB.prepare('INSERT INTO run_group_members (group_id, user_id, joined_at, seen_at) VALUES (?, ?, ?, ?)').bind(id, user.id, now, now),
    ])
    return groupOut(env, { id, code, host: user.id, mission_id: body.missionId, start_at: null }, user.id, now)
  }
  if (path === '/api/groups/join' && m === 'POST') {
    const code = normaliseCode(body?.code)
    const g = code ? await env.DB.prepare('SELECT * FROM run_groups WHERE code = ? AND created_at > ?').bind(code, now - LIFE_MS).first() : null
    if (!g) return { status: 404, error: 'No group run with that code. Check it with whoever sent it.' }
    if (g.start_at && now > g.start_at + 10 * 60000) return { status: 409, error: 'That group run has already started.' }
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM run_group_members WHERE group_id = ?').bind(g.id).first()
    const already = await env.DB.prepare('SELECT 1 AS ok FROM run_group_members WHERE group_id = ? AND user_id = ?').bind(g.id, user.id).first()
    if (!already && (count?.n || 0) >= MAX_MEMBERS) return { status: 409, error: `That group is full (${MAX_MEMBERS} runners).` }
    await env.DB.prepare('INSERT OR IGNORE INTO run_group_members (group_id, user_id, joined_at, seen_at) VALUES (?, ?, ?, ?)').bind(g.id, user.id, now, now).run()
    return groupOut(env, g, user.id, now)
  }
  const hit = path.match(/^\/api\/groups\/([\w-]+)(?:\/(start|progress|vote|leave))?$/)
  if (!hit) return undefined
  const g = await load(env, hit[1], user.id, now)
  if (!g) return { status: 404, error: 'That group run has finished, or you’re not in it.' }
  const action = hit[2]
  if (!action && m === 'GET') {
    await env.DB.prepare('UPDATE run_group_members SET seen_at = ? WHERE group_id = ? AND user_id = ?').bind(now, g.id, user.id).run()
    return groupOut(env, g, user.id, now)
  }
  if (action === 'start' && m === 'POST') {
    if (g.host !== user.id) return { status: 403, error: 'Only the person who made the group can start it.' }
    if (!g.start_at) await env.DB.prepare('UPDATE run_groups SET start_at = ? WHERE id = ?').bind(now + COUNTDOWN_MS, g.id).run()
    return groupOut(env, { ...g, start_at: g.start_at || now + COUNTDOWN_MS }, user.id, now)
  }
  if (action === 'progress' && m === 'POST') {
    const surges = Math.max(0, Math.min(50, Math.floor(Number(body?.surges) || 0)))
    await env.DB.prepare('UPDATE run_group_members SET surges = MAX(surges, ?), done = MAX(done, ?), seen_at = ? WHERE group_id = ? AND user_id = ?')
      .bind(surges, body?.done ? 1 : 0, now, g.id, user.id).run()
    return groupOut(env, g, user.id, now)
  }
  if (action === 'vote' && m === 'POST') {
    const choiceId = String(body?.choiceId || '').slice(0, 60)
    const pick = String(body?.pick || '')
    const mission = MISSIONS.find((x) => x.id === g.mission_id)
    const beat = mission?.beats.find((b) => b.kind === 'choice' && (b.id || String(b.at)) === choiceId)
    if (!beat || !beat.options.some((o) => o.key === pick)) return { status: 400, error: 'That isn’t one of the choices.' }
    await env.DB.prepare('INSERT OR IGNORE INTO run_group_votes (group_id, choice_id, user_id, pick, at) VALUES (?, ?, ?, ?, ?)').bind(g.id, choiceId, user.id, pick, now).run()
    return groupOut(env, g, user.id, now)
  }
  if (action === 'leave' && m === 'POST') {
    await env.DB.prepare('DELETE FROM run_group_members WHERE group_id = ? AND user_id = ?').bind(g.id, user.id).run()
    return { ok: true }
  }
  return undefined
}

/** Cron: groups older than a day go, with their members and votes. */
export async function clearOldGroups(env, now = Date.now()) {
  const old = `SELECT id FROM run_groups WHERE created_at < ${Number(now - LIFE_MS)}`
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM run_group_votes WHERE group_id IN (${old})`),
    env.DB.prepare(`DELETE FROM run_group_members WHERE group_id IN (${old})`),
    env.DB.prepare(`DELETE FROM run_groups WHERE created_at < ?`).bind(now - LIFE_MS),
  ])
}
