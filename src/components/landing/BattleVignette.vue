<script setup>
// A battle in progress: seven days, the hexes being fought over, and who
// holds more of them right now.
import { hexGrid, hexPoints } from './hex.js'

const R = 12
const yours = new Set(['0-0', '1-0', '1-1', '2-0', '2-1', '3-1', '0-1', '3-0', '4-1'])
const hexes = hexGrid(6, 2, R, 22, 22).slice(0, 12).map(h => ({ ...h, points: hexPoints(h.cx, h.cy, R), mine: yours.has(h.id) }))
const mine = hexes.filter(h => h.mine).length
const days = Array.from({ length: 7 }, (_, i) => i)
const today = 4
</script>

<template>
  <svg class="lp-vg" viewBox="0 0 300 150" role="img"
       :aria-label="`A battle on day ${today + 1} of 7. You hold ${mine} of the ${hexes.length} contested hexes, your rival holds ${hexes.length - mine}.`">
    <polygon v-for="h in hexes" :key="h.id" :points="h.points" :class="h.mine ? 'v-you' : 'v-rival'" />
    <text x="140" y="34" class="v-big">{{ mine }} to {{ hexes.length - mine }}</text>
    <text x="140" y="52" class="v-label">you lead, day {{ today + 1 }} of 7</text>
    <g transform="translate(14 104)">
      <g v-for="d in days" :key="d">
        <rect :x="d * 39" y="0" width="34" height="10" rx="2" :class="d < today ? 'v-dayon' : d === today ? 'v-daynow' : 'v-dayoff'" />
      </g>
      <text x="0" y="30" class="v-label small">day 1</text>
      <text x="272" y="30" text-anchor="end" class="v-label small">day 7: most hexes wins</text>
    </g>
  </svg>
</template>
