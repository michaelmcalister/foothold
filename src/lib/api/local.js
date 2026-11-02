// Local adapter: the whole game running in the browser, stored in
// IndexedDB, with a demo world of rival players seeded around wherever
// the player is. Same shapes as the Worker API (docs/API.md), so the app
// doesn't care which one it's talking to.

import * as kv from '../kv.js'
import {
  processActivity, currentStrength, isWild, daysUntilWild, levelFor, HEX_KM2,
  weeklyKm, loadCheck, applyClaim, openBattles, battleScore, cellsForLoops, effortGain,
  findLoops, summarise, offset, distance, cellCentre, hexIsPrivate,
} from '../engine/index.js'
import { loopTrack, routeTrack, rng } from '../tracks.js'
import { cleanRoute, MAX_ROUTES } from '../planner.js'

const DAY = 86400000
const ME_DEFAULT_COLOUR = '#2E55E6'
const WORLD_VERSION = 4 // bump to re-seed the practice rivals after a change

export const RIVALS = [
  { id: 'r-sam', name: 'Sam', colour: '#E8A817' },
  { id: 'r-priya', name: 'Priya', colour: '#E5604D' },
  { id: 'r-jess', name: 'Jess', colour: '#1A9E8F' },
  { id: 'r-tom', name: 'Tom', colour: '#8A5CD8' },
  { id: 'r-mei', name: 'Mei', colour: '#D6418E' },
  { id: 'r-lachie', name: 'Lachie', colour: '#6E8B22' },
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
  }
  if (!S.user) {
    S.user = {
      id: 'me-' + uid().slice(0, 8),
      name: '',
      colour: ME_DEFAULT_COLOUR,
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
}

function player(id) {
  if (id === S.user.id) return { id, name: S.user.name || 'You', colour: S.user.colour }
  return RIVALS.find((r) => r.id === id) || { id, name: 'Someone', colour: '#888' }
}

function notify(kind, text, at = Date.now()) {
  S.notifications.unshift({ id: uid(), at, kind, text, read: false })
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
  for (const s of sims) {
    const points = s.points || loopTrack({ centre: s.centre, perimeterKm: s.perimeterKm, kmh: s.kmh, startAt: s.startedAt, seed: s.seed, stretch: s.stretch, rotate: s.rotate })
    const res = processActivity({ id: 'sim-' + (s.seed ?? uid().slice(0, 8)), userId: s.userId, mode: 'run', points, source: 'watch', startedAt: s.startedAt }, { cells: S.cells.run, zones: [], battles: [], now: s.startedAt })
    if (s.loopName) res.activity.title = s.loopName
    for (const [h, c] of res.updated) S.cells.run.set(h, c)
    res.activity.kudos = Math.floor(rand() * 9)
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
  S.world = { v: WORLD_VERSION, centre, seededAt: now, lastTick: now, area: area?.id || null }
  await Promise.all([save.cells('run'), save.activities(), save.clubs(), save.world()])
  return S.world
}

// Rivals fight back: if you took their ground, they may answer within a day.
async function tick() {
  if (!S.world) return
  const now = Date.now()
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
    b.lastResponse = now
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
      S.activities.push(res.activity)
      const fromMe = res.diff.taken.filter((t) => t.from === S.user.id).length
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
  await save.world()
  if (changed) await Promise.all([save.cells('run'), save.battles(), save.notifications(), save.activities()])
}

// ---- API (docs/API.md) ----
function decorate(b, now = Date.now()) {
  return {
    ...b,
    attackerName: player(b.attacker).name,
    defenderName: player(b.defender).name,
    attackerColour: player(b.attacker).colour,
    defenderColour: player(b.defender).colour,
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
    const allowed = ['name', 'colour', 'mode', 'zones', 'units', 'onboarded', 'goal', 'homeCentre']
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
    S.activities.unshift(res.activity)
    await kv.set(`track:${res.activity.id}`, res.track)
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
    await Promise.all([save.activities(), save.cells(mode), save.battles(), save.notifications()])
    return {
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
    const list = mine ? S.activities.filter((a) => a.userId === S.user.id) : S.activities
    return { activities: list.slice(0, limit) }
  },

  async activity(id) {
    await state()
    const activity = S.activities.find((a) => a.id === id)
    if (!activity) throw new Error('That activity is gone.')
    const track = (await kv.get(`track:${id}`, null)) || []
    return { activity, track }
  },

  async appeal(id, note) {
    await state()
    const a = S.activities.find((x) => x.id === id)
    if (!a) throw new Error('That activity is gone.')
    a.appeal = { note: String(note || '').slice(0, 500), status: 'open', at: Date.now() }
    await save.activities()
    return { activity: a }
  },

  async deleteActivity(id) {
    await state()
    S.activities = S.activities.filter((a) => a.id !== id)
    await kv.del(`track:${id}`)
    await save.activities()
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
      out.push({ h3: c.h3, owner: c.owner, ownerName: pl.name, ownerColour: pl.colour, mine, strength: Math.round(strength), daysToWild: daysUntilWild(c, now) })
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

  async leaderboard({ mode = 'run', scope = 'local' } = {}) {
    await state()
    const now = Date.now()
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
      return { userId: id, name: p.name, colour: p.colour, hexes, km2: Math.round(hexes * HEX_KM2 * 100) / 100, me: id === S.user.id }
    }).sort((a, b) => b.hexes - a.hexes)
    return { rows }
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

  async rivals() {
    await state()
    const swaps = new Map()
    for (const b of S.battles) {
      const other = b.attacker === S.user.id ? b.defender : b.defender === S.user.id ? b.attacker : null
      if (other) swaps.set(other, (swaps.get(other) || 0) + b.hexes.length)
    }
    // Neighbours: rivals whose ground is near yours, even before a battle
    return {
      rivals: [...swaps.entries()].map(([id, n]) => ({ userId: id, name: player(id).name, colour: player(id).colour, swaps: n })).sort((a, b) => b.swaps - a.swaps),
    }
  },

  async feed() {
    await state()
    return {
      items: S.activities.filter((a) => !a.rejected).sort((a, b) => b.startedAt - a.startedAt).slice(0, 30)
        .map((a) => ({ activity: a, userName: player(a.userId).name, userColour: player(a.userId).colour, mine: a.userId === S.user.id })),
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
    return { user: S.user, activities: S.activities.filter((a) => a.userId === S.user.id), plan: S.plan, routes: S.routes }
  },
  async reset() {
    await kv.clearAll()
    S = null
    return { ok: true }
  },
}

// Re-exports used by the record screen for live previews.
export { findLoops, cellsForLoops, effortGain, summarise, hexIsPrivate }
