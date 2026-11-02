// Shared rules for private leagues and rivals: invite codes, limits, league table order and rival head-to-head sums.

export const MAX_MEMBERS = 50
export const MAX_LEAGUES = 5
export const CODE_LENGTH = 6
// No 0/O, 1/I/L: easy to read out loud or type from a screenshot
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const GAIN_DAYS = 7
export const SWAP_DAYS = 30

const DAY = 86400000

/** A fresh invite code. rand() returns 0 to 1. */
export function makeCode(rand = Math.random) {
  let s = ''
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length]
  return s
}

/** A code from what someone typed or pasted (a bare code or the whole invite link), or null */
export function normaliseCode(input) {
  const s = String(input ?? '').trim()
  const fromLink = s.match(/leagues\/join\/([A-Za-z0-9]{6})\b/)
  const raw = (fromLink ? fromLink[1] : s).replace(/[\s-]/g, '').toUpperCase()
  if (raw.length !== CODE_LENGTH) return null
  for (const c of raw) if (!CODE_ALPHABET.includes(c)) return null
  return raw
}

/** The link that opens the join screen in the app */
export function inviteLink(base, code) {
  return `${String(base).replace(/#.*$/, '').replace(/\/$/, '')}/#/app/leagues/join/${code}`
}

/** League table: most ground gained this week first, then most held */
export function rankTable(rows) {
  return rows
    .slice()
    .sort((a, b) => b.gained7d - a.gained7d || b.hexes - a.hexes || String(a.name).localeCompare(String(b.name)))
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

/** Count a member's public, live ground: held now, and gained in the last week. Privacy zone hexes are left out. */
export function groundOf(cells, userId, now = Date.now(), isLive = () => true) {
  let hexes = 0
  let gained7d = 0
  for (const c of cells) {
    if (c.owner !== userId || c.private || !isLive(c)) continue
    hexes++
    if ((c.claimedAt ?? 0) >= now - GAIN_DAYS * DAY) gained7d++
  }
  return { hexes, gained7d }
}

/**
 * Rival sums for one player.
 *   battles: [{ attacker, defender, hexes, endedAt, winner, ... }]
 *   swaps: [{ taker, loser, n, at }]
 * Returns Map otherId -> { swaps, tookFromThem, tookFromYou, record: { won, lost, draws }, live }
 */
export function rivalSums(me, battles, swaps, now = Date.now()) {
  const out = new Map()
  const get = (id) => {
    if (!out.has(id)) out.set(id, { swaps: 0, tookFromThem: 0, tookFromYou: 0, record: { won: 0, lost: 0, draws: 0 }, live: null })
    return out.get(id)
  }
  for (const b of battles) {
    const other = b.attacker === me ? b.defender : b.defender === me ? b.attacker : null
    if (!other) continue
    const r = get(other)
    r.swaps += (b.hexes || []).length
    if (b.endedAt) {
      if (b.winner === me) r.record.won++
      else if (b.winner) r.record.lost++
      else r.record.draws++
    } else if (!r.live || b.endsAt > r.live.endsAt) {
      r.live = b
    }
  }
  const since = now - SWAP_DAYS * DAY
  for (const s of swaps) {
    if (s.at < since) continue
    if (s.taker === me && s.loser !== me) get(s.loser).tookFromThem += s.n
    else if (s.loser === me && s.taker !== me) get(s.taker).tookFromYou += s.n
  }
  return out
}

/** Rivals list order: most ground swapped lately, then all time */
export function sortRivals(list) {
  return list.slice().sort((a, b) => (b.tookFromThem + b.tookFromYou) - (a.tookFromThem + a.tookFromYou) || b.swaps - a.swaps || String(a.name).localeCompare(String(b.name)))
}

/** A simple crest: their first letter on a hex in their colour */
export function crestFor(name, colour) {
  const letter = (String(name || '').trim().match(/[A-Za-z0-9]/)?.[0] || '?').toUpperCase()
  return { letter, colour: colour || '#888888' }
}
