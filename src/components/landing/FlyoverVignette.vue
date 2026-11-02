<script setup>
// The recap flyover, drawn as raised hexes of the ground you took with the
// camera's path sweeping around them.
import { hexRings } from './hex.js'

const R = 16
// Squash the y axis to tilt the map, then raise each hex into a prism.
const TILT = 0.55
const cells = hexRings(150, 96, R, 2)
  .filter((_, i) => ![9, 13, 17].includes(i))
  .map((h, i) => ({ ...h, hgt: 6 + ((i * 7) % 5) * 3 }))
  .sort((a, b) => a.cy - b.cy)

function corners(cx, cy) {
  const out = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k
    out.push([cx + (R - 1) * Math.cos(a), 96 + (cy - 96) * TILT + (R - 1) * Math.sin(a) * TILT])
  }
  return out
}
const prisms = cells.map((c, i) => {
  const base = corners(c.cx, c.cy)
  const top = base.map(([x, y]) => [x, y - c.hgt])
  const pts = a => a.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')
  // Front faces: the edges from corner 0 to 1, 1 to 2 and 2 to 3 face the viewer.
  const faces = [[0, 1], [1, 2], [2, 3]].map(([a, b]) => pts([base[a], base[b], top[b], top[a]]))
  return { id: i, top: pts(top), faces }
})
</script>

<template>
  <svg class="lp-vg" viewBox="0 0 300 156" role="img"
       aria-label="Your ground raised up in 3D, with the camera path circling it.">
    <ellipse cx="150" cy="92" rx="128" ry="52" class="v-orbit" />
    <g v-for="p in prisms" :key="p.id">
      <polygon v-for="(f, j) in p.faces" :key="j" :points="f" :class="j === 1 ? 'v-side-dark' : 'v-side'" />
      <polygon :points="p.top" class="v-top" />
    </g>
    <circle cx="196" cy="141" r="6" class="v-cam" />
    <path d="M180 137 L170 143 L180 149" class="v-camarrow" />
  </svg>
</template>
