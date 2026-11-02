<script setup>
// The four levels, drawn as clusters of held ground that grow.
import { hexRings, hexPoints } from './hex.js'

const levels = [
  { name: 'Foothold', min: 1, rings: 0, r: 9, x: 26 },
  { name: 'Outpost', min: 60, rings: 1, r: 7, x: 88 },
  { name: 'Stronghold', min: 250, rings: 2, r: 5.4, x: 172 },
  { name: 'Fortress', min: 800, rings: 3, r: 4.4, x: 270 },
].map(l => ({ ...l, hexes: hexRings(l.x, 50, l.r, l.rings).map(h => hexPoints(h.cx, h.cy, l.r, 0.6)) }))
</script>

<template>
  <svg class="lp-vg" viewBox="0 0 320 112" role="img"
       aria-label="Four levels: Foothold from 1 hex, Outpost from 60, Stronghold from 250 and Fortress from 800.">
    <g v-for="l in levels" :key="l.name">
      <polygon v-for="(p, i) in l.hexes" :key="i" :points="p" class="v-you" />
      <text :x="l.x" y="92" text-anchor="middle" class="v-label">{{ l.name }}</text>
      <text :x="l.x" y="106" text-anchor="middle" class="v-label small">{{ l.min === 1 ? '1 hex' : `${l.min} hexes` }}</text>
    </g>
  </svg>
</template>
