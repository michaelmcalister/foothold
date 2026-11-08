// Cover art for Time Runners (missions/series/timerunners.js). Every episode
// is its own era (an 1851 goldfield at dawn, the Harbour Bridge on opening
// morning, a 1956 street at sunset with the torch, a yacht race with the
// winged keel under the water, and Olympic night with a ring of fire), and
// every one has the same glowing time ring, like a watch bezel, with the
// runner bursting through it. Drawn with the helpers covers.js passes in.

// A glowing time ring: a soft halo, a portal glow inside, a bright band with
// bezel ticks, and a few sparks flying off it.
function timeRing(h, u, rand, { x, y, r, colour = '#FFC83D', core = '#FFF3C4', portal = 0.35, sparks = 10 }) {
  const { f } = h
  let s = `<circle cx="${x}" cy="${y}" r="${f(r * 1.9)}" fill="url(#${u}halo)"/>`
  s += `<circle cx="${x}" cy="${y}" r="${f(r * 0.96)}" fill="url(#${u}portal)" opacity="${portal}"/>`
  s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${colour}" stroke-width="${f(r * 0.2)}" opacity="0.55" filter="url(#${u}rb)"/>`
  s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${colour}" stroke-width="${f(r * 0.075)}"/>`
  s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${core}" stroke-width="${f(r * 0.025)}"/>`
  s += `<circle cx="${x}" cy="${y}" r="${f(r * 0.82)}" fill="none" stroke="${colour}" stroke-width="1.2" opacity="0.7" stroke-dasharray="2 5"/>`
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r1 = r * (i % 3 ? 1.07 : 1.05)
    const r2 = r * (i % 3 ? 1.13 : 1.2)
    s += `<path d="M${f(x + Math.cos(a) * r1)} ${f(y + Math.sin(a) * r1)} L${f(x + Math.cos(a) * r2)} ${f(y + Math.sin(a) * r2)}" stroke="${colour}" stroke-width="${i % 3 ? 1.6 : 3}" stroke-linecap="round"/>`
  }
  for (let i = 0; i < sparks; i++) {
    const a = rand() * Math.PI * 2
    const d = r * (1.15 + rand() * 0.5)
    const sx = x + Math.cos(a) * d
    const sy = y + Math.sin(a) * d
    const len = 4 + rand() * 9
    s += `<path d="M${f(sx)} ${f(sy)} l${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)}" stroke="${core}" stroke-width="${f(1 + rand() * 1.2)}" stroke-linecap="round" opacity="${f(0.5 + rand() * 0.5)}"/>`
  }
  return s
}

// A river red gum: a thick crooked trunk and a broad, lumpy, wide canopy
function redGum(h, rand, x, y, ht, colour) {
  const { f } = h
  const lean = (rand() - 0.5) * ht * 0.15
  let s = `<path d="M${f(x - ht * 0.06)} ${y} Q${f(x - ht * 0.02)} ${f(y - ht * 0.35)} ${f(x + lean - ht * 0.03)} ${f(y - ht * 0.62)} L${f(x + lean + ht * 0.03)} ${f(y - ht * 0.62)} Q${f(x + ht * 0.05)} ${f(y - ht * 0.35)} ${f(x + ht * 0.07)} ${y} Z" fill="${colour}"/>`
  s += `<path d="M${f(x + lean)} ${f(y - ht * 0.55)} L${f(x + lean - ht * 0.25)} ${f(y - ht * 0.8)} M${f(x + lean)} ${f(y - ht * 0.5)} L${f(x + lean + ht * 0.28)} ${f(y - ht * 0.78)}" stroke="${colour}" stroke-width="${f(ht * 0.035)}" stroke-linecap="round"/>`
  for (let i = 0; i < 9; i++) {
    const cx = x + lean + (rand() - 0.5) * ht * 0.75
    const cy = y - ht * (0.74 + rand() * 0.2)
    s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(ht * (0.13 + rand() * 0.08))}" ry="${f(ht * (0.06 + rand() * 0.04))}" fill="${colour}"/>`
  }
  return s
}

