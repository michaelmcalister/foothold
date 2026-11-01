// Gathers what's going on in the game (fading ground, live battles, the
// plan's next session, the safe-load check) and picks today's one question.
// Questions, not orders: people who say "yes, I will" tend to follow through.

import { api } from './api/index.js'
import { store } from './store.js'
import { nudgeFor, nextSession } from './coach/index.js'

export async function nudgeContext() {
  const now = Date.now()
  const [{ live }, { activities }, { plan }] = await Promise.all([api.battles(), api.activities({ limit: 60 }), api.plan()])
  const last = activities[0]
  const load = await api.loadFor(store.mode, 0)
  return {
    now,
    mode: store.mode,
    name: store.user?.name || '',
    hexes: store.stats?.hexes || 0,
    fadingSoon: store.stats?.fadingSoon || 0,
    fadingDays: 3,
    streakWeeks: store.stats?.streakWeeks || 0,
    daysSinceLast: last ? Math.floor((now - last.startedAt) / 86400000) : null,
    battles: live.map((b) => ({
      rival: b.attacker === store.user.id ? b.defenderName : b.attackerName,
      mine: b.score.leader === store.user.id,
      us: b.attacker === store.user.id ? b.score.attacker : b.score.defender,
      them: b.attacker === store.user.id ? b.score.defender : b.score.attacker,
      endsInDays: Math.max(0, Math.ceil((b.endsAt - now) / 86400000)),
    })),
    nextSession: plan ? nextSession(plan, new Date(now).toISOString().slice(0, 10)) : null,
    loadLevel: load?.level || 'ok',
    firstTime: activities.length === 0,
  }
}

export async function todaysNudge() {
  const ctx = await nudgeContext()
  try {
    const n = nudgeFor(ctx)
    if (n) return n
  } catch { /* fall through to the default */ }
  if (ctx.firstTime) {
    return { title: 'Ready for your first loop?', body: 'Head out, wind around a few blocks and finish where you started. Everything inside is yours.' }
  }
  return { title: `Will you get out for a ${store.mode} today?`, body: 'Every loop builds your ground and pushes into new streets.' }
}
