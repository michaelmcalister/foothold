// Checks new D1 migrations before they can reach the live database.
// CI passes the migration files a pull request adds:
//   node scripts/check-migrations.mjs migrations/0039_thing.sql
// It fails when a migration drops or renames something (old app versions and
// a code rollback would break) or reuses a number already taken.
// A deliberate destructive change can pass with a line in the file:
//   -- allow-destructive: why this is safe
import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname } from 'node:path'

const files = process.argv.slice(2).filter((f) => f.endsWith('.sql'))
if (!files.length) {
  console.log('No new migrations.')
  process.exit(0)
}

const RISKY = [
  [/\bDROP\s+TABLE\b/i, 'drops a table'],
  [/\bDROP\s+COLUMN\b/i, 'drops a column'],
  [/\bRENAME\s+(COLUMN|TO)\b/i, 'renames a table or column'],
  [/\bDELETE\s+FROM\b(?![^;]*\bWHERE\b)/i, 'deletes every row in a table'],
]

const problems = []
for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const name = basename(file)
  const num = name.match(/^(\d{4})_/)?.[1]
  if (!num) problems.push(`${name}: name it NNNN_what_it_does.sql`)
  else {
    const taken = readdirSync(dirname(file)).filter((f) => f.startsWith(num + '_') && f !== name)
    if (taken.length) problems.push(`${name}: number ${num} is already used by ${taken.join(', ')}`)
  }
  if (/^\s*--\s*allow-destructive:\s*\S/m.test(raw)) continue
  const sql = raw.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [re, what] of RISKY) if (re.test(sql)) problems.push(`${name}: ${what}`)
}

if (problems.length) {
  console.error('Migration check failed:\n' + problems.map((p) => '  - ' + p).join('\n'))
  console.error('\nOnly add tables and columns. Old app versions and a code rollback still use the old shape.')
  console.error('If this change is safe on purpose, add "-- allow-destructive: <reason>" to the file.')
  process.exit(1)
}
console.log(`Migrations look safe: ${files.map((f) => basename(f)).join(', ')}`)
