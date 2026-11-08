// Mission cover art: every mission gets a cover, the art is stable for a
// mission, and two covers on one screen never share gradient or filter ids.
import { describe, it, expect } from 'vitest'
import { MISSIONS, SAGAS } from '../src/lib/missions/index.js'
import { coverSvg, lookFor, SAGA_LOOK } from '../src/lib/missions/covers.js'

const strip = (s) => s.replace(/cv\d+/g, 'cv')

describe('mission covers', () => {
  it('draws a cover for every mission', () => {
    for (const m of MISSIONS) {
      const svg = coverSvg(m)
      expect(svg.startsWith('<svg'), m.id).toBe(true)
      expect(svg).toContain('aria-hidden="true"')
      expect(svg).not.toMatch(/NaN|undefined/)
    }
  })
  it('is the same art each time for a mission', () => {
    const m = MISSIONS[0]
    expect(strip(coverSvg(m))).toBe(strip(coverSvg(m)))
  })
  it('gives each drawing its own ids', () => {
    const a = coverSvg(MISSIONS[0]).match(/id="(cv\d+)/)[1]
    const b = coverSvg(MISSIONS[0]).match(/id="(cv\d+)/)[1]
    expect(a).not.toBe(b)
  })
  it('has a look for every series', () => {
    for (const g of SAGAS) expect(SAGA_LOOK[g.id], g.id).toBeTruthy()
    expect(lookFor('nope')).toBe(SAGA_LOOK.trailkeepers)
  })
})
