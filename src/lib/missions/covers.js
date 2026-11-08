// Cover art for the mission picker: original key art for each series, drawn
// as SVG so it is crisp, tiny and works offline. Every episode gets its own
// twist on its series' scene (time of day, a motif, the weather). Covers are
// drawn at 300 x 375 (4:5) with the important parts in the middle, so the
// same art fills the big preview and the 2:3 row cards (slice crop).
// coverSvg is pure (seeded by the mission id), so tests can check it.

const W = 300
const H = 375

/** How each series looks in the picker: accent colour and a short tagline. */
export const SAGA_LOOK = {
  trailkeepers: { accent: '#5FD08B', deep: '#0E2A1E', tag: 'Adventure' },
  ember: { accent: '#FF8A3D', deep: '#2A0B04', tag: 'Thriller' },
  heist: { accent: '#8C9BFF', deep: '#0A0F2A', tag: 'Heist thriller' },
  quiz: { accent: '#E07BFF', deep: '#22082E', tag: 'Game show' },
  signal: { accent: '#5FE3D2', deep: '#04161C', tag: 'Sci-fi thriller' },
}
export const lookFor = (saga) => SAGA_LOOK[saga] || SAGA_LOOK.trailkeepers

// ---- small helpers ------------------------------------------------------

function seeded(str) {
  let h = 2166136261
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const f = (n) => Math.round(n * 10) / 10

function sky(id, stops) {
  const s = stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient>`
}
function glow(id, colour, opacity = 1) {
  return `<radialGradient id="${id}"><stop offset="0" stop-color="${colour}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient>`
}
function stars(rand, n, { top = 0, bottom = H * 0.6, colour = '#fff' } = {}) {
  let out = ''
  for (let i = 0; i < n; i++) {
    const r = rand() < 0.12 ? 1.6 : rand() * 0.9 + 0.4
    out += `<circle cx="${f(rand() * W)}" cy="${f(top + rand() * (bottom - top))}" r="${f(r)}" fill="${colour}" opacity="${f(0.35 + rand() * 0.65)}"/>`
  }
  return out
}
/** A rolling hill line across the frame. */
function hill(rand, y, amp, colour, bumps = 3) {
  let d = `M0 ${H} L0 ${f(y + (rand() - 0.5) * amp)}`
  const step = W / bumps
  for (let i = 0; i < bumps; i++) {
    const x1 = i * step + step / 2
    const x2 = (i + 1) * step
    d += ` Q${f(x1)} ${f(y - amp * (0.4 + rand() * 0.8))} ${f(x2)} ${f(y + (rand() - 0.5) * amp)}`
  }
  return `<path d="${d} L${W} ${H} Z" fill="${colour}"/>`
}
/** A runner, mid stride, as a bold pictogram. x is the centre, y the feet. A rim light lifts it off a dark ground. */
function runner(x, y, h, colour, flip = false, rim = null) {
  const sc = h / 100
  const p = (px, py) => [f(x + (flip ? -1 : 1) * (px - 50) * sc), f(y - (100 - py) * sc)]
  const P = (px, py) => p(px, py).join(' ')
  const body = (stroke, w, extra = '') => `<g stroke="${stroke}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round" fill="none"${extra}>`
    + `<path d="M${P(55, 22)} L${P(46, 54)}"/>`
    + `<path d="M${P(53, 28)} L${P(39, 38)} L${P(31, 31)}"/>`
    + `<path d="M${P(53, 28)} L${P(65, 41)} L${P(77, 35)}"/>`
    + `<path d="M${P(46, 54)} L${P(63, 68)} L${P(58, 93)}"/>`
    + `<path d="M${P(46, 54)} L${P(34, 72)} L${P(17, 76)}"/>`
    + `</g>`
  const [hx, hy] = p(59, 11)
  let out = ''
  if (rim) out += body(rim, 9.5 * sc + 4, ' opacity="0.55"') + `<circle cx="${hx}" cy="${hy}" r="${f(8.5 * sc + 2)}" fill="${rim}" opacity="0.55"/>`
  return out + body(colour, 9.5 * sc) + `<circle cx="${hx}" cy="${hy}" r="${f(8.5 * sc)}" fill="${colour}"/>`
}
/** A gum tree silhouette: a leaning trunk and clumps of canopy. */
function gum(rand, x, y, h, colour) {
  const lean = (rand() - 0.5) * h * 0.25
  let out = `<path d="M${f(x - h * 0.03)} ${y} Q${f(x + lean * 0.3)} ${f(y - h * 0.5)} ${f(x + lean)} ${f(y - h * 0.8)} L${f(x + lean + h * 0.03)} ${f(y - h * 0.8)} Q${f(x + lean * 0.3 + h * 0.05)} ${f(y - h * 0.5)} ${f(x + h * 0.04)} ${y} Z" fill="${colour}"/>`
  const clumps = 7 + Math.floor(rand() * 4)
  for (let i = 0; i < clumps; i++) {
    const cx = x + lean + (rand() - 0.5) * h * 0.5
    const cy = y - h * (0.66 + rand() * 0.3)
    out += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(h * (0.06 + rand() * 0.09))}" ry="${f(h * (0.04 + rand() * 0.05))}" transform="rotate(${f((rand() - 0.5) * 50)} ${f(cx)} ${f(cy)})" fill="${colour}"/>`
    if (i % 2) out += `<path d="M${f(x + lean)} ${f(y - h * 0.75)} L${f(cx)} ${f(cy)}" stroke="${colour}" stroke-width="${f(h * 0.018)}"/>`
  }
  return out
}
function blur(id, sd) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`
}
function grain(id) {
  return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/></filter>`
}

