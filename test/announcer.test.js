// Tests for the voice coach script: when it talks, what it says, and that
// every line passes the house rules (no dashes, kind, not shaming).
import { describe, it, expect } from 'vitest'
import { createAnnouncer, sayKm, sayTime, sayPace } from '../src/lib/audio/announcer.js'
import { DEFAULTS } from '../src/lib/audio/settings.js'

const seq = (xs) => { let i = 0; return () => xs[i++ % xs.length] }

// Simulate a steady run, returning everything said with the time it was said
function run(settings, { km = 5, paceS = 330, mode = 'run', target = null, rand = seq([0.1, 0.9, 0.3]) } = {}) {
  const a = createAnnouncer({ ...DEFAULTS, ...settings }, { mode, target, rand })
  const said = []
  const total = km * paceS
  for (let t = 0; t <= total; t += 2) {
    const d = (t / paceS) * 1000
    for (const line of a.update({ elapsedS: t, distanceM: d, paceSPerKm: paceS, toStartM: 2000 })) said.push({ t, line })
  }
  return said
}

describe('reading numbers aloud', () => {
  it('says distances, times and paces the way an Aussie coach would', () => {
    expect(sayKm(1000)).toBe('1 kilometre')
    expect(sayKm(2500)).toBe('2.5 kilometres')
    expect(sayTime(342)).toBe('5 minutes 42')
    expect(sayTime(60)).toBe('1 minute')
    expect(sayTime(3725)).toBe('1 hour 2 minutes')
    expect(sayPace(330)).toBe('5 30 per k')
    expect(sayPace(305)).toBe('5 oh 5 per k')
    expect(sayPace(300)).toBe('5 flat per k')
  })
})

describe('voice coach timing', () => {
  it('updates once per kilometre with time, split and average pace', () => {
    const said = run({ every: 'km', cheer: 'off' })
    expect(said.length).toBe(5)
    expect(said[0].line).toContain('1 kilometre.')
    expect(said[0].line).toContain('Average pace 5 30 per k')
    expect(said[1].line).toContain('Last k in 5 30')
  })

  it('every half kilometre doubles the updates; every 5 minutes goes by the clock', () => {
    expect(run({ every: 'half', cheer: 'off' }).length).toBe(10)
    const timed = run({ every: '5min', cheer: 'off' })
    expect(timed.length).toBe(Math.floor((5 * 330) / 300))
    expect(timed[0].line.startsWith('5 minutes.')).toBe(true)
  })

  it('stays quiet when updates are off and there is no encouragement', () => {
    expect(run({ every: 'off', cheer: 'off' })).toEqual([])
  })

  it('leaves out pace or time when they are switched off', () => {
    const said = run({ every: 'km', cheer: 'off', sayPace: false, sayTime: false })
    expect(said[0].line).toBe('1 kilometre.')
  })

  it('plenty of encouragement adds lines between updates, never back to back', () => {
    const said = run({ every: '10min', cheer: 'lots' }, { km: 8, rand: () => 0.1 })
    const extras = said.filter((s) => !/minutes\.|kilometre/.test(s.line))
    expect(extras.length).toBeGreaterThan(0)
    for (let i = 1; i < said.length; i++) expect(said[i].t - said[i - 1].t).toBeGreaterThanOrEqual(90)
  })

  it('rides get speed, not pace', () => {
    const said = run({ every: 'km', cheer: 'off' }, { mode: 'ride', paceS: 150, km: 3 })
    expect(said[0].line).toContain('Average 24 kilometres an hour')
  })
})

describe('loop hints', () => {
  it('says once when the start is close, and once when the loop closes', () => {
    const a = createAnnouncer({ ...DEFAULTS, every: 'off', cheer: 'off' }, { rand: () => 0.9 })
    const at = (toStartM) => a.update({ elapsedS: 900, distanceM: 2500, paceSPerKm: 330, toStartM })
    expect(at(500)).toEqual([])
    expect(at(140)[0]).toMatch(/About 140 metres back to your start/)
    expect(at(100)).toEqual([])
    expect(at(25)[0]).toMatch(/Your loop closes here/)
    expect(at(20)).toEqual([])
    expect(at(400)).toEqual([])
    expect(at(120).length).toBe(1) // a second lap gets its own hint
  })
})

describe('plan pace', () => {
  it('nudges gently when an easy run is too quick', () => {
    const said = run({ every: 'km' }, { paceS: 290, target: { type: 'easy', paceRange: [330, 380] } })
    expect(said[0].line).toContain('A touch quick for an easy run')
  })
  it('backs you up when a tempo run is on target', () => {
    const said = run({ every: 'km' }, { paceS: 300, target: { type: 'tempo', paceRange: [295, 305] } })
    expect(said[0].line).toContain('Right on your target pace')
  })
})

describe('house rules', () => {
  it('never uses dashes and never shames', () => {
    const lines = [
      ...run({ every: 'km', cheer: 'lots' }, { km: 12, rand: Math.random }),
      ...run({ every: 'half', cheer: 'lots' }, { mode: 'ride', paceS: 150, km: 10, rand: Math.random }),
    ].map((s) => s.line)
    const a = createAnnouncer(DEFAULTS)
    lines.push(a.start(), a.pause(), a.resume(), a.finish({ elapsedS: 1800, distanceM: 5000 }))
    for (const l of lines) {
      expect(l).not.toMatch(/[–—]|--/)
      expect(l).not.toMatch(/lazy|slow|should have|failed|disappoint/i)
    }
  })
})
