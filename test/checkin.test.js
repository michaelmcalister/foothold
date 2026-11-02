// Post-run check-in tests: the route on a fake D1, the practice adapter, the tired signal and adaptation, and the coach's notes on how it felt.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller, rectRun } from './fakes.js'
import { local } from '../src/lib/api/local.js'
import { cleanCheckin, tiredSignal, adaptPlan, generatePlan, debrief, allSessions, toMs, toISO, addDays } from '../src/lib/coach/index.js'

let env
const call = caller(() => env)
const A = 'device-aaaa-aaaa-aaaa-0001'
const B = 'device-bbbb-bbbb-bbbb-0002'
beforeEach(() => { env = makeEnv() })

describe('POST /api/activities/:id/checkin', () => {
  it('saves how it felt on your activity, in lists and in your export', async () => {
    const { body } = await call(A, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: rectRun() })
    const id = body.activity.id
    const before = await call(A, 'GET', `/api/activities/${id}`)
    expect(before.body.activity).toMatchObject({ feel: null, hurt: null, checkinAt: null })

    const r = await call(A, 'POST', `/api/activities/${id}/checkin`, { feel: 4 })
    expect(r.status).toBe(200)
    expect(r.body.activity.feel).toBe(4)
    expect(r.body.activity.checkinAt).toBeGreaterThan(0)
    const list = await call(A, 'GET', '/api/activities')
    expect(list.body.activities[0].feel).toBe(4)

    const hurt = await call(A, 'POST', `/api/activities/${id}/checkin`, { feel: 'hurt', hurt: { area: 'knee', level: 'sore' } })
    expect(hurt.body.activity).toMatchObject({ feel: 'hurt', hurt: { area: 'knee', level: 'sore' } })
    const ex = await call(A, 'GET', '/api/me/export')
    expect(ex.body.activities[0]).toMatchObject({ feel: 'hurt', hurt: { area: 'knee', level: 'sore' } })
  })

  it('records a dismissal so it is never asked again', async () => {
    const { body } = await call(A, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: rectRun() })
    const r = await call(A, 'POST', `/api/activities/${body.activity.id}/checkin`, { dismissed: true })
    expect(r.body.activity.feel).toBeNull()
    expect(r.body.activity.checkinAt).toBeGreaterThan(0)
  })

  it("refuses bad answers and other people's runs, and never shows others how it felt", async () => {
    const { body } = await call(A, 'POST', '/api/activities', { mode: 'run', source: 'phone', points: rectRun() })
    const id = body.activity.id
    expect((await call(A, 'POST', `/api/activities/${id}/checkin`, { feel: 9 })).status).toBe(400)
    expect((await call(A, 'POST', `/api/activities/${id}/checkin`, { feel: 'hurt', hurt: { area: 'elbow', level: 'sore' } })).status).toBe(400)
    expect((await call(B, 'POST', `/api/activities/${id}/checkin`, { feel: 2 })).status).toBe(403)
    await call(A, 'POST', `/api/activities/${id}/checkin`, { feel: 2 })
    const seen = await call(B, 'GET', `/api/activities/${id}`)
    expect(seen.body.activity).not.toHaveProperty('feel')
    expect(seen.body.activity).not.toHaveProperty('hurt')
    expect((await call(A, 'POST', '/api/activities/nope/checkin', { feel: 2 })).status).toBe(404)
  })
})

describe('practice adapter check-in', () => {
  it('behaves like the server', async () => {
    await local.reset()
    const saved = await local.postActivity({ mode: 'run', source: 'phone', points: rectRun() })
    const id = saved.activity.id
    expect((await local.activity(id)).activity).toMatchObject({ feel: null, hurt: null, checkinAt: null })
    const r = await local.checkin(id, { feel: 'hurt', hurt: { area: 'calf', level: 'niggle' } })
    expect(r.activity).toMatchObject({ feel: 'hurt', hurt: { area: 'calf', level: 'niggle' } })
    expect((await local.activities()).activities[0].feel).toBe('hurt')
    expect((await local.checkin(id, { dismissed: true })).activity.feel).toBeNull()
    await expect(local.checkin(id, { feel: 0 })).rejects.toThrow(/1 to 5/)
    await expect(local.checkin('gone', { feel: 2 })).rejects.toThrow(/gone/)
  })
})

describe('cleanCheckin', () => {
  it('accepts 1 to 5, hurt, and hurt with details', () => {
    expect(cleanCheckin({ feel: 3 })).toEqual({ feel: 3, hurt: null })
    expect(cleanCheckin({ feel: '5' })).toEqual({ feel: 5, hurt: null })
    expect(cleanCheckin({ feel: 'hurt' })).toEqual({ feel: 'hurt', hurt: null })
    expect(cleanCheckin({ feel: 'hurt', hurt: { area: 'back', level: 'hurt', extra: 1 } })).toEqual({ feel: 'hurt', hurt: { area: 'back', level: 'hurt' } })
    expect(cleanCheckin({ feel: 2, hurt: { area: 'back', level: 'hurt' } }).hurt).toBeNull()
    expect(() => cleanCheckin({ feel: 1.5 })).toThrow()
    expect(() => cleanCheckin({})).toThrow()
  })
})

