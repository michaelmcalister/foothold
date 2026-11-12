// The light story catalogue (catalogue.json, built by scripts/catalogue.mjs):
// every mission without its beats, the series, the chains and their colours.
// Screens that only list stories use this, so the full scripts load only when
// a run starts (missions/scripts.js, through missions/index.js).
import data from './catalogue.json'

export const CATALOGUE = data.missions
export const CATALOGUE_SAGAS = data.sagas
export const CATALOGUE_CHAINS = data.chains

const byId = new Map(CATALOGUE.map((m) => [m.id, m]))
export const metaById = (id) => byId.get(id) || null

/** "24 min · Steady effort · 5 surges" from a catalogue entry or a full mission. */
export function metaLine(m, surges = m?.surges ?? 0) {
  return [`${m.minutes} min`, m.difficulty, surges ? `${surges} ${surges === 1 ? 'surge' : 'surges'}` : 'No surges'].join(' · ')
}
