// King of the hill on the practice map (local.js): hills kept on this device,
// two seeded climbs held by practice rivals near the practice area so the
// feature shows from day one, climbs found after a practice save (terrain
// heights through src/lib/elevation.js), the board, and rivals who now and
// then go faster up a hill you hold. Same shapes as the server (docs/API.md).
// `S` is local.js state with `hills` and `hillEfforts` arrays.

import { offset } from '../engine/geo.js'
import { detectHills, hillBoard, holderOf, holderAfter, hillTakenText, inSentence } from '../engine/hills.js'
import { withDistance, sampleByDistance } from '../runStats.js'
import { elevationFor } from '../elevation.js'

const DAY = 86400000
export const PRACTICE_HILL = 'practice-hill-'

// A seeded climb: a gentle bend `lengthM` long from `start` towards `bearing`
// (degrees from north), rising `gainM` with a steeper middle.
function seedHill(id, name, start, bearing, lengthM, gainM, createdAt) {
  const n = 24
  const line = []
  const profile = []
  const b = (bearing * Math.PI) / 180
  for (let k = 0; k <= n; k++) {
    const f = k / n
    const along = f * lengthM
    const bend = Math.sin(f * Math.PI) * lengthM * 0.08
    const p = offset(start, Math.sin(b) * along + Math.cos(b) * bend, Math.cos(b) * along - Math.sin(b) * bend)
    line.push([Math.round(p.lng * 1e6) / 1e6, Math.round(p.lat * 1e6) / 1e6])
    profile.push([Math.round(along), Math.round((40 + gainM * (f - Math.sin(2 * Math.PI * f) / (2 * Math.PI))) * 10) / 10])
  }
  const end = { lat: line[n][1], lng: line[n][0] }
  return {
    id, key: `practice:${id}`, name, mode: 'run', line, profile, gainM, lengthM, grade: Math.round((gainM / lengthM) * 1000) / 1000,
    start: { lat: line[0][1], lng: line[0][0] }, end, createdAt, practice: true,
  }
}

/** Two practice hills near the practice area, held by Sam and Priya. Keeps your own hills. */
export function seedPracticeHills(S, centre, now = Date.now()) {
  const at = now - 9 * DAY
  const hills = [
    seedHill(`${PRACTICE_HILL}1`, 'The 34 m climb', offset(centre, -650, 250), 35, 420, 34, at),
    seedHill(`${PRACTICE_HILL}2`, 'The 27 m climb', offset(centre, 600, -550), 320, 380, 27, at),
  ]
  const times = {
    [`${PRACTICE_HILL}1`]: [['r-sam', 101], ['r-priya', 109], ['r-tom', 118], ['r-jess', 131]],
    [`${PRACTICE_HILL}2`]: [['r-priya', 96], ['r-mei', 104], ['r-lachie', 112], ['r-sam', 123]],
  }
  S.hills = [...S.hills.filter((h) => !h.id.startsWith(PRACTICE_HILL)), ...hills]
  S.hillEfforts = S.hillEfforts.filter((e) => !e.hillId.startsWith(PRACTICE_HILL) || e.userId.startsWith('me-'))
  let k = 0
  for (const [hillId, list] of Object.entries(times)) {
    for (const [userId, seconds] of list) {
      S.hillEfforts.push({ id: `${hillId}-${userId}`, hillId, userId, activityId: null, seconds, tookCrown: false, createdAt: at + (k++) * 3600000 })
    }
  }
  S.hillsCentre = centre
}

const effortsOn = (S, hillId) => S.hillEfforts.filter((e) => e.hillId === hillId)
export const holderFor = (S, hillId) => holderOf(effortsOn(S, hillId))

function hillOut(S, h, player, meId) {
  const hold = holderFor(S, h.id)
  const p = hold && player(hold.userId)
  return {
    id: h.id, name: h.name, mode: h.mode, line: h.line, gainM: h.gainM, lengthM: h.lengthM, grade: h.grade, start: h.start, end: h.end, top: h.end,
    holder: hold ? { userId: hold.userId, name: p.name, colour: p.colour, seconds: hold.seconds, me: hold.userId === meId } : null,
  }
}

/** hills({ bbox, mode }) */
export function listHills(S, { mode = 'run', bbox } = {}, player, meId) {
  const inBox = (h) => !bbox || (h.start.lng >= bbox[0] && h.start.lat >= bbox[1] && h.start.lng <= bbox[2] && h.start.lat <= bbox[3])
  return { hills: S.hills.filter((h) => h.mode === mode && inBox(h)).map((h) => hillOut(S, h, player, meId)) }
}

