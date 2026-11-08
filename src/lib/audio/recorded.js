// Playing Foothold's recorded sounds (see library.js): fetches each one from
// the server once per visit, decodes it for Web Audio, and plays ambience as
// a seamless loop and tracks as a playlist with crossfades. Everything here
// fails quietly: if a sound isn't there, the synthesised sound carries on.
import { RUN_PLAYLIST, TRACKS, shuffled } from './library.js'
import { SILENT } from './synth.js'

const RAW = import.meta.env.VITE_API_URL || ''
const API = RAW === 'self' ? '' : RAW.replace(/\/$/, '')
export const canRecorded = () => !!RAW

const buffers = new Map() // 'kind/id' -> Promise<AudioBuffer | null>

async function fetchOnce(kind, id, { waitForMaking = false } = {}) {
  const deadline = Date.now() + (waitForMaking ? 4 * 60000 : 0)
  for (;;) {
    const r = await fetch(`${API}/api/audio/${kind}/${id}`)
    if (r.status === 202 && Date.now() < deadline) { await new Promise((res) => setTimeout(res, 15000)); continue }
    if (!r.ok || !(r.headers.get('content-type') || '').includes('audio')) return null
    return r.arrayBuffer()
  }
}

/** A decoded sound, or null. Made sounds are remembered for this visit. */
export function loadBuffer(ctx, kind, id, opts = {}) {
  if (!canRecorded() || !ctx) return Promise.resolve(null)
  const k = `${kind}/${id}`
  if (!buffers.has(k)) {
    const p = fetchOnce(kind, id, opts)
      .then((data) => (data ? ctx.decodeAudioData(data) : null))
      .catch(() => null)
      .then((b) => { if (!b) buffers.delete(k); return b }) // try again next time
    buffers.set(k, p)
  }
  return buffers.get(k)
}

/** A looping buffer that fades in; stop(fade) fades it out. */
export function loopBuffer(ctx, out, buffer, { level = 0.5, fadeIn = 3, from = null } = {}) {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const g = ctx.createGain()
  const t = ctx.currentTime
  g.gain.setValueAtTime(SILENT, t)
  g.gain.linearRampToValueAtTime(level, t + fadeIn)
  src.connect(g)
  g.connect(out)
  // ambience starts somewhere in the loop, so it never sounds the same twice
  src.start(t, from ?? Math.random() * Math.max(0, buffer.duration - 1))
  return {
    stop(fade = 3) {
      const n = ctx.currentTime
      g.gain.cancelScheduledValues(n)
      g.gain.setValueAtTime(g.gain.value, n)
      g.gain.linearRampToValueAtTime(SILENT, n + fade)
      try { src.stop(n + fade + 0.05) } catch { /* already stopped */ }
    },
  }
}

/** One track once through, fading in and out. Resolves when it's done (or stopped). */
function playTrack(ctx, out, buffer, { level, fade = 2.5, onStop }) {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const g = ctx.createGain()
  const t = ctx.currentTime + 0.05
  const end = t + buffer.duration
  g.gain.setValueAtTime(SILENT, t)
  g.gain.linearRampToValueAtTime(level, t + 1.5)
  g.gain.setValueAtTime(level, Math.max(t + 1.5, end - fade))
  g.gain.linearRampToValueAtTime(SILENT, end)
  src.connect(g)
  g.connect(out)
  src.start(t)
  let done
  const finished = new Promise((res) => { done = res })
  src.onended = () => done()
  onStop((f = 2) => {
    const n = ctx.currentTime
    g.gain.cancelScheduledValues(n)
    g.gain.setValueAtTime(g.gain.value, n)
    g.gain.linearRampToValueAtTime(SILENT, n + f)
    try { src.stop(n + f + 0.05) } catch { /* done already */ }
    setTimeout(done, f * 1000)
  })
  return { finished, endsAt: end }
}

/**
 * Foothold's own music for a run, when Spotify isn't playing: the tracks in a
 * fresh order, one after another, dipping under the voice.
 */
export function createRunMusic(ctx, dest, { list = RUN_PLAYLIST, level = 0.42, rand = Math.random } = {}) {
  const bus = ctx.createGain()
  bus.gain.value = 1
  bus.connect(dest)
  const order = shuffled(list, rand)
  let i = 0
  let stopNow = null
  let stopped = false
  let ducked = false
  const api = {
    nowPlaying: null,
    async start() {
      while (!stopped) {
        const id = order[i % order.length]
        i++
        loadBuffer(ctx, 'track', order[i % order.length]) // get the next one ready
        const buf = await loadBuffer(ctx, 'track', id)
        if (stopped) return
        if (!buf) { if (i > order.length * 2) return; continue } // not made yet: try the next, give up after a lap
        api.nowPlaying = TRACKS[id]?.title || null
        const p = playTrack(ctx, bus, buf, { level, onStop: (fn) => { stopNow = fn } })
        await p.finished
      }
    },
    duck(on) {
      if (on === ducked) return
      ducked = on
      const n = ctx.currentTime
      bus.gain.cancelScheduledValues(n)
      bus.gain.setValueAtTime(bus.gain.value, n)
      bus.gain.linearRampToValueAtTime(on ? 0.3 : 1, n + (on ? 0.2 : 0.8))
    },
    stop(fade = 3) {
      stopped = true
      stopNow?.(fade)
      setTimeout(() => { try { bus.disconnect() } catch { /* gone */ } }, (fade + 0.5) * 1000)
    },
  }
  return api
}
