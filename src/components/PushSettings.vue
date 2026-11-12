<script setup>
// Settings > Notifications: switch push on for this phone or browser, and
// choose which kinds of notice may tap you on the shoulder (worker/push.js).
// Pushes never come between 9 pm and 7 am, and never more than twice a day.
import { ref, computed } from 'vue'
import { store, toast } from '../lib/store.js'
import { api } from '../lib/api/index.js'
import { serverConfig } from '../lib/auth.js'
import { pushPossible, pushWasOn, enablePush, disablePush } from '../lib/push.js'

const config = serverConfig?.push || null
const possible = pushPossible(config)
const here = ref(pushWasOn())
const busy = ref(false)
const prefs = ref({ on: true, rivals: true, ground: true, stories: true, weekly: true, ...(store.user?.push || {}) })

const KINDS = [
  { key: 'rivals', label: 'Rivals', about: 'Someone takes your ground, a battle ends, a comment' },
  { key: 'ground', label: 'Your ground', about: 'Ground about to fade, your streak, divisions' },
  { key: 'stories', label: 'Stories', about: 'The next episode is waiting, new series' },
  { key: 'weekly', label: 'Weekly round-up', about: 'Your week in Foothold, once a week' },
]

const status = computed(() => (!possible ? 'unavailable' : here.value ? 'on' : 'off'))

async function toggleHere() {
  busy.value = true
  try {
    if (here.value) {
      await disablePush()
      here.value = false
      toast('Push is off for this device.')
    } else {
      const r = await enablePush(config)
      here.value = r === 'on'
      if (r === 'denied') toast('Your phone said no. You can allow notifications for Foothold in its settings.')
      else if (r === 'unavailable') toast('Push isn’t available on this device yet.')
      else toast('Push is on. We’ll only tap you on the shoulder when it matters.')
    }
  } finally {
    busy.value = false
  }
}

async function save(key) {
  try {
    const { user } = await api.updateMe({ push: { [key]: prefs.value[key] } })
    store.user = { ...store.user, push: user.push }
  } catch (e) {
    prefs.value[key] = !prefs.value[key]
    toast(e?.message || 'That didn’t save. Try again in a moment.')
  }
}

async function test() {
  try {
    const r = await api.pushTest()
    toast(r.sent ? 'Sent. It should pop up in a moment.' : 'That didn’t arrive. Try switching push off and on again.')
  } catch (e) {
    toast(e?.message || 'That didn’t send.')
  }
}
</script>

<template>
  <section class="panel stack" aria-labelledby="s-push">
    <h2 id="s-push">Notifications</h2>
    <p v-if="status === 'unavailable'" class="small">Push notifications aren’t available on this device yet. Your notices still show under the bell.</p>
    <template v-else>
      <label class="switch">
        <input type="checkbox" :checked="here" :disabled="busy" @change="toggleHere">
        <span><strong>Push to this {{ 'ontouchstart' in window ? 'phone' : 'browser' }}</strong><br><span class="small muted">Never between 9 pm and 7 am, and twice a day at most.</span></span>
      </label>
      <fieldset v-if="here" class="kinds">
        <legend class="small muted">Which notices</legend>
        <label v-for="k in KINDS" :key="k.key" class="switch">
          <input v-model="prefs[k.key]" type="checkbox" @change="save(k.key)">
          <span>{{ k.label }}<br><span class="small muted">{{ k.about }}</span></span>
        </label>
      </fieldset>
      <button v-if="here" class="btn quiet" type="button" @click="test">Send me a test</button>
    </template>
  </section>
</template>

<style scoped>
.switch { display: flex; gap: 12px; align-items: flex-start; padding: 6px 0; cursor: pointer; }
.switch input { width: 22px; height: 22px; margin-top: 2px; flex: none; accent-color: var(--brand, #2E55E6); }
.kinds { border: 0; margin: 0; padding: 0; display: grid; gap: 2px; }
.kinds legend { padding: 0; margin-bottom: 4px; }
</style>
