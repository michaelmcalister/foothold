// Security headers for everything the worker sends: the app's pages and
// files, and the API. The content security policy only lets scripts load
// from Foothold itself and from Google's map script (the 3D recap), never
// from inline code, so a bit of injected text can't run. Pages can't be
// framed by other sites, and browsers mustn't guess file types.

const CSP = [
  "default-src 'self'",
  // Google's 3D map needs its own hosts, and eval for some features
  "script-src 'self' https://maps.googleapis.com https://*.gstatic.com https://*.google.com 'unsafe-eval' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Vue binds inline styles
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  // Auth0, map tiles, terrain, Spotify, Google, FormTrack, Sentry
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  'frame-src https://*.auth0.com https://accounts.spotify.com https://*.google.com',
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.auth0.com https://checkout.stripe.com",
].join('; ')

const ALWAYS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(self), geolocation=(self), payment=(self)',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
}

/** Headers for one response: pages get the full policy, the API the basics. */
export function securityHeaders(pathname, contentType = '') {
  const page = !pathname.startsWith('/api/') && (contentType.includes('text/html') || pathname === '/' || !/\.[a-z0-9]+$/i.test(pathname))
  return page ? { ...ALWAYS, 'content-security-policy': CSP, 'x-frame-options': 'DENY' } : { ...ALWAYS }
}

/** A copy of res with the security headers added (fetch responses are read only). */
export function secure(res, pathname) {
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(securityHeaders(pathname, res.headers.get('content-type') || ''))) {
    if (!out.headers.has(k)) out.headers.set(k, v)
  }
  return out
}

export { CSP }
