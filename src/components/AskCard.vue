<script setup>
// A mission question on the Record screen: a choice in the story, a quiz or
// a puzzle. Big buttons to tap while moving, a bar showing how long until
// the story answers for you, and a note while the microphone is listening.
import { listening } from '../lib/audio/listen.js'

const props = defineProps({ ask: { type: Object, required: true }, dark: { type: Boolean, default: false } })
const emit = defineEmits(['answer'])
const HEAD = { choice: 'Your call', quiz: 'Quick quiz', puzzle: 'Puzzle' }
</script>

<template>
  <div class="ask" :class="[props.ask.kind, { dark: props.dark }]" role="group" :aria-label="HEAD[props.ask.kind] || 'Question'">
    <div class="top">
      <span class="kind">{{ HEAD[props.ask.kind] || 'Question' }}</span>
      <span v-if="listening" class="mic" aria-live="polite"><span class="dot" aria-hidden="true"></span>Listening</span>
      <span class="left">{{ props.ask.remainingS }} s</span>
    </div>
    <p class="q">{{ props.ask.question }}</p>
    <div class="opts">
      <button v-for="o in props.ask.options" :key="o.key" type="button" class="opt" @click="emit('answer', o.key)">
        <span class="key" aria-hidden="true">{{ o.key }}</span><span>{{ o.label }}</span>
      </button>
    </div>
    <div class="bar" aria-hidden="true"><span :style="{ width: Math.round((props.ask.remainingS / props.ask.waitS) * 100) + '%' }"></span></div>
  </div>
</template>

<style scoped>
.ask { display: grid; gap: 8px; padding: 12px; border-radius: 14px; background: #16302A; color: #fff; }
.top { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 700; }
.kind { flex: 1; color: #B9E3D2; }
.mic { display: inline-flex; align-items: center; gap: 6px; color: #FFD9A0; }
.mic .dot { width: 9px; height: 9px; border-radius: 50%; background: #FF6B4A; animation: pulse 1s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.3; } }
.left { font-variant-numeric: tabular-nums; opacity: 0.8; }
.q { margin: 0; font-weight: 700; line-height: 1.3; }
.opts { display: grid; gap: 8px; }
.opt {
  display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 14px; border: 0; border-radius: 12px;
  background: #fff; color: #16302A; font: inherit; font-weight: 750; text-align: left; cursor: pointer;
}
.opt .key { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #16302A; color: #fff; font-size: 0.95rem; }
.opt:active { transform: scale(0.98); }
.bar { height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.2); overflow: hidden; }
.bar span { display: block; height: 100%; background: #fff; transition: width 0.9s linear; }
.ask.dark { background: #0d0d0d; }
.ask.dark .opt { background: #1f1f1f; color: #d0d0d0; }
.ask.dark .opt .key { background: #3a5ed8; }
@media (prefers-reduced-motion: reduce) { .mic .dot { animation: none; } .opt:active { transform: none; } }
</style>
