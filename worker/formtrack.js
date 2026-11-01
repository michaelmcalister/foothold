// FormTrack link. A player pastes a FormTrack personal token (ftk_...) and we
// read their strength program, wellbeing and recent workouts through
// FormTrack's MCP endpoint (JSON-RPC 2.0 at {FORMTRACK_URL}/mcp/{token}),
// so the run coach can plan around leg day and a bad night's sleep.
// The token is never logged and never sent back to the app.

export const TOKEN_RE = /^ftk_[A-Za-z0-9_-]{16,128}$/

const fail = (message, status, code) => Object.assign(new Error(message), { status, code })

let rpcId = 0

/** Call one FormTrack MCP tool. Returns the parsed result, or throws an error with a status. */
export async function callTool(env, token, name, args = {}) {
  const base = String(env.FORMTRACK_URL || 'https://formtrack.com.au').replace(/\/$/, '')
  let res
  try {
    res = await fetch(`${base}/mcp/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    throw fail("We couldn't reach FormTrack just now. Try again in a minute.", 502, 'formtrack_unreachable')
  }
  if (res.status === 401 || res.status === 403) throw fail("FormTrack didn't recognise that token. Check you copied all of it, or make a new one in FormTrack.", 400, 'formtrack_token')
  if (!res.ok) throw fail("FormTrack isn't answering properly right now. Try again later.", 502, 'formtrack_error')
  const msg = await res.json().catch(() => null)
  if (!msg || msg.error) throw fail("FormTrack isn't answering properly right now. Try again later.", 502, 'formtrack_error')
  const textOut = msg.result?.content?.find?.((c) => c.type === 'text')?.text
  if (msg.result?.isError) throw fail(textOut || 'FormTrack could not share that.', 502, 'formtrack_error')
  if (textOut == null) return null
  try {
    return JSON.parse(textOut)
  } catch {
    return textOut
  }
}

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

/**
 * A 0 to 100 readiness score from the latest wearable day against the
 * fortnight before it: sleep, HRV (higher is better) and resting HR (lower
 * is better). Null when there's nothing to go on.
 */
export function readinessFrom(wellbeing) {
  const rows = (Array.isArray(wellbeing?.wearable) ? wellbeing.wearable : [])
    .map((r) => ({ day: String(r?.day || ''), sleep: num(r?.sleep_min ?? r?.sleepMin), hrv: num(r?.hrv), rhr: num(r?.resting_hr ?? r?.restingHr) }))
    .sort((a, b) => (a.day < b.day ? 1 : -1)) // newest first
  if (!rows.length) return null
  const parts = []
  const latest = (k) => rows.find((r) => r[k] != null)
  const baseline = (k, skip) => mean(rows.filter((r) => r !== skip && r[k] != null && r[k] > 0).map((r) => r[k]))

  const s = latest('sleep')
  if (s) parts.push(clamp(((s.sleep - 300) / 180) * 100)) // 5 h is 0, 8 h is 100
  const h = latest('hrv')
  const hBase = h && baseline('hrv', h)
  if (h && hBase) parts.push(clamp(50 + (h.hrv / hBase - 1) * 250)) // 20% above usual is 100
  const r = latest('rhr')
  const rBase = r && baseline('rhr', r)
  if (r && rBase) parts.push(clamp(50 - (r.rhr / rBase - 1) * 500)) // 10% below usual is 100
  return parts.length ? Math.round(mean(parts)) : null
}

// Monday of this week in Sydney, as YYYY-MM-DD
function weekStart(now = Date.now(), tz = 'Australia/Sydney') {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const dow = new Intl.DateTimeFormat('en-AU', { timeZone: tz, weekday: 'short' }).format(now)
  const back = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[dow] ?? 0
  return new Date(Date.parse(day + 'T00:00:00Z') - back * 86400000).toISOString().slice(0, 10)
}

/** { today, readiness, strengthThisWeek } from the three tool results, tolerant of anything missing */
export function mapSummary(summary, wellbeing, workouts, now = Date.now()) {
  const t = summary && typeof summary === 'object' ? summary.todaySession : null
  const today = t && typeof t === 'object'
    ? { title: String(t.title || 'Strength session'), exercises: Array.isArray(t.exercises) ? t.exercises.map(String).slice(0, 20) : [] }
    : null
  const from = weekStart(now)
  const list = Array.isArray(workouts) ? workouts : []
  const strengthThisWeek = list.filter((w) => String(w?.date || w?.started_at || '').slice(0, 10) >= from).length
  return { today, readiness: readinessFrom(wellbeing), strengthThisWeek }
}

/** Everything the app shows, in one go. Wellbeing and workouts are optional extras. */
export async function fetchSummary(env, token, now = Date.now()) {
  const summary = await callTool(env, token, 'get_summary')
  const [wellbeing, workouts] = await Promise.all([
    callTool(env, token, 'get_wellbeing').catch(() => null),
    callTool(env, token, 'list_workouts', { days: 14 }).catch(() => null),
  ])
  return mapSummary(summary, wellbeing, workouts, now)
}
