// The recording in progress, kept on the phone (localStorage) so a closed
// page or a failed save never loses a run. Points go in chunks of CHUNK, and
// each save only writes the chunk that changed plus a small header, so a
// three hour run costs the same to keep as a three minute one. One older
// recording can be parked when a new one starts, so starting again never
// wipes a run that hasn't been saved yet. Used by recorder.js.
export const CHUNK = 200
const KEY = 'fh-recording'
const PARKED = 'fh-recording-parked'
const r6 = (n) => Math.round(n * 1e6) / 1e6
const pack = (p) => [r6(p.lat), r6(p.lng), p.t, p.acc ?? null, p.alt ?? null]
const unpack = ([lat, lng, t, acc, alt]) => {
  const p = { lat, lng, t }
  if (acc != null) p.acc = acc
  if (alt != null) p.alt = alt
  return p
}

const written = new Map() // prefix -> how many points are already stored in full chunks

function headerOf(store, prefix) {
  try { return JSON.parse(store.getItem(prefix) || 'null') } catch { return null }
}

/** Keep the run. Throws when storage is full (the caller tells the runner). */
export function saveRun(store, { mode, startedAt, points }, prefix = KEY) {
  const head = headerOf(store, prefix)
  let from = written.get(prefix) ?? 0
  if (!head || head.startedAt !== startedAt || from > points.length) from = 0
  from -= from % CHUNK
  const chunks = Math.ceil(points.length / CHUNK)
  for (let c = from / CHUNK; c < chunks; c++) {
    store.setItem(`${prefix}:${c}`, JSON.stringify(points.slice(c * CHUNK, (c + 1) * CHUNK).map(pack)))
  }
  for (let c = chunks; c < (head?.chunks || 0); c++) store.removeItem(`${prefix}:${c}`)
  store.setItem(prefix, JSON.stringify({ v: 2, mode, startedAt, chunks, count: points.length, savedAt: Date.now() }))
  written.set(prefix, Math.floor(points.length / CHUNK) * CHUNK)
}

/** The kept run, or null. Reads the old one-piece format too. */
export function loadRun(store, prefix = KEY) {
  const head = headerOf(store, prefix)
  if (!head) return null
  if (Array.isArray(head.points)) return head // saved before chunks
  const points = []
  for (let c = 0; c < head.chunks; c++) {
    try { points.push(...JSON.parse(store.getItem(`${prefix}:${c}`) || '[]').map(unpack)) } catch { /* a lost chunk: the rest still counts */ }
  }
  return { mode: head.mode, startedAt: head.startedAt, points, savedAt: head.savedAt }
}

export function clearRun(store, prefix = KEY) {
  const head = headerOf(store, prefix)
  for (let c = 0; c < (head?.chunks || 0); c++) store.removeItem(`${prefix}:${c}`)
  store.removeItem(prefix)
  written.delete(prefix)
}

/** Starting a new recording: an unsaved one moves aside rather than being wiped. */
export function parkRun(store) {
  const u = loadRun(store)
  if (!u?.points?.length || u.points.length < 2) return clearRun(store)
  clearRun(store, PARKED)
  saveRun(store, u, PARKED)
  clearRun(store)
}

/** The run waiting to be saved: the current one, else the parked one. */
export function waitingRun(store) {
  const now = loadRun(store)
  if (now?.points?.length > 1) return { ...now, slot: KEY }
  const parked = loadRun(store, PARKED)
  return parked?.points?.length > 1 ? { ...parked, slot: PARKED } : null
}

export const clearSlot = (store, slot) => clearRun(store, slot === PARKED ? PARKED : KEY)
