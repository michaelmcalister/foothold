// CORS for the iPhone and Android apps: a response straight from the cache,
// R2 or fetch() has read-only headers, so adding the app's CORS headers must
// copy it rather than throw (a throw turned cached voice lines into "Load failed").
import { describe, it, expect } from 'vitest'
import { withCors } from '../worker/index.js'

describe('withCors', () => {
  const cors = { 'access-control-allow-origin': 'capacitor://localhost', vary: 'origin' }

  it('adds the headers to a read-only response by copying it', async () => {
    const cached = new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'audio/mpeg' } })
    cached.headers.set = () => { throw new TypeError("Can't modify immutable headers.") }
    const out = withCors(cached, cors)
    expect(out.headers.get('access-control-allow-origin')).toBe('capacitor://localhost')
    expect(out.headers.get('content-type')).toBe('audio/mpeg')
    expect(out.status).toBe(200)
    expect(new Uint8Array(await out.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('leaves the website (no CORS needed) untouched', () => {
    const r = new Response('x')
    expect(withCors(r, {})).toBe(r)
  })
})
