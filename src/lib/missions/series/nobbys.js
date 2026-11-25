// The Nobbys Signal: a mystery series set around Newcastle harbour, NSW.
// Jess, a volunteer lifesaver at Nobbys, helps her pop Stan clear his shed
// and finds his 1958 notebook from the Signal Club: five kids who made a
// riddle trail the year the Nobbys light turned 100, with a tin at the end
// that nobody ever found. Stan watches from his verandah with binoculars and
// talks Jess and the runner through it by radio. Episode 1 follows the first
// riddles from Nobbys Beach along the convict breakwater to the Bogey Hole,
// and turns up a photo of the five kids, one of them a girl called June.
// Nobody is hurt; the runner stays on paths, off the rock platform when the
// swell is up, and well away from the water.
//
// Pure data, laid out with compose.js. Sounds: missions/sound/nobbys.js.
//
// Facts checked (web search, November 2026):
//   - Awabakal and Worimi peoples are acknowledged by the City of Newcastle
//     as descendants of the traditional custodians; the Awabakal knew Nobbys
//     Head as Whibayganba (Nobbys Head, Wikipedia)
//   - Nobbys was an island. Governor Macquarie laid the foundation stone of
//     the convict built breakwater (Macquarie Pier) on 5 August 1818; it was
//     finished by 1846. The island was cut down to 27.5 m because sailing
//     ships lost the wind in its lee, and the rock went into the pier
//     (Nobbys Head, Wikipedia). Its first height is disputed (62 m or 43 m),
//     so the story leaves it out
//   - the Nobbys light was first lit in 1858, designed by Alexander Dawson;
//     it flashes white in groups of three every 20 seconds (Fl (3) W 20s)
//     and reaches about 24 nautical miles (Nobbys Head Light, Wikipedia)
//   - the Pasha Bulker, a 225 m bulk carrier, ran aground on Nobbys Beach on
//     8 June 2007 in a big storm while waiting to load coal; all 22 crew
//     were rescued by the Westpac Rescue Helicopter; she was refloated on
//     2 July 2007 on the third attempt, renamed Drake in 2008, and sails on
//     (Pasha Bulker, Wikipedia)
//   - the Bogey Hole was cut by convicts for Commandant James Morisset in
//     about 1819 or 1820 and first called the Commandant's Baths; enlarged
//     in 1884; on the NSW State Heritage Register since 2003; the earliest
//     known purpose built ocean pool in Australia (Bogey Hole, Wikipedia;
//     NSW Government, Bogey Hole)
//
// Real people (Macquarie, Morisset, the Pasha Bulker's crew) are only
// mentioned, never voiced. The Signal Club, Jess, Stan, Dev, June and the
// notebook are made up.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('nb-jess', '[excited] That was quick, Runner! Ease right back now.'),
  okay: line('nb-jess', 'You got there, and that is what counts. Ease right back now.'),
  half: line('nb-jess', 'Halfway! Keep it rolling!'),
}
const EASY = line('nb-jess', 'Easy now. The light flashes every twenty seconds. It never rushes.')
const base = { saga: 'nobbys', guide: 'nb-jess', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'nobbys',
  title: 'The Nobbys Signal',
  blurb: 'A 1958 notebook from a kids’ club, a riddle trail round Newcastle harbour, and a tin nobody ever found. Pop Stan is watching through his binoculars.',
  note: 'Real Newcastle places and true history. The Signal Club, Jess, Stan and everyone with lines are made up. Stay on the paths, and keep off the rock platforms when the swell is up.',
  narrator: 'nobbys-narrator',
  score: 'locals',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'nobbys-flashes',
    episode: 1,
    next: 'Next time on The Nobbys Signal: the fort on the hill, a big gun that once fired out to sea, and a search for June.',
    title: 'Three Flashes',
    blurb: 'Pop Stan’s shed holds a notebook from 1958: the Signal Club’s riddle trail. Jess needs a runner, from Nobbys Beach out along the convict breakwater.',
    place: { name: 'Nobbys Beach, Newcastle', lat: -32.9196, lng: 151.7890 },
    loop: line('nb-jess', 'A loop! Like the light going round. Out, and all the way back.'),
    early: line('nb-jess', 'Stop there, no worries. The notebook has waited since 1958. It can wait till next time.'),
    open: { scene: 'harbour', chapter: 'Nobbys', text: 'Newcastle, early morning. Coal ships wait in a line out at sea, and the light on Nobbys blinks over the harbour. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Awabakal and Worimi Country. The Awabakal people knew the headland at the harbour mouth as Whibayganba. It holds a place in their stories.'),
      say('nb-jess', '[excited] Morning, Runner! Jess here. I patrol the beach at Nobbys on weekends. Today I am helping my pop clean out his shed. And look what fell out.'),
      say('nb-jess', 'A little notebook. On the cover, in kid writing: The Signal Club, 1958. Top secret. Pop? What is the Signal Club?'),
      say('nb-stan', '[laughs] Stan here, on the radio. I can see you both from my verandah. Got the binoculars out. The Signal Club! Five of us kids, the year the light turned one hundred.'),
      say('nb-stan', 'We made a riddle trail round the harbour. At the end, we hid a tin. Nobody ever found the end. And I lost the last page years ago. Oh, this takes me back.'),
      say('nb-stan', 'The light was first lit in 1858. So in 1958 it turned one hundred, and we reckoned that was worth a secret club. Still blinking every night.'),
      say('nb-jess', '[curious] Riddle one. Count my flashes, then count to twenty. The number is your first word. Pop, that is the lighthouse, right?'),
      quiz('nb-stan', 'How many times does the Nobbys light flash in each group?', ['Three', 'One', 'Seven'], 'Three white flashes, then dark, every twenty seconds. That is how ships know it is Nobbys.'),
      dash(30, 'First word, three! Pick it up for 30 seconds along the beach!', { chapter: 'Nobbys Beach', fx: 'whoosh' }),
      say(null, 'The sand is firm by the water and the surf thumps in. Out past the breakers, a tug chugs by towards the harbour mouth.', { spatial: 'boat' }),
      say('nb-jess', 'In 2007 a huge ship sat right here on this sand. I was nine. The whole town came down to look. Pop brought a thermos and stayed all day.'),
      quiz('nb-jess', 'Which ship ran aground on Nobbys Beach in June 2007?', ['The Pasha Bulker', 'The Maheno', 'The Catalpa'], 'In a huge storm. All 22 crew were lifted off safely by the rescue helicopter. She was floated off a few weeks later.'),
      say('nb-stan', '[curious] Riddle two, if I remember it. Walk the long arm the convicts made, to the island that is not an island. That is the breakwater, love.'),
      choice('nb-jess', 'way', 'To the breakwater! Along the sand, or through the park behind the beach?',
        { label: 'Along the sand', line: 'The sand! Stay up near the dunes.', dash: 'Along the sand! Pick it up for 30 seconds!', after: 'Along the sand, a pair of gulls squabble over a chip. The long stone wall of the breakwater runs out ahead, straight to the headland.' },
        { label: 'Through the park', line: 'The park! Mind the sprinklers.', dash: 'Through the park! Pick it up for 30 seconds!', after: 'Through the park, a magpie carols from a pine. Past the trees, the long stone wall of the breakwater runs out to the headland.' },
        'The sand, then. Go!'),
      steady('Settle into an easy pace out along the breakwater path while Stan reads the next page.', { chapter: 'The breakwater' }),
      quiz('nb-stan', 'Convicts joined the island to the shore with this breakwater. When was it finished?', ['1846', '1946', '1788'], 'Governor Macquarie laid the first stone in 1818. Twenty eight years of hard work to reach the island.'),
      say('nb-jess', 'Pop, the notebook says, ask the island why it shrank. That is your second word. Why did it shrink?'),
      quiz('nb-stan', 'Nobbys was once taller. Why did they cut the top off?', ['It stole ships’ wind', 'To fit a car park', 'To see the whales'], 'Sailing ships lost the breeze in its shadow. So they cut it down, and the rock went into this very breakwater.'),
      say('nb-stan', '[laughs] Wind! That was it! Second word, wind. Then riddle three. Where the commandant took his bath. Ha. June wrote that one. She thought it was hilarious.'),
      dash(45, 'To the commandant’s bath! Pick it up for 45 seconds back along the wall!', { chapter: 'The bath', fx: 'whoosh' }),
      say(null, 'South of the beaches, below a grassy park on the cliffs, a pool is cut square into the rock. Waves pour over its edge, then slowly drain away.'),
      say('nb-dev', 'G’day. Dev, I help look after the old sites round here. Lovely spot. One rule. When the swell is up, stay up top and watch from the path.'),
      quiz('nb-dev', 'Convicts cut this pool around 1820. Who was it made for?', ['The commandant', 'The surf club', 'The lighthouse cat'], 'James Morisset ran the convict settlement. It was first called the Commandant’s Baths. Now everyone calls it the Bogey Hole.'),
      say('nb-jess', '[curious] Three. Wind. Bath. Pop, those words do not make sense yet. Hang on. There is something tucked in the back cover.'),
      say('nb-jess', '[whispers] A photo. Five kids on the breakwater, squinting at the sun. On the back. Stan, Col, Bev, Rocco and June. Next, the fort with the big gun.'),
      say('nb-stan', '[sighs] June. She moved away the next year. Never said where. She had the last page, you know. She always kept the last page.'),
      steady('Cool down with an easy jog or a walk along the clifftop path, with the sea below.', { chapter: 'The clifftop' }),
      quiz('nb-dev', 'Last one. The Bogey Hole is the earliest known what in all of Australia?', ['Purpose built ocean pool', 'Lighthouse', 'Surf club'], 'Cut by hand from the rock platform, and still here two hundred years on.'),
    ],
    finale: 'Three Flashes is solved. Three, wind, bath, a photo of five kids, and a girl called June. Next, the fort. Thanks, Runner.',
  }),
]

export const CHAIN = ['nobbys-flashes']

export const CAST = {
  'nobbys-narrator': { name: 'Narrator', voiceId: 'nQrhhugoT2bDFBfb4NDd', pitch: 1.0, rate: 0.98 }, // Ben Callisto, warm documentary
  'nb-jess': { name: 'Jess', voiceId: 'L4bD71zGAYHMT7a6MLwc', pitch: 1.05, rate: 1.04, radio: true }, // Brenna, in your earbuds
  'nb-stan': { name: 'Stan', voiceId: 'EvSDmyGtGwzs67NleuPP', pitch: 0.9, rate: 0.95, radio: true }, // Jason, older, on the radio
  'nb-dev': { name: 'Dev', voiceId: 'dSX8MUEljgxrFygPwhF5', pitch: 1.0, rate: 1.0 }, // Danny, dry humour
}

export const LOOK = { accent: '#F6C445', deep: '#0B1E33', tag: 'Harbour mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
