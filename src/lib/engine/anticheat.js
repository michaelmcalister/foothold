// Checks an activity for things a person on foot or on a bike can't do.
// Flagged sections are cut out rather than binning the whole activity,
// and every flag carries a plain-English reason the player can see.

import { distance } from './geo.js'

export const LIMITS = {
  // Sustained speed ceilings in km/h over a 30 second window.
  run: { sustainedKmh: 26, burstKmh: 36 },
  walk: { sustainedKmh: 11, burstKmh: 18 },
  ride: { sustainedKmh: 70, burstKmh: 95 },
}
const JUMP_M = 250 // a teleport: this far between consecutive points...
const JUMP_S = 5 // ...in this many seconds or less

export function checkActivity(points, mode = 'run', { deviceSource = 'phone' } = {}) {
  const lim = LIMITS[mode] || LIMITS.run
  const bad = new Array(points.length).fill(false)
  const flags = []
  const flag = (type, from, to, message) => {
    for (let k = from; k <= to; k++) bad[k] = true
    const last = flags[flags.length - 1]
    if (last && last.type === type && from <= last.to + 1) last.to = Math.max(last.to, to)
    else flags.push({ type, from, to, message })
  }

  // Teleports and bursts between neighbouring points
  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].t - points[i - 1].t) / 1000
    const d = distance(points[i - 1], points[i])
    if (dt <= 0) continue
    if (d > JUMP_M && dt <= JUMP_S) {
      flag('jump', i - 1, i, `Your GPS jumped ${Math.round(d)} m in ${Math.round(dt)} s. That part doesn't count.`)
    } else if ((d / dt) * 3.6 > lim.burstKmh && d > 20) {
      flag('burst', i - 1, i, `You hit ${Math.round((d / dt) * 3.6)} km/h here, faster than anyone can ${mode}.`)
    }
  }

  // Sustained speed over a sliding 30 second window: catches cars and trains
  let j = 0
  let run = 0
  for (let i = 1; i < points.length; i++) {
    run += distance(points[i - 1], points[i])
    while (j < i && (points[i].t - points[j].t) / 1000 > 30) {
      run -= distance(points[j], points[j + 1])
      j++
    }
    const dt = (points[i].t - points[j].t) / 1000
    if (dt >= 20) {
      const kmh = (run / dt) * 3.6
      if (kmh > lim.sustainedKmh) {
        flag('vehicle', j, i, mode === 'ride'
          ? `You held ${Math.round(kmh)} km/h for half a minute. That looks like a car, so we left it out.`
          : `You held ${Math.round(kmh)} km/h for half a minute. That looks like a car, bus or bike, so we left it out.`)
      }
    }
  }

  // Heart rate that doesn't match a hard pace (only when a watch sent it)
  if (mode === 'run') {
    let fastLowHr = 0
    for (let i = 1; i < points.length; i++) {
      const dt = (points[i].t - points[i - 1].t) / 1000
      if (dt <= 0 || points[i].hr == null) continue
      const kmh = (distance(points[i - 1], points[i]) / dt) * 3.6
      if (kmh > 17 && points[i].hr < 95) fastLowHr += dt
    }
    if (fastLowHr > 120) {
      flags.push({ type: 'heart', from: 0, to: points.length - 1, message: 'Your pace was very fast while your heart rate stayed low. Check your watch is on your wrist.' })
    }
  }

  const cleaned = points.filter((_, k) => !bad[k])
  const badShare = points.length ? (points.length - cleaned.length) / points.length : 0
  const rejected = badShare > 0.3
  // Watch recordings are harder to fake, so they earn more trust.
  const trust = Math.max(0, Math.min(1, (deviceSource === 'watch' ? 0.95 : 0.8) - badShare - (flags.some((f) => f.type === 'heart') ? 0.3 : 0)))
  return {
    ok: !rejected,
    rejected,
    reason: rejected ? `More than ${Math.round(badShare * 100)}% of this activity looked like a vehicle or a GPS fault, so it can't claim ground. You can appeal it.` : null,
    flags,
    cleaned,
    trust: Math.round(trust * 100) / 100,
  }
}
