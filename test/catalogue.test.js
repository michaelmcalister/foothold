// The light story catalogue (scripts/catalogue.mjs) must match the scripts:
// rebuild it with `node scripts/catalogue.mjs` after changing a story.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { catalogue } from '../scripts/catalogue.mjs'
import { MISSIONS } from '../src/lib/missions/scripts.js'
import { missionMeta } from '../src/lib/missions/index.js'
import { metaById, metaLine } from '../src/lib/missions/catalogue.js'

describe('story catalogue', () => {
  it('is up to date with the scripts', () => {
    const onDisk = JSON.parse(readFileSync('src/lib/missions/catalogue.json', 'utf8'))
    expect(onDisk).toEqual(JSON.parse(JSON.stringify(catalogue())))
  })
  it('has every mission without its beats, with the same summary line', () => {
    for (const m of MISSIONS) {
      const c = metaById(m.id)
      expect(c, m.id).toBeTruthy()
      expect(c.beats).toBeUndefined()
      expect(metaLine(c)).toBe(missionMeta(m))
    }
  })
})
