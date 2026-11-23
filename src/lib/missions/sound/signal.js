// The Parkes Signal (missions/signal.js): an alien signal at the Parkes
// dish, a crater in the wheat, the Elvis Festival and the Warrumbungles.
export const SHEET = {
  series: 'signal',
  scenes: {
    'signal-paddock': { prompt: 'A wheat paddock on a clear frosty night in central west New South Wales: crickets, a soft cold wind through the wheat, a wire fence ticking, a far off highway, a vast quiet, no music, no voices', synth: ['insects', 'wind'], spots: [['cricket', 0.25]], around: [['dog', 0.004]] },
    'signal-visitorcentre': { prompt: 'Inside a dark empty visitor centre at night: a fridge humming, a clock ticking, the building creaking as it cools, a computer fan whirring, no music, no voices', synth: ['room', 'hush'], spots: [['tick', 0.4]] },
    'signal-crater': { prompt: 'A fresh crater in a wheat paddock at night: hot metal ticking and pinging as it cools, soil hissing and steaming, a strange low hum, crickets gone quiet, no music, no voices', synth: ['hush', 'machine'], spots: [['tick', 0.5], ['blip', 0.1]] },
    'signal-silo': { prompt: 'Inside an old empty grain silo at night: a huge hollow echo, rusty tin creaking in the wind, pigeons shifting high up, trucks rumbling outside, no music, no voices', synth: ['cave', 'wind'], spots: [['drip', 0.1]] },
    'signal-creek': { prompt: 'A creek under river red gums at night: water trickling, frogs calling, a searchlight helicopter thudding far off, leaves rustling, no music, no voices', synth: ['river', 'insects'], spots: [['cricket', 0.2]], around: [['helicopter', 0.006]] },
    'signal-ute': { prompt: 'Inside an old ute racing down a dirt road at night: engine revving, gravel pinging under the wheels, an old ham radio crackling and whistling on the dash, no music, no clear words', synth: ['traffic', 'room'], spots: [['blip', 0.1]] },
    'signal-control': { prompt: 'Inside a radio telescope control room at night: computers whirring, soft beeps from consoles, a huge motor groaning outside as the dish turns, an air conditioner humming, no music, no voices', synth: ['machine', 'room'], spots: [['blip', 0.3]] },
    'signal-feedcabin': { prompt: 'High up on a giant radio dish at night: strong wind whistling through steel struts, metal ladders creaking, motors humming below, a vast open sky, no music, no voices', synth: ['gusts', 'machine'], spots: [['blip', 0.05]] },
    'signal-shed': { prompt: 'Inside a cluttered backyard tin shed at night: an old fridge humming, a fluorescent tube buzzing, tools clinking on a bench, a tiny electronic chirp, crickets outside, no music, no voices', synth: ['room', 'insects'], spots: [['clink', 0.05]] },
    'signal-elvis': { prompt: 'A huge country town street festival at night: a massive happy crowd cheering and laughing with no clear words, sequinned costumes rustling, car horns tooting from a parade of old cars, no music', synth: ['crowd', 'traffic'], spots: [['clap', 0.1], ['carHorn', 0.04]], around: [['chatter', 0.015]] },
    'signal-bowlingclub': { prompt: 'A country bowling club car park at night: a car engine idling quietly, gravel crunching, a pokies room jingling faintly inside, crickets, no music, no voices', synth: ['insects', 'machine'], spots: [['cricket', 0.15]] },
    'signal-warrumbungle': { prompt: 'Jagged mountain ranges at midnight under a dark sky: cold wind over rocky peaks, an owl calling mopoke, a wallaby thumping on rock, a deep silence, no music, no voices', synth: ['wind', 'hush'], spots: [['bird', 0.03]], around: [['owl', 0.01]] },
    'signal-summit': { prompt: 'A mountain summit with observatory domes at night: wind roaring over the top, a dome motor rumbling as it turns, metal creaking, a vast starry silence beyond, no music, no voices', synth: ['gusts', 'machine'], spots: [['blip', 0.06]] },
  },
  passing: {
    'signal-convoy': { prompt: 'A convoy of army trucks rumbling past on a country highway at night, heavy diesel engines and tyres, one after another, fading', seconds: 8, synth: 'car', path: 'pass' },
    'signal-van': { prompt: 'A black van rolling slowly past with its lights off, tyres crunching, a small rooftop motor whirring as something turns, fading', seconds: 6, synth: 'car', path: 'back' },
  },
  cues: {
    'signal-ham': { prompt: 'An old ham radio being tuned: a squealing whistle, static, then a few dots and dashes of Morse code', seconds: 3, sting: 'squelch' },
    'signal-capsule': { prompt: 'A smooth metal capsule opening: a soft pressurised hiss, a glassy chime and a servo whirr', seconds: 3, sting: 'servo' },
    'signal-lever': { prompt: 'A big generator lever hauled down with a clunk, the engine coughing, spluttering, then roaring to life', seconds: 4, sting: 'thunk' },
    'signal-dome': { prompt: 'An observatory dome motor rumbling as the huge dome slides open', seconds: 4, sting: 'servo' },
    'signal-pebble': { prompt: 'A small smooth pebble dropped into a palm with a tiny glassy chime that rings on', seconds: 3, sting: 'chime' },
  },
  episodes: {
    'signal-contact': {
      0: { scene: 'signal-paddock' },
      4: { fx: 'signal-ham' },
      6: { scene: 'signal-visitorcentre' },
      13: { spatial: 'drones' },
      16: { scene: 'signal-control' },
    },
    'signal-swarm': {
      0: { scene: 'signal-paddock' },
      3: { fx: 'signal-ham' },
      5: { scene: 'signal-crater', fx: 'signal-capsule' },
      14: { spatial: 'signal-convoy' },
      20: { scene: 'signal-silo' },
      21: { scene: 'signal-creek' },
      24: { scene: 'signal-ute' },
    },
    'signal-starfall': {
      0: { scene: 'signal-ute' },
      10: { scene: 'signal-control' },
      16: { fx: 'signal-lever' },
      18: { scene: 'signal-feedcabin' },
    },
    'signal-stowaway': {
      1: { scene: 'signal-shed' },
      5: { spatial: 'signal-van' },
      7: { scene: 'signal-elvis' },
      19: { scene: 'signal-bowlingclub' },
      23: { scene: 'signal-control' },
    },
    'signal-home': {
      0: { scene: 'signal-warrumbungle' },
      16: { scene: 'signal-summit', fx: 'signal-dome' },
      24: { fx: 'signal-pebble' },
    },
  },
}