// ---- the series scenes --------------------------------------------------

const TRAIL_TIMES = {
  'first-steps': { sky: [[0, '#2B4C7E'], [0.55, '#F7A072'], [1, '#FFD9A0']], sun: '#FFE7B0', sunY: 175, hills: ['#5C7F63', '#3D6450', '#24463A', '#13302A'], motif: 'flag' },
  'supply-line': { sky: [[0, '#4FA3C7'], [0.6, '#BDE6E1'], [1, '#F2F5D8']], sun: '#FFF6CF', sunY: 95, hills: ['#7DB37A', '#4F9168', '#2F6E52', '#1A4A39'], motif: 'packs' },
  'lantern-night': { sky: [[0, '#0B1033'], [0.6, '#27306B'], [1, '#4A3F7A']], sun: '#F4F1DE', sunY: 80, moon: true, hills: ['#2D3A63', '#1F2B4D', '#141E38', '#0B1326'], motif: 'lanterns' },
  'magpie-season': { sky: [[0, '#7EC8E3'], [0.7, '#D7F0E9'], [1, '#FFF8DC']], sun: '#FFFBE6', sunY: 85, hills: ['#9CC27A', '#6E9F5E', '#3F7449', '#21503A'], motif: 'magpie' },
  'hilltop-crown': { sky: [[0, '#3A1C5C'], [0.5, '#E0607E'], [1, '#FFC371']], sun: '#FFE29A', sunY: 160, hills: ['#7A4E6E', '#4E3556', '#2E2240', '#181428'], motif: 'crown' },
  'steady-scout': { sky: [[0, '#5D8BB0'], [0.6, '#C8DCD8'], [1, '#EEE6CF']], sun: '#FFF1C4', sunY: 120, hills: ['#87A98A', '#5E8A6C', '#3A6853', '#20473A'], motif: 'compass' },
}

