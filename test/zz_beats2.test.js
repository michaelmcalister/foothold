import { it } from 'vitest'
import { MISSIONS } from '../src/lib/missions/index.js'
it('beats', () => {
  const want = (process.env.SAGA || '').split(',')
  for (const ep of MISSIONS.filter((m) => want.includes(m.saga))) {
    console.log(`# ${ep.id} "${ep.title}" @ ${ep.place?.name || ''}`)
    ep.beats.forEach((b, i) => {
      if (['quiz', 'puzzle', 'steady'].includes(b.kind)) return
      const tags = [b.chapter && `ch=${b.chapter}`, b.scene && `sc=${b.scene}`, b.fx && `fx=${b.fx}`, b.spatial && `sp=${b.spatial}`, b.if && `if=${b.if}`, b.unless && `un=${b.unless}`].filter(Boolean).join(' ')
      console.log(`${i} ${b.kind} ${b.who || ''} [${tags}] ${String(b.say || '').slice(0, 85)}`)
    })
  }
})
