// Hot spots: how hard each hex is being fought over. A hex heats up each
// time it changes hands and cools off after 30 quiet days. Nearby hexes are
// grouped into areas (H3 resolution 8, about 0.7 km²) for the hottest list.

import { cellToParent, cellToLatLng } from 'h3-js'
import { distance } from './geo.js'

const DAY = 86400000
export const HOT_DAYS = 30
export const AREA_RES = 8

/** Recent flips for a hex: flips in its latest run of fighting, or 0 once 30 days pass without one */
export function heatOf(cell, now = Date.now()) {
  if (!cell?.lastFlip || now - cell.lastFlip > HOT_DAYS * DAY) return 0
  return cell.recentFlips || cell.flips || 0
}

/** The next flip counters for a hex that has just changed hands */
export function flipped(prev, now = Date.now()) {
  const warm = prev?.lastFlip && now - prev.lastFlip <= HOT_DAYS * DAY
  return { flips: (prev?.flips || 0) + 1, lastFlip: now, recentFlips: (warm ? prev.recentFlips || 0 : 0) + 1 }
}

const DIRS = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west']
function direction(from, to) {
  const dy = to.lat - from.lat
  const dx = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180)
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI
  return DIRS[Math.round(((deg + 360) % 360) / 45) % 8]
}

/** Where an area is from you, in plain words */
export function whereFrom(from, to) {
  const d = distance(from, to)
  if (d < 300) return 'Right around you'
  const far = d < 1000 ? `${Math.round(d / 100) * 100} m` : `${(d / 1000).toFixed(1)} km`
  return `${far} ${direction(from, to)}`
}

/**
 * The hottest areas among some cells (the API Cell shape, with heat).
 * Returns up to `limit` areas: { h3, heat, hexes, lat, lng, distanceM, where }.
 */
export function hotAreas(cells, centre, { limit = 3 } = {}) {
  const areas = new Map()
  for (const c of cells) {
    if (!c.heat) continue
    const id = cellToParent(c.h3, AREA_RES)
    const a = areas.get(id) || { h3: id, heat: 0, hexes: 0 }
    a.heat += c.heat
    a.hexes++
    areas.set(id, a)
  }
  return [...areas.values()]
    .map((a) => {
      const [lat, lng] = cellToLatLng(a.h3)
      return { ...a, lat, lng, distanceM: Math.round(distance(centre, { lat, lng })), where: whereFrom(centre, { lat, lng }) }
    })
    .sort((a, b) => b.heat - a.heat || a.distanceM - b.distanceM)
    .slice(0, limit)
}
