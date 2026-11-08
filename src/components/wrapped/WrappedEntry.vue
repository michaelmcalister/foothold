<script setup>
// The way into Foothold Wrapped from the You screen: "Your 2026 in Foothold".
// In December it shows once as a bigger "Your 2026 Wrapped is ready" card,
// until you open it or tap Not now; after that it is the plain link.
import { ref, computed } from 'vue'
import { wrappedFor } from '../../lib/wrapped.js'
import { wrappedSeen, markWrappedSeen } from '../../lib/wrappedData.js'

const w = wrappedFor()
const seen = ref(wrappedSeen(w.year))
const ready = computed(() => w.full && !seen.value)
function later() {
  markWrappedSeen(w.year)
  seen.value = true
}
</script>

<template>
  <div v-if="ready" class="ready" role="region" aria-labelledby="wrapped-ready">
    <span class="hex" aria-hidden="true"></span>
    <div class="words">
      <h2 id="wrapped-ready">Your {{ w.year }} Wrapped is ready</h2>
      <p class="small">Your year of ground, loops and rivals, in a few taps.</p>
    </div>
    <div class="acts">
      <RouterLink class="btn small" :to="{ name: 'wrapped' }">Take a look</RouterLink>
      <button class="btn quiet small" type="button" @click="later">Not now</button>
    </div>
  </div>
  <RouterLink v-else class="entry" :to="{ name: 'wrapped' }">
    <span class="hex" aria-hidden="true"></span>
    <span class="words">
      <strong>{{ w.entry }}</strong>
      <span class="small muted">{{ w.full ? 'Your year in review' : 'Your year so far, in a few taps' }}</span>
    </span>
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
  </RouterLink>
</template>

<style scoped>
.hex { width: 30px; height: 34px; background: var(--you); clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); flex: none; }
.entry { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; text-decoration: none; color: inherit; background: var(--card); border-radius: var(--radius); padding: 12px 14px; box-shadow: inset 0 0 0 1px var(--line); }
.entry .words { display: grid; gap: 2px; }
.ready { display: grid; grid-template-columns: auto 1fr; gap: 10px 12px; align-items: center; padding: 16px; border-radius: var(--radius); background: #16302A; color: #F3F5EF; }
.ready h2, .ready p { margin: 0; }
.ready h2 { font-size: 1.15rem; }
.ready p { opacity: 0.85; }
.ready .words { display: grid; gap: 4px; }
.ready .acts { grid-column: 1 / -1; display: flex; gap: 8px; }
.ready .btn.quiet { color: #fff; background: rgba(255, 255, 255, 0.12); box-shadow: none; }
</style>
