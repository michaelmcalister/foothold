<script setup>
// The app frame: top bar (mode switch and notifications), the current
// screen, and the tab bar with the record button in the middle. Signed-out
// visitors play the practice map; #/app?signin=1 opens Auth0 sign-in.
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import './app.css'
import { store, boot, setMode, toast } from '../lib/store.js'
import BrandMark from '../components/BrandMark.vue'
import { auth, login } from '../lib/auth.js'
import { api } from '../lib/api/index.js'
import { freshPromotion, markPromotionSeen } from '../lib/divisionSeen.js'
import { play } from '../lib/audio/sfx.js'
import { audio } from '../lib/audio/settings.js'
import CarryOver from '../components/CarryOver.vue'
import { rec } from '../lib/recorder.js'

const route = useRoute()
const router = useRouter()
const full = computed(() => !!route.meta.full)

// Screens anyone can open before setting up: onboarding itself, the demo recap and the "try it now" demo
const openWithoutSetup = (r) => r.name === 'onboarding' || (r.name === 'recap' && r.params.id === 'demo') || String(r.name || '').startsWith('try')

// A link with ?signin=1 (from the landing page, say) goes straight to sign-in
watch(() => route.query.signin, (v) => {
  if (v === '1' && auth.enabled && !auth.loggedIn) login({ signup: route.query.signup === '1', returnTo: '#/app' })
}, { immediate: true })

onMounted(async () => {
  if (auth.error) toast(auth.error, 7000)
  await boot()
  if (!store.user.onboarded && !openWithoutSetup(route)) router.replace({ name: 'onboarding' })
  // Moved up a division last week: say so once, with its sound, the next time the app opens
  if (store.user.onboarded) {
    const d = await api.division().catch(() => null)
    if (freshPromotion(d?.promotion)) {
      markPromotionSeen(d.promotion)
      toast(`You moved up to ${d.promotion.tier.name}.`)
      play('promote', { wait: false })
    }
  }
})
watch(() => route.name, () => {
  if (store.ready && !store.user?.onboarded && !openWithoutSetup(route)) router.replace({ name: 'onboarding' })
})

