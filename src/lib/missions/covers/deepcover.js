// Cover art for Deep Cover: Melbourne noir. Rain and neon in a CBD laneway
// with a tram at the end of it, the Flinders Street dome and its clocks over
// the Yarra, rooftops under the MCG light towers, St Kilda Pier at midnight,
// and Puffing Billy crossing a trestle in the Dandenong mist. A runner with a
// crimson rim light holds the middle of every one.

const LOOKS = {
  'deepcover-courier': { scene: 'lane', top: '#07040E', mid: '#2A0A22', low: '#4A1030', neon: ['#FF4D6D', '#3DF2E0'], rain: 90 },
  'deepcover-clocks': { scene: 'station', top: '#140A2E', mid: '#6B2350', low: '#F08A4B', neon: ['#FFC86B', '#FF4D6D'], rain: 40 },
  'deepcover-quarter': { scene: 'roofs', top: '#05060F', mid: '#1A1033', low: '#3B1238', neon: ['#FF4D6D', '#F4F7FF'], rain: 50 },
  'deepcover-pier': { scene: 'pier', top: '#020A16', mid: '#0B2440', low: '#16405E', neon: ['#9FE7FF', '#FF4D6D'], rain: 18 },
  'deepcover-mist': { scene: 'mist', top: '#2B2A44', mid: '#B07A86', low: '#F6D7A8', neon: ['#FFE6B8', '#FF4D6D'], rain: 0 },
}

/** Slanting rain streaks. */
function rain(h, rand, n, colour, { top = 0, bottom = h.H } = {}) {
  let s = `<g stroke="${colour}" stroke-linecap="round">`
  for (let i = 0; i < n; i++) {
    const x = rand() * (h.W + 40) - 20
    const y = top + rand() * (bottom - top)
    const len = 8 + rand() * 16
    s += `<path d="M${h.f(x)} ${h.f(y)} l${h.f(-len * 0.22)} ${h.f(len)}" stroke-width="${h.f(0.6 + rand() * 0.8)}" opacity="${h.f(0.15 + rand() * 0.35)}"/>`
  }
  return s + '</g>'
}

/** A neon tube sign: a rounded outline glowing in two passes. */
function neon(h, u, x, y, w, ht, colour) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="${h.f(ht / 2)}" fill="none" stroke="${colour}" stroke-width="6" opacity="0.35" filter="url(#${u}b)"/>`
    + `<rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="${h.f(ht / 2)}" fill="none" stroke="${colour}" stroke-width="2"/>`
}

/** A lyrebird in profile, as a neon sign or a silhouette: x, y at its feet. The long tail sweeps back and curls up into a lyre. */
function lyrebird(h, x, y, sc, colour, { stroke = false } = {}) {
  const P = (px, py) => `${h.f(x + px * sc)} ${h.f(y + py * sc)}`
  const w = h.f(Math.max(1.4, (stroke ? 2.2 : 3) * sc))
  let s = stroke ? `<g fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">` : `<g fill="${colour}">`
  // body, neck and head, beak to the right
  s += `<path d="M${P(-16, -28)} C${P(-12, -42)} ${P(6, -44)} ${P(12, -36)} C${P(16, -44)} ${P(18, -52)} ${P(24, -54)} L${P(31, -52)} L${P(25, -49)} C${P(22, -44)} ${P(20, -34)} ${P(14, -26)} C${P(8, -18)} ${P(-10, -16)} ${P(-16, -28)} Z"/>`
  s += '</g>'
  // legs, and the tail: two broad outer feathers sweeping back and curling up, with fine plumes between
  s += `<g fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round">`
  s += `<path d="M${P(0, -18)} L${P(-2, 0)} M${P(6, -19)} L${P(8, 0)}"/>`
  s += `<path d="M${P(-14, -28)} C${P(-40, -26)} ${P(-62, -14)} ${P(-70, -26)} C${P(-76, -36)} ${P(-66, -44)} ${P(-60, -38)}"/>`
  s += `<path d="M${P(-14, -24)} C${P(-38, -14)} ${P(-58, 0)} ${P(-72, -8)} C${P(-82, -14)} ${P(-76, -26)} ${P(-68, -22)}"/>`
  s += '</g>'
  s += `<g fill="none" stroke="${colour}" stroke-width="${h.f(Math.max(0.6, 0.9 * sc))}" opacity="0.75">`
  for (let i = 0; i < 5; i++) s += `<path d="M${P(-14, -26)} Q${P(-40, -22 + i * 3)} ${P(-64, -30 + i * 5)}"/>`
  return s + '</g>'
}

