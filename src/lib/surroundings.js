// What's around you, from the street map already on screen: a park (birds,
// kids playing), a main road (traffic), shops and cafes (people chatting).
// The missions use it to place real-world sounds around you. Reads the map
// tiles' own features (OpenMapTiles layers), so nothing extra is fetched
// and nothing about where you are leaves the phone. surroundingsFrom is pure.

const PARK = new Set(['park', 'playground', 'pitch', 'grass', 'garden', 'recreation_ground', 'nature_reserve', 'wood', 'forest', 'golf_course', 'dog_park'])
const MAIN_ROAD = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary'])
const SHOPS = new Set(['cafe', 'restaurant', 'shop', 'grocery', 'bakery', 'fast_food', 'bar', 'pub', 'clothing_store', 'commercial', 'retail'])

/** features: rendered map features ({ sourceLayer, properties }). Returns { park, road, shops }. */
export function surroundingsFrom(features = []) {
  let park = false, road = false, shopCount = 0
  for (const f of features) {
    const layer = f.sourceLayer || f.layer?.['source-layer'] || ''
    const cls = f.properties?.class || f.properties?.subclass || ''
    if (layer === 'park' || ((layer === 'landuse' || layer === 'landcover' || layer === 'poi') && PARK.has(cls))) park = true
    if (layer === 'transportation' && MAIN_ROAD.has(cls)) road = true
    if ((layer === 'poi' || layer === 'landuse') && SHOPS.has(cls)) shopCount++
  }
  return { park, road, shops: shopCount >= 2 }
}

/** Ask a MapLibre map what's within about `px` pixels of a point. */
export function surroundingsOnMap(map, point, px = 90) {
  if (!map || !point) return null
  try {
    const p = map.project([point.lng, point.lat])
    return surroundingsFrom(map.queryRenderedFeatures([[p.x - px, p.y - px], [p.x + px, p.y + px]]))
  } catch { return null }
}
