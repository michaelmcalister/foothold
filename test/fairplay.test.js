// Fair play and privacy on saving (worker/index.js postActivity and
// src/lib/engine/process.js): the same track can't take ground twice, a
// retry returns the saved run, huge loops only count their line, old
// imports don't take ground, others' hexes come back without names, and
// other players never see the ends of a track.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller, rectRun } from './fakes.js'
import { processActivity, MAX_LOOP_KM2, LIVE_DAYS } from '../src/lib/engine/process.js'
import { trimEnds, END_TRIM_M } from '../src/lib/engine/privacy.js'
import { distance } from '../src/lib/engine/geo.js'
import { capFor } from '../worker/db.js'

const A = 'device-0000-fair-fair-0001'
const B = 'device-0000-fair-fair-0002'

describe('fair play', () => {
  let env
  const call = caller(() => env)
  beforeEach(() => { env = makeEnv() })

  it('returns the saved run on a retry, and refuses someone else replaying it', async () => {
    const pts = rectRun()
    const first = (await call(A, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: pts })).body
    expect(first.activity.claimed).toBeGreaterThan(0)
    const again = (await call(A, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: pts })).body
    expect(again.already).toBe(true)
    expect(again.activity.id).toBe(first.activity.id)
    const shifted = pts.map((p) => ({ ...p, t: p.t + 3600000 }))
    const copy = await call(B, 'POST', '/api/activities', { mode: 'run', source: 'import', points: shifted })
    expect(copy.status).toBe(409)
  })

  it("doesn't name who held the hexes you took", async () => {
    await call(A, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: rectRun() })
    const res = (await call(B, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: rectRun({ w: 620, h: 420, t0: Date.now() - 3600000 }) })).body
    expect(res.diff.taken.length + res.diff.held.length).toBeGreaterThan(0)
    expect(JSON.stringify(res.diff)).not.toMatch(/from|owner|user/)
  })

  it('counts only the line of a loop too big to believe, and nothing from old runs', () => {
    const world = { cells: new Map(), zones: [], battles: [], now: Date.now() }
    const huge = rectRun({ w: 4000, h: 3000, kmh: 25 }) // 12 km², on a bike: over the run cap, under the ride cap
    const run = processActivity({ id: 'r', userId: 'u', mode: 'run', points: huge }, world)
    const ride = processActivity({ id: 'b', userId: 'u', mode: 'ride', points: huge }, world)
    expect(12).toBeGreaterThan(MAX_LOOP_KM2.run)
    expect(run.activity.flags.some((f) => f.type === 'bigloop')).toBe(true)
    expect(run.activity.claimed).toBeLessThan(ride.activity.claimed / 3)
    const old = processActivity({ id: 'o', userId: 'u', mode: 'run', points: rectRun({ t0: Date.now() - (LIVE_DAYS + 2) * 86400000 }) }, world)
    expect(old.activity.claimed || 0).toBe(0)
    expect(old.activity.flags.some((f) => f.type === 'history')).toBe(true)
  })

  it('cuts the first and last 200 m of what others see', () => {
    const pts = rectRun()
    const out = trimEnds(pts)
    expect(distance(pts[0], out[0])).toBeGreaterThan(END_TRIM_M * 0.7)
    expect(distance(pts.at(-1), out.at(-1))).toBeGreaterThan(END_TRIM_M * 0.7)
    expect(trimEnds(pts.slice(0, 20))).toEqual([])
  })

  it('has a daily spend ceiling for every paid service, changeable by a variable', () => {
    expect(capFor({}, 'tts')).toBeGreaterThan(0)
    expect(capFor({ CAP_TTS_SCRIPT: '50' }, 'ttsScript')).toBe(50)
    expect(capFor({}, 'aiPlanDay')).toBeGreaterThan(0)
  })
})
