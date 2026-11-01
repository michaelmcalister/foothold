// Hourly jobs: end battles whose week is up (the winner holds more of the
// contested hexes), and a once-a-day "fading soon" reminder for anyone with
// hexes about to go wild.

import { battleScore } from '../src/lib/engine/index.js'
import { batched, cellsByIds, notify, players, rowToBattle } from './db.js'

const DAY = 86400000

// Today's date in Sydney, so the daily reminder rolls over at local midnight
export const sydneyDay = (now) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

export async function endBattles(env, now = Date.now()) {
  const rows = (await env.DB.prepare('SELECT * FROM battles WHERE ended_at IS NULL AND ends_at <= ? LIMIT 500').bind(now).all()).results
  if (!rows.length) return 0
  const battles = rows.map(rowToBattle)
  const names = await players(env, battles.flatMap((b) => [b.attacker, b.defender]))
  const name = (id) => names.get(id)?.name || 'Your rival'
  const stmts = []
  for (const b of battles) {
    const cells = await cellsByIds(env, b.mode, b.hexes)
    const sc = battleScore(b, cells, now)
    stmts.push(env.DB.prepare('UPDATE battles SET ended_at = ?, winner = ?, final_score = ? WHERE id = ? AND ended_at IS NULL')
      .bind(now, sc.leader, JSON.stringify(sc), b.id))
    const hi = Math.max(sc.attacker, sc.defender)
    const lo = Math.min(sc.attacker, sc.defender)
    for (const [me, other] of [[b.attacker, b.defender], [b.defender, b.attacker]]) {
      const text = !sc.leader
        ? `Your battle with ${name(other)} ended level, ${hi} hexes each. Will you settle it next week?`
        : sc.leader === me
          ? `You won your battle with ${name(other)}, ${hi} hexes to ${lo}. Will you push further next week?`
          : `${name(other)} won your battle, ${hi} hexes to ${lo}. Want a rematch?`
      stmts.push(notify(env, me, 'battle', text, { at: now }))
    }
  }
  await batched(env, stmts)
  return battles.length
}

const VERB = { run: 'run', walk: 'walk', ride: 'ride' }

export async function fadingNotices(env, now = Date.now()) {
  const rows = (await env.DB.prepare(
    'SELECT owner, mode, COUNT(*) AS n FROM cells WHERE wild_at > ? AND wild_at <= ? GROUP BY owner, mode',
  ).bind(now, now + 3 * DAY).all()).results
  const byUser = new Map()
  for (const r of rows) {
    const u = byUser.get(r.owner) || { n: 0, mode: r.mode, top: 0 }
    u.n += r.n
    if (r.n > u.top) { u.top = r.n; u.mode = r.mode }
    byUser.set(r.owner, u)
  }
  const day = sydneyDay(now)
  const stmts = [...byUser].map(([owner, u]) => notify(env, owner, 'fade',
    `${u.n === 1 ? 'One of your hexes goes' : `${u.n} of your hexes go`} wild in the next three days. Will you ${VERB[u.mode] || 'run'} ${u.n === 1 ? 'it' : 'them'} before then?`,
    { at: now, dayKey: day }))
  await batched(env, stmts)
  return stmts.length
}

export async function runCron(env, now = Date.now()) {
  const ended = await endBattles(env, now).catch((e) => (console.error('cron battles', e?.message), 0))
  const fading = await fadingNotices(env, now).catch((e) => (console.error('cron fading', e?.message), 0))
  // Old rate limit windows are no use to anyone
  await env.DB.prepare('DELETE FROM rate_limits WHERE win < ?').bind(Math.floor(now / 1000) - 2 * 86400).run().catch(() => {})
  return { ended, fading }
}
