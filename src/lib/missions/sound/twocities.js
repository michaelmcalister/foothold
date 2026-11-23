// Two Cities (missions/series/twocities.js): episodes 2 to 5 get the same
// care as Kuala Lumpur: Intramuros by calesa, George Town's murals and clan
// jetties, Cebu's candle sellers and fort, Melaka's river of lanterns.
export const SHEET = {
  series: 'twocities',
  scenes: {
    'twocities-churchnave': { prompt: 'Inside a four hundred year old stone church: a deep hushed echo, footsteps on old tiles, candles flickering, a wooden pew creaking, a choir of birds outside high windows, no music, no voices', synth: ['cave', 'hush'], spots: [['drip', 0.05]] },
    'twocities-walls': { prompt: 'On top of old Spanish colonial city walls at night: a warm wind, old cannons ticking as they cool, city traffic and jeepney horns below, church bells far off, no music, no voices', synth: ['wind', 'traffic'], spots: [['carHorn', 0.03]], around: [['jeepney', 0.01]] },
    'twocities-murals': { prompt: 'A heritage street of old shophouses in George Town, Penang: tourists chatting softly with no clear words, a trishaw bell, a scooter, a cafe espresso machine, sparrows, no music', synth: ['crowd', 'traffic'], spots: [['clink', 0.06]], around: [['motorbike', 0.012], ['twocities-trishaw', 0.008]] },
    'twocities-fort': { prompt: 'Low stone walls of an old seaside fort on a green field: sea breeze, flags flapping, ferries hooting across a channel, crows calling, no music, no voices', synth: ['wind', 'lapping'], spots: [['bird', 0.05]] },
    'twocities-temples': { prompt: 'Narrow lanes past old Chinese temples in the evening: incense smoke, a temple bell rung softly, a coffee shop clattering, scooters, people chatting with no clear words, no music', synth: ['crowd', 'room'], spots: [['clink', 0.06]], around: [['motorbike', 0.01]] },
    'twocities-jetties': { prompt: 'Old wooden clan jetty houses on stilts over the sea at dusk: water lapping under the planks, boards creaking, a family cooking and chatting inside with no clear words, a fishing boat puttering, no music', synth: ['lapping', 'room'], spots: [['halyard', 0.05]], around: [['twocities-sampan', 0.01]] },
    'twocities-cebu': { prompt: 'A busy plaza by an old basilica in Cebu: candle sellers chanting softly with no clear words, jeepneys roaring past, pigeons, a crowd, church bells, no music', synth: ['crowd', 'traffic'], spots: [['bird', 0.05]], around: [['jeepney', 0.015]] },
    'twocities-sanpedro': { prompt: 'Inside a small triangular stone fort by a busy port: a quiet garden, sea breeze, big ferry horns from the harbour, gulls, schoolchildren sketching and whispering with no clear words, no music', synth: ['wind', 'lapping'], spots: [['gull', 0.04]] },
    'twocities-melakariver': { prompt: 'A slow river through an old colonial town at dusk: river cruise boats humming past, trishaws ringing bells on the bank, cafes chattering with no clear words, monitor lizards splashing, no music', synth: ['river', 'crowd'], spots: [['clink', 0.05]], around: [['twocities-trishaw', 0.012]] },
    'twocities-redsquare': { prompt: 'A red colonial town square in the evening: a clock tower chiming, a fountain splashing, crowds of visitors chatting with no clear words, trishaw bells, no music', synth: ['crowd', 'lapping'], spots: [['clink', 0.05]], around: [['twocities-trishaw', 0.012]] },
    'twocities-hill': { prompt: 'A hilltop with an old stone gateway and church ruins: warm wind through big trees, birds settling, the town humming below, a ship horn far out at sea, no music, no voices', synth: ['wind', 'hush'], spots: [['bird', 0.06]] },
    'twocities-museum': { prompt: 'Inside an old red colonial building that is now a museum: thick walls, a ceiling fan turning, footsteps on wooden floors, a glass case clicking open, hush, no music, no voices', synth: ['room', 'hush'], spots: [['tick', 0.2]] },
  },
  passing: {
    'twocities-trishaw': { prompt: 'A flower covered trishaw pedalling past, its bell ringing, a little speaker crackling cheerfully, fading', seconds: 4, synth: 'car', path: 'pass' },
    'twocities-sampan': { prompt: 'A small wooden boat with an old outboard puttering past under stilt houses, water slapping, fading', seconds: 5, synth: 'boat', path: 'water' },
  },
  cues: {
    'twocities-churchbell': { prompt: 'An old church bell ringing out over a walled city at dusk, a few slow strokes', seconds: 4, sting: 'bellring', wait: 3 },
    'twocities-hooves': { prompt: 'A horse drawn carriage pulling up on cobblestones, hooves clopping to a stop, a friendly snort and a little bell', seconds: 3, sting: 'chime' },
    'twocities-temple': { prompt: 'A small brass temple bell struck once and ringing gently in incense filled air', seconds: 3, sting: 'chime' },
    'twocities-ferryhorn': { prompt: 'A big island ferry sounding a deep horn across a harbour', seconds: 3, sting: 'horn' },
    'twocities-candles': { prompt: 'A bundle of candles being lit, a match striking, wax crackling, soft chanting far off with no clear words', seconds: 3, sting: 'rush' },
    'twocities-key': { prompt: 'Two old keys turning in a lacquered box lock, one click then another, the lid creaking open', seconds: 3, sting: 'click' },
  },
  episodes: {
    'twocities-kl': {}, // already the model: its sounds are in the story file
    'twocities-manila': {
      9: { fx: 'twocities-hooves' },
      17: { scene: 'twocities-walls', fx: 'twocities-churchbell' },
      19: { scene: 'twocities-churchnave' },
    },
    'twocities-penang': {
      4: { scene: 'twocities-murals' },
      8: { scene: 'twocities-fort', fx: 'twocities-ferryhorn' },
      13: { fx: 'whoosh' },
      14: { fx: 'whoosh' },
      15: { spatial: 'twocities-sampan' },
      16: { scene: 'twocities-temples', fx: 'twocities-temple' },
      17: { scene: 'twocities-jetties' },
      20: { fx: 'squelch' },
    },
    'twocities-cebu': {
      0: { scene: 'twocities-cebu' },
      3: { fx: 'twocities-candles' },
      8: { scene: 'twocities-sanpedro', fx: 'twocities-ferryhorn' },
      12: { fx: 'whoosh' },
      13: { fx: 'whoosh' },
      14: { spatial: 'twocities-sampan' },
      19: { fx: 'squelch' },
      23: { scene: 'twocities-cebu', fx: 'twocities-candles' },
    },
    'twocities-melaka': {
      0: { scene: 'twocities-melakariver' },
      3: { spatial: 'twocities-trishaw' },
      8: { scene: 'twocities-hill', fx: 'twocities-churchbell' },
      13: { fx: 'whoosh' },
      14: { fx: 'whoosh' },
      15: { scene: 'twocities-melakariver', spatial: 'twocities-sampan' },
      16: { scene: 'twocities-redsquare' },
      19: { fx: 'squelch' },
      22: { scene: 'twocities-museum' },
      23: { fx: 'twocities-key' },
    },
  },
}
