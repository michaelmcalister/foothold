<script setup>
// A player's crest: their emblem in white on a hexagon of their colour.
import { computed } from 'vue'
import { crestById, crestFor } from '../lib/crests.js'

const props = defineProps({
  crest: { type: String, default: null },
  colour: { type: String, default: '#2E55E6' },
  size: { type: Number, default: 22 },
  id: { type: String, default: '' }, // player id, picks a default crest when none is set
})
const c = computed(() => crestById(crestFor(props.id, props.crest)))
</script>

<template>
  <svg class="crest" viewBox="0 0 24 24" :width="size" :height="size" aria-hidden="true" focusable="false">
    <polygon points="12,1 21.5,6.5 21.5,17.5 12,23 2.5,17.5 2.5,6.5" :fill="colour" />
    <g transform="translate(12 12) scale(0.6) translate(-12 -12)">
      <path v-if="c.stroke" :d="c.d" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
      <path v-else :d="c.d" fill="#fff" />
    </g>
  </svg>
</template>

<style scoped>
.crest { flex: none; display: inline-block; vertical-align: middle; }
</style>
