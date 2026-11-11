// The Major's Hill: a Mount Druitt heritage relay goes sideways. Jayden, the
// anchor runner, read the clue sheet upside down and caught a train to Rooty
// Hill with the baton, a copy of an old surveyor's marker. Mele, who runs
// the relay, sends you after him, from The Manse past the station to Rooty
// Hill, then on to the old Penfolds jet at Minchinbury, where the relay
// finishes backwards and Tita Joy has pandesal waiting.
//
// Pure data (imports nothing): series/index.js hands it on. Same beat format
// as signal.js. Sounds come from audio/kits/locals.js.
//
// History and trivia were checked with a web search (November 2026):
//   - Major George Druitt (1773 to 1842) came out with the 48th Regiment in
//     1817 and oversaw roads and bridges around Sydney, built by convicts; he
//     named his land grant Mount Druitt and died there in 1842 (Wikipedia)
//   - The Manse, a Georgian cottage on The Avenue, houses the Mt Druitt
//     Historical Society
//   - Watkin Tench led the first recorded exploration here in 1789; the
//     Darug people lived across the area (Rooty Hill, Wikipedia)
//   - Governor King named Rooty Hill after a hill on Norfolk Island where
//     tree roots made digging hard; Rooty Hill station opened on 23 December
//     1861 as the end of the Main Western line, which reached St Marys in 1862
//   - Mount Druitt station opened on 19 August 1881
//   - Rooty Hill RSL is described as the largest licensed club in NSW
//   - Minchinbury: Captain William Minchin's grant of 1819; vines from the
//     1860s; Penfolds bought it in 1913, famous for its champagne, and stopped
//     in 1978; a jet stood at the winery gate (Minchinbury, Wikipedia)
//
// Real people are only mentioned, never voiced. House rules: tense, never
// cruel, nobody is hurt, and the lost runner is found safe and fed.

const line = (who, text) => ({ who, text })

const RESULTS = {
  'md-mele': {
    success: line('md-mele', '[excited] Chur! That was quick! Ease right back now.'),
    okay: line('md-mele', 'You got there, and that is what counts. Ease right back now.'),
    half: line('md-mele', 'Halfway! Keep it going!'),
  },
}
const EASY = line('md-mele', 'Easy, easy. It is a relay, not a race. Well, it is a race. But pace yourself.')
const surge = (at, seconds, who, say, recover, extra = {}) => ({ at, kind: 'surge', seconds, who, say, recover, ...RESULTS[who], ...extra })

export const SAGA = {
  id: 'druitt',
  title: 'The Major’s Hill',
  blurb: 'A Mount Druitt heritage relay goes sideways when the anchor runner catches the wrong train. Chase him from The Manse to Rooty Hill and Minchinbury.',
  note: 'Real Mount Druitt places and history, with a made up relay. The trivia is all true.',
  narrator: 'druitt-narrator',
  score: 'locals',
  isNew: true,
}