function trailkeepers(m, rand, u) {
  const t = TRAIL_TIMES[m.id] || TRAIL_TIMES['first-steps']
  const [h1, h2, h3, h4] = t.hills
  let s = `<defs>${sky(`${u}s`, t.sky)}${glow(`${u}g`, t.sun, 0.9)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  if (t.moon) s += stars(rand, 60, { bottom: 200 })
  s += `<circle cx="150" cy="${t.sunY}" r="110" fill="url(#${u}g)"/>`
  s += `<circle cx="150" cy="${t.sunY}" r="${t.moon ? 22 : 34}" fill="${t.sun}"/>`
  if (t.moon) s += `<circle cx="160" cy="${t.sunY - 6}" r="20" fill="${t.sky[0][1]}"/>`
  s += hill(rand, 200, 40, h1, 2)
  s += hill(rand, 238, 36, h2, 3)
  s += hill(rand, 275, 30, h3, 2)
  // the winding trail up to the far hill
  s += `<path d="M120 ${H} C 60 330, 230 300, 170 262 S 120 228, 150 208" fill="none" stroke="${t.moon ? '#F6D58E' : '#FFF4DC'}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${t.moon ? '2 13' : '1 0'}" opacity="${t.moon ? 1 : 0.75}"/>`
  s += hill(rand, 318, 22, h4, 3)
  if (t.motif === 'lanterns') {
    for (const [x, y] of [[132, 352], [96, 326], [170, 298], [196, 272], [150, 248], [138, 226]]) {
      s += `<circle cx="${x}" cy="${y}" r="14" fill="url(#${u}g)"/><circle cx="${x}" cy="${y}" r="3.2" fill="#FFD27A"/>`
    }
  }
  if (t.motif === 'flag') s += `<path d="M151 208 V176" stroke="#13302A" stroke-width="3"/><path d="M151 176 L172 183 L151 190 Z" fill="#FF7A59"/>`
  if (t.motif === 'crown') s += `<path d="M132 206 L136 186 L144 197 L150 180 L156 197 L164 186 L168 206 Z" fill="#FFD25E" stroke="#181428" stroke-width="2"/>`
  if (t.motif === 'magpie') {
    s += `<g fill="#111"><path d="M110 120 q30 -26 52 -6 q16 -14 40 -8 q-22 6 -30 22 q-10 12 -26 8 q-18 -2 -36 -16 z"/><path d="M128 118 q12 -2 22 6 l-10 8 z" fill="#fff"/><circle cx="196" cy="108" r="1.6" fill="#fff"/></g>`
  }
  if (t.motif === 'packs') s += `<rect x="139" y="190" width="22" height="16" rx="3" fill="#C9772E"/><rect x="143" y="186" width="14" height="6" rx="2" fill="#8E4F1C"/>`
  if (t.motif === 'compass') s += `<g transform="translate(150 100)"><circle r="26" fill="none" stroke="#fff" stroke-width="3" opacity="0.8"/><path d="M0 -22 L6 0 L0 22 L-6 0 Z" fill="#fff" opacity="0.9"/><path d="M0 -22 L6 0 L-6 0 Z" fill="#E4572E"/></g>`
  s += runner(112, 362, 58, h4 === '#0B1326' ? '#05080F' : '#0A1A14', false, t.moon ? '#F6D58E' : null)
  return s
}

const EMBER = {
  'ember-smoke': { top: '#3A0F0A', mid: '#B8381A', low: '#FFB25B', sun: '#FFDD8C', sunY: 150, smoke: 5, embers: 26, wind: 0 },
  'ember-wind': { top: '#2A0705', mid: '#D2421B', low: '#FF9A3C', sun: '#FFC66B', sunY: 175, smoke: 3, embers: 60, wind: 1 },
  'ember-tower': { top: '#0E0303', mid: '#5C130A', low: '#E2531F', sun: '#FF8B47', sunY: 205, smoke: 4, embers: 40, wind: 0, tower: true },
  'ember-dawn': { top: '#3A2A5E', mid: '#E46A6B', low: '#FFD08A', sun: '#FFF0C2', sunY: 225, smoke: 2, embers: 10, wind: 0, dawn: true },
}

function ember(m, rand, u) {
  const e = EMBER[m.id] || EMBER['ember-smoke']
  let s = `<defs>${sky(`${u}s`, [[0, e.top], [0.55, e.mid], [1, e.low]])}${glow(`${u}g`, e.sun)}${blur(`${u}b`, 12)}${glow(`${u}e`, '#FFB347')}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += `<circle cx="150" cy="${e.sunY}" r="120" fill="url(#${u}g)" opacity="0.7"/>`
  s += `<circle cx="150" cy="${e.sunY}" r="40" fill="${e.sun}" opacity="0.95"/>`
  // smoke banks drifting across the sun
  for (let i = 0; i < e.smoke; i++) {
    const y = 90 + rand() * 150
    s += `<ellipse cx="${f(rand() * W)}" cy="${f(y)}" rx="${f(90 + rand() * 80)}" ry="${f(14 + rand() * 16)}" fill="${e.top}" opacity="${f(0.35 + rand() * 0.3)}" filter="url(#${u}b)"/>`
  }
  if (e.tower) {
    s += `<g stroke="#120403" stroke-width="3" fill="none"><path d="M196 300 L214 120 L232 300"/><path d="M200 262 L228 262 M204 222 L224 222 M207 182 L221 182 M210 150 L218 150"/><path d="M200 262 L224 222 L204 222 L221 182 L207 182 L218 150"/></g>`
    s += `<circle cx="214" cy="116" r="10" fill="url(#${u}e)"/><circle cx="214" cy="116" r="3.5" fill="#FF3B2F"/>`
  }
  // the ridge and its gums
  s += hill(rand, 262, 30, '#1A0604', 3)
  for (let i = 0; i < 7; i++) s += gum(rand, 20 + i * 44 + rand() * 20, 268 + rand() * 10, 70 + rand() * 50, '#1A0604')
  s += hill(rand, 312, 18, '#0C0302', 2)
  // embers rising (and flying sideways when the wind turns)
  for (let i = 0; i < e.embers; i++) {
    const x = rand() * W
    const y = 60 + rand() * 280
    const r = 0.8 + rand() * 2.2
    if (e.wind && rand() < 0.6) s += `<path d="M${f(x)} ${f(y)} l${f(-10 - rand() * 14)} ${f(3 + rand() * 4)}" stroke="#FFB347" stroke-width="${f(r)}" stroke-linecap="round" opacity="${f(0.5 + rand() * 0.5)}"/>`
    else s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#FFC15E" opacity="${f(0.5 + rand() * 0.5)}"/>`
  }
  if (e.wind) for (let i = 0; i < 5; i++) s += `<path d="M${f(rand() * W)} ${f(80 + rand() * 200)} q-40 6 -90 2" stroke="#FFE2B8" stroke-width="1.2" fill="none" opacity="0.35"/>`
  if (e.dawn) s += stars(rand, 18, { bottom: 90 })
  // the road and the runner
  s += `<path d="M150 312 L120 ${H} L180 ${H} Z" fill="#2A0D07"/><path d="M150 316 L148 ${H}" stroke="#FFCF7A" stroke-width="2" stroke-dasharray="7 9" opacity="0.6"/>`
  s += runner(150, 368, 64, '#050101', false, '#FF8A3D')
  return s
}

