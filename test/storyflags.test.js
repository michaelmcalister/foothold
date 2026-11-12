// Capture the story (worker/storyflags.js): a run that reaches a story's
// real place plants a flag once, a run that doesn't plants nothing, and the
// board counts runners and names the first.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller } from './fakes.js'
import { reachedPlace } from '../worker/storyflags.js'
import { MISSIONS } from '../src/lib/missions/scripts.js'
import { packTrack } from '../worker/db.js'

const bondi = MISSIONS.find((m) => m.id === 'bondi-breakers')
const near = (lat, lng, n = 30) => Array.from({ length: n }, (_, i) => ({ lat: lat + i * 0.0001, lng, t: Date.UTC(2026, 10, 12) + i * 1000 }))

describe('capture the story', () => {
  let env
  const call = caller(() => env)
  beforeEach(() => { env = makeEnv() })

  it('knows when a run reached the place', () => {
    expect(reachedPlace(near(bondi.place.lat, bondi.place.lng), bondi.place)).toBe(true)
    expect(reachedPlace(near(-33.75, 150.7), bondi.place)).toBe(false)
  })

  it('plants a flag once, and keeps a board', async () => {
    const A = 'device-0000-flag-flag-0001'
    const B = 'device-0000-flag-flag-0002'
    const a = (await call(A, 'GET', '/api/me')).body.user.id
    await call(B, 'GET', '/api/me')
    const b = (await call(B, 'GET', '/api/me')).body.user.id
    const db = env.DB.db
    const put = (id, user, pts) => db.prepare('INSERT INTO activities (id, user_id, mode, source, started_at, distance_m, duration_s, track, rejected, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)').run(id, user, 'run', 'phone', Date.UTC(2026, 10, 12), 3000, 900, packTrack(pts), Date.UTC(2026, 10, 12))
    put('act-a', a, near(bondi.place.lat, bondi.place.lng))
    put('act-far', b, near(-33.75, 150.7))
    put('act-b', b, near(bondi.place.lat, bondi.place.lng))
    let r = (await call(A, 'POST', '/api/stories/flag', { activityId: 'act-a', missionId: bondi.id })).body
    expect(r).toMatchObject({ planted: true, place: 'Bondi Beach', count: 1 })
    r = (await call(A, 'POST', '/api/stories/flag', { activityId: 'act-a', missionId: bondi.id })).body
    expect(r).toMatchObject({ planted: false, count: 1 })
    expect((await call(B, 'POST', '/api/stories/flag', { activityId: 'act-far', missionId: bondi.id })).body).toMatchObject({ planted: false, count: 1 })
    expect((await call(B, 'POST', '/api/stories/flag', { activityId: 'act-a', missionId: bondi.id })).status).toBe(404) // not their run
    expect((await call(B, 'POST', '/api/stories/flag', { activityId: 'act-b', missionId: bondi.id })).body).toMatchObject({ planted: true, count: 2 })
    const board = (await call(B, 'GET', `/api/stories/flags?mission=${bondi.id}`)).body
    expect(board.count).toBe(2)
    expect(board.mine).toBeTruthy()
    expect(board.first.name).toBeTruthy()
    expect(JSON.stringify(board)).not.toMatch(/"(lat|lng|user_id)"/)
  })
})
