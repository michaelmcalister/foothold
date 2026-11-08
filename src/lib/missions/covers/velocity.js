// Cover art for Velocity: storm skies, lightning, speed lines and a runner
// glowing gold, over Brisbane and the Gold Coast. Each episode has its own
// twist: the strike at dusk, a CityCat in the rain, the Story Bridge race at
// midnight, a city in the dark, and the super storm at sunrise. Drawn with
// the helpers from covers.js (h); defs ids start with u so covers on one
// screen never clash.

const GOLD = '#FFD23F'
const RED = '#FF4D6D'

const V = {
  'velocity-strike': { sky: [[0, '#0E0826'], [0.45, '#36175F'], [0.78, '#7B3A8C'], [1, '#E7789B']], clouds: '#1A0E36', rain: 26, bolt: true },
  'velocity-ferry': { sky: [[0, '#020D18'], [0.55, '#0B3550'], [1, '#2B8193']], clouds: '#061827', rain: 70, ferry: true },
  'velocity-bridge': { sky: [[0, '#05041A'], [0.6, '#1D1352'], [1, '#5A2F72']], clouds: null, rain: 0, bridge: true },
  'velocity-blackout': { sky: [[0, '#010208'], [0.65, '#080D2A'], [1, '#141B42']], clouds: null, rain: 0, dark: true },
  'velocity-storm': { sky: [[0, '#12071F'], [0.38, '#47195A'], [0.72, '#C4537A'], [1, '#FFB869']], clouds: '#1C0B2A', rain: 0, coast: true },
}

/** A jagged lightning bolt from (x, y0) down to y1, with a branch or two. */
function boltPath(rand, f, x, y0, y1, sway = 18) {
  let d = `M${f(x)} ${f(y0)}`
  let cx = x
  const pts = []
  for (let y = y0 + 14; y < y1; y += 12 + rand() * 12) {
    cx += (rand() - 0.5) * sway
    d += ` L${f(cx)} ${f(y)}`
    pts.push([cx, y])
  }
  d += ` L${f(cx + (rand() - 0.5) * 6)} ${f(y1)}`
  // branches off the main channel
  let b = ''
  for (const i of [Math.floor(pts.length * 0.3), Math.floor(pts.length * 0.55)]) {
    const p = pts[i]
    if (!p) continue
    const side = rand() < 0.5 ? -1 : 1
    let bx = p[0]
    let by = p[1]
    b += ` M${f(bx)} ${f(by)}`
    for (let k = 0; k < 3; k++) { bx += side * (8 + rand() * 10); by += 10 + rand() * 8; b += ` L${f(bx)} ${f(by)}` }
  }
  return { main: d, branch: b }
}

function bolt(rand, h, u, x, y0, y1, { sway = 18, width = 1 } = {}) {
  const { main, branch } = boltPath(rand, h.f, x, y0, y1, sway)
  return `<path d="${main}${branch}" stroke="#C9B6FF" stroke-width="${h.f(12 * width)}" fill="none" opacity="0.45" filter="url(#${u}b)" stroke-linejoin="round"/>`
    + `<path d="${main}" stroke="#FFFFFF" stroke-width="${h.f(3 * width)}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="${branch}" stroke="#F3EEFF" stroke-width="${h.f(1.4 * width)}" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>`
}

/** A heavy bank of storm cloud: soft dark billows with a lit underside. */
function clouds(rand, h, u, colour, { y = 40, n = 9, spread = 70, lit = '#8E6BC4' } = {}) {
  let s = ''
  const puffs = []
  for (let i = 0; i < n; i++) puffs.push([-20 + (i / (n - 1)) * (h.W + 40) + (rand() - 0.5) * 30, y + rand() * spread, 60 + rand() * 50, 24 + rand() * 22])
  for (const [cx, cy, rx, ry] of puffs) s += `<ellipse cx="${h.f(cx)}" cy="${h.f(cy + ry * 0.45)}" rx="${h.f(rx * 0.9)}" ry="${h.f(ry * 0.8)}" fill="${lit}" opacity="0.45" filter="url(#${u}c)"/>`
  for (const [cx, cy, rx, ry] of puffs) s += `<ellipse cx="${h.f(cx)}" cy="${h.f(cy)}" rx="${h.f(rx)}" ry="${h.f(ry)}" fill="${colour}" opacity="0.95" filter="url(#${u}c)"/>`
  return s
}

