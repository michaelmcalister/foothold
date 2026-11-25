// The Nobbys Signal (missions/series/nobbys.js): round Newcastle harbour.
// The harbour mouth at dawn, Pop Stan's shed, Nobbys Beach and the park
// behind it, the convict breakwater out to the headland, the clifftop path
// and the Bogey Hole cut into the rock.
export const SHEET = {
  series: 'nobbys',
  scenes: {
    'nobbys-dawn': { prompt: 'A harbour mouth at dawn in Newcastle, New South Wales: small waves washing on a breakwater, a tug engine idling far off, gulls calling, a steady sea breeze, a coal ship horn very far out at sea, no music, no voices', synth: ['lapping', 'wind'], spots: [['gull', 0.06]], around: [['nobbys-tug', 0.008]] },
    'nobbys-shed': { prompt: 'Inside an old backyard tin shed on a warm morning: boxes being shifted on a concrete floor, tools clinking in a drawer, a corrugated iron roof ticking in the sun, a radio crackling softly, magpies outside, no music, no voices', synth: ['room', 'hush'], spots: [['clink', 0.12], ['bird', 0.04]] },
    'nobbys-beach': { prompt: 'An Australian city surf beach in the early morning: steady surf breaking and fizzing on firm sand, a light onshore wind, gulls calling, a lifesaver whistle far off, no music, no voices', synth: ['surf', 'wind'], spots: [['wavecrash', 0.08], ['gull', 0.05]], around: [['nobbys-gulls', 0.01]] },
    'nobbys-park': { prompt: 'A grassy foreshore park behind a beach: wind in tall Norfolk pines, sprinklers ticking, a magpie carolling, joggers passing, the surf rumbling beyond the dunes, no music, no voices', synth: ['wind', 'insects'], spots: [['bird', 0.07]], around: [['magpie', 0.01]] },
    'nobbys-breakwater': { prompt: 'Walking out along a long stone breakwater at a harbour entrance: waves slapping on big rocks on one side, calm harbour water lapping on the other, a strong sea breeze, gulls, a fishing line whirring, no music, no voices', synth: ['lapping', 'gusts'], spots: [['gull', 0.06], ['halyard', 0.04]], around: [['nobbys-tug', 0.008]] },
    'nobbys-clifftop': { prompt: 'A clifftop path above the sea in an old city park: wind in the grass, big waves booming on the rocks below, a few people walking past with no clear words, a lorikeet flock in a tree, no music', synth: ['gusts', 'surf'], spots: [['lorikeet', 0.05], ['wavecrash', 0.05]], around: [['lorikeets', 0.008]] },
    'nobbys-bogeyhole': { prompt: 'A rock pool cut into a sea platform below cliffs: waves surging over the pool edge and pouring back out, water gurgling through rock channels, spray hissing, gulls, no music, no voices', synth: ['surf', 'lapping'], spots: [['wavecrash', 0.1], ['drip', 0.1]], around: [['nobbys-gulls', 0.008]] },
  },
  passing: {
    'nobbys-tug': { prompt: 'A harbour tug boat chugging past a breakwater, a deep diesel engine throbbing, water churning behind it, fading towards the harbour', seconds: 6, synth: 'boat', path: 'water' },
    'nobbys-gulls': { prompt: 'Two silver gulls flying past squabbling and calling over a beach, fading away', seconds: 4, synth: 'bird', path: 'over' },
  },
  cues: {
    'nobbys-sheddoor': { prompt: 'An old tin shed door being dragged open, metal scraping on concrete with a long rusty creak', seconds: 3, sting: 'creak' },
    'nobbys-notebook': { prompt: 'A small old paper notebook being opened, a few dry pages flicked over by a thumb', seconds: 2, sting: 'click' },
    'nobbys-radio': { prompt: 'A handheld two way radio clicking on with a short burst of static and a squelch', seconds: 2, sting: 'squelch' },
    'nobbys-binoculars': { prompt: 'A pair of old binoculars lifted from a leather case, the focus wheel turning with a soft click', seconds: 2, sting: 'click' },
    'nobbys-shiphorn': { prompt: 'A big coal ship sounding one long deep horn blast far out at sea, echoing across a harbour', seconds: 5, sting: 'horn' },
    'nobbys-wave': { prompt: 'A wave surging over the edge of a rock pool, a heavy splash, then water pouring back out through the rocks', seconds: 3, sting: 'splash' },
    'nobbys-photo': { prompt: 'An old stiff photograph slid out from the back cover of a notebook, a crisp papery flick', seconds: 2, sting: 'click' },
    'nobbys-flash': { prompt: 'Three soft bright bell chimes in a row, evenly spaced, like a light flashing three times, then a quiet pause', seconds: 4, sting: 'chime' },
  },
  episodes: {
    'nobbys-flashes': {
      0: { scene: 'nobbys-dawn' },
      2: { scene: 'nobbys-shed', fx: 'nobbys-sheddoor' },
      3: { fx: 'nobbys-notebook' },
      4: { fx: 'nobbys-radio' },
      7: { fx: 'nobbys-flash' },
      9: { scene: 'nobbys-beach', fx: 'whoosh' },
      10: { spatial: 'nobbys-tug' },
      11: { fx: 'nobbys-shiphorn' },
      13: { fx: 'nobbys-binoculars' },
      15: { scene: 'nobbys-beach', fx: 'whoosh' },
      16: { scene: 'nobbys-park', fx: 'whoosh' },
      17: { spatial: 'nobbys-gulls' },
      18: { spatial: 'magpie' },
      19: { scene: 'nobbys-breakwater' },
      21: { fx: 'nobbys-notebook' },
      24: { scene: 'nobbys-clifftop', fx: 'whoosh' },
      25: { scene: 'nobbys-bogeyhole', fx: 'nobbys-wave' },
      26: { spatial: 'nobbys-gulls' },
      29: { fx: 'nobbys-photo' },
      31: { scene: 'nobbys-clifftop' },
      33: { fx: 'nobbys-flash' },
    },
  },
}