const HEIST = {
  'heist-recruit': { top: '#05081C', low: '#1C2457', beams: 1, moon: false, scene: 'alley' },
  'heist-gala': { top: '#0A0820', low: '#3B2468', beams: 3, moon: false, scene: 'gala' },
  'heist-cross': { top: '#140513', low: '#3F1030', beams: 2, moon: false, scene: 'cross' },
  'heist-ferry': { top: '#03101F', low: '#123B5E', beams: 0, moon: true, scene: 'ferry' },
}

function skyline(rand, base, colour, lit, { from = 0, to = W, maxH = 140 } = {}) {
  let s = ''
  let x = from - 6
  while (x < to) {
    const w = 16 + rand() * 30
    const h = 40 + rand() * maxH
    s += `<rect x="${f(x)}" y="${f(base - h)}" width="${f(w)}" height="${f(h + 2)}" fill="${colour}"/>`
    for (let wy = base - h + 8; wy < base - 6; wy += 9) {
      for (let wx = x + 4; wx < x + w - 4; wx += 7) {
        if (rand() < 0.22) s += `<rect x="${f(wx)}" y="${f(wy)}" width="3" height="4" fill="${lit}" opacity="${f(0.5 + rand() * 0.5)}"/>`
      }
    }
    x += w + 2
  }
  return s
}

