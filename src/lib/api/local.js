// Local adapter: the whole game running in the browser, stored in
// IndexedDB, with a demo world of rival players seeded around wherever
// the player is. Same shapes as the Worker API (docs/API.md), so the app
// doesn't care which one it's talking to.

import * as kv from '../kv.js'
import {
  processActivity, currentStrength, isWild, daysUntilWild, levelFor, HEX_KM2,
  weeklyKm, loadCheck, applyClaim, openBattles, battleScore, cellsForLoops, effortGain,
  findLoops, summarise, offset, distance, cellCentre, hexIsPrivate,
  visitedCells, mergeExplored, weekOf, weekFor, prevWeek, isWeekKey, weeklyQuests, weekRecap, MODES,
  seasonFor, seasonOut, seasonById, previousSeason, seasonGains, seasonSummary, showSummary, softReset, heatOf,
  bestEfforts, mergeBests, rebuildBests, bestsList, prepareStronghold, strongholdsRun, standings, crownStatus, crownMessage,
} from '../engine/index.js'
import { isCrest } from '../crests.js'
import { cleanCheckin } from '../coach/checkin.js'
import { loopTrack, routeTrack, rng } from '../tracks.js'
import { cleanRoute, MAX_ROUTES } from '../planner.js'
import { checkText } from '../social/filter.js'
import { MAX_LEAGUES, MAX_MEMBERS, SWAP_DAYS, GAIN_DAYS, makeCode, normaliseCode, rankTable, rivalSums, sortRivals, groundOf } from '../social/leagues.js'
import { practiceCommentsFor } from '../social/practice.js'

const DAY = 86400000
const ME_DEFAULT_COLOUR = '#2E55E6'
const WORLD_VERSION = 5 // bump to re-seed the practice rivals after a change

export const RIVALS = [
  { id: 'r-sam', name: 'Sam', colour: '#E8A817', crest: 'sun' },
  { id: 'r-priya', name: 'Priya', colour: '#E5604D', crest: 'bolt' },
  { id: 'r-jess', name: 'Jess', colour: '#1A9E8F', crest: 'wave' },
  { id: 'r-tom', name: 'Tom', colour: '#8A5CD8', crest: 'peak' },
  { id: 'r-mei', name: 'Mei', colour: '#D6418E', crest: 'star' },
  { id: 'r-lachie', name: 'Lachie', colour: '#6E8B22', crest: 'leaf' },
]

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

// ---- state, loaded once and written back on change ----
let S = null
async function state() {
  if (S) return S
  S = {
    user: await kv.get('user', null),
    activities: await kv.get('activities', []),
    cells: {
      run: new Map((await kv.get('cells:run', [])).map((c) => [c.h3, c])),
      walk: new Map((await kv.get('cells:walk', [])).map((c) => [c.h3, c])),
      ride: new Map((await kv.get('cells:ride', [])).map((c) => [c.h3, c])),
    },
    battles: await kv.get('battles', []),
    notifications: await kv.get('notifications', []),
    plan: await kv.get('plan', null),
    clubs: await kv.get('clubs', []),
    world: await kv.get('world', null),
    feedback: await kv.get('feedback', []),
    routes: await kv.get('routes', []),
    visited: await kv.get('visited', {}), // activity id -> { at, mode, cells } (hexes the track passed through)
    losses: await kv.get('losses', []), // hexes rivals took from you: [{ h3, mode, at, by }]
    efforts: await kv.get('efforts', []), // stronghold efforts, everyone's (practice rivals too)
    bests: await kv.get('bests', {}), // your personal bests: { mode: { key: { value, activityId, at } } }
    social: await kv.get('social', { comments: [], reports: [], leagues: [], swaps: [], decided: [] }),
  }
  if (!S.user) {
    S.user = {
      id: 'me-' + uid().slice(0, 8),
      name: '',
      colour: ME_DEFAULT_COLOUR,
      crest: null,
      units: 'metric',
      mode: 'run',
      zones: [],
      clubId: null,
      createdAt: Date.now(),
      onboarded: false,
      formtrack: { linked: false, linkedAt: null },
    }
    await kv.set('user', S.user)
  }
  return S
}
const save = {
  user: () => kv.set('user', S.user),
  activities: () => kv.set('activities', S.activities),
  cells: (mode) => kv.set(`cells:${mode}`, [...S.cells[mode].values()]),
  battles: () => kv.set('battles', S.battles),
  notifications: () => kv.set('notifications', S.notifications.slice(0, 200)),
  plan: () => kv.set('plan', S.plan),
  clubs: () => kv.set('clubs', S.clubs),
  world: () => kv.set('world', S.world),
  feedback: () => kv.set('feedback', S.feedback),
  routes: () => kv.set('routes', S.routes),
  visited: () => kv.set('visited', S.visited),
  losses: () => kv.set('losses', S.losses.slice(-3000)),
  efforts: () => kv.set('efforts', S.efforts),
  bests: () => kv.set('bests', S.bests),
  social: () => kv.set('social', S.social),
}

function player(id) {
  if (id === S.user.id) return { id, name: S.user.name || 'You', colour: S.user.colour, crest: S.user.crest || null }
  return RIVALS.find((r) => r.id === id) || { id, name: 'Someone', colour: '#888', crest: null }
}

function notify(kind, text, at = Date.now()) {
  S.notifications.unshift({ id: uid(), at, kind, text, read: false })
}

// Remember hexes a rival took from you, for quests and the weekly recap
function logLosses(diff, mode, by, at) {
  let n = 0
  for (const t of diff?.taken || []) {
    if (t.from !== S.user.id) continue
    S.losses.push({ h3: t.h3, mode, at, by })
    n++
  }
  return n
}

// Older activities from before explored hexes were kept: work them out once from their tracks
async function ensureVisited() {
  let changed = false
  for (const a of S.activities) {
    if (a.userId !== S.user.id || a.rejected || S.visited[a.id]) continue
    const track = (await kv.get(`track:${a.id}`, null)) || []
    S.visited[a.id] = { at: a.startedAt, mode: a.mode, cells: visitedCells(track) }
    changed = true
  }
  if (changed) await save.visited()
}

