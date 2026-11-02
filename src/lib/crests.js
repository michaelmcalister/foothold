// Player crests: twelve simple geometric emblems drawn for Foothold, shown
// in the player's colour next to their name. Plain data so the Worker can
// check a crest id too. Each emblem is drawn in a 24 by 24 box.

export const CRESTS = [
  { id: 'chevron', name: 'Chevron', d: 'M5 8.5l7 5 7-5v4.2l-7 5-7-5z' },
  { id: 'star', name: 'Star', d: 'M12 3.5l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z' },
  { id: 'wave', name: 'Wave', d: 'M3.5 9.5c2.2-2.2 4.3-2.2 6.4 0s4.3 2.2 6.4 0 3.2-1.6 4.2-.6M3.5 15c2.2-2.2 4.3-2.2 6.4 0s4.3 2.2 6.4 0 3.2-1.6 4.2-.6', stroke: true },
  { id: 'peak', name: 'Peak', d: 'M2.5 18.5l6.5-10 3.2 4.6 3-4.6 6.3 10z' },
  { id: 'bolt', name: 'Bolt', d: 'M13.5 2.5L5.5 13.5h5.2l-1.2 8 8-11h-5.3z' },
  { id: 'leaf', name: 'Leaf', d: 'M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z' },
  { id: 'anchor', name: 'Mooring', d: 'M12 3.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM12 8v12M8 11.5h8M4.5 13.5c.8 4.2 3.8 6.5 7.5 6.5s6.7-2.3 7.5-6.5', stroke: true },
  { id: 'sun', name: 'Sun', d: 'M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zM12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7', stroke: true },
  { id: 'diamond', name: 'Diamond', d: 'M12 3l7.5 9-7.5 9-7.5-9z' },
  { id: 'crown', name: 'Ridge', d: 'M3.5 18l1.6-10 4.2 4.4L12 5.5l2.7 6.9 4.2-4.4 1.6 10z' },
  { id: 'target', name: 'Target', d: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM12 9.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4z', stroke: true },
  { id: 'arrow', name: 'Arrow', d: 'M12 3.5l7.5 7.5h-4.3v9.5H8.8V11H4.5z' },
]

export const CREST_IDS = CRESTS.map((c) => c.id)
export const isCrest = (id) => CREST_IDS.includes(id)

/** The crest to draw for a player: theirs if they picked one, otherwise one picked from their id */
export function crestFor(id, crest) {
  if (isCrest(crest)) return crest
  let h = 0
  for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return CREST_IDS[h % CREST_IDS.length]
}

export const crestById = (id) => CRESTS.find((c) => c.id === id) || CRESTS[0]
