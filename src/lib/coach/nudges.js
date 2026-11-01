// Kind, question style nudges (the question behaviour effect): ask, never shame, and only state the game's own facts.
import { formatPace } from './paces.js'
import { toISO, diffDays, dayName, DAY_LABEL } from './dates.js'

const DAY = 86400000
const MODE_WORD = { run: 'run', walk: 'walk', ride: 'ride' }

// Words we never put in a nudge (guilt, shame, loss framing).
export const BANNED = ['lazy', 'failed', 'fail', 'disappoint', 'guilt', 'shame', 'should have', "don't lose", 'losing everything', 'last chance', 'falling behind', 'slacking', 'excuse']

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// Friday-style deadline: the day before the window ends, said as a weekday.
function byDay(nowMs, days) {
  const d = Math.max(1, Math.min(6, Math.floor(days)))
  const iso = toISO(nowMs + d * DAY)
  return DAY_LABEL[dayName(iso)]
}

function whenLabel(nowMs, iso) {
  const n = diffDays(toISO(nowMs), iso)
  if (n <= 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n < 7) return `on ${DAY_LABEL[dayName(iso)]}`
  return `on ${DAY_LABEL[dayName(iso)]} week`
}

function sessionPhrase(s) {
  if (s.type === 'strength') return 'your strength session'
  if (s.type === 'long') return `your ${s.distanceKm} km long run`
  if (s.type === 'tempo' || s.type === 'intervals') return `your ${s.type === 'tempo' ? 'tempo' : 'interval'} session`
  if (s.type === 'recovery') return 'a gentle recovery jog'
  if (s.runWalk) return 'your run/walk'
  return s.distanceKm ? `an easy ${s.distanceKm} km` : 'your next session'
}

export function clean(text) {
  return String(text).replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim()
}

function out(n) {
  return { ...n, title: clean(n.title), body: clean(n.body), cta: n.cta ? clean(n.cta) : undefined }
}

