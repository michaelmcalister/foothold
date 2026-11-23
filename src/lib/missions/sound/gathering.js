// The Gathering (missions/series/gathering.js): the season finale. The
// riddle travels round all ten towns on one radio channel, so the sound
// travels with it: each guide's town plays as they come on air.
export const SHEET = {
  series: 'gathering',
  scenes: {
    'gathering-radioroom': { prompt: 'A small radio room with an open channel to many towns: a soft electrical hum, gentle static hiss, a speaker crackling as voices come and go with no clear words, a chair creaking, no music', synth: ['room', 'machine'], spots: [['blip', 0.1]] },
  },
  passing: {},
  cues: {
    'gathering-tin': { prompt: 'An old biscuit tin lid prised off with a pop, paper and something small rattling inside', seconds: 2, sting: 'creak' },
    'gathering-tune': { prompt: 'A radio dial tuning across stations: a sweep of static and whistles, then locking on with a click', seconds: 2, sting: 'squelch' },
    'gathering-letters': { prompt: 'A big pile of paper letters and envelopes spilling out of a letterbox onto timber boards', seconds: 3, sting: 'rush' },
  },
  episodes: {
    'gathering-finale': {
      0: { scene: 'gathering-radioroom' },
      1: { scene: 'tiger-salamanca', fx: 'gathering-tin' },
      2: { scene: 'mahogany-stormcoast', fx: 'gathering-tune' },
      3: { scene: 'opal-town', fx: 'gathering-tune' },
      4: { scene: 'gathering-radioroom' },
      7: { scene: 'mahogany-dunes' },
      8: { scene: 'catalpa-boatharbour', fx: 'gathering-tune' },
      10: { scene: 'tunnels-esplanade', fx: 'gathering-tune' },
      11: { scene: 'minmin-boulia', spatial: 'minmin-galahs' },
      16: { scene: 'nugget-moliagul' },
      17: { scene: 'canberra-anzac' },
      19: { scene: 'nugget-diggings', fx: 'nugget-pan' },
      20: { scene: 'canberra-island', fx: 'canberra-bell' },
      22: { scene: 'panther-clifftrack', fx: 'gathering-tune' },
      23: { scene: 'hawkesbury-ferry', fx: 'gathering-tune' },
      25: { scene: 'hawkesbury-dangar', fx: 'tunnels-dial' },
      26: { fx: 'gathering-letters' },
    },
  },
}
