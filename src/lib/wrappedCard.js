// Drawing for Foothold Wrapped: a Web Mercator fit that lines a canvas up
// with a MapLibre camera, hexes drawn onto a canvas, the loop shape as an
// SVG path, and the 1080 by 1920 share card (canvas to PNG, then the Web
// Share API with files, or a download).
import { cellToBoundary } from 'h3-js'
import { clock } from './engine/bests.js'

const TILE = 512 // MapLibre's world is 512 px wide at zoom 0
const mx = (lng) => (lng + 180) / 360
const my = (lat) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
}
const unx = (x) => x * 360 - 180
const uny = (y) => (360 / Math.PI) * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - 90

/** Hex outlines as [lng, lat] rings */
export const hexRings = (hexes) => hexes.map((h) => cellToBoundary(h, true))

/**
 * Fit [lng, lat] points into a w by h box with padding. Returns project()
 * to canvas pixels (and unproject back), plus the MapLibre camera ({ center, zoom }) that shows
 * the same view in a map of the same CSS size.
 */
export function fitView(points, w, h, { pad = 32, maxZoom = 16.5 } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [lng, lat] of points) {
    const x = mx(lng), y = my(lat)
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  if (!Number.isFinite(x0)) { x0 = x1 = mx(151.2); y0 = y1 = my(-33.87) }
  const dx = Math.max(1e-12, x1 - x0), dy = Math.max(1e-12, y1 - y0)
  const scale = Math.min((w - 2 * pad) / dx, (h - 2 * pad) / dy, TILE * 2 ** maxZoom)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  return {
    project: ([lng, lat]) => [w / 2 + (mx(lng) - cx) * scale, h / 2 + (my(lat) - cy) * scale],
    unproject: ([x, y]) => [unx(cx + (x - w / 2) / scale), uny(cy + (y - h / 2) / scale)],
    center: [unx(cx), uny(cy)],
    zoom: Math.log2(scale / TILE),
  }
}