// Plain data for the quest and recap rules (engine/quests.js, engine/weekly.js)
async function weekInput(week, now) {
  await ensureVisited()
  const mineIds = new Set(S.activities.filter((a) => a.userId === S.user.id).map((a) => a.id))
  const cells = []
  for (const mode of MODES) for (const c of S.cells[mode].values()) if (c.owner === S.user.id) cells.push({ ...c, mode })
  return {
    userId: S.user.id,
    week,
    now,
    activities: S.activities.filter((a) => a.userId === S.user.id),
    visits: Object.entries(S.visited).filter(([id]) => mineIds.has(id)).map(([id, v]) => ({ id, ...v })),
    cells,
    losses: S.losses,
  }
}

// ---- demo world ----
// Area packs: real local loops for places we've mapped. Loaded only when the
// player is nearby, so everyone else doesn't download them.
const AREA_PACKS = [{ centre: { lat: -33.735, lng: 150.7 }, radiusM: 15000, load: () => import('./areas/penrith.js') }]

async function areaFor(centre) {
  const pack = AREA_PACKS.find((p) => distance(p.centre, centre) <= p.radiusM)
  if (!pack) return null
  const { AREA, LOOPS, decode } = await pack.load()
  return { ...AREA, loops: new Map(LOOPS.map((l) => [l.id, { ...l, route: decode(l.line) }])) }
}

// Strongholds: the area pack's named loops, ready for matching
let shCache = null
async function strongholdsFor(centre) {
  if (!centre) return []
  if (shCache && distance(shCache.centre, centre) < 1) return shCache.list
  const area = await areaFor(centre)
  const list = area ? [...area.loops.values()].map((l) => ({ ...prepareStronghold({ id: l.id, name: l.name, route: l.route }), line: l.line })) : []
  shCache = { centre, list }
  return list
}
const worldStrongholds = () => (S.world?.area ? strongholdsFor(S.world.centre) : [])

function recordEfforts(activity, track, shs) {
  if (activity.rejected) return []
  const found = strongholdsRun(track, shs)
  for (const f of found) {
    S.efforts.push({ id: uid(), strongholdId: f.strongholdId, userId: activity.userId, activityId: activity.id, mode: activity.mode, at: f.startedAt, elapsedS: f.elapsedS })
  }
  return found
}
const effortsOn = (id, mode) => S.efforts.filter((e) => e.strongholdId === id && e.mode === mode)

// A rival running one of their regular loops in an area pack
function areaRun(area, rivalId, loopId, startedAt, rand) {
  const loop = area.loops.get(loopId)
  const points = routeTrack(loop.route, { kmh: 9 + rand() * 4, startAt: startedAt, seed: Math.floor(rand() * 1e9), reverse: rand() < 0.4 })
  return { userId: rivalId, startedAt, points, loopName: loop.name }
}

// Rival players with a few weeks of history around the player's area.
export async function ensureWorld(where) {
  await state()
  const centre = { lat: where.lat, lng: where.lng }
  if (S.world && S.world.v === WORLD_VERSION && distance(S.world.centre, centre) < 8000) return S.world
  const rand = rng(`${centre.lat.toFixed(2)},${centre.lng.toFixed(2)}`)
  const now = Date.now()
  const sims = []
  const area = await areaFor(centre)
  if (area) {
    // Each rival runs their regular loops a few times over the past five weeks
    for (const r of RIVALS) {
      for (const loopId of area.regulars[r.id] || []) {
        const runs = 2 + Math.floor(rand() * 3)
        for (let k = 0; k < runs; k++) sims.push(areaRun(area, r.id, loopId, now - (1 + rand() * 34) * DAY - rand() * DAY * 0.5, rand))
      }
    }
  }
  for (const r of area ? [] : RIVALS) {
    const n = 2 + Math.floor(rand() * 3)
    // Each rival has a home patch they keep coming back to, spread around
    // the area with wild ground in between
    const ang = (RIVALS.indexOf(r) / RIVALS.length) * Math.PI * 2 + rand() * 0.6
    const dist = 900 + rand() * 2600
    const home = offset(centre, Math.cos(ang) * dist, Math.sin(ang) * dist)
    for (let k = 0; k < n; k++) {
      const c = offset(home, (rand() - 0.5) * 900, (rand() - 0.5) * 900)
      const ageDays = 1 + rand() * (r.id === 'r-lachie' ? 40 : 24)
      sims.push({
        userId: r.id,
        mode: 'run',
        startedAt: now - ageDays * DAY - rand() * DAY * 0.5,
        centre: c,
        perimeterKm: 1.8 + rand() * 3,
        kmh: 9 + rand() * 4,
        seed: Math.floor(rand() * 1e9),
        stretch: 0.7 + rand() * 0.9,
        rotate: rand() * Math.PI,
      })
    }
  }
  sims.sort((a, b) => a.startedAt - b.startedAt)
  S.cells.run = new Map([...S.cells.run].filter(([, c]) => c.owner === S.user.id))
  S.activities = S.activities.filter((a) => a.userId === S.user.id)
  S.efforts = S.efforts.filter((e) => e.userId === S.user.id)
  shCache = null
  const shs = area ? await strongholdsFor(centre) : []
  for (const s of sims) {
    const points = s.points || loopTrack({ centre: s.centre, perimeterKm: s.perimeterKm, kmh: s.kmh, startAt: s.startedAt, seed: s.seed, stretch: s.stretch, rotate: s.rotate })
    const res = processActivity({ id: 'sim-' + (s.seed ?? uid().slice(0, 8)), userId: s.userId, mode: 'run', points, source: 'watch', startedAt: s.startedAt }, { cells: S.cells.run, zones: [], battles: [], now: s.startedAt })
    if (s.loopName) res.activity.title = s.loopName
    for (const [h, c] of res.updated) S.cells.run.set(h, c)
    logLosses(res.diff, 'run', s.userId, s.startedAt)
    res.activity.kudos = Math.floor(rand() * 9)
    if (s.points) recordEfforts(res.activity, res.track, shs)
    S.activities.push(res.activity)
  }
  S.clubs = (area?.clubs || [
    { id: 'c-iwr', name: 'Inner West Runners', members: ['r-sam', 'r-priya', 'r-tom'] },
    { id: 'c-sunrise', name: 'Sunrise Striders', members: ['r-jess', 'r-mei'] },
    { id: 'c-parkrun', name: 'Saturday parkrunners', members: ['r-lachie'] },
  ]).map((c) => {
    const old = S.clubs.find((o) => o.id === c.id)
    return old ? { ...c, members: [...new Set([...c.members, ...old.members])] } : c
  })
  S.world = { v: WORLD_VERSION, centre, seededAt: now, lastTick: now, area: area?.id || null, seasonReset: seasonFor(now).id }
  await Promise.all([save.cells('run'), save.activities(), save.clubs(), save.world(), save.losses(), save.efforts()])
  return S.world
}

