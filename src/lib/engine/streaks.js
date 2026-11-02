// Weekly streaks with banked rest weeks: consecutive Sydney weeks with an outing, where each finished week banks a rest week that a quiet week spends instead of ending the streak.

import { weekOf, nextWeek, prevWeek, WEEK_TZ } from './weeks.js'

export const MAX_BANKED = 3
export const STREAK_MILESTONES = [4, 8, 12, 26, 52]
export const STRIP_WEEKS = 16

/**
 * The streak from a player's activities, worked out fresh every time (so
 * imported old runs simply fill in their weeks).
 *   activities: [{ startedAt, rejected? }]
 * Rules:
 *   - A week counts when it has at least one outing that wasn't rejected (any mode).
 *   - Each finished week with an outing banks one rest week, up to MAX_BANKED.
 *   - A finished week with no outing spends a banked rest week and the streak
 *     carries on (rest weeks count towards its length). With none banked, the
 *     streak ends there.
 *   - A new streak starts with nothing banked.
 *   - This week is in progress: it adds to the streak once it has an outing,
 *     and is never counted as missed.
 * Returns { current, longest, banked, maxBanked, active, thisWeek: { key, out },
 *   startKey, lastRested, milestone, nextMilestone, weeks: [{ key, state }] }
 * where weeks are the last STRIP_WEEKS weeks, oldest first, and state is one of
 * 'out' | 'rested' | 'missed' | 'now' (this week) | 'before' (before your first outing).
 */
export function weeklyStreak({ activities = [], now = Date.now(), tz = WEEK_TZ, stripWeeks = STRIP_WEEKS } = {}) {
  const thisWeek = weekOf(now, tz)
  const outWeeks = new Set()
  let first = Infinity
  for (const a of activities) {
    if (!a || a.rejected || !Number.isFinite(a.startedAt) || a.startedAt >= thisWeek.end) continue
    outWeeks.add(weekOf(a.startedAt, tz).key)
    first = Math.min(first, a.startedAt)
  }

  const states = new Map() // week key -> state, for the strip
  let current = 0
  let longest = 0
  let banked = 0
  let startKey = null
  let lastRested = false

  if (Number.isFinite(first)) {
    for (let w = weekOf(first, tz); w.key <= thisWeek.key; w = nextWeek(w, tz)) {
      const isNow = w.key === thisWeek.key
      const out = outWeeks.has(w.key)
      if (out) {
        if (!current) { banked = 0; startKey = w.key }
        current++
        if (!isNow) banked = Math.min(MAX_BANKED, banked + 1)
        states.set(w.key, isNow ? 'now' : 'out')
        lastRested = false
      } else if (isNow) {
        states.set(w.key, 'now')
      } else if (current && banked > 0) {
        banked--
        current++
        states.set(w.key, 'rested')
        lastRested = true
      } else {
        current = 0
        banked = 0
        startKey = null
        states.set(w.key, 'missed')
        lastRested = false
      }
      longest = Math.max(longest, current)
    }
  }

  const weeks = []
  let w = thisWeek
  for (let i = 0; i < stripWeeks; i++) {
    weeks.unshift({ key: w.key, state: states.get(w.key) || (w.key === thisWeek.key ? 'now' : 'before'), out: outWeeks.has(w.key) })
    w = prevWeek(w, tz)
  }

  const milestone = [...STREAK_MILESTONES].reverse().find((m) => current >= m) ?? null
  return {
    current,
    longest,
    banked,
    maxBanked: MAX_BANKED,
    active: current > 0,
    thisWeek: { key: thisWeek.key, out: outWeeks.has(thisWeek.key) },
    startKey,
    lastRested,
    milestone,
    nextMilestone: STREAK_MILESTONES.find((m) => m > current) ?? null,
    weeks,
  }
}

/**
 * A celebration worth sending, or null. Only ever positive: a milestone the
 * streak has reached (4, 8, 12, 26 or 52 weeks). `key` is unique per streak
 * and milestone, so each is sent once.
 */
export function streakMilestoneNote(streak) {
  if (!streak?.milestone || !streak.startKey) return null
  const n = streak.milestone
  const text = n >= 52
    ? 'A whole year of weeks in a row. That is something to be proud of.'
    : `${n} weeks in a row. Your ground has a regular now. Nice work.`
  return { key: `streak:${streak.startKey}:${n}`, weeks: n, text }
}

/** Short, kind words for the streak card. Never loss framed. */
export function streakLine(streak) {
  if (!streak?.active) return streak?.longest ? 'Any outing this week starts a fresh streak.' : 'Get out once this week to start a streak.'
  if (streak.lastRested && !streak.thisWeek.out) return 'Rest week used. Streak kept.'
  if (streak.thisWeek.out) return 'This week is in. Nice one.'
  return streak.banked
    ? `This week is open. You have ${streak.banked} rest ${streak.banked === 1 ? 'week' : 'weeks'} banked, so a quiet week is fine too.`
    : 'This week is open. One outing keeps it going.'
}
