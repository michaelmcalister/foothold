<script setup>
// A stronghold: a named loop around a landmark with a crown on it. Whoever
// runs it most in 90 days holds the crown.
const loop = 'M60 112 C 30 92, 34 44, 78 34 S 170 22, 214 40 S 262 98, 226 116 S 100 134, 60 112 Z'
</script>

<template>
  <svg class="lp-vg" viewBox="0 0 300 150" role="img"
       aria-label="A loop around a lake, with a crown on it. The crown holder has 11 runs in 90 days, you have 9.">
    <path d="M92 70 C 104 52, 186 50, 200 70 S 170 104, 130 98 S 84 84, 92 70 Z" class="v-water" />
    <path :d="loop" class="v-loop" />
    <circle cx="60" cy="112" r="5" class="v-start" />
    <g transform="translate(128 6)" class="v-crown">
      <path d="M2 22 L0 6 L10 14 L18 0 L26 14 L36 6 L34 22 Z" />
      <rect x="2" y="24" width="32" height="5" rx="1" />
    </g>
    <text x="150" y="78" text-anchor="middle" class="v-label park">Lake loop, 4.2 km</text>
    <text x="250" y="20" text-anchor="end" class="v-label small">Crown: 11 runs</text>
    <text x="250" y="34" text-anchor="end" class="v-label small you">You: 9 runs</text>
  </svg>
</template>