/** A W class tram side on: body, roof, pole, lit windows. */
function tram(h, x, y, w, colour, lit) {
  const ht = w * 0.24
  let s = `<rect x="${h.f(x)}" y="${h.f(y - ht)}" width="${h.f(w)}" height="${h.f(ht)}" rx="${h.f(ht * 0.15)}" fill="${colour}"/>`
  s += `<rect x="${h.f(x + w * 0.04)}" y="${h.f(y - ht * 1.1)}" width="${h.f(w * 0.92)}" height="${h.f(ht * 0.14)}" rx="2" fill="${colour}"/>`
  s += `<path d="M${h.f(x + w * 0.5)} ${h.f(y - ht * 1.1)} L${h.f(x + w * 0.72)} ${h.f(y - ht * 2.1)}" stroke="${colour}" stroke-width="${h.f(Math.max(1, w * 0.012))}"/>`
  const n = 7
  for (let i = 0; i < n; i++) s += `<rect x="${h.f(x + w * (0.06 + i * 0.128))}" y="${h.f(y - ht * 0.82)}" width="${h.f(w * 0.09)}" height="${h.f(ht * 0.36)}" rx="1" fill="${lit}"/>`
  s += `<rect x="${h.f(x)}" y="${h.f(y - ht * 0.3)}" width="${h.f(w)}" height="${h.f(ht * 0.08)}" fill="${lit}" opacity="0.5"/>`
  return s
}

