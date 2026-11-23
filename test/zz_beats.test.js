import { it } from 'vitest'
import { SERIES } from '../src/lib/missions/series/index.js'
it('beats', () => {
  const want = (process.env.SER || '').split(',')
  for (const s of SERIES) {
    if (!want.includes(s.SAGA.id)) continue
    console.log(`## ${s.SAGA.id} score=${s.SAGA.score} narrator=${s.SAGA.narrator}`)
    for (const ep of s.EPISODES) {
      console.log(`# ${ep.id} ep${ep.episode} "${ep.title}" @ ${ep.place?.name}`)
      ep.beats.forEach((b, i) => {
        const tags = [b.chapter && `ch=${b.chapter}`, b.scene && `sc=${b.scene}`, b.fx && `fx=${b.fx}`, b.spatial && `sp=${b.spatial}`, b.if && `if=${b.if}`, b.unless && `un=${b.unless}`].filter(Boolean).join(' ')
        console.log(`${i} ${b.at} ${b.kind} ${b.who || ''} [${tags}] ${String(b.say || '').slice(0, 120)}`)
      })
    }
  }
})
