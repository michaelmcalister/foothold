<script setup>
// "Send to your crew": a bottom sheet that sends a saved route to people in
// your clubs and leagues, one Send button each, with an optional day and time.
// They get a copy, so later changes to your route don't change theirs.
import { ref, watch, onMounted } from 'vue'
import { api, isLocal } from '../lib/api/index.js'
import Crest from './Crest.vue'
import RouteWhen from './RouteWhen.vue'
import { km, MODE_LABEL } from '../lib/format.js'

const props = defineProps({ route: { type: Object, required: true } })
const emit = defineEmits(['close', 'sent'])

const crew = ref([])
const loading = ref(true)
const error = ref('')
const when = ref(props.route.plannedAt ?? null)
const sent = ref(new Set())
const sending = ref(null)

// A new time means a new copy to send, so everyone can be sent it again
watch(when, () => { sent.value = new Set() })

onMounted(async () => {
  try {
    crew.value = (await api.crew()).crew || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function send(person) {
  if (sending.value || sent.value.has(person.id)) return
  sending.value = person.id
  error.value = ''
  try {
    await api.shareRoute(props.route.id, { to: [person.id], plannedAt: when.value })
    sent.value = new Set([...sent.value, person.id])
    emit('sent', { to: [person.id], plannedAt: when.value })
  } catch (e) {
    error.value = e.message
  } finally {
    sending.value = null
  }
}
</script>

<template>
  <div class="srs-back" @click.self="emit('close')">
    <section class="srs" role="dialog" aria-modal="true" aria-labelledby="srs-h">
      <header class="top">
        <div class="ttl">
          <h2 id="srs-h">Send to your crew</h2>
          <p class="small muted">{{ route.name }}, {{ MODE_LABEL[route.mode] || 'Run' }}, {{ km(route.distanceM) }} km</p>
        </div>
        <button type="button" class="x" aria-label="Close" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
        </button>
      </header>

      <div class="body">
        <RouteWhen v-model="when" id-prefix="srs" label="Add a day and time (optional)" />

        <p v-if="error" class="notice bad" role="alert">{{ error }}</p>

        <p v-if="loading" class="muted">Finding your crew.</p>
        <div v-else-if="!crew.length" class="empty-crew">
          <p>Your crew is everyone in your club and your private leagues. Join a club or start a league, and you can send them routes to run together.</p>
          <p v-if="isLocal" class="small muted">On the practice map there's no crew yet. Sign up to send routes to friends.</p>
          <div class="links">
            <RouterLink class="btn quiet small" to="/app/clubs">Clubs</RouterLink>
            <RouterLink class="btn quiet small" to="/app/leagues">Leagues</RouterLink>
          </div>
        </div>
        <ul v-else class="people" aria-live="polite">
          <li v-for="p in crew" :key="p.id" class="person">
            <Crest :crest="p.crest" :colour="p.colour" :id="p.id" :size="30" />
            <span class="name">{{ p.name }}</span>
            <button v-if="sent.has(p.id)" type="button" class="btn quiet small" disabled>Sent</button>
            <button v-else type="button" class="btn small" :disabled="!!sending" :aria-label="`Send to ${p.name}`" @click="send(p)">{{ sending === p.id ? 'Sending' : 'Send' }}</button>
          </li>
        </ul>
        <p v-if="crew.length" class="small muted">They get a copy of the route{{ when != null ? ' and the time' : '' }}. Changes you make later stay on yours.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.srs-back { position: fixed; inset: 0; z-index: 30; background: rgba(22, 48, 42, 0.42); display: flex; align-items: flex-end; justify-content: center; }
.srs {
  width: 100%; max-width: 560px; max-height: 86dvh; background: var(--card); color: var(--ink);
  border-radius: 18px 18px 0 0; padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; gap: 12px; box-shadow: 0 -10px 30px -14px rgba(22, 48, 42, 0.55); box-sizing: border-box;
}
.srs > * { min-width: 0; }
.top { display: flex; align-items: flex-start; gap: 10px; }
.ttl { flex: 1; min-width: 0; display: grid; gap: 2px; }
.ttl h2, .ttl p { margin: 0; }
.ttl p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.x { flex: none; width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--soft); color: var(--ink); display: grid; place-items: center; cursor: pointer; }
.body { overflow-y: auto; overscroll-behavior: contain; display: grid; gap: 12px; align-content: start; min-height: 0; }
.body > * { min-width: 0; margin: 0; }
.empty-crew { display: grid; gap: 10px; }
.empty-crew p { margin: 0; }
.links { display: flex; gap: 8px; flex-wrap: wrap; }
.people { list-style: none; margin: 0; padding: 0; display: grid; }
.person { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line); min-height: 52px; }
.person:last-child { border-bottom: 0; }
.name { font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.person .btn { min-width: 84px; }
</style>
