// Runs the smoke test against a fresh deploy, retrying a few times because
// a new version can take a few seconds to reach every Cloudflare location.
//   node scripts/smoke-retry.mjs https://formtrk.com
// Uses launch/smoke.mjs when the app has one, otherwise scripts/smoke.mjs.
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const url = process.argv[2]
if (!url) {
  console.error('Usage: node scripts/smoke-retry.mjs <url>')
  process.exit(2)
}
const script = process.env.SMOKE_SCRIPT || (existsSync('launch/smoke.mjs') ? 'launch/smoke.mjs' : 'scripts/smoke.mjs')
const tries = Number(process.env.SMOKE_TRIES || 3)
const waitMs = Number(process.env.SMOKE_WAIT_MS || 15000)

for (let i = 1; i <= tries; i++) {
  await new Promise((r) => setTimeout(r, i === 1 ? 5000 : waitMs))
  console.log(`Smoke test ${i} of ${tries}: ${url}`)
  const r = spawnSync(process.execPath, [script, url], { stdio: 'inherit' })
  if (r.status === 0) process.exit(0)
}
console.error(`Smoke test failed ${tries} times.`)
process.exit(1)
