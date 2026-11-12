<script setup>
// Settings: name, colour and crest, day or night look, privacy zones,
// FormTrack, feedback, and your data (export, start again).
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, isLocal } from '../../lib/api/index.js'
import { store, refresh, toast, locate } from '../../lib/store.js'
import MusicVoiceSettings from '../../components/MusicVoiceSettings.vue'
import PushSettings from '../../components/PushSettings.vue'
import PlusSettings from '../../components/PlusSettings.vue'
import Crest from '../../components/Crest.vue'
import { CRESTS, crestFor } from '../../lib/crests.js'
import { auth, login, logout, serverConfig } from '../../lib/auth.js'
import { analyticsOn, setAnalytics } from '../../lib/analytics.js'
import { recordReadiness, clearReadiness } from '../../lib/readiness.js'
import { theme, setTheme } from '../../lib/theme.js'

const usageOn = ref(analyticsOn())
const router = useRouter()
const name = ref(store.user.name)
const colour = ref(store.user.colour)
const crest = ref(crestFor(store.user.id, store.user.crest))
const zones = ref([...(store.user.zones || [])])
const ftToken = ref('')
const ftBusy = ref(false)
const ftError = ref(null)
const ftSummary = ref(null)
// Accept the whole link FormTrack gives you, or just the token in it
const ftTokenValue = computed(() => ftToken.value.match(/ftk_[A-Za-z0-9_-]{8,}/)?.[0] || null)
const fbKind = ref('idea')
const fbText = ref('')

const LOOKS = [
  { id: 'auto', label: 'Auto' },
  { id: 'day', label: 'Day' },
  { id: 'night', label: 'Night' },
]

const COLOURS = ['#2E55E6', '#1A9E8F', '#8A5CD8', '#D6418E', '#E5604D', '#16302A']

onMounted(async () => {
  if (store.user.formtrack?.linked) { ftSummary.value = await api.formtrackSummary(); recordReadiness(ftSummary.value) }
})

async function saveProfile() {
  await api.updateMe({ name: name.value, colour: colour.value, crest: crest.value })
  await refresh()
  toast('Saved.')
}

async function addZoneHere() {
  const p = await locate()
  if (!p) return toast('Turn on location to add a zone where you are.')
  zones.value.push({ lat: p.lat, lng: p.lng, radiusM: 400, label: zones.value.length ? 'Zone ' + (zones.value.length + 1) : 'Home' })
  await saveZones()
}
async function saveZones() {
  await api.updateMe({ zones: zones.value })
  await refresh()
  toast('Privacy zones saved.')
}
async function removeZone(i) {
  zones.value.splice(i, 1)
  await saveZones()
}

async function linkFt() {
  ftBusy.value = true
  ftError.value = null
  try {
    const r = await api.linkFormtrack(ftTokenValue.value)
    ftSummary.value = r.summary
    recordReadiness(r.summary)
    ftToken.value = ''
    await refresh()
    toast('FormTrack linked.')
  } catch (e) {
    ftError.value = e.message
  } finally {
    ftBusy.value = false
  }
}
async function unlinkFt() {
  await api.unlinkFormtrack()
  ftSummary.value = null
  clearReadiness()
  await refresh()
}

async function sendFeedback() {
  await api.feedback({ kind: fbKind.value, text: fbText.value })
  fbText.value = ''
  toast('Thanks. It goes straight to the build list.')
}

async function exportData() {
  const data = await api.exportData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'foothold-data.json'
  a.click()
}

async function deleteAccount() {
  if (!confirm('Delete your Foothold account? Your runs, plans, comments and leagues are removed for good, and your ground goes wild. This can’t be undone.')) return
  try {
    await api.deleteAccount()
  } catch (e) {
    toast(e.message)
    return
  }
  try { localStorage.clear(); sessionStorage.clear() } catch { /* private mode */ }
  if (auth.enabled) await logout()
  location.hash = '#/'
  location.reload()
}

