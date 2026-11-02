// Remote adapter: calls the Foothold Worker (worker/, docs/API.md).
// Used when VITE_API_URL is set at build time.

// 'self' means the Worker serving this page also serves the API (same origin)
const RAW = import.meta.env.VITE_API_URL || ''
const BASE = RAW === 'self' ? '' : RAW.replace(/\/$/, '')
let tokenGetter = async () => null

export function setTokenGetter(fn) { tokenGetter = fn }

function deviceId() {
  try {
    let id = localStorage.getItem('fh-device')
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('fh-device', id) }
    return id
  } catch { return 'anon' }
}

async function call(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = await tokenGetter()
  if (token) headers.Authorization = `Bearer ${token}`
  else headers['X-Device-Id'] = deviceId()
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}). Try again in a moment.`)
  return data
}

const q = (o) => '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString()

export const remote = {
  kind: 'remote',
  me: () => call('GET', '/api/me'),
  updateMe: (patch) => call('PUT', '/api/me', patch),
  postActivity: (body) => call('POST', '/api/activities', body),
  activities: ({ limit = 50 } = {}) => call('GET', '/api/activities' + q({ limit })),
  activity: (id) => call('GET', `/api/activities/${encodeURIComponent(id)}`),
  appeal: (id, note) => call('POST', `/api/activities/${encodeURIComponent(id)}/appeal`, { note }),
  deleteActivity: (id) => call('DELETE', `/api/activities/${encodeURIComponent(id)}`),
  territory: ({ mode = 'run', bbox } = {}) => call('GET', '/api/territory' + q({ mode, bbox: bbox?.map((n) => n.toFixed(5)).join(',') })),
  stats: ({ mode = 'run' } = {}) => call('GET', '/api/stats' + q({ mode })),
  leaderboard: ({ mode = 'run', scope = 'local', lat, lng } = {}) => call('GET', '/api/leaderboard' + q({ mode, scope, lat, lng })),
  clubBoard: async () => ({ rows: (await call('GET', '/api/clubs')).clubs }),
  battles: () => call('GET', '/api/battles'),
  rivals: () => call('GET', '/api/rivals'),
  feed: () => call('GET', '/api/feed'),
  kudos: (id) => call('POST', `/api/activities/${encodeURIComponent(id)}/kudos`),
  clubs: () => call('GET', '/api/clubs'),
  createClub: (name) => call('POST', '/api/clubs', { name }),
  joinClub: (id) => call('POST', `/api/clubs/${encodeURIComponent(id)}/join`),
  leaveClub: (id) => call('POST', `/api/clubs/${encodeURIComponent(id || 'mine')}/leave`),
  plan: () => call('GET', '/api/plan'),
  savePlan: (plan) => call('PUT', '/api/plan', { plan }),
  notifications: () => call('GET', '/api/notifications'),
  readNotifications: (ids) => call('POST', '/api/notifications/read', { ids }),
  linkFormtrack: (token) => call('POST', '/api/integrations/formtrack', { token }),
  unlinkFormtrack: () => call('DELETE', '/api/integrations/formtrack'),
  formtrackSummary: () => call('GET', '/api/integrations/formtrack/summary').catch(() => null),
  feedback: (body) => call('POST', '/api/feedback', body),
  routes: () => call('GET', '/api/routes'),
  saveRoute: (body) => call('POST', '/api/routes', body),
  deleteRoute: (id) => call('DELETE', `/api/routes/${encodeURIComponent(id)}`),
  // The server holds the world; nothing to seed.
  ensureWorld: async () => null,
  loadFor: async () => null,
  cellsMap: async () => null,
  exportData: async () => ({ ...(await call('GET', '/api/me')), routes: (await call('GET', '/api/routes')).routes }),
  reset: async () => ({ ok: true }),
}
