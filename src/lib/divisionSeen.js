// Remembers which division promotions this device has already celebrated, so "You moved up" and its sound play once. Per-device only.

const KEY = 'fh-division-celebrated'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

/** True if this promotion ({ week, tier }) hasn't been celebrated on this device yet */
export const freshPromotion = (p) => !!p && !read().includes(`${p.week}:${p.tier?.id}`)

export function markPromotionSeen(p) {
  if (!p) return
  const seen = read()
  seen.push(`${p.week}:${p.tier?.id}`)
  try { localStorage.setItem(KEY, JSON.stringify(seen.slice(-20))) } catch { /* storage blocked: fine */ }
}
