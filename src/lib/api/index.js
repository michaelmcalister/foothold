// Picks the API the app talks to: the Worker when VITE_API_URL is set,
// otherwise the in-browser game (local.js), which works on GitHub Pages.
import { local, ensureWorld } from './local.js'
import { remote } from './remote.js'

export const api = import.meta.env.VITE_API_URL ? remote : { ...local, ensureWorld }
export const isLocal = api.kind !== 'remote'
