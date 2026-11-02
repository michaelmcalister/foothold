// The practice map's weekly division: the practice rivals plus named practice players whose scores grow through the week, around your real score.

import { rng } from '../tracks.js'
import { CREST_IDS } from '../crests.js'
import { rankDivision, PER_HEX, PER_OUTING, MAX_OUTINGS } from '../engine/divisions.js'

export const PRACTICE_SIZE = 20

const NAMES = [
  'Aisha', 'Ben', 'Chloe', 'Daniel', 'Ella', 'Finn', 'Grace', 'Hamish', 'Isla', 'Jack', 'Kiara', 'Liam', 'Maddie', 'Noah',
  'Olivia', 'Pete', 'Quinn', 'Ruby', 'Sione', 'Tahlia', 'Uma', 'Vince', 'Willow', 'Xavier', 'Yasmin', 'Zac', 'Anh', 'Bronte',
  'Callum', 'Dev', 'Eliza', 'Georgia', 'Harvey', 'Imogen', 'Jarrah', 'Kate', 'Luca', 'Mia', 'Nikhil', 'Poppy',
]
const COLOURS = ['#2C8FD6', '#E07B22', '#B5487A', '#6E8B22', '#1A9E8F', '#8A5CD8', '#E5604D', '#D6418E', '#E8A817', '#3F7F5F']
const DAY = 86400000

// One practice player's outings this week: when each happens and the ground it gains
function outingsFor(rand, week, tier) {
  if (rand() < 0.12) return [] // a quiet week
  const n = 1 + Math.floor(rand() * (3 + Math.min(tier, 3)))
  const out = []
  for (let i = 0; i < n; i++) {
    // Some people get out on Monday morning, so the table has life from the start
    const at = i === 0 && rand() < 0.55 ? week.start + (5 + rand() * 4) * 3600000 : week.start + 7 * DAY * rand() ** 1.15
    out.push({ at, hexes: Math.round((3 + rand() * 38) * (1 + 0.2 * tier)) })
  }
  return out
}

const sumUpTo = (outings, now) => {
  const done = outings.filter((o) => o.at <= now)
  return { hexes: done.reduce((s, o) => s + o.hexes, 0), outings: done.length }
}

/**
 * The practice division table for a week, ranked.
 *   rivals: practice rivals [{ id, name, colour, crest }], real: Map id -> { hexes, outings } (their real runs this week)
 *   me: { userId, name, colour, crest, hexes, outings } (your real numbers)
 * Same week and seed, same people. Scores only count outings that have happened by now.
 */
export function practiceDivision({ week, tier = 0, seed = '', rivals = [], real = new Map(), me, now = Date.now() }) {
  const rand = rng(`division:${seed}:${week.key}`)
  const names = NAMES.slice()
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[names[i], names[j]] = [names[j], names[i]]
  }
  const people = rivals.slice(0, PRACTICE_SIZE - 1).map((r) => ({ userId: r.id, name: r.name, colour: r.colour, crest: r.crest || null }))
  for (let i = 0; people.length < PRACTICE_SIZE - 1; i++) {
    const name = names[i % names.length]
    people.push({ userId: `p-${week.key}-${i}`, name, colour: COLOURS[Math.floor(rand() * COLOURS.length)], crest: CREST_IDS[Math.floor(rand() * CREST_IDS.length)] })
  }
  const rows = people.map((p) => {
    const s = sumUpTo(outingsFor(rand, week, tier), now)
    const r = real.get(p.userId)
    const hexes = s.hexes + (r?.hexes || 0)
    const outings = s.outings + (r?.outings || 0)
    return { ...p, hexes, outings, score: hexes * PER_HEX + Math.min(outings, MAX_OUTINGS) * PER_OUTING, me: false }
  })
  const mh = me?.hexes || 0
  const mo = me?.outings || 0
  rows.push({ userId: me?.userId, name: me?.name || 'You', colour: me?.colour, crest: me?.crest || null, hexes: mh, outings: mo, score: mh * PER_HEX + Math.min(mo, MAX_OUTINGS) * PER_OUTING, me: true })
  return rankDivision(rows, tier)
}
