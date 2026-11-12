// The owner's admin page (/app/admin): app numbers at a glance, story ideas
// to approve or decline, the feedback inbox, reported comments and AI spend.
// Only the user ids in the ADMIN_USERS setting (comma separated, in
// wrangler.toml) get in; everyone else gets "Not found", as if it isn't
// there. Approved story ideas are built by the scheduled story builder,
// which reads them straight from the database (docs/STORIES.md), so a
// member's words never go into the public GitHub repo. Nothing here returns
// who sent an idea or where they are: the "Near" part is kept for the writer
// only, as a rough area.

import { grantPlus } from './billing.js'

const DAY = 86400000

/** Is this signed-in user an admin? */
export function isAdmin(env, user) {
  if (!user?.id) return false
  if (!user.auth_sub && env.ALLOW_DEVICE_IDS !== '1') return false // signed in only (device ids are for local development)
  return String(env.ADMIN_USERS || '').split(',').map((s) => s.trim()).filter(Boolean).includes(user.id)
}

/** Split "Place: X | Story: Y | Near: a, b" back into its parts. */
export function parseStoryText(text) {
  const out = { place: '', story: '', near: null }
  for (const part of String(text || '').split(' | ')) {
    const i = part.indexOf(': ')
    if (i < 0) continue
    const k = part.slice(0, i)
    const v = part.slice(i + 2)
    if (k === 'Place') out.place = v
    else if (k === 'Story') out.story = v
    else if (k === 'Near') {
      const [lat, lng] = v.split(',').map(Number)
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.near = { lat, lng }
    }
  }
  return out
}

const STATUSES = ['waiting', 'approved', 'declined', 'built']
const status = (row) => row.status || 'waiting'

function ideaOut(r) {
  const { place, story, near } = parseStoryText(r.text)
  return { id: r.id, place, story, near, status: status(r), note: r.note || '', mission: r.mission || null, at: r.at, reviewedAt: r.reviewed_at || null }
}

