// Push notifications: the in-app notices (the notifications table) also go
// to people's phones and browsers when they've said yes. Every 15 minutes
// the cron gathers notices not yet pushed and sends each player at most one
// push (several notices fold into one), never at night in Sydney, and no
// more than DAILY_CAP a day. Players choose which kinds in Settings.
//
// Two ways out:
//   - web push (browsers, and the iPhone home-screen app): RFC 8291
//     encryption and RFC 8292 VAPID, all with WebCrypto. Needs the secrets
//     VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (`npm run vapid` makes a pair).
//   - Firebase Cloud Messaging for the iPhone and Android apps. Needs the
//     secret FCM_SERVICE_ACCOUNT (the service account JSON).
// Without the secrets, nothing is sent and notices stay in the app as now.
// Pushes carry the notice text only: never locations or run data.
import { uid, parse } from './db.js'

export const DAILY_CAP = 2
export const QUIET = { from: 21, to: 7 } // 9 pm to 7 am, Sydney time
const MAX_AGE = 6 * 3600 * 1000 // older notices just wait in the app

// Which notice kinds fall under which switch in Settings
export const GROUPS = {
  rivals: ['taken', 'battle', 'stronghold', 'hill', 'comment', 'route'],
  ground: ['fade', 'streak', 'division'],
  stories: ['story', 'season'],
  weekly: ['week'],
}
const groupOf = (kind) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(kind)) || 'rivals'
export const DEFAULT_PREFS = { on: true, rivals: true, ground: true, stories: true, weekly: true }

const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), (c) => c.charCodeAt(0))
const enc = new TextEncoder()
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of parts) { out.set(p, i); i += p.length }
  return out
}

export const pushOn = (env) => ({ web: !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY), fcm: !!env.FCM_SERVICE_ACCOUNT })

/** The hour in Sydney, for quiet hours. */
export function sydneyHour(now) {
  return Number(new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Australia/Sydney' }).format(new Date(now)))
}
export const isQuiet = (now) => { const h = sydneyHour(now); return h >= QUIET.from || h < QUIET.to }
/** Start of today in Sydney, in ms (for the daily cap). */
export function sydneyDayStart(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now))
  const v = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]))
  return now - ((v.hour * 60 + v.minute) * 60 + v.second) * 1000 - (now % 1000)
}

/** What a player wants pushed, from their prefs. */
export function prefsOf(userPrefs) {
  return { ...DEFAULT_PREFS, ...(parse(userPrefs, {})?.push || {}) }
}

/** Fold a player's waiting notices into one push: { title, body, url, ids } */
export function digest(notices) {
  const list = [...notices].sort((a, b) => b.at - a.at)
  const top = list[0]
  const more = list.length - 1
  return {
    title: 'Foothold',
    body: more > 0 ? `${top.text} And ${more} more thing${more === 1 ? '' : 's'} waiting.` : top.text,
    url: top.kind === 'story' || top.kind === 'season' ? '/app/record' : top.kind === 'week' ? '/app/week' : '/app/notifications',
    ids: list.map((n) => n.id),
  }
}

// ---------- web push (RFC 8291, RFC 8292) ----------

async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

/** Encrypt a payload for one browser subscription (aes128gcm). */
export async function encryptPayload(payload, p256dh, authSecret, { salt = crypto.getRandomValues(new Uint8Array(16)), keys } = {}) {
  const uaPublic = unb64u(p256dh)
  const auth = unb64u(authSecret)
  const local = keys || (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']))
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256))
  const prkKey = await hmac(auth, shared)
  const ikm = (await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))).slice(0, 32)
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const plain = concat(enc.encode(payload), new Uint8Array([2])) // one record, the last
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain))
  const header = new Uint8Array(21)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = asPublic.length
  return concat(header, asPublic, cipher)
}

