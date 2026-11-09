// Prints the Worker version id serving most production traffic right now,
// so the deploy can roll back to exactly that version if the smoke test
// fails. Prints nothing (rollback then goes to the previous version) when it
// can't tell, for example on the very first deploy.
import { execFileSync } from 'node:child_process'

try {
  const out = execFileSync('npx', ['wrangler', 'deployments', 'status', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, WRANGLER_LOG: 'error' },
  })
  const status = JSON.parse(out.slice(out.indexOf('{')))
  const versions = status.versions || status.deployment?.versions || []
  const top = [...versions].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))[0]
  const id = top?.version_id || top?.versionId || ''
  if (/^[0-9a-f-]{36}$/i.test(id)) console.log(id)
} catch {
  // first deploy, or Cloudflare unreachable: leave it to `wrangler rollback`
}