/** Fill and edge a list of projected rings */
export function drawRings(ctx, rings, { fill, stroke, alpha = 0.5, width = 1 }) {
  ctx.beginPath()
  for (const r of rings) {
    r.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
  }
  ctx.globalAlpha = alpha
  ctx.fillStyle = fill
  ctx.fill()
  ctx.globalAlpha = 1
  if (stroke) {
    ctx.lineWidth = width
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

/** An SVG path for a [lng, lat] ring, fitted to a size by size box */
export function loopPath(ring, size = 240, pad = 16) {
  if (!ring?.length) return ''
  const { project } = fitView(ring, size, size, { pad, maxZoom: 22 })
  return ring.map((p, i) => {
    const [x, y] = project(p)
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ') + 'Z'
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const tint = (c, aa) => (/^#[0-9a-f]{6}$/i.test(c) ? c + aa : `rgba(46, 85, 230, ${parseInt(aa, 16) / 255})`)
const FONT = "'Archivo', system-ui, sans-serif"
const fmtNum = (n) => Math.round(n).toLocaleString('en-AU')

/** The four headline numbers for the card and the numbers slide, skipping empty ones */
export function headline(totals) {
  const out = [{ value: totals.km >= 100 ? fmtNum(totals.km) : String(totals.km), label: 'km' }]
  out.push({ value: fmtNum(totals.activities), label: totals.activities === 1 ? 'outing' : 'outings' })
  if (totals.hexes) out.push({ value: fmtNum(totals.hexes), label: 'hexes taken' })
  if (totals.climbM) out.push({ value: fmtNum(totals.climbM), label: 'metres climbed' })
  return out
}

/** A best effort's value in words: "24:31" or "42.3 km" */
export const bestText = (b) => (b.kind === 'dist' ? `${(b.value / 1000).toFixed(1)} km` : clock(b.value))

/**
 * The share card: 1080 by 1920, your footprint in your colour, the big
 * numbers, and your favourite loop. No name unless showName is on.
 */
export function drawCard(canvas, { summary, colour = '#2E55E6', name = '', showName = false, full = true }) {
  const W = 1080, H = 1920
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#16302A'
  ctx.fillRect(0, 0, W, H)
  // A soft glow of your colour behind the map
  const g = ctx.createRadialGradient(W / 2, 760, 60, W / 2, 760, 760)
  g.addColorStop(0, tint(colour, '55'))
  g.addColorStop(1, '#16302A00')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#F3F5EF'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 64px ${FONT}`
  ctx.fillText('FOOTHOLD', 88, 150)
  ctx.font = `600 40px ${FONT}`
  ctx.fillStyle = 'rgba(243, 245, 239, 0.72)'
  ctx.fillText(full ? `Wrapped ${summary.year}` : 'My year so far', 88, 210)
  ctx.font = `900 132px ${FONT}`
  ctx.fillStyle = '#F3F5EF'
  ctx.fillText(`${summary.year}.`, 88, 370)
  ctx.font = `800 76px ${FONT}`
  ctx.fillText(showName && name ? `${name} took ground.` : 'I took ground.', 88, 460, W - 176)

  // The footprint
  const box = { x: 88, y: 520, w: W - 176, h: 640 }
  roundRect(ctx, box.x, box.y, box.w, box.h, 36)
  ctx.fillStyle = 'rgba(243, 245, 239, 0.06)'
  ctx.fill()
  const rings = hexRings(summary.footprint || [])
  if (rings.length) {
    const { project } = fitView(rings.flat(), box.w, box.h, { pad: 48 })
    ctx.save()
    ctx.translate(box.x, box.y)
    drawRings(ctx, rings.map((r) => r.map(project)), { fill: colour, stroke: colour, alpha: 0.75, width: 2 })
    ctx.restore()
  } else if (summary.loop) {
    ctx.save()
    ctx.translate(box.x + box.w / 2 - 260, box.y + box.h / 2 - 260)
    ctx.lineWidth = 14
    ctx.lineJoin = 'round'
    ctx.strokeStyle = colour
    ctx.stroke(new Path2D(loopPath(summary.loop.ring, 520, 30)))
    ctx.restore()
  }

  // The numbers, two by two
  const nums = headline(summary.totals).slice(0, 4)
  nums.forEach((n, i) => {
    const x = 88 + (i % 2) * 470
    const y = 1290 + Math.floor(i / 2) * 210
    ctx.fillStyle = '#F3F5EF'
    ctx.font = `900 110px ${FONT}`
    ctx.fillText(n.value, x, y, 440)
    ctx.fillStyle = 'rgba(243, 245, 239, 0.72)'
    ctx.font = `600 40px ${FONT}`
    ctx.fillText(n.label, x, y + 56)
  })

  ctx.fillStyle = 'rgba(243, 245, 239, 0.72)'
  ctx.font = `600 38px ${FONT}`
  const extra = []
  if (summary.loop) extra.push(`Favourite loop: ${summary.loop.times} times round`)
  if (summary.month) extra.push(`Best month: ${summary.month.name}`)
  extra.slice(0, 2).forEach((t, i) => ctx.fillText(t, 88, 1730 + i * 54, W - 176))
  ctx.fillStyle = colour
  ctx.fillRect(88, 1830, 120, 10)
  return canvas
}

/** The card as a PNG blob */
export const cardBlob = (canvas) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))

/** Share the card through the phone's share sheet, or save it. Returns 'shared', 'saved' or 'cancelled'. */
export async function shareCard(blob, year) {
  const filename = `foothold-${year}.png`
  const file = typeof File === 'function' ? new File([blob], filename, { type: 'image/png' }) : null
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `My ${year} in Foothold` })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
    }
  }
  saveCard(blob, year)
  return 'saved'
}

export function saveCard(blob, year) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `foothold-${year}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