function defsFor(h, u, sky, ring) {
  return `<defs>${h.sky(`${u}s`, sky)}${h.glow(`${u}halo`, ring, 0.55)}${h.glow(`${u}portal`, '#FFF6D8', 1)}${h.glow(`${u}g`, ring, 0.9)}${h.blur(`${u}rb`, 6)}${h.blur(`${u}b`, 10)}</defs>`
}

// ---- 1. Gold Fever: dawn on the creek at Ophir ----
function gold(m, rand, u, h) {
  const { W, H, f } = h
  let s = defsFor(h, u, [[0, '#2A1638'], [0.45, '#C9562A'], [0.75, '#F7A24A'], [1, '#FFE0A0']], '#FFC83D')
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += h.stars(rand, 22, { bottom: 90, colour: '#FFE9C7' })
  s += `<circle cx="150" cy="225" r="120" fill="url(#${u}g)" opacity="0.55"/>`
  s += h.hill(rand, 228, 34, '#7A3A2A', 2)
  s += h.hill(rand, 252, 26, '#4E2620', 3)
  // the tents of the diggings
  for (const [x, y, w] of [[34, 262, 34], [74, 268, 26], [222, 264, 32], [262, 258, 28], [190, 272, 22]]) {
    s += `<path d="M${x - w / 2} ${y} L${x} ${y - w * 0.8} L${x + w / 2} ${y} Z" fill="#F3D9A8"/><path d="M${x} ${y} L${x} ${f(y - w * 0.8)} L${f(x + w * 0.14)} ${y} Z" fill="#B98A55"/><path d="M${x} ${y - w * 0.8} L${x} ${f(y - w * 0.8 - 8)}" stroke="#3A1E18" stroke-width="1.4"/>`
  }
  for (const [x, ht] of [[14, 96], [58, 74], [246, 104], [292, 80]]) s += redGum(h, rand, x, 282, ht, '#2B140F')
  // the creek, catching the light
  s += `<path d="M0 300 Q80 284 150 296 T300 288 L300 322 Q220 312 150 322 T0 318 Z" fill="#5B8FA0" opacity="0.9"/><path d="M0 300 Q80 286 150 297 T300 290" fill="none" stroke="#FFD08A" stroke-width="2" opacity="0.8"/>`
  for (let i = 0; i < 9; i++) s += `<rect x="${f(20 + rand() * 260)}" y="${f(298 + rand() * 16)}" width="${f(8 + rand() * 20)}" height="1.6" fill="#FFF1C9" opacity="${f(0.5 + rand() * 0.5)}"/>`
  s += `<rect y="318" width="${W}" height="${H - 318}" fill="#1E0D0A"/>`
  // the cradle (rocker box) on the bank
  s += `<g fill="#120806"><rect x="200" y="300" width="44" height="16" rx="2"/><path d="M196 316 Q222 330 248 316 L244 320 Q222 332 200 320 Z"/><rect x="236" y="286" width="4" height="16"/><rect x="226" y="284" width="18" height="4"/></g>`
  s += timeRing(h, u, rand, { x: 150, y: 168, r: 70 })
  // gold dust in the air
  for (let i = 0; i < 26; i++) s += `<circle cx="${f(rand() * W)}" cy="${f(90 + rand() * 230)}" r="${f(0.6 + rand() * 1.6)}" fill="#FFE07A" opacity="${f(0.4 + rand() * 0.6)}"/>`
  s += h.runner(150, 366, 64, '#0B0403', false, '#FFC83D')
  return s
}

