// One queue for everything Foothold says or plays during and just after a
// run (voice lines and sound effects), so nothing talks over anything else.
// Each job runs after the one before it finishes.

let tail = Promise.resolve()
let gen = 0
let waiting = 0

/** Run fn after everything already queued. Resolves when it's done. */
export function enqueue(fn) {
  const g = gen
  waiting++
  tail = tail.then(() => (g === gen ? fn() : undefined)).catch(() => {}).finally(() => { if (g === gen) waiting-- })
  return tail
}

/** True while anything is still being said or played (the admin auto run waits for it). */
export const busy = () => waiting > 0

/** Drop anything still waiting (leaving or discarding a run). */
export function clear() {
  gen++
  waiting = 0
  tail = Promise.resolve()
}
