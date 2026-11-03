<script setup>
// The run report, drawn small: an elevation profile with the readout line,
// a pace line underneath and a few splits with the climb in each.
const elev = [12, 14, 13, 18, 26, 38, 49, 52, 47, 40, 44, 51, 46, 33, 22, 18, 24, 31, 27, 17, 10, 6, 5, 8, 12]
const pace = [345, 352, 400, 392, 330, 326, 333, 344, 350, 341, 338, 322, 318, 325, 330, 336, 340, 333, 329, 326, 330, 318, 312, 308, 310]
const W = 300
const x = (i) => 30 + (i / (elev.length - 1)) * (W - 40)
const ye = (v) => 92 - (v / 60) * 66
const yp = (v) => 168 - ((410 - v) / 110) * 44
const elevLine = elev.map((v, i) => `${x(i).toFixed(1)},${ye(v).toFixed(1)}`).join(' ')
const elevArea = `M${x(0)},92 L${elevLine.replace(/ /g, ' L')} L${x(elev.length - 1)},92 Z`
const paceLine = pace.map((v, i) => `${x(i).toFixed(1)},${yp(v).toFixed(1)}`).join(' ')
const splits = [
  { km: 1, pace: '5:45', w: 150, climb: '+3 m' },
  { km: 2, pace: '6:20', w: 136, climb: '+38 m' },
  { km: 3, pace: '5:28', w: 158, climb: '−4 m' },
]
</script>

<template>
  <svg class="lp-vg" viewBox="0 0 300 290" role="img"
       aria-label="A run report: an elevation chart rising over the bridge, a pace line below it, and three splits with the metres climbed in each.">
    <text x="30" y="16" class="v-label">Elevation</text>
    <line x1="30" x2="290" y1="92" y2="92" class="v-axis" />
    <line x1="30" x2="290" y1="59" y2="59" class="v-tick" />
    <path :d="elevArea" class="v-elev" />
    <polyline :points="elevLine" class="v-curve thin" />
    <line :x1="x(7)" :x2="x(7)" y1="22" y2="92" class="v-tick strong" />
    <circle :cx="x(7)" :cy="ye(52)" r="4.5" class="v-start" />
    <text :x="x(7) + 8" y="30" class="v-label you">52 m, on the bridge</text>

    <text x="30" y="116" class="v-label">Pace</text>
    <line x1="30" x2="290" y1="168" y2="168" class="v-axis" />
    <polyline :points="paceLine" class="v-curve thin" />
    <line :x1="x(7)" :x2="x(7)" y1="122" y2="168" class="v-tick strong" />

    <text x="30" y="198" class="v-label">Splits</text>
    <g v-for="(s, i) in splits" :key="s.km" :transform="`translate(0 ${212 + i * 26})`">
      <text x="30" y="12" class="v-label">{{ s.km }}</text>
      <text x="48" y="12" class="v-label strong">{{ s.pace }}</text>
      <rect x="86" y="3" :width="s.w" height="10" rx="5" :class="i === 2 ? 'v-bar' : 'v-splitbar'" />
      <text x="290" y="12" text-anchor="end" class="v-label">{{ s.climb }}</text>
    </g>
  </svg>
</template>
