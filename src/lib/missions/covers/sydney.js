// Cover art for Sydney After Dark (missions/series/sydney.js): the city at
// night, cut in two. Above, the Harbour Bridge arch and towers under a moon;
// below the street, a cross section of an old railway tunnel with a still
// black lake, a bell hanging from its roof, and the outline of a small
// submarine resting on the sea floor at the bottom. The runner crosses the
// street line in between. Drawn with the helpers covers.js passes in.

function draw(m, rand, u, h) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, '#050B16'], [0.55, '#0A1626'], [1, '#183A5A']])}${h.glow(`${u}g`, '#8FD3FF', 0.9)}${h.glow(`${u}b`, '#FFD9A0', 1)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += h.stars(rand, 24, { bottom: 120, colour: '#DCEBFF' })
  s += `<circle cx="232" cy="52" r="40" fill="url(#${u}g)" opacity="0.6"/><circle cx="232" cy="52" r="14" fill="#EAF4FF"/>`
  // the city and the bridge
  const street = 168
  for (let i = 0; i < 14; i++) {
    const w = 14 + rand() * 18, x = i * 22 - 6, top = 96 + rand() * 50
    s += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(street - top)}" fill="#0E1E33"/>`
    for (let y = top + 6; y < street - 6; y += 8) if (rand() < 0.5) s += `<rect x="${f(x + 3)}" y="${f(y)}" width="3" height="3" fill="#FFD9A0" opacity="0.6"/>`
  }
  s += `<path d="M30 ${street - 6} Q150 60 270 ${street - 6}" stroke="#2C4D70" stroke-width="7" fill="none"/>`
  s += `<path d="M30 ${street - 22} L270 ${street - 22}" stroke="#2C4D70" stroke-width="4"/>`
  for (let x = 50; x < 260; x += 16) s += `<path d="M${x} ${street - 22} L${x} ${f(street - 22 - Math.max(0, 60 - Math.abs(150 - x) * 0.45))}" stroke="#2C4D70" stroke-width="1.5"/>`
  s += `<rect x="18" y="${street - 40}" width="16" height="34" fill="#1A3352"/><rect x="266" y="${street - 40}" width="16" height="34" fill="#1A3352"/>`
  // the street, then underground
  s += `<rect x="0" y="${street}" width="${W}" height="6" fill="#3A5170"/>`
  s += `<rect x="0" y="${street + 6}" width="${W}" height="${H - street - 6}" fill="#0B121C"/>`
  // the tunnel: an arch with a black lake and a hanging bell
  s += `<path d="M30 300 L30 236 Q150 176 270 236 L270 300 Z" fill="#131E2C" stroke="#2A3A50" stroke-width="3"/>`
  s += `<rect x="30" y="276" width="240" height="24" fill="#071019"/>`
  for (let i = 0; i < 6; i++) s += `<path d="M${f(50 + i * 36 + rand() * 10)} ${280 + (i % 3) * 5} l${f(14 + rand() * 10)} 0" stroke="#8FD3FF" stroke-width="1" opacity="0.4"/>`
  s += `<path d="M150 206 L150 228" stroke="#555" stroke-width="2"/><path d="M138 248 Q138 228 150 228 Q162 228 162 248 Z" fill="#B88A3E"/><circle cx="150" cy="250" r="3" fill="#B88A3E"/>`
  s += `<circle cx="150" cy="240" r="34" fill="url(#${u}b)" opacity="0.35"/>`
  // the submarine on the sea floor
  s += `<path d="M70 352 Q70 342 90 342 L200 342 Q222 342 226 352 Q222 360 200 360 L90 360 Q70 360 70 352 Z" fill="#1C2A3A" stroke="#3B5574" stroke-width="1.5"/>`
  s += `<rect x="128" y="332" width="16" height="10" rx="2" fill="#1C2A3A" stroke="#3B5574" stroke-width="1.5"/>`
  s += h.runner(70, 168, 46, '#F4F8FF', false, '#8FD3FF')
  return s
}

export const COVER = { saga: 'sydney', draw }
