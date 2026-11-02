<script setup>
// The route planner's preview: draw a loop and see which hexes it would take,
// and whose they are now.
import { hexGrid, hexPoints, inside } from './hex.js'

const R = 10
const ring = [[40, 30], [190, 22], [250, 70], [214, 118], [92, 124], [30, 86]]
const ringPath = 'M' + ring.map(p => p.join(' ')).join(' L') + ' Z'
const rivalZone = ([x, y]) => x > 160 && y < 90
const heldZone = ([x, y]) => x < 80 && y > 70
const hexes = hexGrid(19, 9, R, 6, 6)
  .filter(h => inside([h.cx, h.cy], ring))
  .map(h => {
    const p = [h.cx, h.cy]
    const kind = rivalZone(p) ? 'rival' : heldZone(p) ? 'held' : 'new'
    return { ...h, kind, points: hexPoints(h.cx, h.cy, R) }
  })
const count = k => hexes.filter(h => h.kind === k).length
</script>

<template>
  <figure class="lp-fig">
    <svg class="lp-vg" viewBox="0 0 280 140" role="img"
         :aria-label="`A planned loop that would take ${count('new')} wild hexes and ${count('rival')} from a rival, and pass ${count('held')} you already hold.`">
      <polygon v-for="h in hexes" :key="h.id" :points="h.points" :class="`v-plan-${h.kind}`" />
      <path :d="ringPath" class="v-planline" />
    </svg>
    <figcaption class="lp-cap lp-keys">
      <span><i class="lp-key new"></i>{{ count('new') }} wild</span>
      <span><i class="lp-key rival"></i>{{ count('rival') }} from Sam</span>
      <span><i class="lp-key held"></i>{{ count('held') }} already yours</span>
    </figcaption>
  </figure>
</template>