// A plan with easy runs, and runs done on those days
const TODAY = '2026-11-02'
const plan = generatePlan({ goal: '10k', daysPerWeek: 4, longRunDay: 'sun', currentWeeklyKm: 25, longestRecentKm: 10, today: TODAY })
const sessions = allSessions(plan)
const easyDays = sessions.filter((s) => ['easy', 'long', 'recovery', 'strides'].includes(s.type)).map((s) => s.date)
const weeklyEasy = sessions.filter((s) => s.type === 'easy').map((s) => s.date) // a week apart
const at = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 8).getTime() } // 8am local
const ranOn = (iso, feel) => ({ id: `a-${iso}`, mode: 'run', startedAt: at(iso), distanceM: 5000, movingS: 1900, feel })

describe('tired signal and adaptation', () => {
  it('fires on 2 planned easy runs in a week that felt very hard, not on one', () => {
    const [d1, d2] = easyDays
    const now = at(d2) + 3600000
    expect(tiredSignal(plan, [ranOn(d1, 4)], now)).toBe(false)
    expect(tiredSignal(plan, [ranOn(d1, 4), ranOn(d2, 4)], now)).toBe(true)
    expect(tiredSignal(plan, [ranOn(d1, 4), ranOn(d2, 3)], now)).toBe(false)
    expect(tiredSignal(null, [ranOn(d1, 4), ranOn(d2, 4)], now)).toBe(false)
  })
  it('fires on the last 3 easy runs all very hard, even across weeks', () => {
    const spread = weeklyEasy.slice(0, 3)
    expect(spread).toHaveLength(3)
    const now = at(spread[spread.length - 1]) + 3600000
    const runs = spread.map((d) => ranOn(d, 5))
    expect(tiredSignal(plan, runs, now)).toBe(true)
    runs[2].feel = 2
    expect(tiredSignal(plan, runs, now)).toBe(false)
  })
  it('stays quiet for 4 days after it last eased the plan', () => {
    const [d1, d2] = easyDays
    const eased = { ...plan, history: [{ at: d2, type: 'tired' }] }
    expect(tiredSignal(eased, [ranOn(d1, 4), ranOn(d2, 4)], at(d2) + 3600000)).toBe(false)
  })
  it('makes the next 4 days easy at about 80%, kindly', () => {
    const t = easyDays[1]
    const r = adaptPlan(plan, { type: 'tired' }, t)
    const window = (p) => allSessions(p).filter((s) => s.date >= t && s.date <= addDays(t, 3) && s.status === 'planned' && s.type !== 'rest' && s.type !== 'strength')
    const before = window(plan)
    const after = window(r.plan)
    expect(after.length).toBe(before.length)
    for (const s of after) expect(['easy', 'recovery']).toContain(s.type)
    const km = (xs) => xs.reduce((n, s) => n + (s.distanceKm || 0), 0)
    expect(km(after)).toBeLessThanOrEqual(km(before) * 0.85)
    expect(r.changes.join(' ')).toMatch(/next 4 days are easy/)
    expect(r.changes.join(' ')).not.toMatch(/[–—]|--|fail|lazy/i)
    // after the window the plan carries on
    const later = allSessions(r.plan).find((s) => s.date > addDays(t, 3) && s.type !== 'rest')
    expect(later.adapted).toBeFalsy()
    expect(r.plan.history.at(-1).type).toBe('tired')
  })
})

describe("coach's notes mention how it felt", () => {
  const a = (extra) => ({ id: 'a1', mode: 'run', startedAt: at(easyDays[0]), distanceM: 5000, movingS: 1900, paceSPerKm: 380, loops: 1, claimed: 0, taken: 0, reinforced: 0, ...extra })
  const easy = { type: 'easy', title: 'Easy 5 km', distanceKm: 5, paceRange: [360, 395], status: 'planned' }
  it('says to go slower after a very hard one, first', () => {
    const n = debrief({ activity: a({ feel: 4 }), planned: easy })
    expect(n[0].kind).toBe('feel')
    expect(n[0].text).toBe('You said that felt very hard. Next easy run, go slower than you think.')
  })
  it('says hard on an easy day the same way', () => {
    expect(debrief({ activity: a({ feel: 3 }), planned: easy })[0].text).toBe('You said that felt hard. Next easy run, go slower than you think.')
  })
  it('points to a GP or physio when it hurts', () => {
    const n = debrief({ activity: a({ feel: 'hurt', hurt: { area: 'knee', level: 'hurt' } }), planned: easy })
    expect(n[0].text).toMatch(/your knee hurts.*GP or physio/)
    expect(n[n.length - 1].text).toMatch(/stop if it starts to hurt/)
  })
  it('stays quiet when there was no check-in', () => {
    expect(debrief({ activity: a({}), planned: easy }).some((x) => x.kind === 'feel')).toBe(false)
  })
  it('keeps every note free of dashes', () => {
    for (const feel of [1, 2, 3, 4, 5, 'hurt']) for (const n of debrief({ activity: a({ feel, hurt: feel === 'hurt' ? { area: 'shin', level: 'sore' } : null }), planned: easy })) expect(n.text).not.toMatch(/[–—]|--/)
  })
})
