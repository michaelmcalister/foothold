// Music, voice and sound settings, kept on this device (they're about this phone's
// speaker and Spotify app, not your account).
import { reactive, watch } from 'vue'

const KEY = 'fh-audio'

export const DEFAULTS = {
  voice: true, // spoken updates during a run
  coachVoice: 'charlie', // the server's Australian voice ('charlie', 'brenna'), or 'phone'
  voiceName: '', // with 'phone': a specific phone voice; empty picks an Australian one
  every: 'km', // 'km' | 'half' (0.5 km) | '5min' | '10min' | 'off'
  sayPace: true,
  sayTime: true,
  sayTerritory: true, // loop closing hints
  cheer: 'some', // encouragement: 'off' | 'some' | 'lots'
  music: 'duck', // while talking: 'duck' (lower) | 'pause' | 'none' (talk over)
  duckTo: 25, // percent volume while talking, when the phone allows it
  spotifyAutoplay: true, // start music when the run starts
  spotifyContext: '', // playlist URI, or empty to resume what was playing
  spotifyContextName: '',
  shuffle: true,
  sfx: true, // sound effects (claiming ground, level ups, the record buttons)
  sfxVolume: 0.6, // 0 to 1
  recapMusic: true, // music in the run recap flyover
  tapSound: false, // a very soft tick on button taps
}

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEFAULTS } }
}

export const audio = reactive(load())
watch(audio, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private mode */ } }, { deep: true })