// Retention from Foothold's own records, no tracker: of the players who
// joined in the last 90 days (and long enough ago to tell), the share who
// came back for another outing in each window after joining.
export const RETENTION = [
  { key: 'week1', from: 1, to: 7 }, // came back in the first week
  { key: 'week2', from: 7, to: 14 }, // still going in week two
  { key: 'month2', from: 30, to: 60 }, // still going in month two
]
export async function retention(env, now) {
  const out = {}
  for (const w of RETENTION) {
    const r = await env.DB.prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(EXISTS (SELECT 1 FROM activities a WHERE a.user_id = u.id AND a.rejected = 0
         AND a.started_at >= u.created_at + ? AND a.started_at < u.created_at + ?)), 0) AS back
       FROM users u WHERE u.created_at >= ? AND u.created_at < ?`,
    ).bind(w.from * DAY, w.to * DAY, now - (90 + w.to) * DAY, now - w.to * DAY).first()
    out[w.key] = { players: r.n, back: r.back, pct: r.n ? Math.round((100 * r.back) / r.n) : null }
  }
  return out
}

async function overview(env, now) {
  const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first()
  const [users, newUsers, act7, act30, runners7, ideas, approved, reports, plus, ai7, ai30] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM users'),
    one('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', now - 7 * DAY),
    one('SELECT COUNT(*) AS n, COALESCE(SUM(distance_m), 0) AS m FROM activities WHERE started_at >= ?', now - 7 * DAY),
    one('SELECT COUNT(*) AS n, COALESCE(SUM(distance_m), 0) AS m FROM activities WHERE started_at >= ?', now - 30 * DAY),
    one('SELECT COUNT(DISTINCT user_id) AS n FROM activities WHERE started_at >= ?', now - 7 * DAY),
    one("SELECT COUNT(*) AS n FROM feedback WHERE kind = 'story' AND status IS NULL"),
    one("SELECT COUNT(*) AS n FROM feedback WHERE kind = 'story' AND status = 'approved'"),
    one("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"),
    one("SELECT COUNT(*) AS n FROM subscriptions WHERE status IN ('active', 'trialing', 'past_due', 'granted')").catch(() => ({ n: 0 })),
    one('SELECT COALESCE(SUM(cost_aud), 0) AS c FROM ai_usage WHERE at >= ?', now - 7 * DAY),
    one('SELECT COALESCE(SUM(cost_aud), 0) AS c FROM ai_usage WHERE at >= ?', now - 30 * DAY),
  ])
  return {
    users: users.n,
    newUsers7: newUsers.n,
    runners7: runners7.n,
    activities7: act7.n,
    activities30: act30.n,
    km7: Math.round(act7.m / 100) / 10,
    km30: Math.round(act30.m / 100) / 10,
    ideasWaiting: ideas.n,
    ideasApproved: approved.n,
    reportsOpen: reports.n,
    plusMembers: plus.n,
    aiCost7: Math.round(ai7.c * 100) / 100,
    aiCost30: Math.round(ai30.c * 100) / 100,
    retention: await retention(env, now).catch(() => null),
  }
}

async function ideas(env, url) {
  const want = url.searchParams.get('status')
  const where = want === 'waiting' ? ' AND status IS NULL' : STATUSES.includes(want) ? ' AND status = ?' : ''
  const q = env.DB.prepare(`SELECT id, text, at, status, note, reviewed_at, mission FROM feedback WHERE kind = 'story'${where} ORDER BY at DESC LIMIT 100`)
  const { results } = await (where.includes('?') ? q.bind(want) : q).all()
  return { ideas: results.map(ideaOut) }
}

async function reviewIdea(env, id, body, now) {
  const row = await env.DB.prepare("SELECT id, status FROM feedback WHERE id = ? AND kind = 'story'").bind(id).first()
  if (!row) return { status: 404, error: 'That story idea has gone.' }
  const action = body?.action
  const note = typeof body?.note === 'string' ? body.note.replace(/\s+/g, ' ').trim().slice(0, 500) : null
  const next = { approve: 'approved', decline: 'declined', reopen: null, built: 'built' }
  if (!(action in next)) return { status: 400, error: 'Choose approve, decline or reopen.' }
  const mission = action === 'built' && typeof body?.mission === 'string' ? body.mission.slice(0, 80) : null
  await env.DB.prepare('UPDATE feedback SET status = ?, note = COALESCE(?, note), reviewed_at = ?, mission = COALESCE(?, mission) WHERE id = ?')
    .bind(next[action], note, now, mission, id).run()
  const r = await env.DB.prepare('SELECT id, text, at, status, note, reviewed_at, mission FROM feedback WHERE id = ?').bind(id).first()
  return { idea: ideaOut(r) }
}

async function inbox(env) {
  const { results } = await env.DB.prepare("SELECT id, kind, text, at FROM feedback WHERE kind != 'story' ORDER BY at DESC LIMIT 100").all()
  return { feedback: results.map((r) => ({ id: r.id, kind: r.kind, text: r.text, at: r.at })) }
}

async function reports(env) {
  const { results } = await env.DB.prepare("SELECT id, comment_id, activity_id, text, reason, at FROM reports WHERE status = 'open' ORDER BY at LIMIT 100").all()
  return { reports: results.map((r) => ({ id: r.id, commentId: r.comment_id, activityId: r.activity_id, text: r.text, reason: r.reason || '', at: r.at })) }
}

async function settleReport(env, id, body) {
  const row = await env.DB.prepare('SELECT id, comment_id FROM reports WHERE id = ?').bind(id).first()
  if (!row) return { status: 404, error: 'That report has gone.' }
  if (body?.action === 'keep') {
    await env.DB.prepare("UPDATE reports SET status = 'kept' WHERE comment_id = ?").bind(row.comment_id).run()
  } else if (body?.action === 'remove') {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(row.comment_id),
      env.DB.prepare("UPDATE reports SET status = 'removed' WHERE comment_id = ?").bind(row.comment_id),
    ])
  } else return { status: 400, error: 'Choose keep or remove.' }
  return { ok: true }
}

async function aiSpend(env, now) {
  const { results } = await env.DB.prepare(
    'SELECT feature, COUNT(*) AS calls, COALESCE(SUM(cost_aud), 0) AS cost FROM ai_usage WHERE at >= ? GROUP BY feature ORDER BY cost DESC',
  ).bind(now - 30 * DAY).all()
  return { ai: results.map((r) => ({ feature: r.feature, calls: r.calls, cost: Math.round(r.cost * 100) / 100 })) }
}

/**
 * The /api/admin/* routes. Returns undefined when the path isn't one of
 * them, { status, error } for a refusal, or the JSON to send.
 */
export async function adminRoute({ env, user, url, m, path, body, now }) {
  if (!path.startsWith('/api/admin/')) return undefined
  if (!isAdmin(env, user)) return { status: 404, error: 'Not found.' }
  if (path === '/api/admin/overview' && m === 'GET') return overview(env, now)
  if (path === '/api/admin/ideas' && m === 'GET') return ideas(env, url)
  let hit = path.match(/^\/api\/admin\/ideas\/([\w-]+)$/)
  if (hit && m === 'POST') return reviewIdea(env, hit[1], body, now)
  if (path === '/api/admin/feedback' && m === 'GET') return inbox(env)
  if (path === '/api/admin/reports' && m === 'GET') return reports(env)
  hit = path.match(/^\/api\/admin\/reports\/([\w-]+)$/)
  if (hit && m === 'POST') return settleReport(env, hit[1], body)
  if (path === '/api/admin/ai' && m === 'GET') return aiSpend(env, now)
  if (path === '/api/admin/plus' && m === 'POST') {
    if (typeof body?.userId !== 'string' || !/^[\w-]{8,64}$/.test(body.userId)) return { status: 400, error: 'Paste a player id.' }
    return grantPlus(env, body.userId, !!body.on, now)
  }
  return { status: 404, error: 'Not found.' }
}