function rain(rand, h, n, colour = '#CFE6FF') {
  let s = `<g stroke="${colour}" stroke-width="1" stroke-linecap="round">`
  for (let i = 0; i < n; i++) {
    const x = rand() * (h.W + 60)
    const y = rand() * h.H
    const len = 10 + rand() * 14
    s += `<path d="M${h.f(x)} ${h.f(y)} l${h.f(-len * 0.35)} ${h.f(len)}" opacity="${h.f(0.15 + rand() * 0.3)}"/>`
  }
  return s + '</g>'
}

/** Speed streaks behind a runner (to the left), a halo, and a few sparks. */
function speed(rand, h, u, x, y, height, colour, { trail = 1 } = {}) {
  const f = h.f
  const id = colour === GOLD ? 'g' : 'r'
  let s = `<ellipse cx="${f(x - height * 0.1)}" cy="${f(y - height * 0.5)}" rx="${f(height * 0.75)}" ry="${f(height * 0.7)}" fill="url(#${u}h${id})"/>`
  const n = 8
  for (let i = 0; i < n; i++) {
    const ly = y - height * (0.12 + 0.78 * (i / (n - 1)))
    const len = height * trail * (1 + rand() * 1.5)
    const x0 = x - height * (0.28 + rand() * 0.2)
    const th = 1.5 + rand() * 4
    s += `<path d="M${f(x0)} ${f(ly - th / 2)} L${f(x0 - len)} ${f(ly)} L${f(x0)} ${f(ly + th / 2)} Z" fill="url(#${u}s${id})" opacity="${f(0.55 + rand() * 0.45)}"/>`
  }
  for (let i = 0; i < 9; i++) s += `<circle cx="${f(x - rand() * height * 1.1)}" cy="${f(y - rand() * 10)}" r="${f(0.8 + rand() * 1.8)}" fill="${i % 3 ? colour : '#FFFFFF'}" opacity="${f(0.5 + rand() * 0.5)}"/>`
  return s
}

/** Little arcs of electricity crackling round a runner. */
function crackle(rand, h, x, y, height, colour) {
  const f = h.f
  let s = `<g stroke="${colour}" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round">`
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2
    let px = x + Math.cos(a) * height * 0.42
    let py = y - height * 0.5 + Math.sin(a) * height * 0.5
    let d = `M${f(px)} ${f(py)}`
    for (let k = 0; k < 3; k++) { px += Math.cos(a) * 5 + (rand() - 0.5) * 8; py += Math.sin(a) * 5 + (rand() - 0.5) * 8; d += ` L${f(px)} ${f(py)}` }
    s += `<path d="${d}" opacity="${f(0.6 + rand() * 0.4)}"/>`
  }
  return s + '</g>'
}

/** A glowing runner: streaks, halo, crackle, and a bright body with a coloured rim. */
function hero(rand, h, u, x, y, height, colour = GOLD, opts = {}) {
  const body = colour === GOLD ? '#FFF7DA' : '#FFE1E8'
  return speed(rand, h, u, x, y, height, colour, opts) + crackle(rand, h, x, y, height, colour) + h.runner(x, y, height, body, false, colour)
}

/** The Story Bridge: a cantilever truss with two piers, lit in gold. */
function storyBridge(h, x0, x1, deck, rise, colour, lights) {
  const f = h.f
  const w = x1 - x0
  const p1 = x0 + w * 0.3
  const p2 = x0 + w * 0.7
  const mid = (p1 + p2) / 2
  const top = (x) => {
    if (x <= p1) return deck - 8 - (rise - 8) * ((x - x0) / (p1 - x0))
    if (x <= mid) return deck - rise + (rise * 0.62) * ((x - p1) / (mid - p1))
    if (x <= p2) return deck - rise * 0.38 - (rise * 0.62) * ((x - mid) / (p2 - mid))
    return deck - rise + (rise - 8) * ((x - p2) / (x1 - p2))
  }
  let chord = `M${f(x0)} ${f(top(x0))}`
  for (let x = x0; x <= x1; x += 4) chord += ` L${f(x)} ${f(top(x))}`
  let lattice = ''
  const step = w / 26
  for (let x = x0; x < x1 - 1; x += step) {
    const xm = x + step / 2
    lattice += `M${f(x)} ${f(deck)} L${f(xm)} ${f(top(xm))} L${f(x + step)} ${f(deck)} `
  }
  let s = `<g stroke="${colour}" fill="none" stroke-linejoin="round">`
    + `<path d="${chord}" stroke-width="4"/><path d="M${f(x0 - 30)} ${f(deck)} L${f(x1 + 30)} ${f(deck)}" stroke-width="5"/>`
    + `<path d="${lattice}" stroke-width="1.6"/></g>`
  for (const px of [p1, p2]) s += `<rect x="${f(px - 6)}" y="${f(top(px) - 4)}" width="12" height="${f(h.H - top(px))}" fill="${colour}"/>`
  if (lights) {
    s += `<path d="${chord}" stroke="${lights}" stroke-width="1.6" fill="none" stroke-dasharray="1 6" stroke-linecap="round"/>`
    s += `<path d="M${f(x0 - 30)} ${f(deck - 2)} L${f(x1 + 30)} ${f(deck - 2)}" stroke="${lights}" stroke-width="1.4" stroke-dasharray="1 5" stroke-linecap="round"/>`
  }
  return s
}

