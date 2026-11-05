<script setup>
// The ask after a practice run: sign up free and the run comes across to the
// real map (src/lib/carryOver.js does the moving). Only on the practice map,
// and only when this build has sign-in.
import { isLocal } from '../lib/api/index.js'
import { auth, login } from '../lib/auth.js'

defineProps({
  dark: { type: Boolean, default: false },
  simulated: { type: Boolean, default: false }, // a made-up practice loop, which never moves across
})
const signUp = () => login({ signup: true, returnTo: '#/app' })
const signIn = () => login({ returnTo: '#/app' })
</script>

<template>
  <section v-if="isLocal && auth.enabled" class="ps" :class="{ dark }" aria-labelledby="ps-h">
    <template v-if="simulated">
      <h2 id="ps-h">Now do it for real</h2>
      <p>
        That was a made-up practice loop. Sign up free, head out for a real run, and your loop goes on the
        real map, where runners near you can see your ground and try to take it back.
      </p>
    </template>
    <template v-else>
      <h2 id="ps-h">Keep this run</h2>
      <p>
        This was a practice run, so it's only on this phone. Sign up free and it moves to the real map,
        where runners near you can see your ground and try to take it back.
      </p>
    </template>
    <button class="btn block" type="button" @click="signUp">Sign up free</button>
    <button class="linkish" type="button" @click="signIn">I already have an account</button>
  </section>
</template>

<style scoped>
.ps { display: grid; gap: 10px; padding: 18px; border-radius: var(--radius, 14px); background: #16302A; color: #fff; text-align: left; }
.ps h2 { margin: 0; font-size: 1.25rem; font-stretch: 112%; }
.ps p { margin: 0; color: rgba(255, 255, 255, 0.85); }
.linkish { background: none; border: 0; color: #fff; font: inherit; font-weight: 650; text-decoration: underline; text-underline-offset: 3px; justify-self: center; padding: 6px; cursor: pointer; }
.ps.dark { background: rgba(255, 255, 255, 0.1); }
</style>