/** A VAPID Authorization header for an endpoint. */
export async function vapidHeader(endpoint, env, now = Date.now()) {
  const jwk = { ...JSON.parse(env.VAPID_PRIVATE_KEY), key_ops: ['sign'], ext: true }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:support@foothold.com.au' })))
  const sig = b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`)))
  return `vapid t=${head}.${body}.${sig}, k=${env.VAPID_PUBLIC_KEY}`
}

async function sendWeb(sub, message, env, fetcher) {
  const body = await encryptPayload(JSON.stringify(message), sub.p256dh, sub.auth)
  return fetcher(sub.endpoint, {
    method: 'POST',
    headers: { 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '21600', urgency: 'normal', authorization: await vapidHeader(sub.endpoint, env) },
    body,
  })
}

// ---------- Firebase Cloud Messaging (the phone apps) ----------

let fcmToken = { at: 0, token: null }
async function fcmAccess(env, fetcher, now = Date.now()) {
  if (fcmToken.token && now - fcmToken.at < 50 * 60 * 1000) return fcmToken.token
  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT)
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const iat = Math.floor(now / 1000)
  const head = b64u(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claims = b64u(enc.encode(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 })))
  const sig = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${head}.${claims}`)))
  const r = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${head}.${claims}.${sig}`,
  })
  if (!r.ok) throw new Error(`fcm auth ${r.status}`)
  fcmToken = { at: now, token: (await r.json()).access_token }
  return fcmToken.token
}

async function sendFcm(sub, message, env, fetcher) {
  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT)
  const token = await fcmAccess(env, fetcher)
  return fetcher(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: sub.endpoint,
        notification: { title: message.title, body: message.body },
        data: { url: message.url },
        android: { priority: 'normal', notification: { channel_id: 'foothold' } },
        apns: { payload: { aps: { sound: 'default' } } },
      },
    }),
  })
}

/** Send one message to one subscription. Returns 'ok', 'gone' (remove it) or 'fail'. */
export async function deliver(sub, message, env, fetcher = fetch) {
  try {
    const on = pushOn(env)
    if (sub.kind === 'web' && !on.web) return 'fail'
    if (sub.kind === 'fcm' && !on.fcm) return 'fail'
    const r = sub.kind === 'web' ? await sendWeb(sub, message, env, fetcher) : await sendFcm(sub, message, env, fetcher)
    if (r.ok) return 'ok'
    if (r.status === 404 || r.status === 410) return 'gone'
    if (sub.kind === 'fcm' && r.status === 400) {
      const t = await r.text().catch(() => '')
      if (/UNREGISTERED|INVALID_ARGUMENT/.test(t)) return 'gone'
    }
    console.error('push', sub.kind, r.status) // never the endpoint or the text
    return 'fail'
  } catch (e) {
    console.error('push', sub.kind, e?.message)
    return 'fail'
  }
}

/**
 * The cron: push waiting notices. Returns how many players got a push.
 * Quiet hours and the daily cap leave notices waiting for later.
 */
export async function pushWaiting(env, now = Date.now(), fetcher = fetch) {
  const on = pushOn(env)
  if (!on.web && !on.fcm) return 0
  if (isQuiet(now)) return 0
  const waiting = (await env.DB.prepare(
    `SELECT n.id, n.user_id, n.kind, n.text, n.at, u.prefs FROM notifications n
     JOIN users u ON u.id = n.user_id
     WHERE n.pushed_at IS NULL AND n.read = 0 AND n.at >= ?
       AND n.user_id IN (SELECT user_id FROM push_subs)
     ORDER BY n.at DESC LIMIT 2000`,
  ).bind(now - MAX_AGE).all()).results
  if (!waiting.length) return 0
  const byUser = new Map()
  for (const n of waiting) {
    if (!byUser.has(n.user_id)) byUser.set(n.user_id, [])
    byUser.get(n.user_id).push(n)
  }
  const dayStart = sydneyDayStart(now)
  let sent = 0
  for (const [userId, list] of byUser) {
    const prefs = prefsOf(list[0].prefs)
    const wanted = prefs.on ? list.filter((n) => prefs[groupOf(n.kind)] !== false) : []
    const skipped = list.filter((n) => !wanted.includes(n))
    // Notices they switched off are marked so we never look at them again
    if (skipped.length) await markPushed(env, skipped.map((n) => n.id), 1) // 1: looked at, not sent
    if (!wanted.length) continue
    const today = await env.DB.prepare('SELECT COUNT(DISTINCT pushed_at) AS n FROM notifications WHERE user_id = ? AND pushed_at >= ? AND pushed_at > 1').bind(userId, dayStart).first()
    if ((today?.n || 0) >= DAILY_CAP) continue // waits in the app; tomorrow's push may fold it in
    const message = digest(wanted)
    const subs = (await env.DB.prepare('SELECT * FROM push_subs WHERE user_id = ?').bind(userId).all()).results
    let any = false
    for (const sub of subs) {
      const r = await deliver(sub, message, env, fetcher)
      if (r === 'ok') { any = true; await env.DB.prepare('UPDATE push_subs SET last_ok = ?, fails = 0 WHERE id = ?').bind(now, sub.id).run() }
      else if (r === 'gone') await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(sub.id).run()
      else await env.DB.prepare('UPDATE push_subs SET fails = fails + 1 WHERE id = ?').bind(sub.id).run()
    }
    await env.DB.prepare('DELETE FROM push_subs WHERE user_id = ? AND fails >= 10').bind(userId).run()
    if (any) { await markPushed(env, message.ids, now); sent++ }
  }
  return sent
}

async function markPushed(env, ids, now) {
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90)
    await env.DB.prepare(`UPDATE notifications SET pushed_at = ? WHERE id IN (${chunk.map(() => '?').join(',')})`).bind(now, ...chunk).run()
  }
}

// ---------- the API ----------

const isEndpoint = (s) => typeof s === 'string' && s.length < 1000 && /^https:\/\/[^\s]+$/.test(s)
const isKey = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{16,200}$/.test(s)

/** POST/DELETE /api/push and POST /api/push/test. Returns undefined for other paths. */
export async function pushRoute({ env, user, path, m, body, now, fetcher = fetch }) {
  if (path === '/api/push' && m === 'POST') {
    let row
    if (body?.kind === 'web') {
      if (!isEndpoint(body.endpoint) || !isKey(body.keys?.p256dh) || !isKey(body.keys?.auth)) return { status: 400, error: "That push subscription doesn't look right." }
      row = { kind: 'web', endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, platform: 'web' }
    } else if (body?.kind === 'fcm') {
      if (typeof body.token !== 'string' || !/^[\w:.-]{20,4096}$/.test(body.token)) return { status: 400, error: "That phone token doesn't look right." }
      row = { kind: 'fcm', endpoint: body.token, p256dh: null, auth: null, platform: ['ios', 'android'].includes(body.platform) ? body.platform : 'app' }
    } else return { status: 400, error: 'Send a web subscription or a phone token.' }
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs WHERE user_id = ?').bind(user.id).first()
    if ((count?.n || 0) >= 10) await env.DB.prepare('DELETE FROM push_subs WHERE id IN (SELECT id FROM push_subs WHERE user_id = ? ORDER BY created_at LIMIT 1)').bind(user.id).run()
    await env.DB.prepare(
      `INSERT INTO push_subs (id, user_id, kind, endpoint, p256dh, auth, platform, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, fails = 0`,
    ).bind(uid(), user.id, row.kind, row.endpoint, row.p256dh, row.auth, row.platform, now).run()
    return { ok: true }
  }
  if (path === '/api/push' && m === 'DELETE') {
    const endpoint = body?.endpoint || body?.token
    if (endpoint) await env.DB.prepare('DELETE FROM push_subs WHERE user_id = ? AND endpoint = ?').bind(user.id, String(endpoint)).run()
    else await env.DB.prepare('DELETE FROM push_subs WHERE user_id = ?').bind(user.id).run()
    return { ok: true }
  }
  if (path === '/api/push/test' && m === 'POST') {
    const subs = (await env.DB.prepare('SELECT * FROM push_subs WHERE user_id = ?').bind(user.id).all()).results
    if (!subs.length) return { status: 404, error: 'Push isn’t switched on for this phone yet.' }
    const msg = { title: 'Foothold', body: 'Push is working. We’ll only tap you on the shoulder when it matters.', url: '/app/settings' }
    const results = await Promise.all(subs.map((s) => deliver(s, msg, env, fetcher)))
    return { sent: results.filter((r) => r === 'ok').length }
  }
  return undefined
}

/** What /api/config tells the app about push */
export function pushConfig(env) {
  const on = pushOn(env)
  return on.web || on.fcm ? { web: on.web ? env.VAPID_PUBLIC_KEY : null, app: on.fcm } : null
}
