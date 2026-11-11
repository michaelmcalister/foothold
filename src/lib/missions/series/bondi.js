// Breakers: a dawn mystery at Bondi Beach. It's Sculpture by the Sea week,
// and a giant bronze whale tail has vanished overnight from the coast walk.
// Nikki, a young lifesaver on dawn patrol, and Stan, an old Iceberg who
// swims every morning, help you follow a trail of trolley tracks from the
// Icebergs pool to the cliffs at North Bondi, where the ancient rock
// engravings of a whale and a shark explain what the sculpture was about.
// It turns out two art students wanted a sunrise photo. Nobody needs rescuing.
//
// Pure data (imports nothing): series/index.js hands it on. Same beat format
// as signal.js. Sounds come from audio/kits/locals.js.
//
// History and trivia were checked with a web search (November 2026):
//   - Bondi comes from a Dharawal word for a loud thud, like waves breaking
//     over rocks; the beach is about a kilometre long (Bondi Beach, Wikipedia)
//   - the Bondi Surf Bathers' Life Saving Club began in 1907, as did North
//     Bondi; Bondi members Ormsby, Flynn and Fullwood are credited with the
//     surf reel in 1906 (Life saving reel, Wikipedia)
//   - on 6 February 1938, Black Sunday, over 250 people were rescued
//   - the Bondi Pavilion opened in 1929; the Icebergs club began in 1929, and
//     members had to swim three Sundays in four, for five years
//   - the first tramway to the beach opened in 1884
//   - Sculpture by the Sea is held at Bondi each November
//   - the engravings near the Bondi golf course include an eight metre whale
//     and a shark (hikingtheworld.blog, Waverley Council)
//
// Real people are only mentioned, never voiced. House rules: tense, never
// cruel, nobody is hurt, and the beach is always respected.

const line = (who, text) => ({ who, text })

const RESULTS = {
  'bd-nikki': {
    success: line('bd-nikki', '[excited] Ripper running! Ease right back now.'),
    okay: line('bd-nikki', 'You made it, and that is what counts. Ease right back now.'),
    half: line('bd-nikki', 'Halfway! Dig in!'),
  },
}
const EASY = line('bd-nikki', 'Easy on the pace. Lifesavers save their energy for when it counts.')
const surge = (at, seconds, who, say, recover, extra = {}) => ({ at, kind: 'surge', seconds, who, say, recover, ...RESULTS[who], ...extra })

export const SAGA = {
  id: 'bondi',
  title: 'Breakers',
  blurb: 'Bondi at sunrise. A giant bronze sculpture has vanished from the coast walk, and the trail leads past the Icebergs to the cliffs.',
  note: 'Real Bondi places and history, with a made up mystery. The trivia is all true. Look at rock engravings, but never walk on them.',
  narrator: 'bondi-narrator',
  score: 'locals',
  isNew: true,
}

