<script setup>
// The Foothold mark: a claimed hex with an F drawn like a run line.
defineProps({ size: { type: [Number, String], default: 30 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 120 120" aria-hidden="true" class="brandmark">
    <polygon points="112,60 86,105.03 34,105.03 8,60 34,14.97 86,14.97" fill="#2E55E6" stroke="#2E55E6" stroke-width="6" stroke-linejoin="round" />
    <path d="M47 84V37h31M47 60h24" fill="none" stroke="#F3F5EF" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
