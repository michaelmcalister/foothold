// Flyover reels, the engine: makes a 15 to 20 second vertical (9:16) video of
// a run's flyover on the phone. A hidden MapLibre street map is moved frame
// by frame along a reel plan (reelPlan.js); each frame is copied to an output
// canvas with the trail, hexes, runner and words drawn on top; the canvas and
// the recap score are recorded with MediaRecorder. It plays in real time
// (requestAnimationFrame), so the page must stay open. Nothing is uploaded.
// Google's 3D map isn't used: its canvas can't be captured reliably.
// In night mode it uses the dark street map, chosen when the reel starts.
import { planReel, reelFrame, reelText, counterText, pickMimeType, fileTypeFor, reelFileName, reelSize, projectPoint } from './reelPlan.js'
import { zoomForRange } from './plan.js'
import { createScore } from '../audio/score.js'
import { context as audioContext, resume as resumeAudio } from '../audio/sfx.js'
import { currentLook, mapStyleUrl, mapColours } from '../theme.js'

// The street map is the same as the recap's (src/lib/theme.js picks day or night)
const INK = '#16302A'
const ON_INK = '#F3F5EF'
const FONT = "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"

/** What this browser can do. { ok, mime, reason } */
export function reelSupport() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return { ok: false, reason: 'none' }
  const MR = window.MediaRecorder
  const canvas = document.createElement('canvas')
  if (!MR || typeof canvas.captureStream !== 'function') return { ok: false, reason: 'recorder' }
  const mime = pickMimeType((t) => MR.isTypeSupported(t))
  if (!mime) return { ok: false, reason: 'codec' }
  return { ok: true, mime }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const abortError = () => Object.assign(new Error('Cancelled'), { name: 'AbortError' })

async function loadStyle(look) {
  try {
    const r = await fetch(mapStyleUrl(look), { signal: AbortSignal.timeout(5000) })
    if (r.ok) return await r.json()
  } catch { /* offline or blocked: plain paper */ }
  return { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': mapColours(look).paper } }] }
}

// The hidden street map. Returns null if it can't start (no WebGL, say).
async function makeMap(size, start, look) {
  const css = { width: size.width / 2, height: size.height / 2 } // drawn at 2x, so labels read like on a phone
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  Object.assign(host.style, { position: 'fixed', left: '-99999px', top: '0', width: css.width + 'px', height: css.height + 'px', pointerEvents: 'none' })
  document.body.appendChild(host)
  // zoomForRange counts 256 px tiles; MapLibre's are 512, so one level less
  // makes the map match the reel's camera (and projectPoint) exactly
  const view = (c) => ({ center: [c.lng, c.lat], zoom: Math.max(0, Math.min(19, zoomForRange(c.range, c.lat, css.height) - 1)), bearing: c.heading, pitch: Math.min(75, c.tilt) })
  try {
    const [{ Map: MLMap, setWorkerUrl }, { default: workerUrl }, style] = await Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
      loadStyle(look),
    ])
    setWorkerUrl(workerUrl)
    const map = new MLMap({
      container: host, style, ...view(start), maxPitch: 75, interactive: false, attributionControl: false,
      pixelRatio: 2, fadeDuration: 0, canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
    })
    await Promise.race([new Promise((r) => map.once('load', r)), wait(8000).then(() => { throw new Error('Map took too long') })])
    const idle = (ms) => new Promise((r) => {
      if (map.loaded() && map.areTilesLoaded()) return r()
      const t = setTimeout(r, ms)
      map.once('idle', () => { clearTimeout(t); r() })
    })
    return {
      canvas: map.getCanvas(),
      set(c) { map.jumpTo(view(c)); try { map.redraw() } catch { /* drawn on the next frame */ } },
      project(p) { const q = map.project([p.lng, p.lat]); return { x: q.x * 2, y: q.y * 2 } },
      idle,
      destroy() { try { map.remove() } catch { /* gone */ } host.remove() },
    }
  } catch {
    host.remove()
    return null
  }
}

// ---- drawing ----

function hexPath(ctx, ring, project) {
  ctx.beginPath()
  ring.forEach(([lng, lat], i) => {
    const q = project({ lat, lng })
    if (!q) return
    ctx[i ? 'lineTo' : 'moveTo'](q.x, q.y)
  })
  ctx.closePath()
}