// Rivals fight back: if you took their ground, they may answer within a day.
async function tick() {
  if (!S.world) return
  const now = Date.now()
  await seasonTick(now)
  if (now - (S.world.lastTick || 0) < 3 * 3600000) return
  S.world.lastTick = now
  const rand = rng(Math.floor(now / 3600000))
  let changed = false
  for (const b of S.battles) {
    if (b.endedAt || b.attacker !== S.user.id || !b.defender.startsWith('r-')) continue
    if (now - (b.lastResponse || b.startedAt) < 10 * 3600000 || rand() > 0.6) continue
    const cells = S.cells[b.mode || 'run']
    const mine = b.hexes.filter((h) => cells.get(h)?.owner === S.user.id)
    if (!mine.length) continue
    const back = mine.slice(0, Math.max(1, Math.round(mine.length * (0.25 + rand() * 0.35))))
    const gain = 30 + Math.round(rand() * 25)
    const { diff, updated } = applyClaim(cells, back, b.defender, gain, { now })
    for (const [h, c] of updated) cells.set(h, c)
    logLosses(diff, b.mode || 'run', b.defender, now)
    b.lastResponse = now
    recordSwaps(diff.taken, b.defender, now)
    if (diff.taken.length) {
      const who = player(b.defender).name
      notify('battle', `${who} took back ${diff.taken.length} hexes. Will you answer before the battle ends?`, now)
      changed = true
    }
  }
  // In a mapped area, rivals keep running their regular loops between visits
  if (S.world.area && rand() < 0.5) {
    const area = await areaFor(S.world.centre)
    const ids = Object.keys(area?.regulars || {})
    if (ids.length) {
      const who = ids[Math.floor(rand() * ids.length)]
      const loops = area.regulars[who]
      const run = areaRun(area, who, loops[Math.floor(rand() * loops.length)], now - (0.5 + rand() * 2.5) * 3600000, rand)
      const res = processActivity({ id: 'sim-' + uid().slice(0, 8), userId: who, mode: 'run', points: run.points, source: 'watch', startedAt: run.startedAt }, { cells: S.cells.run, zones: [], battles: [], now })
      for (const [h, c] of res.updated) S.cells.run.set(h, c)
      res.activity.title = run.loopName
      res.activity.kudos = Math.floor(rand() * 6)
      const shs = await worldStrongholds()
      const before = new Map(shs.map((sh) => [sh.id, standings(effortsOn(sh.id, 'run'), now).holder?.userId]))
      for (const f of recordEfforts(res.activity, res.track, shs)) {
        if (before.get(f.strongholdId) === S.user.id && standings(effortsOn(f.strongholdId, 'run'), now).holder?.userId === who) {
          notify('stronghold', `${player(who).name} took the crown on the ${f.name}. Run it again to win it back?`, now)
        }
      }
      S.activities.push(res.activity)
      const fromMe = logLosses(res.diff, 'run', who, now)
      recordSwaps(res.diff.taken, who, now, res.activity.id)
      if (fromMe) notify('battle', `${player(who).name} ran the ${run.loopName} and took ${fromMe} of your hexes. Run it back?`, now)
      changed = true
    }
  }
  // Retire finished battles
  for (const b of S.battles) {
    if (!b.endedAt && b.endsAt <= now) {
      const sc = battleScore(b, S.cells[b.mode || 'run'], now)
      b.endedAt = now
      b.winner = sc.leader
      b.finalScore = sc
      const other = b.attacker === S.user.id ? b.defender : b.attacker
      notify('battle', sc.leader === S.user.id
        ? `You won your battle with ${player(other).name}, ${Math.max(sc.attacker, sc.defender)} hexes to ${Math.min(sc.attacker, sc.defender)}.`
        : `${player(other).name} held on this time. Want a rematch?`, now)
      changed = true
    }
  }
  // Fading ground, once a day
  const today = new Date(now).toDateString()
  if (S.world.fadeNoticeDay !== today) {
    const fading = [...S.cells.run.values()].filter((c) => c.owner === S.user.id && !isWild(c, now) && daysUntilWild(c, now) <= 3).length
    if (fading) {
      notify('fade', `${fading} of your hexes go wild in the next three days. Will you run them before then?`, now)
      changed = true
    }
    S.world.fadeNoticeDay = today
  }
  // A new week: last week's recap is ready (only if there is something in it)
  const wk = weekOf(now)
  if (S.world.weekNotice !== wk.key) {
    const pw = prevWeek(wk)
    if (S.world.weekNotice && S.activities.some((a) => a.userId === S.user.id && !a.rejected && a.startedAt >= pw.start && a.startedAt < pw.end)) {
      notify('week', 'Your week in Foothold is ready. Want a look?', now)
      changed = true
    }
    S.world.weekNotice = wk.key
  }
  await save.world()
  if (changed) await Promise.all([save.cells('run'), save.battles(), save.notifications(), save.activities(), save.losses(), save.efforts(), save.social()])
}

// A new season softens everyone's ground, the same as the server's hourly
// cron. A world made before seasons existed starts counting from now.
async function seasonTick(now) {
  const season = seasonFor(now)
  if (S.world.seasonReset === season.id) return
  if (S.world.seasonReset) {
    for (const mode of MODES) {
      const updated = softReset(S.cells[mode], season, now)
      for (const [h, c] of updated) S.cells[mode].set(h, c)
      if (updated.size) await save.cells(mode)
    }
  }
  S.world.seasonReset = season.id
  await save.world()
}

