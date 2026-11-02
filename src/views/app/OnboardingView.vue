<script setup>
// First run: name, how you move, location, and a privacy zone around
// home. Four short steps, every one explained in plain words.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api/index.js'
import { store, locate, refresh } from '../../lib/store.js'
import BrandMark from '../../components/BrandMark.vue'
import { auth, login } from '../../lib/auth.js'
import { isLocal } from '../../lib/api/index.js'

const router = useRouter()
const step = ref(0)
const name = ref(store.user?.name || '')
const mode = ref(store.user?.mode || 'run')
const locating = ref(false)
const located = ref(false)
const zone = ref(true)

async function allowLocation() {
  locating.value = true
  const p = await locate()
  locating.value = false
  located.value = !!p
  step.value = 3
}

async function finish() {
  const zones = zone.value && store.located ? [{ lat: store.centre.lat, lng: store.centre.lng, radiusM: 400, label: 'Home' }] : []
  await api.updateMe({ name: name.value.trim() || 'Runner', mode: mode.value, zones, onboarded: true })
  store.mode = mode.value
  await refresh()
  router.replace('/app')
}
</script>

<template>
  <div class="onb">
    <div class="inner">
      <BrandMark :size="44" />

      <template v-if="step === 0">
        <h1>Take ground. Hold it.</h1>
        <p class="muted">
          Close a loop on a run, walk or ride and every street inside it is yours.
          Rivals can take it back, so keep moving.
        </p>
        <template v-if="auth.enabled && !auth.loggedIn">
          <button class="btn block" type="button" @click="login({ returnTo: '#/app' })">Sign in</button>
          <button class="btn secondary block" type="button" @click="login({ signup: true, returnTo: '#/app' })">Create an account</button>
          <p class="small muted">Already use FormTrack? Same account. Or <button class="linkish" type="button" @click="step = 1">try the practice map first</button>: it runs on this phone with made-up rivals, and nothing goes on the shared map.</p>
        </template>
        <button v-else class="btn block" type="button" @click="step = 1">Let's go</button>
        <p v-if="isLocal && !auth.enabled" class="small muted">This is the practice map. It runs on this phone with made-up rivals.</p>
      </template>

      <template v-else-if="step === 1">
        <h1>What should we call you?</h1>
        <div class="field">
          <label for="name">Name on the map</label>
          <input id="name" v-model="name" maxlength="30" autocomplete="given-name" placeholder="First name or a nickname" />
          <span class="hint">Other players see this on ground you hold.</span>
        </div>
        <fieldset class="field">
          <legend>How do you mostly move?</legend>
          <div class="seg" role="group">
            <button v-for="m in ['run', 'walk', 'ride']" :key="m" type="button" :aria-pressed="mode === m" @click="mode = m">{{ m === 'run' ? 'Run' : m === 'walk' ? 'Walk' : 'Ride' }}</button>
          </div>
          <span class="hint">Runs, walks and rides each have their own map, so walkers only compete with walkers. You can switch any time.</span>
        </fieldset>
        <button class="btn block" type="button" :disabled="!name.trim()" @click="step = 2">Next</button>
      </template>

      <template v-else-if="step === 2">
        <h1>Find your streets</h1>
        <p class="muted">
          We use your location to show the map around you and to record your loops.
          It's only used while Foothold is open.
        </p>
        <button class="btn block" type="button" :disabled="locating" @click="allowLocation">{{ locating ? 'Finding you' : 'Use my location' }}</button>
        <button class="btn secondary block" type="button" @click="step = 3">Not now</button>
      </template>

      <template v-else>
        <h1>Keep home private</h1>
        <p class="muted">
          A privacy zone hides ground near your home from everyone else, and trims the start
          and end of your routes. We suggest one around where you are now.
        </p>
        <label class="check">
          <input v-model="zone" type="checkbox" :disabled="!store.located" />
          <span>{{ store.located ? 'Add a 400 m privacy zone here' : 'Turn on location to add a zone here. You can add one later in Settings.' }}</span>
        </label>
        <p class="small muted">You can move it or add more (work, a friend's place) in Settings.</p>
        <button class="btn block" type="button" @click="finish">Open my map</button>
      </template>

      <ol class="dots" aria-label="Progress">
        <li v-for="i in 4" :key="i" :class="{ on: step === i - 1 }" :aria-current="step === i - 1 ? 'step' : undefined"><span class="sr">Step {{ i }}</span></li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.onb { min-height: 100dvh; display: grid; place-items: center; padding: 24px 18px; background: var(--paper); }
.inner { width: min(440px, 100%); display: grid; gap: 18px; }
fieldset { border: 0; padding: 0; margin: 0; }
legend { font-weight: 650; margin-bottom: 6px; }
.check { display: flex; gap: 12px; align-items: flex-start; font-weight: 600; }
.check input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--you); }
.dots { display: flex; gap: 8px; justify-content: center; list-style: none; padding: 0; margin: 8px 0 0; }
.dots li { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.dots li.on { background: var(--you); width: 22px; border-radius: 4px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.linkish { border: 0; background: none; padding: 0; font: inherit; color: var(--you); font-weight: 650; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
</style>
