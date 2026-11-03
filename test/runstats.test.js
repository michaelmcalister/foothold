// Tests for the run stats (src/lib/runStats.js), the height lookup plan
// (src/lib/elevation.js) and the server's height route (worker/elevation.js).
import { describe, it, expect } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { withDistance, sampleByDistance, smoothByDistance, paceSeries, kmSplits, heartRate, cadence, heights, runSummary } from '../src/lib/runStats.js'
import { climb, offset, summarise } from '../src/lib/engine/geo.js'
import { gridPlan, blend, MAX_NODES } from '../src/lib/elevation.js'
import { handleElevation, readBody } from '../worker/elevation.js'
import { LIMITS } from '../worker/db.js'
import { pace } from '../src/lib/format.js'

const START = { lat: -33.75, lng: 150.69 }
const T0 = Date.UTC(2026, 10, 1, 19, 0, 0)

// A straight run east: one fix every 10 m at `sPerKm`, with optional extras per fix
function straight(metres, sPerKm, extra = () => ({})) {
  const out = []
  for (let m = 0; m <= metres; m += 10) out.push({ ...offset(START, m, 0), t: T0 + m * sPerKm, ...extra(m) })
  return out
}

describe('climb', () => {
  it('ignores wobble under the threshold but counts real hills', () => {
    const wobble = Array.from({ length: 200 }, (_, i) => 30 + (i % 2 ? 1 : -1))
    expect(climb(wobble)).toEqual({ gain: 0, loss: 0 })
    expect(climb([10, 20, 30, 25, 15, 40])).toEqual({ gain: 45, loss: 15 })
  })
  it('makes summarise count climb without the noise', () => {
    const t = straight(1000, 300, (m) => ({ alt: 20 + (m / 10 % 2 ? 2.5 : 0) }))
    expect(summarise(t).elevGainM).toBe(0)
  })
})

describe('sampling and smoothing', () => {
  it('spaces samples evenly by distance and carries heights through', () => {
    const pts = withDistance(straight(2000, 300, (m) => ({ alt: m / 100 })))
    const s = sampleByDistance(pts, 21)
    expect(s).toHaveLength(21)
    expect(s[10].d).toBeCloseTo(1000, 0)
    expect(s[10].alt).toBeCloseTo(10, 0)
    expect(s[20].alt).toBeCloseTo(20, 0)
  })
  it('keeps gaps as gaps when smoothing', () => {
    const out = smoothByDistance([1, 2, null, 4, 5], [0, 10, 20, 30, 40], 25)
    expect(out[2]).toBeNull()
    expect(out[0]).toBeCloseTo(1.5)
  })
})

describe('pace and splits', () => {
  it('reads a steady pace and finds each kilometre', () => {
    const pts = withDistance(straight(2500, 330))
    const s = sampleByDistance(pts, 120)
    const p = paceSeries(s).filter(Number.isFinite)
    expect(p.length).toBeGreaterThan(100)
    for (const v of p) expect(v).toBeCloseTo(330, 0)
    const splits = kmSplits(pts)
    expect(splits.map((x) => x.partial)).toEqual([false, false, true])
    expect(splits[0].s).toBeCloseTo(330, 0)
    expect(splits[2].distM).toBe(500)
    expect(splits[2].pace).toBeCloseTo(330, 0)
  })
  it('shows a stop as a gap, not a crawl', () => {
    const t = straight(1000, 300)
    const stop = t[t.length - 1]
    for (let k = 1; k <= 30; k++) t.push({ ...stop, lat: stop.lat + k * 1e-7, t: stop.t + k * 10000 }) // 5 minutes at the lights
    const more = straight(800, 300).slice(1).map((p) => ({ ...offset(stop, (p.t - T0) / 300, 0), t: stop.t + 300000 + (p.t - T0) }))
    const pts = withDistance([...t, ...more])
    const p = paceSeries(sampleByDistance(pts, 180))
    expect(p.filter((v) => v == null).length).toBeGreaterThan(0)
    expect(Math.max(...p.filter(Number.isFinite))).toBeLessThan(1200)
  })
  it('adds the height change and heart rate to each split', () => {
    const pts = withDistance(straight(2000, 300, (m) => ({ alt: m < 1000 ? m / 20 : 50, hr: m < 1000 ? 140 : 160 })))
    const samples = sampleByDistance(pts, 100)
    const splits = kmSplits(pts, { samples, alts: samples.map((x) => x.alt) })
    expect(splits[0].elevDelta).toBe(50)
    expect(splits[1].elevDelta).toBe(0)
    expect(splits[0].hr).toBe(140)
    expect(splits[1].hr).toBe(160)
  })
})