// ---- social: swaps, practice comments ----
// Who took ground from whom, only where the player is involved (for the rivals list)
function recordSwaps(taken, taker, at, activityId = null) {
  const byLoser = new Map()
  for (const t of taken || []) if (t.from && t.from !== taker && (taker === S.user.id || t.from === S.user.id)) byLoser.set(t.from, (byLoser.get(t.from) || 0) + 1)
  for (const [loser, n] of byLoser) S.social.swaps.push({ activityId, taker, loser, n, at })
  S.social.swaps = S.social.swaps.filter((s) => s.at >= Date.now() - SWAP_DAYS * DAY).slice(-2000)
}

// Practice rivals leave a kind word on some of your activities, a little while after
function practiceComments() {
  const decided = new Set(S.social.decided)
  let changed = false
  const foes = new Set(S.battles.flatMap((b) => [b.attacker, b.defender]))
  const pool = RIVALS.filter((r) => foes.has(r.id))
  for (const a of S.activities) {
    if (a.userId !== S.user.id || a.rejected || decided.has(a.id)) continue
    decided.add(a.id)
    changed = true
    for (const c of practiceCommentsFor(a, pool.length ? pool : RIVALS, rng('comments:' + a.id))) {
      S.social.comments.push({ id: 'pc-' + uid().slice(0, 10), activityId: a.id, ...c })
    }
  }
  if (changed) S.social.decided = [...decided].slice(-1000)
  return changed
}

const hiddenFor = (c) => S.social.reports.some((r) => r.commentId === c.id && r.reporter === S.user.id)
const visibleComments = (activityId, now = Date.now()) => S.social.comments.filter((c) => c.activityId === activityId && c.at <= now && !hiddenFor(c)).sort((a, b) => a.at - b.at)
// Your own activities always carry the check-in fields, as the server's do
const withCount = (a) => (a.userId === S.user.id
  ? { feel: null, hurt: null, checkinAt: null, ...a, comments: visibleComments(a.id).length }
  : { ...a, comments: visibleComments(a.id).length })
function commentOut(c, ownerId) {
  const p = player(c.userId)
  const mine = c.userId === S.user.id
  return { id: c.id, userId: c.userId, name: p.name, colour: p.colour, text: c.text, at: c.at, mine, canDelete: mine || ownerId === S.user.id }
}
function leagueOut(l) {
  return { id: l.id, name: l.name, code: l.code, members: l.members.length, mine: true, createdByMe: l.createdBy === S.user.id, createdAt: l.createdAt }
}
const myLeagues = () => S.social.leagues.filter((l) => l.members.some((m) => m.userId === S.user.id))

// ---- API (docs/API.md) ----
function strongholdOut(sh, mode, now) {
  const st = crownStatus(effortsOn(sh.id, mode), S.user.id, now)
  const me = st.byTime.find((u) => u.userId === S.user.id)
  return {
    id: sh.id, name: sh.name, mode, line: sh.line, start: sh.start, distanceM: sh.distanceM,
    centre: { lat: (sh.bbox[1] + sh.bbox[3]) / 2, lng: (sh.bbox[0] + sh.bbox[2]) / 2 },
    holder: st.holder ? { userId: st.holder.userId, name: player(st.holder.userId).name, colour: player(st.holder.userId).colour, efforts: st.holder.efforts, me: st.holds } : null,
    mine: { efforts: st.mine, bestS: me?.bestS ?? null, holds: st.holds, toCrown: st.toCrown },
  }
}
function decorate(b, now = Date.now()) {
  return {
    ...b,
    attackerName: player(b.attacker).name,
    defenderName: player(b.defender).name,
    attackerColour: player(b.attacker).colour,
    defenderColour: player(b.defender).colour,
    attackerCrest: player(b.attacker).crest,
    defenderCrest: player(b.defender).crest,
    score: b.finalScore || battleScore(b, S.cells[b.mode || 'run'], now),
  }
}