export const EPISODES = [
  {
    id: 'bondi-breakers',
    episode: 1,
    saga: 'bondi',
    title: 'The Whale Tail',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'Sculpture by the Sea week at Bondi, and a 200 kilo bronze whale tail has gone walkabout. Follow the trolley tracks at dawn.',
    place: { name: 'Bondi Beach', lat: -33.8915, lng: 151.2767 },
    loop: line('bd-nikki', 'You ran a loop! Like a lifesaver’s patrol. Up the beach, back again. Nice.'),
    early: line('bd-nikki', 'Calling it there is fine. Grab a coffee on the promenade. The whale tail can wait.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'First light', scene: 'surfdawn', say: 'Bondi Beach, twenty to six in the morning. The sun is climbing out of the ocean, and the first swimmers are already in. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', say: 'Bondi is about a kilometre of golden sand. Its name comes from a Dharawal word for a loud thud, like waves breaking over rocks.' },
      { at: 100, kind: 'story', who: 'bd-nikki', fx: 'whistle', say: 'Morning! Nikki, Bondi lifesavers, dawn patrol. Got a weird one for you. A sculpture has gone missing. A big one.' },
      { at: 155, kind: 'story', who: 'bd-nikki', say: 'It is Sculpture by the Sea week. The coast walk is full of art. And overnight, a giant bronze whale tail disappeared from Tamarama.' },
      { at: 210, kind: 'story', who: 'bd-ana', say: '[sighs] Hi. Ana. I made it. It weighs two hundred kilos. It did not swim away by itself. Did it?' },
      { at: 260, kind: 'quiz', who: 'bd-nikki', say: 'While you warm up. Bondi’s surf lifesaving club is one of the oldest in the world. When did it start?',
        options: [{ key: 'A', label: '1907' }, { key: 'B', label: '1956' }, { key: 'C', label: '1888' }], answer: 'A',
        right: line('bd-nikki', '1907! Some say it was the very first. Plenty of other clubs would argue about that.'),
        wrong: line('bd-nikki', 'It was 1907. Some say it was the very first. Plenty of other clubs would argue about that.') },
      surge(330, 30, 'bd-nikki', 'Pick it up for 30 seconds south along the sand to the Icebergs!', 110, { chapter: 'South end', fx: 'whoosh' }),
      { at: 410, kind: 'story', spatial: 'chatter', say: 'At the south end, waves crash right over the edge of the Icebergs pool. A row of old swimmers sit wrapped in towels, sipping tea.' },
      { at: 465, kind: 'story', who: 'bd-stan', say: 'Stan. Icebergs member, fifty years. In the old days you had to swim three Sundays out of four, all winter, for five years. Toughens you up.' },
      { at: 520, kind: 'quiz', who: 'bd-stan', say: 'Test for you. When did the Icebergs club begin?',
        options: [{ key: 'A', label: '1929' }, { key: 'B', label: '1979' }, { key: 'C', label: '1907' }], answer: 'A',
        right: line('bd-stan', '1929. Same year the Bondi Pavilion opened. Good year for Bondi.'),
        wrong: line('bd-stan', 'It was 1929. Same year the Bondi Pavilion opened. Good year for Bondi.') },
      { at: 585, kind: 'story', who: 'bd-stan', say: '[mischievously] A whale tail, you say? I might have seen two art students with a trolley. Heading north. Up past the golf course.' },
      { at: 635, kind: 'choice', id: 'way', who: 'bd-nikki', say: 'North end! Along the sand, or up on the promenade?',
        options: [
          { key: 'A', label: 'Along the sand', flag: 'sand', say: line('bd-nikki', 'The sand! Great for your calves. Terrible for your shoes.') },
          { key: 'B', label: 'The promenade', flag: 'prom', say: line('bd-nikki', 'The promenade. Fast and flat. Dodge the dogs.') },
        ],
        default: 'B', timeout: line('bd-nikki', 'The promenade, then. Go!') },
      surge(685, 30, 'bd-nikki', 'Along the sand! Pick it up for 30 seconds!', 110, { if: 'sand', chapter: 'North end', fx: 'whoosh' }),
      surge(686, 30, 'bd-nikki', 'Along the promenade! Pick it up for 30 seconds!', 110, { unless: 'sand', chapter: 'North end', fx: 'whoosh' }),
      { at: 765, kind: 'story', if: 'sand', say: 'Soft sand burns your legs. A wave chases you up the beach and fizzes round your ankles.' },
      { at: 766, kind: 'story', unless: 'sand', say: 'Along the promenade, past the painted sea wall, the Pavilion and a dozen dogs having the best morning of their lives.' },
      { at: 820, kind: 'story', say: 'North Bondi. The path climbs past the golf course towards the cliffs. Something heavy has left two long trolley tracks in the grass.' },
      { at: 875, kind: 'steady', seconds: 150, chapter: 'The cliffs', say: 'Settle into an easy pace along the cliff top while Nikki radios the patrol tower.', easyNudge: EASY },
      { at: 905, kind: 'story', who: 'bd-nikki', say: 'Fun fact from the club. Bondi members helped invent the surf reel around 1906. A rope on a big spool, so a lifesaver could swim out and be pulled back in.' },
      { at: 965, kind: 'quiz', who: 'bd-nikki', say: 'In February 1938, Bondi lifesavers made their biggest rescue ever. About how many people did they help out of the surf?',
        options: [{ key: 'A', label: 'Over 250' }, { key: 'B', label: 'About 30' }, { key: 'C', label: 'About 80' }], answer: 'A',
        right: line('bd-nikki', 'Over 250, in one afternoon. People call it Black Sunday. It is why we never stop training.'),
        wrong: line('bd-nikki', 'It was over 250, in one afternoon. People call it Black Sunday. It is why we never stop training.') },
      { at: 1035, kind: 'story', fx: 'found', say: 'Near the cliff edge, the trolley tracks stop. On a flat rock there are carvings. A huge whale, eight metres long, with a shark beside it.' },
      { at: 1090, kind: 'story', who: 'bd-ana', say: '[curious] Oh. Oh, wow. The whale. That is what my sculpture is about. I read about these carvings, but I have never seen them.' },
      { at: 1140, kind: 'story', say: 'Aboriginal people carved these figures into the sandstone long ago. They are precious. Look closely, but never walk on them.' },
      surge(1195, 45, 'bd-nikki', 'There! Two students with a trolley, heading down to the beach! Pick it up for 45 seconds and catch them!', 120, { chapter: 'The trolley', fx: 'whistle' }),
      { at: 1280, kind: 'story', say: 'You catch up at the north end ramp. Two puffed out art students, and a giant bronze whale tail on a trolley.' },
      { at: 1330, kind: 'story', who: 'bd-ana', say: '[laughs] They wanted a sunrise photo of it standing in the water, for their art school project. They were going to bring it back. Probably.' },
      { at: 1385, kind: 'story', who: 'bd-nikki', say: 'Right. Lifesavers can help. We have a big trolley and very strong arms. Photo first, then it all goes back to Tamarama.' },
      { at: 1430, kind: 'steady', seconds: 150, scene: 'surfdawn', chapter: 'Sunrise', say: 'The whale tail stands in the shallows, gold in the sunrise. Everyone takes a photo. Cool down with an easy jog or a walk along the water.', easyNudge: EASY },
      { at: 1460, kind: 'quiz', who: 'bd-stan', say: 'Last one from me. From 1884, how did people from the city start getting to Bondi?',
        options: [{ key: 'A', label: 'By tram' }, { key: 'B', label: 'By ferry' }, { key: 'C', label: 'By camel' }], answer: 'A',
        right: line('bd-stan', 'By tram! Packed every summer Sunday, from the city to the sand.'),
        wrong: line('bd-stan', 'It was by tram. Packed every summer Sunday, from the city to the sand.') },
      { at: 1515, kind: 'finale', say: 'The Whale Tail is solved. One sculpture found, one sunrise photo, and nobody needed rescuing. Thank you, Runner.' },
    ],
  },
]

export const CHAIN = ['bondi-breakers']

export const CAST = {
  'bondi-narrator': { name: 'Narrator', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.9, rate: 0.98 }, // Lee
  'bd-nikki': { name: 'Nikki', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.2, rate: 1.06, radio: true }, // Ruby, on the patrol radio
  'bd-stan': { name: 'Stan', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.96 }, // Jimbo
  'bd-ana': { name: 'Ana', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.05, rate: 1.02, radio: true }, // Eva
}

export const LOOK = { accent: '#FF9E6D', deep: '#0F2A3D', tag: 'Local mystery' }

export const LIBRARY = {
  ambience: {
    surfdawn: 'Bondi Beach in Sydney at sunrise: steady surf rolling in and washing up the sand, a fresh sea breeze, silver gulls calling, a few early swimmers splashing and chatting far off with no clear words, no music',
  },
  sfx: {},
  tracks: {},
}