function lane(m, rand, u, h, k) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, k.top], [0.55, k.mid], [1, k.low]])}${h.glow(`${u}g`, k.neon[0])}${h.glow(`${u}t`, k.neon[1])}${h.blur(`${u}b`, 4)}${h.glow(`${u}w`, '#FFE2A8')}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  // the city at the end of the lane
  s += h.skyline(rand, 222, '#12081C', '#FFB86B', { from: 96, to: 204, maxH: 110 })
  s += `<circle cx="150" cy="190" r="70" fill="url(#${u}w)" opacity="0.35"/>`
  // the tram crossing the end of the lane, and its spark
  s += `<path d="M96 186 L204 182" stroke="#2A1530" stroke-width="1"/>`
  s += tram(h, 106, 231, 88, '#1A0B1E', '#FFD98A')
  s += `<circle cx="169" cy="185" r="10" fill="url(#${u}t)"/><circle cx="169" cy="185" r="1.8" fill="#E6FFFC"/>`
  // brick walls converging on the lane end
  s += `<path d="M0 0 L104 120 L104 230 L0 ${H} Z" fill="#160812"/><path d="M${W} 0 L196 120 L196 230 L${W} ${H} Z" fill="#12060F"/>`
  for (let i = 0; i < 9; i++) {
    const t = i / 9
    s += `<path d="M0 ${f(30 + i * 40)} L104 ${f(130 + t * 96)}" stroke="#2A1020" stroke-width="1" opacity="0.7"/><path d="M${W} ${f(30 + i * 40)} L196 ${f(130 + t * 96)}" stroke="#250C1C" stroke-width="1" opacity="0.7"/>`
  }
  // neon signs on the walls, and a lyrebird in neon
  s += neon(h, u, 18, 118, 54, 16, k.neon[0])
  s += neon(h, u, 232, 92, 46, 14, k.neon[1])
  s += `<circle cx="232" cy="176" r="52" fill="url(#${u}g)" opacity="0.45"/>`
  // a blade sign and a fire escape on the left wall
  s += `<rect x="58" y="150" width="14" height="62" rx="3" fill="#1E0A1A" stroke="${k.neon[1]}" stroke-width="1.6"/><rect x="52" y="146" width="26" height="70" rx="6" fill="url(#${u}t)" opacity="0.5"/>`
  for (let i = 0; i < 5; i++) s += `<rect x="62" y="${156 + i * 11}" width="6" height="6" rx="1" fill="${i % 2 ? k.neon[1] : '#FFE2A8'}" opacity="0.9"/>`
  s += `<g stroke="#2E1428" stroke-width="1.5" fill="none"><path d="M14 230 L44 222 L44 250 L14 262 Z"/><path d="M14 246 L44 236"/></g>`
  s += `<ellipse cx="150" cy="200" rx="90" ry="60" fill="url(#${u}g)" opacity="0.22"/>`
  s += `<g opacity="0.5" filter="url(#${u}b)">${lyrebird(h, 250, 200, 0.62, k.neon[0], { stroke: true })}</g>`
  s += lyrebird(h, 250, 200, 0.62, k.neon[0], { stroke: true })
  // wet ground: the lane floor and the reflections in it
  s += `<path d="M104 230 L196 230 L${W} ${H} L0 ${H} Z" fill="#0A0410"/>`
  s += `<path d="M120 236 L180 236 L230 ${H} L70 ${H} Z" fill="#FFD98A" opacity="0.08"/>`
  s += `<rect x="30" y="300" width="40" height="70" fill="${k.neon[0]}" opacity="0.12" filter="url(#${u}b)"/><rect x="232" y="290" width="44" height="80" fill="${k.neon[1]}" opacity="0.1" filter="url(#${u}b)"/>`
  for (let i = 0; i < 14; i++) s += `<path d="M${f(80 + rand() * 140)} ${f(250 + rand() * 120)} h${f(6 + rand() * 18)}" stroke="#FFD98A" stroke-width="1" opacity="${f(0.15 + rand() * 0.3)}"/>`
  s += rain(h, rand, k.rain, '#E8D9FF')
  s += h.runner(150, 360, 70, '#05020A', false, k.neon[0])
  return s
}

