// Cover art for The Major's Hill (missions/series/druitt.js): a western
// Sydney afternoon. The Blue Mountains sit blue on the horizon, the low rise
// of Rooty Hill is dotted with gum trees and rooftops, a double deck train
// crosses the middle, the old jet stands on its pole by the road, and the
// runner carries the relay baton. Drawn with the helpers covers.js passes in.

function draw(m, rand, u, h) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, '#16223A'], [0.45, '#3A5F8C'], [0.75, '#F5B26B'], [1, '#FFE0A3']])}${h.glow(`${u}g`, '#FFE0A3', 0.9)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += `<circle cx="230" cy="180" r="70" fill="url(#${u}g)" opacity="0.6"/>`
  // the Blue Mountains far off, then the hill
  s += h.hill(rand, 190, 10, '#5B6E9A', 3)
  s += h.hill(rand, 215, 24, '#2F4A3E', 2)
  // rooftops and gums on the hill
  for (let i = 0; i < 9; i++) {
    const x = 10 + i * 34 + rand() * 10
    const y = 222 + rand() * 10
    s += `<path d="M${f(x)} ${f(y)} l10 -8 l10 8 Z" fill="#B5543C"/><rect x="${f(x + 2)}" y="${f(y)}" width="16" height="9" fill="#E8DCC8"/>`
  }
  s += h.gum(rand, 60, 232, 50, '#1E3328')
  s += h.gum(rand, 270, 236, 40, '#1E3328')
  // the railway and a double deck train
  const ry = 262
  s += `<rect x="0" y="${ry + 22}" width="${W}" height="4" fill="#3A3A3A"/>`
  s += `<rect x="24" y="${ry}" width="150" height="22" rx="6" fill="#D8DDE3"/><rect x="176" y="${ry}" width="110" height="22" rx="6" fill="#D8DDE3"/>`
  for (let x = 32; x < 280; x += 14) if (x < 170 || x > 182) { s += `<rect x="${x}" y="${ry + 4}" width="9" height="5" fill="#3C5A7A"/><rect x="${x}" y="${ry + 12}" width="9" height="5" fill="#3C5A7A"/>` }
  s += `<rect x="24" y="${ry + 18}" width="262" height="2" fill="#F2B705"/>`
  // the ground and the old jet on its pole
  s += `<rect x="0" y="${ry + 26}" width="${W}" height="${H - ry - 26}" fill="#C9B78E"/>`
  s += `<rect x="226" y="236" width="4" height="52" fill="#555"/>`
  s += `<path d="M196 230 L250 226 L262 222 L262 230 L250 232 L232 236 L216 246 L212 246 L220 234 L196 233 Z" fill="#B8C0C8"/>`
  // the runner with the baton
  s += h.runner(110, 360, 64, '#FFF8EE', false, '#7ED957')
  s += `<rect x="128" y="318" width="5" height="16" rx="2" fill="#7ED957" transform="rotate(30 130 326)"/>`
  return s
}

export const COVER = { saga: 'druitt', draw }
