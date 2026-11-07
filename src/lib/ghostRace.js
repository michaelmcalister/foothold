// How a ghost race went, kept on this device with the activity it belongs
// to, so the result screen can say who won and the flyover can show the
// ghost's dot next to yours. Only the latest few are kept.
const PREFIX = 'fh-ghost:'
const KEEP = 20

export function saveGhostRace(activityId, race) {
  try {
    localStorage.setItem(PREFIX + activityId, JSON.stringify({ ...race, at: Date.now() }))
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))
    if (keys.length > KEEP) {
      const dated = keys.map((k) => { try { return [k, JSON.parse(localStorage.getItem(k)).at || 0] } catch { return [k, 0] } }).sort((a, b) => a[1] - b[1])
      for (const [k] of dated.slice(0, keys.length - KEEP)) localStorage.removeItem(k)
    }
  } catch { /* storage full or private mode: the race just isn't remembered */ }
}

export function ghostRace(activityId) {
  try { return JSON.parse(localStorage.getItem(PREFIX + activityId) || 'null') } catch { return null }
}
