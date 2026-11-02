// Tests for AI built plans (worker/aiplan.js via the worker): tool use with a mocked Claude, questions, clamping, dashes, privacy, limits and the spend cap.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import worker from '../worker/index.js'
import { makeEnv } from './fakes.js'
import { cleanText, cleanOutput, SYSTEM_PROMPT, aiDailyCap } from '../worker/aiplan.js'
import { generatePlan, GOALS } from '../src/lib/coach/index.js'

let env
let calls
let reply // what the mocked Claude returns as the tool input
const toolReply = (input, usage = { input_tokens: 1200, output_tokens: 400 }) => ({
  id: 'msg_1', type: 'message', role: 'assistant', stop_reason: 'tool_use', usage,
  content: [{ type: 'tool_use', id: 'tu_1', name: 'design_plan', input }],
})
const good = () => ({
  settings: { goal: '10k', raceDate: '2027-08-09', daysPerWeek: 3, runDays: ['tue', 'thu', 'sat'], longRunDay: 'sat', includeStrength: true, currentWeeklyKm: 18, longestRecentKm: 9, avoid: ['intervals'] },
  coach: {
    headline: 'City2Surf ready, knee happy',
    overview: 'Three runs a week on your days. We build slowly so your knee has time to adapt.',
    phases: [{ fromWeek: 1, toWeek: 4, focus: 'Settle in with easy running' }, { fromWeek: 5, toWeek: 12, focus: 'Hills and tempo' }],
    tips: ['Keep easy runs truly easy.', 'Hills build strength for Heartbreak Hill.'],
    safety: 'Your knee gets sore after 10 km. See a GP or physio if it lingers.',
  },
})

