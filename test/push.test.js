// Push notifications (worker/push.js): web push encryption a browser can
// open, a VAPID header a push service can check, one folded push per player,
// quiet hours, the daily cap, the switches in Settings, and the API.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller } from './fakes.js'
import { encryptPayload, vapidHeader, digest, isQuiet, sydneyDayStart, pushWaiting, prefsOf, DAILY_CAP } from '../worker/push.js'

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))
const enc = new TextEncoder()
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}
const cat = (...p) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length } return o }

// What a browser does with a push: decrypt it with its own key (RFC 8291)
async function browserDecrypt(body, ua, authSecret) {
  const salt = body.slice(0, 16)
  const idlen = body[20]
  const asPublic = body.slice(21, 21 + idlen)
  const cipher = body.slice(21 + idlen)
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey))
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256))
  const ikm = (await hmac(await hmac(authSecret, shared), cat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))).slice(0, 32)
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, cat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, cat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher))
  expect(plain.at(-1)).toBe(2)
  return new TextDecoder().decode(plain.slice(0, -1))
}

async function vapidPair() {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', k.privateKey)
  return { VAPID_PRIVATE_KEY: JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }), VAPID_PUBLIC_KEY: b64u(await crypto.subtle.exportKey('raw', k.publicKey)), verifyKey: k.publicKey }
}

async function browserSub() {
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const authSecret = crypto.getRandomValues(new Uint8Array(16))
  return { ua, authSecret, keys: { p256dh: b64u(await crypto.subtle.exportKey('raw', ua.publicKey)), auth: b64u(authSecret) } }
}

describe('web push crypto', () => {
  it('encrypts a payload the browser can open', async () => {
    const b = await browserSub()
    const body = await encryptPayload('{"title":"Foothold","body":"Hi"}', b.keys.p256dh, b.keys.auth)
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096)
    expect(await browserDecrypt(body, b.ua, b.authSecret)).toBe('{"title":"Foothold","body":"Hi"}')
  })

  it('signs a VAPID header the push service can check', async () => {
    const v = await vapidPair()
    const h = await vapidHeader('https://fcm.googleapis.com/fcm/send/abc', v, Date.UTC(2026, 10, 12))
    const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/.exec(h)
    expect(k).toBe(v.VAPID_PUBLIC_KEY)
    const [head, body, sig] = jwt.split('.')
    expect(JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')))).toMatchObject({ aud: 'https://fcm.googleapis.com' })
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, v.verifyKey, unb64u(sig), enc.encode(`${head}.${body}`))).toBe(true)
  })
})

describe('when and what to push', () => {
  it('folds several notices into one push, newest first', () => {
    const d = digest([{ id: 'a', kind: 'fade', text: 'Ground fading.', at: 1 }, { id: 'b', kind: 'taken', text: 'Sam took 3 hexes.', at: 2 }])
    expect(d.body).toBe('Sam took 3 hexes. And 1 more thing waiting.')
    expect(d.ids).toEqual(['b', 'a'])
  })
  it('keeps quiet at night in Sydney', () => {
    expect(isQuiet(Date.parse('2026-11-12T11:30:00Z'))).toBe(true) // 10:30 pm
    expect(isQuiet(Date.parse('2026-11-12T19:30:00Z'))).toBe(true) // 6:30 am
    expect(isQuiet(Date.parse('2026-11-12T00:00:00Z'))).toBe(false) // 11 am
  })
  it('knows when the day starts in Sydney', () => {
    expect(new Date(sydneyDayStart(Date.parse('2026-11-12T03:00:00Z'))).toISOString()).toBe('2026-11-11T13:00:00.000Z')
  })
  it('reads the switches, with everything on by default', () => {
    expect(prefsOf(null)).toMatchObject({ on: true, rivals: true, stories: true })
    expect(prefsOf(JSON.stringify({ push: { rivals: false } }))).toMatchObject({ on: true, rivals: false })
  })
})

