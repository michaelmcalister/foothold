// The Griffin Code: a five episode puzzle hunt in Canberra, the city
// designed on paper before it was built. A retired surveyor called Marg
// has hidden five clues in the city's lines and shapes for a charity
// puzzle hunt. Ash, a mapping student, and Nina, twelve, who lives at
// Questacon, chase them along the land axis, round the lake, past the
// carillon, under the water jet and up to the hill where the city was
// named. Nobody is hurt, nobody climbs anything they should not, and every
// building is visited from public paths.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the design competition ran from April 1911; Walter Burley Griffin's
//     plan was chosen on 23 May 1912 from 137 entries, with renderings by
//     Marion Mahony Griffin; Menzies named the lake after Griffin rather
//     than himself (Walter Burley Griffin, Wikipedia)
//   - Lady Denman announced the name Canberra at midday on 12 March 1913
//     on Kurrajong Hill, now Capital Hill; the land axis runs from Capital
//     Hill to the Australian War Memorial at the foot of Mount Ainslie,
//     and on to Bimberi Peak about 52 km away; the water axis runs along
//     the central basin towards Black Mountain; Parliament House opened on
//     9 May 1988, the provisional one on 9 May 1927 (Canberra, Wikipedia)
//   - Lake Burley Griffin: Scrivener Dam is 33 m high on the Molonglo
//     River; the lake reached its level on 29 April 1964; it is 11 km long
//     with East, Central and West basins; the Captain Cook Memorial Jet
//     dates from 1970; the National Carillon opened in 1970 on Queen
//     Elizabeth II Island with 53 bronze bells from the British Government;
//     Commonwealth Avenue Bridge is 310 m long (Lake Burley Griffin)
//
// Real people are only mentioned, never voiced. Marg, her puzzle hunt and
// everyone with lines are made up.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('cb-ash', '[excited] Straight as the land axis! Ease right back now.'),
  okay: line('cb-ash', 'You got there, and that is what counts. Ease right back now.'),
  half: line('cb-ash', 'Halfway! Keep going!'),
}
const EASY = line('cb-ash', 'Easy now. Canberra is all about planning. Plan your pace.')
const base = { saga: 'canberra', guide: 'cb-ash', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'canberra',
  title: 'The Griffin Code',
  blurb: 'Canberra was drawn on paper before a single road was built. A retired surveyor has hidden a puzzle hunt in its lines, and you have five runs to crack it.',
  note: 'The Canberra history is true. The puzzle hunt and the people are made up. The trivia is all real.',
  narrator: 'canberra-narrator',
  score: 'velocity',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'canberra-axis',
    episode: 1,
    next: 'Next time on The Griffin Code: the lake, a bridge with a number on it, and a rowing crew that knows the answer.',
    title: 'The Land Axis',
    blurb: 'Marg the surveyor’s puzzle hunt begins on the land axis, the straight line Griffin drew from a mountain to a hill.',
    place: { name: 'Anzac Parade, Canberra', lat: -35.2900, lng: 149.1440 },
    loop: line('cb-ash', 'A loop! Griffin loved circles too. The whole city is full of them.'),
    early: line('cb-ash', 'Stop there, no worries. The clues will wait.'),
    open: { scene: 'city', chapter: 'Anzac Parade', text: 'Canberra, on a crisp spring morning. A wide red avenue runs straight towards the lake, with a mountain behind and a hill with a flagpole ahead. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Ngunnawal Country. Long before any plan was drawn, people met and travelled across these plains and hills.'),
      say('cb-ash', 'Hi! Ash here. I study maps. This week there is a puzzle hunt for charity, set by a retired surveyor called Marg. Five clues. The first is in my hand.'),
      say('cb-marg', '[mischievously] Marg here. Clue one. Stand on the line from the mountain to the hill. Count what Griffin beat. Then add one.'),
      quiz('cb-ash', 'How many entries were in the competition to design Canberra?', ['137', '13', '1,370'], 'One hundred and thirty seven. Griffin beat a hundred and thirty six others. Add one, and we have, hmm.'),
      say('cb-nina', '[excited] Nina here! I am twelve and I love puzzles. A hundred and thirty six others, plus one. That is a hundred and thirty seven again!'),
      dash(30, 'Down the land axis towards the lake! Pick it up for 30 seconds!', { chapter: 'The axis', fx: 'whoosh' }),
      say(null, 'The avenue runs perfectly straight. Behind you, the War Memorial at the foot of Mount Ainslie. Ahead, across the lake, Parliament House on its hill.', { spatial: 'magpie' }),
      quiz('cb-ash', 'The land axis runs from Capital Hill to the War Memorial. Where does it point beyond, 52 km away?', ['Bimberi Peak', 'Bondi Beach', 'Mount Everest'], 'Bimberi Peak, the highest point in the ACT. Griffin lined up the city with the mountains.'),
      say('cb-ash', '[curious] A hundred and thirty seven. Maybe it is a number on a sign. Or steps. Or a bus.'),
      choice('cb-ash', 'way', 'Let’s look for 137. Along the avenue, or across the grass?',
        { label: 'Along the avenue', line: 'The avenue! Read every plaque.', dash: 'Along the avenue! Pick it up for 30 seconds!', after: 'Along the avenue, memorials line both sides. A bus rumbles past on the road behind. Number 137? No. Number 3.' },
        { label: 'Across the grass', line: 'The grass! Kangaroos might be about.', dash: 'Across the grass! Pick it up for 30 seconds!', after: 'Across the grass, a mob of kangaroos lifts their heads to watch you. In Canberra, that happens a lot.' },
        'The avenue, then. Go!'),
      steady('Settle into an easy pace while Nina thinks out loud.', { chapter: 'Thinking' }),
      say('cb-nina', '[excited] Wait! Not a number. A year! Griffin won in 1912. Count back from the clue. What happened 137 days later?'),
      quiz('cb-nina', 'My puzzle. Griffin’s design was chosen in May 1912. The city got its name the next March. About how many months later?', ['About ten', 'About two', 'About twenty'], 'About ten months. The name was announced on the 12th of March 1913. Big day.'),
      say('cb-marg', '[laughs] Marg here. You are thinking too hard. The answer is printed on the bridge you are about to cross. Look at your feet.'),
      dash(45, 'To the bridge! Pick it up for 45 seconds down to the lake!', { chapter: 'The bridge', fx: 'noirstab' }),
      say(null, 'Commonwealth Avenue Bridge stretches over the lake. In the footpath, a little brass plate. A number, and an arrow pointing west.', { fx: 'found' }),
      steady('Cool down with an easy jog or a walk along the shore.', { scene: 'bayside', chapter: 'The lake' }),
      quiz('cb-ash', 'Last one. When did Lake Burley Griffin reach its full level?', ['1964', '1913', '1988'], 'April 1964. Over fifty years after Griffin drew it. He never saw it full.'),
    ],
    finale: 'The Land Axis is walked. One brass plate, one arrow pointing west, and a puzzle hunt that is just getting started. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'canberra-lake',
    episode: 2,
    previously: 'Previously on The Griffin Code: the land axis, a hundred and thirty seven entries, and a brass plate on the bridge.',
    next: 'Next time on The Griffin Code: an island with a tower of bells, and a tune that is really a code.',
    title: 'The Water Axis',
    blurb: 'The brass plate points west, along the lake. Clue two is somewhere on the water axis, and a rowing crew holds the key.',
    place: { name: 'Lake Burley Griffin, Canberra', lat: -35.2950, lng: 149.1180 },
    loop: line('cb-ash', 'A loop! The lake has a path all the way round. Perfect.'),
    early: line('cb-ash', 'Stop there, all good. Sit and watch the rowers.'),
    open: { scene: 'bayside', chapter: 'The lake', text: 'Lake Burley Griffin, early morning. Mist on the water, rowing boats sliding past, and black swans paddling by the shore. Start with an easy walk or jog.' },
    steps: [
      say('cb-ash', 'Ash here. The plate said 310 and pointed west. Nina has a theory.'),
      say('cb-nina', '[excited] 310 metres! That is how long the bridge is! So walk west 310 metres from the end of it!'),
      quiz('cb-ash', 'Commonwealth Avenue Bridge is how long?', ['310 metres', '31 metres', '3,100 metres'], 'Three hundred and ten metres. Nina is right. Again. It is getting annoying.'),
      dash(30, 'West along the shore, about 310 metres! Pick it up for 30 seconds!', { chapter: 'West', fx: 'whoosh' }),
      say(null, 'Along the shore, the path curves under trees. Out on the water, a rowing eight glides past, oars flashing in time.', { spatial: 'boat' }),
      say('cb-pete', '[laughs] Pete, rowing coach. You lot doing Marg’s hunt? She left a clue with me. But you have to answer a question first.'),
      quiz('cb-pete', 'The lake was made by damming which river?', ['The Molonglo', 'The Murray', 'The Thames'], 'The Molonglo. Scrivener Dam holds it back. Thirty three metres high.'),
      say('cb-pete', 'Here. Clue two. It says, from the middle of the water, the bells will tell you how many.'),
      choice('cb-ash', 'way', 'The bells! The carillon! Round the west basin, or back past the bridge?',
        { label: 'Round the west basin', line: 'West basin! The long way round.', dash: 'Round the west basin! Pick it up for 30 seconds!', after: 'Round the west basin, the water is flat as glass, and Black Mountain rises up with its tall tower on top.' },
        { label: 'Back past the bridge', line: 'Past the bridge! Quicker, busier.', dash: 'Back past the bridge! Pick it up for 30 seconds!', after: 'Back past the bridge, cyclists whiz by, and a tourist boat chugs out with everyone waving.' },
        'West basin, then. Go!'),
      steady('Settle into an easy pace while Nina reads up on the carillon.', { chapter: 'The bells' }),
      quiz('cb-nina', 'The lake has three basins. Which of these is NOT one of them?', ['North basin', 'Central basin', 'West basin'], 'North basin. The three are East, Central and West.'),
      say('cb-ash', '[curious] The water axis runs along the middle basin, towards Black Mountain. And right in that basin, an island with a tower of bells.'),
      dash(45, 'The carillon plays at noon! Pick it up for 45 seconds to hear it!', { chapter: 'Noon', fx: 'noirstab' }),
      say(null, 'A tall white tower stands on a little island. At noon, bells ring out across the lake, a tune you almost know.', { fx: 'bellring' }),
      steady('Cool down with an easy jog or a walk while the bells finish.', { chapter: 'After the bells' }),
      quiz('cb-ash', 'Last one. How long is Lake Burley Griffin?', ['About 11 km', 'About 1 km', 'About 110 km'], 'About eleven kilometres. You could run round the middle bit before breakfast.'),
    ],
    finale: 'The Water Axis is followed. A bridge of 310 metres, a rowing coach, and a tower of bells at noon. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'canberra-carillon',
    episode: 3,
    previously: 'Previously on The Griffin Code: a bridge 310 metres long, a rowing coach with a clue, and bells across the lake at noon.',
    next: 'Next time on The Griffin Code: a jet of water, a gust of wind, and a clue that gets very wet.',
    title: 'The Bell Code',
    blurb: 'The carillon’s noon tune hides a number. Count the bells, decode the tune, and find clue three before the hunt moves on.',
    place: { name: 'National Carillon, Canberra', lat: -35.2980, lng: 149.1390 },
    loop: line('cb-ash', 'A loop! Like a peal of bells. Round and round.'),
    early: line('cb-ash', 'Stop there, all good. The bells play again tomorrow.'),
    open: { scene: 'bayside', chapter: 'The island', text: 'A footbridge to a small island in Lake Burley Griffin. A tall white tower rises above the trees, and a bell ringer waves from the top. Start with an easy walk or jog.' },
    steps: [
      say('cb-ash', 'Ash here. Marg says, the bells will tell you how many. How many what? Nina?'),
      quiz('cb-nina', 'How many bells are in the National Carillon?', ['53', '5', '530'], 'Fifty three bronze bells. A gift from the British Government in 1970.'),
      say('cb-bell', '[laughs] Hello! I play the bells. Marg asked me to play a special tune today. It goes up, then down. She said count the notes.'),
      dash(30, 'Round the island to hear it best! Pick it up for 30 seconds!', { chapter: 'The tune', fx: 'whoosh' }),
      say(null, 'The bells ring out. Up, up, up. Then down, down. Then one long low note that hums across the water.', { fx: 'bellring', spatial: 'bird' }),
      quiz('cb-nina', 'Puzzle. The tune went up three, down two, then one low note. How many notes in all?', ['Six', 'Five', 'Three'], 'Six notes. Three up, two down, one low. Six!'),
      say('cb-ash', '[curious] Six. Clue three says, add the bells and the notes, and go to that tree in the arboretum. Fifty three and six.'),
      quiz('cb-ash', 'Fifty three bells plus six notes. What do you get?', ['59', '53', '63'], 'Fifty nine. Tree number fifty nine. Hope they are numbered.'),
      choice('cb-ash', 'way', 'To the arboretum! Along the lake, or over the bridge and up the hill?',
        { label: 'Along the lake', line: 'The lake path! Flat and pretty.', dash: 'Along the lake! Pick it up for 30 seconds!', after: 'Along the lake, families picnic on the grass, and a duck waddles across the path, totally in charge.' },
        { label: 'Up the hill', line: 'The hill! Big views over the city.', dash: 'Up the hill! Pick it up for 30 seconds!', after: 'Up the hill, the city lays out below you in perfect lines. You can see the whole plan from here.' },
        'Along the lake, then. Go!'),
      steady('Settle into an easy pace while Nina counts the trees.', { chapter: 'The trees' }),
      say('cb-nina', '[sighs] There are a lot of trees. Like, thousands. Oh. Wait. Forest number fifty nine! Each forest has a number!'),
      say(null, 'In forest fifty nine, small trees grow in neat rows. On a little sign, someone has drawn a water fountain and a question mark.', { fx: 'found' }),
      quiz('cb-ash', 'The National Carillon stands on an island named after whom?', ['Queen Elizabeth II', 'Walter Griffin', 'Captain Cook'], 'Queen Elizabeth the Second. The carillon was a gift from Britain, opened in 1970.'),
      dash(45, 'A water fountain. The jet! Pick it up for 45 seconds back down to the lake!', { chapter: 'The jet', fx: 'noirstab' }),
      say('cb-marg', '[laughs] Marg here. Three clues down. You are fast. Faster than the other teams. Bring a towel for the next one.'),
      steady('Cool down with an easy jog or a walk by the water.', { chapter: 'The shore' }),
      quiz('cb-ash', 'Last one. Who drew the beautiful pictures of Griffin’s plan that helped it win?', ['Marion Mahony Griffin', 'Lady Denman', 'Marg'], 'Marion Mahony Griffin, his wife and partner. Her drawings are still stunning.'),
    ],
    finale: 'The Bell Code is cracked. Fifty three bells, six notes, forest fifty nine, and a towel needed next time. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'canberra-jet',
    episode: 4,
    previously: 'Previously on The Griffin Code: fifty three bells, a six note tune, and a drawing of a fountain in forest fifty nine.',
    next: 'Next time on The Griffin Code: the hill where Canberra got its name, and the final answer.',
    title: 'The Jet',
    difficulty: 'Push yourself',
    blurb: 'The Captain Cook Memorial Jet shoots water high over the lake. The fourth clue is on the shore, but the wind has other plans.',
    place: { name: 'Captain Cook Memorial Jet, Canberra', lat: -35.2915, lng: 149.1290 },
    loop: line('cb-ash', 'A loop! Like water going up, and coming back down.'),
    early: line('cb-ash', 'Stop there, no worries. Stay dry.'),
    open: { scene: 'bayside', chapter: 'Regatta Point', text: 'Regatta Point, on the lake shore. Out in the water, a huge white jet shoots straight up into the sky and falls back as mist. Start with an easy walk or jog.' },
    steps: [
      say('cb-ash', 'Ash here. The jet. And the wind is blowing straight at us. This is going to be wet.'),
      quiz('cb-ash', 'The Captain Cook Memorial Jet was built in which year?', ['1970', '1770', '1913'], '1970. Two hundred years after Captain Cook sailed up the east coast.'),
      say('cb-nina', '[excited] I see it! A sign on the shore. Upside down. With a riddle. Read it, Ash!'),
      say('cb-ash', 'It says, where a lady said one word at noon, the city got its name. Stand there, and look north.'),
      dash(30, 'A gust is coming! Pick it up for 30 seconds before the spray hits!', { chapter: 'The spray', fx: 'whoosh' }),
      say(null, 'Too late. The wind swings, and a cloud of spray drenches the whole shore. People shriek and laugh. Nina is soaked and delighted.', { spatial: 'kids' }),
      quiz('cb-nina', 'Who announced the name Canberra in 1913?', ['Lady Denman', 'Queen Victoria', 'Marg'], 'Lady Denman, the wife of the Governor General. At midday on the 12th of March.'),
      say('cb-ash', '[curious] And where did she say it? Kurrajong Hill. Now called Capital Hill. Where Parliament House is.'),
      choice('cb-ash', 'way', 'To Capital Hill! Over the bridge, or round by the national buildings?',
        { label: 'Over the bridge', line: 'The bridge! The straight line.', dash: 'Over the bridge! Pick it up for 30 seconds!', after: 'Over the bridge, the lake spreads either side, and the jet sends a rainbow across the water.' },
        { label: 'By the buildings', line: 'The buildings! Library, gallery, science.', dash: 'Past the national buildings! Pick it up for 30 seconds!', after: 'Past the national buildings. A library, a gallery, and Questacon, where Nina waves at the door like it is her house.' },
        'The bridge, then. Go!'),
      steady('Settle into an easy pace while you dry off in the sun.', { chapter: 'Drying off' }),
      quiz('cb-ash', 'The first Parliament House opened in Canberra in which year?', ['1927', '1988', '1901'], '1927. A temporary one. It lasted sixty one years before the new one opened.'),
      say('cb-marg', 'Marg here. Last clue tomorrow. Meet me at the top. Bring the other teams. Everyone finishes together.'),
      quiz('cb-nina', 'And the new Parliament House opened in which year?', ['1988', '1927', '2000'], '1988, on the 9th of May. Same day of the year as the first one. Sneaky.'),
      dash(45, 'The sun is setting behind the hills! Pick it up for 45 seconds!', { chapter: 'Sunset', fx: 'noirstab' }),
      say(null, 'The sun drops behind the Brindabella hills. The lake goes gold, then pink. The jet switches off for the night.'),
      steady('Cool down with an easy jog or a walk home.', { scene: 'night', chapter: 'Evening' }),
      quiz('cb-ash', 'Last one. Which mountain stands at the end of the land axis behind the War Memorial?', ['Mount Ainslie', 'Mount Kosciuszko', 'Mount Wellington'], 'Mount Ainslie. Climb it one day for the best view of Griffin’s lines.'),
    ],
    finale: 'The Jet is beaten, mostly. Soaked shoes, a clue about a lady and a word, and the final meeting on Capital Hill. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'canberra-hill',
    episode: 5,
    previously: 'Previously on The Griffin Code: a soaking from the jet, a clue about Lady Denman, and a meeting on Capital Hill.',
    title: 'Capital Hill',
    difficulty: 'Push yourself',
    blurb: 'Every team meets Marg at Capital Hill for the final clue. Stand where the name was spoken, look north, and see the whole code at once.',
    place: { name: 'Capital Hill, Canberra', lat: -35.3082, lng: 149.1244 },
    loop: line('cb-ash', 'A loop. Griffin would be proud. Everything comes back round.'),
    early: line('cb-ash', 'Stop there, all good. The view will wait.'),
    open: { scene: 'city', chapter: 'Capital Hill', text: 'Capital Hill, Canberra. A huge flagpole, a grassy roof you can walk on, and teams in puzzle hunt shirts gathering on the lawns. Start with an easy walk or jog.' },
    steps: [
      say('cb-marg', '[laughs] Welcome, everyone! Marg here. Last clue. Stand where the name was spoken. Look north, along the line. Tell me what you see.'),
      say('cb-ash', 'Ash here. Look north. Straight down the land axis. Over the lake. Up the red avenue. To the War Memorial. And Mount Ainslie behind.'),
      quiz('cb-ash', 'What was Capital Hill called before?', ['Kurrajong Hill', 'Black Mountain', 'Red Hill'], 'Kurrajong Hill. Where Lady Denman said Canberra, and the name stuck.'),
      dash(30, 'Marg says walk the line! Pick it up for 30 seconds along the axis!', { chapter: 'The line', fx: 'whoosh', spatial: 'chatter' }),
      say('cb-nina', '[excited] Wait! Every clue was on a line. The bridge. The carillon. The forest. The jet. Draw them on the map, and it makes a shape!'),
      quiz('cb-nina', 'Puzzle. Three straight lines that meet at three corners. What shape?', ['A triangle', 'A circle', 'A square'], 'A triangle! Griffin’s plan has a great triangle at its heart. Marg hid the hunt inside it.'),
      say('cb-marg', '[laughs] Clever girl. Griffin drew a triangle between three hills and the lake. People call it the Parliamentary Triangle. You just ran it.'),
      choice('cb-ash', 'finish', 'The finish line is at the bottom of the hill. Down the lawns, or by the paths?',
        { label: 'Down the lawns', line: 'The lawns! Roll down if you like.', dash: 'Down the lawns! Pick it up for 30 seconds!', after: 'Down the lawns, kids roll down the grassy slope, shrieking with laughter. Nina joins them. So does Marg.' },
        { label: 'By the paths', line: 'The paths! Smooth and steady.', dash: 'Down the paths! Pick it up for 30 seconds!', after: 'Down the paths, every team is running together now, puzzle sheets flapping, cheering each other on.' },
        'The lawns, then. Go!'),
      steady('Settle into an easy pace as all the teams gather.', { chapter: 'The teams' }),
      say('cb-marg', 'Every team finished. Together. That was the point. The prize money goes to Questacon, for kids who love puzzles. Like Nina.'),
      quiz('cb-ash', 'Griffin’s design was chosen in which year?', ['1912', '1913', '1964'], '1912. The city is still growing along his lines over a hundred years later.'),
      say('cb-nina', '[sighs] Marg. Can you make another hunt next year? A harder one?'),
      say('cb-marg', '[laughs] Only if you help me write it, Nina.'),
      dash(45, 'Victory lap round the lake! Pick it up for 45 seconds!', { chapter: 'Victory lap', fx: 'brassfanfare' }),
      say(null, 'Teams run the lake together as the sun sets. The carillon plays a tune. Up three, down two, and one long low note.', { fx: 'bellring' }),
      steady('Cool down with an easy jog or a walk along the shore.', { scene: 'bayside', chapter: 'Home' }),
      quiz('cb-ash', 'Last one, Runner. Which Prime Minister named the lake after Griffin, not himself?', ['Robert Menzies', 'Edmund Barton', 'John Curtin'], 'Robert Menzies. A kind choice. Griffin’s name is on the water for good.'),
    ],
    finale: 'The Griffin Code is cracked. A land axis, a water axis, fifty three bells, a jet and a triangle. Every team finished together. Thanks, Runner.',
  }),
]

export const CHAIN = ['canberra-axis', 'canberra-lake', 'canberra-carillon', 'canberra-jet', 'canberra-hill']

export const CAST = {
  'canberra-narrator': { name: 'Narrator', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.92, rate: 0.98 }, // Lee
  'cb-ash': { name: 'Ash', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.05, rate: 1.04, radio: true }, // Ruby, in your earbuds
  'cb-marg': { name: 'Marg', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.9, rate: 0.98, radio: true }, // Julieanne, on the phone
  'cb-nina': { name: 'Nina', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.3, rate: 1.08 }, // Emily, lifted
  'cb-pete': { name: 'Pete', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.95, rate: 1.02 }, // Scotty
  'cb-bell': { name: 'Bell ringer', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 1.0, rate: 1.0 }, // Simon
}

export const LOOK = { accent: '#9BD1FF', deep: '#16284A', tag: 'Puzzle hunt' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
