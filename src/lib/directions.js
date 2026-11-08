// Turn by turn directions for a planned route. The server's route lookup
// (POST /api/route with steps) gives raw steps { turn, name, distanceM, at };
// this tidies them (drops "carry on straight" chatter and the stops at each
// via point), words them in plain Australian English, places each one along
// the line, and follows you during a run: a heads up before a turn, the turn
// itself, and a word if you wander off the route. Pure, unit tested.
import { makeGhost, progressAlong } from './ghost.js'

const TURN_WORDS = {
  left: 'Turn left', right: 'Turn right',
  'slight left': 'Bear left', 'slight right': 'Bear right',
  'sharp left': 'Turn sharp left', 'sharp right': 'Turn sharp right',
  'keep left': 'Keep left', 'keep right': 'Keep right',
  uturn: 'Turn around', roundabout: 'At the roundabout, take the exit',
}
const SHORT = {
  left: 'Left', right: 'Right', 'slight left': 'Bear left', 'slight right': 'Bear right',
  'sharp left': 'Sharp left', 'sharp right': 'Sharp right', 'keep left': 'Keep left', 'keep right': 'Keep right',
  uturn: 'Turn around', roundabout: 'Roundabout', depart: 'Start', arrive: 'Finish',
}

/** Spoken street names: a short "St" at the end reads as "Saint", so say it in full. */
const SUFFIX = { St: 'Street', Rd: 'Road', Av: 'Avenue', Ave: 'Avenue', Dr: 'Drive', Pde: 'Parade', Hwy: 'Highway', Cres: 'Crescent', Pl: 'Place', Cct: 'Circuit', Ln: 'Lane', Tce: 'Terrace', Cl: 'Close', Ct: 'Court', Gr: 'Grove', Bvd: 'Boulevard', Blvd: 'Boulevard' }
export function sayName(name) {
  // only the last word is a street type ("St Johns Rd" is Saint Johns Road)
  return String(name || '').trim().replace(/\b([A-Z][a-z]{1,3})\.?$/, (w, x) => SUFFIX[x] || w)
}

/**
 * Tidy raw steps: one depart, one arrive, nothing for "straight on" or the
 * via points along the way, and tiny wiggles folded into the step before.
 */
export function cleanSteps(raw = []) {
  const out = []
  for (const st of raw) {
    if (!st || !Array.isArray(st.at)) continue
    const last = out[out.length - 1]
    if (st.turn === 'depart' && out.length) { if (last) last.distanceM += st.distanceM || 0; continue } // a via point
    if (st.turn === 'arrive') continue // only the last one, added below
    if ((st.turn === 'straight' || ((st.distanceM || 0) < 12 && /slight/.test(st.turn))) && last) {
      last.distanceM += st.distanceM || 0
      continue
    }
    out.push({ turn: st.turn || 'straight', name: st.name || '', distanceM: st.distanceM || 0, at: st.at })
  }
  const arrive = [...raw].reverse().find((s) => s?.turn === 'arrive')
  if (out.length) out.push({ turn: 'arrive', name: '', distanceM: 0, at: arrive?.at || out[0].at })
  return out
}

/** The words for a step: "Turn left onto Smith Street." */
export function stepText(st, { loop = true } = {}) {
  const name = sayName(st.name)
  if (st.turn === 'depart') return name ? `Head off along ${name}.` : 'Head off along the route.'
  if (st.turn === 'arrive') return loop ? "You're back at the start. Loop closed." : "You've reached the end of the route."
  const words = TURN_WORDS[st.turn] || 'Carry on'
  if (st.turn === 'roundabout') return name ? `${words} onto ${name}.` : `${words} for the route.`
  return name ? `${words} onto ${name}.` : `${words}.`
}

/** The short form for the screen: "Left onto Smith St". */
export function stepShort(st) {
  const head = SHORT[st.turn] || 'Ahead'
  if (st.turn === 'arrive' || !st.name) return head
  return `${head} ${st.turn === 'depart' ? 'along' : 'onto'} ${st.name}`
}