/** A CityCat: twin hulls, a long cabin with lit windows, a wake behind. */
function cityCat(h, x, y, lit) {
  const f = h.f
  let s = `<path d="M${f(x - 90)} ${f(y + 10)} q50 6 120 0 q40 -2 52 -10" stroke="#BFEFFF" stroke-width="2" fill="none" opacity="0.35"/>`
  s += `<path d="M${f(x - 70)} ${f(y)} L${f(x + 70)} ${f(y)} L${f(x + 84)} ${f(y - 8)} L${f(x - 66)} ${f(y - 8)} Z" fill="#081A28"/>`
  s += `<path d="M${f(x - 56)} ${f(y - 8)} L${f(x + 62)} ${f(y - 8)} L${f(x + 52)} ${f(y - 26)} L${f(x - 50)} ${f(y - 26)} Z" fill="#0F3A52"/>`
  s += `<rect x="${f(x - 26)}" y="${f(y - 34)}" width="46" height="9" rx="2" fill="#16506E"/>`
  for (let wx = x - 46; wx < x + 50; wx += 11) s += `<rect x="${f(wx)}" y="${f(y - 21)}" width="7" height="7" rx="1" fill="${lit}"/>`
  s += `<path d="M${f(x - 66)} ${f(y - 1)} L${f(x + 80)} ${f(y - 1)}" stroke="${lit}" stroke-width="1" opacity="0.5"/>`
  return s
}

/** The Gold Coast skyline, with its tallest tower and spire near the middle. */
function goldCoast(rand, h, base, colour, lit) {
  const f = h.f
  let s = h.skyline(rand, base, colour, lit, { maxH: 70 })
  // a row of tall beachfront towers
  for (const [x, w, top] of [[34, 22, 150], [66, 18, 175], [214, 20, 160], [244, 24, 140]]) {
    s += `<rect x="${x}" y="${top}" width="${w}" height="${f(base - top + 2)}" fill="${colour}"/>`
    for (let wy = top + 8; wy < base - 6; wy += 9) if (rand() < 0.5) s += `<rect x="${x + 4}" y="${wy}" width="${w - 8}" height="2" fill="${lit}" opacity="${f(0.4 + rand() * 0.5)}"/>`
  }
  // the tallest one, with its spire
  s += `<path d="M168 ${base} L168 118 Q180 100 192 118 L192 ${base} Z" fill="${colour}"/><path d="M180 104 L180 52" stroke="${colour}" stroke-width="3"/>`
  for (let wy = 126; wy < base - 6; wy += 8) s += `<rect x="172" y="${wy}" width="16" height="2" fill="${lit}" opacity="${f(0.5 + rand() * 0.5)}"/>`
  return s
}

