// Remembers which finished quests this device has already celebrated, so the
// little celebration plays once. Per-device only; losing it just replays it.

const KEY = 'fh-quests-celebrated'

function read() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
}

/** Ids of quests that are done but not celebrated yet */
export function freshlyDone(quests) {
  const seen = read()
  return (quests || []).filter((q) => q.done && !seen.has(q.id)).map((q) => q.id)
}

export function markCelebrated(ids) {
  if (!ids.length) return
  const seen = read()
  for (const id of ids) seen.add(id)
  try { localStorage.setItem(KEY, JSON.stringify([...seen].slice(-60))) } catch { /* storage blocked: fine */ }
}
