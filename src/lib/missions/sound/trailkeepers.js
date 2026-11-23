// The Trailkeepers (missions/scripts.js): the gentle starter crew on your
// own streets. Coach led, so no score and no effects over the voice, just
// the places: Nan Bev's verandah, the corner shop, the park in swooping
// season, the street party, the hill at sunset.
export const SHEET = {
  series: 'trailkeepers',
  fxMin: 0,
  scenes: {
    'trailkeepers-verandah': { prompt: 'An Australian suburban back verandah in the morning: a kettle coming to the boil inside, a screen door creaking, magpies warbling in the yard, a radio murmuring through a window with no clear words, a light breeze, no music', synth: ['wind', 'room'], spots: [['bird', 0.08]], around: [['magpie', 0.012]] },
    'trailkeepers-streets': { prompt: 'Quiet suburban streets on a bright morning: a sprinkler ticking, a lawnmower a few houses away, a bike freewheeling past, lorikeets in the street trees, a car pulling out, no music, no voices', synth: ['wind', 'insects'], spots: [['lorikeet', 0.06]], around: [['druitt-bike', 0.012], ['car', 0.008]] },
    'trailkeepers-shop': { prompt: 'Outside a small suburban corner shop: a door bell jingling, drink fridges humming, a newspaper rack rattling in the breeze, a car idling at the kerb, no music, no clear words', synth: ['traffic', 'room'], spots: [['clink', 0.06]] },
    'trailkeepers-park': { prompt: 'A suburban park in spring: magpies carolling loudly, a swing creaking, a dog running on the grass, kids laughing far off with no clear words, a warm breeze in the gums, no music', synth: ['wind', 'insects'], spots: [['bird', 0.1]], around: [['magpie', 0.015], ['kids', 0.008]] },
    'trailkeepers-dusk': { prompt: 'A suburban street at dusk before a street party: neighbours setting up trestle tables and chatting with no clear words, a ladder clanking, string lights rattling, kids excited, crickets starting, no music', synth: ['crowd', 'insects'], spots: [['clink', 0.06]], around: [['kids', 0.01]] },
    'trailkeepers-party': { prompt: 'A suburban street party at night: a big friendly crowd laughing and talking with no clear words, a sausage sizzle, kids running about, a dog barking happily, warm evening, no music', synth: ['crowd'], spots: [['clink', 0.1], ['clap', 0.04]], around: [['kids', 0.012]] },
    'trailkeepers-skatepark': { prompt: 'A suburban skate park: skateboards rolling and clacking on concrete ramps, scooter wheels, kids calling out with no clear words, a magpie, no music', synth: ['crowd', 'traffic'], spots: [['clink', 0.1]], around: [['trailkeepers-scooter', 0.012]] },
    'trailkeepers-hill': { prompt: 'A steep suburban hill street: a breeze stronger at the top, a bus groaning up the slope, birds in the trees, wind chimes on a porch, no music, no voices', synth: ['gusts', 'traffic'], spots: [['bird', 0.05]], around: [['druitt-bus', 0.008]] },
    'trailkeepers-sunset': { prompt: 'The top of a suburban hill at sunset: kookaburras laughing in a chorus, a cool breeze, sprinklers ticking below, a dog barking far off, no music, no voices', synth: ['wind', 'insects'], spots: [['bird', 0.06]], around: [['kookaburra', 0.012]] },
    'trailkeepers-quiet': { prompt: 'Very quiet suburban back streets on an easy morning: birds in the gardens, leaves rustling, a gate latch, a far off train, a peaceful stillness, no music, no voices', synth: ['hush', 'wind'], spots: [['bird', 0.08]] },
  },
  passing: {
    'trailkeepers-swoop': { prompt: 'An Australian magpie swooping low and close overhead in spring, a rush of wings and a sharp beak clack, then flying off', seconds: 2, synth: 'bird', path: 'behind' },
    'trailkeepers-scooter': { prompt: 'A kid riding a kick scooter fast past on a footpath, small wheels rattling over the cracks, fading', seconds: 3, synth: 'car', path: 'pass' },
  },
  cues: {},
  episodes: {
    'first-steps': {
      0: { scene: 'trailkeepers-verandah' },
      2: { spatial: 'druitt-bike' },
      3: { scene: 'trailkeepers-streets' },
      5: { spatial: 'magpie' },
      7: { scene: 'trailkeepers-park' },
      8: { scene: 'trailkeepers-verandah' },
    },
    'supply-line': {
      0: { scene: 'trailkeepers-verandah' },
      3: { scene: 'trailkeepers-shop' },
      5: { scene: 'trailkeepers-streets', spatial: 'druitt-bike' },
      6: { spatial: 'trailkeepers-scooter' },
      9: { scene: 'trailkeepers-verandah' },
    },
    'lantern-night': {
      0: { scene: 'trailkeepers-dusk' },
      3: { scene: 'trailkeepers-streets' },
      6: { spatial: 'trailkeepers-scooter' },
      7: { spatial: 'dog' },
      10: { scene: 'trailkeepers-party' },
    },
    'magpie-season': {
      0: { scene: 'trailkeepers-park' },
      3: { spatial: 'trailkeepers-swoop' },
      4: { spatial: 'trailkeepers-swoop' },
      5: { spatial: 'trailkeepers-scooter' },
      8: { scene: 'trailkeepers-streets' },
      9: { spatial: 'trailkeepers-swoop' },
      12: { scene: 'trailkeepers-skatepark' },
      15: { scene: 'trailkeepers-park' },
    },
    'hilltop-crown': {
      0: { scene: 'trailkeepers-streets' },
      3: { scene: 'trailkeepers-hill' },
      5: { spatial: 'dog' },
      13: { scene: 'trailkeepers-sunset' },
      14: { spatial: 'kookaburra' },
      17: { scene: 'trailkeepers-verandah' },
    },
    'steady-scout': {
      0: { scene: 'trailkeepers-quiet' },
      3: { spatial: 'druitt-bike' },
      4: { scene: 'trailkeepers-streets' },
      6: { spatial: 'magpie' },
      7: { scene: 'trailkeepers-verandah' },
    },
  },
}