function heist(m, rand, u) {
  const h = HEIST[m.id] || HEIST['heist-recruit']
  let s = `<defs>${sky(`${u}s`, [[0, h.top], [1, h.low]])}${glow(`${u}g`, '#FFE9B0')}${blur(`${u}b`, 6)}`
    + `<linearGradient id="${u}beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#DDE6FF" stop-opacity="0.55"/><stop offset="1" stop-color="#DDE6FF" stop-opacity="0"/></linearGradient></defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += stars(rand, 30, { bottom: 140 })
  for (let i = 0; i < h.beams; i++) {
    const x = 60 + i * 90 + rand() * 30
    const lean = (rand() - 0.5) * 160
    s += `<path d="M${f(x - 6)} 300 L${f(x + lean - 36)} 0 L${f(x + lean + 36)} 0 L${f(x + 6)} 300 Z" fill="url(#${u}beam)"/>`
  }
  if (h.moon) s += `<circle cx="210" cy="80" r="40" fill="url(#${u}g)"/><circle cx="210" cy="80" r="17" fill="#F7F0DA"/>`
  if (h.scene === 'ferry') {
    s += skyline(rand, 250, '#071425', '#FFD27A', { maxH: 90 })
    s += `<rect y="250" width="${W}" height="${H - 250}" fill="#041021"/>`
    for (let i = 0; i < 26; i++) s += `<rect x="${f(rand() * W)}" y="${f(256 + rand() * 110)}" width="${f(6 + rand() * 22)}" height="1.6" fill="#FFD27A" opacity="${f(0.2 + rand() * 0.5)}"/>`
    s += `<path d="M196 300 q8 -26 20 -46" stroke="#F7F0DA" stroke-width="5" fill="none" opacity="0.12"/>`
    // the ferry: hull, cabin, lit windows
    s += `<path d="M60 300 L230 300 L214 318 L76 318 Z" fill="#0B1A2E"/><rect x="92" y="282" width="110" height="18" rx="3" fill="#13304E"/><rect x="118" y="270" width="60" height="13" rx="3" fill="#19406A"/>`
    for (let x = 98; x < 198; x += 12) s += `<rect x="${x}" y="287" width="7" height="7" rx="1" fill="#FFE29A"/>`
    s += `<path d="M76 318 L214 318" stroke="#FFE29A" stroke-width="1" opacity="0.4"/>`
    s += runner(150, 266, 30, '#030A14', false, '#FFE29A')
    return s
  }
  s += skyline(rand, 300, '#060A1E', '#FFE29A')
  if (h.scene === 'gala') {
    s += `<rect x="98" y="120" width="104" height="182" fill="#0A0F2A"/><path d="M92 120 L150 84 L208 120 Z" fill="#0A0F2A"/>`
    s += `<circle cx="150" cy="170" r="44" fill="url(#${u}g)" opacity="0.8"/>`
    s += `<g stroke="#FFE29A" stroke-width="1.4" fill="none"><path d="M150 132 V150"/><path d="M128 158 Q150 176 172 158"/><path d="M136 166 Q150 178 164 166"/></g>`
    for (const x of [128, 139, 150, 161, 172]) s += `<circle cx="${x}" cy="${x === 150 ? 172 : 163}" r="2.2" fill="#FFF6D6"/>`
    for (let x = 108; x < 194; x += 16) for (let y = 206; y < 290; y += 22) s += `<rect x="${x}" y="${y}" width="8" height="14" fill="#FFCF6B" opacity="${f(0.4 + rand() * 0.6)}"/>`
  }
  if (h.scene === 'cross') {
    s += `<path d="M0 0 L${W} 0 L0 ${H} Z" fill="#2A3A9A" opacity="0.28"/>`
    s += `<g fill="none" stroke="#FF3B5C" stroke-width="1.6" opacity="0.85">`
    for (let i = 0; i < 6; i++) s += `<path d="M0 ${f(150 + i * 26)} L${W} ${f(110 + i * 30)}"/>`
    s += `</g>`
    s += runner(110, 360, 70, '#04050D', false, '#8C9BFF')
    s += runner(206, 360, 70, '#04050D', true, '#FF3B5C')
    return s
  }
  if (h.scene === 'alley') {
    s += `<path d="M150 300 L60 ${H} L240 ${H} Z" fill="#0B1233"/>`
    s += `<ellipse cx="150" cy="350" rx="70" ry="16" fill="#DDE6FF" opacity="0.18"/>`
  }
  // a red laser grid low across the street
  s += `<g stroke="#FF3B5C" stroke-width="1.3" opacity="0.8">${[318, 334, 350].map((y) => `<path d="M0 ${y} L${W} ${y - 14}"/>`).join('')}</g>`
  s += `<rect y="300" width="${W}" height="${H - 300}" fill="#04071A" opacity="0.6"/>`
  s += runner(150, 366, 66, '#000', false, '#8C9BFF')
  return s
}

const SHOW = {
  'quiz-1': { bg: ['#1B0630', '#5A1678'], bulbs: '#FFD86B', confetti: ['#FF5FA2', '#5FE3D2', '#FFD86B'] },
  'quiz-2': { bg: ['#06223A', '#0E6F8A'], bulbs: '#FF9F5A', confetti: ['#FFD86B', '#FF5F5F', '#9DFF7A'] },
  'quiz-3': { bg: ['#2A0A04', '#8C2A12'], bulbs: '#FFE9A8', confetti: ['#FFD86B', '#FFFFFF', '#FF9F5A'], trophy: true },
}

function quiz(m, rand, u) {
  const q = SHOW[m.id] || SHOW['quiz-1']
  let s = `<defs>${sky(`${u}s`, [[0, q.bg[0]], [1, q.bg[1]]])}${glow(`${u}g`, q.bulbs, 0.9)}`
    + `<linearGradient id="${u}cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  // spotlights from the rig
  for (const [x, lean] of [[40, 70], [150, 0], [260, -70]]) s += `<path d="M${x - 8} 0 L${x + lean - 70} 330 L${x + lean + 70} 330 L${x + 8} 0 Z" fill="url(#${u}cone)"/>`
  // the stage
  s += `<ellipse cx="150" cy="330" rx="170" ry="40" fill="#000" opacity="0.35"/><ellipse cx="150" cy="322" rx="130" ry="26" fill="${q.bulbs}" opacity="0.18"/>`
  // the marquee ring of bulbs
  const cx = 150
  const cy = 170
  s += `<circle cx="${cx}" cy="${cy}" r="96" fill="url(#${u}g)" opacity="0.35"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="78" fill="${q.bg[0]}" stroke="${q.bulbs}" stroke-width="3"/>`
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    s += `<circle cx="${f(cx + Math.cos(a) * 88)}" cy="${f(cy + Math.sin(a) * 88)}" r="3.6" fill="${i % 2 ? q.bulbs : '#FFFFFF'}"/>`
  }
  if (q.trophy) {
    s += `<g fill="#FFD25E" stroke="#5A2A08" stroke-width="2"><path d="M124 128 H176 V146 Q176 184 150 190 Q124 184 124 146 Z"/><path d="M124 136 Q102 138 108 158 Q114 170 128 168" fill="none"/><path d="M176 136 Q198 138 192 158 Q186 170 172 168" fill="none"/><rect x="142" y="190" width="16" height="16"/><rect x="128" y="206" width="44" height="12" rx="2"/></g>`
  } else {
    s += `<text x="${cx}" y="${cy + 40}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="900" font-size="124" fill="#FFFFFF" stroke="${q.bulbs}" stroke-width="3">?</text>`
  }
  for (let i = 0; i < 46; i++) {
    const c = q.confetti[i % q.confetti.length]
    const x = rand() * W
    const y = rand() * 300
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(3 + rand() * 4)}" height="${f(6 + rand() * 5)}" fill="${c}" transform="rotate(${f(rand() * 180)} ${f(x)} ${f(y)})" opacity="0.9"/>`
  }
  s += runner(150, 352, 60, '#07020C', false, q.bulbs)
  return s
}

