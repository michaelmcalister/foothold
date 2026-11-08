// Foothold's recorded sounds: real-sounding ambience for each mission scene
// (seamless 30 second loops) and a set of original instrumental tracks to
// run to. Each one is made once with ElevenLabs by the Foothold server
// (GET /api/audio/:kind/:id, worker/audioLibrary.js), stored in R2, and then
// served to everyone. The prompts describe a feel, never a real song or
// artist: everything here is original. Shared by the app and the worker.

export const AMBIENCE = {
  bush: 'Australian bush on a scorching summer afternoon: loud pulsing cicada chorus, hot dry wind through gum trees, leaves rustling, a distant crow and magpie, no music, no voices',
  smoke: 'Australian bushland on a smoky fire day: strong gusty hot wind, dry leaves skittering, a low distant rumble of a bushfire over the hills, faint cicadas, no music, no voices',
  fire: 'A large bushfire close by: deep roaring flames, crackling and popping branches, strong wind gusts, embers hissing, no music, no voices, no sirens',
  night: 'An Australian country town at night during a blackout: crickets, light warm wind in trees, a far off low rumble, a generator humming in the distance, no music, no voices',
  rain: 'Heavy summer rain on a tin roof and gum trees at dawn, water running in gutters, distant thunder, birds starting to call, no music, no voices',
  city: 'Sydney city centre at night: steady low traffic hum, buses passing, footsteps on pavement, distant harbour ferry engine, a far off siren once, no music, no clear voices',
  street: 'A wet city street at night in light rain: tyres hissing on wet road, cars passing, rain dripping from awnings, distant traffic, no music, no clear voices',
  tower: 'Inside an empty office tower stairwell at night: air conditioning hum, fluorescent light buzz, distant lift machinery, echoing footsteps far below, no music, no voices',
  gala: 'A glamorous rooftop party heard from the next room: murmuring crowd, glasses clinking, muffled string quartet music through a wall, laughter, no clear words',
  harbour: 'Sydney Harbour wharf at night: water lapping against wooden pylons, a ferry idling, ropes creaking, gentle wind, gulls far away, no music, no voices',
}

export const TRACKS = {
  'spy-chase': {
    title: 'Rooftop Pursuit',
    prompt: 'Original instrumental spy thriller chase music. Driving odd meter rhythm in five, staccato low strings, punchy brass stabs, bongos and tight snare, tense and propulsive, about 150 bpm. No vocals.',
    seconds: 90,
  },
  'ember-rising': {
    title: 'Hold the Line',
    prompt: 'Original epic cinematic instrumental for a heroic rescue. Thundering taiko drums, low brass, soaring strings, tension that builds to a triumphant peak, about 130 bpm. No vocals.',
    seconds: 90,
  },
  'arena-anthem': {
    title: 'Last Hill Standing',
    prompt: 'Original 1980s arena rock instrumental for a training montage. Driving palm muted electric guitar riff, big gated drums, bright synth stabs, determined and triumphant, about 110 bpm. No vocals.',
    seconds: 150,
  },
  'synth-sprint': {
    title: 'Neon Kilometres',
    prompt: 'Original synthwave running track. Pulsing analogue bass arpeggio, punchy electronic drums, shimmering pads, steady and energetic, about 125 bpm, motivating. No vocals.',
    seconds: 150,
  },
  'surf-rock-run': {
    title: 'Coastal Tempo',
    prompt: 'Original Australian surf rock instrumental. Reverb drenched twangy electric guitar, driving drums and bass, sunny and upbeat, about 160 bpm. No vocals.',
    seconds: 150,
  },
  'big-beat-push': {
    title: 'Second Wind',
    prompt: 'Original big beat electronic instrumental. Chunky breakbeat drums, horn section stabs, funky bass line, high energy and fun, about 130 bpm. No vocals.',
    seconds: 150,
  },
}

/** The tracks for an ordinary run, in a fresh order each time. */
export const RUN_PLAYLIST = ['arena-anthem', 'synth-sprint', 'surf-rock-run', 'big-beat-push', 'spy-chase', 'ember-rising']

/** The chase music each series brings in when a surge starts. */
export const CHASE_TRACK = { ember: 'ember-rising', heist: 'spy-chase' }

export const isAmbience = (id) => Object.prototype.hasOwnProperty.call(AMBIENCE, id)
export const isTrack = (id) => Object.prototype.hasOwnProperty.call(TRACKS, id)

/** A fresh shuffle of a playlist (rand is injectable for tests). */
export function shuffled(list, rand = Math.random) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