// ---- 2. Ribbon Day: the Harbour Bridge on opening morning ----
function bridge(m, rand, u, h) {
  const { W, H, f } = h
  let s = defsFor(h, u, [[0, '#1E5F8C'], [0.55, '#8CC6DA'], [1, '#FCE7B8']], '#FFC83D')
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += `<circle cx="150" cy="172" r="120" fill="url(#${u}g)" opacity="0.4"/>`
  // the arch springs from the water at the pylons, and the deck runs through it
  const top = (x) => 292 - 162 * (1 - ((x - 150) / 152) ** 2)
  const low = (x) => 292 - 140 * (1 - ((x - 150) / 146) ** 2)
  let upper = ''
  let lower = ''
  for (let x = 0; x <= 300; x += 6) upper += `${upper ? ' L' : 'M'}${f(x)} ${f(top(x))}`
  for (let x = 6; x <= 294; x += 6) lower += `${lower ? ' L' : 'M'}${f(x)} ${f(low(x))}`
  let truss = ''
  for (let x = 12; x <= 276; x += 12) {
    truss += `<path d="M${x} ${f(top(x))} L${x} ${f(low(x))}"/>`
    truss += `<path d="M${x} ${f(top(x))} L${x + 12} ${f(low(x + 12))}"/>`
  }
  s += `<g stroke="#14273B" stroke-width="1.5" opacity="0.9">${truss}</g>`
  s += `<path d="${upper}" fill="none" stroke="#14273B" stroke-width="6"/><path d="${lower}" fill="none" stroke="#14273B" stroke-width="5"/>`
  // hangers down to the deck in the middle, posts up to it near the ends
  for (let x = 24; x <= 276; x += 12) {
    const y = low(x)
    if (y < 222) s += `<path d="M${x} ${f(y)} L${x} 222" stroke="#14273B" stroke-width="1.3"/>`
    else s += `<path d="M${x} 230 L${x} ${f(y)}" stroke="#14273B" stroke-width="2"/>`
  }
  s += `<rect x="-5" y="222" width="${W + 10}" height="9" fill="#14273B"/>`
  // the pylons
  for (const x of [-8, 262]) s += `<rect x="${x}" y="176" width="46" height="120" fill="#C9B79A"/><rect x="${x + 4}" y="166" width="38" height="12" fill="#B9A589"/><rect x="${x + 12}" y="190" width="8" height="24" fill="#8F7E66"/><rect x="${x + 26}" y="190" width="8" height="24" fill="#8F7E66"/>`
  // bunting along the deck
  for (let x = 40; x < 260; x += 12) s += `<path d="M${x} 231 L${x + 6} 240 L${x + 12} 231 Z" fill="${['#E2463C', '#F6F0E2', '#2C5DA8'][(x / 12) % 3 | 0]}"/>`
  // the harbour and a few ships
  s += `<rect y="292" width="${W}" height="${H - 292}" fill="#1D4C6B"/>`
  for (let i = 0; i < 18; i++) s += `<rect x="${f(rand() * W)}" y="${f(296 + rand() * 26)}" width="${f(8 + rand() * 26)}" height="1.6" fill="#FFF3D0" opacity="${f(0.25 + rand() * 0.45)}"/>`
  for (const [x, w] of [[52, 40], [206, 54]]) s += `<path d="M${x} 306 L${x + w} 306 L${x + w - 6} 314 L${x + 6} 314 Z" fill="#0E2232"/><rect x="${x + w * 0.35}" y="294" width="${w * 0.3}" height="12" fill="#0E2232"/><rect x="${x + w * 0.45}" y="286" width="5" height="9" fill="#C8432E"/>`
  s += timeRing(h, u, rand, { x: 150, y: 172, r: 46 })
  // the red ribbon streaming across the front
  s += `<path d="M-10 318 C 60 300, 110 340, 160 322 S 250 300, 310 316" fill="none" stroke="#E2463C" stroke-width="7" stroke-linecap="round"/>`
  s += `<rect y="322" width="${W}" height="${H - 322}" fill="#0F1F2C" opacity="0.85"/>`
  s += h.runner(150, 368, 62, '#060D14', false, '#FFC83D')
  return s
}

