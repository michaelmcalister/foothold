<script setup>
// The first week journey card: three steps as hexes that fill in, the step
// under way with what to do next, and a short celebration (with a sound) the
// first time this device sees a step done. Used on the Map sheet and on You.
import { ref, watch, computed } from 'vue'
import { store } from '../lib/store.js'
import { freshSteps, markCheered, cheerSound } from '../lib/journey.js'
import { play } from '../lib/audio/sfx.js'

const props = defineProps({
  journey: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  finding: { type: Boolean, default: false },
})
const emit = defineEmits(['see-loop'])

const cheer = ref(null)
watch(() => props.journey, (j) => {
  const fresh = freshSteps(j)
  if (!fresh.length) return
  markCheered(fresh)
  const last = fresh[fresh.length - 1]
  cheer.value = last.n
  setTimeout(() => play(cheerSound(fresh), { wait: false }), 150)
  setTimeout(() => { if (cheer.value === last.n) cheer.value = null }, 4200)
}, { immediate: true })

const HEX = '12,1.5 21.5,7 21.5,17 12,22.5 2.5,17 2.5,7'
const cur = computed(() => props.journey.current)
const cheerLine = computed(() => props.journey.steps.find((s) => s.n === cheer.value)?.cheer || null)
const verb = computed(() => ({ run: 'run', walk: 'walk', ride: 'ride' })[store.mode] || 'run')
</script>

<template>
  <section class="fw" :class="{ compact }" aria-labelledby="fw-title">
    <div class="top">
      <h2 id="fw-title"><span class="kicker">Your first week</span> {{ journey.complete ? 'All three done' : `Step ${cur.n} of 3` }}</h2>
      <ol class="hexes" aria-label="Progress">
        <li v-for="s in journey.steps" :key="s.id" :class="[s.state, { pop: cheer === s.n }]">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polygon :points="HEX" class="shell" />
            <path v-if="s.done" d="M7.5 12.5l3 3 6-6.5" class="tick" />
            <text v-else x="12" y="16" text-anchor="middle">{{ s.n }}</text>
          </svg>
          <span class="sr">Step {{ s.n }}, {{ s.title }}: {{ s.done ? 'done' : s.state === 'current' ? 'under way' : 'to come' }}</span>
        </li>
      </ol>
    </div>

    <p v-if="cheerLine" class="cheer" role="status">{{ cheerLine }}</p>

    <template v-if="cur">
      <div class="step">
        <strong>{{ cur.title }}</strong>
        <p class="small muted">{{ cur.body }}<template v-if="cur.n === 1 && !cur.stretched"> About {{ journey.loopKm }} km is plenty.</template></p>
      </div>
      <div v-if="cur.n === 1" class="actions">
        <RouterLink class="btn" :to="{ name: 'record' }">Start</RouterLink>
        <button class="btn quiet" type="button" :disabled="finding" @click="emit('see-loop')">{{ finding ? 'Finding a loop' : 'See the loop on the map' }}</button>
      </div>
      <div v-else-if="!compact" class="actions one">
        <RouterLink class="btn" :to="{ name: 'record' }">Start a {{ verb }}</RouterLink>
      </div>
    </template>

    <ul v-if="!compact" class="list">
      <li v-for="s in journey.steps" :key="s.id" :class="s.state">
        <strong>{{ s.n }}. {{ s.title }}</strong>
        <span class="small muted">{{ s.done ? s.body : s.state === 'current' ? 'Under way' : 'Next up' }}</span>
      </li>
    </ul>
    <p v-if="!compact && !journey.complete" class="small muted">Finish all three for the Founding foothold badge. It stays on your profile for good.</p>
  </section>
</template>

<style scoped>
.fw { display: grid; gap: 10px; min-width: 0; }
.fw:not(.compact) { background: var(--card); border-radius: var(--radius, 14px); padding: 16px; box-shadow: inset 0 0 0 1px var(--line); }
.top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
h2 { margin: 0; font-size: 1.05rem; font-weight: 800; display: grid; gap: 0; }
.kicker { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--you-ink); }
.hexes { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; flex: none; }
.hexes svg { width: 28px; height: 28px; display: block; }
.shell { fill: var(--soft, #E7EBE1); stroke: var(--ink-15); stroke-width: 1; }
.current .shell { fill: var(--card); stroke: var(--you, #2E55E6); stroke-width: 1.6; }
.done .shell { fill: var(--you, #2E55E6); stroke: none; }
.tick { fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
text { font: 700 10px Archivo, system-ui, sans-serif; fill: var(--ink, #16302A); }
.upcoming text { fill: var(--ink-60, rgba(22, 48, 42, 0.6)); }
.pop svg { animation: pop 0.7s cubic-bezier(0.2, 1.6, 0.4, 1) both; }
.cheer { margin: 0; padding: 8px 12px; border-radius: 10px; background: var(--tint); color: var(--ink, #16302A); font-weight: 700; }
.step { display: grid; gap: 2px; }
.step p { margin: 0; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.actions.one { grid-template-columns: 1fr; }
.actions .btn { padding-left: 12px; padding-right: 12px; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; border-top: 1px solid var(--line); padding-top: 10px; }
.list li { display: grid; gap: 1px; }
.list li.done strong { color: var(--you-ink); }
.list li.upcoming strong { color: var(--ink-60); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@keyframes pop { 0% { transform: scale(0.6); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .pop svg { animation: none; } }
</style>