const tabs = [
  { name: 'map', label: 'Map', icon: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15' },
  { name: 'battles', label: 'Battles', icon: 'M5 19 19 5 M15 5h4v4 M5 5l5 5 M14 14l5 5 M5 15v4h4' },
  { name: 'record', label: 'Record' },
  { name: 'coach', label: 'Coach', icon: 'M4 18l5-6 4 3 7-9 M15 6h5v5' },
  { name: 'you', label: 'You', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6' },
]

// The speaker button: mutes everything Foothold plays (effects, music, voices).
// Turning sound back on gives a little blip so you know it worked.
function toggleMute() {
  audio.muted = !audio.muted
  if (!audio.muted) play('select', { wait: false })
}

// Run, Walk or Ride, with a soft click pitched for each
function switchMode(m) {
  if (store.mode !== m) play('mode', { mode: m, wait: false })
  setMode(m)
}
</script>

<template>
  <div class="app">
    <header v-if="!full" class="top">
      <RouterLink to="/app" class="brand" aria-label="Foothold map">
        <BrandMark :size="26" />
      </RouterLink>
      <div class="seg" role="group" aria-label="Which map">
        <button v-for="m in ['run', 'walk', 'ride']" :key="m" type="button" :aria-pressed="store.mode === m" @click="switchMode(m)">
          {{ m === 'run' ? 'Run' : m === 'walk' ? 'Walk' : 'Ride' }}
        </button>
      </div>
      <div class="tr">
      <button type="button" class="bell spk" :aria-pressed="audio.muted" :aria-label="audio.muted ? 'Sound is off. Turn it on' : 'Sound is on. Mute it'" :title="audio.muted ? 'Turn sound on' : 'Mute'" @click="toggleMute">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          <path v-if="audio.muted" d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path v-else d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <RouterLink to="/app/notifications" class="bell" :aria-label="store.unread ? `${store.unread} unread notifications` : 'Notifications'">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
        <span v-if="store.unread" class="badge">{{ store.unread > 9 ? '9+' : store.unread }}</span>
      </RouterLink>
      </div>
    </header>

    <main class="body" :class="{ full }">
      <RouterLink v-if="rec.status !== 'idle' && route.name !== 'record'" class="recbar" :to="{ name: 'record' }">
        <span class="dot" aria-hidden="true"></span> Recording your {{ rec.mode }}. Back to it
      </RouterLink>
      <CarryOver v-if="auth.loggedIn && store.ready && store.user.onboarded && !full && route.name === 'map'" />
      <RouterView v-if="store.ready" v-slot="{ Component }">
        <component :is="Component" />
      </RouterView>
      <div v-else class="loading" aria-live="polite">Loading your map</div>
    </main>

    <nav v-if="!full" class="tabs" aria-label="Main">
      <template v-for="t in tabs" :key="t.name">
        <RouterLink v-if="t.name === 'record'" :to="{ name: 'record' }" class="rec-btn" aria-label="Record a run, walk or ride">
          <svg viewBox="0 0 120 120" width="62" height="62" aria-hidden="true">
            <polygon points="112,60 86,105.03 34,105.03 8,60 34,14.97 86,14.97" fill="#2E55E6" stroke="#2E55E6" stroke-width="6" stroke-linejoin="round" />
            <circle cx="60" cy="60" r="16" fill="#F3F5EF" />
          </svg>
        </RouterLink>
        <RouterLink v-else :to="{ name: t.name }" class="tab" :class="{ on: route.name === t.name }">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path :d="t.icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <span>{{ t.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div v-if="store.toast" class="toast" role="status">{{ store.toast }}</div>
  </div>
</template>

<style scoped>
.top {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  /* the bar's own height sits below the iPhone's clock and camera */
  height: calc(var(--top-h) + env(safe-area-inset-top)); padding: 0 var(--pad);
  padding-top: env(safe-area-inset-top);
  background: var(--paper-glass);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.brand { display: inline-flex; }
.tr { display: flex; align-items: center; gap: 0; }
.spk { border: 0; background: none; cursor: pointer; }
.spk[aria-pressed="true"] { color: var(--ink-60); }
.bell { position: relative; display: inline-flex; padding: 8px; color: var(--ink); border-radius: 10px; }
.badge {
  position: absolute; top: 2px; right: 0; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--you); color: #fff; font-size: 11px; font-weight: 800;
  display: grid; place-items: center;
}
.body { min-height: calc(100dvh - var(--top-h) - env(safe-area-inset-top)); }
.body.full { min-height: 100dvh; }
.loading { padding: 40px; text-align: center; color: var(--ink-60); }

.tabs {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  height: calc(var(--bar-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: grid; grid-template-columns: repeat(5, 1fr); align-items: center;
  background: var(--card); border-top: 1px solid var(--line);
}
.tab {
  display: grid; justify-items: center; gap: 2px; padding: 6px 0;
  color: var(--ink-60); text-decoration: none; font-size: 0.72rem; font-weight: 650;
}
.tab.on { color: var(--you-ink); }
.rec-btn { justify-self: center; margin-top: -26px; filter: drop-shadow(0 6px 10px rgba(46, 85, 230, 0.35)); border-radius: 50%; }
.toast {
  position: fixed; left: 50%; bottom: calc(var(--bar-h) + 18px + env(safe-area-inset-bottom)); transform: translateX(-50%);
  z-index: 50; background: var(--ink); color: var(--on-ink); padding: 12px 18px; border-radius: 12px;
  font-weight: 600; max-width: calc(100% - 32px); box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.5);
}
.recbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #C8341F; color: #fff; font-weight: 700; text-decoration: none; }
.recbar .dot { width: 10px; height: 10px; border-radius: 50%; background: #fff; animation: recblink 1.2s ease-in-out infinite; }
@keyframes recblink { 50% { opacity: 0.3; } }
@media (prefers-reduced-motion: reduce) { .recbar .dot { animation: none; } }
</style>
