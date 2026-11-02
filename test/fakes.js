// Test helpers: a D1 lookalike on Node's SQLite with every migration applied, a fake request caller and a rectangular run.
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker from '../worker/index.js'
import { offset } from '../src/lib/engine/index.js'

export const ORIGIN = { lat: -33.9, lng: 151.15 }

export function fakeD1() {
  const db = new DatabaseSync(':memory:')
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  const stmt = (sql, args = []) => ({
    bind: (...a) => {
      if (a.some((v) => v === undefined)) throw new Error('D1_TYPE_ERROR: undefined bound')
      return stmt(sql, a)
    },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args), success: true }),
    run: async () => {
      const r = db.prepare(sql).run(...args)
      return { success: true, meta: { changes: Number(r.changes) } }
    },
    _exec: () => db.prepare(sql).run(...args),
  })
  return {
    db,
    prepare: (sql) => stmt(sql),
    batch: async (list) => {
      db.exec('BEGIN')
      try {
        const out = list.map((s) => s._exec())
        db.exec('COMMIT')
        return out.map((r) => ({ success: true, meta: { changes: Number(r.changes) } }))
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
}

export function makeEnv() {
  return { DB: fakeD1(), ALLOW_DEVICE_IDS: '1', TOKEN_KEY: 'test-key-123', APP_URL: 'https://foothold.test', ASSETS: { fetch: async () => new Response('app') } }
}

export const caller = (getEnv) => async (device, method, path, body) => {
  const headers = { 'content-type': 'application/json' }
  if (device) headers['x-device-id'] = device
  const res = await worker.fetch(new Request('https://foothold.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), getEnv())
  return { status: res.status, body: await res.json() }
}

/** A rectangular loop of w x h metres, one point a second */
export function rectRun({ w = 600, h = 400, kmh = 11, start = ORIGIN, t0 = Date.now() - 3 * 3600000 } = {}) {
  const corners = [[0, 0], [w, 0], [w, h], [0, h], [0, 0]]
  const mps = kmh / 3.6
  const pts = []
  let t = t0
  for (let c = 0; c < corners.length - 1; c++) {
    const [x0, y0] = corners[c]
    const [x1, y1] = corners[c + 1]
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / mps))
    for (let k = 0; k < n; k++) {
      const f = k / n
      pts.push({ ...offset(start, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f), t })
      t += 1000
    }
  }
  pts.push({ ...offset(start, 0, 0), t })
  return pts
}
