// Live smoke test: run against the real site after every deploy.
//   node scripts/smoke.mjs                         checks https://foothold.com.au
//   node scripts/smoke.mjs http://localhost:8787
// Read-only. It never signs in or changes data.
const base = (process.argv[2] || process.env.SMOKE_URL || 'https://foothold.com.au').replace(/\/$/, '')
const results = []
const check = async (name, fn) => {
  const t = Date.now()
  try {
    results.push({ name, ok: true, ms: Date.now() - t, note: (await fn()) || '' })
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t, note: e.message })
  }
  results.at(-1).ms = Date.now() - t
}
const get = (path, opts = {}) => fetch(base + path, { redirect: 'manual', ...opts, signal: AbortSignal.timeout(15000) })
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

await check('Home page loads', async () => {
  const r = await get('/')
  expect(r.status === 200, `status ${r.status}`)
  expect(/<div id="app"/.test(await r.text()), 'no app root')
})
await check('App routes fall back to the app', async () => {
  const r = await get('/this-route-does-not-exist')
  expect(r.status === 200, `status ${r.status}`)
})
await check('Sign-in config', async () => {
  const r = await get('/api/config')
  expect(r.status === 200, `status ${r.status}`)
  const j = await r.json()
  expect(j.auth0?.domain && j.auth0?.clientId, 'no Auth0 settings')
})
await check('API needs sign in', async () => {
  const r = await get('/api/me')
  expect(r.status === 401, `expected 401, got ${r.status}`)
})
await check('Fast enough', async () => {
  const t = Date.now()
  await (await get('/')).text()
  const ms = Date.now() - t
  expect(ms < 3000, `home page took ${ms} ms`)
  return `${ms} ms`
})

const w = Math.max(...results.map((r) => r.name.length))
console.log(`\nFoothold smoke test: ${base}\n`)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(w)}  ${String(r.ms).padStart(5)} ms  ${r.note}`)
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed} passed, ${failed} failed\n`)
process.exit(failed ? 1 : 0)