// ---- 3. The Pudding Tin Torch: a 1956 street at sunset ----
function torch(m, rand, u, h) {
  const { W, H, f } = h
  let s = defsFor(h, u, [[0, '#14324A'], [0.5, '#D9665A'], [1, '#FFC27A']], '#FFC83D')
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += `<circle cx="150" cy="170" r="130" fill="url(#${u}g)" opacity="0.45"/>`
  s += h.skyline(rand, 290, '#2A1824', '#FFD27A', { maxH: 110 })
  // the town hall clock tower
  s += `<g fill="#1E1019"><rect x="208" y="120" width="34" height="172"/><rect x="202" y="112" width="46" height="12"/><path d="M210 112 L225 76 L240 112 Z"/></g>`
  s += `<circle cx="225" cy="146" r="11" fill="#FFE7B0"/><path d="M225 146 L225 139 M225 146 L230 149" stroke="#1E1019" stroke-width="1.6" stroke-linecap="round"/>`
  // flags strung across the street
  s += `<path d="M0 208 Q150 232 300 204" fill="none" stroke="#1E1019" stroke-width="1"/>`
  for (let i = 0; i < 14; i++) {
    const x = 10 + i * 21
    const y = 208 + Math.sin((x / 300) * Math.PI) * 22 - (x / 300) * 4
    s += `<path d="M${f(x)} ${f(y)} L${f(x + 6)} ${f(y + 11)} L${f(x + 12)} ${f(y)} Z" fill="${['#2E8B57', '#FFD25E', '#F6F0E2'][i % 3]}"/>`
  }
  s += `<rect y="290" width="${W}" height="${H - 290}" fill="#170C12"/>`
  s += `<path d="M150 292 L96 ${H} L204 ${H} Z" fill="#2A1620" opacity="0.8"/>`
  s += timeRing(h, u, rand, { x: 150, y: 168, r: 66, portal: 0.25 })
  // the flame in the middle of the ring
  s += `<circle cx="150" cy="168" r="30" fill="url(#${u}halo)"/>`
  s += `<path d="M150 136 C 164 154, 168 166, 160 180 C 156 188, 144 188, 140 180 C 132 166, 140 156, 150 136 Z" fill="#FF8A2B"/><path d="M150 152 C 158 162, 160 172, 154 180 C 151 184, 149 184, 146 180 C 140 172, 144 162, 150 152 Z" fill="#FFE27A"/>`
  // the runner, holding a pudding tin torch up high
  const sc = 64 / 100
  const hx = 150 + (77 - 50) * sc
  const hy = 366 - (100 - 35) * sc
  s += `<path d="M${f(hx)} ${f(hy)} L${f(hx + 4)} ${f(hy - 24)}" stroke="#C9C9D2" stroke-width="3.2" stroke-linecap="round"/>`
  s += `<rect x="${f(hx - 3)}" y="${f(hy - 31)}" width="14" height="8" rx="2" fill="#8B8E99"/>`
  s += `<path d="M${f(hx + 4)} ${f(hy - 50)} C ${f(hx + 12)} ${f(hy - 40)}, ${f(hx + 12)} ${f(hy - 34)}, ${f(hx + 6)} ${f(hy - 31)} C ${f(hx)} ${f(hy - 32)}, ${f(hx - 2)} ${f(hy - 40)}, ${f(hx + 4)} ${f(hy - 50)} Z" fill="#FFB547"/>`
  s += h.runner(150, 366, 64, '#0A0408', false, '#FFC83D')
  return s
}

