<script setup>
// First open in the app: a friendly card for each permission (location,
// microphone, and on Android the recording notice), then the phone's own
// prompt when they tap the button. "Not now" skips one. Shown once
// (lib/permissions.js decides and asks).
import { ref, computed } from 'vue'
import { permissionsFor, askPermission, markPermissionsExplained } from '../lib/permissions.js'

const emit = defineEmits(['done'])
const items = permissionsFor()
const step = ref(-1) // -1 is the welcome card, items.length is the last one
const busy = ref(false)
const current = computed(() => items[step.value])

// Move on when the phone answers (or gives up waiting). Not now always works,
// even while a prompt is pending, so nobody gets stuck on a card.
async function yes() {
  const at = step.value
  busy.value = true
  await askPermission(current.value.id)
  if (step.value === at) { busy.value = false; step.value++ }
}
function next() { busy.value = false; step.value++ }
function finish() {
  markPermissionsExplained()
  emit('done')
}
</script>

<template>
  <div class="perms" role="dialog" aria-modal="true" aria-labelledby="perms-title">
    <div class="card" :key="step">
      <template v-if="step === -1">
        <div class="icon" aria-hidden="true">👋</div>
        <h1 id="perms-title">Before you lace up</h1>
        <p>Your phone is about to ask a few questions. Here is what each one is for, so nothing comes out of left field.</p>
        <button class="go" @click="next">Righto</button>
      </template>
      <template v-else-if="current">
        <div class="icon" aria-hidden="true">{{ current.icon }}</div>
        <h1 id="perms-title">{{ current.title }}</h1>
        <p>{{ current.blurb }}</p>
        <p class="tip">{{ current.tip }}</p>
        <button class="go" :disabled="busy" @click="yes">{{ current.button }}</button>
        <p v-if="busy" class="waiting" role="status">Over to your phone…</p>
        <button class="later" @click="next">{{ busy ? 'Skip this one' : 'Not now' }}</button>
      </template>
      <template v-else>
        <div class="icon" aria-hidden="true">🏁</div>
        <h1 id="perms-title">You are all set</h1>
        <p>Changed your mind about anything? It is all in your phone’s Settings, under Foothold. Now go take some ground.</p>
        <button class="go" @click="finish">Let’s go</button>
      </template>
    </div>
    <div class="dots" aria-hidden="true">
      <span v-for="i in items.length + 2" :key="i" :class="{ on: i - 2 === step }" />
    </div>
  </div>
</template>

<style scoped>
.perms {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--ink);
  color: var(--on-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 24px);
  font-family: var(--font);
}
.card {
  width: 100%;
  max-width: 360px;
  text-align: center;
  animation: in 320ms cubic-bezier(.2, .8, .2, 1);
}
.icon {
  font-size: 56px;
  width: 104px;
  height: 104px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(46, 85, 230, 0.28);
  box-shadow: 0 0 0 8px rgba(46, 85, 230, 0.12);
}
h1 { font-size: 28px; line-height: 1.15; margin: 0 0 12px; font-weight: 800; }
p { font-size: 17px; line-height: 1.5; margin: 0 0 12px; color: var(--on-ink-muted); }
.tip { font-size: 15px; color: var(--on-ink); font-weight: 600; margin-bottom: 24px; }
.go {
  display: block;
  width: 100%;
  padding: 16px;
  border: 0;
  border-radius: 14px;
  background: var(--you);
  color: #fff;
  font: inherit;
  font-size: 18px;
  font-weight: 700;
}
.go:disabled { opacity: 0.6; }
.waiting { margin: 12px 0 0; font-size: 15px; }
.later {
  margin-top: 10px;
  padding: 12px;
  background: none;
  border: 0;
  color: var(--on-ink-muted);
  font: inherit;
  font-size: 16px;
}
.go:focus-visible, .later:focus-visible { outline: 3px solid var(--you-soft); outline-offset: 3px; }
.dots { display: flex; gap: 8px; }
.dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(243, 245, 239, 0.25); }
.dots span.on { background: var(--on-ink); }
@keyframes in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .card { animation: none; } }
</style>
