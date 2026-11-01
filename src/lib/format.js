// Formatting for distances, paces and times, in metric and Australian English.

export function km(m, dp = 2) {
  if (m == null) return '0'
  return (m / 1000).toFixed(m >= 10000 ? 1 : dp)
}

export function pace(sPerKm) {
  if (!sPerKm || !Number.isFinite(sPerKm) || sPerKm > 3600) return '--:--'
  const m = Math.floor(sPerKm / 60)
  const s = Math.round(sPerKm % 60)
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, '0')}`
}

export function speedKmh(sPerKm) {
  if (!sPerKm) return '0.0'
  return (3600 / sPerKm).toFixed(1)
}

export function duration(s) {
  s = Math.max(0, Math.round(s || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

export function ago(t, now = Date.now()) {
  const d = Math.round((now - t) / 60000)
  if (d < 1) return 'just now'
  if (d < 60) return `${d} min ago`
  const h = Math.round(d / 60)
  if (h < 24) return `${h} h ago`
  const days = Math.round(h / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function dateLong(t) {
  return new Date(t).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function plural(n, one, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`
}

export const MODE_LABEL = { run: 'Run', walk: 'Walk', ride: 'Ride' }
export const MODE_VERB = { run: 'run', walk: 'walk', ride: 'ride' }
