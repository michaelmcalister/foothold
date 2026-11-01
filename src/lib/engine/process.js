// The whole pipeline for one finished activity, shared by the app (local
// mode) and the Worker (server mode) so the rules are identical.
//   raw track -> clean -> anti-cheat -> summary -> loops -> hexes -> claim

import { cleanTrack, summarise, bbox } from './geo.js'
import { checkActivity } from './anticheat.js'
import { findLoops } from './loops.js'
import { cellsForLoops, effortGain, applyClaim, openBattles } from './territory.js'
import { hexIsPrivate, publicTrack } from './privacy.js'

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
  const targets = cellsForLoops(loops)
  const gain = effortGain({ ...stats, mode })
  const { diff, updated } = applyClaim(world.cells, targets, userId, gain, {
    now,
    isPrivate: (h) => hexIsPrivate(h, world.zones),
  })
  const battles = diff.taken.length ? openBattles(diff, userId, { now, existing: world.battles || [] }) : []
  activity.loops = loops.length
  activity.gain = gain
  activity.claimed = diff.claimed.length
  activity.reinforced = diff.reinforced.length
  activity.taken = diff.taken.length
  activity.held = diff.held.length
  return { activity, loops, diff, updated, battles, track, publicTrack: publicTrack(track, world.zones) }
}