function station(m, rand, u, h, k) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, k.top], [0.5, k.mid], [1, k.low]])}${h.glow(`${u}g`, k.neon[0])}${h.blur(`${u}b`, 5)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += h.stars(rand, 20, { bottom: 90 })
  s += `<circle cx="150" cy="150" r="130" fill="url(#${u}g)" opacity="0.35"/>`
  s += h.skyline(rand, 214, '#2A1030', '#FFC86B', { maxH: 90 })
  // the station: a long facade, the great dome over the arch, a clock tower off to one side
  const c = '#1B0A22'
  s += `<rect x="20" y="150" width="260" height="66" fill="${c}"/>`
  s += `<path d="M104 150 L104 120 Q104 74 150 66 Q196 74 196 120 L196 150 Z" fill="${c}"/><rect x="146" y="50" width="8" height="18" fill="${c}"/><circle cx="150" cy="48" r="4" fill="${c}"/>`
  s += `<rect x="236" y="96" width="22" height="56" fill="${c}"/><path d="M232 98 L247 78 L262 98 Z" fill="${c}"/><circle cx="247" cy="112" r="6" fill="#FFE7A8"/>`
  for (let x = 30; x < 276; x += 14) if (x < 100 || x > 200) s += `<rect x="${x}" y="164" width="7" height="14" rx="3" fill="#FFC86B" opacity="${f(0.45 + rand() * 0.5)}"/>`
  // the arch, glowing, and the row of clocks under it
  s += `<path d="M118 216 L118 170 Q118 140 150 136 Q182 140 182 170 L182 216 Z" fill="#FFB65C" opacity="0.9"/>`
  s += `<path d="M118 216 L118 170 Q118 140 150 136 Q182 140 182 170 L182 216 Z" fill="url(#${u}g)" opacity="0.6"/>`
  for (let i = 0; i < 6; i++) s += `<circle cx="${123 + i * 10.8}" cy="160" r="4.2" fill="#FFF4DA" stroke="${c}" stroke-width="1.2"/><path d="M${123 + i * 10.8} 160 l0 -2.6 M${123 + i * 10.8} 160 l1.8 ${f(0.8 + i * 0.2)}" stroke="${c}" stroke-width="0.8"/>`
  // the Yarra, Princes Bridge and the reflections
  s += `<rect y="252" width="${W}" height="${H - 252}" fill="#0B0618"/>`
  s += `<rect y="234" width="${W}" height="10" fill="#14081E"/>`
  for (let i = 0; i < 4; i++) s += `<path d="M${-20 + i * 92} 252 Q${26 + i * 92} 220 ${72 + i * 92} 252" fill="none" stroke="#14081E" stroke-width="8"/>`
  for (let i = 0; i < 30; i++) s += `<rect x="${f(rand() * W)}" y="${f(258 + rand() * 110)}" width="${f(6 + rand() * 26)}" height="1.6" fill="${rand() < 0.3 ? k.neon[1] : '#FFC86B'}" opacity="${f(0.15 + rand() * 0.45)}"/>`
  s += `<rect x="118" y="256" width="64" height="70" fill="#FFB65C" opacity="0.1" filter="url(#${u}b)"/>`
  s += rain(h, rand, k.rain, '#FFE9D0', { bottom: 250 })
  s += h.runner(150, 236, 44, '#08030E', false, k.neon[1])
  return s
}

function roofs(m, rand, u, h, k) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, k.top], [0.6, k.mid], [1, k.low]])}${h.glow(`${u}g`, '#F4F7FF')}${h.glow(`${u}r`, k.neon[0])}${h.blur(`${u}b`, 6)}`
    + `<linearGradient id="${u}beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#F4F7FF" stop-opacity="0.5"/><stop offset="1" stop-color="#F4F7FF" stop-opacity="0"/></linearGradient></defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  // the stadium glow and its light towers, far off
  s += `<ellipse cx="150" cy="200" rx="150" ry="60" fill="url(#${u}g)" opacity="0.5"/>`
  for (const [x, lean] of [[64, -40], [236, 40], [150, 0]]) {
    s += `<path d="M${x - 4} 200 L${x + lean - 34} 0 L${x + lean + 34} 0 L${x + 4} 200 Z" fill="url(#${u}beam)" opacity="0.6"/>`
  }
  for (const x of [64, 236]) {
    s += `<path d="M${x} 214 L${x + (x < 150 ? 8 : -8)} 120" stroke="#0C0818" stroke-width="3"/>`
    s += `<rect x="${x + (x < 150 ? -6 : -22)}" y="108" width="28" height="14" rx="2" fill="#F4F7FF" transform="rotate(${x < 150 ? -14 : 14} ${x + (x < 150 ? 8 : -8)} 115)"/>`
    s += `<circle cx="${x + (x < 150 ? 8 : -8)}" cy="115" r="22" fill="url(#${u}g)"/>`
  }
  s += `<path d="M40 214 Q150 170 260 214 Z" fill="#0C0818"/>`
  // rooftops: water tanks, aerials and a gap to clear
  s += `<path d="M0 252 L0 236 L40 236 L40 222 L92 222 L92 244 L130 244 L130 ${H} L0 ${H} Z" fill="#06040C"/>`
  s += `<path d="M170 ${H} L170 238 L214 238 L214 226 L262 226 L262 246 L${W} 246 L${W} ${H} Z" fill="#06040C"/>`
  s += `<rect x="54" y="196" width="22" height="26" rx="3" fill="#06040C"/><path d="M50 196 L80 196" stroke="#06040C" stroke-width="3"/><path d="M58 222 L54 232 M72 222 L76 232" stroke="#06040C" stroke-width="2"/>`
  s += `<path d="M236 226 V184 M228 192 H244 M230 200 H242" stroke="#06040C" stroke-width="2"/><circle cx="236" cy="182" r="2.4" fill="${k.neon[0]}"/>`
  s += `<circle cx="236" cy="182" r="10" fill="url(#${u}r)"/>`
  // the rooftop edges catch the crimson rim, and the street glows far below the gap
  s += `<path d="M0 236 L40 236 L40 222 L92 222 L92 244 L130 244" fill="none" stroke="${k.neon[0]}" stroke-width="1.4" opacity="0.6"/><path d="M170 238 L214 238 L214 226 L262 226 L262 246 L${W} 246" fill="none" stroke="${k.neon[0]}" stroke-width="1.4" opacity="0.6"/>`
  s += `<rect x="130" y="300" width="40" height="${H - 300}" fill="${k.neon[0]}" opacity="0.18" filter="url(#${u}b)"/>`
  for (let i = 0; i < 18; i++) s += `<rect x="${f(rand() < 0.5 ? 6 + rand() * 110 : 180 + rand() * 110)}" y="${f(262 + rand() * 100)}" width="3" height="4" fill="#FFD98A" opacity="${f(0.3 + rand() * 0.5)}"/>`
  s += rain(h, rand, k.rain, '#DCE2FF')
  // mid leap across the gap
  s += h.runner(152, 236, 64, '#020106', false, k.neon[0])
  return s
}