// ---- 4. The Winged Keel: a yacht race, with the keel under the water ----
function keel(m, rand, u, h) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, '#0B2D5C'], [0.6, '#3E8FC4'], [1, '#BFE4F2']])}${h.sky(`${u}w`, [[0, '#0E5A7A'], [1, '#03152A']])}${h.glow(`${u}halo`, '#FFC83D', 0.55)}${h.glow(`${u}portal`, '#FFF6D8', 1)}${h.glow(`${u}g`, '#FFE08A', 0.9)}${h.blur(`${u}rb`, 6)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  // the ring rises like a sun on the horizon
  s += timeRing(h, u, rand, { x: 150, y: 168, r: 62, portal: 0.4 })
  // a far yacht
  s += `<path d="M58 206 L58 150 L84 204 Z" fill="#E8F1F6" opacity="0.8"/><path d="M50 208 L90 208 L86 212 L54 212 Z" fill="#163A55"/>`
  // the hero yacht: mainsail, jib, mast and the boxing kangaroo flag
  s += `<path d="M168 214 L168 58 L238 212 Z" fill="#F7FBFD"/><path d="M168 214 L168 58 L184 212 Z" fill="#D9E6EE"/>`
  s += `<path d="M164 214 L164 84 L120 210 Z" fill="#EAF2F7"/>`
  s += `<path d="M166 216 L166 54" stroke="#0E2232" stroke-width="2.4"/>`
  s += `<path d="M166 56 L186 60 L166 66 Z" fill="#1E9C55"/><path d="M166 60 L180 62 L166 64 Z" fill="#FFD23C"/>`
  s += `<path d="M112 214 L246 214 L232 226 L124 226 Z" fill="#F4F7FA"/><path d="M118 220 L240 220" stroke="#1E9C55" stroke-width="2.4"/><path d="M121 223 L236 223" stroke="#FFD23C" stroke-width="1.6"/>`
  // the water line, and below it the secret
  s += `<rect y="226" width="${W}" height="${H - 226}" fill="url(#${u}w)"/>`
  for (let i = 0; i < 14; i++) s += `<path d="M${f(rand() * W)} ${f(228 + rand() * 8)} q8 -3 16 0" stroke="#BFE4F2" stroke-width="1.4" fill="none" opacity="0.7"/>`
  for (let i = 0; i < 7; i++) s += `<path d="M${f(20 + i * 42)} 236 L${f(-30 + i * 42)} ${H}" stroke="#7FD0E8" stroke-width="10" opacity="0.06"/>`
  // the hull under the water, and the winged keel, glowing gold: narrow at the top, wide at the tip, with wings
  s += `<path d="M118 226 L240 226 Q226 244 180 246 L136 240 Z" fill="#081A2C" opacity="0.85"/>`
  s += `<ellipse cx="170" cy="292" rx="56" ry="16" fill="url(#${u}halo)" opacity="0.85"/>`
  s += `<path d="M164 242 L182 242 L194 290 L150 290 Z" fill="#081A2C" stroke="#FFC83D" stroke-width="1.8" stroke-linejoin="round"/>`
  s += `<path d="M150 288 L124 298 L128 302 L156 294 Z M194 288 L220 298 L216 302 L188 294 Z" fill="#081A2C" stroke="#FFC83D" stroke-width="1.6" stroke-linejoin="round"/>`
  for (let i = 0; i < 12; i++) s += `<circle cx="${f(30 + rand() * 240)}" cy="${f(250 + rand() * 110)}" r="${f(1 + rand() * 2)}" fill="none" stroke="#BFE4F2" stroke-width="0.8" opacity="0.6"/>`
  // the dock, with the runner on it
  s += `<rect y="336" width="${W}" height="${H - 336}" fill="#2B1A10"/>`
  for (let x = 0; x < W; x += 20) s += `<path d="M${x} 336 L${x} ${H}" stroke="#1A0F08" stroke-width="2"/>`
  s += `<path d="M0 336 L${W} 336" stroke="#5A3A22" stroke-width="2"/>`
  s += h.runner(150, 368, 60, '#05070C', false, '#FFC83D')
  return s
}

