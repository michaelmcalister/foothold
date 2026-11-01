// Suggests a loop shape that captures the most ground for a target distance (no street network, so it proposes a direction and an oval to follow).
import { polygonToCells, latLngToCell } from 'h3-js'
import { offset, distance } from '../engine/geo.js'
import { RES, effortGain, currentStrength, isWild } from '../engine/territory.js'

export const HEADINGS = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west']
const ROAD_FACTOR = 1.25 // streets wind, so the drawn oval is a bit shorter than the run
const POINTS = 36

function ringLength(ring) {
  let d = 0
  for (let i = 1; i < ring.length; i++) d += distance({ lng: ring[i - 1][0], lat: ring[i - 1][1] }, { lng: ring[i][0], lat: ring[i][1] })
  return d
}

// An oval that starts and ends at `start`, stretched along the heading (degrees clockwise from north).
export function loopRing(start, perimeterM, headingDeg, { aspect = 1.6, points = POINTS } = {}) {
  const shape = (a, b) => {
    const th = (headingDeg * Math.PI) / 180
    const ux = Math.sin(th), uy = Math.cos(th) // along the heading (east, north)
    const vx = Math.cos(th), vy = -Math.sin(th) // across it
    const ring = []
    for (let k = 0; k <= points; k++) {
      const t = Math.PI + (2 * Math.PI * k) / points // t = PI is the start point, at the near end
      const along = a + a * Math.cos(t)
      const across = b * Math.sin(t)
      const p = offset(start, along * ux + across * vx, along * uy + across * vy)
      ring.push([p.lng, p.lat])
    }
    ring[ring.length - 1] = ring[0].slice()
    return ring
  }
  // Ramanujan's ellipse perimeter for the first guess, then correct for the projection.
  const h = Math.pow((aspect - 1) / (aspect + 1), 2)
  const unit = Math.PI * (aspect + 1) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  let b = perimeterM / unit
  let ring = shape(aspect * b, b)
  const got = ringLength(ring)
  if (got > 0) { b *= perimeterM / got; ring = shape(aspect * b, b) }
  return ring
}

// What a loop would take, given the current map.
export function scoreRing(ring, { cells = new Map(), me, now = Date.now(), gain }) {
  const set = new Set(polygonToCells(ring.map(([lng, lat]) => [lat, lng]), RES))
  for (const [lng, lat] of ring) set.add(latLngToCell(lat, lng, RES))
  const out = { wild: 0, rival: 0, mine: 0, rivalHeld: 0 }
  const owners = new Map()
  for (const h of set) {
    const c = cells.get(h)
    if (!c || isWild(c, now)) { out.wild++; continue }
    if (c.owner === me) { out.mine++; continue }
    if (gain >= currentStrength(c, now)) {
      out.rival++
      owners.set(c.owner, (owners.get(c.owner) || 0) + 1)
    } else out.rivalHeld++ // too strong to take this time; it only weakens
  }
  // New ground counts most; your own still gets a little for keeping it strong.
  const score = out.wild * 1 + out.rival * 1.4 + out.rivalHeld * 0.3 + out.mine * 0.1
  return { ...out, total: set.size, owners, score }
}

function ownerName(id, names) {
  if (names && typeof names.get === 'function') return names.get(id) || id
  if (names && names[id]) return names[id]
  return id
}

function noteFor(heading, est, owners, names) {
  const bits = []
  if (est.wild) bits.push(`${est.wild} wild hex${est.wild === 1 ? '' : 'es'}`)
  const top = [...owners.entries()].sort((a, b) => b[1] - a[1])
  if (top.length === 1) bits.push(`${top[0][1]} of ${ownerName(top[0][0], names)}'s`)
  else if (top.length > 1) bits.push(`${est.rival} from ${top.length} rivals`)
  const head = `Heading ${heading}`
  if (!bits.length) return `${head} mostly covers your own ground, which keeps it strong.`
  const list = bits.length === 2 ? `${bits[0]} and ${bits[1]}` : bits[0]
  return `${head} picks up ${list}.`
}

// start {lat,lng}, targetKm, cells Map(h3 -> cell), me (user id), names optional Map or object of id -> display name.
export function suggestLoop({ start, targetKm = 5, cells = new Map(), me = null, now = Date.now(), names = null, mode = 'run', headings = 8 } = {}) {
  if (!start || !Number.isFinite(start.lat) || !Number.isFinite(start.lng)) throw new Error('suggestLoop needs a start point')
  const km = Math.max(0.5, targetKm)
  const perimeterM = (km * 1000) / ROAD_FACTOR
  const movingS = km * 360
  const gain = effortGain({ distanceM: km * 1000, movingS, mode })
  const candidates = []
  const n = Math.max(1, Math.min(16, headings))
  for (let i = 0; i < n; i++) {
    const deg = (360 / n) * i
    const ring = loopRing(start, perimeterM, deg)
    const s = scoreRing(ring, { cells, me, now, gain })
    const name = n === 8 ? HEADINGS[i] : `${Math.round(deg)} degrees`
    candidates.push({ ring, headingDeg: deg, heading: name, s })
  }
  candidates.sort((a, b) => b.s.score - a.s.score || a.headingDeg - b.headingDeg)
  const best = candidates[0]
  const rivalOwners = [...best.s.owners.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  return {
    ring: best.ring,
    heading: best.heading,
    headingDeg: best.headingDeg,
    distanceKm: Math.round(km * 10) / 10,
    estimatedHexes: { wild: best.s.wild, rival: best.s.rival, mine: best.s.mine },
    rivalTooStrong: best.s.rivalHeld,
    rivalOwners,
    gain,
    note: noteFor(best.heading, best.s, best.s.owners, names),
    alternatives: candidates.slice(1, 3).map((c) => ({ heading: c.heading, headingDeg: c.headingDeg, estimatedHexes: { wild: c.s.wild, rival: c.s.rival, mine: c.s.mine } })),
    caveat: 'This is a rough shape, not a street route. Follow the streets that roughly trace it and close the loop back at the start.',
  }
}
