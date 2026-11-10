// Music, voice and sound settings, kept on this device (they're about this phone's
// speaker and Spotify app, not your account).
import { reactive, watch } from 'vue'

const KEY = 'fh-audio'

export const DEFAULTS = {
  voice: true, // spoken updates during a run
  coachVoice: 'charlie', // the server's Australian voice ('charlie', 'brenna'), or 'phone'
  coachVoicePicked: false, // true once someone chooses a coach voice in settings themselves
  voiceName: '', // with 'phone': a specific phone voice; empty picks an Australian one
  every: 'km', // 'km' | 'half' (0.5 km) | '5min' | '10min' | 'off'
  sayPace: true,
  sayTime: true,
  sayTerritory: true, // loop closing hints
  directions: true, // turn by turn on a planned route that has them
  answerByVoice: true, // answer mission questions out loud (where the browser can listen)
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
  storySound: true, // scene sounds and music in the thriller missions
  runMusic: true, // Foothold's own tracks during a run when Spotify isn't playing
  tapSound: false, // a very soft tick on button taps
  muted: false, // the speaker button in the top bar: silences everything Foothold plays
}

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEFAULTS } }
}

export const audio = reactive(fixVoice(load()))

/**
 * Settings used to switch the coach to the phone's voice for good whenever
 * the server voices didn't answer once (a slow start, no signal). Undo that
 * for anyone who never chose the phone voice themselves.
 */
export function fixVoice(s) {
  if (s.coachVoice === 'phone' && !s.coachVoicePicked) s.coachVoice = DEFAULTS.coachVoice
  return s
}
watch(audio, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private mode */ } }, { deep: true })
