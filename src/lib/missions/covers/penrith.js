// Cover art for River Town (missions/series/penrith.js): dusk over the
// Nepean at Penrith. The iron girders of Victoria Bridge cross the river,
// Emu Hall glows on its rise with its iron lace verandah lit, the low curve
// of the Yandhai crossing sits downstream, and the runner comes along the
// bank inside a magnifying glass. Drawn with the helpers covers.js passes in.

function draw(m, rand, u, h) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, '#0E1A1F'], [0.42, '#3B2A4A'], [0.68, '#C8643B'], [1, '#F2A65A']])}${h.glow(`${u}g`, '#F2A65A', 0.8)}${h.glow(`${u}lamp`, '#FFD9A0', 1)}${h.blur(`${u}b`, 4)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += h.stars(rand, 18, { bottom: 110, colour: '#FBE7D2' })
  s += `<circle cx="215" cy="200" r="90" fill="url(#${u}g)" opacity="0.6"/>`
  // the Blue Mountains, far off, and the far bank
  s += h.hill(rand, 205, 22, '#3A2E48', 3)
  s += h.hill(rand, 228, 14, '#2A2638', 4)
  // Emu Hall on its rise: a two storey house, hipped roof, lit verandah with iron lace
  const hx = 34
  const hy = 214
  s += `<path d="M${hx} ${hy} L${hx} ${hy - 34} L${hx + 70} ${hy - 34} L${hx + 70} ${hy} Z" fill="#1C1A26"/>`
  s += `<path d="M${hx - 6} ${hy - 34} L${hx + 35} ${hy - 52} L${hx + 76} ${hy - 34} Z" fill="#14121C"/>`
  for (let i = 0; i < 4; i++) s += `<rect x="${hx + 8 + i * 15}" y="${hy - 28}" width="7" height="10" fill="#FFD9A0" opacity="${f(0.6 + rand() * 0.4)}"/>`
  s += `<rect x="${hx - 4}" y="${hy - 14}" width="78" height="14" fill="url(#${u}lamp)" opacity="0.35"/>`
  for (let i = 0; i <= 8; i++) s += `<path d="M${hx - 4 + i * 9.75} ${hy} L${hx - 4 + i * 9.75} ${hy - 14}" stroke="#2A2230" stroke-width="1.6"/>`
  s += `<path d="M${hx - 4} ${hy - 13} Q${hx + 35} ${hy - 6} ${hx + 74} ${hy - 13}" stroke="#2A2230" stroke-width="1.4" fill="none" stroke-dasharray="2 2"/>`
  s += h.gum(rand, 120, 226, 44, '#1A1824')
  // the river
  s += `<rect x="0" y="232" width="${W}" height="${H - 232}" fill="#1B2B36"/>`
  for (let i = 0; i < 14; i++) {
    const y = 240 + i * 9
    const x = 150 + (rand() - 0.5) * 60
    s += `<path d="M${f(x - 40 - rand() * 30)} ${y} L${f(x + 40 + rand() * 30)} ${y}" stroke="#F2A65A" stroke-width="${f(1 + rand())}" opacity="${f(0.15 + (14 - i) * 0.025)}"/>`
  }
  // Victoria Bridge: sandstone piers and iron box girders across the river
  const by = 222
  s += `<rect x="0" y="${by}" width="${W}" height="9" fill="#120F18"/>`
  for (let x = 4; x < W; x += 13) s += `<path d="M${x} ${by} L${x + 6.5} ${by + 9} L${x + 13} ${by}" stroke="#2E2838" stroke-width="1.2" fill="none"/>`
  for (const px of [48, 140, 232]) s += `<rect x="${px}" y="${by + 9}" width="12" height="16" fill="#3A2A26"/><rect x="${px}" y="${by + 25}" width="12" height="${f(10 + rand() * 6)}" fill="#3A2A26" opacity="0.35"/>`
  // the Yandhai crossing, a low pale curve further down
  s += `<path d="M0 300 Q150 286 ${W} 300" stroke="#E9D9C4" stroke-width="3" fill="none" opacity="0.55"/>`
  // the magnifying glass, with the runner on the near bank inside it
  const cx = 200
  const cy = 300
  const r = 58
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#F2A65A" opacity="0.12"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F2A65A" stroke-width="7"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFE6C4" stroke-width="1.6"/>`
  s += `<path d="M${f(cx - r * 0.72)} ${f(cy + r * 0.72)} L${f(cx - r * 1.4)} ${f(cy + r * 1.4)}" stroke="#7A4A2A" stroke-width="12" stroke-linecap="round"/>`
  s += h.runner(cx, cy + 40, 70, '#FFF1DC', false, '#F2A65A')
  return s
}

export const COVER = { saga: 'penrith', draw }
