// Hourly jobs: end battles whose week is up (the winner holds more of the
// contested hexes), a once-a-day "fading soon" reminder for anyone with
// hexes about to go wild, the soft reset at the start of each season, and on
// Mondays the "your week is ready" notice, and weekly divisions (worker/divisions.js).

import { battleScore, seasonFor, softenCell, needsReset } from '../src/lib/engine/index.js'
import { batched, cellsByIds, notify, players, rowToBattle, rowToCell, wildAt } from './db.js'
import { weekReadyNotices } from './weekly.js'
import { divisionCron } from './divisions.js'

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

// The season's soft reset (docs/ENGINE.md). Safe to run every hour: each hex
// records the season that softened it, and the season is marked done once
// no hexes are left. A big map is worked through over a few runs.
const RESET_PAGE = 500
const RESET_PAGES_PER_RUN = 20
export async function seasonReset(env, now = Date.now()) {
  const season = seasonFor(now)
  const done = await env.DB.prepare('SELECT season_id FROM season_resets WHERE season_id = ?').bind(season.id).first()
  if (done) return 0
  const any = await env.DB.prepare('SELECT season_id FROM season_resets LIMIT 1').first()
  if (!any) {
    // First run after this feature ships: the season under way keeps its ground as it is
    await env.DB.prepare('INSERT OR IGNORE INTO season_resets (season_id, starts_at, applied_at, cells) VALUES (?, ?, ?, 0)').bind(season.id, season.startsAt, now).run()
    return 0
  }
  let softened = 0
  for (let page = 0; page < RESET_PAGES_PER_RUN; page++) {
    const rows = (await env.DB.prepare(
      `SELECT * FROM cells WHERE wild_at > ? AND last_visit < ? AND (season_reset IS NULL OR season_reset <> ?) LIMIT ${RESET_PAGE}`,
    ).bind(now, season.startsAt, season.id).all()).results
    const stmts = []
    for (const r of rows) {
      const c = rowToCell(r)
      const soft = needsReset(c, season, now) ? softenCell(c, now) : null
      // Every row is marked, so the next page moves on even if this one didn't need softening
      stmts.push(soft
        ? env.DB.prepare('UPDATE cells SET strength = ?, wild_at = ?, season_reset = ? WHERE mode = ? AND h3 = ?').bind(soft.strength, wildAt(soft), season.id, r.mode, r.h3)
        : env.DB.prepare('UPDATE cells SET season_reset = ? WHERE mode = ? AND h3 = ?').bind(season.id, r.mode, r.h3))
      if (soft) softened++
    }
    await batched(env, stmts)
    if (rows.length < RESET_PAGE) {
      // cells counts what this last run softened; earlier runs for a big map aren't added up
      await env.DB.prepare('INSERT OR IGNORE INTO season_resets (season_id, starts_at, applied_at, cells) VALUES (?, ?, ?, ?)')
        .bind(season.id, season.startsAt, now, softened).run()
      break
    }
  }
  return softened
}

export async function runCron(env, now = Date.now()) {
  const softened = await seasonReset(env, now).catch((e) => (console.error('cron season', e?.message), 0))
  const ended = await endBattles(env, now).catch((e) => (console.error('cron battles', e?.message), 0))
  const fading = await fadingNotices(env, now).catch((e) => (console.error('cron fading', e?.message), 0))
  const weekly = await weekReadyNotices(env, now).catch((e) => (console.error('cron week', e?.message), 0))
  const divisions = await divisionCron(env, now).catch((e) => (console.error('cron divisions', e?.message), null))
  // Old rate limit windows are no use to anyone
  await env.DB.prepare('DELETE FROM rate_limits WHERE win < ?').bind(Math.floor(now / 1000) - 2 * 86400).run().catch(() => {})
  return { ended, fading, weekly, softened, divisions }
}
