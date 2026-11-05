// Bringing practice runs across after signing up. Runs recorded on the
// practice map live only on this device; once someone has an account they can
// move them onto the real map in one go. Simulated practice loops never move
// (they're made up), and each run moves once: the device remembers which have
// gone, and the server copy is skipped if one with the same start time is
// already there.
import { practiceApi, api } from './api/index.js'

const MOVED_KEY = 'fh-moved-practice'
const DISMISS_KEY = 'fh-carry-dismissed'

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: they may be asked again */ }
}

/** Practice runs that could move: real recordings or imports, not rejected, not moved yet. */
export async function movablePractice() {
  const moved = new Set(read(MOVED_KEY, []))
  const { activities } = await practiceApi.activities({ limit: 500 })
  return activities.filter((a) => !a.simulated && !a.rejected && !moved.has(a.id))
}

export const carryDismissed = () => !!read(DISMISS_KEY, false)
export const dismissCarry = () => write(DISMISS_KEY, true)

/**
 * Moves the runs (oldest first, so ground builds up in the right order).
 * Calls onProgress(done, total). Returns { moved, skipped, failed }.
 */
export async function movePractice(list, onProgress = () => {}) {
  const moved = new Set(read(MOVED_KEY, []))
  const already = new Set(await api.activities({ limit: 200 }).then((r) => r.activities.map((a) => a.startedAt)).catch(() => []))
  const out = { moved: 0, skipped: 0, failed: 0 }
  const queue = [...list].sort((a, b) => a.startedAt - b.startedAt)
  for (let i = 0; i < queue.length; i++) {
    const a = queue[i]
    try {
      if (already.has(a.startedAt)) { out.skipped++ }
      else {
        const { track } = await practiceApi.activity(a.id)
        if (track.length >= 10) {
          await api.postActivity({ mode: a.mode, source: 'import', startedAt: a.startedAt, points: track })
          out.moved++
        } else out.skipped++
      }
      moved.add(a.id)
      write(MOVED_KEY, [...moved])
    } catch (e) {
      out.failed++
      if (/a lot of imports/i.test(e.message)) break // the daily limit: the rest can go tomorrow
    }
    onProgress(i + 1, queue.length)
  }
  return out
}
