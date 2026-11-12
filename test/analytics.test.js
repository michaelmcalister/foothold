// Usage analytics (src/lib/analytics.js): what goes to PostHog is cleaned
// first. No places, ids, names or free text; screens as paths without ids.
import { describe, it, expect } from 'vitest'
import { cleanPath, cleanProps, safeProps } from '../src/lib/analytics.js'

describe('analytics scrubbing', () => {
  it('takes ids and codes out of screen paths', () => {
    expect(cleanPath('/app/activity/0a1b2c3d-1111-2222-3333-444455556666')).toBe('/app/activity/:id')
    expect(cleanPath('/app/leagues/join/AB12CD?x=1')).toBe('/app/leagues/join/:id')
    expect(cleanPath('/app/record')).toBe('/app/record')
  })
  it('cleans the address PostHog records, using the part after the #', () => {
    const p = cleanProps({ $current_url: 'https://foothold.com.au/#/app/activity/0a1b2c3d-1111-2222-3333-444455556666', note: 'at -33.7331, 150.7214 by a@b.com' })
    expect(p.$current_url).toBe('https://foothold.com.au/app/activity/:id')
    expect(p.note).not.toMatch(/33\.7|a@b/)
  })
  it('only lets small, safe values through', () => {
    const out = safeProps({ km: 5.234, mode: 'run', lat: -33.7, suburbName: 'Jordan Springs', story: true, said: 'a long sentence that somebody typed into a box' })
    expect(out).toEqual({ km: 5.23, mode: 'run', story: true })
  })
})
