<script setup>
// Twelve weeks of a build, using the plan rules: at most 10% more each week,
// an easier week every fourth week, then back to where you were.
const weeks = []
let level = 20
for (let i = 0; i < 12; i++) {
  const easy = (i + 1) % 4 === 0
  if (i > 0 && !easy && !weeks[i - 1].easy) level = Math.round(level * 1.1 * 10) / 10
  weeks.push({ km: easy ? Math.round(level * 0.75 * 10) / 10 : level, easy })
}
const max = Math.max(...weeks.map(w => w.km))
const BW = 20, GAP = 5, H = 96
</script>

<template>
  <svg class="lp-vg" viewBox="0 0 310 140" role="img"
       :aria-label="`Twelve weeks of training, from ${weeks[0].km} km to ${weeks[11].km} km a week, with an easier week every fourth week.`">
    <g transform="translate(6 10)">
      <g v-for="(w, i) in weeks" :key="i">
        <rect :x="i * (BW + GAP)" :y="H - (w.km / max) * H" :width="BW" :height="(w.km / max) * H" rx="3"
              :class="w.easy ? 'v-easy' : 'v-bar'" />
      </g>
      <text x="0" y="118" class="v-label small">{{ weeks[0].km }} km</text>
      <text :x="3 * (BW + GAP) + BW / 2" y="118" text-anchor="middle" class="v-label small">easier</text>
      <text :x="11 * (BW + GAP) + BW" y="118" text-anchor="end" class="v-label small">{{ weeks[11].km }} km a week</text>
    </g>
  </svg>
</template>
