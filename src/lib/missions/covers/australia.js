// Cover art for the ten Australia wide series and the season finale
// (gathering.js) (missions/series/tiger.js,
// mahogany.js, catalpa.js, minmin.js, opal.js, tunnels.js, canberra.js,
// panther.js, hawkesbury.js and nugget.js). They share one layout: a sky,
// a glow, layered hills, the series' own landmark, and the runner in
// silhouette with a rim of the series colour. Drawn with the helpers
// covers.js passes in, on its 300 by 375 canvas.

function scene(o) {
  return function draw(m, rand, u, h) {
    const { W, H } = h
    let s = `<defs>${h.sky(`${u}s`, o.sky)}${h.glow(`${u}g`, o.glow, 0.9)}</defs>`
    s += `<rect width="${W}" height="${H}" fill="url(#${u}s)"/>`
    if (o.stars) s += h.stars(rand, o.stars, { bottom: H * 0.5 })
    s += `<circle cx="${o.sun[0]}" cy="${o.sun[1]}" r="${o.sun[2]}" fill="url(#${u}g)"/>`
    for (const [y, amp, colour, bumps] of o.hills) s += h.hill(rand, y, amp, colour, bumps)
    s += `<rect x="0" y="${o.ground[0]}" width="${W}" height="${H - o.ground[0]}" fill="${o.ground[1]}"/>`
    s += o.mark(rand, h)
    s += h.runner(o.runner?.[0] ?? 112, o.runner?.[1] ?? 360, 62, '#05070C', !!o.runner?.[2], o.rim)
    return s
  }
}

// a striped tiger slinking along a ridge under kunanyi
const tiger = scene({
  sky: [[0, '#0E1A14'], [0.5, '#2E4A3A'], [0.8, '#C98A3A'], [1, '#F1C27A']], glow: '#F6D58E', sun: [210, 190, 60], stars: 30,
  hills: [[170, 40, '#30443A', 2], [230, 18, '#1C2C24', 3]], ground: [300, '#14211A'], rim: '#E8A33D',
  mark: (rand, h) => {
    // body, head with ears, stiff tail and four legs, side on
    let s = '<ellipse cx="100" cy="236" rx="38" ry="11" fill="#B87A3A"/>'
    s += '<ellipse cx="144" cy="230" rx="12" ry="8" fill="#B87A3A"/><path d="M138 223 l4 -8 l4 7 Z M146 222 l5 -7 l2 8 Z" fill="#B87A3A"/>'
    s += '<path d="M63 234 q-22 2 -36 10" stroke="#B87A3A" stroke-width="5" fill="none" stroke-linecap="round"/>'
    for (const x of [74, 84, 116, 126]) s += `<rect x="${x}" y="240" width="5" height="18" rx="2" fill="#B87A3A"/>`
    for (let i = 0; i < 7; i++) s += `<rect x="${72 + i * 7}" y="227" width="3" height="13" fill="#3A2412"/>`
    return s + h.gum(rand, 250, 260, 70, '#0F1A14')
  },
})

// a ghostly old ship half buried in the dunes
const mahogany = scene({
  sky: [[0, '#1B2236'], [0.55, '#5B6C8C'], [0.85, '#E7B98C'], [1, '#F6DEC0']], glow: '#FFE7C4', sun: [70, 200, 50],
  hills: [[240, 22, '#C9A97A', 3], [262, 14, '#B38E5E', 4]], ground: [290, '#2E4C6A'], rim: '#D9A066',
  mark: () => '<path d="M150 252 l90 -6 l-14 22 l-66 4 Z" fill="#5A3020"/><rect x="190" y="200" width="4" height="50" fill="#5A3020"/><path d="M194 204 l26 14 l-26 10 Z" fill="#E9DCC4" opacity="0.7"/>',
})

// a three masted ship on the horizon, a rowboat, and the Round House
const catalpa = scene({
  sky: [[0, '#0D1B33'], [0.5, '#1F4A73'], [0.8, '#F08A4B'], [1, '#FCCB7B']], glow: '#FFD08A', sun: [220, 230, 55],
  hills: [], ground: [300, '#E6CFA0'], rim: '#4FB3E8',
  mark: () => '<rect x="0" y="240" width="300" height="60" fill="#1D4E7A"/><path d="M196 236 l46 0 l-6 8 l-34 0 Z" fill="#1A1A1A"/>' +
    [204, 218, 232].map((x) => `<rect x="${x}" y="196" width="2" height="40" fill="#1A1A1A"/><path d="M${x + 2} 200 l10 12 l-10 10 Z" fill="#F4EAD8"/>`).join('') +
    '<path d="M80 270 l30 0 l-4 6 l-22 0 Z" fill="#3A2A1A"/><path d="M20 300 l0 -30 l36 -8 l36 8 l0 30 Z" fill="#D8C7A0"/>',
})

