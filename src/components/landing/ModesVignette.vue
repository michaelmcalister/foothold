<script setup>
// Three small patches of the same streets: your run map, walk map and ride
// map are kept apart, so each one is its own game.
import { hexGrid, hexPoints } from './hex.js'

const R = 11
const patches = [
  { name: 'Run', x: 14, you: ['1-1', '2-0', '2-1', '3-1', '1-2', '2-2'], rival: ['4-0', '4-1'] },
  { name: 'Walk', x: 122, you: ['0-1', '1-1', '0-2'], rival: ['2-1', '3-0', '3-1', '3-2', '2-2'] },
  { name: 'Ride', x: 230, you: ['0-0', '1-0', '2-0', '3-0', '4-0', '4-1', '3-1', '4-2'], rival: ['0-2'] },
].map(p => ({
  ...p,
  hexes: hexGrid(5, 3, R, p.x, 18).map(h => ({
    ...h,
    points: hexPoints(h.cx, h.cy, R),
    kind: p.you.includes(h.id) ? 'you' : p.rival.includes(h.id) ? 'rival' : 'wild',
  })),
}))
</script>

<template>
  <svg class="lp-vg" viewBox="0 0 330 112" role="img"
       aria-label="Three maps of the same streets, one each for running, walking and riding, each with different ground held.">
    <g v-for="p in patches" :key="p.name">
      <polygon v-for="h in p.hexes" :key="h.id" :points="h.points" :class="`v-${h.kind}`" />
      <text :x="p.x - 8" y="104" class="v-label">{{ p.name }}</text>
    </g>
  </svg>
</template>
