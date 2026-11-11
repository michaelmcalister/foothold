// Cover art for Breakers (missions/series/bondi.js): Bondi at sunrise. The
// sun comes up out of the sea, surf rolls in, the Icebergs pool sits on the
// rocks at the south end, a bronze whale tail stands in the shallows, and
// the runner crosses the wet sand. Drawn with the helpers covers.js passes in.

function draw(m, rand, u, h) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, '#0F2A3D'], [0.35, '#3D4E7A'], [0.62, '#F08A6B'], [0.8, '#FFC77D']])}${h.glow(`${u}g`, '#FFD9A0', 1)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += h.stars(rand, 8, { bottom: 70, colour: '#FFF1DC' })
  const sea = 200
  s += `<circle cx="170" cy="${sea}" r="80" fill="url(#${u}g)" opacity="0.7"/><circle cx="170" cy="${sea}" r="26" fill="#FFE2A8"/>`
  // the sea, with the sun's path on it
  s += `<rect x="0" y="${sea}" width="${W}" height="70" fill="#1F4E6B"/>`
  for (let i = 0; i < 12; i++) s += `<path d="M${f(150 - i * 3 - rand() * 10)} ${sea + 5 + i * 5} l${f(40 + i * 6 + rand() * 10)} 0" stroke="#FFD9A0" stroke-width="1.6" opacity="${f(0.7 - i * 0.04)}"/>`
  // the headland and the Icebergs pool at the south end (left)
  s += `<path d="M0 ${sea - 34} L40 ${sea - 30} L70 ${sea - 12} L92 ${sea + 6} L92 ${sea + 40} L0 ${sea + 40} Z" fill="#162A36"/>`
  s += `<rect x="18" y="${sea + 14}" width="62" height="16" fill="#4FA3C4"/><rect x="18" y="${sea + 14}" width="62" height="16" fill="none" stroke="#E8F1F2" stroke-width="2"/>`
  for (let i = 1; i < 6; i++) s += `<path d="M${18 + i * 10.3} ${sea + 15} l0 14" stroke="#E8F1F2" stroke-width="0.8" opacity="0.7"/>`
  // breaking waves
  for (const [y, op] of [[sea + 48, 0.9], [sea + 62, 0.7]]) s += `<path d="M0 ${y} Q40 ${y - 8} 80 ${y} T160 ${y} T240 ${y} T320 ${y}" stroke="#F4FBFF" stroke-width="3" fill="none" opacity="${op}"/>`
  // the sand
  s += `<path d="M0 ${sea + 70} Q150 ${sea + 60} ${W} ${sea + 72} L${W} ${H} L0 ${H} Z" fill="#E9C99A"/>`
  s += `<path d="M0 ${sea + 78} Q150 ${sea + 68} ${W} ${sea + 80}" stroke="#C9A876" stroke-width="2" fill="none" opacity="0.6"/>`
  // the bronze whale tail in the shallows
  s += `<path d="M232 ${sea + 66} C230 ${sea + 40} 236 ${sea + 24} 238 ${sea + 14} C224 ${sea + 6} 212 ${sea - 6} 206 ${sea - 18} C222 ${sea - 12} 234 ${sea - 2} 242 ${sea + 6} C250 ${sea - 2} 262 ${sea - 12} 278 ${sea - 18} C272 ${sea - 6} 260 ${sea + 6} 246 ${sea + 14} C248 ${sea + 24} 254 ${sea + 40} 252 ${sea + 66} Z" fill="#B5793E"/>`
  s += `<path d="M242 ${sea + 8} L244 ${sea + 64}" stroke="#E0A666" stroke-width="2" opacity="0.6"/>`
  s += h.runner(120, 352, 64, '#FFF8EE', false, '#FF9E6D')
  return s
}

export const COVER = { saga: 'bondi', draw }
