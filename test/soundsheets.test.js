// The sound sheets (src/lib/missions/sound): every sound a story calls for
// exists, has a recording prompt and a stand-in, and each episode moves
// through its places with plenty going on.
import { describe, it, expect } from 'vitest'
import { SHEETS } from '../src/lib/missions/sound/index.js'
import { MISSIONS } from '../src/lib/missions/index.js'
import { SCENES, canSting } from '../src/lib/audio/soundscape.js'
import { SPATIAL } from '../src/lib/audio/spatial.js'
import { AMBIENCE, SFX } from '../src/lib/audio/library.js'

describe('sound sheets', () => {
  it('only use sounds that exist, each with a prompt and a stand-in', () => {
    const seen = new Set()
    for (const sh of SHEETS) {
      expect(MISSIONS.some((m) => m.saga === sh.series), sh.series).toBeTruthy()
      for (const [id, s] of [...Object.entries(sh.scenes), ...Object.entries(sh.passing), ...Object.entries(sh.cues)]) {
        expect(seen.has(id), `${id} is used twice`).toBe(false)
        seen.add(id)
        expect(id.startsWith(`${sh.series}-`), `${id} starts with the series id`).toBe(true)
        expect(s.prompt.length, id).toBeGreaterThan(40)
        expect(s.prompt.length, id).toBeLessThan(450)
        expect(/\b(song|lyrics|singing)\b/i.test(s.prompt), id).toBe(false)
      }
      for (const [id, s] of Object.entries(sh.scenes)) {
        expect(AMBIENCE[id], id).toBe(s.prompt)
        expect(SCENES[id].beds.length, id).toBeGreaterThan(0)
        expect(/no music/i.test(s.prompt), `${id} says no music`).toBe(true)
        for (const a of s.around || []) expect(SPATIAL[Array.isArray(a) ? a[0] : a], `${id} around ${a}`).toBeTruthy()
      }
      for (const [id, s] of Object.entries(sh.passing)) {
        expect(SPATIAL[id].recorded, id).toBe(id)
        expect(SPATIAL[id].synth, `${id} has a stand-in`).toBeTruthy()
        expect(SFX[id].seconds, id).toBe(s.seconds)
      }
      for (const [id, s] of Object.entries(sh.cues)) {
        expect(SFX[id].sting, id).toBe(s.sting)
        expect(canSting(id), `${id} stand-in ${s.sting}`).toBe(true)
        expect(s.seconds, id).toBeLessThanOrEqual(6)
      }
    }
  })

  it('give each episode several places, effects and passing sounds', () => {
    for (const sh of SHEETS) {
      for (const ep of MISSIONS.filter((m) => m.saga === sh.series)) {
        expect(sh.episodes[ep.id], `${ep.id} is on its sheet`).toBeTruthy()
        const scenes = ep.beats.filter((b) => b.scene).map((b) => b.scene)
        for (const b of ep.beats) {
          if (b.scene) expect(SCENES[b.scene] && AMBIENCE[b.scene], `${ep.id} scene ${b.scene}`).toBeTruthy()
          if (b.fx) expect(canSting(b.fx), `${ep.id} fx ${b.fx}`).toBe(true)
          if (b.spatial) expect(SPATIAL[b.spatial], `${ep.id} spatial ${b.spatial}`).toBeTruthy()
        }
        expect(ep.beats[0].scene, `${ep.id} opens somewhere`).toBeTruthy()
        expect(new Set(scenes).size, `${ep.id} places`).toBeGreaterThanOrEqual(3)
        expect(ep.beats.filter((b) => b.fx).length, `${ep.id} effects`).toBeGreaterThanOrEqual(6)
        expect(ep.beats.filter((b) => b.spatial).length, `${ep.id} passing sounds`).toBeGreaterThanOrEqual(2)
      }
    }
  })
})
