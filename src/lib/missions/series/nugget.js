// The Welcome Stranger: a five episode chase across the Victorian
// goldfields. A school in Dunolly has made a life size, gold painted copy
// of the Welcome Stranger, the biggest alluvial gold nugget ever found, for
// a goldfields relay. It goes missing on the way. Cass, the teacher, and
// Josh, thirteen, follow it from the monument at Moliagul to a blacksmith's
// anvil, Ballarat, the Golden Dragon Museum in Bendigo and Castlemaine.
// Nobody is hurt; the nugget turns up loved, not lost. Runners stay on
// roads and tracks, never in old mine shafts.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the Welcome Stranger was found on 5 February 1869 at Moliagul, about
//     14 km north west of Dunolly, by Cornish miners John Deason and
//     Richard Oates, about 3 cm under the ground; 109.59 kg gross, 72.02 kg
//     net; no scales could weigh it, so blacksmith Archibald Walls split it
//     on an anvil; it is the largest alluvial gold nugget ever found; an
//     obelisk was put up near the spot in 1897 (Welcome Stranger, Wikipedia)
//   - the Victorian gold rush: Clunes on 1 July 1851, Mount Alexander on 20
//     July and Ballarat on 8 August 1851; Victoria grew from about 75,000
//     people in 1851 to 500,000 in 1861; "Marvellous Melbourne"; output
//     peaked in 1856; the miner's licence; the Eureka Stockade at Ballarat
//     on 3 December 1854, where sixteen miners lost their lives; over
//     33,000 Chinese miners by 1858 (Victorian gold rush, Wikipedia)
//   - Bendigo's Golden Dragon Museum opened in 1991; Loong is its oldest
//     imperial dragon; Sun Loong is over 100 m long, paraded at the Easter
//     Festival until it retired in 2019; there is a Chinese garden and a
//     temple to Kuan Yin (Golden Dragon Museum, Wikipedia)
//
// Real people are only mentioned, never voiced. The copy, the relay and
// everyone with lines are made up.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('ng-cass', '[excited] Struck gold! Ease right back now.'),
  okay: line('ng-cass', 'You got there, and that is what counts. Ease right back now.'),
  half: line('ng-cass', 'Halfway! Keep digging in!'),
}
const EASY = line('ng-cass', 'Easy now. Gold diggers worked slow and steady. So can you.')
const base = { saga: 'nugget', guide: 'ng-cass', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'nugget',
  title: 'The Welcome Stranger',
  blurb: 'In 1869, two miners dug up the biggest gold nugget ever found. Now a school’s golden copy has vanished on a goldfields relay. Follow it town to town.',
  note: 'The gold rush history is true. The copy, the relay and the people are made up. Never go near old mine shafts.',
  narrator: 'nugget-narrator',
  score: 'timerunners',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'nugget-moliagul',
    episode: 1,
    next: 'Next time on The Welcome Stranger: Dunolly, a blacksmith’s anvil, and a footprint in gold paint.',
    title: 'Three Centimetres Down',
    blurb: 'A school’s golden copy of the world’s biggest nugget was meant to start a goldfields relay at Moliagul. The box is here. The nugget is not.',
    place: { name: 'Welcome Stranger monument, Moliagul', lat: -36.7600, lng: 143.6600 },
    loop: line('ng-cass', 'A loop! Like a gold pan, swirling round and round.'),
    early: line('ng-cass', 'Stop there, no worries. The goldfields have waited a long time.'),
    open: { scene: 'goldfield', chapter: 'Moliagul', text: 'Moliagul, in central Victoria. Box trees, red dirt, old diggings in the bush, and a stone monument in a quiet clearing. Start with an easy walk or jog.' },
    steps: [
      say('ng-cass', 'Hi! Cass here. I teach at the school in Dunolly. My class made a copy of the Welcome Stranger. Painted gold. Seventy kilos of plaster. And it has gone.'),
      say('ng-josh', '[sighs] Josh. Year seven. I carried it into the box last night. This morning, the box is empty. Just gold paint on the lid.'),
      quiz('ng-cass', 'Warm up. When was the real Welcome Stranger found?', ['5 February 1869', '1 July 1851', '25 December 1900'], 'The fifth of February, 1869. Right here, near this monument.'),
      say(null, 'The stone monument stands in a clearing. It marks the spot where two miners struck the biggest piece of alluvial gold ever found.', { spatial: 'kookaburra' }),
      quiz('ng-josh', 'How deep was the real nugget buried?', ['About 3 centimetres', 'About 3 metres', 'About 30 metres'], 'About three centimetres! Barely under the dirt. They nearly tripped over it.'),
      dash(30, 'Gold paint drips, heading down the track! Pick it up for 30 seconds!', { chapter: 'The drips', fx: 'whoosh' }),
      say('ng-cass', '[curious] Little gold drips on the track. Then tyre marks. A ute. A small one. Heading towards Dunolly.'),
      quiz('ng-cass', 'Who found the Welcome Stranger?', ['Deason and Oates', 'Burke and Wills', 'Ned Kelly'], 'John Deason and Richard Oates, two Cornish miners. Imagine their faces.'),
      choice('ng-cass', 'way', 'Follow the ute! Along the road, or the old bush track?',
        { label: 'Along the road', line: 'The road! Mind the trucks.', dash: 'Along the road! Pick it up for 30 seconds!', after: 'Along the road, paddocks roll away, golden with dry grass. A mob of kangaroos lounges under a tree, watching you go.' },
        { label: 'The old bush track', line: 'Bush track! Stay on it. Old diggings are everywhere.', dash: 'Along the bush track! Pick it up for 30 seconds!', after: 'Along the bush track, old mullock heaps and filled in holes are everywhere. A sign says, beware old mine shafts. You stay on the path.' },
        'The road, then. Go!'),
      steady('Settle into an easy pace while Cass rings the school.', { chapter: 'Ringing around' }),
      say('ng-hilda', 'Hilda here, Dunolly historical society. Cass, someone parked a little ute outside the blacksmith’s shop at dawn. With something heavy in the back.'),
      quiz('ng-hilda', 'Hilda’s question. Why was a blacksmith needed when the real nugget was found?', ['No scales were big enough', 'To make a crown', 'To fix a wagon'], 'No scales were big enough to weigh it! So a blacksmith split it into pieces on his anvil.'),
      say('ng-josh', '[excited] The blacksmith! Maybe someone wants to split our nugget too! It is plaster! It will shatter!'),
      dash(45, 'To Dunolly before anyone swings a hammer! Pick it up for 45 seconds!', { chapter: 'To Dunolly', fx: 'noirstab' }),
      steady('Cool down with an easy jog or a walk into town.', { chapter: 'Into town' }),
      quiz('ng-cass', 'Last one. When was the monument here put up?', ['1897', '1997', '1869'], 'In 1897, twenty eight years after the find. Just a short walk from the spot.'),
    ],
    finale: 'Three Centimetres Down is done. An empty box, a trail of gold paint, and a ute outside the blacksmith’s. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'nugget-anvil',
    episode: 2,
    previously: 'Previously on The Welcome Stranger: an empty box at Moliagul, gold paint on the track, and a ute outside the blacksmith’s.',
    next: 'Next time on The Welcome Stranger: Ballarat, a stockade, and a nugget in a parade.',
    title: 'The Anvil',
    blurb: 'At Dunolly, the old blacksmith’s shop has a guest: a ute with gold paint on the tray. But the blacksmith has a very good reason.',
    place: { name: 'Dunolly', lat: -36.8590, lng: 143.7330 },
    loop: line('ng-cass', 'A loop! Like a horseshoe. Round, and back to the start.'),
    early: line('ng-cass', 'Stop there, all good. The bakery is just there.'),
    open: { scene: 'goldfield', chapter: 'Dunolly', text: 'Dunolly, a small gold town. A wide main street, old verandahs, a bakery, and the sound of a hammer ringing on metal. Start with an easy walk or jog.' },
    steps: [
      say('ng-alf', '[laughs] G’day! Alf. Blacksmith. Yes, I have your nugget. Do not panic. I am not splitting it. I am making it a stand.'),
      say('ng-alf', 'The relay organisers asked me to make an iron stand, so it does not roll off the trailer. I picked it up early. Sorry for the fright.'),
      quiz('ng-alf', 'How heavy was the real Welcome Stranger, with the rock in it?', ['About 109 kilos', 'About 10 kilos', 'About 1,000 kilos'], 'About a hundred and nine kilos. More than a big man. The gold alone was over seventy.'),
      say('ng-josh', '[sighs] Phew. So it is safe. Can we take it back?'),
      say('ng-alf', 'Ah. Here is the thing. Another fellow came by an hour ago. Said he was from the relay. Took it to Ballarat for the parade. Nice bloke. Big hat.'),
      dash(30, 'Ballarat is down the highway! Pick it up for 30 seconds to the car!', { chapter: 'The road', fx: 'whoosh' }),
      say(null, 'You pile into Cass’s car. Josh has a map. Alf waves his hammer. Hilda runs out of the bakery with a bag of pasties for the trip.', { spatial: 'car' }),
      quiz('ng-hilda', 'When did people first find gold at Ballarat?', ['August 1851', 'August 1951', 'August 1751'], 'The 8th of August, 1851. Within months, thousands of people arrived.'),
      choice('ng-cass', 'stop', 'Halfway, a stop. Run round the lake at Maryborough, or the old station?',
        { label: 'Round the lake', line: 'The lake! Ducks and gum trees.', dash: 'Round the lake! Pick it up for 30 seconds!', after: 'Round the lake, ducks squabble over bread, and the old gum trees cast long shadows on the water.' },
        { label: 'The old station', line: 'The station! It is enormous for a small town.', dash: 'Round the old station! Pick it up for 30 seconds!', after: 'Round the old railway station, huge and fancy, built in the gold years when everyone thought this town would be a city.' },
        'The lake, then. Go!'),
      steady('Settle into an easy pace while Josh reads about the gold rush.', { chapter: 'The road' }),
      quiz('ng-josh', 'Victoria had about 75,000 people in 1851. How many by 1861?', ['About 500,000', 'About 80,000', 'About 5 million'], 'About half a million! Gold brought people from all over the world.'),
      say('ng-cass', '[curious] Josh, ring the parade people. Ask about the man in the big hat.'),
      say('ng-josh', '[laughs] They say, big hat, that is Barry. He runs the parade. He is lovely. He just did not tell anyone. Classic Barry.'),
      dash(45, 'The parade starts at noon! Pick it up for 45 seconds into Ballarat!', { chapter: 'Ballarat', fx: 'noirstab' }),
      steady('Cool down with an easy jog or a walk down the main street.', { scene: 'street', chapter: 'Main street' }),
      quiz('ng-alf', 'Last one. Why do blacksmiths use an anvil?', ['To shape hot metal', 'To sit on', 'To keep birds away'], 'To shape hot metal with a hammer. And once, to split the biggest nugget in history.'),
    ],
    finale: 'The Anvil is safe. A blacksmith with good intentions, a bag of pasties, and Barry in a big hat. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'nugget-ballarat',
    episode: 3,
    previously: 'Previously on The Welcome Stranger: Alf the blacksmith, an iron stand, and Barry in a big hat, heading for Ballarat.',
    next: 'Next time on The Welcome Stranger: Bendigo, a dragon over a hundred metres long, and the nugget in a museum.',
    title: 'Ballarat',
    blurb: 'Ballarat’s goldfields parade. Barry in the big hat has the nugget, but the parade route passes the Eureka site, and something goes wrong.',
    place: { name: 'Ballarat', lat: -37.5620, lng: 143.8500 },
    loop: line('ng-cass', 'A loop! Like the parade, round the block and back.'),
    early: line('ng-cass', 'Stop there, all good. Watch the parade go by.'),
    open: { scene: 'festival', chapter: 'Ballarat', text: 'Ballarat, the great gold city. Grand old buildings, a wide main street, and a parade of people in old gold rush costumes. Start with an easy walk or jog.' },
    steps: [
      say('ng-cass', 'Cass here. The parade. People in bonnets, miners’ hats, a brass band. And at the back, on a little trailer, our golden nugget.'),
      say('ng-barry', '[laughs] Barry! Big hat! Sorry, Cass. I meant to ring. I will ring next time. Your nugget is the star of the show.'),
      quiz('ng-cass', 'In the gold rush, what did miners have to buy to dig for gold?', ['A licence', 'A horse', 'A ticket'], 'A miner’s licence, paid every month. Many miners thought it was unfair.'),
      say(null, 'The parade stops at a quiet park. A flag flies here, a white cross and stars on blue. This is where the Eureka Stockade stood in 1854.', { spatial: 'brassband' }),
      say('ng-cass', 'Miners here stood up for fair rules and a vote. Soldiers stormed their stockade on the 3rd of December 1854. Sixteen miners lost their lives. We remember them.'),
      quiz('ng-josh', 'The Eureka Stockade happened in which year?', ['1854', '1954', '1754'], '1854. It helped bring the vote to ordinary people in Victoria.'),
      dash(30, 'The parade is moving again! Pick it up for 30 seconds to catch the trailer!', { chapter: 'The trailer', fx: 'whoosh' }),
      say('ng-josh', '[excited] Cass! The trailer! The nugget is gone! There is just the iron stand!'),
      say('ng-barry', '[sighs] Oh no. A museum van came by. The driver said, the nugget goes to Bendigo next, for the dragon parade. I thought it was planned.'),
      choice('ng-cass', 'way', 'Find the van! Down the main street, or round by the lake?',
        { label: 'Down the main street', line: 'Main street! Grand buildings, big crowds.', dash: 'Down the main street! Pick it up for 30 seconds!', after: 'Down the main street, past huge banks built with gold money. No van. Just a lot of people in bonnets.' },
        { label: 'Round by the lake', line: 'The lake! Rowers and swans.', dash: 'Round Lake Wendouree! Pick it up for 30 seconds!', after: 'Round the lake, rowers glide past and black swans cruise the shallows. No van. But a phone call from Bendigo.' },
        'Main street, then. Go!'),
      steady('Settle into an easy pace while Cass takes the call.', { chapter: 'The call' }),
      say('ng-mei', 'Hello, Mei here, from the Golden Dragon Museum in Bendigo. We have your nugget. Our driver thought it was ours. It is very beautiful. Come and get it.'),
      quiz('ng-mei', 'Mei’s question. About how many Chinese miners were on the Victorian goldfields by 1858?', ['About 33,000', 'About 300', 'About 3 million'], 'About thirty three thousand. Many of them came to Bendigo. Their story is a big part of ours.'),
      dash(45, 'The road to Bendigo! Pick it up for 45 seconds to the car!', { chapter: 'To Bendigo', fx: 'noirstab' }),
      steady('Cool down with an easy jog or a walk while Josh eats the last pasty.', { chapter: 'On the road' }),
      quiz('ng-cass', 'Last one. With all the gold money, what nickname did Melbourne get?', ['Marvellous Melbourne', 'Muddy Melbourne', 'Mellow Melbourne'], 'Marvellous Melbourne. The city grew rich and grand on goldfields gold.'),
    ],
    finale: 'Ballarat is done. A parade, a quiet moment at Eureka, and a nugget that has hitched a ride to Bendigo. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'nugget-bendigo',
    episode: 4,
    previously: 'Previously on The Welcome Stranger: Ballarat’s parade, a moment at Eureka, and a museum van that took the nugget to Bendigo.',
    next: 'Next time on The Welcome Stranger: Castlemaine, where gold was found in 1851, and the end of the relay.',
    title: 'The Dragon',
    difficulty: 'Push yourself',
    blurb: 'At Bendigo’s Golden Dragon Museum, Mei has the nugget. But the museum wants it for a day, and Josh has a question nobody expected.',
    place: { name: 'Golden Dragon Museum, Bendigo', lat: -36.7550, lng: 144.2830 },
    loop: line('ng-cass', 'A loop! Like a dragon chasing its tail.'),
    early: line('ng-cass', 'Stop there, all good. Go and see the dragons.'),
    open: { scene: 'street', chapter: 'Bendigo', text: 'Bendigo, another great gold city. Red lanterns over a garden, a temple roof, and inside a museum, dragons that fill whole rooms. Start with an easy walk or jog.' },
    steps: [
      say('ng-mei', '[laughs] Welcome! Mei here. Your nugget is safe, beside our oldest dragon, Loong. They look good together. Gold and red.'),
      quiz('ng-mei', 'Sun Loong, our famous dragon, is how long?', ['Over 100 metres', 'About 10 metres', 'About 1 metre'], 'Over a hundred metres! It took a big team of people to carry it in the Easter parade.'),
      say(null, 'The dragon’s head is huge, with bright eyes and a long beard. Its body winds away across the room, scale after scale.', { spatial: 'chatter', fx: 'gong' }),
      say('ng-josh', '[curious] Mei, why are there so many Chinese things here? I did not know.'),
      say('ng-mei', 'Thousands of Chinese miners came to Bendigo for gold. Many stayed. They built gardens, temples and families. And dragons. Lots of dragons.'),
      dash(30, 'Mei wants to show you the garden! Pick it up for 30 seconds!', { chapter: 'The garden', fx: 'whoosh' }),
      quiz('ng-mei', 'The Golden Dragon Museum opened in which year?', ['1991', '1891', '2021'], '1991. But its oldest treasures are much, much older.'),
      say(null, 'In the garden, a little stone bridge crosses a pond full of orange fish. A temple to Kuan Yin, goddess of kindness, glows in the sun.', { scene: 'festival' }),
      choice('ng-cass', 'way', 'Mei asks a favour. Walk the nugget round the garden, or to the front steps for a photo?',
        { label: 'Round the garden', line: 'The garden. Slow and proud.', dash: 'Round the garden! Pick it up for 30 seconds, carefully!', after: 'Round the garden, kids follow the golden nugget like it is a parade. Mei laughs and claps.' },
        { label: 'To the front steps', line: 'The steps! For the photo.', dash: 'To the front steps! Pick it up for 30 seconds, carefully!', after: 'On the front steps, the whole museum staff poses with the golden nugget. A photographer counts down. Everyone says gold.' },
        'The garden, then. Go!'),
      steady('Settle into an easy pace while Josh talks to Mei.', { chapter: 'Josh’s question' }),
      say('ng-josh', 'Mei. Our class made the nugget for the relay. But I think it should stay here a bit. For people to learn about the Chinese miners too. Can we share it?'),
      say('ng-cass', '[sighs] Josh. That is a beautiful idea. After the relay finishes, it can come back here. A month in each town. A travelling nugget.'),
      quiz('ng-cass', 'The goldfields grew fast. Which came first, finds at Clunes, or at Ballarat?', ['Clunes', 'Ballarat', 'At the same time'], 'Clunes, on the 1st of July 1851. Ballarat came about five weeks later.'),
      dash(45, 'The relay finishes at Castlemaine tomorrow! Pick it up for 45 seconds to load up!', { chapter: 'Loading up', fx: 'noirstab' }),
      say('ng-mei', 'Take Loong’s blessing with you. In our stories, dragons bring good luck. Your nugget will need it, with Barry about.'),
      steady('Cool down with an easy jog or a walk under the lanterns.', { scene: 'street', chapter: 'Lanterns' }),
      quiz('ng-mei', 'Last one. In which year did Sun Loong retire from the Easter parade?', ['2019', '1919', '1991'], '2019. A new dragon took over. Sun Loong rests in the museum now.'),
    ],
    finale: 'The Dragon is met. A golden nugget beside Loong, a travelling nugget plan, and the last leg tomorrow. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'nugget-castlemaine',
    episode: 5,
    previously: 'Previously on The Welcome Stranger: the Golden Dragon Museum, a dragon’s blessing, and Josh’s idea of a travelling nugget.',
    title: 'The Relay Home',
    difficulty: 'Push yourself',
    blurb: 'The last leg of the goldfields relay, at Castlemaine. Every runner, every town, and one golden nugget carried home.',
    place: { name: 'Castlemaine', lat: -37.0640, lng: 144.2170 },
    loop: line('ng-cass', 'A loop. Every relay comes home.'),
    early: line('ng-cass', 'Stop there, all good. Come to the finish for a pie.'),
    open: { scene: 'goldfield', chapter: 'Castlemaine', text: 'Castlemaine, at the foot of Mount Alexander. Old stone buildings, a market hall, and a crowd lining the street for the relay finish. Start with an easy walk or jog.' },
    steps: [
      say('ng-cass', '[excited] Cass here! Everyone came. Alf, Hilda, Barry in a new bigger hat, Mei with a little dragon, and my whole class.'),
      quiz('ng-hilda', 'Gold was found near here, at Mount Alexander, in which year?', ['1851', '1951', '1801'], 'July 1851. It became one of the richest goldfields in the world.'),
      say('ng-barry', '[laughs] I have a confession. I have lost the trailer key. But I have a wheelbarrow. A very strong wheelbarrow.'),
      dash(30, 'The relay is off! Pick it up for 30 seconds beside the wheelbarrow!', { chapter: 'The relay', fx: 'whistle' }),
      say(null, 'Josh pushes the golden nugget in a wheelbarrow. Kids run beside him cheering. The brass band plays, very loud and a bit wrong.', { spatial: 'brassband' }),
      quiz('ng-cass', 'The real nugget was split on an anvil by a blacksmith. What was his name?', ['Archibald Walls', 'Alf', 'Barry'], 'Archibald Walls. Our Alf says he is a big fan.'),
      say('ng-alf', '[laughs] The iron stand is waiting at the finish. Polished. I may have added a little dragon on the side. For Mei.'),
      choice('ng-cass', 'hand', 'The last hand over! Josh takes it home, or the youngest kid in the class?',
        { label: 'Josh takes it home', line: 'Josh! He carried it into the box.', dash: 'Josh brings it home! Pick it up for 30 seconds beside him!', after: 'Josh pushes the barrow over the line, red faced and grinning. The whole class lifts the nugget onto its stand.' },
        { label: 'The youngest kid', line: 'The youngest! Josh likes that.', dash: 'The youngest takes over! Pick it up for 30 seconds beside her!', after: 'Josh hands the barrow to little Ava, aged seven. She wobbles over the line to the loudest cheer of the day.' },
        'Josh, then. Go!'),
      steady('Settle into an easy pace as the crowd gathers round the stand.', { chapter: 'The stand' }),
      say('ng-cass', 'The relay is done. And thanks to Josh, the nugget now travels. A month in Moliagul, Dunolly, Ballarat, Bendigo and Castlemaine. Every year.'),
      quiz('ng-josh', 'How much gold was in the real Welcome Stranger, without the rock?', ['About 72 kilos', 'About 7 kilos', 'About 700 kilos'], 'About seventy two kilos of gold. Our copy is plaster. Much cheaper. Just as shiny.'),
      say('ng-mei', 'Josh. The dragon blessing worked. Nobody dropped it. Not even Barry.'),
      dash(45, 'Victory lap round the market hall! Pick it up for 45 seconds with everyone!', { chapter: 'Victory lap', fx: 'brassfanfare' }),
      say(null, 'Everyone runs one lap together. Teachers, kids, a blacksmith, a museum guide, a man in a very big hat, and you.', { spatial: 'crowdwave' }),
      steady('Cool down with an easy jog or a walk to the pie shop.', { chapter: 'Pies' }),
      quiz('ng-cass', 'Last one, Runner. The Welcome Stranger is the largest of what kind of gold nugget ever found?', ['Alluvial', 'Chocolate', 'Plastic'], 'Alluvial. Found in loose dirt, not deep in rock. Three centimetres down. Still the biggest ever.'),
    ],
    finale: 'The Welcome Stranger is complete. One golden copy, five towns, a dragon’s blessing and a wheelbarrow. The nugget travels on. Thanks, Runner.',
  }),
]

export const CHAIN = ['nugget-moliagul', 'nugget-anvil', 'nugget-ballarat', 'nugget-bendigo', 'nugget-castlemaine']

export const CAST = {
  'nugget-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.88, rate: 0.97 }, // Peter Michael
  'ng-cass': { name: 'Cass', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 1.08, rate: 1.04, radio: true }, // Amelia, in your earbuds
  'ng-josh': { name: 'Josh', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.25, rate: 1.06 }, // Ziggy
  'ng-hilda': { name: 'Hilda', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.88, rate: 0.96, radio: true }, // Julieanne, on the phone
  'ng-alf': { name: 'Alf', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.96 }, // Jimbo
  'ng-barry': { name: 'Barry', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.95, rate: 1.04, radio: true }, // Scotty
  'ng-mei': { name: 'Mei', voiceId: 'Y7xQSS5ZtS4xv4VJotWd', pitch: 1.05, rate: 1.0 }, // Christine
}

export const LOOK = { accent: '#FFD34E', deep: '#2A1A3A', tag: 'Gold rush chase' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