// ---- 5. Full Circle: Olympic night, a ring of fire and the time ring as one ----
function circle(m, rand, u, h) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, '#07051A'], [0.6, '#2A1352'], [1, '#6A2A6E']])}${h.glow(`${u}halo`, '#FFB13D', 0.65)}${h.glow(`${u}portal`, '#FFF0C8', 1)}${h.glow(`${u}g`, '#FF9A3D', 0.9)}${h.blur(`${u}rb`, 6)}${h.blur(`${u}b`, 3)}`
    + `<linearGradient id="${u}fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE9FF" stop-opacity="0.7"/><stop offset="1" stop-color="#BFE9FF" stop-opacity="0"/></linearGradient></defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += h.stars(rand, 40, { bottom: 160 })
  // fireworks
  for (const [x, y, c, r] of [[52, 70, '#FF5FA2', 26], [250, 58, '#5FE3D2', 30], [226, 128, '#FFD25E', 18], [76, 136, '#FFFFFF', 16]]) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      s += `<path d="M${f(x + Math.cos(a) * r * 0.3)} ${f(y + Math.sin(a) * r * 0.3)} L${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r)}" stroke="${c}" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>`
    }
    s += `<circle cx="${x}" cy="${y}" r="2" fill="${c}"/>`
  }
  // the waterfall under the ring of fire
  s += `<path d="M118 196 L182 196 L196 300 L104 300 Z" fill="url(#${u}fall)"/>`
  for (let i = 0; i < 9; i++) s += `<path d="M${f(122 + i * 7)} 198 L${f(110 + i * 10)} 296" stroke="#E6F7FF" stroke-width="1" opacity="0.45"/>`
  // the stadium bowl and its light towers
  s += `<path d="M-10 300 Q150 236 310 300 L310 ${H} L-10 ${H} Z" fill="#120A26"/>`
  s += `<path d="M-10 300 Q150 236 310 300" fill="none" stroke="#FFD27A" stroke-width="1.4" opacity="0.6"/>`
  for (let i = 0; i < 60; i++) s += `<circle cx="${f(rand() * W)}" cy="${f(292 + rand() * 46)}" r="${f(0.6 + rand())}" fill="${['#FFE29A', '#FFFFFF', '#5FE3D2', '#FF5FA2'][i % 4]}" opacity="${f(0.4 + rand() * 0.6)}"/>`
  for (const x of [26, 274]) s += `<path d="M${x} 300 L${x} 214" stroke="#120A26" stroke-width="5"/><rect x="${x - 12}" y="206" width="24" height="10" rx="2" fill="#FFF3C4"/><path d="M${x - 12} 216 L${x - 50} 300 L${x + 50} 300 L${x + 12} 216 Z" fill="#FFF3C4" opacity="0.05"/>`
  // the ring of fire, with the time ring burning inside it
  s += timeRing(h, u, rand, { x: 150, y: 152, r: 60, colour: '#FFC83D', portal: 0.3, sparks: 14 })
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2
    const x = 150 + Math.cos(a) * 74
    const y = 152 + Math.sin(a) * 74
    const lick = 8 + rand() * 10
    s += `<path d="M${f(x - 4)} ${f(y)} Q${f(x)} ${f(y - lick * 1.4)} ${f(x + 4)} ${f(y)} Z" fill="${i % 2 ? '#FF8A2B' : '#FFD25E'}" opacity="0.9" filter="url(#${u}b)"/>`
  }
  s += `<circle cx="150" cy="152" r="74" fill="none" stroke="#FF7A1F" stroke-width="5" opacity="0.85"/>`
  s += `<rect y="338" width="${W}" height="${H - 338}" fill="#0A0617"/>`
  s += h.runner(150, 368, 62, '#05030C', false, '#FFC83D')
  return s
}

const DRAW = {
  'timerunners-gold': gold,
  'timerunners-bridge': bridge,
  'timerunners-torch': torch,
  'timerunners-keel': keel,
  'timerunners-circle': circle,
}

export const COVER = {
  saga: 'timerunners',
  draw: (m, rand, u, h) => (DRAW[m.id] || gold)(m, rand, u, h),
}
