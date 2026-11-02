// Picks the API the app talks to, once at start-up (src/lib/auth.js decides):
// the shared Foothold server for signed-in players, otherwise the practice map
// that runs in the browser (local.js). Builds without a server (GitHub Pages)
// are always the practice map.
import { local, ensureWorld } from './local.js'
import { remote } from './remote.js'

const practice = { ...local, ensureWorld }
let current = practice

/** true on the practice map. A live binding: importers see it change at start-up. */
export let isLocal = true

/** Called by auth before the app mounts. */
export function useServer(on) {
  current = on ? remote : practice
  isLocal = !on
}

// Every call goes to whichever adapter is current
export const api = new Proxy({}, { get: (_, key) => current[key] })

/** The practice adapter itself, for copying practice runs across after signing in */
export const practiceApi = practice
