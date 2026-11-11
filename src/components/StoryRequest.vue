<script setup>
// "Know a local story?": suggest a place, and the story behind it, for a
// future mission (shown in the mission browser). Sends to /api/story-requests
// (kept with feedback). Your rough location goes too only if you tick the box,
// rounded to about a kilometre. On the practice map it asks you to sign in.
import { ref, computed } from 'vue'
import { api } from '../lib/api/index.js'

const props = defineProps({ here: { type: Object, default: null } })
const emit = defineEmits(['close'])

const place = ref('')
const story = ref('')
const addNear = ref(false)
const state = ref('idle') // idle, sending, sent
const problem = ref('')
const ready = computed(() => place.value.trim().length > 1 && state.value !== 'sending')

async function send() {
  if (!ready.value) return
  state.value = 'sending'
  problem.value = ''
  try {
    await api.storyRequest({ place: place.value, story: story.value, near: addNear.value && props.here ? props.here : null })
    state.value = 'sent'
  } catch (e) {
    state.value = 'idle'
    problem.value = e?.message || 'That didn’t send. Try again in a moment.'
  }
}
</script>

<template>
  <div class="sreq" role="dialog" aria-modal="true" aria-labelledby="sreq-title" @click.self="emit('close')">
    <form class="sheet" @submit.prevent="send">
      <template v-if="state !== 'sent'">
        <h3 id="sreq-title">Know a local story?</h3>
        <p class="lead">Tell us a place near you, and what happened there. A legend, a disaster, a mystery, a famous local. We’ll dig into the history and maybe turn it into a mission.</p>
        <label class="field">
          <span>The place</span>
          <input v-model="place" type="text" maxlength="120" placeholder="e.g. The old quarry at Castlereagh" autocomplete="off" required>
        </label>
        <label class="field">
          <span>The story (optional)</span>
          <textarea v-model="story" rows="4" maxlength="1000" placeholder="What happened there? Even a rumour helps." />
        </label>
        <label v-if="here" class="tick">
          <input v-model="addNear" type="checkbox">
          <span>Add roughly where I am, to about a kilometre</span>
        </label>
        <p v-if="problem" class="problem" role="alert">{{ problem }}</p>
        <div class="acts">
          <button type="submit" class="go" :disabled="!ready">{{ state === 'sending' ? 'Sending…' : 'Send my story idea' }}</button>
          <button type="button" class="later" @click="emit('close')">Cancel</button>
        </div>
      </template>
      <template v-else>
        <h3 id="sreq-title">Story idea sent</h3>
        <p class="lead">Thank you. We read every one. If yours becomes a mission, you’ll find it in Stories near you.</p>
        <div class="acts"><button type="button" class="go" @click="emit('close')">Done</button></div>
      </template>
    </form>
  </div>
</template>

<style scoped>
.sreq { position: fixed; inset: 0; z-index: 95; display: flex; align-items: flex-end; justify-content: center; background: rgba(0, 0, 0, 0.55); }
.sheet {
  width: 100%; max-width: 520px; display: grid; gap: 12px; padding: 20px 18px calc(env(safe-area-inset-bottom) + 18px);
  border-radius: 20px 20px 0 0; background: #F4F6FA; color: #10131C; font: inherit;
}
h3 { margin: 0; font-size: 1.35rem; font-weight: 850; }
.lead { margin: 0; font-size: 0.95rem; line-height: 1.45; color: #3B4252; }
.field { display: grid; gap: 4px; font-weight: 700; font-size: 0.88rem; }
.field input, .field textarea {
  font: inherit; font-weight: 500; font-size: 1rem; padding: 11px 12px; border-radius: 10px; border: 1.5px solid rgba(16, 19, 28, 0.25); background: #fff; color: inherit; resize: vertical;
}
.field input:focus-visible, .field textarea:focus-visible { outline: 3px solid #2E55E6; outline-offset: 1px; }
.tick { display: flex; gap: 10px; align-items: center; font-size: 0.9rem; }
.tick input { width: 20px; height: 20px; }
.problem { margin: 0; padding: 8px 10px; border-radius: 8px; background: #FBE5E3; color: #6B140F; font-size: 0.9rem; }
.acts { display: grid; gap: 6px; }
.go { min-height: 50px; border: 0; border-radius: 12px; background: #2E55E6; color: #fff; font: inherit; font-weight: 800; font-size: 1.02rem; }
.go:disabled { opacity: 0.5; }
.later { padding: 10px; border: 0; background: none; color: #3B4252; font: inherit; font-weight: 650; }
.go:focus-visible, .later:focus-visible { outline: 3px solid #2E55E6; outline-offset: 2px; }
</style>