export const local = {
  kind: 'local',

  async me() {
    await state()
    await tick()
    return { user: S.user }
  },

  async updateMe(patch) {
    await state()
    if ('crest' in patch && patch.crest !== null && !isCrest(patch.crest)) throw new Error("That crest isn't one of the choices.")
    if ('seasonSeen' in patch && patch.seasonSeen !== null && !seasonById(patch.seasonSeen)) throw new Error("That season isn't one we know.")
    const allowed = ['name', 'colour', 'crest', 'mode', 'zones', 'units', 'onboarded', 'goal', 'homeCentre', 'seasonSeen']
    for (const k of allowed) if (k in patch) S.user[k] = patch[k]
    if (typeof S.user.name === 'string') S.user.name = S.user.name.trim().slice(0, 30)
    await save.user()
    return { user: S.user }
  },

  async postActivity({ mode = 'run', source = 'phone', startedAt, points }) {
    await state()
    if (!Array.isArray(points) || points.length < 10) throw new Error('That activity is too short to save.')
    const now = Date.now()
    const cells = S.cells[mode]
    const hexesBefore = [...cells.values()].filter((c) => c.owner === S.user.id && !isWild(c, now)).length
    const load = loadCheck(S.activities.filter((a) => a.userId === S.user.id), 0, now, mode)
    const res = processActivity(
      { id: uid(), userId: S.user.id, mode, points, source, startedAt },
      { cells, zones: S.user.zones, battles: S.battles, now },
    )
    for (const [h, c] of res.updated) cells.set(h, c)
    res.activity.kudos = 0
    // Personal bests and strongholds
    let prs = []
    if (!res.activity.rejected) {
      res.activity.bests = bestEfforts(res.track, mode)
      const merged = mergeBests(S.bests[mode], res.activity.bests, mode, { activityId: res.activity.id, at: res.activity.startedAt })
      S.bests = { ...S.bests, [mode]: merged.records }
      prs = merged.improved
    }
    const shs = await worldStrongholds()
    const before = new Map(shs.map((sh) => [sh.id, standings(effortsOn(sh.id, mode), now).holder]))
    const strongholds = recordEfforts(res.activity, res.track, shs).map((f) => {
      const st = crownStatus(effortsOn(f.strongholdId, mode), S.user.id, now)
      const prev = before.get(f.strongholdId)
      const tookFrom = st.holds && prev && prev.userId !== S.user.id ? player(prev.userId).name : null
      const holderName = st.holder ? player(st.holder.userId).name : null
      const out = { id: f.strongholdId, name: f.name, elapsedS: f.elapsedS, efforts: st.mine, holds: st.holds, toCrown: st.toCrown, tookFrom, holderName }
      return { ...out, message: crownMessage(out) }
    })
    S.activities.unshift(res.activity)
    recordSwaps(res.diff.taken, S.user.id, now, res.activity.id)
    await kv.set(`track:${res.activity.id}`, res.track)
    if (!res.activity.rejected) S.visited[res.activity.id] = { at: res.activity.startedAt, mode, cells: visitedCells(res.track) }
    for (const b of res.battles) {
      b.mode = mode
      const i = S.battles.findIndex((x) => x.id === b.id)
      if (i >= 0) S.battles[i] = b
      else S.battles.unshift(b)
    }
    for (const b of res.battles) {
      if (b.startedAt === now) notify('battle', `You took ${b.hexes.length} hexes from ${player(b.defender).name}. A one-week battle has started. Can you hold them?`, now)
    }
    const hexesAfter = [...cells.values()].filter((c) => c.owner === S.user.id && !isWild(c, now)).length
    await Promise.all([save.activities(), save.cells(mode), save.battles(), save.notifications(), save.visited(), save.efforts(), save.bests()])
    return {
      prs,
      strongholds,
      activity: res.activity,
      diff: res.diff,
      battles: res.battles.map((b) => decorate(b, now)),
      hexesBefore,
      hexesAfter,
      load,
      loops: res.loops.map((l) => l.ring),
    }
  },

  async activities({ limit = 50, mine = true } = {}) {
    await state()
    if (practiceComments()) await save.social()
    const list = mine ? S.activities.filter((a) => a.userId === S.user.id) : S.activities
    return { activities: list.slice(0, limit).map(withCount) }
  },

  async activity(id) {
    await state()
    const activity = S.activities.find((a) => a.id === id)
    if (!activity) throw new Error('That activity is gone.')
    const track = (await kv.get(`track:${id}`, null)) || []
    return { activity: withCount(activity), track }
  },

  async appeal(id, note) {
    await state()
    const a = S.activities.find((x) => x.id === id)
    if (!a) throw new Error('That activity is gone.')
    a.appeal = { note: String(note || '').slice(0, 500), status: 'open', at: Date.now() }
    await save.activities()
    return { activity: a }
  },

  // Post-run check-in: how it felt, and anything that hurt. Answering again replaces it.
  async checkin(id, body) {
    await state()
    const a = S.activities.find((x) => x.id === id)
    if (!a) throw new Error('That activity is gone.')
    if (a.userId !== S.user.id) throw new Error('You can only check in on your own activities.')
    const { feel, hurt } = cleanCheckin(body)
    Object.assign(a, { feel, hurt, checkinAt: Date.now() })
    await save.activities()
    return { activity: withCount(a) }
  },

  async deleteActivity(id) {
    await state()
    const gone = S.activities.find((a) => a.id === id)
    S.activities = S.activities.filter((a) => a.id !== id)
    delete S.visited[id]
    S.efforts = S.efforts.filter((e) => e.activityId !== id)
    if (gone?.bests) S.bests = { ...S.bests, [gone.mode]: rebuildBests(S.activities.filter((a) => a.userId === S.user.id && a.mode === gone.mode), gone.mode) }
    S.social.comments = S.social.comments.filter((c) => c.activityId !== id)
    S.social.reports = S.social.reports.filter((r) => r.activityId !== id)
    await kv.del(`track:${id}`)
    await Promise.all([save.activities(), save.visited(), save.efforts(), save.bests(), save.social()])
    return { ok: true }
  },

  async territory({ mode = 'run', bbox } = {}) {
    await state()
    const now = Date.now()
    const out = []
    for (const c of S.cells[mode].values()) {
      const strength = currentStrength(c, now)
      if (!strength) continue
      const mine = c.owner === S.user.id
      if (!mine && c.private) continue
      if (bbox) {
        const p = cellCentre(c.h3)
        if (p.lng < bbox[0] || p.lat < bbox[1] || p.lng > bbox[2] || p.lat > bbox[3]) continue
      }
      const pl = player(c.owner)
      out.push({
        h3: c.h3, owner: c.owner, ownerName: pl.name, ownerColour: pl.colour, ownerCrest: pl.crest || null, mine,
        strength: Math.round(strength), daysToWild: daysUntilWild(c, now), flips: c.flips || 0, heat: heatOf(c, now), lastFlip: c.lastFlip ?? null,
      })
      if (out.length >= 5000) break
    }
    return { cells: out }
  },

  async stats({ mode = 'run' } = {}) {
    await state()
    const now = Date.now()
    const mineCells = [...S.cells[mode].values()].filter((c) => c.owner === S.user.id && !isWild(c, now))
    const hexes = mineCells.length
    const lv = levelFor(hexes)
    const myActs = S.activities.filter((a) => a.userId === S.user.id && !a.rejected)
    const weeks = weeklyKm(myActs, now, 12, mode)
    let streakWeeks = 0
    const counts = new Array(12).fill(0)
    for (const a of myActs) {
      const w = Math.floor((now - a.startedAt) / (7 * DAY))
      if (w >= 0 && w < 12) counts[w]++
    }
    for (let w = counts[0] ? 0 : 1; w < 12 && counts[w]; w++) streakWeeks++
    return {
      hexes,
      km2: Math.round(hexes * HEX_KM2 * 100) / 100,
      level: lv.level,
      next: lv.next,
      toNext: lv.toNext,
      weekKm: weeks.slice(0, 5),
      weekKm12: weeks,
      streakWeeks,
      fadingSoon: mineCells.filter((c) => daysUntilWild(c, now) <= 3).length,
      activities: myActs.length,
      totalKm: Math.round(myActs.filter((a) => a.mode === mode).reduce((s, a) => s + a.distanceM, 0) / 100) / 10,
    }
  },

  async leaderboard({ mode = 'run', scope = 'local', board = 'all' } = {}) {
    await state()
    const now = Date.now()
    const season = seasonFor(now)
    if (board === 'season') {
      const gains = seasonGains(S.activities.filter((a) => (a.mode || 'run') === mode), season)
      let ids = [...new Set([S.user.id, ...RIVALS.map((r) => r.id)])]
      if (scope === 'club') {
        const club = S.clubs.find((c) => c.id === S.user.clubId)
        ids = club ? [...new Set([S.user.id, ...club.members])] : [S.user.id]
      }
      const rows = ids.map((id) => {
        const p = player(id)
        return { userId: id, name: p.name, colour: p.colour, crest: p.crest || null, gained: gains.get(id) || 0, me: id === S.user.id }
      }).filter((r) => r.gained || r.me).sort((a, b) => b.gained - a.gained || (a.me ? -1 : b.me ? 1 : 0))
      return { rows, season: seasonOut(season, now) }
    }
    const counts = new Map()
    for (const c of S.cells[mode].values()) {
      if (isWild(c, now)) continue
      counts.set(c.owner, (counts.get(c.owner) || 0) + 1)
    }
    let ids = [...new Set([S.user.id, ...RIVALS.map((r) => r.id)])]
    if (scope === 'club') {
      const club = S.clubs.find((c) => c.id === S.user.clubId)
      ids = club ? [...new Set([S.user.id, ...club.members])] : [S.user.id]
    }
    const rows = ids.map((id) => {
      const p = player(id)
      const hexes = counts.get(id) || 0
      return { userId: id, name: p.name, colour: p.colour, crest: p.crest || null, hexes, km2: Math.round(hexes * HEX_KM2 * 100) / 100, me: id === S.user.id }
    }).sort((a, b) => b.hexes - a.hexes)
    return { rows, season: seasonOut(season, now) }
  },

  async season() {
    await state()
    await tick()
    const now = Date.now()
    const cur = seasonFor(now)
    const prev = previousSeason(cur)
    const previous = seasonSummary(seasonGains(S.activities, prev), S.user.id, prev)
    return { season: seasonOut(cur, now), previous, showSummary: showSummary(previous, cur, S.user.seasonSeen ?? null, now) }
  },

  async clubBoard() {
    await state()
    const now = Date.now()
    const counts = new Map()
    for (const c of S.cells.run.values()) if (!isWild(c, now)) counts.set(c.owner, (counts.get(c.owner) || 0) + 1)
    return {
      rows: S.clubs.map((c) => {
        const members = [...new Set([...c.members, ...(S.user.clubId === c.id ? [S.user.id] : [])])]
        return { id: c.id, name: c.name, members: members.length, hexes: members.reduce((s, m) => s + (counts.get(m) || 0), 0), mine: S.user.clubId === c.id }
      }).sort((a, b) => b.hexes - a.hexes),
    }
  },

  async battles() {
    await state()
    await tick()
    const now = Date.now()
    const mine = S.battles.filter((b) => b.attacker === S.user.id || b.defender === S.user.id)
    return {
      live: mine.filter((b) => !b.endedAt).map((b) => decorate(b, now)),
      past: mine.filter((b) => b.endedAt).slice(0, 20).map((b) => decorate(b, now)),
    }
  },

  async rivals({ mode = 'run' } = {}) {
    await state()
    const now = Date.now()
    const sums = rivalSums(S.user.id, S.battles, S.social.swaps, now)
    const publicHexes = (id) => groundOf(S.cells[mode].values(), id, now, (c) => !isWild(c, now)).hexes
    const rivals = [...sums].map(([id, r]) => {
      const p = player(id)
      const last = S.activities.filter((a) => a.userId === id && !a.rejected).reduce((m, a) => Math.max(m, a.startedAt), 0)
      return {
        userId: id, name: p.name, colour: p.colour, crest: p.crest || null,
        swaps: r.swaps, tookFromThem: r.tookFromThem, tookFromYou: r.tookFromYou, record: r.record,
        battle: r.live ? decorate(r.live, now) : null, lastActive: last || null, hexes: publicHexes(id),
      }
    })
    return { rivals: sortRivals(rivals).slice(0, 50), you: { hexes: publicHexes(S.user.id) }, days: SWAP_DAYS }
  },

  async feed() {
    await state()
    if (practiceComments()) await save.social()
    return {
      items: S.activities.filter((a) => !a.rejected).sort((a, b) => b.startedAt - a.startedAt).slice(0, 30)
        .map((a) => ({ activity: withCount(a), userName: player(a.userId).name, userColour: player(a.userId).colour, userCrest: player(a.userId).crest || null, mine: a.userId === S.user.id })),
    }
  },

  async kudos(id) {
    await state()
    const a = S.activities.find((x) => x.id === id)
    if (!a) throw new Error('That activity is gone.')
    a.kudosGiven = !a.kudosGiven
    a.kudos = (a.kudos || 0) + (a.kudosGiven ? 1 : -1)
    await save.activities()
    return { kudos: a.kudos, given: a.kudosGiven }
  },

  async comments(activityId) {
    await state()
    const a = S.activities.find((x) => x.id === activityId)
    if (!a) throw new Error('That activity is gone.')
    if (practiceComments()) await save.social()
    const list = visibleComments(activityId).map((c) => commentOut(c, a.userId))
    return { comments: list, count: list.length }
  },
  async addComment(activityId, text) {
    await state()
    const a = S.activities.find((x) => x.id === activityId)
    if (!a) throw new Error('That activity is gone.')
    const check = checkText(text)
    if (!check.ok) throw new Error(check.message)
    const c = { id: 'c-' + uid().slice(0, 12), activityId, userId: S.user.id, text: check.text, at: Date.now() }
    S.social.comments.push(c)
    await save.social()
    return { comment: commentOut(c, a.userId), count: visibleComments(activityId).length }
  },
  async deleteComment(activityId, commentId) {
    await state()
    const a = S.activities.find((x) => x.id === activityId)
    const c = S.social.comments.find((x) => x.id === commentId && x.activityId === activityId)
    if (!a || !c) throw new Error('That comment is gone.')
    if (c.userId !== S.user.id && a.userId !== S.user.id) throw new Error('You can only delete your own comments, or comments on your own activities.')
    S.social.comments = S.social.comments.filter((x) => x.id !== commentId)
    await save.social()
    return { ok: true, count: visibleComments(activityId).length }
  },
  async reportComment(activityId, commentId, reason) {
    await state()
    const c = S.social.comments.find((x) => x.id === commentId && x.activityId === activityId)
    if (!c) throw new Error('That comment is gone.')
    if (c.userId === S.user.id) throw new Error('That is your own comment. You can delete it instead.')
    if (!S.social.reports.some((r) => r.commentId === commentId && r.reporter === S.user.id)) {
      S.social.reports.push({ commentId, activityId, reporter: S.user.id, author: c.userId, text: c.text, reason: reason ? String(reason).slice(0, 200) : null, status: 'open', at: Date.now() })
      await save.social()
    }
    return { ok: true }
  },

  async leagues() {
    await state()
    return { leagues: myLeagues().map(leagueOut), max: MAX_LEAGUES, maxMembers: MAX_MEMBERS }
  },
  async createLeague(name) {
    await state()
    const check = checkText(name, { min: 3, max: 40, what: 'name' })
    if (!check.ok) throw new Error(check.code === 'empty' ? 'Give your league a name of at least three letters.' : check.message)
    if (myLeagues().length >= MAX_LEAGUES) throw new Error(`You're in ${MAX_LEAGUES} leagues already. Leave one to start another.`)
    let code
    do code = makeCode()
    while (S.social.leagues.some((l) => l.code === code))
    const now = Date.now()
    const l = { id: 'l-' + uid().slice(0, 8), name: check.text, code, createdBy: S.user.id, createdAt: now, members: [{ userId: S.user.id, joinedAt: now }] }
    S.social.leagues.push(l)
    await save.social()
    return { league: leagueOut(l) }
  },
  async joinLeague(input) {
    await state()
    const code = normaliseCode(input)
    if (!code) throw new Error('An invite code has six letters and numbers, like K7P2QX.')
    const l = S.social.leagues.find((x) => x.code === code)
    if (!l) throw new Error("We couldn't find that league. In practice mode you can only join leagues made on this phone. Joining a friend's league works once the Foothold server is on.")
    if (l.members.some((m) => m.userId === S.user.id)) return { league: leagueOut(l), already: true }
    if (l.members.length >= MAX_MEMBERS) throw new Error(`${l.name} is full. A league can have up to ${MAX_MEMBERS} members.`)
    if (myLeagues().length >= MAX_LEAGUES) throw new Error(`You're in ${MAX_LEAGUES} leagues already. Leave one to join this one.`)
    l.members.push({ userId: S.user.id, joinedAt: Date.now() })
    await save.social()
    return { league: leagueOut(l) }
  },
  async leaveLeague(id) {
    await state()
    const l = S.social.leagues.find((x) => x.id === id)
    if (l) l.members = l.members.filter((m) => m.userId !== S.user.id)
    // The last real player out closes the league
    S.social.leagues = S.social.leagues.filter((x) => x.members.some((m) => !m.userId.startsWith('r-')))
    await save.social()
    return { ok: true }
  },
  async league(id, { mode = 'run' } = {}) {
    await state()
    const l = S.social.leagues.find((x) => x.id === id)
    if (!l) throw new Error('That league is gone.')
    if (!l.members.some((m) => m.userId === S.user.id)) throw new Error('Join this league with its invite code to see the table.')
    const now = Date.now()
    const cells = [...S.cells[mode].values()]
    const live = (c) => !isWild(c, now)
    const table = rankTable(l.members.map((m) => {
      const p = player(m.userId)
      return { userId: m.userId, name: p.name, colour: p.colour, ...groundOf(cells, m.userId, now, live), me: m.userId === S.user.id }
    }))
    const members = l.members.map((m) => ({ userId: m.userId, name: player(m.userId).name, colour: player(m.userId).colour, joinedAt: m.joinedAt, me: m.userId === S.user.id, owner: m.userId === l.createdBy }))
      .sort((a, b) => a.joinedAt - b.joinedAt)
    return { league: leagueOut(l), table, members, mode, days: GAIN_DAYS }
  },
  // Practice only: the practice rivals join so the table isn't empty
  async invitePractice(id) {
    await state()
    const l = S.social.leagues.find((x) => x.id === id)
    if (!l) throw new Error('That league is gone.')
    const now = Date.now()
    for (const r of RIVALS) if (l.members.length < MAX_MEMBERS && !l.members.some((m) => m.userId === r.id)) l.members.push({ userId: r.id, joinedAt: now })
    await save.social()
    return { league: leagueOut(l) }
  },

  async clubs() {
    const { rows } = await this.clubBoard()
    return { clubs: rows }
  },
  async createClub(name) {
    await state()
    const clean = String(name || '').trim().slice(0, 40)
    if (clean.length < 3) throw new Error('Give your club a name of at least three letters.')
    const club = { id: 'c-' + uid().slice(0, 8), name: clean, members: [] }
    S.clubs.push(club)
    S.user.clubId = club.id
    await Promise.all([save.clubs(), save.user()])
    return { club }
  },
  async joinClub(id) {
    await state()
    if (!S.clubs.some((c) => c.id === id)) throw new Error('That club is gone.')
    S.user.clubId = id
    await save.user()
    return { club: S.clubs.find((c) => c.id === id) }
  },
  async leaveClub() {
    await state()
    S.user.clubId = null
    await save.user()
    return { ok: true }
  },

  async plan() {
    await state()
    return { plan: S.plan }
  },
  async savePlan(plan) {
    await state()
    S.plan = plan
    await save.plan()
    return { plan }
  },

  // AI built plans: the route is public, so the practice map uses it when this
  // page is served by the Foothold server. With no server (GitHub Pages) it's off.
  async aiConfig() {
    const r = await fetch(import.meta.env.BASE_URL + 'api/config', { signal: AbortSignal.timeout(4000) })
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return {}
    return r.json()
  },
  async planAi(body) {
    let r
    try {
      r = await fetch(import.meta.env.BASE_URL + 'api/plan/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    } catch {
      throw new Error("The coach couldn't be reached. Check your connection, or set it up yourself.")
    }
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `Something went wrong (${r.status}). Try again in a moment.`)
    return data
  },

  async notifications() {
    await state()
    await tick()
    return { items: S.notifications.slice(0, 60) }
  },
  async readNotifications(ids) {
    await state()
    for (const n of S.notifications) if (!ids || ids.includes(n.id)) n.read = true
    await save.notifications()
    return { ok: true }
  },

  async linkFormtrack() {
    throw new Error('Linking FormTrack needs the Foothold server, which switches on at launch. Your runs are saved on this device until then.')
  },
  async unlinkFormtrack() {
    await state()
    S.user.formtrack = { linked: false, linkedAt: null }
    await save.user()
    return { linked: false }
  },
  async formtrackSummary() {
    return null
  },

  async explored({ mode } = {}) {
    await state()
    await ensureVisited()
    const mine = new Set(S.activities.filter((a) => a.userId === S.user.id && !a.rejected).map((a) => a.id))
    const visits = Object.entries(S.visited).filter(([id]) => mine.has(id)).map(([, v]) => v)
    return mergeExplored(visits, { mode: mode || null })
  },

  async quests() {
    await state()
    const now = Date.now()
    const week = weekOf(now)
    return { week, quests: weeklyQuests(await weekInput(week, now)) }
  },

  async week({ w } = {}) {
    await state()
    const now = Date.now()
    if (w != null && w !== '' && !isWeekKey(w)) throw new Error('Pick a week as YYYY-MM-DD.')
    const week = w ? weekFor(w) : weekOf(now)
    if (week.start > now) throw new Error("That week hasn't started yet.")
    return { recap: weekRecap(await weekInput(week, now)) }
  },

  async bests({ mode = 'run' } = {}) {
    await state()
    return { bests: bestsList(S.bests[mode], mode) }
  },

  async strongholds({ mode = 'run' } = {}) {
    await state()
    const now = Date.now()
    const shs = await worldStrongholds()
    return { strongholds: shs.map((sh) => strongholdOut(sh, mode, now)) }
  },

  async stronghold(id, { mode = 'run' } = {}) {
    await state()
    const now = Date.now()
    const sh = (await worldStrongholds()).find((x) => x.id === id)
    if (!sh) throw new Error('That stronghold is gone.')
    const st = standings(effortsOn(id, mode), now)
    const row = (u) => ({ userId: u.userId, name: player(u.userId).name, colour: player(u.userId).colour, me: u.userId === S.user.id })
    return {
      stronghold: strongholdOut(sh, mode, now),
      byEfforts: st.byEfforts.slice(0, 20).map((u) => ({ ...row(u), efforts: u.efforts, last: u.last })),
      byTime: st.byTime.slice(0, 20).map((u) => ({ ...row(u), bestS: u.bestS, at: u.bestAt })),
      recent: effortsOn(id, mode).filter((e) => e.userId === S.user.id).sort((a, b) => b.at - a.at).slice(0, 10)
        .map((e) => ({ activityId: e.activityId, at: e.at, elapsedS: e.elapsedS })),
    }
  },

  async feedback({ kind, text }) {
    await state()
    S.feedback.push({ kind, text: String(text).slice(0, 2000), at: Date.now() })
    await save.feedback()
    return { ok: true }
  },

  // Planned routes (the route planner)
  async routes() {
    await state()
    return { routes: S.routes.slice().sort((a, b) => b.updatedAt - a.updatedAt) }
  },
  async saveRoute(body) {
    await state()
    const r = cleanRoute(body)
    const now = Date.now()
    if (body?.id != null) {
      const old = S.routes.find((x) => x.id === body.id)
      if (!old) throw new Error('That route is gone.')
      Object.assign(old, r, { updatedAt: now })
      await save.routes()
      return { route: { ...old } }
    }
    if (S.routes.length >= MAX_ROUTES) throw new Error(`You have ${MAX_ROUTES} saved routes. Delete one to save another.`)
    const route = { id: uid(), ...r, createdAt: now, updatedAt: now }
    S.routes.push(route)
    await save.routes()
    return { route: { ...route } }
  },
  async deleteRoute(id) {
    await state()
    const n = S.routes.length
    S.routes = S.routes.filter((x) => x.id !== id)
    if (S.routes.length === n) throw new Error('That route is gone.')
    await save.routes()
    return { ok: true }
  },

  // Local only
  async loadFor(mode = 'run', plannedKm = 0) {
    await state()
    return loadCheck(S.activities.filter((a) => a.userId === S.user.id), plannedKm, Date.now(), mode)
  },
  async cellsMap(mode = 'run') {
    await state()
    return S.cells[mode]
  },
  async exportData() {
    await state()
    const mine = S.activities.filter((a) => a.userId === S.user.id)
    const visited = Object.fromEntries(mine.filter((a) => S.visited[a.id]).map((a) => [a.id, S.visited[a.id]]))
    return {
      user: S.user,
      activities: mine,
      plan: S.plan,
      routes: S.routes,
      visited,
      losses: S.losses,
      bests: Object.fromEntries(['run', 'walk', 'ride'].map((m) => [m, bestsList(S.bests[m], m)])),
      efforts: S.efforts.filter((e) => e.userId === S.user.id),
      comments: S.social.comments.filter((c) => c.userId === S.user.id),
      reports: S.social.reports.filter((r) => r.reporter === S.user.id),
      leagues: myLeagues().map(leagueOut),
    }
  },
  async deleteAccount() {
    return this.reset()
  },
  async reset() {
    await kv.clearAll()
    S = null
    return { ok: true }
  },
}

// Re-exports used by the record screen for live previews.
export { findLoops, cellsForLoops, effortGain, summarise, hexIsPrivate }
