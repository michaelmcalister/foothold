// The territory rules. The map is H3 hexes at resolution 10 (about 130 m
// across, a suburban block). Closing a loop claims every hex inside it.
// Each hex has a strength: effort and repeat visits build it, time away
// fades it, and a rival only takes it with a claim stronger than what's there.

import { polygonToCells, latLngToCell, cellToLatLng, cellsToMultiPolygon } from 'h3-js'
import { flipped } from './hotspots.js'

export const RES = 10
export const MAX_STRENGTH = 100
export const WILD_BELOW = 5 // faded under this, the hex is wild again
export const FADE_GRACE_DAYS = 14 // no fading for two weeks
export const FADE_HALF_LIFE_DAYS = 21 // then it halves every three weeks
export const MODES = ['run', 'walk', 'ride']

const DAY = 86400000

// How much a single activity is worth per hex, from 8 (short stroll) to 60.
export function effortGain({ distanceM = 0, movingS = 0, mode = 'run' }) {
  const km = distanceM / 1000
  const perKm = { run: 1, walk: 0.85, ride: 0.35 }[mode] ?? 1
  const effKm = km * perKm
  // Long efforts count for more, with diminishing returns.
  const minutesBonus = Math.min(10, (movingS / 60) / 12)
  return Math.round(Math.max(8, Math.min(60, 8 + 9 * Math.sqrt(effKm) + minutesBonus)))
}

// A hex's strength right now, after fading.
export function currentStrength(cell, now = Date.now()) {
  if (!cell || !cell.owner) return 0
  const idleDays = (now - (cell.lastVisit ?? cell.claimedAt ?? now)) / DAY
  if (idleDays <= FADE_GRACE_DAYS) return cell.strength
  const f = Math.pow(0.5, (idleDays - FADE_GRACE_DAYS) / FADE_HALF_LIFE_DAYS)
  const s = cell.strength * f
  return s < WILD_BELOW ? 0 : s
}

export function isWild(cell, now = Date.now()) {
  return !cell || !cell.owner || currentStrength(cell, now) === 0
}

// Days until this hex fades to wild if nobody visits.
export function daysUntilWild(cell, now = Date.now()) {
  if (isWild(cell, now)) return 0
  const idle = (now - (cell.lastVisit ?? now)) / DAY
  const needed = FADE_GRACE_DAYS + FADE_HALF_LIFE_DAYS * Math.log2(cell.strength / WILD_BELOW)
  return Math.max(0, Math.ceil(needed - idle))
}

// Hexes a set of loops covers: everything inside each ring, plus the hexes
// the loop's own line passes through.
export function cellsForLoops(loops) {
  const set = new Set()
  for (const loop of loops) {
    const latLngRing = loop.ring.map(([lng, lat]) => [lat, lng])
    for (const h of polygonToCells(latLngRing, RES)) set.add(h)
    for (const [lng, lat] of loop.ring) set.add(latLngToCell(lat, lng, RES))
  }
  return [...set]
}

