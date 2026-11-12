// The story season (shared by the app and the worker): six weeks, a
// featured series each week, a community distance goal, and a finale
// episode (missions/series/gathering.js) that opens when everyone together
// reaches the goal, or on the finale weekend, whichever comes first.
// Featured series are a spotlight, not a lock: every series stays open.

const DAY = 86400000

export const STORY_SEASON = {
  id: 'summer-2026',
  title: 'The Summer of Stories',
  // Monday 16 November 2026, midnight in Sydney
  startsAt: Date.parse('2026-11-15T13:00:00Z'),
  weeks: 6,
  goalKm: 1000, // overridden by SEASON_GOAL_KM on the server
  featured: ['tiger', 'catalpa', 'minmin', 'tunnels', 'panther', 'nugget'],
  finaleMission: 'gathering-finale',
}

/** Where the season is at a moment. Pure. */
export function seasonState(now, season = STORY_SEASON) {
  const end = season.startsAt + season.weeks * 7 * DAY
  const finaleWeekend = end - 2 * DAY // the last Saturday and Sunday
  const week = Math.floor((now - season.startsAt) / (7 * DAY)) + 1
  return {
    started: now >= season.startsAt,
    over: now >= end,
    week: Math.max(0, Math.min(season.weeks, week)),
    featured: week >= 1 && week <= season.weeks ? season.featured[week - 1] : null,
    endsAt: end,
    finaleWeekendAt: finaleWeekend,
    finaleByDate: now >= finaleWeekend,
  }
}

/** Is the finale open? reached: the community hit the goal. */
export const finaleOpen = (now, reached, season = STORY_SEASON) => reached || seasonState(now, season).finaleByDate
