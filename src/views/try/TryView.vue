<script setup>
// "Try it now": the start of the no-account demo. One tap runs the demo loop
// over the Sydney Harbour Bridge as a flyover (#/try/flyover), which leads to the full
// run report (#/try/report) and then the sign up. The tap also lets the phone
// play the flyover's music.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { demoRun } from '../../lib/recap/demo.js'
import { km } from '../../lib/format.js'
import { auth, login } from '../../lib/auth.js'
import { resume as wakeSound } from '../../lib/audio/sfx.js'
import BrandMark from '../../components/BrandMark.vue'

const router = useRouter()
const demo = demoRun()

// The loop's shape, drawn small on the start screen
const shape = computed(() => {
  const t = demo.track
  const lat0 = Math.min(...t.map((p) => p.lat)), lat1 = Math.max(...t.map((p) => p.lat))
  const lng0 = Math.min(...t.map((p) => p.lng)), lng1 = Math.max(...t.map((p) => p.lng))
  const kx = Math.cos((lat0 * Math.PI) / 180)
  const w = (lng1 - lng0) * kx, h = lat1 - lat0
  const s = 180 / Math.max(w, h)
  const ox = (200 - w * s) / 2, oy = (200 - h * s) / 2
  return 'M' + t.filter((_, i) => i % 3 === 0).map((p) => `${(ox + (p.lng - lng0) * kx * s).toFixed(1)},${(oy + (lat1 - p.lat) * s).toFixed(1)}`).join('L') + 'Z'
})

function start() {
  wakeSound()
  router.push({ name: 'try-flyover' })
}
function signUp() {
  if (auth.enabled) login({ signup: true, returnTo: '#/app' })
  else router.push('/app')
}
</script>

<template>
  <div class="try">
    <header class="top">
      <RouterLink class="brand" to="/"><BrandMark :size="26" /> Foothold</RouterLink>
      <button class="signup" type="button" @click="signUp">Sign up free</button>
    </header>

    <main class="body">
      <svg class="loop" viewBox="0 0 200 200" aria-hidden="true">
        <path :d="shape" class="trace" pathLength="100" />
        <circle cx="0" cy="0" r="5" class="runner">
          <animateMotion dur="6s" repeatCount="indefinite" :path="shape" />
        </circle>
      </svg>

      <h1>Run over the Harbour Bridge</h1>
      <p class="lede">
        No account and no running shoes. In about a minute you'll fly over a {{ km(demo.activity.distanceM, 1) }} km run from
        Circular Quay, across the bridge to Kirribilli and back round the Opera House. Watch the ground
        it takes turn your colour, then get the full run report.
      </p>
      <button class="btn go" type="button" @click="start">Start the demo run</button>
      <RouterLink class="skip" :to="{ name: 'try-report' }">Skip to the run report</RouterLink>
      <p class="note">Sound on is best. The flyover has its own music.</p>
    </main>
  </div>
</template>

<style scoped>
.try { min-height: 100dvh; background: #16302A; color: #fff; display: grid; grid-template-rows: auto 1fr; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 14px var(--pad, 16px); }
.brand { display: inline-flex; align-items: center; gap: 8px; color: #fff; text-decoration: none; font-weight: 800; font-stretch: 112%; }
.signup { background: none; border: 0; color: #fff; font: inherit; font-weight: 650; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; padding: 8px 0; }
.body { display: grid; align-content: center; justify-items: center; text-align: center; gap: 14px; padding: 8px var(--pad, 16px) calc(32px + env(safe-area-inset-bottom)); max-width: 30rem; margin: 0 auto; }
.loop { width: min(52vw, 210px); height: auto; margin-bottom: 6px; }
.trace { fill: rgba(46, 85, 230, 0.22); stroke: #6F8CF2; stroke-width: 3; stroke-linejoin: round; }
.runner { fill: #fff; stroke: #2E55E6; stroke-width: 3; }
h1 { font-size: clamp(1.9rem, 8vw, 2.6rem); font-weight: 850; font-stretch: 112%; line-height: 1.02; letter-spacing: -0.02em; margin: 0; text-wrap: balance; }
.lede { margin: 0; color: rgba(255, 255, 255, 0.82); font-size: 1.02rem; line-height: 1.45; max-width: 34ch; }
.go { margin-top: 8px; width: 100%; max-width: 22rem; font-size: 1.05rem; padding-block: 15px; }
.skip { color: #fff; font-weight: 650; text-underline-offset: 3px; padding: 6px; }
.note { margin: 0; font-size: 0.85rem; opacity: 0.6; }
.signup:focus-visible, .skip:focus-visible, .brand:focus-visible { outline: 3px solid #fff; outline-offset: 2px; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) { .runner { display: none; } }
</style>
