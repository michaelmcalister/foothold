// Plays a recap plan on a map driver, shot by shot: fly in from above,
// follow the runner as the trail draws, reveal the hexes and orbit them, then
// settle on an overview. play(from) can start at any shot; stop() cancels.
import { ease, smoother } from './plan.js'

export function createDirector(driver, plan, { onShot = () => {}, onProgress = () => {}, onDone = () => {} } = {}) {
  let run = 0 // bumps on every play/stop so stale loops quit
  let raf = 0
  const fullTrail = () => plan.trailTo(1)

  function follow(token) {
    const ms = plan.timeline.find((s) => s.id === 'follow').ms
    const cam = smoother()
    cam.reset(plan.followCamera(0))
    return new Promise((resolve) => {
      const t0 = performance.now()
      let last = t0
      const frame = (now) => {
        if (token !== run) return resolve(false)
        const t = Math.min(1, (now - t0) / ms)
        // Half steady, half eased: a gentle start and finish without crawling
        const f = 0.5 * t + 0.5 * ease(t)
        try {
          driver.setCamera(cam.step(plan.followCamera(f), now - last))
          driver.setTrail(plan.trailTo(f))
        } catch (e) { console.warn('Recap frame failed', e) } // keep going; the next frame may draw
        onProgress({ shot: 'follow', f, metres: f * plan.total })
        last = now
        if (t < 1) raf = requestAnimationFrame(frame)
        else { try { driver.setTrail(fullTrail(), true) } catch { /* shown in the next shot */ } resolve(true) }
      }
      raf = requestAnimationFrame(frame)
    })
  }

  async function play(from = 'flyin') {
    stop()
    const token = ++run
    const ids = plan.timeline.map((s) => s.id)
    const live = () => token === run
    for (const id of ids.slice(Math.max(0, ids.indexOf(from)))) {
      if (!live()) return
      onShot(id)
      // A map hiccup in one shot shouldn't freeze the recap: log it and move on
      try { await shotFor(id, token, from) } catch (e) { console.warn('Recap shot failed', id, e) }
    }
    if (live()) onDone()
  }

  async function shotFor(id, token, from) {
    const live = () => token === run
    {
      if (id === 'flyin') {
        driver.setHexes([])
        driver.setTrail([], true)
        driver.setCamera(plan.shots.wide)
        await driver.flyTo(plan.shots.start, plan.timeline[0].ms)
      } else if (id === 'follow') {
        driver.setHexes([])
        if (from === 'follow') await driver.flyTo(plan.shots.start, 1200)
        if (!live() || !(await follow(token))) return
      } else if (id === 'orbit') {
        driver.setTrail(fullTrail(), true)
        driver.setHexes(plan.hexRings)
        onProgress({ shot: 'orbit', f: 1, metres: plan.total })
        await driver.flyTo(plan.shots.orbit, 2400)
        if (!live()) return
        await driver.orbit(plan.shots.orbit, 11600)
      } else if (id === 'overview') {
        driver.setTrail(fullTrail(), true)
        driver.setHexes(plan.hexRings)
        await driver.flyTo(plan.shots.overview, plan.timeline[3].ms)
      }
    }
  }

  function stop() {
    run++
    cancelAnimationFrame(raf)
    driver.stop()
  }

  return { play, stop }
}