const SIGNAL = {
  'signal-contact': { top: '#020812', low: '#0B3B4A', beam: true, lights: 3 },
  'signal-swarm': { top: '#060312', low: '#2B1450', drones: 14 },
  'signal-starfall': { top: '#040616', low: '#3A2350', meteors: 9, dawn: true },
}

function dish(x, y, colour) {
  // a big radio dish on its tower, tilted to the sky
  return `<g fill="${colour}"><path d="M${x - 16} ${y} L${x - 9} ${y - 52} L${x + 9} ${y - 52} L${x + 16} ${y} Z"/>`
    + `<rect x="${x - 26}" y="${y - 60}" width="52" height="10" rx="2"/>`
    + `<path d="M${x - 78} ${y - 112} Q${x - 8} ${y - 40} ${x + 70} ${y - 74} L${x + 62} ${y - 86} Q${x - 4} ${y - 64} ${x - 70} ${y - 124} Z"/>`
    + `<path d="M${x - 74} ${y - 118} Q${x + 2} ${y - 150} ${x + 66} ${y - 80}" fill="none" stroke="${colour}" stroke-width="3"/></g>`
    + `<g stroke="${colour}" stroke-width="2.5"><path d="M${x - 50} ${y - 104} L${x + 4} ${y - 150}"/><path d="M${x + 40} ${y - 80} L${x + 4} ${y - 150}"/><path d="M${x - 4} ${y - 70} L${x + 4} ${y - 150}"/></g>`
    + `<circle cx="${x + 4}" cy="${y - 152}" r="4" fill="${colour}"/>`
}

