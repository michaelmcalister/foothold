// Builds src/lib/missions/catalogue.json: every mission without its beats
// (title, series, episode, minutes, place, blurb, how many surges), the
// series list, the chains and each series' colours. Screens that only list stories (the map's
// Continue your story, Stories near you, the mission browser) read this
// small file, so the full scripts (about half a megabyte) only load when a
// run starts. Run by `npm run build`; test/catalogue.test.js checks it is
// up to date.
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { MISSIONS, SAGAS, CHAINS } from '../src/lib/missions/scripts.js'
import { surgeCount } from '../src/lib/missions/engine.js'
import { SERIES } from '../src/lib/missions/series/index.js'

export function catalogue() {
  const missions = MISSIONS.map(({ beats, loop, early, ...meta }) => ({ ...meta, surges: surgeCount({ beats }) }))
  const looks = Object.fromEntries(SERIES.map((x) => [x.SAGA.id, x.LOOK]))
  return { sagas: SAGAS, chains: CHAINS, looks, missions }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // only write when it changed, so `wrangler dev` (which rebuilds on changes) doesn't loop
  const file = new URL('../src/lib/missions/catalogue.json', import.meta.url)
  const next = JSON.stringify(catalogue()) + '\n'
  if (!existsSync(file) || readFileSync(file, 'utf8') !== next) { writeFileSync(file, next); console.log('catalogue written') }
}