const NOW = Date.parse('2026-11-03T01:00:00Z')
const post = async (body, { ip = '1.2.3.4', device = null } = {}) => {
  const headers = { 'content-type': 'application/json', 'cf-connecting-ip': ip }
  if (device) headers['x-device-id'] = device
  const res = await worker.fetch(new Request('https://foothold.test/api/plan/ai', { method: 'POST', headers, body: JSON.stringify(body) }), env)
  return { status: res.status, body: await res.json() }
}
const BRIEF = "I'm training for the City2Surf in August. I can run Tuesday, Thursday and Saturday. My left knee gets sore after 10 km. I'd rather do hills than track intervals."
const CONTEXT = { weeklyKm: [12, 15, 14, 16, 18, 17, 15, 18], longestKm: 9, runCount: 22, fiveKS: 1650, predictions: { '5k': 1650, '10k': 3440 }, confidence: 'medium', currentGoal: null, formtrackLinked: true, today: '2026-11-03' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  env = { ...makeEnv(), ANTHROPIC_API_KEY: 'sk-test' }
  calls = []
  reply = good()
  vi.stubGlobal('fetch', async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) })
    return new Response(JSON.stringify(toolReply(reply)), { headers: { 'content-type': 'application/json' } })
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('AI plans', () => {
  it('shows in config only with a key, and answers 503 without one', async () => {
    const cfg = async () => (await worker.fetch(new Request('https://foothold.test/api/config'), env)).json()
    expect((await cfg()).ai).toEqual({ plans: true })
    env = makeEnv()
    expect((await cfg()).ai).toBeUndefined()
    const r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.status).toBe(503)
    expect(r.body.code).toBe('ai_off')
    expect(calls).toHaveLength(0)
  })

  it('happy path: forced tool use, checked settings the engine can build, coach words', async () => {
    const r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.status).toBe(200)
    const c = calls[0]
    expect(c.url).toBe('https://api.anthropic.com/v1/messages')
    expect(c.init.headers['x-api-key']).toBe('sk-test')
    expect(c.init.headers['anthropic-version']).toBe('2023-06-01')
    expect(c.body.model).toBe('claude-sonnet-5-5')
    expect(c.body.tool_choice).toEqual({ type: 'tool', name: 'design_plan' })
    expect(c.body.tools[0].name).toBe('design_plan')
    expect(c.body.system).toMatch(/not instructions/)
    expect(c.body.messages[0].content).toContain('<runner_brief>')
    expect(r.body.settings).toEqual(good().settings)
    expect(r.body.coach.headline).toBe('City2Surf ready, knee happy')
    expect(r.body.model).toBe('claude-sonnet-5-5')
    const plan = generatePlan({ ...r.body.settings, today: '2026-11-03' })
    expect(plan.weeks.length).toBeGreaterThan(4)
    // Usage is recorded with no text
    const rows = env.DB.db.prepare('SELECT * FROM ai_usage').all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ day: '2026-11-03', feature: 'plan', tokens_in: 1200, tokens_out: 400 })
    expect(rows[0].cost_aud).toBeGreaterThan(0)
    expect(JSON.stringify(rows)).not.toMatch(/knee|City2Surf/)
  })

  it('uses PLAN_MODEL when set', async () => {
    env.PLAN_MODEL = 'claude-haiku-5-5'
    await post({ brief: BRIEF, context: CONTEXT })
    expect(calls[0].body.model).toBe('claude-haiku-5-5')
  })

  it('questions path: returns the questions, then sends the answers back', async () => {
    reply = { needMoreInfo: { questions: ['Which days can you run?', 'When is the race?', 'How far do you run now?', 'A fourth one'] }, coach: { headline: '', overview: '', phases: [], tips: [] } }
    const r = await post({ brief: 'I want to get fitter', context: CONTEXT })
    expect(r.status).toBe(200)
    expect(r.body.questions).toHaveLength(3)
    expect(r.body.settings).toBeUndefined()
    reply = good()
    const r2 = await post({ brief: 'I want to get fitter', context: CONTEXT, answers: [{ q: 'Which days can you run?', a: 'Tue, Thu and Sat' }] })
    expect(r2.status).toBe(200)
    expect(r2.body.settings.goal).toBe('10k')
    expect(calls[1].body.messages[0].content).toContain('A: Tue, Thu and Sat')
  })

  it('rejects an unknown goal and output with no tool call', async () => {
    reply = { ...good(), settings: { ...good().settings, goal: 'ultra' } }
    let r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.status).toBe(502)
    expect(r.body.code).toBe('bad_output')
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'Here is a plan' }], usage: {} })))
    r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.status).toBe(502)
  })

  it('clamps and repairs bad settings', async () => {
    reply = {
      settings: { goal: 'half', raceDate: '2026-10-01', daysPerWeek: 11, runDays: ['mon', 'funday', 'wed', 'wed', 'fri'], longRunDay: 'sun', includeStrength: 'yes', currentWeeklyKm: 900, longestRecentKm: -4, avoid: ['intervals', 'swimming'] },
      coach: { headline: 'x'.repeat(200), overview: 'o '.repeat(500), phases: [{ fromWeek: 9, toWeek: 3, focus: 'Back to front' }, { fromWeek: 'a', toWeek: 2, focus: 'bad' }, ...Array.from({ length: 10 }, (_, i) => ({ fromWeek: i + 1, toWeek: i + 1, focus: 'f' }))], tips: ['a', 'b', 'c', 'd', 'e', 'f'] },
    }
    const r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.status).toBe(200)
    const s = r.body.settings
    expect(s.raceDate).toBeUndefined() // in the past
    expect(s.runDays).toEqual(['mon', 'wed', 'fri'])
    expect(s.daysPerWeek).toBe(3) // matches the days
    expect(s.longRunDay).toBe('fri') // sun wasn't one of them
    expect(s.includeStrength).toBe(false)
    expect(s.currentWeeklyKm).toBe(200)
    expect(s.longestRecentKm).toBe(0)
    expect(s.avoid).toEqual(['intervals'])
    const c = r.body.coach
    expect(c.headline.length).toBeLessThanOrEqual(80)
    expect(c.overview.length).toBeLessThanOrEqual(600)
    expect(c.phases.length).toBeLessThanOrEqual(8)
    expect(c.phases[0]).toEqual({ fromWeek: 1, toWeek: 1, focus: 'f' })
    expect(c.phases.find((p) => p.focus === 'Back to front')).toMatchObject({ fromWeek: 3, toWeek: 9 })
    expect(c.tips).toHaveLength(4)
    // A far future date is dropped too, a good one kept
    expect(cleanOutput({ settings: { ...good().settings, raceDate: '2029-01-01' }, coach: {} }, { today: '2026-11-03' }).settings.raceDate).toBeUndefined()
    expect(cleanOutput({ settings: { ...good().settings, raceDate: '2027-02-30' }, coach: {} }, { today: '2026-11-03' }).settings.raceDate).toBeUndefined()
    expect(cleanOutput({ settings: { ...good().settings, goal: 'base', raceDate: '2027-03-01' }, coach: {} }, { today: '2026-11-03' }).settings.raceDate).toBeUndefined()
    for (const g of GOALS) expect(() => generatePlan({ ...cleanOutput({ settings: { ...good().settings, goal: g }, coach: {} }, { today: '2026-11-03' }).settings, today: '2026-11-03' })).not.toThrow()
  })

  it('leaves no em dashes, en dashes or double hyphens in any model text', async () => {
    reply = {
      settings: good().settings,
      coach: {
        headline: 'Steady — then strong',
        overview: 'Build slowly – your knee will thank you -- trust it.',
        phases: [{ fromWeek: 1, toWeek: 2, focus: 'Easy—easy' }],
        tips: ['Run tall — relax', 'Stay easy--honestly'],
        safety: 'See a GP — or a physio.',
      },
    }
    const r = await post({ brief: BRIEF, context: CONTEXT })
    const text = JSON.stringify(r.body.coach)
    expect(text).not.toMatch(/[‒-―]|--/)
    expect(r.body.coach.headline).toBe('Steady, then strong')
    expect(r.body.coach.tips[1]).toBe('Stay easy, honestly')
    expect(cleanText('Well-paced run', 80)).toBe('Well-paced run') // single hyphens stay
  })

  it('adds a safety line when the runner mentions their health and the model did not', async () => {
    reply = { ...good(), coach: { ...good().coach, safety: undefined } }
    const r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.body.coach.safety).toMatch(/GP or physio/)
    const r2 = await post({ brief: 'I want to run a 10K in March, three days a week.', context: CONTEXT })
    expect(r2.body.coach.safety).toBeUndefined()
  })

  it('sends only the summary fields: no names, emails, places or tracks', async () => {
    const leaky = { ...CONTEXT, name: 'Michael Test', email: 'm@example.com', homeCentre: { lat: -33.75, lng: 150.69 }, track: [[-33.7, 150.6]], weeklyKm: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
    await post({ brief: BRIEF, context: leaky }, { device: 'device-aaaa-aaaa-aaaa-0001' })
    const sent = JSON.stringify(calls[0].body.messages)
    for (const s of ['Michael Test', 'm@example.com', '150.69', '-33.75', 'homeCentre', 'email', '\\"name', '\\"track']) expect(sent).not.toContain(s)
    const ctx = JSON.parse(calls[0].body.messages[0].content.match(/Context \(from the app, trust this\):\n(.*)\n/)[1])
    expect(ctx.history.weeklyKm).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
    expect(Object.keys(ctx.history).sort()).toEqual(['confidence', 'fiveKS', 'formtrackLinked', 'longestKm', 'predictions', 'runCount', 'weeklyKm'])
    expect(SYSTEM_PROMPT).toMatch(/GP or physio/)
  })

  it('refuses empty or very long briefs before calling Claude', async () => {
    expect((await post({ brief: '', context: CONTEXT })).status).toBe(400)
    expect((await post({ brief: 'x'.repeat(1501), context: CONTEXT })).status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('rate limits per address (5 an hour) and per signed-in player (15 a day)', async () => {
    for (let i = 0; i < 5; i++) expect((await post({ brief: BRIEF, context: CONTEXT })).status).toBe(200)
    const r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.status).toBe(429)
    expect(r.body.code).toBe('rate_limited')
    expect(r.body.error).not.toMatch(/[–—]/)
    expect(calls).toHaveLength(5)
    // A player on many addresses still stops at 15 a day
    let last
    for (let i = 0; i < 16; i++) last = await post({ brief: BRIEF, context: CONTEXT }, { ip: `10.0.0.${i}`, device: 'device-aaaa-aaaa-aaaa-0001' })
    expect(last.status).toBe(429)
    expect(calls).toHaveLength(5 + 15)
  })

  it('stops for the day at the global spend cap', async () => {
    expect(aiDailyCap({})).toBe(10)
    env.AI_DAILY_CAP_AUD = '0.02'
    // Each call costs about 0.015 AUD at 1200 in and 400 out
    expect((await post({ brief: BRIEF, context: CONTEXT })).status).toBe(200)
    expect((await post({ brief: BRIEF, context: CONTEXT })).status).toBe(200)
    const r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.status).toBe(503)
    expect(r.body.code).toBe('ai_paused')
    expect(calls).toHaveLength(2)
  })

  it('reports a failed call plainly and logs nothing the runner wrote', async () => {
    const logs = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => logs.push(a.join(' ')))
    vi.stubGlobal('fetch', async () => new Response('{"error":"overloaded"}', { status: 529 }))
    const r = await post({ brief: BRIEF, context: CONTEXT })
    expect(r.status).toBe(502)
    expect(r.body.code).toBe('ai_failed')
    vi.stubGlobal('fetch', async () => { throw new Error('network ' + BRIEF) })
    expect((await post({ brief: BRIEF, context: CONTEXT })).status).toBe(502)
    reply = { settings: { goal: 'nope' } }
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(toolReply(reply))))
    await post({ brief: BRIEF, context: CONTEXT })
    spy.mockRestore()
    expect(logs.join('\n')).not.toMatch(/knee|City2Surf|sk-test/)
  })
})

