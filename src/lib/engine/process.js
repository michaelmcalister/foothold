// The whole pipeline for one finished activity, shared by the app (local
// mode) and the Worker (server mode) so the rules are identical.
//   raw track -> clean -> anti-cheat -> summary -> loops -> hexes -> claim

import { cleanTrack, summarise, bbox } from './geo.js'
import { checkActivity } from './anticheat.js'
import { findLoops } from './loops.js'
import { cellsForLoops, cellsOnLine, effortGain, applyClaim, openBattles } from './territory.js'
import { hexIsPrivate, publicTrack } from './privacy.js'

const DAY = 86400000
// The biggest loop that claims everything inside it, in km². Bigger loops
// still count, but only the streets along the line.
export const MAX_LOOP_KM2 = { run: 6, walk: 4, ride: 20 }
// Ground comes from the last fortnight. Older activities (an import of last
// year's runs) count for stats and history, not for the map.
export const LIVE_DAYS = 14

export function processActivity({ id, userId, mode = 'run', points, source = 'phone', startedAt }, world) {
  // world: { cells: Map (this mode), zones: [], battles: [], now }
  const now = world?.now ?? Date.now()
  const clean = cleanTrack(points)
  const check = checkActivity(clean, mode, { deviceSource: source })
  const track = check.cleaned
  const stats = summarise(track)
  const activity = {
    id,
    userId,
    mode,
    source,
    startedAt: startedAt ?? track[0]?.t ?? now,
    ...stats,
    start: track[0] ? { lat: track[0].lat, lng: track[0].lng } : null,
    bbox: track.length ? bbox(track) : null,
    trust: check.trust,
    flags: check.flags.map(({ type, message }) => ({ type, message })),
    rejected: check.rejected,
    rejectReason: check.reason,
  }
  if (check.rejected) {
    return { activity, loops: [], diff: null, updated: new Map(), battles: [], track, publicTrack: [] }
  }
  const loops = findLoops(track)
  activity.loops = loops.length
  const endedAt = activity.startedAt + (stats.durationS || 0) * 1000
  if (now - endedAt > LIVE_DAYS * DAY) {
    activity.flags.push({ type: 'history', message: 'This one is more than two weeks old, so it counts for your stats and history but not for ground. Ground comes from the last fortnight.' })
    return { activity, loops, diff: null, updated: new Map(), battles: [], track, publicTrack: publicTrack(track, world.zones) }
  }
  const maxM2 = (MAX_LOOP_KM2[mode] || MAX_LOOP_KM2.run) * 1e6
  const big = loops.filter((l) => l.areaM2 > maxM2)
  if (big.length) activity.flags.push({ type: 'bigloop', message: `A loop was bigger than ${maxM2 / 1e6} km², so the streets you went along count, not everything inside it.` })
  const targets = [...new Set([...cellsForLoops(loops.filter((l) => l.areaM2 <= maxM2)), ...cellsOnLine(big)])]
  const gain = effortGain({ ...stats, mode })
  const { diff, updated } = applyClaim(world.cells, targets, userId, gain, {
    now,
    isPrivate: (h) => hexIsPrivate(h, world.zones),
  })
  const battles = diff.taken.length ? openBattles(diff, userId, { now, existing: world.battles || [] }) : []
  activity.gain = gain
  activity.claimed = diff.claimed.length
  activity.reinforced = diff.reinforced.length
  activity.taken = diff.taken.length
  activity.held = diff.held.length
  return { activity, loops, diff, updated, battles, track, publicTrack: publicTrack(track, world.zones) }
}
