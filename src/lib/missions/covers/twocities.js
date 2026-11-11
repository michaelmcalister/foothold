// Cover art for Two Cities (missions/series/twocities.js): one night sky
// split down the middle. On the left, Kuala Lumpur: the Petronas Twin Towers
// and their skybridge. On the right, Manila: the stone walls of Intramuros
// and a church bell tower. A torn silk map with glowing lanterns floats
// between them, and the runner crosses below. Drawn with covers.js helpers.

function draw(m, rand, u, h) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, '#14123A'], [0.5, '#3A1F5C'], [0.78, '#C2436B'], [1, '#FFB347']])}${h.glow(`${u}g`, '#FFB347', 0.85)}${h.glow(`${u}l`, '#FFE2A8', 1)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += h.stars(rand, 22, { bottom: 140, colour: '#FFE9D6' })
  s += `<circle cx="150" cy="150" r="80" fill="url(#${u}g)" opacity="0.45"/>`
  const ground = 300
  // Kuala Lumpur: two tapering towers with spires and a skybridge
  for (const x of [46, 96]) {
    s += `<path d="M${x} ${ground} L${x} 140 L${x + 4} 128 L${x + 8} 116 L${x + 12} 106 L${x + 16} 116 L${x + 20} 128 L${x + 24} 140 L${x + 24} ${ground} Z" fill="#0F0D24"/>`
    s += `<path d="M${x + 12} 106 L${x + 12} 74" stroke="#0F0D24" stroke-width="2.4"/>`
    for (let y = 150; y < ground - 6; y += 9) for (let i = 0; i < 3; i++) if (rand() < 0.55) s += `<rect x="${x + 4 + i * 7}" y="${y}" width="3" height="4" fill="#FFE2A8" opacity="${f(0.35 + rand() * 0.5)}"/>`
  }
  s += `<rect x="70" y="196" width="26" height="5" fill="#0F0D24"/><path d="M70 201 L83 214 L96 201" stroke="#0F0D24" stroke-width="2" fill="none"/>`
  // Manila: the walls of Intramuros with crenellations, a bell tower and a dome
  const wy = 262
  s += `<rect x="168" y="${wy}" width="${W - 168}" height="${ground - wy}" fill="#1A1430"/>`
  for (let x = 170; x < W; x += 14) s += `<rect x="${x}" y="${wy - 7}" width="8" height="7" fill="#1A1430"/>`
  s += `<rect x="226" y="190" width="24" height="72" fill="#1A1430"/><path d="M224 190 L238 168 L252 190 Z" fill="#1A1430"/><path d="M238 168 L238 154 M233 159 L243 159" stroke="#1A1430" stroke-width="2.4"/>`
  s += `<rect x="233" y="200" width="10" height="14" rx="5" fill="#FFE2A8" opacity="0.7"/>`
  s += `<path d="M190 262 Q205 226 220 262 Z" fill="#1A1430"/>`
  // the river in front, with lantern light on it
  s += `<rect x="0" y="${ground}" width="${W}" height="${H - ground}" fill="#120F2A"/>`
  for (let i = 0; i < 10; i++) s += `<path d="M${f(80 + rand() * 140)} ${ground + 8 + i * 7} l${f(30 + rand() * 40)} 0" stroke="#FFB347" stroke-width="1.4" opacity="${f(0.12 + (10 - i) * 0.03)}"/>`
  // the torn silk map in the middle, a little crooked, lanterns glowing on it
  s += `<g transform="translate(16 4) rotate(-6 150 215)">`
  s += `<path d="M104 182 L196 182 L194 192 L198 204 L193 216 L197 230 L196 248 L104 248 Z" fill="#F4DDB0" opacity="0.92"/>`
  s += `<path d="M112 230 Q130 200 150 214 T188 196" stroke="#8C4A2F" stroke-width="1.6" fill="none" stroke-dasharray="3 3"/>`
  for (const [x, y] of [[118, 226], [150, 212], [184, 198]]) s += `<circle cx="${x}" cy="${y}" r="9" fill="url(#${u}l)" opacity="0.8"/><rect x="${x - 3}" y="${y - 4}" width="6" height="8" rx="2" fill="#D9452B"/>`
  s += `</g>`
  s += h.runner(150, 352, 62, '#FFF1DC', false, '#FFB347')
  return s
}

export const COVER = { saga: 'twocities', draw }