export const EPISODES = [
  {
    id: 'druitt-relay',
    episode: 1,
    saga: 'druitt',
    title: 'The Backwards Relay',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'The heritage relay’s anchor runner has caught the wrong train, with the baton. Follow him from Mount Druitt to Rooty Hill and Minchinbury.',
    loop: line('md-mele', 'A loop! You basically ran the relay twice. Respect.'),
    early: line('md-mele', 'Stopping there is all good. Jayden will turn up. He always does. Eventually.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'The Manse', scene: 'suburb', say: 'Mount Druitt, on a hot Saturday morning. Outside The Manse, an old Georgian cottage, kids in bright bibs are warming up for a relay. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', spatial: 'lorikeets', say: 'This is Darug Country. In 1789, Watkin Tench’s party walked through this land. Later, a soldier called George Druitt arrived. You will hear about him.' },
      { at: 100, kind: 'story', who: 'md-mele', fx: 'squelch', say: 'Hey! Mele here, I run the heritage relay. You are our mystery runner? Brilliant. Tiny problem. Our anchor runner has gone missing. With the baton.' },
      { at: 155, kind: 'story', who: 'md-bruce', say: 'Bruce, from the historical society. The baton is a copy of an old surveyor’s marker. The Major built roads, you see. This whole place is named after him.' },
      { at: 210, kind: 'quiz', who: 'md-bruce', say: 'Major George Druitt came out with his regiment in 1817. What did he look after around Sydney?',
        options: [{ key: 'A', label: 'Roads and bridges' }, { key: 'B', label: 'Gold mines' }, { key: 'C', label: 'Ships' }], answer: 'A',
        right: line('md-bruce', 'Roads and bridges, built by convicts. He named his land grant Mount Druitt, and he stayed here until 1842.'),
        wrong: line('md-bruce', 'It was roads and bridges, built by convicts. He named his land grant Mount Druitt, and he stayed here until 1842.') },
      { at: 280, kind: 'story', who: 'md-mele', say: '[sighs] Jayden just texted. He is on a train! Wrong platform. He is getting off at Rooty Hill. Go, go, go!' },
      surge(320, 30, 'md-mele', 'Pick it up for 30 seconds to the station!', 110, { chapter: 'Platform', fx: 'trainhorn' }),
      { at: 400, kind: 'story', scene: 'station', spatial: 'sydneytrain', say: 'Mount Druitt station hums. A double deck train glides out towards the city. The first trains stopped here in 1881.' },
      { at: 455, kind: 'story', who: 'md-mele', say: 'Jayden says he will wait at Rooty Hill station. He sounds very sorry. And very hungry.' },
      { at: 505, kind: 'quiz', who: 'md-mele', say: 'Quick one. Rooty Hill station opened in 1861. What was special about it back then?',
        options: [{ key: 'A', label: 'End of the line' }, { key: 'B', label: 'Biggest in Sydney' }, { key: 'C', label: 'First electric station' }], answer: 'A',
        right: line('md-mele', 'It was the end of the line! The Western line only reached St Marys the next year.'),
        wrong: line('md-mele', 'It was the end of the line. The Western line only reached St Marys the next year.') },
      surge(570, 30, 'md-mele', 'Run beside the line! Pick it up for 30 seconds to Rooty Hill!', 110, { chapter: 'Rooty Hill', fx: 'whoosh' }),
      { at: 650, kind: 'story', scene: 'suburb', say: 'Rooty Hill. Governor King named it after a hill on Norfolk Island, where the ground was so full of tree roots you could hardly dig.' },
      { at: 705, kind: 'story', who: 'md-jayden', say: 'Hey. Sorry. Jayden. I had the clue sheet upside down. I thought the next stop was here. Then I thought, I am already here, so I kept going.' },
      { at: 760, kind: 'story', who: 'md-jayden', say: 'The last clue says, finish where the jet points to the bubbles. I do not even know what that means.' },
      { at: 810, kind: 'choice', id: 'way', who: 'md-jayden', say: 'Do we go up over the hill, or round by the RSL?',
        options: [
          { key: 'A', label: 'Over the hill', flag: 'hill', say: line('md-jayden', 'Over the hill. Big views. Big legs.') },
          { key: 'B', label: 'Round by the RSL', flag: 'rsl', say: line('md-jayden', 'Round by the RSL. Flatter. Smart.') },
        ],
        default: 'B', timeout: line('md-jayden', 'Round by the RSL, then. Come on!') },
      surge(860, 30, 'md-mele', 'Over the hill! Pick it up for 30 seconds, Jayden is right behind you!', 110, { if: 'hill', chapter: 'The hill', fx: 'whoosh' }),
      surge(861, 30, 'md-mele', 'Round by the RSL! Pick it up for 30 seconds, Jayden is right behind you!', 110, { unless: 'hill', chapter: 'The hill', fx: 'whoosh' }),
      { at: 940, kind: 'story', if: 'hill', say: 'From the top of the rise, western Sydney spreads out in the haze, rooftops and gum trees, all the way to the Blue Mountains.' },
      { at: 941, kind: 'story', unless: 'hill', say: 'Past the Rooty Hill RSL, said to be the biggest licensed club in New South Wales. The car park is already filling up.' },
      { at: 995, kind: 'steady', seconds: 150, chapter: 'Minchinbury', say: 'Settle into an easy pace towards Minchinbury while Bruce works out the riddle.', easyNudge: EASY },
      { at: 1025, kind: 'story', who: 'md-bruce', say: '[laughs] Where the jet points to the bubbles! Minchinbury! There is an old jet by the highway. It stood at the gate of the Penfolds winery.' },
      { at: 1080, kind: 'quiz', who: 'md-bruce', say: 'The winery is long gone. What did Penfolds make at Minchinbury that was famous?',
        options: [{ key: 'A', label: 'Champagne' }, { key: 'B', label: 'Beer' }, { key: 'C', label: 'Lemonade' }], answer: 'A',
        right: line('md-bruce', 'Champagne! Minchinbury bubbles. Penfolds bought the vineyard in 1913 and ran it until 1978.'),
        wrong: line('md-bruce', 'It was champagne. Minchinbury bubbles. Penfolds bought the vineyard in 1913 and ran it until 1978.') },
      { at: 1145, kind: 'story', who: 'md-joy', say: 'Hoy, runner! Tita Joy, from the bakery. Mele called me. I have cold water and warm pandesal at the finish. And Jayden, your mum is coming.' },
      surge(1200, 45, 'md-mele', 'There is the jet! Pick it up for 45 seconds and finish this relay with Jayden!', 120, { chapter: 'The finish', fx: 'whistle' }),
      { at: 1290, kind: 'story', fx: 'found', say: 'Under the old jet, a ribbon stretches across the footpath. Kids in bibs cheer. Jayden lifts the baton over his head and crosses the line.' },
      { at: 1340, kind: 'story', who: 'md-jayden', say: '[excited] We finished! Kind of the wrong way round. But we finished!' },
      { at: 1385, kind: 'story', who: 'md-mele', say: 'Mount Druitt does things its own way, Runner. Always has. Thank you.' },
      { at: 1425, kind: 'steady', seconds: 150, chapter: 'Pandesal', say: 'Cool down now with an easy jog or a walk, and grab a warm pandesal from Tita Joy.', easyNudge: EASY },
      { at: 1455, kind: 'quiz', who: 'md-joy', say: 'One more before you eat! The Manse, where the relay started. Who lives there now?',
        options: [{ key: 'A', label: 'The historical society' }, { key: 'B', label: 'A bakery' }, { key: 'C', label: 'A footy club' }], answer: 'A',
        right: line('md-joy', 'The historical society! Bruce and his friends, with all their old maps and photos. Now eat, eat!'),
        wrong: line('md-joy', 'It is the historical society. Bruce and his friends, with all their old maps and photos. Now eat, eat!') },
      { at: 1515, kind: 'finale', say: 'The Backwards Relay is complete. A lost runner found, a relay finished the wrong way round, and a town full of stories. Thank you, Runner.' },
    ],
  },
]