// glowing balls of light over flat red desert
const minmin = scene({
  sky: [[0, '#05060F'], [0.6, '#1B1F45'], [0.9, '#5A3A5A'], [1, '#8C4A3A']], glow: '#E8F4FF', sun: [190, 210, 22], stars: 70,
  hills: [[262, 6, '#5A2A1A', 5]], ground: [272, '#7A3A1E'], rim: '#BDE3FF',
  mark: () => '<circle cx="90" cy="226" r="7" fill="#F4FBFF" opacity="0.9"/><circle cx="240" cy="236" r="4" fill="#F4FBFF" opacity="0.7"/>',
})

// opal town: dugout doors in a hill, a mine shaft hoist, opal colours in the sky
const opal = scene({
  sky: [[0, '#1E3A8A'], [0.4, '#3BB2C8'], [0.7, '#B3E6A0'], [1, '#F7B2D9']], glow: '#FFF6E0', sun: [230, 120, 40],
  hills: [[220, 30, '#C9763A', 2], [250, 12, '#A85A2A', 3]], ground: [290, '#D88A4A'], rim: '#7DF0E6',
  mark: () => '<rect x="60" y="232" width="14" height="20" rx="7" fill="#3A1E10"/><rect x="100" y="238" width="12" height="16" rx="6" fill="#3A1E10"/>' +
    '<path d="M200 270 l20 -60 l20 60 M206 250 l28 0" stroke="#3A2A1A" stroke-width="3" fill="none"/>',
})

// a tunnel mouth in a cliff, tropical palms, a storm out to sea
const tunnels = scene({
  sky: [[0, '#1A2A3A'], [0.5, '#3A6A7A'], [0.8, '#F0A060'], [1, '#FFD8A0']], glow: '#FFE0A8', sun: [220, 210, 50],
  hills: [[200, 10, '#4A3A2A', 2]], ground: [290, '#5A4A3A'], rim: '#F2C14E',
  mark: () => '<rect x="0" y="200" width="300" height="90" fill="#7A5A3A"/><path d="M110 290 l0 -50 q40 -40 80 0 l0 50 Z" fill="#120C08"/><path d="M128 290 l0 -40 q22 -24 44 0 l0 40" stroke="#F2C14E" stroke-width="2" fill="none" opacity="0.6"/>' +
    '<path d="M40 200 l4 -60 M44 140 q-20 0 -30 12 M44 140 q20 -4 30 10 M44 140 q-6 -16 -20 -18" stroke="#1A2A1A" stroke-width="4" fill="none"/>',
})

// the lake, a tall water jet and a flagpole on the hill
const canberra = scene({
  sky: [[0, '#16284A'], [0.5, '#4A78B0'], [0.8, '#F2B8A0'], [1, '#FFE4C8']], glow: '#FFEAD0', sun: [70, 190, 45],
  hills: [[200, 24, '#3A5A6A', 2]], ground: [300, '#3A6A4A'], rim: '#9BD1FF',
  mark: () => '<rect x="0" y="250" width="300" height="50" fill="#2A5A8A"/><path d="M150 250 l0 -46" stroke="#E8F4FF" stroke-width="4"/><circle cx="150" cy="204" r="8" fill="#E8F4FF" opacity="0.6"/>' +
    '<path d="M228 210 l0 -50 M210 214 l18 -44 l18 44" stroke="#D8DEE6" stroke-width="2" fill="none"/>',
})

// a black cat's eyes in the dark between blue gums, cliffs behind
const panther = scene({
  sky: [[0, '#05070F'], [0.5, '#1A2A4A'], [0.85, '#3A5A8A'], [1, '#6A8AB0']], glow: '#CFE0FF', sun: [220, 90, 30], stars: 50,
  hills: [[180, 30, '#1E2E4A', 2], [222, 10, '#121C2E', 3]], ground: [290, '#0A0F18'], rim: '#7EC8FF',
  mark: (rand, h) => h.gum(rand, 60, 290, 120, '#080C14') + h.gum(rand, 250, 290, 110, '#080C14') +
    '<circle cx="146" cy="250" r="3" fill="#E8F06A"/><circle cx="158" cy="250" r="3" fill="#E8F06A"/>',
})

