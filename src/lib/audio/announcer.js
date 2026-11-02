// The voice coach's script: decides what to say during a run and when.
// Updates at each kilometre (or half, or every 5 or 10 minutes), loop hints
// when you're close to closing one, a check against today's plan pace, and
// some encouragement. Pure logic: give it the live numbers, it returns lines.
// Encouragement passes the regret test: kind, never guilt or pressure.

const CHEERS = [
  'Lovely rhythm. Keep it rolling.',
  "You're flying.",
  'Strong work. Relax those shoulders.',
  'Good on ya. Keep it steady.',
  'Nice and smooth. Stay tall.',
  "You've got this.",
  'Keep it ticking over.',
  'Easy breathing. You are doing great.',
  'Looking good out there.',
  'Light feet. Nice work.',
]
const GROUND_CHEERS = [
  'Every street you pass is ground you could take.',
  "Close the loop and it's all yours.",
]
const RIDE_CHEERS = ['Smooth pedalling. Keep it up.', 'Looking strong on the bike.', 'Nice and steady. Enjoy the ride.']

const STEP = { km: { m: 1000 }, half: { m: 500 }, '5min': { s: 300 }, '10min': { s: 600 }, off: null }

// Numbers as they read aloud
export function sayKm(m) {
  const k = m / 1000
  const v = Math.abs(k - Math.round(k)) < 0.05 ? String(Math.round(k)) : k.toFixed(1)
  return `${v} ${v === '1' ? 'kilometre' : 'kilometres'}`
}
export function sayTime(s) {
  s = Math.round(s)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h} ${h === 1 ? 'hour' : 'hours'} ${m} ${m === 1 ? 'minute' : 'minutes'}`
  if (!m) return `${sec} seconds`
  return sec ? `${m} ${m === 1 ? 'minute' : 'minutes'} ${sec}` : `${m} ${m === 1 ? 'minute' : 'minutes'}`
}
export function sayPace(sPerKm) {
  if (!sPerKm || !Number.isFinite(sPerKm)) return null
  const m = Math.floor(sPerKm / 60)
  const s = Math.round(sPerKm % 60)
  return `${m} ${s === 0 ? 'flat' : s < 10 ? `oh ${s}` : s} per k`
}
const saySpeed = (sPerKm) => (sPerKm ? `${Math.round(3600 / sPerKm)} kilometres an hour` : null)

export function createAnnouncer(settings, { mode = 'run', target = null, rand = Math.random } = {}) {
  const st = { lastStep: 0, lastSaidAt: 0, lastCheer: -1, splitAtM: 0, splitAtS: 0, near: false, closed: false, lastExtraCheer: 0 }
  const cheersFor = mode === 'ride' ? RIDE_CHEERS : CHEERS

  function cheer(chance) {
    if (settings.cheer === 'off' || rand() > chance) return null
    const pool = settings.sayTerritory && rand() < 0.2 ? GROUND_CHEERS : cheersFor
    let i = Math.floor(rand() * pool.length)
    if (pool === cheersFor && i === st.lastCheer) i = (i + 1) % pool.length
    if (pool === cheersFor) st.lastCheer = i
    return pool[i]
  }

  // Gentle check against today's planned pace (easy days are where people overdo it)
  function planNote(avg) {
    if (!target?.paceRange || !avg || mode !== 'run') return null
    const [fast, slow] = target.paceRange
    if (['easy', 'long', 'recovery'].includes(target.type) && avg < fast - 10) return `A touch quick for ${target.type === 'long' ? 'a long' : 'an easy'} run. Ease off a little.`
    if (['tempo', 'intervals'].includes(target.type) && avg >= fast - 5 && avg <= slow + 5) return 'Right on your target pace.'
    return null
  }

  return {
    start() {
      st.lastSaidAt = 0
      return mode === 'ride' ? "Let's ride. Recording started." : mode === 'walk' ? "Let's walk. Recording started." : "Let's go. Run started."
    },
    pause: () => 'Paused.',
    resume: () => 'Back at it.',

    // Live numbers in, lines to say out (usually none)
    update({ elapsedS, distanceM, paceSPerKm, toStartM }) {
      const lines = []
      const step = STEP[settings.every]
      const avg = distanceM > 50 ? elapsedS / (distanceM / 1000) : null

      // Regular update
      if (step) {
        const n = step.m ? Math.floor(distanceM / step.m) : Math.floor(elapsedS / step.s)
        if (n > st.lastStep) {
          st.lastStep = n
          const parts = [step.m ? sayKm(n * step.m) + '.' : `${sayTime(n * step.s)}.`]
          if (step.m && settings.sayTime) parts.push(`${sayTime(elapsedS)}.`)
          if (step.s) parts.push(`${sayKm(distanceM)}.`)
          if (settings.sayPace) {
            if (mode === 'ride') parts.push(`Average ${saySpeed(avg)}.`)
            else {
              const splitM = distanceM - st.splitAtM
              const split = step.m === 1000 && splitM > 500 ? (elapsedS - st.splitAtS) / (splitM / 1000) : null
              if (split) parts.push(`Last k in ${sayPace(split).replace(' per k', '')}.`)
              if (avg) parts.push(`Average pace ${sayPace(avg)}.`)
            }
          }
          st.splitAtM = distanceM
          st.splitAtS = elapsedS
          const note = planNote(avg)
          if (note) parts.push(note)
          else {
            const c = cheer(settings.cheer === 'lots' ? 0.75 : 0.35)
            if (c) parts.push(c)
          }
          lines.push(parts.join(' '))
        }
      }

      // Loop hints: once on the way in, once when it closes
      if (settings.sayTerritory && distanceM > 400 && toStartM != null) {
        if (toStartM > 300) { st.near = false; st.closed = false }
        else if (toStartM <= 30 && !st.closed) {
          st.closed = true
          st.near = true
          lines.push('Your loop closes here. Finish now to take the ground, or keep going for a bigger one.')
        } else if (toStartM <= 150 && toStartM > 30 && !st.near) {
          st.near = true
          lines.push(`About ${Math.round(toStartM / 10) * 10} metres back to your start closes the loop.`)
        }
      }

      // Plenty of encouragement: an extra line between updates now and then
      // (but not when a regular update is due within 90 seconds)
      const nextIn = !step ? Infinity
        : step.s ? (st.lastStep + 1) * step.s - elapsedS
          : avg ? (((st.lastStep + 1) * step.m - distanceM) / 1000) * avg : Infinity
      if (!lines.length && settings.cheer === 'lots' && nextIn > 90 && elapsedS - st.lastExtraCheer > 240 && elapsedS - st.lastSaidAt > 90 && elapsedS > 120) {
        st.lastExtraCheer = elapsedS
        const c = cheer(0.5)
        if (c) lines.push(c)
      }

      if (lines.length) st.lastSaidAt = elapsedS
      return lines
    },

    finish({ elapsedS, distanceM }) {
      const kind = mode === 'ride' ? 'ride' : mode === 'walk' ? 'walk' : 'run'
      return `Nice work. That's ${sayKm(distanceM)} in ${sayTime(elapsedS)}. Saving your ${kind}.`
    },
  }
}
