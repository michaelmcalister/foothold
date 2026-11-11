// The admin page's API (worker/admin.js): only ADMIN_USERS get in; story
// ideas can be approved, declined and reopened; reports kept or removed.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller } from './fakes.js'
import { parseStoryText, isAdmin } from '../worker/admin.js'

let env
const call = caller(() => env)
let adminId
const OWNER = 'device-0000-aaaa-aaaa-0001'
const RUNNER = 'device-0000-bbbb-bbbb-0002'

beforeEach(async () => {
  env = makeEnv()
  adminId = (await call(OWNER, 'GET', '/api/me')).body.user.id
  env.ADMIN_USERS = `someone-else, ${adminId}`
})

describe('who gets in', () => {
  it('marks admins on /api/me, and nobody else', async () => {
    expect((await call(OWNER, 'GET', '/api/me')).body.user.admin).toBe(true)
    expect((await call(RUNNER, 'GET', '/api/me')).body.user.admin).toBeUndefined()
  })
  it('says Not found to everyone else', async () => {
    const r = await call(RUNNER, 'GET', '/api/admin/overview')
    expect(r.status).toBe(404)
  })
  it('needs a real sign-in in production', () => {
    expect(isAdmin({ ADMIN_USERS: 'u1' }, { id: 'u1', auth_sub: null })).toBe(false)
    expect(isAdmin({ ADMIN_USERS: 'u1' }, { id: 'u1', auth_sub: 'google|1' })).toBe(true)
    expect(isAdmin({}, { id: 'u1', auth_sub: 'google|1' })).toBe(false)
  })
})

describe('story ideas', () => {
  it('reads a story request back into its parts', () => {
    expect(parseStoryText('Place: Old quarry | Story: Lights at night | Near: -33.71, 150.74')).toEqual({ place: 'Old quarry', story: 'Lights at night', near: { lat: -33.71, lng: 150.74 } })
    expect(parseStoryText('Place: Just a place')).toEqual({ place: 'Just a place', story: '', near: null })
  })

  it('approves, declines and reopens ideas', async () => {
    await call(RUNNER, 'POST', '/api/story-requests', { place: 'The old quarry', story: 'Lights at night' })
    await call(RUNNER, 'POST', '/api/story-requests', { place: 'The weir' })
    await call(RUNNER, 'POST', '/api/feedback', { kind: 'bug', text: 'The map was slow today' })
    const over = (await call(OWNER, 'GET', '/api/admin/overview')).body
    expect(over.ideasWaiting).toBe(2)
    expect(over.users).toBe(2)

    const waiting = (await call(OWNER, 'GET', '/api/admin/ideas?status=waiting')).body.ideas
    expect(waiting.map((i) => i.place).sort()).toEqual(['The old quarry', 'The weir'])
    expect(waiting[0]).not.toHaveProperty('user_id')

    const quarry = waiting.find((i) => i.place === 'The old quarry')
    const ok = await call(OWNER, 'POST', `/api/admin/ideas/${quarry.id}`, { action: 'approve', note: 'Keep it light' })
    expect(ok.body.idea).toMatchObject({ status: 'approved', note: 'Keep it light' })
    const weir = waiting.find((i) => i.place === 'The weir')
    await call(OWNER, 'POST', `/api/admin/ideas/${weir.id}`, { action: 'decline' })

    expect((await call(OWNER, 'GET', '/api/admin/ideas?status=approved')).body.ideas.map((i) => i.place)).toEqual(['The old quarry'])
    expect((await call(OWNER, 'GET', '/api/admin/ideas?status=waiting')).body.ideas).toEqual([])
    await call(OWNER, 'POST', `/api/admin/ideas/${weir.id}`, { action: 'reopen' })
    expect((await call(OWNER, 'GET', '/api/admin/ideas?status=waiting')).body.ideas.map((i) => i.place)).toEqual(['The weir'])

    expect((await call(OWNER, 'POST', `/api/admin/ideas/${weir.id}`, { action: 'explode' })).status).toBe(400)
    expect((await call(OWNER, 'POST', '/api/admin/ideas/nope', { action: 'approve' })).status).toBe(404)
    expect((await call(RUNNER, 'POST', `/api/admin/ideas/${weir.id}`, { action: 'approve' })).status).toBe(404)

    const fb = (await call(OWNER, 'GET', '/api/admin/feedback')).body.feedback
    expect(fb.map((f) => f.text)).toEqual(['The map was slow today'])
  })
})

describe('reports and AI spend', () => {
  it('removes or keeps a reported comment', async () => {
    const db = env.DB.db
    const now = Date.now()
    db.prepare('INSERT INTO comments (id, activity_id, user_id, text, at) VALUES (?, ?, ?, ?, ?)').run('c1', 'a1', 'u2', 'not nice', now)
    db.prepare('INSERT INTO comments (id, activity_id, user_id, text, at) VALUES (?, ?, ?, ?, ?)').run('c2', 'a1', 'u2', 'fine really', now)
    db.prepare('INSERT INTO reports (id, comment_id, activity_id, reporter, author, text, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('r1', 'c1', 'a1', 'u3', 'u2', 'not nice', now)
    db.prepare('INSERT INTO reports (id, comment_id, activity_id, reporter, author, text, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('r2', 'c2', 'a1', 'u3', 'u2', 'fine really', now)
    db.prepare('INSERT INTO ai_usage (day, feature, model, tokens_in, tokens_out, cost_aud, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('2026-11-11', 'plan', 'm', 10, 10, 0.123, now)

    expect((await call(OWNER, 'GET', '/api/admin/reports')).body.reports).toHaveLength(2)
    await call(OWNER, 'POST', '/api/admin/reports/r1', { action: 'remove' })
    await call(OWNER, 'POST', '/api/admin/reports/r2', { action: 'keep' })
    expect(db.prepare('SELECT id FROM comments').all().map((r) => r.id)).toEqual(['c2'])
    expect((await call(OWNER, 'GET', '/api/admin/reports')).body.reports).toEqual([])
    expect((await call(OWNER, 'GET', '/api/admin/ai')).body.ai).toEqual([{ feature: 'plan', calls: 1, cost: 0.12 }])
    expect((await call(OWNER, 'GET', '/api/admin/overview')).body.aiCost7).toBe(0.12)
  })
})
