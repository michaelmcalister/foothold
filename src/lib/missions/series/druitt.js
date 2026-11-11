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
// Episodes 2 to 5 use compose.js for their timing. Facts checked (web
// search, November 2026):
//   - Prospect Reservoir: built 1882 to 1888, an earth embankment dam 26 m
//     high and about 2.2 km long, called the first earthfill embankment dam
//     in Australia; Sydney's main reservoir until the filtration plant
//     opened in 1996 (Prospect Reservoir, Wikipedia)
//   - Bungarribee: set up in 1822 by Colonel John Campbell to breed horses
//     for the East India Company; the homestead was pulled down in the
//     1950s; Bungarribee Nature Reserve; Sydney Zoo opened next to the
//     Western Sydney Parklands in 2019 (Bungarribee, Wikipedia)
//   - Blacktown: in 1823 the Native Institution moved to "the Black Town"
//     and the road became Black Town Road; the station was named Black Town
//     Road in 1860, Blacktown by 1862; it has baseball and softball
//     stadiums (Blacktown, Wikipedia)
//   The time capsule, the chalk cake, the lucky ball and the compass are
//   made up.
//
// Real people are only mentioned, never voiced. House rules: tense, never
// cruel, nobody is hurt, and the lost runner is found safe and fed.

import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

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
    place: { name: 'The Manse, Mount Druitt', lat: -33.7686, lng: 150.8170 },
    next: 'Next time on The Major’s Hill: a giant chalk drawing by Prospect Reservoir, and a plane spotter with a very good camera.',
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
  compose({
    id: 'druitt-prospect',
    episode: 2,
    previously: 'Previously on The Major’s Hill: a relay run backwards, a runner on the wrong train, and warm pandesal at the finish.',
    next: 'Next time on The Major’s Hill: a horse farm from 1822, a time capsule nobody can find, and a map drawn by a kid in 1988.',
    saga: 'druitt',
    title: 'The Earth Wall',
    difficulty: 'Steady effort',
    blurb: 'Overnight, a giant chalk drawing appears on the grass by Prospect Reservoir. Mele wants to know who did it before the council hoses it off.',
    place: { name: 'Prospect Reservoir', lat: -33.8195, lng: 150.9020 },
    loop: line('md-mele', 'A loop! Round and round like the water in the pipes. Nice.'),
    early: line('md-mele', 'All good, stop there. The drawing will be on the news tonight anyway.'),
    guide: 'md-mele', results: RESULTS['md-mele'], easy: EASY,
    open: { scene: 'suburb', chapter: 'Prospect', text: 'Prospect, in Sydney’s west. A wide grassy wall holds back a huge lake of still water, with cockatoos screeching overhead. Start with an easy walk or jog.' },
    steps: [
      say('md-mele', 'Mele here! Something strange. A plane spotter sent me a photo. Someone drew a giant picture in chalk on the grass by the reservoir. You can only see it from the sky.'),
      say('md-jayden', '[curious] Jayden here. It looks like a big birthday cake. With a number on it. Ninety something. Or a sixty upside down. I am not great with upside down.'),
      quiz('md-bruce', 'Bruce from the historical society. Prospect Reservoir was finished in which year?', ['1888', '1988', '1788'], 'Six years of digging and building. For a long time it was Sydney’s main water supply.'),
      say(null, 'The reservoir wall is not concrete. It is earth, packed hard and grassed over. A great green ridge two kilometres long.', { spatial: 'lorikeets' }),
      quiz('md-bruce', 'What was special about this dam wall when it was built?', ['First earth dam of its kind', 'Tallest in the world', 'Built in one week'], 'People call it the first earthfill embankment dam in Australia. A wall made of dirt, holding back a lake.'),
      dash(30, 'Chalk dust on the path! Pick it up for 30 seconds along the wall!', { chapter: 'Along the wall', fx: 'whoosh' }),
      say(null, 'White chalk dust on the path. Then a dropped sun hat with a name tag. Then a walking stick, leaning neatly against a bin.'),
      say('md-joy', 'Hoy! Tita Joy here. That walking stick! That is Lola Nita’s stick. From my walking group. She is ninety six today.'),
      say('md-mele', '[laughs] Ninety six! Jayden, it is a ninety six, not a sixty. Who draws a cake for their own birthday?'),
      choice('md-mele', 'way', 'Lola Nita’s group went for breakfast. Along the water, or through the picnic grounds?',
        { label: 'Along the water', line: 'Water! Watch for pelicans.', dash: 'Along the water! Pick it up for 30 seconds!', after: 'Along the water, a pelican drifts by like a little boat, and a fisherman nods from the bank.' },
        { label: 'The picnic grounds', line: 'Picnic grounds! Mind the barbecues.', dash: 'Through the picnic grounds! Pick it up for 30 seconds!', after: 'Through the picnic grounds, families are setting up barbecues, and a big group of walkers wave from a long table.' },
        'The water, then. Go!'),
      steady('Settle into an easy pace while Tita Joy rings the walking group.', { chapter: 'The walkers' }),
      quiz('md-bruce', 'How high is the earth wall of the reservoir?', ['About 26 metres', 'About 2 metres', 'About 260 metres'], 'About as tall as an eight storey building. All made from earth and clay.'),
      say('md-joy', 'Mystery solved. Lola Nita did not draw it. Her walking group did. At five in the morning. Her grandson flies planes. He flies over here today.'),
      say('md-jayden', '[excited] So when he flies over, he sees a giant cake for his nan! That is the best thing I have ever heard.'),
      dash(45, 'His plane is coming over in a minute! Pick it up for 45 seconds to the top of the wall to wave!', { chapter: 'Flyover', fx: 'whistle' }),
      say(null, 'A small plane comes in low over the water, dips its wings left, then right. On the grass below, twenty walkers cheer and wave their hats.', { spatial: 'helicopter', fx: 'found' }),
      say('md-mele', '[laughs] Happy birthday, Lola Nita! Runner, you get cake too. Real cake. Not chalk.'),
      steady('Cool down with an easy jog or a walk back along the wall.', { chapter: 'Cake' }),
      quiz('md-bruce', 'Until which year was Prospect the main reservoir for Sydney’s water?', ['1996', '1906', '2016'], 'When a big new filtration plant opened. Now it is a back up, and a lovely place for a walk.'),
    ],
    finale: 'The Earth Wall is solved. One giant chalk cake, one wing wave, and a ninety six year old who had the best birthday ever. Thank you, Runner.',
  }),
  compose({
    id: 'druitt-bungarribee',
    episode: 3,
    previously: 'Previously on The Major’s Hill: a chalk cake on the reservoir grass, a plane dipping its wings, and Lola Nita turning ninety six.',
    next: 'Next time on The Major’s Hill: a road with an old name, a lucky softball, and a big game that cannot start without it.',
    saga: 'druitt',
    title: 'The Horse Farm Capsule',
    difficulty: 'Steady effort',
    blurb: 'A time capsule buried at Bungarribee in 1988 is due to be opened, and nobody can find it. Jayden’s mum drew the map when she was ten.',
    place: { name: 'Bungarribee Park, Doonside', lat: -33.7820, lng: 150.8710 },
    loop: line('md-mele', 'A loop! Like horses round a training ring. Trot on.'),
    early: line('md-mele', 'Stop there, no stress. The capsule has waited this long.'),
    guide: 'md-mele', results: RESULTS['md-mele'], easy: EASY,
    open: { scene: 'suburb', chapter: 'Bungarribee', text: 'Bungarribee, near Doonside. Wide parkland, a creek lined with paperbarks, and grass that once fed some of the best horses in the colony. Start with an easy walk or jog.' },
    steps: [
      say('md-mele', 'Mele here. Big day. In 1988, local school kids buried a time capsule here. It is meant to be dug up today. And nobody can find it.'),
      say('md-jayden', '[sighs] My mum was one of the kids. She drew the map. She was ten. The map has a horse, a tree, and a big X. That is it.'),
      quiz('md-bruce', 'This land was set up in 1822 by Colonel John Campbell. What did he breed here?', ['Horses', 'Sheep', 'Camels'], 'Horses for the East India Company. Bungarribee became famous for racehorses too.'),
      say(null, 'The old homestead is long gone. It was pulled down in the 1950s. Now there is open grass, new trees, and a creek wandering through.', { spatial: 'kookaburra' }),
      dash(30, 'First landmark, the creek! Pick it up for 30 seconds!', { chapter: 'The creek', fx: 'whoosh' }),
      say('md-jayden', '[curious] Mum says the horse on the map was a statue. A little metal horse on a pole. Near the tree with the big split trunk.'),
      quiz('md-bruce', 'Bungarribee’s old homestead was pulled down. When?', ['In the 1950s', 'In the 1850s', 'Last year'], 'Many old farmhouses went as the suburbs grew. The land became parks and homes.'),
      say('md-joy', 'Hoy! Tita Joy. I asked at the bakery. Mrs Pham says the metal horse was moved years ago. To the front of the old school hall.'),
      choice('md-mele', 'path', 'Old school hall! Along the creek track, or through the new playground?',
        { label: 'The creek track', line: 'Creek track! Shady and quiet.', dash: 'Along the creek track! Pick it up for 30 seconds!', after: 'Along the creek track, a kookaburra laughs from a branch, and frogs plop into the water as you pass.' },
        { label: 'The playground', line: 'Playground! Big slides, little legs everywhere.', dash: 'Through the playground! Pick it up for 30 seconds!', after: 'Through the playground, kids hang upside down from the climbing frame and shout hello. One of them points at a split gum tree.' },
        'Creek track, then. Go!'),
      steady('Settle into an easy pace while Bruce compares the old map with the new one.', { chapter: 'The map' }),
      say('md-bruce', '[laughs] The map was drawn upside down! The X is on the other side of the tree. Jayden, it runs in the family.'),
      say('md-jayden', '[sarcastic] Thanks, Bruce. Very kind. I am telling Mum you said that.'),
      quiz('md-mele', 'Quick one. The Western Sydney Parklands are next door. Which big animal park opened there in 2019?', ['Sydney Zoo', 'Taronga Zoo', 'Dubbo Zoo'], 'Right next to the parklands. Lions in Doonside. Who knew?'),
      dash(45, 'The spade is waiting! Pick it up for 45 seconds to the split tree!', { chapter: 'The dig', fx: 'whistle' }),
      say(null, 'By the split gum, a council worker digs carefully. The spade hits something. Out comes a plastic tub, sealed with very old tape.', { fx: 'found' }),
      say('md-jayden', '[excited] A cassette tape! A drawing of a horse! And a letter from my mum. It says, dear future me, I hope you became a vet. She did! She is a vet!'),
      say('md-mele', 'Runner, you just made a ten year old’s wish come true. Thirty eight years late. Still counts.'),
      steady('Cool down with an easy jog or a walk across the park.', { chapter: 'Home' }),
      quiz('md-bruce', 'Last one. What is the name of the nature reserve on the old Bungarribee land?', ['Bungarribee', 'Mount Druitt', 'Rooty Hill'], 'Bungarribee Nature Reserve. The name has lasted two hundred years.'),
    ],
    finale: 'The Horse Farm Capsule is found. One upside down map, one letter from 1988, and a vet who got her wish. Thank you, Runner.',
  }),
  compose({
    id: 'druitt-blacktown',
    episode: 4,
    previously: 'Previously on The Major’s Hill: a time capsule from 1988, an upside down map, and a letter from Jayden’s mum.',
    next: 'Next time on The Major’s Hill: Druitt Day at The Manse, a Major’s old compass, and the biggest relay yet.',
    saga: 'druitt',
    title: 'The Lucky Ball',
    difficulty: 'Push yourself',
    blurb: 'Mele’s softball team has a final at Blacktown. Their lucky ball has gone walkabout, and the game cannot start without it.',
    place: { name: 'Blacktown', lat: -33.7710, lng: 150.9060 },
    loop: line('md-mele', 'A loop! Like running the bases. First, second, third, home.'),
    early: line('md-mele', 'Stop there, all good. Come and watch the game.'),
    guide: 'md-mele', results: RESULTS['md-mele'], easy: EASY,
    open: { scene: 'station', chapter: 'Blacktown station', text: 'Blacktown station on a Saturday morning. Trains in, trains out, and a team in green shirts looking very worried. Start with an easy walk or jog.' },
    steps: [
      say('md-mele', '[sighs] Mele here. I also play softball. Big final today. Our lucky ball is gone. It has been signed by every team since 2001.'),
      say('md-jayden', 'Jayden here. I was in charge of the ball. And I left it on the train. I know. I know. I am working on it.'),
      say(null, 'This is Darug Country too. The name Blacktown comes from a road that led to a school set up for Aboriginal children in 1823. It is a hard part of the story, and it matters.'),
      quiz('md-bruce', 'The station here was first called what, back in 1860?', ['Black Town Road', 'Druitt Junction', 'Prospect'], 'By 1862 it was shortened to Blacktown. Trains have stopped here ever since.'),
      say('md-mele', 'The train goes to Richmond and back. If we time it right, we can meet it on the way back through.'),
      dash(30, 'Platform change! Pick it up for 30 seconds!', { chapter: 'Platform', fx: 'trainhorn', spatial: 'sydneytrain' }),
      say(null, 'The train rolls in. Jayden leaps aboard. The doors close. Through the window you see him searching seats, under bags, behind a man reading a paper.', { scene: 'station' }),
      say('md-jayden', '[excited] Got it! A kid had it. He thought it was lost and was taking it to the lost property office. Very honest kid. I gave him a high five.'),
      say('md-mele', 'Great! Now, you are on the train, and the game starts in twenty minutes. Get off at the next stop and run back!'),
      quiz('md-joy', 'Tita Joy here, cheering from the stands. Blacktown has a big park for baseball and softball. What sport do they play at the other end?', ['Baseball', 'Curling', 'Polo'], 'Baseball and softball, side by side. Bring a hat. The sun is strong.'),
      choice('md-mele', 'route', 'Meet Jayden halfway! Along the main road, or the bike path?',
        { label: 'The main road', line: 'Main road. Wait for the green man.', dash: 'Along the main road! Pick it up for 30 seconds!', after: 'Along the main road, past takeaway shops and a mosque and a church, all on the same block. Jayden waves from the corner.' },
        { label: 'The bike path', line: 'Bike path! Dodge the scooters.', dash: 'Along the bike path! Pick it up for 30 seconds!', after: 'Along the bike path, under the gum trees, past a family on a tandem bike. Jayden comes round the bend holding the ball up high.' },
        'Main road, then. Go!'),
      steady('Settle into an easy pace while Jayden catches his breath and tells the kid’s story again.', { chapter: 'To the park' }),
      say('md-bruce', 'Bruce here. Did you know, Jayden, you have now been lost on two trains in four episodes? It is a local record.'),
      say('md-jayden', '[laughs] I am going for three.'),
      quiz('md-bruce', 'Major Druitt’s regiment, the 48th, arrived in which year?', ['1817', '1917', '1717'], 'And two hundred years later, here we are, chasing a softball across his old district.'),
      dash(45, 'First pitch in two minutes! Pick it up for 45 seconds to the diamond!', { chapter: 'The diamond', fx: 'whistle' }),
      say(null, 'The umpire holds up the lucky ball. Both teams cheer. The first pitch is a strike. The crowd goes wild.', { fx: 'found', spatial: 'chatter' }),
      say('md-mele', '[excited] We won! By one run! The lucky ball works. Jayden, you are forgiven. Mostly.'),
      steady('Cool down with an easy jog or a walk around the park.', { chapter: 'Celebration' }),
      quiz('md-joy', 'Last one. Who invited the honest kid from the train to throw the ceremonial first pitch next week?', ['Mele', 'The umpire', 'Nobody'], 'Mele did. Honesty gets you a ball, a high five and a first pitch.'),
    ],
    finale: 'The Lucky Ball is found. One honest kid, one very fast runner, and a final won by one run. Thank you, Runner.',
  }),
  compose({
    id: 'druitt-druittday',
    episode: 5,
    previously: 'Previously on The Major’s Hill: a softball left on a train, an honest kid, and a final won by one run.',
    saga: 'druitt',
    title: 'Druitt Day',
    difficulty: 'Push yourself',
    blurb: 'Druitt Day at The Manse. The historical society’s old brass compass has gone missing, and the biggest relay yet is about to start.',
    place: { name: 'Mount Druitt town centre', lat: -33.7672, lng: 150.8205 },
    loop: line('md-mele', 'A loop! Every relay comes home in the end.'),
    early: line('md-mele', 'Stop there, all good. There is food. So much food.'),
    guide: 'md-mele', results: RESULTS['md-mele'], easy: EASY,
    open: { scene: 'suburb', chapter: 'Druitt Day', text: 'Druitt Day at The Manse. Bunting, a sausage sizzle, a Pacific Island dance group warming up, and the smell of Tita Joy’s bakery stall. Start with an easy walk or jog.' },
    steps: [
      say('md-mele', '[excited] Mele here! Biggest relay ever. Every runner from every episode is here. Lola Nita, the vet, the honest kid. Everyone.'),
      say('md-bruce', '[sighs] Bruce here. One problem. The old brass compass, the relay’s finish line prize, is missing from its case.'),
      quiz('md-bruce', 'Major Druitt looked after roads and bridges. Who did most of the building?', ['Convicts', 'Robots', 'Tourists'], 'Convict gangs, with picks and shovels. Hard work in hot sun.'),
      say('md-jayden', 'Before you ask. I did not lose it. I have not been on a train all day. I promise.'),
      say(null, 'Behind The Manse, a line of tiny chalk arrows leads off down the footpath. Each one has a little star beside it.', { spatial: 'lorikeets' }),
      dash(30, 'Follow the star arrows! Pick it up for 30 seconds!', { chapter: 'Star arrows', fx: 'whoosh' }),
      quiz('md-mele', 'Mount Druitt station first opened in which year?', ['1881', '1981', '1821'], 'The Major would have needed a horse. You just need a ticket.'),
      say('md-joy', '[laughs] Tita Joy! The star arrows. That is Lola Nita’s walking group again! They are doing a treasure hunt for the kids.'),
      choice('md-mele', 'way', 'The arrows split! Past the station, or up to the lookout?',
        { label: 'Past the station', line: 'Station! Wave at the trains.', dash: 'Past the station! Pick it up for 30 seconds!', after: 'Past the station, a train toots, and Jayden, waiting by the gate, very proudly does not get on it.' },
        { label: 'Up to the lookout', line: 'Lookout! Big views from the hill.', dash: 'Up to the lookout! Pick it up for 30 seconds!', after: 'Up on the rise, you can see all the way to the Blue Mountains, just as the Major once did, two hundred years ago.' },
        'Station, then. Go!'),
      steady('Settle into an easy pace while the kids race ahead, following the stars.', { chapter: 'The treasure hunt' }),
      quiz('md-bruce', 'The Major named his land Mount Druitt and lived out his days there. Until which year?', ['1842', '1942', '1792'], 'He farmed here to the end. His name is on every bus that comes through.'),
      say(null, 'The last arrow points to a bench under a jacaranda. On it sits Lola Nita, ninety six, holding a brass compass and smiling.', { fx: 'found' }),
      say('md-mele', '[laughs] Lola Nita! You took the compass? She says the kids needed a real treasure at the end of the hunt. Fair point, Lola.'),
      say('md-jayden', 'So the kids find the compass, and then it becomes the relay prize. Two hunts, one compass. That is genius.'),
      dash(45, 'The big relay is off! Pick it up for 45 seconds and bring it home!', { chapter: 'The big relay', fx: 'whistle' }),
      say(null, 'The baton passes from the honest kid, to the vet, to Lola Nita’s walking group, to Jayden, and finally to you. You cross the line under the bunting.', { fx: 'found' }),
      say('md-bruce', 'And the winner of the compass, for the right way round relay, is everyone. We voted. It lives at The Manse, and everybody gets a turn.'),
      steady('Cool down with an easy jog or a walk, and grab a plate of food.', { chapter: 'The feast' }),
      quiz('md-joy', 'Last one. Before Major Druitt, whose Country was this, and still is?', ['Darug', 'Dharawal', 'Wiradjuri'], 'Darug Country. Always was. The oldest story here is theirs.'),
      say('md-mele', 'Thanks for running with us, Runner. Mount Druitt does things its own way. And now, so do you.'),
    ],
    finale: 'The Major’s Hill is complete. Five relays, five mysteries, and a whole suburb running together. Thank you, Runner.',
  }),
]

export const CHAIN = ['druitt-relay', 'druitt-prospect', 'druitt-bungarribee', 'druitt-blacktown', 'druitt-druittday']

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