describe('the push cron and API', () => {
  let env
  const call = caller(() => env)
  const P = 'device-0000-push-push-0001'
  const day = Date.parse('2026-11-12T01:00:00Z') // noon in Sydney
  let sent
  const fetcher = async (url, init) => { sent.push({ url, init }); return new Response('', { status: 201 }) }

  beforeEach(async () => {
    env = { ...makeEnv(), ...(await vapidPair()) }
    sent = []
  })

  it('subscribes, pushes once with everything folded in, and respects the daily cap', async () => {
    const id = (await call(P, 'GET', '/api/me')).body.user.id
    const b = await browserSub()
    expect((await call(P, 'POST', '/api/push', { kind: 'web', endpoint: 'https://push.example.com/abc', keys: b.keys })).status).toBe(200)
    const db = env.DB.db
    const add = (nid, kind, text, at) => db.prepare('INSERT INTO notifications (id, user_id, at, kind, text) VALUES (?, ?, ?, ?, ?)').run(nid, id, at, kind, text)
    add('n1', 'taken', 'Sam took 3 hexes.', day - 1000)
    add('n2', 'fade', 'Ground fading.', day - 2000)
    expect(await pushWaiting(env, day, fetcher)).toBe(1)
    expect(sent).toHaveLength(1)
    const msg = JSON.parse(await browserDecrypt(new Uint8Array(sent[0].init.body), b.ua, b.authSecret))
    expect(msg.body).toBe('Sam took 3 hexes. And 1 more thing waiting.')
    expect(await pushWaiting(env, day + 60000, fetcher)).toBe(0) // nothing new

    for (let i = 0; i < DAILY_CAP + 2; i++) {
      add(`m${i}`, 'battle', `Battle ${i}.`, day + i * 3600000)
      await pushWaiting(env, day + i * 3600000 + 1000, fetcher)
    }
    expect(sent).toHaveLength(DAILY_CAP)
  })

  it('skips switched off kinds, quiet hours and gone subscriptions', async () => {
    const id = (await call(P, 'GET', '/api/me')).body.user.id
    const b = await browserSub()
    await call(P, 'POST', '/api/push', { kind: 'web', endpoint: 'https://push.example.com/x', keys: b.keys })
    await call(P, 'PUT', '/api/me', { push: { rivals: false } })
    expect((await call(P, 'GET', '/api/me')).body.user.push).toMatchObject({ on: true, rivals: false, ground: true })
    const db = env.DB.db
    db.prepare('INSERT INTO notifications (id, user_id, at, kind, text) VALUES (?, ?, ?, ?, ?)').run('n1', id, day, 'taken', 'Sam took 3.')
    expect(await pushWaiting(env, day + 1000, fetcher)).toBe(0)
    db.prepare('INSERT INTO notifications (id, user_id, at, kind, text) VALUES (?, ?, ?, ?, ?)').run('n2', id, day, 'fade', 'Fading.')
    expect(await pushWaiting(env, Date.parse('2026-11-12T12:00:00Z'), fetcher)).toBe(0) // 11 pm
    expect(await pushWaiting(env, day + 2000, async () => new Response('', { status: 410 }))).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS n FROM push_subs').get().n).toBe(0)
  })

  it('checks what it is sent, and unsubscribes', async () => {
    expect((await call(P, 'POST', '/api/push', { kind: 'web', endpoint: 'http://insecure', keys: { p256dh: 'x', auth: 'y' } })).status).toBe(400)
    expect((await call(P, 'POST', '/api/push', { kind: 'fcm', token: 'short' })).status).toBe(400)
    expect((await call(P, 'POST', '/api/push', { kind: 'fcm', token: 'f'.repeat(140), platform: 'ios' })).status).toBe(200)
    expect(env.DB.db.prepare('SELECT platform FROM push_subs').get().platform).toBe('ios')
    await call(P, 'DELETE', '/api/push', { token: 'f'.repeat(140) })
    expect(env.DB.db.prepare('SELECT COUNT(*) AS n FROM push_subs').get().n).toBe(0)
    expect((await call(P, 'GET', '/api/config')).body.push.web).toBe(env.VAPID_PUBLIC_KEY)
  })
})
