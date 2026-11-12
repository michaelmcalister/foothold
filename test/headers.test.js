// Security headers (worker/headers.js and public/_headers): pages get the
// content security policy, no inline scripts are left in index.html, and the
// static file rules match the worker's.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { CSP, securityHeaders, secure } from '../worker/headers.js'

describe('security headers', () => {
  it('gives pages the full policy and the API the basics', () => {
    expect(securityHeaders('/', 'text/html')['content-security-policy']).toBe(CSP)
    expect(securityHeaders('/app/map')['x-frame-options']).toBe('DENY')
    const api = securityHeaders('/api/me', 'application/json')
    expect(api['content-security-policy']).toBeUndefined()
    expect(api['x-content-type-options']).toBe('nosniff')
  })

  it('bans inline scripts and framing', () => {
    expect(CSP).toMatch(/script-src 'self'/)
    expect(CSP).not.toMatch(/script-src[^;]*'unsafe-inline'/)
    expect(CSP).toMatch(/frame-ancestors 'none'/)
    expect(CSP).toMatch(/object-src 'none'/)
  })

  it('leaves no inline script in index.html', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || []).toEqual([])
  })

  it('matches the static file rules', () => {
    const file = readFileSync('public/_headers', 'utf8')
    expect(file).toContain(`Content-Security-Policy: ${CSP}`)
    expect(file).toContain('X-Frame-Options: DENY')
  })

  it('copies a response and keeps its own headers', async () => {
    const out = secure(new Response('hi', { headers: { 'content-type': 'text/html', 'x-frame-options': 'SAMEORIGIN' } }), '/')
    expect(out.headers.get('x-frame-options')).toBe('SAMEORIGIN')
    expect(out.headers.get('content-security-policy')).toBe(CSP)
    expect(await out.text()).toBe('hi')
  })
})