describe('summary numbers', () => {
  it('reads heart rate, cadence, heights and the fastest km', () => {
    const pts = withDistance(straight(3000, 300, (m) => ({ hr: 150 + (m % 100 ? 0 : 10), cad: 86 })))
    expect(heartRate(pts).max).toBe(160)
    expect(cadence(pts, 'run')).toBe(172) // one foot counted, so doubled
    expect(cadence(pts, 'ride')).toBe(86)
    expect(heights([12, 18, 30, 22])).toEqual({ gain: 18, loss: 8, high: 30, low: 12 })
    const s = runSummary({ activity: { mode: 'run', movingS: 800 }, pts })
    expect(s.elapsedS).toBe(900)
    expect(s.stoppedS).toBe(100)
    expect(s.fastestKmS).toBeCloseTo(300, 0)
  })
  it('leaves out what the track cannot support', () => {
    const s = runSummary({ activity: { mode: 'run' }, pts: withDistance(straight(500, 300)) })
    expect(s.heartRate).toBeNull()
    expect(s.cadence).toBeNull()
    expect(s.heights).toBeNull()
  })
  it('rounds pace before splitting minutes and seconds', () => {
    expect(pace(359.6)).toBe('6:00')
    expect(pace(330)).toBe('5:30')
  })
})

describe('height lookup plan', () => {
  it('asks only for grid corners and blends them back', () => {
    const samples = sampleByDistance(withDistance(straight(1500, 300)), 60)
    const plan = gridPlan(samples)
    expect(plan.grid).toBe(0.001)
    expect(plan.nodes.length).toBeLessThan(samples.length)
    for (const [lat, lng] of plan.nodes) {
      expect(Math.abs(lat / 0.001 - Math.round(lat / 0.001))).toBeLessThan(1e-6)
      expect(Math.abs(lng / 0.001 - Math.round(lng / 0.001))).toBeLessThan(1e-6)
    }
    // A tilted plane comes back exactly: height = 1000 * lng offset
    const elev = plan.nodes.map(([, lng]) => (lng - 150) * 1000)
    const alts = blend(plan, elev)
    samples.forEach((s, i) => expect(alts[i]).toBeCloseTo((s.lng - 150) * 1000, 3))
    expect(readBody({ grid: plan.grid, nodes: plan.nodes }).error).toBeUndefined()
  })
  it('steps up to a coarser grid when the points spread wide', () => {
    const samples = Array.from({ length: 400 }, (_, i) => offset(START, (i % 20) * 450, Math.floor(i / 20) * 450))
    const plan = gridPlan(samples)
    expect(plan.nodes.length).toBeLessThanOrEqual(MAX_NODES)
    expect(plan.grid).toBeGreaterThan(0.001)
  })
})

// Minimal D1 stand-in for the rate limiter
function fakeDB() {
  const db = new DatabaseSync(':memory:')
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  const prep = (sql) => ({
    bind: (...a) => ({ first: async () => db.prepare(sql).get(...a) ?? null, run: async () => db.prepare(sql).run(...a), all: async () => ({ results: db.prepare(sql).all(...a) }) }),
  })
  return { prepare: prep }
}
function fakeCache() {
  const m = new Map()
  return { match: async (k) => m.get(k.url)?.clone() || null, put: async (k, r) => { m.set(k.url, r) } }
}
const post = (body, ip = '1.2.3.4') => new Request('https://x/api/elevation', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) })

describe('height route', () => {
  const nodes = Array.from({ length: 150 }, (_, i) => [-33.75, Math.round((150.6 + i * 0.001) * 1000) / 1000])

  it('refuses points off the grid, so it never sees a route', async () => {
    const env = { DB: fakeDB() }
    const r = await handleElevation(post({ grid: 0.001, nodes: [[-33.75123, 150.69]] }), env, { cache: null })
    expect(r.status).toBe(400)
    expect((await handleElevation(post({ grid: 0.01, nodes }), env, { cache: null })).status).toBe(400)
  })

  it('looks up in batches of 100, then answers repeats from the cache', async () => {
    const env = { DB: fakeDB() }
    const cache = fakeCache()
    const calls = []
    const fetcher = async (url) => {
      calls.push(url)
      const n = new URL(url).searchParams.get('latitude').split(',').length
      return new Response(JSON.stringify({ elevation: Array.from({ length: n }, (_, i) => 30 + i) }))
    }
    const r = await handleElevation(post({ grid: 0.001, nodes }), env, { fetcher, cache })
    expect(r.status).toBe(200)
    expect((await r.json()).elev).toHaveLength(150)
    expect(calls).toHaveLength(2)
    expect(calls[0]).toContain('api.open-meteo.com')
    await handleElevation(post({ grid: 0.001, nodes }), env, { fetcher, cache })
    expect(calls).toHaveLength(2)
  })

  it('limits fresh lookups per address and hides upstream details', async () => {
    const env = { DB: fakeDB(), OPEN_METEO_KEY: 'k' }
    const urls = []
    const fetcher = async (url) => { urls.push(url); return new Response(JSON.stringify({ elevation: [5] })) }
    for (let i = 0; i < LIMITS.elevation.max; i++) {
      expect((await handleElevation(post({ grid: 0.001, nodes: [[-33.75, Math.round((150 + i * 0.001) * 1000) / 1000]] }), env, { fetcher, cache: null })).status).toBe(200)
    }
    expect(urls[0]).toContain('customer-api.open-meteo.com')
    expect((await handleElevation(post({ grid: 0.001, nodes: [[-33.7, 151]] }), env, { fetcher, cache: null })).status).toBe(429)
    const bad = await handleElevation(post({ grid: 0.001, nodes: [[-33.7, 151]] }, '9.9.9.9'), env, { fetcher: async () => new Response('secret quota', { status: 429 }), cache: null })
    expect(bad.status).toBe(502)
    expect(await bad.text()).not.toContain('quota')
  })
})