async function startAgain() {
  if (!confirm('Clear everything on this device and start again? Your runs and ground will be removed.')) return
  await api.reset()
  location.hash = '#/app/welcome'
  location.reload()
}
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <button class="back" type="button" @click="router.back()">Back</button>
      <h1>Settings</h1>
    </header>

    <section v-if="auth.enabled" class="panel stack" aria-labelledby="s-account">
      <h2 id="s-account">Your account</h2>
      <template v-if="auth.loggedIn">
        <p class="small">Signed in<template v-if="auth.user?.email"> as <strong>{{ auth.user.email }}</strong></template>. Your runs are on the shared map.</p>
        <button class="btn quiet" type="button" @click="logout()">Sign out</button>
      </template>
      <template v-else>
        <p class="small muted">You're on the practice map: it runs on this phone with made-up rivals. Sign in to put your runs on the shared map with real people. Your practice runs stay here and don't move across.</p>
        <div class="row">
          <button class="btn" type="button" @click="login({ returnTo: '#/app' })">Sign in</button>
          <button class="btn secondary" type="button" @click="login({ signup: true, returnTo: '#/app' })">Create an account</button>
        </div>
        <p class="hint">Already use FormTrack? Use the same account.</p>
      </template>
    </section>

    <section class="panel stack" aria-labelledby="s-you">
      <h2 id="s-you">You</h2>
      <div class="field">
        <label for="s-name">Name on the map</label>
        <input id="s-name" v-model="name" maxlength="30" />
      </div>
      <fieldset class="field">
        <legend>Your colour for other players</legend>
        <div class="swatches">
          <button v-for="c in COLOURS" :key="c" type="button" class="sw" :style="{ background: c }" :aria-pressed="colour === c" :aria-label="`Colour ${c}`" @click="colour = c"></button>
        </div>
        <span class="hint">On your own screen your ground is always blue.</span>
      </fieldset>
      <fieldset class="field">
        <legend>Your crest</legend>
        <div class="crests">
          <button v-for="c in CRESTS" :key="c.id" type="button" class="cr" :aria-pressed="crest === c.id" :aria-label="`${c.name} crest`" :title="c.name" @click="crest = c.id">
            <Crest :crest="c.id" :colour="colour" :size="34" />
          </button>
        </div>
        <span class="hint">It sits next to your name on leaderboards, battles and the feed.</span>
      </fieldset>
      <button class="btn" type="button" @click="saveProfile">Save</button>
    </section>

    <section class="panel stack" aria-labelledby="s-look">
      <h2 id="s-look">Day and night</h2>
      <div class="seg looks" role="group" aria-labelledby="s-look">
        <button v-for="l in LOOKS" :key="l.id" type="button" :aria-pressed="theme.choice === l.id" @click="setTheme(l.id)">{{ l.label }}</button>
      </div>
      <p class="hint">{{ theme.choice === 'auto' ? `Auto follows your phone's light or dark setting. It's ${theme.look} now.` : theme.choice === 'night' ? 'Night uses darker screens and a dark street map, easier on the eyes after sunset.' : 'Day keeps the light screens and street map.' }} Saved on this phone.</p>
    </section>

    <PlusSettings v-if="!isLocal" />
    <PushSettings v-if="!isLocal" />

    <section class="panel stack" aria-labelledby="s-priv">
      <h2 id="s-priv">Privacy zones</h2>
      <p class="small muted">Ground inside a zone is never shown as yours to anyone else, and the start and end of your routes inside a zone are trimmed. Claims show to others after a delay, never live.</p>
      <ul class="plain rows">
        <li v-for="(z, i) in zones" :key="i" class="zone">
          <div class="field grow">
            <label :for="`z${i}`">{{ z.label }}</label>
            <select :id="`z${i}`" v-model.number="z.radiusM" @change="saveZones">
              <option :value="200">200 m</option>
              <option :value="400">400 m</option>
              <option :value="800">800 m</option>
              <option :value="1200">1.2 km</option>
            </select>
          </div>
          <button class="btn quiet small" type="button" @click="removeZone(i)">Remove</button>
        </li>
      </ul>
      <button class="btn secondary" type="button" @click="addZoneHere">Add a zone where I am</button>
    </section>

    <section v-if="!isLocal && serverConfig.posthogKey" class="panel stack" aria-labelledby="s-usage">
      <h2 id="s-usage">Usage stats</h2>
      <label class="usage">
        <input v-model="usageOn" type="checkbox" @change="setAnalytics(usageOn)" />
        <span>Help improve Foothold by sharing which screens and features you use</span>
      </label>
      <p class="small muted">Never where you run, your routes, your name or anything you type. <RouterLink to="/privacy">How it works</RouterLink></p>
    </section>

    <MusicVoiceSettings />

    <section class="panel stack" aria-labelledby="s-ft">
      <h2 id="s-ft">FormTrack</h2>
      <template v-if="store.user.formtrack?.linked">
        <p class="notice good">Linked. Your coach plans fit around today's FormTrack session and your recovery.</p>
        <div v-if="ftSummary" class="small">
          <p v-if="ftSummary.today"><strong>Today in FormTrack:</strong> {{ ftSummary.today.title || ftSummary.today }}</p>
          <p v-if="ftSummary.readiness != null"><strong>Readiness:</strong> {{ ftSummary.readiness }} of 100</p>
          <p v-if="ftSummary.strengthThisWeek != null"><strong>Strength sessions this week:</strong> {{ ftSummary.strengthThisWeek }}</p>
        </div>
        <button class="btn quiet" type="button" @click="unlinkFt">Unlink FormTrack</button>
      </template>
      <template v-else>
        <p class="small muted">
          Link FormTrack and Foothold plans your runs around your strength sessions, and eases off when your sleep and heart rate say you need it.
          In FormTrack, open Settings, go to Connect to Claude and tap Create my link. Copy the link and paste it here.
        </p>
        <div class="field">
          <label for="s-ft-token">Your FormTrack link</label>
          <input id="s-ft-token" v-model="ftToken" autocomplete="off" spellcheck="false" placeholder="https://formtrack.com.au/mcp/ftk_..." />
        </div>
        <p v-if="ftError" class="notice bad">{{ ftError }}</p>
        <button class="btn" type="button" :disabled="!ftTokenValue || ftBusy" @click="linkFt">{{ ftBusy ? 'Linking' : 'Link FormTrack' }}</button>
      </template>
    </section>

    <section class="panel stack" aria-labelledby="s-fb">
      <h2 id="s-fb">Tell us what to fix</h2>
      <div class="seg" role="group" aria-label="Kind of feedback">
        <button type="button" :aria-pressed="fbKind === 'bug'" @click="fbKind = 'bug'">Something's wrong</button>
        <button type="button" :aria-pressed="fbKind === 'idea'" @click="fbKind = 'idea'">An idea</button>
      </div>
      <div class="field">
        <label for="s-fb-text">What happened, or what would make Foothold better?</label>
        <textarea id="s-fb-text" v-model="fbText" maxlength="2000"></textarea>
      </div>
      <button class="btn" type="button" :disabled="fbText.trim().length < 5" @click="sendFeedback">Send</button>
    </section>

    <section v-if="store.user.admin" class="panel stack" aria-labelledby="s-admin">
      <h2 id="s-admin">Admin</h2>
      <p class="small">Story ideas, feedback, reported comments and how the app is going.</p>
      <RouterLink class="btn quiet" to="/app/admin">Open admin</RouterLink>
    </section>

    <section class="panel stack" aria-labelledby="s-data">
      <h2 id="s-data">Your data</h2>
      <p v-if="isLocal" class="small muted">This is the practice map. Your runs are saved only on this device, and the rivals are made up so you can try the game.</p>
      <p class="small"><RouterLink to="/privacy">How we handle your data</RouterLink></p>
      <div class="row">
        <button class="btn quiet" type="button" @click="exportData">Download my data</button>
        <button v-if="isLocal" class="btn quiet" type="button" @click="startAgain">Start again</button>
        <button v-else class="btn quiet" type="button" @click="deleteAccount">Delete my account</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stack { display: grid; gap: 12px; }
