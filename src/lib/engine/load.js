// Training load guardrail. Compares a planned or finished week with the
// runner's usual week (the average of the four before it) so the game
// never quietly pushes someone into an overuse injury.

const DAY = 86400000
const WEEK = 7 * DAY

export function weeklyKm(activities, now = Date.now(), weeks = 5, mode = null) {
  const out = new Array(weeks).fill(0)
  for (const a of activities) {
    if (mode && a.mode !== mode) continue
    const age = now - a.startedAt
    const w = Math.floor(age / WEEK)
    if (w >= 0 && w < weeks) out[w] += (a.distanceM || 0) / 1000
  }
  return out.map((k) => Math.round(k * 10) / 10) // [thisWeek, lastWeek, ...]
}

// ratio > 1.3 is the classic "too much, too soon" zone.
export function loadCheck(activities, plannedKm = 0, now = Date.now(), mode = null) {
  const wk = weeklyKm(activities, now, 5, mode)
  const thisWeek = wk[0] + plannedKm
  const prior = wk.slice(1)
  const usual = prior.reduce((s, k) => s + k, 0) / prior.length
  if (usual < 3) {
    // New or returning: cap by a gentle absolute amount instead.
    const cap = Math.max(8, usual * 1.5 + 5)
    return { usualKm: Math.round(usual * 10) / 10, thisWeekKm: thisWeek, ratio: null, level: thisWeek > cap ? 'high' : 'ok', capKm: Math.round(cap) }
  }
  const ratio = thisWeek / usual
  const level = ratio > 1.5 ? 'high' : ratio > 1.3 ? 'caution' : 'ok'
  return { usualKm: Math.round(usual * 10) / 10, thisWeekKm: Math.round(thisWeek * 10) / 10, ratio: Math.round(ratio * 100) / 100, level, capKm: Math.round(usual * 1.3) }
}

export function loadMessage(check) {
  if (check.level === 'ok') return null
  const over = check.ratio ? Math.round((check.ratio - 1) * 100) : null
  if (check.level === 'high') {
    return over != null
      ? `This would put your week ${over}% above usual. Want a shorter loop that still takes ground?`
      : `That's a big week for where you're at. Want a shorter loop that still takes ground?`
  }
  return `You're ${over}% above your usual week. Will you keep today easy?`
}
