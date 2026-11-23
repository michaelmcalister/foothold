// Deep Cover (missions/series/deepcover.js): Melbourne spy nights. The
// laneways, the clocks at Flinders Street, the Yarra, the MCG, St Kilda
// pier with its penguins, and Puffing Billy into the Dandenongs mist.
export const SHEET = {
  series: 'deepcover',
  scenes: {
    'deepcover-flinders': { prompt: 'A busy Melbourne street corner outside a grand old railway station at night: trams grinding and clanging bells, crowds pouring down station steps chatting with no clear words, light rain, buses, no music', synth: ['traffic', 'crowd'], spots: [['dcTramBell', 0.06]], around: [['melbtram', 0.015], ['chatter', 0.01]] },
    'deepcover-centreplace': { prompt: 'A narrow Melbourne cafe laneway late at night: shutters down, chairs stacked, rain dripping off awnings onto bluestone, an extractor fan humming, a far off tram, no music, no voices', synth: ['rain', 'room'], spots: [['drip', 0.6]], around: [['melbtram', 0.006]] },
    'deepcover-yarra': { prompt: 'A river bank beside old rowing sheds at night: water slapping against a boat ramp, oars knocking on racks, a cold breeze, city traffic across the river, ducks, no music, no voices', synth: ['lapping', 'traffic'], spots: [['halyard', 0.05]] },
    'deepcover-bridge': { prompt: 'On an old stone river bridge in a city at night: trams rumbling across, wind over the water, footsteps, a ferry engine below, no music, no clear words', synth: ['traffic', 'wind'], spots: [['dcTramBell', 0.04]], around: [['melbtram', 0.012]] },
    'deepcover-rooftops': { prompt: 'On flat city rooftops at night: wind gusting, air conditioning units humming and rattling, a gravel roof crunching, traffic and tram bells far below, no music, no voices', synth: ['gusts', 'machine'], spots: [['dcTramBell', 0.03]] },
    'deepcover-stkilda': { prompt: 'A seaside foreshore near midnight: palm trees rattling in a cold wind, small waves on the beach, a tram rumbling along the esplanade, gulls, an old amusement park creaking, no music, no voices', synth: ['wind', 'lapping'], spots: [['gull', 0.04]], around: [['melbtram', 0.008]] },
    'deepcover-lunapark': { prompt: 'Outside a closed old amusement park at night: a wooden roller coaster creaking in the wind, loose signs rattling, a flag snapping, a gate chain clinking, no music, no voices', synth: ['gusts', 'room'], spots: [['clink', 0.06]] },
    'deepcover-pier': { prompt: 'A long timber pier at night: planks drumming underfoot, waves sloshing under the pier, little penguins calling and braying from the rocks, a boat engine far out, cold wind, no music, no voices', synth: ['lapping', 'wind'], spots: [['bird', 0.08]], around: [['boat', 0.01]] },
    'deepcover-puffingbilly': { prompt: 'Riding an old steam train through forest at dawn: steam engine chuffing, carriage wheels clacking over a timber trestle, the wooden carriage creaking, a whistle far ahead, no music, no voices', synth: ['traffic', 'room'], spots: [['tick', 0.3]], around: [['puffer', 0.006]] },
    'deepcover-forest': { prompt: 'Tall mountain ash forest in morning mist: heavy drips from tree ferns, a lyrebird mimicking a long run of other birds’ calls, a whipbird, a creek, a steam train far off, no music, no voices', synth: ['hush', 'river'], spots: [['drip', 0.5], ['dcBellbird', 0.06]] },
    'deepcover-lookout': { prompt: 'A forest lookout on a misty ridge: mist drifting, wind sighing through tall trees, a kookaburra far off, a log creaking, a steam whistle echoing up the valley, no music, no voices', synth: ['wind', 'hush'], spots: [['bird', 0.04]] },
  },
  passing: {},
  cues: {
    'deepcover-brick': { prompt: 'A loose brick scraped out of an old laneway wall, grit falling, a small envelope rustling behind it', seconds: 2, sting: 'creak' },
    'deepcover-oar': { prompt: 'A wooden rowing oar lifted off a rack and knocked against another, hollow and echoing', seconds: 2, sting: 'thunk' },
    'deepcover-burr': { prompt: 'A tiny tracking device beeping softly twice, a small electronic chirp', seconds: 2, sting: 'beeps' },
  },
  episodes: {
    'deepcover-courier': {
      1: { scene: 'deepcover-flinders' },
      9: { scene: 'laneway' },
      10: { scene: 'deepcover-centreplace', fx: 'deepcover-brick' },
      18: { scene: 'laneway' },
      24: { scene: 'deepcover-flinders' },
    },
    'deepcover-clocks': {
      0: { scene: 'deepcover-flinders' },
      9: { scene: 'deepcover-yarra' },
      12: { fx: 'deepcover-oar' },
      16: { scene: 'deepcover-yarra' },
      17: { scene: 'deepcover-bridge' },
      22: { fx: 'deepcover-burr' },
      24: { scene: 'deepcover-flinders' },
    },
    'deepcover-quarter': {
      4: { scene: 'deepcover-rooftops', spatial: 'helicopter' },
      19: { fx: 'deepcover-burr' },
      29: { scene: 'deepcover-flinders' },
    },
    'deepcover-pier': {
      0: { scene: 'deepcover-stkilda' },
      1: { fx: 'deepcover-burr' },
      3: { scene: 'deepcover-lunapark' },
      8: { scene: 'deepcover-pier' },
      14: { fx: 'sydney-penguins' },
      23: { fx: 'deepcover-burr' },
    },
    'deepcover-mist': {
      5: { scene: 'deepcover-puffingbilly' },
      17: { scene: 'deepcover-forest', spatial: 'kookaburra' },
      20: { fx: 'deepcover-burr' },
      28: { scene: 'deepcover-lookout' },
    },
  },
}
