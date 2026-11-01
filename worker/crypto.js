// AES-GCM encryption for secrets we hold for players (linked FormTrack
// tokens). The key is SHA-256 of the TOKEN_KEY secret. Stored form:
// "v1.<iv base64url>.<ciphertext base64url>".

const enc = new TextEncoder()
const dec = new TextDecoder()

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))

// Imported keys, cached per worker instance
const keys = new Map()
async function keyFor(secret) {
  if (!secret) throw Object.assign(new Error('TOKEN_KEY is not set'), { status: 503 })
  if (!keys.has(secret)) {
    const raw = await crypto.subtle.digest('SHA-256', enc.encode(String(secret)))
    keys.set(secret, await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']))
  }
  return keys.get(secret)
}

export async function encryptSecret(secret, plain) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(secret), enc.encode(plain)))
  return `v1.${toB64(iv)}.${toB64(ct)}`
}

/** The plain text, or null if it can't be decrypted (wrong key, tampered) */
export async function decryptSecret(secret, stored) {
  const [v, iv, ct] = String(stored || '').split('.')
  if (v !== 'v1' || !iv || !ct) return null
  try {
    return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, await keyFor(secret), fromB64(ct)))
  } catch {
    return null
  }
}
