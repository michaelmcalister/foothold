// Makes a VAPID key pair for web push (worker/push.js). Run it on your own
// computer: `npm run vapid`. Then, in Cloudflare (Workers > foothold >
// Settings > Variables and Secrets), add both lines as secrets. Never paste
// the private key into a chat, a commit or an issue.
const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const jwk = await crypto.subtle.exportKey('jwk', k.privateKey)
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey))
const pub = Buffer.from(raw).toString('base64url')
console.log('VAPID_PUBLIC_KEY')
console.log(pub)
console.log()
console.log('VAPID_PRIVATE_KEY')
console.log(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }))