function linePath(ctx, pts, project) {
  ctx.beginPath()
  let on = false
  for (const p of pts) {
    const q = project(p)
    if (!q) { on = false; continue }
    ctx[on ? 'lineTo' : 'moveTo'](q.x, q.y)
    on = true
  }
}

function brandMark(ctx, x, y, s, colour) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s / 120, s / 120)
  ctx.fillStyle = colour
  ctx.strokeStyle = colour
  ctx.lineWidth = 6
  ctx.lineJoin = 'round'
  ctx.fill(new Path2D('M112 60 86 105.03 34 105.03 8 60 34 14.97 86 14.97Z'))
  ctx.stroke(new Path2D('M112 60 86 105.03 34 105.03 8 60 34 14.97 86 14.97Z'))
  ctx.strokeStyle = ON_INK
  ctx.lineWidth = 11
  ctx.lineCap = 'round'
  ctx.stroke(new Path2D('M47 84V37h31M47 60h24'))
  ctx.restore()
}

function font(ctx, weight, px, stretch = 'normal') {
  ctx.font = `${weight} ${Math.round(px)}px ${FONT}`
  if ('fontStretch' in ctx) ctx.fontStretch = stretch
}

function drawFrame(ctx, W, H, fr, { map, plan, text, colour, look }) {
  const k = W / 1080 // everything is laid out for 1080 wide
  const project = map ? (p) => map.project(p) : (p) => projectPoint(fr.cam, p, W, H)
  // The street map, or plain map paper if it couldn't load
  ctx.globalAlpha = 1
  ctx.fillStyle = mapColours(look).paper
  ctx.fillRect(0, 0, W, H)
  if (map) { try { ctx.drawImage(map.canvas, 0, 0, W, H) } catch { /* paper */ } }

  // Hexes taken
  if (fr.hexes > 0 && plan.hexRings.length) {
    ctx.fillStyle = colour
    ctx.strokeStyle = colour
    ctx.lineWidth = 2.4 * k
    for (const r of plan.hexRings) {
      hexPath(ctx, r, project)
      ctx.globalAlpha = 0.34 * fr.hexes
      ctx.fill()
      ctx.globalAlpha = 0.85 * fr.hexes
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  // A faint line of the whole route while it's still being drawn
  if (fr.f < 1) {
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    linePath(ctx, plan.path, project)
    ctx.globalAlpha = 0.28
    ctx.strokeStyle = look === 'night' ? ON_INK : INK // reads on either street map
    ctx.lineWidth = 5 * k
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  // The trail so far, with a white halo, then the runner
  const trail = plan.trailTo(fr.f)
  if (trail.length > 1) {
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    linePath(ctx, trail, project)
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 14 * k
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 30 * k
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = colour
    ctx.lineWidth = 18 * k
    ctx.stroke()
  }
  if (fr.id === 'follow' || fr.id === 'flyin' || (fr.id === 'orbit' && fr.u < 0.3)) {
    const q = project(trail[trail.length - 1] || plan.path[0])
    if (q) {
      ctx.beginPath()
      ctx.arc(q.x, q.y, 17 * k, 0, Math.PI * 2)
      ctx.fillStyle = colour
      ctx.fill()
      ctx.lineWidth = 7 * k
      ctx.strokeStyle = '#FFFFFF'
      ctx.stroke()
    }
  }

  // Top: wordmark and date, on a soft ink fade
  let g = ctx.createLinearGradient(0, 0, 0, 420 * k)
  g.addColorStop(0, 'rgba(22,48,42,0.78)')
  g.addColorStop(1, 'rgba(22,48,42,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, 420 * k)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  brandMark(ctx, 72 * k, 120 * k, 84 * k, colour)
  ctx.fillStyle = ON_INK
  font(ctx, 850, 64 * k, 'expanded')
  ctx.fillText(text.brand, 172 * k, 184 * k)
  font(ctx, 600, 38 * k)
  ctx.fillStyle = 'rgba(243,245,239,0.85)'
  if (text.when) ctx.fillText(text.when, 74 * k, 262 * k)
  if (text.name) { font(ctx, 750, 40 * k); ctx.fillStyle = ON_INK; ctx.fillText(text.name, 74 * k, 316 * k) }

  // Live distance while following
  if (fr.counter > 0 && fr.end < 1) {
    ctx.globalAlpha = fr.counter * (1 - fr.end)
    g = ctx.createLinearGradient(0, H - 560 * k, 0, H)
    g.addColorStop(0, 'rgba(22,48,42,0)')
    g.addColorStop(1, 'rgba(22,48,42,0.72)')
    ctx.fillStyle = g
    ctx.fillRect(0, H - 560 * k, W, 560 * k)
    ctx.fillStyle = ON_INK
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 24 * k
    font(ctx, 850, 230 * k, 'expanded')
    const num = counterText(fr.metres)
    ctx.fillText(num, 72 * k, H - 210 * k)
    const w = ctx.measureText(num).width
    font(ctx, 700, 64 * k)
    ctx.fillText('km', 72 * k + w + 18 * k, H - 210 * k)
    ctx.shadowBlur = 0
    if (fr.id === 'orbit' && fr.hexes > 0) {
      ctx.globalAlpha = fr.hexes * (1 - fr.end)
      ctx.save()
      ctx.translate(96 * k, H - 132 * k)
      ctx.fillStyle = colour
      ctx.fill(hexagon(22 * k))
      ctx.restore()
      font(ctx, 750, 52 * k)
      ctx.fillStyle = ON_INK
      ctx.fillText(text.hexLine, 136 * k, H - 114 * k)
    }
    ctx.globalAlpha = 1
  }

  // End card: hexes taken, distance, time, pace, address
  if (fr.end > 0) {
    const cardH = 700 * k
    const y0 = H - cardH - 96 * k + (1 - fr.end) * 80 * k
    ctx.globalAlpha = fr.end
    ctx.fillStyle = 'rgba(22,48,42,0.94)'
    roundRect(ctx, 48 * k, y0, W - 96 * k, cardH, 44 * k)
    ctx.fill()
    ctx.save()
    ctx.translate(126 * k, y0 + 128 * k)
    ctx.fillStyle = colour
    ctx.fill(hexagon(40 * k))
    ctx.restore()
    ctx.fillStyle = ON_INK
    font(ctx, 850, 92 * k, 'expanded')
    fitText(ctx, text.hexLine, 196 * k, y0 + 160 * k, W - 300 * k)
    const colW = (W - 192 * k) / 3
    text.stats.forEach((s, i) => {
      const x = 96 * k + i * colW
      ctx.fillStyle = ON_INK
      font(ctx, 850, 84 * k, 'semi-expanded')
      fitText(ctx, s.value, x, y0 + 352 * k, colW - 30 * k)
      ctx.fillStyle = 'rgba(243,245,239,0.72)'
      font(ctx, 600, 38 * k)
      ctx.fillText(s.label, x, y0 + 408 * k)
    })
    ctx.fillStyle = 'rgba(243,245,239,0.16)'
    ctx.fillRect(96 * k, y0 + 488 * k, W - 192 * k, 2 * k)
    brandMark(ctx, 96 * k, y0 + 540 * k, 70 * k, colour)
    ctx.fillStyle = ON_INK
    font(ctx, 750, 46 * k)
    ctx.fillText(text.url, 186 * k, y0 + 592 * k)
    ctx.globalAlpha = 1
  }
}

function hexagon(r) {
  const p = new Path2D()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    p[i ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a))
  }
  p.closePath()
  return p
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return }
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fitText(ctx, s, x, y, max) {
  const w = ctx.measureText(s).width
  if (w <= max) { ctx.fillText(s, x, y); return }
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(max / w, 1)
  ctx.fillText(s, 0, 0)
  ctx.restore()
}

// ---- making a reel ----

/**
 * Make a reel. Resolves { blob, file, url, type, ext, ms } or throws
 * (name 'AbortError' when cancelled).
 *   ground: from reelGround() (trimmed track, hexes, count)
 *   opts: { activity, colour, name, showName, music, origin, mime, signal,
 *           onStage(label), onProgress(0..1), onCanvas(canvas) }
 */
export async function makeReel(ground, opts = {}) {
  const { activity, colour = '#2E55E6', name = '', showName = false, music = true, origin = location.origin, signal, onStage = () => {}, onProgress = () => {}, onCanvas = () => {} } = opts
  const mime = opts.mime || reelSupport().mime
  if (!mime) throw new Error('This browser can’t record video.')
  const reel = planReel(ground.plan, { distanceM: activity?.distanceM })
  const size = opts.size || reelSize({ deviceMemory: navigator.deviceMemory, cores: navigator.hardwareConcurrency })
  const text = reelText({ activity, hexCount: ground.hexCount, name, showName, origin })
  const live = () => { if (signal?.aborted) throw abortError() }
  const look = opts.look || currentLook()

  // Wake sound now, while we still have the tap
  const ac = music ? audioContext() : null
  const waking = ac ? resumeAudio() : Promise.resolve(false)

  const out = document.createElement('canvas')
  out.width = size.width
  out.height = size.height
  const ctx = out.getContext('2d')
  let map = null
  const draw = (fr) => drawFrame(ctx, size.width, size.height, fr, { map, plan: ground.plan, text, colour, look })
  onCanvas(out)

  onStage('map')
  try { await document.fonts?.load?.(`850 64px Archivo`) } catch { /* system font */ }
  map = await makeMap(size, reel.cams.wide, look)
  live()
  let wake = null
  let rec = null
  let score = null
  let bus = null
  let stopped = false
  const cleanup = () => {
    stopped = true
    try { score?.stop({ fade: 0.1 }) } catch { /* gone */ }
    try { bus?.disconnect() } catch { /* gone */ }
    try { wake?.release() } catch { /* gone */ }
    map?.destroy()
    map = null
  }
  try {
    // Load the tiles along the way first, so the fast camera doesn't outrun them
    if (map) {
      const stops = [reel.cams.wide, reel.cams.start, ...[0.2, 0.4, 0.6, 0.8, 1].map((f) => reel.followAt(f)), reel.cams.orbitFrom, reel.cams.overview]
      for (let i = 0; i < stops.length; i++) {
        live()
        map.set(stops[i])
        draw({ ...reelFrame(reel, 0), cam: stops[i] })
        await map.idle(2500)
        onProgress((i + 1) / stops.length * 0.1)
      }
    }
    draw(reelFrame(reel, 0))
    live()

    try { wake = await navigator.wakeLock?.request('screen') } catch { /* the phone may dim; fine */ }

    const stream = out.captureStream(30)
    if (ac && (await waking) && ac.state === 'running') {
      const dest = ac.createMediaStreamDestination()
      bus = ac.createGain()
      bus.gain.value = 0.9
      const limiter = ac.createDynamicsCompressor()
      limiter.threshold.value = -6
      limiter.ratio.value = 12
      bus.connect(limiter)
      limiter.connect(dest)
      const track = dest.stream.getAudioTracks()[0]
      if (track) {
        stream.addTrack(track)
        score = createScore({ getContext: () => ac, getOut: () => bus })
      }
    }
    const chunks = []
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: size.width >= 1080 ? 8_000_000 : 5_000_000, audioBitsPerSecond: 128_000 })
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
    const finished = new Promise((resolve, reject) => {
      rec.onstop = resolve
      rec.onerror = (e) => reject(e.error || new Error('Recording failed'))
    })

    onStage('recording')
    const total = reel.timeline.total
    let section = ''
    const hidden = () => document.visibilityState === 'hidden'
    await new Promise((resolve, reject) => {
      let t0 = 0
      const frame = (now) => {
        if (stopped) return resolve()
        if (signal?.aborted) return reject(abortError())
        if (hidden()) return reject(Object.assign(new Error('Foothold went into the background.'), { name: 'HiddenError' }))
        if (!t0) {
          t0 = now
          rec.start(1000)
          score?.start('flyin')
        }
        const t = Math.min(total, now - t0)
        const fr = reelFrame(reel, t)
        if (fr.id !== section) {
          section = fr.id
          if (score && section !== 'end') score.setSection(section)
        }
        if (score && fr.id === 'follow') score.setIntensity(0.3 + 0.7 * fr.f)
        try { map?.set(fr.cam) } catch { /* keep going */ }
        draw(fr)
        onProgress(0.1 + 0.9 * (t / total))
        if (t < total) requestAnimationFrame(frame)
        else setTimeout(resolve, 100) // hold the last frame a moment
      }
      requestAnimationFrame(frame)
    })
    rec.stop()
    await finished
    live()
    const { type, ext } = fileTypeFor(rec.mimeType || mime)
    const blob = new Blob(chunks, { type })
    if (!blob.size) throw new Error('The video came out empty.')
    const fileName = reelFileName(activity, ext)
    let file = null
    try { file = new File([blob], fileName, { type }) } catch { /* older browsers: share the blob */ }
    onProgress(1)
    return { blob, file, fileName, url: URL.createObjectURL(blob), type, ext, ms: total }
  } catch (e) {
    try { if (rec && rec.state !== 'inactive') rec.stop() } catch { /* gone */ }
    throw e
  } finally {
    cleanup()
  }
}