function pier(m, rand, u, h, k) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, k.top], [0.6, k.mid], [1, k.low]])}${h.glow(`${u}g`, '#E6F6FF')}${h.glow(`${u}k`, '#FFD98A')}${h.glow(`${u}r`, k.neon[1])}${h.blur(`${u}b`, 5)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += h.stars(rand, 50, { bottom: 170 })
  // the moon over the bay, and its path on the water
  s += `<circle cx="150" cy="92" r="84" fill="url(#${u}g)" opacity="0.6"/><circle cx="150" cy="92" r="26" fill="#EEF7FF"/>`
  s += `<path d="M0 194 Q60 188 110 192 L300 190 L300 196 L0 198 Z" fill="#06182A"/>`
  s += `<rect y="196" width="${W}" height="${H - 196}" fill="#03121F"/>`
  for (let i = 0; i < 40; i++) {
    const y = 200 + rand() * 170
    const spread = 8 + (y - 196) * 0.5
    s += `<rect x="${f(150 - spread + rand() * spread * 2 - 8)}" y="${f(y)}" width="${f(5 + rand() * 18)}" height="1.6" fill="#CFEAFF" opacity="${f(0.2 + rand() * 0.5)}"/>`
  }
  // the long pier, running straight out to the kiosk, with lamps down each side
  s += `<path d="M40 ${H} L144 210 L156 210 L260 ${H} Z" fill="#020A12"/>`
  s += `<path d="M40 ${H} L144 210 M260 ${H} L156 210" stroke="#FFD98A" stroke-width="1" opacity="0.3"/>`
  for (let i = 0; i < 9; i++) {
    const t = (i / 9) ** 1.6
    const y = 210 + t * 160
    for (const side of [-1, 1]) {
      const x = 150 + side * (6 + t * 104)
      s += `<path d="M${f(x)} ${f(y)} V${f(y - 6 - t * 30)}" stroke="#020A12" stroke-width="${f(0.8 + t * 2.4)}"/>`
      s += `<circle cx="${f(x)}" cy="${f(y - 6 - t * 30)}" r="${f(0.8 + t * 2)}" fill="#FFD98A"/><circle cx="${f(x)}" cy="${f(y - 6 - t * 30)}" r="${f(3 + t * 10)}" fill="url(#${u}k)"/>`
    }
  }
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) ** 1.4
    s += `<path d="M${f(150 - 6 - t * 104)} ${f(210 + t * 160)} H${f(150 + 6 + t * 104)}" stroke="#0A1A28" stroke-width="${f(0.6 + t * 1.4)}"/>`
  }
  // the kiosk at the end, glowing
  s += `<rect x="136" y="196" width="28" height="14" fill="#020A12"/><path d="M132 197 L150 182 L168 197 Z" fill="#020A12"/>`
  s += `<rect x="140" y="200" width="20" height="5" fill="#FFD98A" opacity="0.9"/><circle cx="150" cy="202" r="18" fill="url(#${u}k)" opacity="0.6"/>`
  // the boat with no lights, and one red glint
  s += `<path d="M206 206 L262 206 L254 214 L214 214 Z" fill="#010508"/><rect x="222" y="198" width="22" height="8" fill="#010508"/>`
  s += `<circle cx="238" cy="201" r="1.6" fill="${k.neon[1]}"/><circle cx="238" cy="201" r="9" fill="url(#${u}r)"/>`
  // palms along the Esplanade
  for (const [x, y, sc] of [[22, 214, 1], [56, 226, 0.7]]) {
    s += `<path d="M${x} ${y + 40} Q${x + 6 * sc} ${y - 50 * sc} ${x + 2 * sc} ${y - 96 * sc}" stroke="#01060C" stroke-width="${f(4 * sc)}" fill="none"/>`
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (i / 6) * Math.PI
      s += `<path d="M${f(x + 2 * sc)} ${f(y - 96 * sc)} q${f(Math.cos(a) * 18 * sc)} ${f(-14 * sc)} ${f(Math.cos(a) * 34 * sc)} ${f(Math.abs(Math.sin(a)) * -6 * sc + 14 * sc)}" stroke="#01060C" stroke-width="${f(2.6 * sc)}" fill="none" stroke-linecap="round"/>`
    }
  }
  // the breakwater rocks, and two little penguins coming home
  s += `<path d="M232 252 Q252 238 272 246 Q288 236 300 240 L300 268 L232 268 Z" fill="#020A12"/>`
  for (const x of [262, 272]) s += `<ellipse cx="${x}" cy="244" rx="2.6" ry="4.4" fill="#0E2238"/><ellipse cx="${x + 0.7}" cy="244.5" rx="1.3" ry="3" fill="#DDEFFF" opacity="0.85"/><circle cx="${x}" cy="239" r="1.8" fill="#0E2238"/>`
  s += rain(h, rand, k.rain, '#DFF2FF', { bottom: 200 })
  s += h.runner(150, 352, 62, '#000307', false, k.neon[1])
  return s
}

