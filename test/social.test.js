// Social tests: the comment filter, league and rival helpers, and the comment, rivals, leagues, export and delete routes.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller, rectRun, ORIGIN } from './fakes.js'
import { offset } from '../src/lib/engine/index.js'
import { checkText, tidy } from '../src/lib/social/filter.js'
import { makeCode, normaliseCode, inviteLink, rankTable, rivalSums, groundOf, CODE_ALPHABET } from '../src/lib/social/leagues.js'
import { PRACTICE_LINES, practiceCommentsFor } from '../src/lib/social/practice.js'
import { rng } from '../src/lib/tracks.js'

const DAY = 86400000
let env
const call = caller(() => env)
const A = 'device-aaaa-aaaa-aaaa-0001'
const B = 'device-bbbb-bbbb-bbbb-0002'
const C = 'device-cccc-cccc-cccc-0003'
beforeEach(() => { env = makeEnv() })

describe('comment filter', () => {
  it('tidies and accepts kind words', () => {
    expect(checkText('  Great   run,​ mate!  ')).toEqual({ ok: true, text: 'Great run, mate!' })
    for (const ok of ['Class effort', 'Up past Scunthorpe Street', 'That hill is a killer', 'Assessment day tomorrow', 'About time!']) expect(checkText(ok).ok).toBe(true)
  })
  it('turns away links, slurs, abuse and long text', () => {
    expect(checkText('see https://spam.example').code).toBe('link')
    expect(checkText('go to www.thing.net').code).toBe('link')
    expect(checkText('cheap shoes at kicks.com.au').code).toBe('link')
    expect(checkText('cheap shoes at kicks dot com').ok).toBe(true)
    for (const rude of ['you c u n t', 'F.U.C.K off', 'what a r3tard', 'just kill yourself', 'shut up you fuckkk']) expect(checkText(rude).code).toBe('unkind')
    expect(checkText('x'.repeat(281)).code).toBe('too_long')
    expect(checkText('   ').code).toBe('empty')
    expect(checkText(42).ok).toBe(false)
    for (const r of ['unkind', 'link']) expect(checkText(r === 'link' ? 'www.a.com' : 'wanker').message).not.toMatch(/[–—]|--/)
    expect(tidy('a\n\n b')).toBe('a b')
  })
})

describe('league helpers', () => {
  it('makes and reads invite codes', () => {
    const code = makeCode(rng('x'))
    expect(code).toMatch(new RegExp(`^[${CODE_ALPHABET}]{6}$`))
    expect(normaliseCode(code.toLowerCase())).toBe(code)
    expect(normaliseCode(inviteLink('https://foothold.com.au/app/', code))).toBe(code)
    expect(inviteLink('https://me.github.io/foothold/#/app/leagues', 'K7P2QX')).toBe('https://me.github.io/foothold/#/app/leagues/join/K7P2QX')
    expect(inviteLink('https://foothold.com.au/', 'K7P2QX')).toBe('https://foothold.com.au/l/K7P2QX')
    expect(normaliseCode('https://foothold.com.au/l/K7P2QX')).toBe('K7P2QX')
    expect(normaliseCode('K7P2Q')).toBeNull()
    expect(normaliseCode('K7P2Q0')).toBeNull() // no zero in the alphabet
  })
  it('ranks by ground gained, then held', () => {
    const t = rankTable([{ name: 'A', gained7d: 2, hexes: 50 }, { name: 'B', gained7d: 9, hexes: 10 }, { name: 'C', gained7d: 2, hexes: 60 }])
    expect(t.map((r) => [r.name, r.rank])).toEqual([['B', 1], ['C', 2], ['A', 3]])
  })
  it('counts only public ground', () => {
    const now = Date.now()
    const cells = [{ owner: 'u', claimedAt: now - DAY }, { owner: 'u', claimedAt: now - 20 * DAY }, { owner: 'u', private: true, claimedAt: now }, { owner: 'v', claimedAt: now }]
    expect(groundOf(cells, 'u', now)).toEqual({ hexes: 2, gained7d: 1 })
  })
  it('sums swaps both ways over 30 days and a battle record', () => {
    const now = Date.now()
    const battles = [
      { attacker: 'me', defender: 'r', hexes: [1, 2, 3], endedAt: now - DAY, winner: 'me' },
      { attacker: 'r', defender: 'me', hexes: [1], endsAt: now + DAY },
    ]
    const swaps = [{ taker: 'me', loser: 'r', n: 5, at: now - DAY }, { taker: 'r', loser: 'me', n: 2, at: now }, { taker: 'r', loser: 'me', n: 9, at: now - 40 * DAY }]
    const r = rivalSums('me', battles, swaps, now).get('r')
    expect(r).toMatchObject({ swaps: 4, tookFromThem: 5, tookFromYou: 2, record: { won: 1, lost: 0, draws: 0 } })
    expect(r.live.attacker).toBe('r')
  })
  it('practice comments are kind and come after the activity', () => {
    const a = { startedAt: Date.now() - DAY, durationS: 1800 }
    const list = practiceCommentsFor(a, [{ id: 'r-sam' }], () => 0.9)
    expect(list).toHaveLength(2)
    expect(list.every((c) => c.at > a.startedAt + 1800000 && PRACTICE_LINES.includes(c.text))).toBe(true)
    for (const l of PRACTICE_LINES) expect(checkText(l).ok && !/[–—]|--/.test(l)).toBe(true)
  })
})

