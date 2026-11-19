// One queue for everything Foothold says or plays during and just after a
// run (voice lines and sound effects), so nothing talks over anything else.
// Each job runs after the one before it finishes.

import { logTest } from './testLog.js'

let tail = Promise.resolve()
let gen = 0
let waiting = 0
let jobAt = 0

// No one job may hold up everything after it: a sound that never says it's
// finished (a stuck player, a voice that never arrives) is let go after this
export const JOB_MAX_MS = 60000

/** Run fn after everything already queued. Resolves when it's done. */
export function enqueue(fn) {
  const g = gen
  waiting++
  tail = tail
    .then(() => {
      if (g !== gen) return undefined
      jobAt = Date.now()
      let t = 0
      const cap = new Promise((resolve) => { t = setTimeout(() => { logTest('Problem', 'A sound took over a minute, so it was skipped'); resolve() }, JOB_MAX_MS) })
      return Promise.race([Promise.resolve().then(fn), cap]).finally(() => clearTimeout(t))
    })
    .catch(() => {})
    .finally(() => { jobAt = 0; if (g === gen) waiting-- })
  return tail
}

/** How long the sound playing now has been going, in ms (0 when nothing is). */
export const jobAge = () => (jobAt ? Date.now() - jobAt : 0)

/** True while anything is still being said or played (the admin auto run waits for it). */
export const busy = () => waiting > 0

/** Drop anything still waiting (leaving or discarding a run). */
export function clear() {
  gen++
  waiting = 0
  tail = Promise.resolve()
}