function draw(m, rand, u, h) {
  const v = V[m.id] || V['velocity-strike']
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, v.sky)}${h.glow(`${u}rg`, GOLD, 0.55)}${h.glow(`${u}hg`, GOLD, 0.6)}${h.glow(`${u}hr`, RED, 0.5)}`
    + `<linearGradient id="${u}sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${GOLD}" stop-opacity="0"/><stop offset="0.7" stop-color="${GOLD}" stop-opacity="0.8"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>`
    + `<linearGradient id="${u}sr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${RED}" stop-opacity="0"/><stop offset="0.7" stop-color="${RED}" stop-opacity="0.8"/><stop offset="1" stop-color="#FFD0DA"/></linearGradient>`
    + `${h.glow(`${u}g`, '#FFF1B8', 0.9)}${h.glow(`${u}v`, '#B69CFF', 0.6)}`
    + `${h.blur(`${u}b`, 4)}${h.blur(`${u}c`, 9)}`
    + `<linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16123A"/><stop offset="1" stop-color="#05040F"/></linearGradient></defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`

  if (v.bolt) {
    // dusk storm over the river: the bolt hits the lamp post right beside you
    s += h.stars(rand, 14, { bottom: 70 })
    s += clouds(rand, h, u, v.clouds, { y: 0, n: 8, spread: 50, lit: '#9A6FD0' })
    s += `<circle cx="214" cy="222" r="110" fill="url(#${u}v)"/>`
    s += h.skyline(rand, 238, '#140B2C', '#FFCF7A', { maxH: 110 })
    s += `<rect y="238" width="${W}" height="${H - 238}" fill="url(#${u}w)"/>`
    for (let i = 0; i < 20; i++) s += `<rect x="${f(rand() * W)}" y="${f(244 + rand() * 50)}" width="${f(6 + rand() * 20)}" height="1.4" fill="#FFCF7A" opacity="${f(0.15 + rand() * 0.35)}"/>`
    s += `<path d="M0 312 Q120 296 ${W} 306 L${W} ${H} L0 ${H} Z" fill="#07040F"/>`
    // the lamp post, the bolt and the flash where it lands
    s += `<path d="M236 360 L236 214 Q236 202 222 202" stroke="#07040F" stroke-width="5" fill="none"/>`
    s += `<circle cx="220" cy="204" r="48" fill="url(#${u}g)"/>`
    s += bolt(rand, h, u, 176, -5, 202, { sway: 30, width: 1.3 })
    s += `<path d="M236 360 L236 214 Q236 202 222 202" stroke="#FFF7DA" stroke-width="1" fill="none" opacity="0.3"/>`
    s += rain(rand, h, v.rain)
    s += hero(rand, h, u, 150, 356, 96)
    return s
  }

  if (v.ferry) {
    // rain on the river, a CityCat lit up, a red streak on the far bank
    s += clouds(rand, h, u, v.clouds, { y: -10, n: 8, spread: 50, lit: '#2F7F99' })
    s += bolt(rand, h, u, 246, 10, 222, { sway: 16, width: 0.9 })
    s += h.skyline(rand, 222, '#06192A', '#FFD27A', { maxH: 120 })
    s += `<rect y="222" width="${W}" height="${H - 222}" fill="#041420"/>`
    s += `<circle cx="246" cy="224" r="30" fill="url(#${u}g)" opacity="0.8"/>`
    for (let i = 0; i < 24; i++) s += `<rect x="${f(rand() * W)}" y="${f(228 + rand() * 90)}" width="${f(6 + rand() * 22)}" height="1.4" fill="#FFD27A" opacity="${f(0.15 + rand() * 0.4)}"/>`
    // the red blur on the far bank
    s += `<ellipse cx="74" cy="220" rx="34" ry="9" fill="url(#${u}hr)"/><path d="M92 220 L28 221" stroke="${RED}" stroke-width="2.5" stroke-linecap="round"/><path d="M88 217 L46 217" stroke="#FFC2CF" stroke-width="1" opacity="0.8"/>`
    s += cityCat(h, 150, 266, '#FFE7A3')
    // the Riverwalk in the foreground
    s += `<rect y="326" width="${W}" height="${H - 326}" fill="#020910"/><path d="M0 326 L${W} 326" stroke="#5FD0E0" stroke-width="2" opacity="0.5"/>`
    s += rain(rand, h, v.rain)
    s += hero(rand, h, u, 168, 362, 84)
    return s
  }

  if (v.bridge) {
    // midnight on the Story Bridge: two runners, two trails, gold against red
    s += h.stars(rand, 70, { bottom: 170 })
    s += `<circle cx="150" cy="190" r="140" fill="url(#${u}rg)" opacity="0.45"/>`
    s += h.skyline(rand, 222, '#0C0828', '#FFCF7A', { maxH: 70 })
    s += `<rect y="222" width="${W}" height="${H - 222}" fill="#050414"/>`
    for (let i = 0; i < 30; i++) s += `<rect x="${f(rand() * W)}" y="${f(228 + rand() * 60)}" width="${f(8 + rand() * 24)}" height="1.4" fill="${GOLD}" opacity="${f(0.12 + rand() * 0.35)}"/>`
    s += storyBridge(h, 10, 290, 196, 112, '#0A0720', GOLD)
    // the crowd on the cliffs, phones held high
    s += `<path d="M0 300 Q150 286 ${W} 298 L${W} ${H} L0 ${H} Z" fill="#030209"/>`
    for (let i = 0; i < 30; i++) s += `<circle cx="${f(4 + i * 10 + rand() * 6)}" cy="${f(292 + rand() * 12)}" r="1.4" fill="#FFF6D6" opacity="${f(0.4 + rand() * 0.6)}"/>`
    s += hero(rand, h, u, 92, 336, 64, RED, { trail: 0.7 })
    s += hero(rand, h, u, 196, 362, 90, GOLD, { trail: 0.75 })
    return s
  }

  if (v.dark) {
    // the city in the dark: stars over Brisbane, one tower waking up, one trail of light
    s += `<path d="M-20 230 Q130 90 330 30" stroke="#B9C8FF" stroke-width="44" fill="none" opacity="0.12" filter="url(#${u}c)"/>`
    s += h.stars(rand, 170, { bottom: 260 })
    s += `<circle cx="232" cy="66" r="44" fill="url(#${u}g)" opacity="0.5"/><circle cx="232" cy="66" r="14" fill="#F7F0DA"/><circle cx="238" cy="62" r="12" fill="${v.sky[0][1]}"/>`
    s += h.skyline(rand, 276, '#020208', '#020208', { maxH: 150 })
    s += storyBridge(h, -10, 130, 262, 40, '#020208', null)
    s += `<rect x="150" y="96" width="34" height="182" fill="#020208"/><path d="M167 96 L167 70" stroke="#020208" stroke-width="2"/><circle cx="167" cy="70" r="10" fill="url(#${u}rg)"/><circle cx="167" cy="70" r="2.4" fill="${GOLD}"/>`
    for (let wy = 106; wy < 150; wy += 9) for (let wx = 154; wx < 180; wx += 7) if (rand() < 0.7) s += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="${GOLD}" opacity="${f(0.6 + rand() * 0.4)}"/>`
    s += `<rect y="276" width="${W}" height="${H - 276}" fill="#010105"/>`
    // the trail of light winding through the dark streets to the runner
    const trail = 'M10 288 C 80 284, 40 316, 100 318 S 150 306, 120 340'
    s += `<path d="${trail}" stroke="${GOLD}" stroke-width="10" fill="none" opacity="0.3" filter="url(#${u}b)"/>`
    s += `<path d="${trail}" stroke="#FFF1B8" stroke-width="2" fill="none" stroke-dasharray="2 6" stroke-linecap="round"/>`
    s += hero(rand, h, u, 160, 360, 96, GOLD, { trail: 0.6 })
    return s
  }

  // the super storm over the Gold Coast at sunrise
  s += `<circle cx="150" cy="290" r="180" fill="url(#${u}g)" opacity="0.4"/>`
  s += clouds(rand, h, u, v.clouds, { y: -20, n: 10, spread: 60, lit: '#C77BC8' })
  s += clouds(rand, h, u, '#2A1240', { y: 60, n: 7, spread: 30, lit: '#E58FA8' })
  // the storm's spin
  s += `<g fill="none" stroke="#F2C4FF" stroke-width="1.5" stroke-linecap="round" opacity="0.3"><path d="M50 116 Q150 60 250 116"/><path d="M30 146 Q150 80 270 144"/><path d="M80 92 Q150 58 222 90"/></g>`
  s += bolt(rand, h, u, 92, 80, 262, { sway: 22, width: 1.1 })
  s += bolt(rand, h, u, 244, 70, 258, { sway: 16, width: 0.9 })
  s += bolt(rand, h, u, 150, 50, 126, { sway: 12, width: 0.6 })
  s += goldCoast(rand, h, 270, '#1B0A24', '#FFD9A0')
  // the ocean and the surf
  s += `<rect y="270" width="${W}" height="44" fill="#2A1638"/>`
  for (let i = 0; i < 7; i++) s += `<path d="M${f(-20 + rand() * 40)} ${f(276 + i * 6)} Q${f(80 + rand() * 40)} ${f(272 + i * 6)} ${f(170 + rand() * 40)} ${f(277 + i * 6)} T${W + 20} ${f(276 + i * 6)}" stroke="#FFD9C2" stroke-width="1.2" fill="none" opacity="${f(0.25 + rand() * 0.4)}"/>`
  // the sand
  s += `<path d="M0 312 Q150 300 ${W} 314 L${W} ${H} L0 ${H} Z" fill="#0E0614"/>`
  s += hero(rand, h, u, 92, 346, 66, RED, { trail: 0.7 })
  s += hero(rand, h, u, 192, 362, 90, GOLD, { trail: 0.75 })
  return s
}

export const COVER = { saga: 'velocity', draw }
