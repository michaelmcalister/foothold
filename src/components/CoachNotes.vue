<script setup>
// Coach's notes after an activity: a short list of rule-based notes from src/lib/coach/debrief.js.
defineProps({ notes: { type: Array, default: () => [] } })
</script>

<template>
  <section v-if="notes.length" class="coachnotes panel" aria-labelledby="coach-notes-title">
    <h2 id="coach-notes-title">Coach's notes</h2>
    <ul>
      <li v-for="(n, i) in notes" :key="i" :class="[n.kind, n.level]"><span class="hexdot" aria-hidden="true"></span><span>{{ n.text }}</span></li>
    </ul>
    <p class="hint">Simple checks on your data, not medical advice. If something hurts, see a GP or physio.</p>
  </section>
</template>

<style scoped>
.coachnotes { display: grid; gap: 10px; }
.coachnotes h2 { font-size: 1.1rem; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
li { display: grid; grid-template-columns: 14px 1fr; gap: 10px; align-items: start; line-height: 1.4; overflow-wrap: anywhere; }
.hexdot { background: var(--you); margin-top: 4px; }
li.next .hexdot { background: var(--good); }
li.load.caution .hexdot, li.load.high .hexdot { background: var(--warn); }
</style>
