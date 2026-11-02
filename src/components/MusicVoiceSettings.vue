<script setup>
// Settings for music and the voice coach during runs: connect Spotify and
// pick a playlist, choose how often the voice gives updates and what it says,
// how much encouragement, and what the music does while it talks.
import { ref, computed, onMounted } from 'vue'
import { audio } from '../lib/audio/settings.js'
import { australianVoices, voicesReady, speak, unlock } from '../lib/audio/voice.js'
import * as spotify from '../lib/audio/spotify.js'
import { toast } from '../lib/store.js'

const linked = ref(spotify.isLinked())
const available = ref(false)
const lists = ref([])
const busy = ref(false)
const error = ref('')
const voiceList = ref([])
const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window

const contextChoice = computed({
  get: () => audio.spotifyContext,
  set: (uri) => {
    audio.spotifyContext = uri
    audio.spotifyContextName = lists.value.find((l) => l.uri === uri)?.name || ''
  },
})

async function loadLists() {
  try { lists.value = await spotify.playlists() } catch (e) { error.value = e.message }
}

onMounted(async () => {
  available.value = !!(await spotify.clientId())
  try {
    if (await spotify.finishConnect()) {
      linked.value = true
      toast('Spotify connected.')
    }
  } catch (e) { error.value = e.message }
  if (linked.value) loadLists()
  voiceList.value = (await voicesReady(), australianVoices()).map((v) => ({ name: v.name, lang: v.lang }))
})

async function connect() {
  error.value = ''
  busy.value = true
  try { await spotify.connect() } catch (e) { error.value = e.message; busy.value = false }
}
function disconnect() {
  spotify.disconnect()
  linked.value = false
  lists.value = []
}

async function testMusic() {
  error.value = ''
  busy.value = true
  try {
    const r = await spotify.startMusic({ context: audio.spotifyContext, shuffle: audio.shuffle })
    unlock()
    await spotify.aroundSpeech(() => speak(`Music's playing on ${r.device}. This is how updates will sound.`, { voiceName: audio.voiceName }), { how: audio.music, duckTo: audio.duckTo })
    if (!r.canVolume && audio.music === 'duck') toast("This phone won't let other apps change Spotify's volume, so the music will pause briefly instead.")
  } catch (e) { error.value = e.message } finally { busy.value = false }
}

function testVoice() {
  unlock()
  speak('One kilometre. Five minutes forty. Average pace 5 40 per k. Good on ya, keep it steady.', { voiceName: audio.voiceName })
}
</script>

<template>
  <section class="panel stack" aria-labelledby="s-audio">
    <h2 id="s-audio">Music and voice coach</h2>

    <div class="stack">
      <h3>Spotify</h3>
      <template v-if="!available">
        <p class="small muted">Spotify isn't switched on for Foothold yet.</p>
      </template>
      <template v-else-if="!linked">
        <p class="small muted">Connect Spotify and your music starts when your run does. Needs Spotify Premium and the Spotify app on this phone.</p>
        <button class="btn" type="button" :disabled="busy" @click="connect">Connect Spotify</button>
      </template>
      <template v-else>
        <label class="check">
          <input v-model="audio.spotifyAutoplay" type="checkbox" />
          <span>Start my music when I start a run</span>
        </label>
        <div class="field">
          <label for="s-pl">Play</label>
          <select id="s-pl" v-model="contextChoice">
            <option value="">Whatever I was last listening to</option>
            <option v-if="audio.spotifyContext && !lists.length" :value="audio.spotifyContext">{{ audio.spotifyContextName || 'My playlist' }}</option>
            <option v-for="l in lists" :key="l.uri" :value="l.uri">{{ l.name }}</option>
          </select>
        </div>
        <label v-if="audio.spotifyContext" class="check">
          <input v-model="audio.shuffle" type="checkbox" />
          <span>Shuffle</span>
        </label>
        <div class="row">
          <button class="btn quiet" type="button" :disabled="busy" @click="testMusic">Test music and voice</button>
          <button class="btn quiet" type="button" @click="disconnect">Disconnect</button>
        </div>
        <p class="hint">Open Spotify on this phone first so Foothold can find it.</p>
      </template>
      <p v-if="error" class="notice bad">{{ error }}</p>
    </div>

    <div class="stack">
      <h3>Voice coach</h3>
      <p v-if="!hasSpeech" class="small muted">This browser can't speak, so the voice coach is off here.</p>
      <label class="check">
        <input v-model="audio.voice" type="checkbox" :disabled="!hasSpeech" />
        <span>Talk me through my runs</span>
      </label>
      <template v-if="audio.voice && hasSpeech">
        <div class="field">
          <label for="s-every">Updates</label>
          <select id="s-every" v-model="audio.every">
            <option value="km">Every kilometre</option>
            <option value="half">Every half kilometre</option>
            <option value="5min">Every 5 minutes</option>
            <option value="10min">Every 10 minutes</option>
            <option value="off">No regular updates</option>
          </select>
        </div>
        <fieldset class="field">
          <legend>Include</legend>
          <label class="check"><input v-model="audio.sayTime" type="checkbox" /><span>Time</span></label>
          <label class="check"><input v-model="audio.sayPace" type="checkbox" /><span>Pace (speed on rides)</span></label>
          <label class="check"><input v-model="audio.sayTerritory" type="checkbox" /><span>When I'm close to closing a loop</span></label>
        </fieldset>
        <div class="field">
          <label for="s-cheer">Encouragement</label>
          <select id="s-cheer" v-model="audio.cheer">
            <option value="off">None, just the numbers</option>
            <option value="some">Now and then</option>
            <option value="lots">Plenty</option>
          </select>
        </div>
        <div class="field">
          <label for="s-music">While the coach talks</label>
          <select id="s-music" v-model="audio.music">
            <option value="duck">Turn the music down</option>
            <option value="pause">Pause the music</option>
            <option value="none">Leave the music alone</option>
          </select>
          <span v-if="audio.music === 'duck'" class="hint">On iPhone, Spotify can't be turned down by another app, so it pauses for a moment instead.</span>
        </div>
        <div v-if="audio.music === 'duck'" class="field">
          <label for="s-duck">Music volume while talking: {{ audio.duckTo }}%</label>
          <input id="s-duck" v-model.number="audio.duckTo" type="range" min="5" max="60" step="5" />
        </div>
        <div v-if="voiceList.length > 1" class="field">
          <label for="s-voice">Voice</label>
          <select id="s-voice" v-model="audio.voiceName">
            <option value="">Australian (automatic)</option>
            <option v-for="v in voiceList" :key="v.name" :value="v.name">{{ v.name }} ({{ v.lang }})</option>
          </select>
        </div>
        <button class="btn quiet" type="button" @click="testVoice">Hear a sample</button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.stack { display: grid; gap: 12px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; }
.check { display: flex; gap: 10px; align-items: center; }
.check input { width: 20px; height: 20px; }
fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 8px; }
input[type='range'] { width: 100%; }
</style>
