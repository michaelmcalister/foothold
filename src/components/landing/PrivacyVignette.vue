<script setup>
// A privacy zone: home sits inside a circle, the ends of the route inside it
// are trimmed from what others see, and no hex there shows as yours.
import { hexGrid, hexPoints } from './hex.js'

const R = 10
const ZX = 70, ZY = 78, ZR = 46
const hexes = hexGrid(16, 8, R, 150, 6)
  .filter(h => h.cx < 292 && h.cy < 146)
  .filter(h => (h.cx - 214) ** 2 / 1.5 + (h.cy - 72) ** 2 < 1900)
  .map(h => ({ ...h, points: hexPoints(h.cx, h.cy, R) }))
</script>

<template>
  <svg class="lp-vg" viewBox="0 0 300 156" role="img"
       aria-label="Home inside a privacy zone. The route leaving home is hidden until it leaves the zone, and the ground taken further out still shows.">
    <polygon v-for="h in hexes" :key="h.id" :points="h.points" class="v-you" />
    <circle :cx="ZX" :cy="ZY" :r="ZR" class="v-zone" />
    <path d="M70 78 L104 60" class="v-trimmed" />
    <path d="M104 60 L150 16 L284 20 L286 126 L150 130 L110 98" class="v-route" />
    <path d="M110 98 L70 78" class="v-trimmed" />
    <path d="M62 82 L70 74 L78 82 L78 90 L62 90 Z" class="v-home" />
    <text :x="ZX" :y="ZY + ZR + 16" text-anchor="middle" class="v-label small">only you see this</text>
  </svg>
</template>
