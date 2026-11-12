// GET /api/nearby?lat=&lng=: real names from around you, for stories set on
// your own streets (missions/local.js). The position is rounded to two
// decimal places (about a kilometre) before anything leaves the worker, and
// only that rounded point goes to OpenStreetMap's Overpass service. Results
// are cached per rounded point for a week. Names only, never addresses.

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const round = (v) => Math.round(Number(v) * 100) / 100

export function overpassQuery(lat, lng) {
  return `[out:json][timeout:15];
(
  way[leisure~"^(park|playground|nature_reserve)$"][name](around:1500,${lat},${lng});
  way[highway~"^(residential|tertiary|secondary|unclassified|living_street)$"][name](around:900,${lat},${lng});
  nwr[amenity~"^(library|school|community_centre|fountain|townhall)$"][name](around:1800,${lat},${lng});
  nwr[natural=water][name](around:2500,${lat},${lng});
  way[waterway~"^(creek|river|stream)$"][name](around:2500,${lat},${lng});
  node[place~"^(suburb|neighbourhood|town|village)$"][name](around:4000,${lat},${lng});
);
out tags center 300;`
}

const dist = (a, b) => Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180))

/** Sort Overpass elements into named lists, nearest first. Pure. */
export function sortPlaces(elements, here) {
  const where = (e) => ({ lat: e.lat ?? e.center?.lat ?? here.lat, lng: e.lon ?? e.center?.lon ?? here.lng })
  const buckets = { suburb: [], parks: [], streets: [], landmarks: [], water: [] }
  for (const e of elements || []) {
    const t = e.tags || {}
    const name = String(t.name || '').trim()
    if (!name || name.length > 40) continue
    const d = dist(where(e), here)
    if (t.place) buckets.suburb.push([name, d])
    else if (t.leisure) buckets.parks.push([name, d])
    else if (t.highway) buckets.streets.push([name, d])
    else if (t.amenity) buckets.landmarks.push([name, d])
    else if (t.natural || t.waterway) buckets.water.push([name, d])
  }
  const names = (list, n) => [...new Map(list.sort((a, b) => a[1] - b[1]).map(([nm]) => [nm.toLowerCase(), nm])).values()].slice(0, n)
  return { suburb: names(buckets.suburb, 1)[0] || null, parks: names(buckets.parks, 4), streets: names(buckets.streets, 4), landmarks: names(buckets.landmarks, 3), water: names(buckets.water, 2) }
}

export async function handleNearby(url, { fetcher = fetch, cache = globalThis.caches?.default } = {}) {
  const lat = round(url.searchParams.get('lat'))
  const lng = round(url.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { status: 400, error: 'Send a latitude and longitude.' }
  const key = new Request(`https://nearby.foothold.cache/${lat}/${lng}`)
  const hit = cache ? await cache.match(key).catch(() => null) : null
  if (hit) return hit.json()
  let out = { suburb: null, parks: [], streets: [], landmarks: [], water: [] }
  try {
    const r = await fetcher(OVERPASS, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'Foothold running app (foothold.com.au)' },
      body: 'data=' + encodeURIComponent(overpassQuery(lat, lng)),
      signal: AbortSignal.timeout(12000),
    })
    if (r.ok) out = sortPlaces((await r.json()).elements, { lat, lng })
    else console.error('nearby', r.status)
  } catch (e) {
    console.error('nearby', e?.message) // never the position
  }
  if (cache && (out.parks.length || out.streets.length)) await cache.put(key, new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=604800' } })).catch(() => {})
  return out
}