function signal(m, rand, u) {
  const g = SIGNAL[m.id] || SIGNAL['signal-contact']
  let s = `<defs>${sky(`${u}s`, [[0, g.top], [0.7, g.low], [1, g.dawn ? '#C2577A' : g.low]])}${glow(`${u}g`, '#7FFFEA')}${blur(`${u}b`, 10)}`
    + `<linearGradient id="${u}beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7FFFEA" stop-opacity="0.75"/><stop offset="1" stop-color="#7FFFEA" stop-opacity="0"/></linearGradient></defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  // the Milky Way
  s += `<path d="M-20 260 Q120 120 330 40" stroke="#B9C8FF" stroke-width="46" fill="none" opacity="0.13" filter="url(#${u}b)"/>`
  s += stars(rand, 120, { bottom: 280 })
  if (g.beam) {
    s += `<path d="M148 160 L120 -10 L190 -10 Z" fill="url(#${u}beam)"/>`
    for (let i = 0; i < g.lights; i++) {
      const x = 70 + i * 80 + rand() * 20
      const y = 40 + rand() * 50
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="16" fill="url(#${u}g)"/><circle cx="${f(x)}" cy="${f(y)}" r="3" fill="#E8FFFB"/>`
    }
  }
  if (g.drones) {
    for (let i = 0; i < g.drones; i++) {
      const row = Math.floor(i / 5)
      const x = 54 + (i % 5) * 48 + row * 20 + rand() * 8
      const y = 50 + row * 34 + rand() * 8
      s += `<g transform="translate(${f(x)} ${f(y)})"><circle r="14" fill="url(#${u}g)" opacity="0.9"/><path d="M-11 0 L11 0 M0 -4 V4" stroke="#C9FFF6" stroke-width="2"/><circle r="3" fill="#FF5F7E"/></g>`
    }
    s += `<path d="M150 200 L60 ${H} L240 ${H} Z" fill="#7FFFEA" opacity="0.06"/>`
  }
  if (g.meteors) {
    for (let i = 0; i < g.meteors; i++) {
      const x = 40 + rand() * 260
      const y = 10 + rand() * 150
      const len = 40 + rand() * 60
      s += `<path d="M${f(x)} ${f(y)} l${f(-len)} ${f(len * 0.55)}" stroke="#FFF2D6" stroke-width="${f(1 + rand() * 1.8)}" stroke-linecap="round" opacity="${f(0.5 + rand() * 0.5)}"/><circle cx="${f(x)}" cy="${f(y)}" r="2.4" fill="#FFF"/>`
    }
  }
  s += hill(rand, 286, 14, '#03070C', 2)
  s += dish(160, 290, '#03070C')
  // wheat paddock rows
  s += `<rect y="300" width="${W}" height="${H - 300}" fill="#020508"/>`
  for (let i = 0; i < 8; i++) s += `<path d="M150 300 L${f(-200 + i * 100)} ${H}" stroke="#0E2228" stroke-width="2"/>`
  s += runner(110, 364, 56, '#000', false, '#5FE3D2')
  return s
}

const SCENES = { trailkeepers, ember, heist, quiz, signal }

let uid = 0
/**
 * The cover for a mission, as SVG markup (decorative: the title and details
 * are written beside it in HTML). Seeded by the mission id, so the same
 * mission always gets the same art.
 */
export function coverSvg(m) {
  const saga = m?.saga || 'trailkeepers'
  const draw = SCENES[saga] || trailkeepers
  const u = `cv${++uid}`
  const rand = seeded(m?.id || saga)
  const body = draw(m || {}, rand, u)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">`
    + body
    + `<defs>${grain(`${u}n`)}</defs><rect width="${W}" height="${H}" filter="url(#${u}n)" opacity="0.07"/>`
    + `</svg>`
}

/** Covers we have art for. */
export const hasCover = (m) => !!SCENES[m?.saga || 'trailkeepers']
