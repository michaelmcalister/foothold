// Time Runners (missions/series/timerunners.js): jumps through Australian
// history. Each era sounds like itself: an 1850s gold camp, the Harbour
// Bridge opening in 1932, Melbourne in 1956, Newport in 1983, Homebush 2000.
export const SHEET = {
  series: 'timerunners',
  scenes: {
    'timerunners-goldcamp': { prompt: 'An 1850s gold rush camp: canvas tents flapping, picks striking stone, a cradle rocking and water sloshing through gravel, a horse snorting, miners calling with no clear words, a blacksmith hammer, no music', synth: ['wind', 'crowd'], spots: [['pick', 0.2], ['clink', 0.05]] },
    'timerunners-goldcreek': { prompt: 'A shallow creek on an 1850s goldfield: water rushing over stepping stones, gold pans swirling, a kookaburra laughing, distant picks, no music, no voices', synth: ['river', 'wind'], spots: [['pick', 0.08], ['bird', 0.05]], around: [['kookaburra', 0.01]] },
    'timerunners-goldhill': { prompt: 'A dusty hill track above an old goldfield: dry wind, horses trotting past, a cart creaking, crows calling, no music, no voices', synth: ['wind'], spots: [['bird', 0.04]], around: [['calesa', 0.008]] },
    'timerunners-pylon': { prompt: 'A huge excited crowd in 1932 beside the stone pylon of a brand new harbour bridge: cheering with no clear words, boat horns and ship whistles on the harbour, flags snapping, a biplane overhead, no music', synth: ['crowd', 'wind'], spots: [['clap', 0.08]], around: [['crowdwave', 0.01]] },
    'timerunners-catwalk': { prompt: 'High on a steel bridge arch catwalk above a harbour: a strong wind howling through steel girders, rivets ticking, a crowd roaring faintly far below, gulls, no music, no voices', synth: ['gusts', 'machine'], spots: [['gull', 0.04]] },
    'timerunners-footway': { prompt: 'The footway of a new harbour bridge on opening day: thousands of footsteps on concrete, a crowd chatting happily with no clear words, wind, ferry whistles below, no music', synth: ['crowd', 'wind'], spots: [['clap', 0.05]] },
    'timerunners-1956': { prompt: 'A busy city street in 1956 on the day of a big torch relay: old trams rumbling and ringing bells, a cheering crowd lining the road with no clear words, old car horns, newspaper sellers calling, no music', synth: ['crowd', 'traffic'], spots: [['dcTramBell', 0.06]], around: [['melbtram', 0.012]] },
    'timerunners-arcade': { prompt: 'An old city shopping arcade with a glass roof: footsteps echoing on tiles, shop bells, a crowd murmuring with no clear words, a cash register, pigeons in the roof, no music', synth: ['room', 'crowd'], spots: [['clink', 0.08]] },
    'timerunners-mcg': { prompt: 'A giant sports stadium full to the top in the 1950s on opening day: a vast crowd roaring and cheering with no clear words, a loudspeaker echoing, pigeons, no music', synth: ['crowd', 'storm'], spots: [['clap', 0.1]], around: [['crowdwave', 0.012]] },
    'timerunners-dock': { prompt: 'A busy yacht marina in 1983 during a famous race: halyards clinking on many masts, crews winching and shouting with no clear words, motorboats, gulls, no music', synth: ['lapping', 'wind'], spots: [['halyard', 0.15], ['gull', 0.05]], around: [['boat', 0.012]] },
    'timerunners-hill': { prompt: 'A grassy hill above an old seaside town crowded with race watchers: wind, a cheering crowd far off with no clear words, a spectator boat fleet hooting horns out on the water, no music', synth: ['wind', 'crowd'], spots: [['clap', 0.04]] },
    'timerunners-harbourwall': { prompt: 'Along a stone harbour wall during a yacht race: waves slapping the wall, boat horns tooting, a crowd shouting and cheering with no clear words, a helicopter overhead, no music', synth: ['lapping', 'crowd'], spots: [['clap', 0.05]], around: [['helicopter', 0.008]] },
    'timerunners-cuphall': { prompt: 'Inside a grand old yacht club hall full of people: an excited crowd murmuring with no clear words, glasses clinking, flashbulbs popping, footsteps on polished floors, no music', synth: ['room', 'crowd'], spots: [['clink', 0.12]] },
    'timerunners-stadium': { prompt: 'A huge modern Olympic stadium packed at night: a hundred thousand people roaring and cheering with no clear words, camera flashes, the announcer booming far off, no music', synth: ['crowd', 'storm'], spots: [['clap', 0.12]], around: [['crowdwave', 0.015]] },
    'timerunners-track': { prompt: 'Down on a stadium running track during a big race: spikes slapping the track, a huge crowd roaring and stamping all around with no clear words, a starter gun echo, flashbulbs, no music', synth: ['crowd', 'storm'], spots: [['clap', 0.1]] },
    'timerunners-concourse': { prompt: 'A stadium concourse under the stands: footsteps and crowd noise echoing off concrete, a muffled roar from the arena, food stalls sizzling, a turnstile clanking, no music, no clear words', synth: ['room', 'crowd'], spots: [['clink', 0.06]] },
  },
  passing: {},
  cues: {},
  episodes: {
    'timerunners-gold': {
      5: { scene: 'timerunners-goldcamp' },
      12: { scene: 'timerunners-goldcreek' },
      13: { scene: 'timerunners-goldhill' },
      21: { scene: 'timerunners-goldcamp' },
    },
    'timerunners-bridge': {
      6: { scene: 'timerunners-pylon' },
      15: { scene: 'timerunners-catwalk' },
      16: { scene: 'timerunners-footway' },
      22: { scene: 'timerunners-pylon' },
    },
    'timerunners-torch': {
      0: { scene: 'timerunners-1956' },
      16: { scene: 'timerunners-arcade' },
      19: { scene: 'timerunners-mcg' },
    },
    'timerunners-keel': {
      7: { scene: 'timerunners-dock' },
      19: { scene: 'timerunners-hill' },
      20: { scene: 'timerunners-harbourwall' },
      26: { scene: 'timerunners-cuphall' },
    },
    'timerunners-circle': {
      0: { scene: 'timerunners-stadium' },
      25: { scene: 'timerunners-track' },
      7: { scene: 'timerunners-concourse' },
      13: { scene: 'timerunners-stadium' },
    },
  },
}
