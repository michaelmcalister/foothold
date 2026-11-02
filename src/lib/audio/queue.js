// One queue for everything Foothold says or plays during and just after a
// run (voice lines and sound effects), so nothing talks over anything else.
// Each job runs after the one before it finishes.

let tail = Promise.resolve()
let gen = 0

/** Run fn after everything already queued. Resolves when it's done. */
export function enqueue(fn) {
  const g = gen
  tail = tail.then(() => (g === gen ? fn() : undefined)).catch(() => {})
  return tail
}

/** Drop anything still waiting (leaving or discarding a run). */
export function clear() {
  gen++
  tail = Promise.resolve()
}
