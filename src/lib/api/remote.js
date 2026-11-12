// Remote adapter: calls the Foothold Worker (worker/, docs/API.md).
// Used when VITE_API_URL is set at build time.

// 'self' means the Worker serving this page also serves the API (same origin)
const RAW = import.meta.env.VITE_API_URL || ''
const BASE = RAW === 'self' ? '' : RAW.replace(/\/$/, '')
let tokenGetter = async () => null

export function setTokenGetter(fn) { tokenGetter = fn }

/** The sign-in header for calls made outside this adapter (the coach voice), or nothing. */
export async function authHeader() {
  try {
    const t = await tokenGetter()
    return t ? { Authorization: `Bearer ${t}` } : {}
  } catch { return {} }
}

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
  checkin: (id, body) => call('POST', `/api/activities/${encodeURIComponent(id)}/checkin`, body),
  deleteActivity: (id) => call('DELETE', `/api/activities/${encodeURIComponent(id)}`),
  territory: ({ mode = 'run', bbox } = {}) => call('GET', '/api/territory' + q({ mode, bbox: bbox?.map((n) => n.toFixed(5)).join(',') })),
  stats: ({ mode = 'run' } = {}) => call('GET', '/api/stats' + q({ mode })),
  leaderboard: ({ mode = 'run', scope = 'local', board, lat, lng } = {}) => call('GET', '/api/leaderboard' + q({ mode, scope, board, lat, lng })),
  season: () => call('GET', '/api/season'),
  clubBoard: async () => ({ rows: (await call('GET', '/api/clubs')).clubs }),
  battles: () => call('GET', '/api/battles'),
  rivals: ({ mode } = {}) => call('GET', '/api/rivals' + q({ mode })),
  feed: () => call('GET', '/api/feed'),
  kudos: (id) => call('POST', `/api/activities/${encodeURIComponent(id)}/kudos`),
  comments: (id) => call('GET', `/api/activities/${encodeURIComponent(id)}/comments`),
  addComment: (id, text) => call('POST', `/api/activities/${encodeURIComponent(id)}/comments`, { text }),
  deleteComment: (id, cid) => call('DELETE', `/api/activities/${encodeURIComponent(id)}/comments/${encodeURIComponent(cid)}`),
  reportComment: (id, cid, reason) => call('POST', `/api/activities/${encodeURIComponent(id)}/comments/${encodeURIComponent(cid)}/report`, { reason }),
  leagues: () => call('GET', '/api/leagues'),
  createLeague: (name) => call('POST', '/api/leagues', { name }),
  joinLeague: (code) => call('POST', '/api/leagues/join', { code }),
  leaveLeague: (id) => call('POST', `/api/leagues/${encodeURIComponent(id)}/leave`),
  league: (id, { mode } = {}) => call('GET', `/api/leagues/${encodeURIComponent(id)}` + q({ mode })),
  // Practice mode only; real friends join with the invite link
  invitePractice: async () => { throw new Error('Share the invite link to bring friends in.') },
  clubs: () => call('GET', '/api/clubs'),
  createClub: (name) => call('POST', '/api/clubs', { name }),
  joinClub: (id) => call('POST', `/api/clubs/${encodeURIComponent(id)}/join`),
  leaveClub: (id) => call('POST', `/api/clubs/${encodeURIComponent(id || 'mine')}/leave`),
  plan: () => call('GET', '/api/plan'),
  savePlan: (plan) => call('PUT', '/api/plan', { plan }),
  // AI built plans (worker/aiplan.js): public on the server, signed-in players are also limited per account
  aiConfig: () => fetch(BASE + '/api/config', { signal: AbortSignal.timeout(4000) }).then((r) => (r.ok ? r.json() : {})),
  planAi: (body) => call('POST', '/api/plan/ai', body),
  notifications: () => call('GET', '/api/notifications'),
  readNotifications: (ids) => call('POST', '/api/notifications/read', { ids }),
  linkFormtrack: (token) => call('POST', '/api/integrations/formtrack', { token }),
  unlinkFormtrack: () => call('DELETE', '/api/integrations/formtrack'),
  formtrackSummary: () => call('GET', '/api/integrations/formtrack/summary').catch(() => null),
  feedback: (body) => call('POST', '/api/feedback', body),
  storyRequest: (body) => call('POST', '/api/story-requests', body),
  // Story progress with the account (worker/missions.js)
  missionProgress: () => call('GET', '/api/missions/progress'),
  missionTry: (body) => call('POST', '/api/missions/progress', body),
  // Real names nearby, for stories on your own streets (worker/nearby.js)
  nearby: ({ lat, lng }) => call('GET', '/api/nearby' + q({ lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 })),
  // The story season (worker/storySeason.js)
  storySeason: () => call('GET', '/api/story-season'),
  // Capture the story (worker/storyflags.js)
  storyFlag: (body) => call('POST', '/api/stories/flag', body),
  storyFlags: (mission) => call('GET', '/api/stories/flags' + q({ mission })),
  // Foothold Plus (worker/billing.js)
  plusStatus: () => call('GET', '/api/billing/status'),
  plusCheckout: () => call('POST', '/api/billing/checkout'),
  plusPortal: () => call('POST', '/api/billing/portal'),
  adminPlus: (userId, on) => call('POST', '/api/admin/plus', { userId, on }),
  // Push notifications (worker/push.js)
  pushSubscribe: (body) => call('POST', '/api/push', body),
  pushUnsubscribe: (body) => call('DELETE', '/api/push', body),
  pushTest: () => call('POST', '/api/push/test'),
  // The owner's admin page (worker/admin.js): what is overview, ideas, feedback, reports or ai
  admin: (what, query = '') => call('GET', `/api/admin/${what}${query}`),
  adminAct: (what, id, body) => call('POST', `/api/admin/${what}/${encodeURIComponent(id)}`, body),
  routes: () => call('GET', '/api/routes'),
  saveRoute: (body) => call('POST', '/api/routes', body),
  deleteRoute: (id) => call('DELETE', `/api/routes/${encodeURIComponent(id)}`),
  // Sending routes to your crew (people in your clubs and leagues)
  crew: () => call('GET', '/api/crew'),
  shareRoute: (id, { to, plannedAt } = {}) => call('POST', `/api/routes/${encodeURIComponent(id)}/share`, plannedAt === undefined ? { to } : { to, plannedAt }),
  sharedRoutes: () => call('GET', '/api/routes/shared'),
  hideSharedRoute: (id) => call('DELETE', `/api/routes/shared/${encodeURIComponent(id)}`),
  explored: ({ mode } = {}) => call('GET', '/api/explored' + q({ mode })),
  quests: () => call('GET', '/api/quests'),
  week: ({ w } = {}) => call('GET', '/api/week' + q({ w })),
  streak: () => call('GET', '/api/streak'),
  division: () => call('GET', '/api/division'),
  divisionHistory: () => call('GET', '/api/division/history'),
  bests: ({ mode = 'run' } = {}) => call('GET', '/api/bests' + q({ mode })),
  strongholds: ({ mode = 'run', bbox } = {}) => call('GET', '/api/strongholds' + q({ mode, bbox: bbox?.map((n) => n.toFixed(5)).join(',') })),
  stronghold: (id, { mode = 'run' } = {}) => call('GET', `/api/strongholds/${encodeURIComponent(id)}` + q({ mode })),
  // King of the hill
  hills: ({ mode = 'run', bbox } = {}) => call('GET', '/api/hills' + q({ mode, bbox: bbox?.map((n) => n.toFixed(5)).join(',') })),
  hill: (id) => call('GET', `/api/hills/${encodeURIComponent(id)}`),
  // The server holds the world; nothing to seed.
  ensureWorld: async () => null,
  loadFor: async () => null,
  cellsMap: async () => null,
  exportData: () => call('GET', '/api/me/export'),
  // Foothold Wrapped: your year's activities, who you swapped ground with, and your records
  year: ({ year } = {}) => call('GET', '/api/me/year' + q({ year })),
  deleteAccount: () => call('DELETE', '/api/me'),
  reset: async () => ({ ok: true }),
}
