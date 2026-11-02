<script setup>
// This week's quests as a short list: a hex that fills as you go, the goal,
// and how far along you are. A quest finished since you last looked gets a
// small celebration once.
import { ref, watch } from 'vue'
import { freshlyDone, markCelebrated } from '../lib/questSeen.js'

const props = defineProps({
  quests: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

const fresh = ref(new Set())
watch(() => props.quests, (qs) => {
  const ids = freshlyDone(qs)
  if (!ids.length) return
  fresh.value = new Set(ids)
  markCelebrated(ids)
  setTimeout(() => { fresh.value = new Set() }, 2600)
}, { immediate: true })

const tag = `q${Math.random().toString(36).slice(2, 8)}` // unique clip ids per list
const clipId = (q) => `${tag}-${q.kind}`
const HEX = '12,1.5 21.5,7 21.5,17 12,22.5 2.5,17 2.5,7'
const pct = (q) => (q.target ? Math.min(1, q.progress / q.target) : 0)
function status(q) {
  if (q.done) return 'Done'
  if (q.pending) return `${q.count} held so far. It counts on Sunday night.`
  return `${q.progress} of ${q.target}`
}
</script>

<template>
  <ul class="quests" :class="{ compact }">
    <li v-for="q in quests" :key="q.id" :class="{ done: q.done, pop: fresh.has(q.id) }">
      <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <clipPath :id="clipId(q)"><rect x="0" :y="24 - 24 * pct(q)" width="24" height="24" /></clipPath>
        </defs>
        <polygon :points="HEX" class="shell" />
        <polygon :points="HEX" class="fill" :clip-path="`url(#${clipId(q)})`" />
        <path v-if="q.done" d="M7.5 12.5l3 3 6-6.5" class="tick" />
      </svg>
      <div class="text">
        <strong>{{ q.title }}</strong>
        <span class="small muted">{{ fresh.has(q.id) ? 'Quest done. Nice one.' : status(q) }}</span>
        <span v-if="!compact && !q.done" class="small muted detail">{{ q.detail }}</span>
      </div>
      <span v-if="fresh.has(q.id)" class="burst" aria-hidden="true"><i v-for="k in 6" :key="k" :style="{ '--k': k }"></i></span>
    </li>
  </ul>
</template>

<style scoped>
.quests { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.quests.compact { gap: 10px; }
li { position: relative; display: grid; grid-template-columns: 30px 1fr; gap: 12px; align-items: start; }
.compact li { grid-template-columns: 24px 1fr; gap: 10px; }
.glyph { width: 30px; height: 30px; overflow: visible; }
.compact .glyph { width: 24px; height: 24px; }
.shell { fill: var(--soft, #E7EBE1); stroke: rgba(22, 48, 42, 0.18); stroke-width: 1; }
.fill { fill: #AFC0F7; transition: all 0.4s ease; }
.done .fill { fill: var(--you, #2E55E6); }
.tick { fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.text { display: grid; gap: 1px; min-width: 0; }
.text strong { font-weight: 750; line-height: 1.25; }
.compact .text strong { font-size: 0.95rem; }
.done .text strong { color: var(--you, #2E55E6); }
.detail { margin-top: 2px; }
.pop .glyph { animation: pop 0.7s cubic-bezier(0.2, 1.6, 0.4, 1) both; }
.burst { position: absolute; left: 15px; top: 15px; width: 0; height: 0; pointer-events: none; }
.compact .burst { left: 12px; top: 12px; }
.burst i {
  position: absolute; width: 7px; height: 6px; margin: -3px 0 0 -3.5px; background: var(--you, #2E55E6);
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  transform: rotate(calc(var(--k) * 60deg)) translateY(0); opacity: 0;
  animation: fly 0.9s ease-out 0.15s both;
}
@keyframes pop { 0% { transform: scale(0.6); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }
@keyframes fly {
  0% { opacity: 1; transform: rotate(calc(var(--k) * 60deg)) translateY(0); }
  100% { opacity: 0; transform: rotate(calc(var(--k) * 60deg)) translateY(-26px); }
}
@media (prefers-reduced-motion: reduce) {
  .pop .glyph, .burst i { animation: none; }
  .burst { display: none; }
}
</style>