/** hill(id) */
export function hillDetail(S, id, player, meId) {
  const h = S.hills.find((x) => x.id === id)
  if (!h) throw new Error('That hill is gone.')
  const all = effortsOn(S, id)
  const b = hillBoard(all, meId, 10)
  const row = (u) => ({ rank: u.rank, userId: u.userId, name: player(u.userId).name, colour: player(u.userId).colour, seconds: u.seconds, at: u.at, me: u.userId === meId })
  const mineEffort = b.mine && all.find((e) => e.userId === meId && e.seconds === b.mine.seconds)
  return {
    hill: { ...hillOut(S, h, player, meId), profile: h.profile, people: new Set(all.map((e) => e.userId)).size },
    board: b.top.map(row),
    mine: b.mine ? { rank: b.mine.rank, seconds: b.mine.seconds, at: b.mine.at, activityId: mineEffort?.activityId || null } : null,
  }
}

/** Hills climbed in one activity, as the server's activity(id) has them */
export function hillsOfActivity(S, activityId, meId) {
  return S.hillEfforts.filter((e) => e.activityId === activityId).map((e) => {
    const h = S.hills.find((x) => x.id === e.hillId)
    const better = new Set(effortsOn(S, e.hillId).filter((x) => x.userId !== e.userId && x.seconds < e.seconds).map((x) => x.userId))
    return { id: e.hillId, name: h?.name || 'A hill', seconds: e.seconds, rank: better.size + 1, tookCrown: !!e.tookCrown, holds: holderFor(S, e.hillId)?.userId === meId && e.userId === meId }
  })
}

/**
 * After a practice save: heights for the track (terrain or a watch file's
 * own, never the phone's GPS heights), then climbs and passes over hills.
 * Returns how many efforts it recorded.
 */
export async function detectPractice(S, activity, track, { uid, zones = [], fetcher } = {}) {
  if (activity.rejected || !track?.length) return 0
  const samples = sampleByDistance(withDistance(track), 240)
  if (samples.length < 2) return 0
  const elev = await elevationFor(activity, samples, fetcher ? { fetcher } : {}).catch(() => null)
  const alts = elev && elev.source !== 'gps' ? elev.alts : null
  const { created, efforts } = detectHills({ samples, alts, hills: S.hills, mode: activity.mode, zones })
  const ids = created.map((h) => {
    const same = S.hills.find((x) => x.key === h.key)
    if (same) return same.id
    const id = 'hill-' + uid().slice(0, 10)
    S.hills.push({ ...h, id, createdAt: Date.now() })
    return id
  })
  for (const e of efforts) {
    const hillId = String(e.hillId).startsWith('new:') ? ids[Number(e.hillId.slice(4))] : e.hillId
    const hold = holderFor(S, hillId)
    const next = holderAfter({ holderUser: hold?.userId, holderS: hold?.seconds }, activity.userId, e.seconds)
    S.hillEfforts.push({ id: uid(), hillId, userId: activity.userId, activityId: activity.id, seconds: e.seconds, tookCrown: next.tookCrown, createdAt: activity.startedAt })
  }
  return efforts.length
}

/** An activity was deleted: its times go, and the board works the holder out again */
export function dropActivityHills(S, activityId) {
  S.hillEfforts = S.hillEfforts.filter((e) => e.activityId !== activityId)
}

/**
 * Practice rivals answer back: now and then the rival who held a hill before
 * you goes a few seconds faster. Returns notes to send (kind and inviting).
 */
export function rivalHillTick(S, meId, { now = Date.now(), rand = Math.random, player } = {}) {
  const notes = []
  for (const h of S.hills) {
    const hold = holderFor(S, h.id)
    if (!hold || hold.userId !== meId) continue
    const mine = effortsOn(S, h.id).filter((e) => e.userId === meId).sort((a, b) => a.seconds - b.seconds)[0]
    if (!mine || now - mine.createdAt < 18 * 3600000 || rand() > 0.3) continue
    const rivals = [...new Set(effortsOn(S, h.id).map((e) => e.userId).filter((u) => u.startsWith('r-')))]
    if (!rivals.length) continue
    const who = rivals[Math.floor(rand() * rivals.length)]
    const seconds = Math.max(30, hold.seconds - 1 - Math.floor(rand() * 4))
    S.hillEfforts.push({ id: `${h.id}-${who}-${now}`, hillId: h.id, userId: who, activityId: null, seconds, tookCrown: true, createdAt: now })
    notes.push(hillTakenText(h.name, player(who).name, seconds))
  }
  return notes
}

export { inSentence }