// All nudges that apply, best first.
export function nudgesFor(ctx = {}) {
  const now = ctx.now ?? Date.now()
  const verb = MODE_WORD[ctx.mode] || 'run'
  const list = []
  const fading = ctx.fadingSoon ?? 0
  const fadeDays = ctx.fadingDays ?? null
  const since = ctx.daysSinceLast
  const battles = Array.isArray(ctx.battles) ? ctx.battles : []
  const next = ctx.nextSession || null
  const load = ctx.loadLevel || 'ok'
  const streak = ctx.streakWeeks ?? 0
  const suburb = ctx.suburb || ctx.lapsedSuburb || null
  const wildAgain = ctx.wildAgain ?? ctx.lostToWild ?? 0

  // Safety first: if the week is already big, the only nudge is to keep it easy.
  if (load === 'high') {
    list.push({ id: 'load-high', priority: 95, title: 'Will you make the next one an easy one?', body: "You've done a lot this week compared with usual. A short loop or a rest day keeps your legs happy and your ground stays yours.", cta: 'Plan a short loop' })
  } else if (load === 'caution') {
    list.push({ id: 'load-caution', priority: 70, title: 'Could today be a gentle one?', body: "You're a bit above your usual week. Easy kilometres still take ground.", cta: 'Find an easy loop' })
  }

  // First time: invite, no pressure.
  if (ctx.firstTime) {
    list.push({ id: 'first', priority: 80, title: `Where will you plant your first foothold?`, body: `Close a loop on your next ${verb} and every hex inside it becomes yours. Any size counts.`, cta: 'Show me how' })
  }

  // Lapsed: welcome back, plain facts, no guilt.
  if (since != null && since >= 21 && !ctx.firstTime) {
    const where = suburb ? `in ${suburb}` : 'around your area'
    const title = wildAgain > 0 || suburb ? `Your old ground ${where} is wild again. Reclaim it this week?` : 'Fancy a gentle loop this week?'
    list.push({ id: 'comeback', priority: load === 'ok' ? 75 : 40, title, body: `It's been a little while, and that's fine. A short easy ${verb} is a great way back. ${wildAgain > 0 ? `There are ${plural(wildAgain, 'hex', 'hexes')} up for grabs.` : ''}`, cta: 'Suggest a short loop' })
  } else if (since != null && since >= 8 && !ctx.firstTime) {
    list.push({ id: 'gentle-return', priority: 50, title: `Will you get out for a short ${verb} before ${byDay(now, 3)}?`, body: 'Even 20 minutes keeps your ground ticking over.', cta: 'Pick a loop' })
  }

  // Fading ground: game fact, framed as a choice.
  if (fading > 0 && load !== 'high') {
    const d = fadeDays != null ? Math.max(1, Math.ceil(fadeDays)) : null
    const title = d && d <= 6 ? `Will you ${verb} past your ground before ${byDay(now, d)}?` : `Will you visit your fading hexes this week?`
    list.push({ id: 'fading', priority: d && d <= 2 ? 72 : 60, title, body: `${plural(fading, 'hex', 'hexes')} ${fading === 1 ? 'is' : 'are'} getting faint${d ? ` and go wild in about ${plural(d, 'day')}` : ''}. One loop through them tops them back up.`, cta: 'Show a loop through them' })
  }

  // Battles: competitive but friendly.
  const live = battles.filter((b) => (b.endsInDays ?? 1) > 0)
  if (live.length && load !== 'high') {
    const b = [...live].sort((x, y) => (x.endsInDays ?? 9) - (y.endsInDays ?? 9))[0]
    const us = b.us ?? 0, them = b.them ?? 0
    const ends = b.endsInDays != null ? (b.endsInDays <= 1 ? 'ends tomorrow' : `has ${plural(Math.ceil(b.endsInDays), 'day')} to go`) : 'is still on'
    const leading = b.mine ?? us > them
    const title = leading
      ? `Can you hold your lead over ${b.rival}?`
      : us === them ? `Who will break the tie with ${b.rival}, you?` : `Will you take a few hexes back from ${b.rival}?`
    list.push({ id: 'battle', priority: b.endsInDays != null && b.endsInDays <= 2 ? 78 : 62, title, body: `It's ${us} to ${them} and the battle ${ends}.`, cta: 'See the battle' })
  }

  // Next planned session.
  if (next && load !== 'high') {
    const when = whenLabel(now, next.date)
    const pace = next.paceRange && next.type !== 'strength' ? ` Around ${formatPace(next.paceRange[0])} to ${formatPace(next.paceRange[1])} per km.` : ''
    const title = next.type === 'strength' ? `Will you fit in your strength session ${when}?` : `Are you up for ${sessionPhrase(next)} ${when}?`
    const extra = next.territory ? ' We can suggest a loop that takes new ground.' : next.formtrack ? ' It lives in FormTrack.' : ''
    list.push({ id: 'session', priority: when === 'today' ? 65 : 45, title, body: `${next.title}.${pace}${extra}`, cta: next.formtrack ? 'Open FormTrack' : 'View session' })
  }

  // Streaks: celebrate, ask about the next one.
  if (streak >= 2 && (since == null || since < 8)) {
    list.push({ id: 'streak', priority: 35, title: `Will you make it ${streak + 1} weeks in a row?`, body: `${streak} weeks straight of getting out there. Any ${verb} this week keeps it going.`, cta: 'Plan this week' })
  }

  return list.map(out).sort((a, b) => b.priority - a.priority)
}

// The single best nudge right now, or null when there's nothing worth saying.
export function nudgeFor(ctx = {}) {
  const all = nudgesFor(ctx)
  return all[0] || null
}

// The regret test: would someone feel bad reading this? Used in tests and as a guard for new copy.
export function passesRegretTest(n) {
  if (!n) return true
  const text = `${n.title} ${n.body} ${n.cta || ''}`.toLowerCase()
  if (/[—–]/.test(text)) return false
  if (!n.title.trim().endsWith('?')) return false
  return !BANNED.some((w) => text.includes(w))
}