.back { justify-self: start; border: 0; background: none; font: inherit; color: var(--you-ink); font-weight: 700; padding: 4px 0; cursor: pointer; }
fieldset { border: 0; padding: 0; margin: 0; }
legend { font-weight: 650; margin-bottom: 6px; }
.swatches { display: flex; gap: 10px; flex-wrap: wrap; }
.sw { width: 38px; height: 38px; border-radius: 50%; border: 3px solid var(--card); box-shadow: 0 0 0 1px var(--line); cursor: pointer; }
.sw[aria-pressed='true'] { box-shadow: 0 0 0 3px var(--ink); }
html.night .sw:not([aria-pressed='true']) { box-shadow: 0 0 0 1px var(--ink-40); } /* so the darkest colour still shows */
.crests { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; max-width: 360px; }
.cr { display: grid; place-items: center; aspect-ratio: 1; min-height: 44px; border: 0; border-radius: 12px; background: var(--soft); cursor: pointer; padding: 0; }
.cr[aria-pressed='true'] { background: var(--raised); box-shadow: 0 0 0 3px var(--ink); }
.plain { list-style: none; margin: 0; padding: 0; }
.zone { display: flex; gap: 12px; align-items: end; }
.grow { flex: 1; }
.row { display: flex; gap: 10px; flex-wrap: wrap; }
.looks { justify-self: start; }
.looks button { min-width: 72px; min-height: 40px; }
.usage { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; }
.usage input { width: 22px; height: 22px; margin-top: 2px; flex: none; accent-color: var(--brand, #2E55E6); }
</style>