export const CHAIN = ['druitt-relay']

export const CAST = {
  'druitt-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.85, rate: 0.98 }, // Peter Michael
  'md-mele': { name: 'Mele', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.2, rate: 1.06, radio: true }, // Milly, on the phone
  'md-bruce': { name: 'Bruce', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.85, rate: 0.98, radio: true }, // Scotty
  'md-joy': { name: 'Tita Joy', voiceId: 'ytY8mE6mqKdU3kR6tnVd', pitch: 1.05, rate: 1.02 }, // Jess
  'md-jayden': { name: 'Jayden', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.2, rate: 1.08 }, // Ziggy
}

export const LOOK = { accent: '#7ED957', deep: '#16223A', tag: 'Local mystery' }

export const LIBRARY = {
  ambience: {
    suburb: 'A western Sydney suburb on a warm afternoon: rainbow lorikeets squabbling in gum trees, a distant highway hum, a lawnmower a few streets away, kids playing far off with no clear words, a train passing in the distance, no music',
    station: 'A Sydney suburban railway station platform on a weekend: a few people waiting and chatting quietly with no clear words, an electric hum from the overhead wires, a soft platform chime, birds in nearby trees, no music',
  },
  sfx: {
    'sydney-train': { prompt: 'A Sydney double deck electric suburban train passing through a station at speed, rising motor whine, wheels clacking over rail joints, then fading away', seconds: 7 },
    'lorikeet-flock': { prompt: 'A flock of rainbow lorikeets screeching loudly as they fly fast overhead, from one side to the other', seconds: 3 },
  },
  tracks: {},
}
