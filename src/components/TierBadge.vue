<script setup>
// A division tier's badge: a hexagon in the tier's colour with one bar for each step up the six tiers.
import { computed } from 'vue'
import { tierOut } from '../lib/engine/divisions.js'

const COLOURS = ['#7E948B', '#1A9E8F', '#2E7D4F', '#2E55E6', '#8A5CD8', '#C98A0C']
const props = defineProps({
  tier: { type: Number, default: 0 },
  size: { type: Number, default: 28 },
  dim: { type: Boolean, default: false },
})
const t = computed(() => tierOut(props.tier))
const bars = computed(() => Array.from({ length: t.value.index + 1 }, (_, i) => 12 + (i - t.value.index / 2) * 2.6))
</script>

<template>
  <svg class="tier" viewBox="0 0 24 24" :width="size" :height="size" role="img" :aria-label="`${t.name} tier`">
    <polygon points="12,1 21.5,6.5 21.5,17.5 12,23 2.5,17.5 2.5,6.5" :fill="dim ? '#E7EBE1' : COLOURS[t.index]" />
    <rect v-for="(x, i) in bars" :key="i" :x="x - 0.8" y="8" width="1.6" height="8" rx="0.8" :fill="dim ? '#B9C2B4' : '#fff'" />
  </svg>
</template>

<style scoped>
.tier { flex: none; display: inline-block; vertical-align: middle; }
</style>
