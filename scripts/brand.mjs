// Generates the Foothold logo concept SVGs into public/brand/.
// Run: node scripts/brand.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const C = {
  ink: '#16302A',
  paper: '#F3F5EF',
  you: '#2E55E6',
  youSoft: '#AFC0F7',
  rival: '#E8A817',
}

const out = new URL('../public/brand/', import.meta.url)
mkdirSync(out, { recursive: true })

const f = (n) => +n.toFixed(2)

// Flat-top hexagon points, matching the game map.
function hex(cx, cy, r) {
  const pts = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k
    pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`)
  }
  return pts.join(' ')
}

function svg(body, size = 120) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${body}</svg>\n`
}

// 1. Claimed hex: the hex you own, with an F drawn like a running line.
const F_PATH = 'M47 84V37h31M47 60h24'
const claimed = (fill = C.you, letter = C.paper) => svg(
  `<polygon points="${hex(60, 60, 52)}" fill="${fill}" stroke="${fill}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="${F_PATH}" fill="none" stroke="${letter}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`
)

// 2. Closed loop: a run route that finishes where it started, ground filled inside.
function closedLoop(line = C.you, dot = C.paper) {
  const route = 'M34 92 C16 76 14 44 34 30 C52 17 82 18 96 36 C108 52 100 70 86 74 C74 78 72 92 58 96 C49 99 40 97 34 92 Z'
  let cells = ''
  const r = 7.2
  for (let col = 0; col < 20; col++) {
    for (let row = 0; row < 20; row++) {
      const cx = col * r * 1.5
      const cy = row * Math.sqrt(3) * r + (col % 2 ? (Math.sqrt(3) * r) / 2 : 0)
      cells += `<polygon points="${hex(cx, cy, r - 1.3)}"/>`
    }
  }
  return svg(
    `<defs><clipPath id="loop"><path d="${route}"/></clipPath></defs>` +
    `<g clip-path="url(#loop)" fill="${line}" fill-opacity="0.38">${cells}</g>` +
    `<path d="${route}" fill="none" stroke="${line}" stroke-width="7" stroke-linejoin="round"/>` +
    `<circle cx="34" cy="92" r="9" fill="${dot}" stroke="${line}" stroke-width="5"/>`
  )
}

// 3. Hex footprint: a footprint built from claimed hexes.
function footprint(fill = C.you, accent = C.rival) {
  const r = 7
  const dy = Math.sqrt(3) * r
  const cells = []
  const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
  for (let col = 0; col < 20; col++) {
    for (let row = 0; row < 20; row++) {
      const cx = col * r * 1.5
      const cy = row * dy + (col % 2 ? dy / 2 : 0)
      const sole = inEllipse(cx, cy, 62, 76, 25, 32)
      const arch = inEllipse(cx, cy, 35, 80, 10, 15)
      if (sole && !arch && cy > 50) cells.push([cx, cy])
    }
  }
  let body = cells.map(([x, y], i) =>
    `<polygon points="${hex(x, y, r - 1.1)}" fill="${i === cells.length - 3 ? accent : fill}"/>`).join('')
  const toes = [[42, 36, 6], [55, 27, 7.4], [70, 25, 7], [83, 30, 6.2], [92, 41, 5.4]]
  body += toes.map(([x, y, tr]) => `<polygon points="${hex(x, y, tr)}" fill="${fill}"/>`).join('')
  return svg(body)
}

// 4. Expanding ground: foothold, outpost, stronghold as growing hexes.
function expanding(fill = C.you, line = C.ink) {
  return svg(
    `<polygon points="${hex(62, 60, 50)}" fill="none" stroke="${line}" stroke-width="5" stroke-linejoin="round" stroke-opacity="0.35"/>` +
    `<polygon points="${hex(54, 66, 34)}" fill="none" stroke="${line}" stroke-width="5" stroke-linejoin="round" stroke-opacity="0.65"/>` +
    `<polygon points="${hex(46, 72, 18)}" fill="${fill}" stroke="${fill}" stroke-width="4" stroke-linejoin="round"/>`
  )
}

const files = {
  'mark-claimed-hex.svg': claimed(),
  'mark-claimed-hex-mono.svg': claimed(C.ink, C.paper),
  'mark-closed-loop.svg': closedLoop(),
  'mark-hex-footprint.svg': footprint(),
  'mark-expanding-ground.svg': expanding(),
  'mark-expanding-ground-on-ink.svg': expanding(C.you, C.paper),
}

// App icons: each mark on the ink tile.
const tile = (inner, pad = 20) => svg(
  `<rect width="180" height="180" rx="40" fill="${C.ink}"/>` +
  `<g transform="translate(${pad} ${pad}) scale(${(180 - pad * 2) / 120})">${inner}</g>`, 180)
const innerOf = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
files['icon-claimed-hex.svg'] = tile(innerOf(claimed()), 26)
files['icon-closed-loop.svg'] = tile(innerOf(closedLoop(C.you, C.ink)), 22)
files['icon-hex-footprint.svg'] = tile(innerOf(footprint()), 22)
files['icon-expanding-ground.svg'] = tile(innerOf(expanding(C.you, C.paper)), 24)

for (const [name, content] of Object.entries(files)) writeFileSync(new URL(name, out), content)
console.log(Object.keys(files).join('\n'))
