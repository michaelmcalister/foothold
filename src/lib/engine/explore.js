// Fog of war: which hexes your tracks have passed through, how much of the ground
// around you that covers, and the mask that dims everywhere you haven't been yet.

import { latLngToCell, cellsToMultiPolygon } from 'h3-js'
import { RES, HEX_KM2, cellCentre } from './territory.js'
import { distance } from './geo.js'

export const EXPLORE_CAP = 20000 // most hexes the API hands back at once
export const VISIT_CAP = 5000 // most hexes one activity records
export const EXPLORE_RADIUS_M = 5000
const STEP_M = 50 // fill gaps between GPS points so a hex isn't skipped
const GAP_M = 2000 // a jump longer than this is a GPS gap, not a route

/** Every res-10 hex a track passes through, in the order first reached */
export function visitedCells(track) {
  const seen = new Set()
  let prev = null
  for (const p of track || []) {
    if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) continue
    if (prev) {
      const d = distance(prev, p)
      if (d > STEP_M && d < GAP_M) {
        const n = Math.ceil(d / STEP_M)
        for (let k = 1; k < n; k++) {
          const f = k / n
          seen.add(latLngToCell(prev.lat + (p.lat - prev.lat) * f, prev.lng + (p.lng - prev.lng) * f, RES))
        }
      }
    }
    seen.add(latLngToCell(p.lat, p.lng, RES))
    prev = p
    if (seen.size >= VISIT_CAP) break
  }
  return [...seen].slice(0, VISIT_CAP)
}

/**
 * Merge visited lists into one explored set, newest first.
 *   visits: [{ at, mode, cells: h3[] }]
 * Returns { cells: h3[] (capped), total, capped }
 */
export function mergeExplored(visits, { mode = null, cap = EXPLORE_CAP } = {}) {
  const seen = new Set()
  const sorted = [...visits].filter((v) => !mode || v.mode === mode).sort((a, b) => b.at - a.at)
  for (const v of sorted) for (const h of v.cells || []) seen.add(h)
  const all = [...seen]
  return { cells: all.slice(0, cap), total: all.length, capped: all.length > cap }
}

/** Share of the ground within radiusM of a centre you've explored: { explored, total, pct } */
export function exploredShare(cells, centre, radiusM = EXPLORE_RADIUS_M) {
  const total = Math.round((Math.PI * (radiusM / 1000) ** 2) / HEX_KM2)
  let explored = 0
  for (const h of cells || []) if (distance(cellCentre(h), centre) <= radiusM) explored++
  explored = Math.min(explored, total)
  return { explored, total, pct: total ? Math.round((explored / total) * 1000) / 10 : 0 }
}

/**
 * GeoJSON that covers everything except the explored hexes, for dimming.
 * The outer box is generous so panning never shows its edge.
 */
export function fogMask(cells, centre) {
  const ids = [...new Set(cells || [])]
  const span = 1.5 // degrees, about 150 km
  const box = [
    [centre.lng - span, centre.lat - span], [centre.lng + span, centre.lat - span],
    [centre.lng + span, centre.lat + span], [centre.lng - span, centre.lat + span], [centre.lng - span, centre.lat - span],
  ]
  if (!ids.length) return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [box] } }] }
  const polys = cellsToMultiPolygon(ids, true) // [[outer, ...holes], ...] as [lng, lat]
  const features = [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [box, ...polys.map((p) => p[0])] } }]
  // Unexplored pockets inside explored ground stay dimmed too
  const pockets = polys.flatMap((p) => p.slice(1))
  if (pockets.length) features.push({ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: pockets.map((r) => [r]) } })
  return { type: 'FeatureCollection', features }
}