/** "In 150 metres", "In 1.2 kilometres". */
export function inWords(m) {
  if (m >= 950) return `In ${(Math.round(m / 100) / 10).toString()} kilometres`
  return `In ${Math.max(10, Math.round(m / 10) * 10)} metres`
}

/**
 * Places each step along the line (metres from the start), searching
 * forward so a loop that passes its own start doesn't jump ahead.
 * Returns [{ ...step, d, text, short }].
 */
export function placeSteps(line, steps, { loop = true } = {}) {
  const g = makeGhost(line.map(([lng, lat]) => ({ lat, lng })), { paceSPerKm: 360 })
  if (!g) return []
  let idx = 0
  return cleanSteps(steps).map((st, i, all) => {
    let d
    if (st.turn === 'depart') d = 0
    else if (st.turn === 'arrive' && i === all.length - 1) d = g.totalM
    else {
      const p = progressAlong(g, { lat: st.at[1], lng: st.at[0] }, idx, { lookAheadM: 3000 })
      if (p.offM > 25 || st.turn === 'uturn') return null // on a dead end that was trimmed off
      idx = p.idx
      d = p.d
    }
    return { ...st, d: Math.round(d), text: stepText(st, { loop }), short: stepShort(st) }
  }).filter(Boolean).filter((st, i, all) => {
    // two turns a few metres apart (a kink at a corner) read as one: keep the first
    const prev = all[i - 1]
    return !(prev && st.turn !== 'arrive' && prev.turn !== 'depart' && st.d - prev.d < 15 && st.turn === prev.turn)
  })
}

export const PRE_M = 150 // the heads up
export const NOW_M = 35 // the turn
export const OFF_M = 60 // further than this from the line is off route
const OFF_AGAIN_S = 90

/**
 * Follows you along a placed route. update({ lat, lng }, elapsedS) returns
 * { say: [lines], next: { short, text, inM } | null, offM }.
 */
export function createNavigator(line, placed) {
  const g = makeGhost(line.map(([lng, lat]) => ({ lat, lng })), { paceSPerKm: 360 })
  const said = new Set() // `${i}:pre` and `${i}:now`
  let idx = 0
  let along = 0
  let offFor = 0
  let offSaidAt = -Infinity
  let wasOff = false
  return {
    update(here, elapsedS = 0) {
      const out = { say: [], next: null, offM: null }
      if (!g || !here) return out
      const p = progressAlong(g, here, idx, { lookAheadM: 500 })
      out.offM = Math.round(p.offM)
      if (p.offM <= OFF_M) {
        idx = p.idx
        along = Math.max(along, p.d)
        offFor = 0
        if (wasOff) { out.say.push("You're back on the route."); wasOff = false }
      } else {
        offFor++
        if (offFor >= 3 && elapsedS - offSaidAt > OFF_AGAIN_S) {
          out.say.push("You've left the route. The dashed line on the map will get you back.")
          offSaidAt = elapsedS
          wasOff = true
        }
      }
      // the next step ahead of you
      const i = placed.findIndex((st, j) => st.turn !== 'depart' && st.d > along - 10 && !said.has(`${j}:now`))
      if (i < 0) return out
      const st = placed[i]
      const inM = Math.max(0, st.d - along)
      out.next = { short: st.short, text: st.text, turn: st.turn, inM: Math.round(inM) }
      if (wasOff) return out // directions resume once you're back on the line
      const legM = st.d - (placed[i - 1]?.d ?? 0)
      if (inM <= NOW_M) {
        said.add(`${i}:now`)
        said.add(`${i}:pre`)
        out.say.push(st.text)
      } else if (inM <= PRE_M && legM >= 250 && !said.has(`${i}:pre`)) {
        said.add(`${i}:pre`)
        out.say.push(`${inWords(inM)}, ${st.text[0].toLowerCase()}${st.text.slice(1)}`)
      }
      return out
    },
  }
}