async function battleWorld() {
  await call(A, 'PUT', '/api/me', { name: 'Ava' })
  await call(B, 'PUT', '/api/me', { name: 'Ben' })
  const first = await call(A, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
  const second = await call(B, 'POST', '/api/activities', { mode: 'run', points: rectRun({ w: 1500, h: 1000, start: offset(ORIGIN, -300, -300) }) })
  return { first: first.body, second: second.body }
}

describe('comments', () => {
  it('adds, lists, counts, deletes and reports', async () => {
    const { first } = await battleWorld()
    const id = first.activity.id
    const add = await call(B, 'POST', `/api/activities/${id}/comments`, { text: '  Nice loop, Ava!  ' })
    expect(add.status).toBe(200)
    expect(add.body.comment).toMatchObject({ text: 'Nice loop, Ava!', name: 'Ben', mine: true, canDelete: true })
    expect(add.body.count).toBe(1)

    // The owner sees it, can delete it, and gets a notice
    const list = await call(A, 'GET', `/api/activities/${id}/comments`)
    expect(list.body.comments[0]).toMatchObject({ name: 'Ben', mine: false, canDelete: true })
    const note = (await call(A, 'GET', '/api/notifications')).body.items.find((n) => n.kind === 'comment')
    expect(note.text).toBe('Ben left a comment on your run.')
    // The count shows in the feed and on the activity
    expect((await call(A, 'GET', '/api/feed')).body.items.find((i) => i.activity.id === id).activity.comments).toBe(1)
    expect((await call(B, 'GET', `/api/activities/${id}`)).body.activity.comments).toBe(1)

    // Filtered and limited
    expect((await call(B, 'POST', `/api/activities/${id}/comments`, { text: 'visit www.spam.com' })).body.code).toBe('link')
    expect((await call(B, 'POST', `/api/activities/${id}/comments`, { text: 'you wanker' })).status).toBe(400)
    expect((await call(B, 'POST', `/api/activities/${id}/comments`, { text: 'x'.repeat(300) })).body.code).toBe('too_long')
    expect((await call(B, 'POST', '/api/activities/nope/comments', { text: 'hi' })).status).toBe(404)

    // A third player can't delete Ben's comment, can report it, and then doesn't see it
    await call(C, 'PUT', '/api/me', { name: 'Cal' })
    const cid = add.body.comment.id
    expect((await call(C, 'DELETE', `/api/activities/${id}/comments/${cid}`)).status).toBe(403)
    expect((await call(C, 'POST', `/api/activities/${id}/comments/${cid}/report`, { reason: 'Not kind' })).body).toEqual({ ok: true })
    expect((await call(C, 'POST', `/api/activities/${id}/comments/${cid}/report`, {})).body).toEqual({ ok: true }) // once only
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM reports').get().n).toBe(1)
    expect(env.DB.db.prepare('SELECT text, status FROM reports').get()).toEqual({ text: 'Nice loop, Ava!', status: 'open' })
    expect((await call(C, 'GET', `/api/activities/${id}/comments`)).body.comments).toHaveLength(0)
    expect((await call(B, 'POST', `/api/activities/${id}/comments/${cid}/report`, {})).status).toBe(400) // your own

    // The owner deletes it
    expect((await call(A, 'DELETE', `/api/activities/${id}/comments/${cid}`)).body).toEqual({ ok: true, count: 0 })
    expect((await call(A, 'DELETE', `/api/activities/${id}/comments/${cid}`)).status).toBe(404)
  })

  it('lets authors delete their own, and goes with the activity', async () => {
    const { first } = await battleWorld()
    const id = first.activity.id
    const c1 = (await call(B, 'POST', `/api/activities/${id}/comments`, { text: 'One' })).body.comment
    await call(A, 'POST', `/api/activities/${id}/comments`, { text: 'Thanks Ben' })
    expect((await call(B, 'DELETE', `/api/activities/${id}/comments/${c1.id}`)).body.count).toBe(1)
    await call(C, 'POST', `/api/activities/${id}/comments/${(await call(C, 'GET', `/api/activities/${id}/comments`)).body.comments[0].id}/report`, {})
    await call(A, 'DELETE', `/api/activities/${id}`)
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM comments').get().n).toBe(0)
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM reports').get().n).toBe(0)
  })

  it('rate limits comments', async () => {
    const { first } = await battleWorld()
    let last
    for (let i = 0; i < 31; i++) last = await call(B, 'POST', `/api/activities/${first.activity.id}/comments`, { text: `Nice ${i}` })
    expect(last.status).toBe(429)
    expect(last.body.code).toBe('rate_limited')
  })
})

describe('rivals', () => {
  it('shows swaps both ways, the live battle, crest and last active', async () => {
    const { second } = await battleWorld()
    const r = await call(A, 'GET', '/api/rivals')
    expect(r.status).toBe(200)
    const ben = r.body.rivals[0]
    expect(ben).toMatchObject({ name: 'Ben', tookFromYou: second.diff.taken.length, tookFromThem: 0, crest: null, record: { won: 0, lost: 0, draws: 0 } })
    expect(ben.swaps).toBeGreaterThan(0)
    expect(ben.battle).toMatchObject({ attackerName: 'Ben', defenderName: 'Ava' })
    expect(ben.battle.score).toBeTruthy()
    expect(ben.lastActive).toBe(second.activity.startedAt)
    expect(ben.hexes).toBeGreaterThan(0)
    const fromBen = (await call(B, 'GET', '/api/rivals')).body.rivals[0]
    expect(fromBen).toMatchObject({ name: 'Ava', tookFromThem: second.diff.taken.length, tookFromYou: 0 })
  })
})

describe('leagues', () => {
  it('creates, joins by code or link, ranks and leaves', async () => {
    await battleWorld()
    const made = await call(A, 'POST', '/api/leagues', { name: '  Office   Striders ' })
    expect(made.status).toBe(200)
    const lg = made.body.league
    expect(lg).toMatchObject({ name: 'Office Striders', members: 1, createdByMe: true })
    expect(lg.code).toMatch(/^[A-Z2-9]{6}$/)

    expect((await call(B, 'GET', `/api/leagues/${lg.id}`)).status).toBe(403)
    const joined = await call(B, 'POST', '/api/leagues/join', { code: `https://foothold.test/#/app/leagues/join/${lg.code}` })
    expect(joined.body.league).toMatchObject({ id: lg.id, members: 2, createdByMe: false })
    expect((await call(B, 'POST', '/api/leagues/join', { code: lg.code.toLowerCase() })).body.already).toBe(true)
    expect((await call(B, 'POST', '/api/leagues/join', { code: 'ZZZZZZ' })).status).toBe(404)
    expect((await call(B, 'POST', '/api/leagues/join', { code: 'nope' })).body.code).toBe('bad_code')

    const t = await call(A, 'GET', `/api/leagues/${lg.id}`)
    expect(t.body.table.map((r) => r.name)).toEqual(['Ben', 'Ava'])
    expect(t.body.table[0].gained7d).toBeGreaterThan(0)
    expect(t.body.table[1]).toMatchObject({ me: true, rank: 2 })
    expect(t.body.members.map((m) => m.name)).toEqual(['Ava', 'Ben'])
    expect(t.body.members[0].owner).toBe(true)
    expect((await call(B, 'GET', '/api/leagues')).body.leagues.map((l) => l.name)).toEqual(['Office Striders'])

    expect((await call(B, 'POST', `/api/leagues/${lg.id}/leave`)).body).toEqual({ ok: true })
    expect((await call(B, 'GET', '/api/leagues')).body.leagues).toHaveLength(0)
    await call(A, 'POST', `/api/leagues/${lg.id}/leave`)
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM leagues').get().n).toBe(0)
  })

  it('never counts privacy zone ground', async () => {
    await call(C, 'PUT', '/api/me', { name: 'Cal', zones: [{ ...offset(ORIGIN, 300, 200), radiusM: 300, label: 'Home' }] })
    await call(C, 'POST', '/api/activities', { mode: 'run', points: rectRun() })
    const lg = (await call(C, 'POST', '/api/leagues', { name: 'Home crew' })).body.league
    await call(A, 'POST', '/api/leagues/join', { code: lg.code })
    const priv = env.DB.db.prepare('SELECT COUNT(*) AS n FROM cells WHERE private = 1').get().n
    const all = env.DB.db.prepare('SELECT COUNT(*) AS n FROM cells').get().n
    expect(priv).toBeGreaterThan(0)
    const row = (await call(A, 'GET', `/api/leagues/${lg.id}`)).body.table.find((r) => r.name === 'Cal')
    expect(row.hexes).toBe(all - priv)
    expect(row.gained7d).toBe(all - priv)
  })

  it('keeps to 5 leagues each, 50 members each, and filters names', async () => {
    for (let i = 0; i < 5; i++) expect((await call(A, 'POST', '/api/leagues', { name: `League ${i}` })).status).toBe(200)
    expect((await call(A, 'POST', '/api/leagues', { name: 'One more' })).body.code).toBe('league_limit')
    expect((await call(B, 'POST', '/api/leagues', { name: 'ab' })).status).toBe(400)
    expect((await call(B, 'POST', '/api/leagues', { name: 'fuck league' })).body.code).toBe('unkind')
    const lg = (await call(B, 'POST', '/api/leagues', { name: 'Big one' })).body.league
    const now = Date.now()
    for (let i = 0; i < 49; i++) {
      env.DB.db.prepare('INSERT INTO users (id, name, colour, created_at) VALUES (?, ?, ?, ?)').run(`u${i}`, `P${i}`, '#123456', now)
      env.DB.db.prepare('INSERT INTO league_members (league_id, user_id, joined_at) VALUES (?, ?, ?)').run(lg.id, `u${i}`, now)
    }
    expect((await call(C, 'POST', '/api/leagues/join', { code: lg.code })).body.code).toBe('league_full')
  })
})

describe('export and delete', () => {
  it('includes social data in the export and removes it on delete', async () => {
    const { first } = await battleWorld()
    await call(B, 'POST', `/api/activities/${first.activity.id}/comments`, { text: 'Go Ava' })
    const lg = (await call(B, 'POST', '/api/leagues', { name: 'Ben crew' })).body.league
    await call(B, 'POST', '/api/routes', { name: 'Park loop', ring: [[151.15, -33.9], [151.155, -33.9], [151.155, -33.896], [151.15, -33.9]] })
    const ex = await call(B, 'GET', '/api/me/export')
    expect(ex.body.user.name).toBe('Ben')
    // Every feature's personal data comes along
    expect(ex.body.routes.map((r) => r.name)).toEqual(['Park loop'])
    for (const t of ['hex_losses', 'personal_bests', 'stronghold_efforts']) expect(Array.isArray(ex.body[t])).toBe(true)
    expect(ex.body.comments.map((c) => c.text)).toEqual(['Go Ava'])
    expect(ex.body.leagues[0]).toMatchObject({ name: 'Ben crew', code: lg.code })
    expect(ex.body.swaps.length).toBeGreaterThan(0)
    expect(ex.body.activities[0].track.length).toBeGreaterThan(10)
    expect(JSON.stringify(ex.body)).not.toContain('formtrack_token_enc')

    expect((await call(B, 'DELETE', '/api/me')).body).toEqual({ ok: true })
    for (const t of ['comments', 'leagues', 'league_members', 'swaps', 'battles']) expect(env.DB.db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n).toBe(0)
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM users').get().n).toBe(1)
    const id = ex.body.user.id
    for (const t of ['routes', 'hex_losses', 'personal_bests', 'stronghold_efforts']) expect(env.DB.db.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE user_id = ?`).get(id).n).toBe(0)
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM hex_losses WHERE by_user = ?').get(id).n).toBe(0)
  })
})
