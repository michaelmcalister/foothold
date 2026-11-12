// Foothold Plus: which stories need it (src/lib/plans.js is shared with the
// worker). While Plus is switched off (PREMIUM_ON unset), everything is free.
// When it's on: the first episode of every series, the Trailkeepers missions
// and the game show stay free; later episodes of a series need Plus.
// In the iPhone and Android apps nothing is sold: locked episodes say they're
// part of Plus, with no price and no link (store rules).

/** Is this mission part of Plus? Pure. */
export function needsPlus(mission) {
  if (!mission) return false
  if (!mission.episode || mission.episode <= 1) return false
  return !['trailkeepers', 'quiz'].includes(mission.saga)
}

/** Can this player run this mission now? premium is /api/config's premium (or null when off). */
export function canPlay(mission, { premium = null, plan = 'free' } = {}) {
  if (!premium?.on) return true
  return !needsPlus(mission) || plan === 'plus'
}
