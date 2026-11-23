// Velocity (missions/series/velocity.js): a storm powered speedster in
// Brisbane and on the Gold Coast. Cliffs, CityCats, the Valley, the
// Story Bridge, a citywide blackout and Surfers Paradise at dawn.
export const SHEET = {
  series: 'velocity',
  scenes: {
    'velocity-cliffs': { prompt: 'River cliffs in Brisbane on a sticky summer evening as a storm arrives: thunder rumbling, hot gusty wind, people shouting far off with no clear words, a coffee van generator, the river below, no music', synth: ['storm', 'gusts'], spots: [['bird', 0.03]], around: [['thunderroll', 0.008]] },
    'velocity-riverwalk': { prompt: 'A floating riverwalk in a subtropical city at night: water sloshing under the walkway, cyclists whirring past, a CityCat ferry rumbling by, fruit bats, warm wind, no music, no voices', synth: ['lapping', 'traffic'], spots: [['bird', 0.04]], around: [['velocity-catpass', 0.01], ['druitt-bike', 0.01]] },
    'velocity-citycat': { prompt: 'On board a fast river catamaran ferry in a storm: twin engines roaring, hulls slamming on chop, rain lashing the windows, passengers gasping with no clear words, no music', synth: ['traffic', 'rain'], spots: [['wavecrash', 0.08]] },
    'velocity-terminal': { prompt: 'A river ferry terminal at night in the rain: water churning as a ferry docks, ropes creaking, a pontoon rocking, a warning beep, people hurrying, no music, no clear words', synth: ['lapping', 'rain'], spots: [['halyard', 0.05]] },
    'velocity-valley': { prompt: 'A busy nightlife street on a Saturday night after rain: crowds laughing and chatting with no clear words, cars and taxis, a bus, steam rising, a bouncer calling out, no music', synth: ['crowd', 'traffic'], spots: [['carHorn', 0.04]], around: [['sydney-taxi', 0.012], ['chatter', 0.012]] },
    'velocity-storybridge': { prompt: 'Thousands of people lining a huge steel cantilever bridge at midnight: an excited crowd roaring with no clear words, wind through the steel, the river far below, no music', synth: ['crowd', 'gusts'], spots: [['clap', 0.08]], around: [['crowdwave', 0.012]] },
    'velocity-depot': { prompt: 'An electricity depot in a blackout: emergency generators roaring, warning alarms beeping, high voltage gear crackling and humming, workers shouting with no clear words, no music', synth: ['machine', 'storm'], spots: [['blip', 0.15]] },
    'velocity-hospital': { prompt: 'A hospital entrance in a city blackout: backup generators thrumming, monitors beeping inside, an ambulance reversing, automatic doors stuck and rattling, no music, no clear words', synth: ['machine', 'room'], spots: [['blip', 0.3]] },
    'velocity-station': { prompt: 'A dark city railway platform before dawn in a blackout: a train humming as it waits, doors chiming, emergency lights buzzing, a few people murmuring with no clear words, no music', synth: ['room', 'machine'], spots: [['tick', 0.1]], around: [['sydneytrain', 0.008]] },
    'velocity-surfers': { prompt: 'A long surf beach below beachfront towers at five in the morning: big surf rolling in, strong wind, a storm far out rumbling, gulls, the first early joggers, no music, no voices', synth: ['surf', 'gusts'], spots: [['gull', 0.05]], around: [['thunderroll', 0.008]] },
    'velocity-spit': { prompt: 'A rock wall at a seaway entrance in a storm: waves smashing against boulders, strong wind, a boat engine fighting the current, rain sweeping in, no music, no voices', synth: ['surf', 'storm'], spots: [['wavecrash', 0.1]] },
  },
  passing: {
    'velocity-catpass': { prompt: 'A fast river catamaran ferry rumbling past at night, engines roaring and a big wake slapping the bank, fading', seconds: 6, synth: 'boat', path: 'water' },
  },
  cues: {},
  episodes: {
    'velocity-strike': {
      4: { scene: 'velocity-cliffs' },
      12: { scene: 'velocity-riverwalk' },
      22: { scene: 'street' },
    },
    'velocity-ferry': {
      6: { scene: 'velocity-citycat' },
      13: { scene: 'street' },
      14: { scene: 'velocity-terminal' },
      23: { scene: 'velocity-riverwalk', spatial: 'velocity-catpass' },
    },
    'velocity-bridge': {
      0: { scene: 'velocity-valley' },
      5: { scene: 'velocity-storybridge' },
      19: { scene: 'velocity-valley' },
    },
    'velocity-blackout': {
      5: { scene: 'velocity-depot' },
      8: { scene: 'velocity-hospital' },
      25: { scene: 'velocity-station' },
    },
    'velocity-storm': {
      0: { scene: 'velocity-surfers' },
      12: { scene: 'beachdawn' },
      21: { scene: 'velocity-spit' },
      25: { scene: 'stormfront' },
    },
  },
}