describe('AI plans in the app', async () => {
  const { planContext, attachAi, currentPhase } = await import('../src/lib/aiPlan.js')
  const day = 86400000
  const today = '2026-11-03'
  const runs = Array.from({ length: 10 }, (_, i) => ({ startedAt: Date.parse('2026-11-02T07:00:00Z') - i * 4 * day, distanceM: 6000, movingS: 6 * 330, mode: 'run', start: { lat: -33.75, lng: 150.69 }, userId: 'me' }))

  it('builds a compact summary with no places or ids', () => {
    const c = planContext({ runs, plan: { goal: '10k' }, formtrackLinked: true, today })
    expect(c.weeklyKm).toHaveLength(8)
    expect(c.weeklyKm[7]).toBeGreaterThan(0) // newest last
    expect(c.longestKm).toBe(6)
    expect(c.currentGoal).toBe('10k')
    expect(JSON.stringify(c)).not.toMatch(/150\.69|-33\.75|"me"/)
  })

  it('attaches the coach words, trims phases to the plan and finds the current one', () => {
    const p = generatePlan({ goal: '10k', daysPerWeek: 3, longRunDay: 'sun', today })
    const n = p.weeks.length
    attachAi(p, { coach: { headline: 'H', overview: 'O', phases: [{ fromWeek: 1, toWeek: 3, focus: 'Start' }, { fromWeek: 4, toWeek: 99, focus: 'Build' }, { fromWeek: 60, toWeek: 61, focus: 'Never' }], tips: ['t'] }, model: 'claude-sonnet-5-5' })
    expect(p.ai).toMatchObject({ headline: 'H', family: 'Claude', model: 'claude-sonnet-5-5', safety: null })
    expect(p.ai.phases).toHaveLength(2)
    expect(p.ai.phases[1].toWeek).toBe(n)
    expect(currentPhase(p, p.weeks[0].startDate).focus).toBe('Start')
    expect(currentPhase(p, p.weeks[4].startDate).focus).toBe('Build')
  })
})
