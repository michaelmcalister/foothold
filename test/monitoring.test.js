// Error reports (src/lib/monitoring.js, worker/sentry.js): a DSN becomes the
// right Sentry address, events carry the message and stack but nothing
// personal, and sending never throws.
import { describe, it, expect } from 'vitest'
import { parseDsn, eventFor, framesOf, scrubText, send } from '../src/lib/monitoring.js'
import { reportError } from '../worker/sentry.js'

const DSN = 'https://abc123@o1.ingest.de.sentry.io/42'

describe('error reports', () => {
  it('turns a DSN into the envelope address', () => {
    expect(parseDsn(DSN)).toEqual({ key: 'abc123', url: 'https://o1.ingest.de.sentry.io/api/42/envelope/?sentry_key=abc123&sentry_version=7' })
    expect(parseDsn('nope')).toBe(null)
  })

  it('scrubs places, emails and tokens out of messages', () => {
    expect(scrubText('Bad point -33.71234, 150.74567 for jo@x.com')).toBe('Bad point [place] for [email]')
    expect(scrubText('token eyJhbGciOi.eyJzdWIi.c2lnbmF0dXJl')).toBe('token [token]')
  })

  it('keeps file names and lines but not query strings', () => {
    const f = framesOf('Error: x\n    at go (https://foothold.com.au/assets/index-abc.js?v=2:10:5)\n    at https://foothold.com.au/assets/map.js:3:1')
    expect(f).toEqual([
      { function: '?', filename: '/assets/map.js', lineno: 3, colno: 1 },
      { function: 'go', filename: '/assets/index-abc.js', lineno: 10, colno: 5 },
    ])
  })

  it('builds an event with the message and where it happened', () => {
    const e = eventFor(new TypeError('x is undefined'), { where: 'record' })
    expect(e.exception.values[0]).toMatchObject({ type: 'TypeError', value: 'x is undefined' })
    expect(e.tags.where).toBe('record')
    expect(e.event_id).toMatch(/^[0-9a-f]{32}$/i)
    expect(JSON.stringify(e)).not.toMatch(/user|email|ip_address/)
  })

  it('sends an envelope, and never throws when the network fails', async () => {
    let got
    expect(await send(DSN, eventFor(new Error('boom')), async (url, init) => { got = { url, init }; return new Response('') })).toBe(true)
    expect(got.url).toContain('/api/42/envelope/')
    expect(got.init.body.split('\n')).toHaveLength(3)
    expect(await send(DSN, eventFor(new Error('boom')), async () => { throw new Error('offline') })).toBe(false)
  })

  it('reports server errors only when a DSN is set', async () => {
    let n = 0
    const fetcher = async () => { n++; return new Response('') }
    expect(reportError({}, null, new Error('x'), 'GET /api/me', fetcher)).toBeUndefined()
    await reportError({ SENTRY_DSN: DSN }, null, new Error('x'), 'GET /api/me', fetcher)
    expect(n).toBe(1)
  })
})
