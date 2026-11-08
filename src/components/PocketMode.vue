<script setup>
// Pocket mode during a recording. iPhone stops a web app's GPS the moment
// the phone is locked, so instead of locking: a black screen (black pixels
// use almost no power on most phone screens) that ignores taps in a pocket,
// while GPS, the voice coach, the story and the directions carry on. Hold
// the button for a second and a half to come back. The screen stays awake
// (the recorder holds a wake lock), so nothing stops. A mission question
// shows here too, so it can be answered without unlocking.
import { ref, onBeforeUnmount } from 'vue'
import { rec } from '../lib/recorder.js'
import { duration, km } from '../lib/format.js'

import AskCard from './AskCard.vue'

const props = defineProps({ nextTurn: { type: Object, default: null }, ask: { type: Object, default: null } })
const emit = defineEmits(['close', 'answer'])

const HOLD_MS = 1500
const holding = ref(false)
let timer = 0

function down(e) {
  e.preventDefault()
  holding.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { holding.value = false; emit('close') }, HOLD_MS)
}
function up() {
  holding.value = false
  clearTimeout(timer)
}
// A key press (a keyboard or switch control) unlocks too
function key(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); emit('close') } }
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="pocket" role="dialog" aria-modal="true" aria-label="Pocket mode. Hold the button to unlock." @pointerdown.self.prevent @touchmove.prevent @contextmenu.prevent>
    <div class="nums" aria-live="off">
      <span>{{ duration(rec.elapsedS) }}</span>
      <span>{{ km(rec.distanceM) }} km</span>
    </div>
    <p v-if="props.nextTurn" class="turn">{{ props.nextTurn.short }}<template v-if="props.nextTurn.inM != null">, {{ props.nextTurn.inM }} m</template></p>
    <p v-if="rec.status === 'paused'" class="turn">Paused</p>
    <AskCard v-if="props.ask" class="pask" :ask="props.ask" dark @answer="(k) => emit('answer', k)" />
    <button
      type="button" class="unlock" :class="{ holding }"
      @pointerdown="down" @pointerup="up" @pointercancel="up" @pointerleave="up" @keydown="key"
    >
      <span class="ring" aria-hidden="true"></span>
      <span class="lbl">{{ holding ? 'Keep holding' : 'Hold to unlock' }}</span>
    </button>
    <p class="tip">Recording carries on. Don't press the lock button, or iPhone stops the GPS.</p>
  </div>
</template>

<style scoped>
.pocket {
  position: fixed; inset: 0; z-index: 1000; background: #000; color: #5b5b5b;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  padding: 24px 16px calc(24px + env(safe-area-inset-bottom)); touch-action: none; user-select: none; -webkit-user-select: none;
}
.nums { display: flex; gap: 22px; font-size: 1.6rem; font-weight: 750; font-variant-numeric: tabular-nums; }
.turn { margin: 0; font-size: 1.05rem; font-weight: 700; color: #6e6e6e; text-align: center; }
.unlock {
  position: relative; margin-top: 30px; width: 132px; height: 132px; border-radius: 50%; border: 2px solid #2a2a2a;
  background: #000; color: #6e6e6e; font: inherit; font-weight: 700; cursor: pointer; touch-action: none;
}
.unlock .lbl { position: relative; z-index: 1; font-size: 0.9rem; }
.unlock .ring { position: absolute; inset: -2px; border-radius: 50%; border: 3px solid #3a5ed8; opacity: 0; transform: scale(0.6); }
.unlock.holding .ring { opacity: 1; transform: scale(1); transition: transform 1.5s linear, opacity 0.2s; }
.unlock:focus-visible { outline: 2px solid #3a5ed8; outline-offset: 4px; }
.pask { width: 100%; max-width: 420px; }
.tip { margin: 0; max-width: 300px; text-align: center; font-size: 0.85rem; color: #4a4a4a; }
@media (prefers-reduced-motion: reduce) { .unlock.holding .ring { transition: opacity 0.2s; } }
</style>
