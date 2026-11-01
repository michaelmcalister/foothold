// Sign-in. The app gets an access token from Auth0 (the same tenant as
// FormTrack, so one account signs in to both) and sends it as a Bearer
// token; we check its signature against Auth0's published keys, its issuer,
// audience and expiry. Turned on by setting AUTH0_DOMAIN, AUTH0_CLIENT_ID and
// AUTH0_AUDIENCE. For local development only, ALLOW_DEVICE_IDS=1 accepts an
// X-Device-Id header instead.

import { newUser } from './db.js'

export function authConfig(env) {
  if (!env.AUTH0_DOMAIN || !env.AUTH0_CLIENT_ID || !env.AUTH0_AUDIENCE) return null
  const domain = String(env.AUTH0_DOMAIN).replace(/^https?:\/\//, '').replace(/\/$/, '')
  return { domain, clientId: env.AUTH0_CLIENT_ID, audience: env.AUTH0_AUDIENCE }
}

const b64urlToBytes = (s) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}
const decodePart = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)))

// Auth0's signing keys, cached per worker instance for 10 minutes
let jwks = { domain: null, at: 0, keys: [] }
async function signingKey(domain, kid, fetcher = fetch) {
  const fresh = jwks.domain === domain && Date.now() - jwks.at < 600_000
  let k = fresh && jwks.keys.find((x) => x.kid === kid)
  if (!k) {
    // If Auth0 is slow or down, keep signing people in with the keys we
    // already have rather than locking everyone out
    const cached = jwks.domain === domain ? jwks.keys : []
    let keys = null
    try {
      const res = await fetcher(`https://${domain}/.well-known/jwks.json`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) keys = (await res.json()).keys || []
    } catch (e) {
      console.error('Auth0 keys fetch failed', e?.message)
    }
    if (keys) jwks = { domain, at: Date.now(), keys }
    else if (!cached.length) throw new Error('Could not load Auth0 keys')
    else jwks.at = Date.now() - 540_000 // try Auth0 again in a minute, not on every request
    k = (keys || cached).find((x) => x.kid === kid)
  }
  if (!k) throw new Error('Unknown signing key')
  return crypto.subtle.importKey('jwk', { kty: k.kty, n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
}

/** Returns the token's claims, or throws */
export async function verifyToken(token, cfg, { fetcher = fetch, now = Date.now() / 1000 } = {}) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed token')
  const header = decodePart(parts[0])
  if (header.alg !== 'RS256') throw new Error('Unexpected algorithm')
  const claims = decodePart(parts[1])
  const key = await signingKey(cfg.domain, header.kid, fetcher)
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  if (!ok) throw new Error('Bad signature')
  if (claims.iss !== `https://${cfg.domain}/`) throw new Error('Wrong issuer')
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!aud.includes(cfg.audience)) throw new Error('Wrong audience')
  if (!(claims.exp > now - 30)) throw new Error('Token expired')
  if (claims.nbf && claims.nbf > now + 30) throw new Error('Token not valid yet')
  if (!claims.sub) throw new Error('No subject')
  return claims
}

export const bearer = (req) => (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] || null

const DEVICE_RE = /^[A-Za-z0-9-]{16,64}$/

/**
 * The player making this request, made on their first visit. Returns
 * { user } or { error, status } for a request we can't put a name to.
 */
export async function userFor(req, env) {
  const cfg = authConfig(env)
  const token = bearer(req)
  if (cfg && token) {
    let claims
    try {
      claims = await verifyToken(token, cfg)
    } catch {
      return { error: 'Your sign-in has expired. Sign in again to keep playing.', status: 401 }
    }
    const row = await env.DB.prepare('SELECT * FROM users WHERE auth_sub = ?').bind(claims.sub).first()
    return { user: row || (await newUser(env, { authSub: claims.sub })) }
  }
  const deviceId = req.headers.get('x-device-id')
  if (env.ALLOW_DEVICE_IDS === '1' && deviceId && DEVICE_RE.test(deviceId)) {
    const row = await env.DB.prepare('SELECT * FROM users WHERE device_id = ?').bind(deviceId).first()
    return { user: row || (await newUser(env, { deviceId })) }
  }
  return { error: 'Sign in to keep playing.', status: 401 }
}