// a wide river at dusk, an old rail bridge, a ripple with something under it
const hawkesbury = scene({
  sky: [[0, '#1A1A3A'], [0.5, '#5A4A7A'], [0.8, '#E09A7A'], [1, '#FFD0A8']], glow: '#FFE0C0', sun: [80, 220, 40],
  hills: [[200, 34, '#2A3A3A', 2], [226, 14, '#1E2A2A', 3]], ground: [300, '#16241E'], rim: '#6FE0C0',
  mark: () => '<rect x="0" y="238" width="300" height="62" fill="#2A4A5A"/>' +
    [40, 110, 180, 250].map((x) => `<rect x="${x}" y="214" width="8" height="30" fill="#8A7A6A"/>`).join('') +
    '<rect x="30" y="208" width="240" height="6" fill="#4A4A4A"/><path d="M150 262 q16 -10 32 0 q16 -10 32 0" stroke="#BFE8E0" stroke-width="2" fill="none"/>',
})

// a goldfield at dawn: a pick, a pan, and a big gold glint in the dirt
const nugget = scene({
  sky: [[0, '#2A1A3A'], [0.5, '#8A5A6A'], [0.8, '#F2B05A'], [1, '#FFE6A8']], glow: '#FFE08A', sun: [200, 230, 60],
  hills: [[220, 20, '#6A5A3A', 3], [246, 10, '#5A4A2A', 4]], ground: [280, '#8A6A3A'], rim: '#FFD34E',
  mark: () => '<path d="M46 284 q8 -24 30 -22 q20 -10 34 6 q12 10 0 18 Z" fill="#FFD34E"/><path d="M58 272 q10 -6 18 -2 M88 268 q8 -2 12 4" stroke="#FFF6C8" stroke-width="2" fill="none"/>' +
    '<path d="M220 280 l30 -40 M236 236 q16 -2 24 8" stroke="#3A2A1A" stroke-width="4" fill="none"/>',
})

// the season finale: a map of Australia with ten glowing pins
const gathering = scene({
  sky: [[0, '#140A26'], [0.5, '#3A2156'], [0.85, '#E07A3A'], [1, '#FFC46B']], glow: '#FFD58A', sun: [150, 250, 70], stars: 60,
  hills: [[250, 10, '#2A1A3A', 4]], ground: [290, '#1B1030'], rim: '#FFB347',
  mark: () => '<path d="M70 150 q30 -40 80 -30 q20 -30 50 -10 q40 0 50 40 q10 40 -20 70 q-30 20 -60 10 q-30 20 -60 0 q-40 -10 -40 -40 q-10 -20 0 -40 Z" fill="#E8A35A" opacity="0.85"/>'
    + [[95, 175], [120, 150], [150, 135], [175, 125], [205, 140], [225, 170], [215, 200], [185, 215], [150, 210], [210, 228]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#FFF3C4"/><circle cx="${x}" cy="${y}" r="8" fill="#FFF3C4" opacity="0.25"/>`).join(''),
})

// Your Patch: rooftops of a suburb at golden hour, a kite over the park
const yourpatch = scene({
  sky: [[0, '#26324A'], [0.55, '#6A8AB0'], [0.85, '#F2B880'], [1, '#FFE2B0']], glow: '#FFE6B8', sun: [230, 200, 50],
  hills: [[230, 12, '#3A5A3A', 4]], ground: [292, '#2A4A2A'], rim: '#FFD166',
  mark: () => [30, 90, 150, 210, 260].map((x, i) => `<path d="M${x} 262 l22 -18 l22 18 v28 h-44 Z" fill="${['#C2703D', '#A85A32', '#C98A4A', '#B0603A', '#9A5030'][i]}"/>`).join('')
    + '<path d="M200 110 l14 -16 l14 16 l-14 18 Z" fill="#E5484D"/><path d="M214 128 q-10 30 -40 60 q-20 20 -30 60" stroke="#F4EAD8" stroke-width="1.2" fill="none"/>',
})

export const COVERS = [
  { saga: 'tiger', draw: tiger },
  { saga: 'mahogany', draw: mahogany },
  { saga: 'catalpa', draw: catalpa },
  { saga: 'minmin', draw: minmin },
  { saga: 'opal', draw: opal },
  { saga: 'tunnels', draw: tunnels },
  { saga: 'canberra', draw: canberra },
  { saga: 'panther', draw: panther },
  { saga: 'hawkesbury', draw: hawkesbury },
  { saga: 'nugget', draw: nugget },
  { saga: 'gathering', draw: gathering },
  { saga: 'yourpatch', draw: yourpatch },
]
