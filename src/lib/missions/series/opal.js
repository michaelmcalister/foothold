// Opal Town: a five episode mystery in Coober Pedy, the outback town where
// people live underground to escape the heat. Rosie, whose family runs an
// underground guesthouse, and her grandad Nonno Sal, an old opal miner,
// send you after Nonno's lucky opal, the Little Comet, which has gone
// missing from his dugout wall. The trail runs through mullock heaps, an
// underground church, a golf course with no grass, the long dog fence and
// the town's opal festival. Nobody is hurt, nobody goes near open mine
// shafts, and every run stays on roads and town paths.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - Coober Pedy: Willie Hutchison found the first opal there on 1
//     February 1915; the name likely comes from Kokatha words for
//     "whitefella" and "hole in the ground"; many people live in dugouts,
//     which keep a steady temperature; it supplies most of the world's gem
//     opal; summer highs often pass 40 degrees, with a record of 48.3; it
//     has underground Serbian Orthodox and Catholic churches; the golf
//     course has no grass, is mostly played at night with glowing balls,
//     and players carry a bit of turf; it is 846 km from Adelaide on the
//     Stuart Highway; Mad Max Beyond Thunderdome was filmed there in 1985
//     (Coober Pedy, Wikipedia)
//   - opal is silica with water in it, usually 6 to 10 percent; its play of
//     colour comes from tiny ordered spheres of silica bending light;
//     Australia is often said to produce 95 to 97 percent of precious opal;
//     the Olympic Australis, found at Coober Pedy in August 1956, weighs
//     17,000 carats (Opal, Wikipedia)
//   - the dingo fence is 5,614 km long, built from 1880 to 1885 to keep
//     dingoes out of the south east; it runs near Coober Pedy (Dingo Fence)
//
// Real people are only mentioned, never voiced. The Little Comet and
// everyone with lines are made up. Never go near mine shafts or holes.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('op-rosie', '[excited] Bonza! Like a flash of colour! Ease right back now.'),
  okay: line('op-rosie', 'You got there, and that is what counts. Ease right back now.'),
  half: line('op-rosie', 'Halfway! Keep going!'),
}
const EASY = line('op-rosie', 'Easy now. Out here, the sun wins every race. Pace yourself.')
const base = { saga: 'opal', guide: 'op-rosie', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'opal',
  title: 'Opal Town',
  blurb: 'In Coober Pedy, people live underground and the golf course has no grass. Now an old miner’s lucky opal has vanished from his dugout wall.',
  note: 'Real Coober Pedy places and history. The Little Comet and the people are made up. Never go near mine shafts, and always carry water.',
  narrator: 'opal-narrator',
  score: 'velocity',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'opal-dugout',
    episode: 1,
    next: 'Next time on Opal Town: a fossicking area, a dusty trail of footprints, and a stranger with a very shiny bucket.',
    title: 'The Little Comet',
    blurb: 'Nonno Sal’s lucky opal, the Little Comet, has vanished from the wall of his underground home. Rosie needs a fast pair of legs.',
    place: { name: 'Coober Pedy, South Australia', lat: -29.0135, lng: 134.7544 },
    loop: line('op-rosie', 'A loop! Like the tunnels in a dugout. You always end up back in the kitchen.'),
    early: line('op-rosie', 'Stop there, no worries. Come down into the cool for a cold drink.'),
    open: { scene: 'outback', chapter: 'Opal Town', text: 'Coober Pedy, in the middle of South Australia. Red hills dotted with white piles of dirt, doors cut into hillsides, and heat already shimmering. Start with an easy walk or jog.' },
    steps: [
      say('op-rosie', 'Hi! Rosie here. My family runs a guesthouse. Underground. It stays cool down there, even when it is forty five outside.'),
      say('op-sal', '[sighs] Nonno Sal. Fifty years I mine opal. One stone I never sell. The Little Comet. Blue and green and red, like fireworks. This morning, gone.'),
      quiz('op-rosie', 'Warm up. When was opal first found here?', ['1915', '1815', '1995'], 'In February 1915. A teenager called Willie Hutchison found it while looking for water.'),
      say(null, 'Inside the dugout, the walls are smooth sandstone, cool to the touch. In one wall, a little hollow with a light above it. Empty.', { scene: 'tunnel' }),
      say('op-rosie', '[curious] Look. Red dust on the floor, in little circles. Like someone put a bucket down. And footprints going out.'),
      dash(30, 'Follow the footprints out into the sun! Pick it up for 30 seconds!', { chapter: 'Outside', fx: 'whoosh' }),
      say(null, 'Outside, the light is blinding. The footprints head up the hill, past a sign that says, danger, open shafts, keep to the road.', { scene: 'outback', spatial: 'car' }),
      say('op-rosie', 'We stay on the road. Always. Those holes go down a long way, and they do not have lids.'),
      quiz('op-sal', 'People here live in homes cut into hills. What do we call them?', ['Dugouts', 'Igloos', 'Treehouses'], 'Dugouts. Cool in summer, warm in winter. Good for an old man’s bones.'),
      choice('op-rosie', 'way', 'The prints split. Along the main street, or up the hill road?',
        { label: 'The main street', line: 'Main street! Wave to everyone.', dash: 'Along the main street! Pick it up for 30 seconds!', after: 'Along the main street, past opal shops, a bakery and a café in an old bus. A shopkeeper says a man with a bucket went by.' },
        { label: 'The hill road', line: 'Hill road! Stay on the road, remember.', dash: 'Up the hill road! Pick it up for 30 seconds!', after: 'Up the hill road, you see the whole town. Little white chimneys poke out of the ground, the air vents of underground homes.' },
        'Main street, then. Go!'),
      steady('Settle into an easy pace while Rosie rings around the town.', { chapter: 'Asking around' }),
      quiz('op-rosie', 'Puzzle. The air vents poke out of the hill. What is under each one?', ['A home', 'A rocket', 'A rabbit'], 'A home! The vents let fresh air into the dugouts below.'),
      say('op-dimi', '[curious] Dimi here, opal cutter. A man brought me a stone this morning to polish. Blue, green, red. Very nice. He said it was his.'),
      say('op-sal', '[sighs] My Comet. Who would take an old man’s lucky stone?'),
      dash(45, 'Dimi says the man went to the fossicking area! Pick it up for 45 seconds!', { chapter: 'The chase', fx: 'noirstab' }),
      say('op-dimi', 'Wait. I have his phone number. He left it to pick up the stone. Name of Barry. Shall I call him, or will you?'),
      steady('Cool down with an easy jog or a walk into the shade.', { chapter: 'The shade' }),
      quiz('op-rosie', 'Last one. About how far is Coober Pedy from Adelaide?', ['About 850 km', 'About 85 km', 'About 8,500 km'], 'About eight hundred and fifty kilometres, up the Stuart Highway. A long drive for a pie.'),
    ],
    finale: 'The Little Comet is spotted. A bucket, a trail of footprints, and a man called Barry who says the stone is his. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'opal-noodling',
    episode: 2,
    previously: 'Previously on Opal Town: a lucky opal gone from Nonno Sal’s wall, a trail of footprints, and a man called Barry.',
    next: 'Next time on Opal Town: an underground church, a golf course with no grass, and glowing golf balls in the night.',
    title: 'The Fossickers',
    blurb: 'Barry is at the public fossicking area, sifting through mullock heaps for opal. He says he found the stone fair and square.',
    place: { name: 'Coober Pedy fossicking area', lat: -29.0050, lng: 134.7600 },
    loop: line('op-rosie', 'A loop! Like sifting dirt. Round and round until something shines.'),
    early: line('op-rosie', 'Stop there, all good. Barry is not going anywhere. He loves it here.'),
    open: { scene: 'outback', chapter: 'The heaps', text: 'The public fossicking area. Pale piles of dirt dug up from mines, and people of all ages bent over them, looking for a flash of colour. Start with an easy walk or jog.' },
    steps: [
      say('op-rosie', 'Rosie here. Fossicking means looking through old mine dirt for opal the miners missed. Anyone can do it here. It is the safe, legal way.'),
      say('op-barry', '[laughs] G’day! Barry. Tourist. From Wagga. I found a beautiful stone yesterday! Right here. Blue, green and red. Fair and square!'),
      quiz('op-rosie', 'What is opal mostly made of?', ['Silica and water', 'Gold and silver', 'Sugar and salt'], 'Silica and water. Up to about a tenth of it is water. Amazing for a rock.'),
      say('op-sal', '[curious] Yesterday? Then it cannot be my Comet. Mine was on my wall this morning at six. I said goodnight to it. I always do.'),
      say('op-rosie', 'Wait. So there are two stones? Barry found one yesterday. Nonno’s went missing today. Two mysteries!'),
      dash(30, 'Let’s check the dirt Barry was sifting! Pick it up for 30 seconds!', { chapter: 'The sieve', fx: 'whoosh' }),
      say(null, 'Barry’s spot is near the bottom of a heap. His sieve, his bucket, his hat. And a thermos. And a very big sandwich.', { spatial: 'chatter' }),
      quiz('op-dimi', 'Dimi’s question. What makes opal flash with colours?', ['Tiny spheres bending light', 'Paint', 'Little lights inside'], 'Tiny spheres of silica, all in rows, bend the light into colours. Nature’s disco.'),
      choice('op-rosie', 'next', 'Barry’s stone is real, and it is his. So where is Nonno’s? Back to the dugout, or ask at the café?',
        { label: 'Back to the dugout', line: 'Dugout! Clues start at home.', dash: 'Back to the dugout! Pick it up for 30 seconds!', after: 'Back at the dugout, you find something new. A tiny glowing golf ball, wedged under the doormat.' },
        { label: 'Ask at the café', line: 'The café! Everyone gossips there.', dash: 'To the café! Pick it up for 30 seconds!', after: 'At the café, the owner says a kid came in this morning with a pocket full of glowing golf balls. Then left in a hurry.' },
        'Dugout, then. Go!'),
      steady('Settle into an easy pace while Rosie thinks.', { chapter: 'Thinking' }),
      say('op-rosie', 'A glowing golf ball. That is from the night golf. Our course has no grass. You play at night, with balls that glow.'),
      quiz('op-rosie', 'On the grassless golf course, what do players carry with them?', ['A bit of turf', 'A lawn mower', 'A sheep'], 'A little square of turf to hit off. Everywhere else is dirt and rocks.'),
      say('op-barry', '[laughs] I am staying for the night golf. And Dimi is polishing my stone. Best holiday ever. Good luck with yours, Sal.'),
      dash(45, 'The golf club opens at sunset! Pick it up for 45 seconds to get there first!', { chapter: 'Sunset', fx: 'noirstab' }),
      say(null, 'The sun drops, red and huge, behind the hills. The heat lets go. All over town, people come up out of the ground for the evening.', { scene: 'night' }),
      steady('Cool down with an easy jog or a walk as the stars come out.', { chapter: 'Evening' }),
      quiz('op-sal', 'Last one. About how much of the world’s precious opal comes from Australia?', ['Most of it', 'None of it', 'Only a tiny bit'], 'Most of it. People say ninety five percent or more, though some experts think less. Still, a lot.'),
    ],
    finale: 'The Fossickers are cleared. Barry’s stone is his, Nonno’s is still missing, and a glowing golf ball points the way. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'opal-golf',
    episode: 3,
    previously: 'Previously on Opal Town: two stones, not one, Barry’s lucky find, and a glowing golf ball under Nonno’s doormat.',
    next: 'Next time on Opal Town: a drive to the dog fence, the longest fence in the world, and a kid with a confession.',
    title: 'Night Golf',
    difficulty: 'Push yourself',
    blurb: 'A glowing golf ball leads to Coober Pedy’s grassless night golf course, and a stop at an underground church on the way.',
    place: { name: 'Coober Pedy underground church', lat: -29.0160, lng: 134.7560 },
    loop: line('op-rosie', 'A loop! Like a round of golf. Eighteen holes, back to the clubhouse.'),
    early: line('op-rosie', 'Stop there, all good. The golf goes on till late.'),
    open: { scene: 'night', chapter: 'After dark', text: 'Coober Pedy after dark. The air is finally cool. Above, more stars than you have ever seen. On the hill, little green lights are bouncing. Start with an easy walk or jog.' },
    steps: [
      say('op-rosie', '[whispers] Rosie here. First, a quick stop. The underground church. Nonno says the kid with the golf balls goes to the youth group there.'),
      say(null, 'Steps lead down into the hill. Inside, a church carved from sandstone, the walls curving like a cave, candles flickering.', { scene: 'tunnel', fx: 'bellring' }),
      quiz('op-rosie', 'Coober Pedy has more than one underground church. Which of these is one of them?', ['Serbian Orthodox', 'A Viking chapel', 'A pirate church'], 'The Serbian Orthodox church, and a Catholic one too. Both carved into the rock.'),
      say('op-dimi', 'Dimi here. The youth leader says the kid is called Leo. He is eleven. He is at night golf. He seemed upset this morning.'),
      dash(30, 'To the golf course! Pick it up for 30 seconds!', { chapter: 'The course', fx: 'whoosh' }),
      say(null, 'The course is rock and red dirt, flags in the dark, and glowing balls flying through the night like tiny green comets.', { spatial: 'chatter', scene: 'night' }),
      say('op-kev', '[laughs] Kev, club captain. Mind your head. Leo? He is on the fifth. Lost his ball in a bush. Lost a few things today, I reckon.'),
      quiz('op-kev', 'Why do we mostly play golf here at night?', ['It is too hot by day', 'The balls are shy', 'The flags sleep'], 'Too hot in the day. And the glowing balls look brilliant. Best course in the world, I reckon.'),
      choice('op-rosie', 'hole', 'The fifth hole. Straight up the fairway, or round by the path?',
        { label: 'Up the fairway', line: 'Fairway! Watch for flying balls.', dash: 'Up the fairway! Pick it up for 30 seconds!', after: 'Up the fairway, a glowing ball whizzes past and bounces off a rock. Somebody yells sorry from the dark.' },
        { label: 'Round by the path', line: 'The path. Safer. Slower. Smarter.', dash: 'Round by the path! Pick it up for 30 seconds!', after: 'Round by the path, under a sky full of stars, you see a small figure with a torch, looking in a bush.' },
        'Fairway, then. Go!'),
      steady('Settle into an easy pace while Rosie walks over to Leo.', { chapter: 'The fifth' }),
      say('op-leo', '[sighs] Hi. I am Leo. I took Nonno Sal’s opal. I am really sorry. I did not steal it. I borrowed it. For my dad.'),
      say('op-leo', 'Dad works on the dog fence. He is away for weeks. It is his birthday tomorrow. I wanted to show him a real Coober Pedy opal. On video.'),
      quiz('op-rosie', 'Puzzle. Leo borrowed the stone this morning. His dad is far out on the fence. Where is the stone now?', ['With Leo', 'With Barry', 'In the bush'], 'Still with Leo, in his pocket, wrapped in a sock. He was too scared to give it back.'),
      dash(45, 'Let’s get Leo and the Comet to Nonno! Pick it up for 45 seconds!', { chapter: 'To Nonno', fx: 'noirstab' }),
      say('op-sal', '[laughs] Leo. Leo. You could have asked. I would say yes. Tomorrow, we take the Comet to your dad. Together. Rosie drives.'),
      steady('Cool down with an easy jog or a walk back through town.', { chapter: 'Home' }),
      quiz('op-rosie', 'Last one. Which famous movie was filmed around Coober Pedy in 1985?', ['Mad Max Beyond Thunderdome', 'Finding Nemo', 'Happy Feet'], 'Mad Max Beyond Thunderdome. The red hills look like another planet on film.'),
    ],
    finale: 'Night Golf is played. One glowing ball, one sorry kid, and the Little Comet safe in a sock. Tomorrow, the dog fence. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'opal-fence',
    episode: 4,
    previously: 'Previously on Opal Town: an underground church, night golf, and Leo, who borrowed the Comet for his dad’s birthday.',
    next: 'Next time on Opal Town: the opal festival, a famous stone from 1956, and the Little Comet’s big night.',
    title: 'The Dog Fence',
    difficulty: 'Push yourself',
    blurb: 'Rosie drives Leo and Nonno Sal out to the dog fence, where Leo’s dad is working, for a birthday surprise. You run the last stretch.',
    place: { name: 'Dog fence near Coober Pedy', lat: -28.8500, lng: 134.8800 },
    loop: line('op-rosie', 'A loop! Like a fence line, out and back.'),
    early: line('op-rosie', 'Stop there, all good. Hop back in the ute.'),
    open: { scene: 'outback', chapter: 'Out of town', text: 'A dirt road north of Coober Pedy. Flat, stony desert called gibber, a few low bushes, and a sky so blue it hurts. Start with an easy walk or jog.' },
    steps: [
      say('op-rosie', 'Rosie here. We drive, you run the last bit. We have water, hats and a birthday cake in an esky. Leo has the Comet.'),
      say('op-leo', '[excited] Dad does not know we are coming! He thinks it is just a normal Tuesday!'),
      quiz('op-sal', 'How long is the dog fence?', ['About 5,600 km', 'About 56 km', 'About 560,000 km'], 'About five thousand six hundred kilometres. One of the longest things people have ever built.'),
      say(null, 'Ahead, a fence of wire and posts runs from one edge of the world to the other, straight as a ruler. Along it, a ute and a tiny figure.', { spatial: 'car' }),
      dash(30, 'There is his ute! Pick it up for 30 seconds along the road!', { chapter: 'The ute', fx: 'whoosh' }),
      quiz('op-rosie', 'Why was the dog fence built?', ['To keep dingoes out', 'To keep kangaroos in', 'For decoration'], 'To keep dingoes out of the sheep country in the south east. Built in the 1880s.'),
      say('op-dan', '[laughs] Leo? Mum? Sal? What are you all doing out here? Is that a cake?'),
      say('op-leo', 'Happy birthday, Dad! Look. A real Coober Pedy opal. Nonno Sal’s Little Comet. Hold it up to the sun!'),
      say(null, 'The opal catches the light. Blue, then green, then a flash of fire red, like a firework going off in his hand.', { fx: 'found' }),
      choice('op-rosie', 'lunch', 'Birthday picnic! In the shade of the ute, or by the old water tank?',
        { label: 'Shade of the ute', line: 'The ute! Every bit of shade counts.', dash: 'To the ute! Pick it up for 30 seconds!', after: 'In the ute’s shade, the cake is a little melted but still delicious. A lizard watches from a rock.' },
        { label: 'By the water tank', line: 'The tank! Rusty, but shady.', dash: 'To the old tank! Pick it up for 30 seconds!', after: 'Beside the old tank, a little shade and a lot of flies. The cake is a bit melted but still delicious.' },
        'The ute, then. Go!'),
      steady('Settle into an easy pace along the fence line while everyone eats cake.', { chapter: 'Cake' }),
      say('op-dan', '[sighs] Leo, you borrowed it without asking? Oh, mate. Say sorry to Sal properly.'),
      say('op-leo', 'Sorry, Nonno Sal. Next time I will ask first. Always. I promise.'),
      quiz('op-sal', 'When was the dog fence built?', ['1880 to 1885', '1980 to 1985', '1780 to 1785'], 'In the 1880s. Long before the opal. Long before me. Almost.'),
      say('op-sal', '[laughs] Leo, I have an idea. Tomorrow is the opal festival. The Comet goes on show. And you, my boy, are going to look after it.'),
      dash(45, 'Race back to the ute before the flies get the cake! Pick it up for 45 seconds!', { chapter: 'The flies', fx: 'noirstab' }),
      steady('Cool down with an easy jog or a walk while the ute starts up.', { chapter: 'Back to town' }),
      quiz('op-rosie', 'Last one. What do locals call this flat, stony desert?', ['Gibber', 'Tundra', 'Rainforest'], 'Gibber plains. Stones as far as you can see, polished smooth by wind.'),
    ],
    finale: 'The Dog Fence is reached. One birthday surprise, one melted cake, and a boy who will always ask first. The festival is next. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'opal-festival',
    episode: 5,
    previously: 'Previously on Opal Town: a birthday at the dog fence, a melted cake, and Leo, the new keeper of the Comet.',
    title: 'The Festival',
    difficulty: 'Push yourself',
    blurb: 'The opal festival. The Little Comet goes on show, Leo guards it, and a dust storm rolls in just as the parade starts.',
    place: { name: 'Coober Pedy main street', lat: -29.0130, lng: 134.7550 },
    loop: line('op-rosie', 'A loop! Like the parade. Up the street and back.'),
    early: line('op-rosie', 'Stop there, all good. The party is underground tonight.'),
    open: { scene: 'festival', chapter: 'Festival day', text: 'Opal festival day in Coober Pedy. Stalls up the main street, a brass band, dancers and opals glittering in glass cases. Start with an easy walk or jog.' },
    steps: [
      say('op-rosie', '[excited] Rosie here! The whole town is out. And over there, in a glass case, the Little Comet. With a very serious guard. Leo.'),
      say('op-leo', 'I am guarding it. Nobody touches it. Not even me. Well. Only a little.'),
      quiz('op-dimi', 'A famous opal called the Olympic Australis was found here in 1956. How heavy is it?', ['17,000 carats', '17 carats', '17 tonnes'], 'Seventeen thousand carats, about three and a half kilos. Found the year Melbourne had the Olympics.'),
      say('op-barry', '[laughs] Barry here! My stone is polished! I am entering it in the show. Next to Sal’s. Imagine that.'),
      dash(30, 'The parade is starting! Pick it up for 30 seconds up the main street!', { chapter: 'The parade', fx: 'brassfanfare' }),
      say(null, 'Kids on bikes covered in streamers. A miner’s truck with balloons. The brass band, a little out of tune, very happy about it.', { spatial: 'brassband' }),
      quiz('op-rosie', 'Coober Pedy’s record hottest day was how hot?', ['48.3 degrees', '28.3 degrees', '68.3 degrees'], 'Forty eight point three. That is why we live underground.'),
      say('op-rosie', '[curious] Uh oh. Look south. A wall of red dust, rolling in over the hills. A dust storm. Everyone underground!'),
      choice('op-rosie', 'shelter', 'Get the Comet inside! The church, or Nonno’s dugout?',
        { label: 'The church', line: 'The church! Big and close.', dash: 'To the church! Pick it up for 30 seconds!', after: 'Down the steps into the church, with Leo hugging the glass case. The dust roars past outside. Inside, it is calm and cool.' },
        { label: 'Nonno’s dugout', line: 'Nonno’s! Home of the Comet.', dash: 'To Nonno’s dugout! Pick it up for 30 seconds!', after: 'Down into Nonno’s dugout, with Leo hugging the glass case. The dust roars past outside. Inside, it is calm and cool.' },
        'The church, then. Go!'),
      steady('Settle into an easy pace underground while the storm passes.', { scene: 'tunnel', chapter: 'Underground' }),
      say('op-sal', 'You know, the whole festival came underground too. Listen. The band is playing in the tunnel next door.'),
      quiz('op-sal', 'Why are dugouts so good in a dust storm, and in summer?', ['Steady temperature', 'They have pools', 'They spin'], 'The rock keeps the temperature steady all year. Cool, calm and dust free.'),
      say(null, 'Twenty minutes later, the storm is gone. The town comes up, shakes the dust off, and carries on with the party.', { scene: 'outback' }),
      dash(45, 'The opal show results! Pick it up for 45 seconds to the hall!', { chapter: 'The results', fx: 'noirstab' }),
      say('op-dimi', 'And the people’s choice award goes to. The Little Comet! Guarded by Leo. Second place, Barry from Wagga!'),
      say('op-sal', '[laughs] Leo. The Comet goes back on my wall. But every birthday, you take it to your dad. That is the deal.'),
      steady('Cool down with an easy jog or a walk as the sun sets on Opal Town.', { scene: 'night', chapter: 'Sunset' }),
      quiz('op-rosie', 'Last one, Runner. Who found the first opal here, in 1915?', ['Willie Hutchison', 'Nonno Sal', 'Barry from Wagga'], 'Willie Hutchison, while looking for water. He found a whole town instead.'),
    ],
    finale: 'Opal Town is complete. A lucky stone found, a borrower forgiven, and a dust storm survived underground. Thanks, Runner.',
  }),
]

export const CHAIN = ['opal-dugout', 'opal-noodling', 'opal-golf', 'opal-fence', 'opal-festival']

export const CAST = {
  'opal-narrator': { name: 'Narrator', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.9, rate: 0.98 }, // Lee
  'op-rosie': { name: 'Rosie', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.15, rate: 1.06, radio: true }, // Ruby, in your earbuds
  'op-sal': { name: 'Nonno Sal', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.78, rate: 0.94 }, // Peter Michael, lower
  'op-dimi': { name: 'Dimi', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 0.95, rate: 1.0, radio: true }, // Simon, on the phone
  'op-barry': { name: 'Barry', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.9, rate: 1.02 }, // Jimbo
  'op-kev': { name: 'Kev', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.9, rate: 1.0 }, // Scotty
  'op-leo': { name: 'Leo', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.35, rate: 1.06 }, // Ziggy, lifted
  'op-dan': { name: 'Dan', voiceId: 'U4hJrwpyl0nYYkeTGFiX', pitch: 0.95, rate: 1.02, radio: true }, // Krishna Veer, on the fence radio
}

export const LOOK = { accent: '#7DF0E6', deep: '#1E3A8A', tag: 'Outback mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