// Apply one activity's claim to the map.
//   cells: Map of h3 -> { h3, owner, strength, visits, lastVisit, claimedAt,
//          flips?, lastFlip?, recentFlips? } (flips: times it changed hands)
//          for this activity's mode only (each mode is its own map)
//   targets: h3 ids from cellsForLoops
//   who: user id; gain: from effortGain
//   isPrivate(h3): optional, true for hexes in the user's own privacy zone
// Returns the diff and the updated cells (new objects; input is not mutated).
export function applyClaim(cells, targets, who, gain, { now = Date.now(), isPrivate = () => false } = {}) {
  const updated = new Map()
  const diff = { claimed: [], reinforced: [], taken: [], held: [], skipped: [] }
  for (const h3 of targets) {
    const prev = cells.get(h3)
    const cur = currentStrength(prev, now)
    const priv = isPrivate(h3)
    if (!prev || cur === 0 || !prev.owner) {
      // Wild ground: yours. Its history of changing hands stays with it.
      const hist = prev?.flips ? { flips: prev.flips, lastFlip: prev.lastFlip, recentFlips: prev.recentFlips || 0 } : {}
      updated.set(h3, { h3, owner: who, strength: gain, visits: 1, lastVisit: now, claimedAt: now, private: priv || undefined, ...hist })
      diff.claimed.push(h3)
    } else if (prev.owner === who) {
      // Your ground: stronger, with diminishing returns per visit
      const visits = (prev.visits || 1) + 1
      const add = gain / (1 + 0.15 * (visits - 1))
      updated.set(h3, { ...prev, strength: Math.min(MAX_STRENGTH, cur + add), visits, lastVisit: now })
      diff.reinforced.push(h3)
    } else if (gain >= cur) {
      // A rival's ground, and this effort beats their hold
      updated.set(h3, { h3, owner: who, strength: Math.max(10, gain - cur / 2), visits: 1, lastVisit: now, claimedAt: now, prevOwner: prev.owner, ...flipped(prev, now) })
      diff.taken.push({ h3, from: prev.owner })
    } else {
      // Not enough to take it: their hold weakens instead
      updated.set(h3, { ...prev, strength: Math.max(WILD_BELOW, cur - gain / 2) })
      diff.held.push({ h3, owner: prev.owner })
    }
  }
  return { diff, updated }
}

// Progression ladder, by hexes held in one mode.
export const LEVELS = [
  { id: 'foothold', name: 'Foothold', min: 1 },
  { id: 'outpost', name: 'Outpost', min: 60 },
  { id: 'stronghold', name: 'Stronghold', min: 250 },
  { id: 'fortress', name: 'Fortress', min: 800 },
]
export function levelFor(count) {
  let lvl = null
  for (const l of LEVELS) if (count >= l.min) lvl = l
  const next = LEVELS.find((l) => l.min > count) || null
  return { level: lvl, next, toNext: next ? next.min - count : 0 }
}

// Area of a hex at RES in km², for display ("0.42 km² held").
export const HEX_KM2 = 0.0150475

export function cellCentre(h3) {
  const [lat, lng] = cellToLatLng(h3)
  return { lat, lng }
}

// GeoJSON for drawing a set of hexes, grouped by a key (owner, state).
export function toGeoJSON(cellsByGroup) {
  const features = []
  for (const [group, ids] of Object.entries(cellsByGroup)) {
    if (!ids.length) continue
    const mp = cellsToMultiPolygon(ids, true)
    features.push({ type: 'Feature', properties: { group }, geometry: { type: 'MultiPolygon', coordinates: mp } })
  }
  return { type: 'FeatureCollection', features }
}

// Battles: taking someone's ground opens a week-long head-to-head over
// the hexes that changed hands. Whoever holds more of them at the end wins.
export const BATTLE_DAYS = 7
export function openBattles(diff, attacker, { now = Date.now(), existing = [] } = {}) {
  const byDefender = new Map()
  for (const t of diff.taken) {
    if (!byDefender.has(t.from)) byDefender.set(t.from, [])
    byDefender.get(t.from).push(t.h3)
  }
  const out = []
  for (const [defender, hexes] of byDefender) {
    const live = existing.find((b) => !b.endedAt && b.endsAt > now &&
      ((b.attacker === attacker && b.defender === defender) || (b.attacker === defender && b.defender === attacker)))
    if (live) {
      out.push({ ...live, hexes: [...new Set([...live.hexes, ...hexes])] })
    } else {
      out.push({ id: `b-${attacker}-${defender}-${now}`, attacker, defender, hexes, startedAt: now, endsAt: now + BATTLE_DAYS * DAY })
    }
  }
  return out
}

export function battleScore(battle, cells, now = Date.now()) {
  let a = 0, d = 0
  for (const h of battle.hexes) {
    const c = cells.get(h)
    if (!c || isWild(c, now)) continue
    if (c.owner === battle.attacker) a++
    else if (c.owner === battle.defender) d++
  }
  return { attacker: a, defender: d, leader: a === d ? null : a > d ? battle.attacker : battle.defender }
}