function mist(m, rand, u, h, k) {
  const { W, H, f } = h
  let s = `<defs>${h.sky(`${u}s`, [[0, k.top], [0.5, k.mid], [1, k.low]])}${h.glow(`${u}g`, '#FFF1D2')}${h.blur(`${u}b`, 8)}${h.blur(`${u}m`, 14)}</defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
  s += `<circle cx="160" cy="150" r="110" fill="url(#${u}g)" opacity="0.8"/><circle cx="160" cy="150" r="22" fill="#FFF6E2" opacity="0.85"/>`
  // tall mountain ash, far ones pale in the mist, near ones dark
  const ash = (x, base, top, w, colour, op) => {
    let t = `<path d="M${f(x - w)} ${base} L${f(x - w * 0.4)} ${top} L${f(x + w * 0.4)} ${top} L${f(x + w)} ${base} Z" fill="${colour}" opacity="${op}"/>`
    for (let i = 0; i < 4; i++) t += `<ellipse cx="${f(x + (rand() - 0.5) * 26)}" cy="${f(top - 4 + rand() * 18)}" rx="${f(10 + rand() * 12)}" ry="${f(5 + rand() * 5)}" fill="${colour}" opacity="${op}"/>`
    return t
  }
  for (let i = 0; i < 8; i++) s += ash(10 + i * 40 + rand() * 14, 260, 30 + rand() * 30, 3, '#7C6577', 0.35)
  s += `<rect y="150" width="${W}" height="70" fill="#F6E2CF" opacity="0.4" filter="url(#${u}m)"/>`
  // the curved trestle and the train on it
  s += `<path d="M-10 232 Q150 206 310 232" stroke="#3A2A3A" stroke-width="6" fill="none"/>`
  for (let i = 0; i <= 16; i++) {
    const x = -10 + i * 20
    const yTop = 232 - Math.sin((i / 16) * Math.PI) * 13
    s += `<path d="M${f(x)} ${f(yTop)} L${f(x - 6)} 300 M${f(x)} ${f(yTop)} L${f(x + 6)} 300" stroke="#3A2A3A" stroke-width="1.6" opacity="0.8"/>`
    if (i % 2 === 0) s += `<path d="M${f(x - 6)} ${f(yTop + 24)} L${f(x + 14)} ${f(yTop + 50)}" stroke="#3A2A3A" stroke-width="1" opacity="0.6"/>`
  }
  // engine and carriages
  const car = '#2A1C2C'
  s += `<rect x="58" y="${f(208)}" width="36" height="16" rx="2" fill="${car}"/><rect x="98" y="${f(206)}" width="36" height="16" rx="2" fill="${car}"/><rect x="138" y="${f(205)}" width="36" height="16" rx="2" fill="${car}"/>`
  for (const x of [62, 102, 142]) for (let i = 0; i < 4; i++) s += `<rect x="${x + i * 8}" y="${x === 62 ? 211 : x === 102 ? 209 : 208}" width="5" height="5" fill="#FFD98A" opacity="0.85"/>`
  s += `<rect x="178" y="200" width="44" height="18" rx="3" fill="${car}"/><rect x="208" y="190" width="16" height="28" fill="${car}"/><rect x="184" y="186" width="8" height="14" fill="${car}"/><rect x="182" y="184" width="12" height="4" fill="${car}"/>`
  s += `<circle cx="222" cy="210" r="2.4" fill="#FFE6B8"/><circle cx="222" cy="210" r="10" fill="url(#${u}g)"/>`
  // the steam plume rolling back over the train
  for (let i = 0; i < 9; i++) s += `<circle cx="${f(188 - i * 18 + rand() * 6)}" cy="${f(176 - i * 6 - rand() * 8)}" r="${f(9 + i * 2.6)}" fill="#FFF8EE" opacity="${f(0.7 - i * 0.06)}" filter="url(#${u}b)"/>`
  // near trunks and the forest floor
  s += `<rect y="296" width="${W}" height="${H - 296}" fill="#1C121E"/>`
  s += `<rect y="250" width="${W}" height="70" fill="#F6E2CF" opacity="0.45" filter="url(#${u}m)"/>`
  for (const [x, w] of [[16, 9], [278, 11]]) s += `<path d="M${x - w} ${H} L${x - w * 0.5} 0 L${x + w * 0.5} 0 L${x + w} ${H} Z" fill="#120A14"/>`
  // a lyrebird on a mossy log
  s += `<path d="M168 342 L292 330" stroke="#120A14" stroke-width="12" stroke-linecap="round"/>`
  s += lyrebird(h, 226, 334, 1.0, '#120A14')
  s += h.runner(112, 362, 66, '#0A050C', false, k.neon[1])
  return s
}

const DRAW = { lane, station, roofs, pier, mist }

export const COVER = {
  saga: 'deepcover',
  draw(m, rand, u, h) {
    const k = LOOKS[m.id] || LOOKS['deepcover-courier']
    return DRAW[k.scene](m, rand, u, h, k)
  },
}
