// Group runs on this phone: the crew you're running with (worker/groups.js).
// Holds the group, polls it every few seconds while the lobby or the run is
// open, sends your surges and your vote at each choice, and a little after
// you vote, works out which way the crew went (most votes; your own pick
// when nobody else has voted yet). runAudio.js calls voteAndWait at a
// choice and swaps the story's branch when the crew went the other way.
import { track } from './analytics.js'
import { reactive } from 'vue'
import { api } from './api/index.js'

export const TALLY_MS = 12000 // the branch's surge starts about 20 s after the answer
const POLL_MS = 5000

export const crew = reactive({ group: null, error: '', busy: false })
let poll = null

/** The crew's pick: most votes, a tie goes to the first pick counted; mine when no one has voted. Pure. */
export function crewPick(counts = {}, mine = null) {
  let best = mine
  let n = 0
  for (const [k, c] of Object.entries(counts)) if (c > n) { best = k; n = c }
  return best
}

/** What the lobby says about who is in. Pure. */
export function lobbyLine(group) {
  if (!group) return ''
  const others = group.members.filter((m) => !m.you)
  if (!others.length) return 'Just you so far. Share the code and wait for your crew.'
  const names = others.map((m) => m.name)
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return `${list} ${names.length === 1 ? 'is' : 'are'} in.`
}

/** Seconds until the shared start, or null before the host starts it. Pure. */
export function countdown(group, nowMs = Date.now(), skewMs = 0) {
  if (!group?.startAt) return null
  return Math.max(0, Math.ceil((group.startAt - (nowMs + skewMs)) / 1000))
}

let skew = 0 // the server's clock minus ours, so every phone counts down together
function take(g) {
  if (!g) return
  if (g.now) skew = g.now - Date.now()
  crew.group = g
}
export const serverNow = () => Date.now() + skew

function watch() {
  clearInterval(poll)
  poll = setInterval(refresh, POLL_MS)
}

export async function refresh() {
  if (!crew.group) return
  try { take(await api.group(crew.group.id)) } catch (e) {
    if (/finished|not in it/.test(e.message)) leave({ quiet: true })
  }
}

async function act(fn) {
  crew.busy = true
  crew.error = ''
  try { take(await fn()); watch() } catch (e) { crew.error = e.message } finally { crew.busy = false }
}

export const createGroup = (missionId) => { track('group_made', { mission: missionId }); return act(() => api.groupCreate(missionId)) }
export const joinGroup = (code) => { track('group_joined'); return act(() => api.groupJoin(code)) }
export const startGroup = () => crew.group && act(() => api.groupStart(crew.group.id))

export async function leave({ quiet = false } = {}) {
  clearInterval(poll)
  const g = crew.group
  crew.group = null
  crew.error = ''
  if (g && !quiet) await api.groupLeave(g.id).catch(() => {})
}

/** True while running with a crew that has started. */
export const inCrew = () => !!crew.group?.startAt

/** After a surge, or at the finish: let the crew see how you're going. */
export function sendProgress({ surges, done = false, final = false }) {
  const g = crew.group
  if (!g?.startAt) return
  if (final) { clearInterval(poll); crew.group = null } // the run is over: stop checking in
  api.groupProgress(g.id, { surges, done }).then((x) => { if (!final) take(x) }).catch(() => {})
}

/**
 * Vote at a choice, wait a little for the others, and resolve to the crew's
 * pick (or null when the crew went your way, or there is no crew).
 */
export async function voteAndWait(choiceId, mine, { wait = TALLY_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const g = crew.group
  if (!g?.startAt || g.members.length < 2) return null
  await api.groupVote(g.id, choiceId, mine).then(take).catch(() => {})
  await sleep(wait)
  await refresh()
  const counts = crew.group?.votes?.[choiceId]?.counts
  const pick = crewPick(counts, mine)
  return pick && pick !== mine ? pick : null
}

/** A line for the crew's surges, said now and then. Pure. */
export function crewLine(group, you) {
  const others = (group?.members || []).filter((m) => !m.you)
  if (!others.length) return null
  const ahead = others.filter((m) => m.surges > you).map((m) => m.name)
  const done = others.filter((m) => m.done).map((m) => m.name)
  if (done.length) return `${done[0]} has finished the episode. Bring it home.`
  if (ahead.length) return `${ahead[0]} is a surge ahead of you. Reel them in.`
  return `You're level with your crew or in front. Keep it up.`
}
