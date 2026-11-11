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
// Episodes 2 to 5 (Bronte, Coogee, Macquarie Lighthouse, Freshwater) use
// compose.js for their timing. Facts checked (web search, November 2026):
//   - Bronte is named after Lord Nelson, Duke of Bronte; its surf club
//     formed in 1903 and is called the oldest in the world; the gentle rock
//     pool is the Bogey Hole (Bronte Beach, Wikipedia)
//   - Wylie's Baths opened on 12 December 1907, built by Henry Wylie; his
//     daughter Mina won silver at Stockholm in 1912; one of the first mixed
//     baths; the timber boardwalk dates from 1912 (Wylie's Baths, Wikipedia)
//   - Macquarie Lighthouse: Australia's first, working from 1818, designed
//     by Francis Greenway; rebuilt in 1883 to James Barnet's design as the
//     sandstone crumbled; 26 m tall, seen 25 nautical miles (46 km); a
//     beacon site since 1794 (Macquarie Lighthouse, Wikipedia)
//   - Duke Kahanamoku surfed at Freshwater in December 1914 and Dee Why in
//     January 1915; his board has been at the Freshwater club since 1952;
//     a statue stands on the headland (Freshwater, Wikipedia)
//
// Real people are only mentioned, never voiced. House rules: tense, never
// cruel, nobody is hurt, and the beach is always respected.

import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

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
  blurb: 'Five beach mysteries from Bondi to Freshwater: a vanished sculpture, a missing bell, a borrowed medal, a lighthouse message and a famous surfboard.',
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
    next: 'Next time on Breakers: the world’s oldest surf club, a brass bell gone missing, and a red cap running south.',
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
  compose({
    id: 'bondi-bronte',
    episode: 2,
    previously: 'Previously on Breakers: a missing bronze whale tail, a trail of trolley tracks, and a sunrise photo at the north end.',
    next: 'Next time on Breakers: a pool cut into the rocks at Coogee, a swimmer from 1912, and a silver medal that went for a swim.',
    saga: 'bondi',
    title: 'The Bronte Bell',
    difficulty: 'Steady effort',
    blurb: 'The brass bell of the world’s oldest surf club has gone missing, the morning of the big club swim. Follow the coast walk south.',
    place: { name: 'Bronte Beach', lat: -33.9035, lng: 151.2680 },
    loop: line('bd-nikki', 'A loop! Up the coast, back again. Proper patrol work.'),
    early: line('bd-nikki', 'All good, stop there. Grab a coffee at Bronte. The bell can ring without you.'),
    guide: 'bd-nikki', results: RESULTS['bd-nikki'], easy: EASY,
    open: { scene: 'surfdawn', chapter: 'Coast walk', text: 'The Bondi to Bronte coast walk, just after sunrise. Sandstone cliffs, a salty breeze, and joggers everywhere. Start with an easy walk or jog.' },
    steps: [
      say('bd-nikki', '[sighs] Nikki here. Bad news from Bronte. Their old brass club bell has vanished. Today is the big swim between our clubs.'),
      say('bd-stan', 'Stan here. That bell is older than me, and I am very old. If Bronte think Bondi took it, there will be a row on the sand.'),
      quiz('bd-stan', 'Bronte’s surf lifesaving club is called the oldest of its kind in the world. When did it start?', ['1903', '1907', '1938'], 'Four years before Bondi. Do not tell Nikki I said so.'),
      say('bd-nikki', '[sarcastic] Thanks, Stan. Bondi says 1906. Bronte says 1903. We will be arguing about it in the year 3000.'),
      dash(30, 'Pick it up for 30 seconds along the cliff path to Tamarama!', { chapter: 'Tamarama', fx: 'whoosh' }),
      say(null, 'Tamarama. A tiny beach tucked between two cliffs. The surf is rough, and a lifeguard is already sitting high in the tower.', { spatial: 'chatter' }),
      say('bd-ana', '[curious] Hi, it is Ana. Remember me, the whale tail? I am setting up a new sculpture at Tamarama. And there is a brass bell sitting in my van.'),
      say('bd-ana', '[laughs] No, I did not take it! A teenager in a red cap left it here at dawn. He said, give it to Stan. Then he ran south.'),
      quiz('bd-nikki', 'Tamarama is tiny. But Bronte is named after a famous sailor. Which one?', ['Lord Nelson', 'Captain Cook', 'Captain Bligh'], 'Lord Nelson was also the Duke of Bronte, in Sicily. So the beach is named after a duke.'),
      choice('bd-nikki', 'way', 'Red cap, heading south! Along the sand, or up the cliff path?',
        { label: 'Along the sand', line: 'The sand! Hard work, great calves.', dash: 'Along the sand! Pick it up for 30 seconds!', after: 'Across the sand, a wave runs up and fizzes round your feet. Ahead, the Bronte surf club flags snap in the wind.' },
        { label: 'Up the cliff path', line: 'The cliff path! Mind the steps.', dash: 'Up the cliff path! Pick it up for 30 seconds!', after: 'Up the cliff path, the whole of Bronte opens below you. A green park, a pool in the rocks, and a red cap down near the baths.' },
        'The sand, then. Go!'),
      say(null, 'At the south end, waves wash over a long pool cut into the rocks. Next to it, a smaller rock pool, calm as a bath.', { scene: 'surfdawn' }),
      steady('Settle into an easy pace around the park while Nikki radios the Bronte club.', { chapter: 'Bronte' }),
      quiz('bd-nikki', 'The calm little rock pool at Bronte has a nickname. What is it?', ['The Bogey Hole', 'The Fish Bowl', 'The Teacup'], 'It is for people who want a gentle swim, away from the big waves.'),
      say('bd-stan', 'The red cap is my grandson, Leo. Oh no. Oh, Leo. What have you done?'),
      say('bd-leo', '[sighs] Hi, Pop. I borrowed it. Sorry. The bell had a crack. I took it to my mate’s dad, he fixes brass. It rings perfect now.'),
      dash(45, 'The swim starts in minutes! Pick it up for 45 seconds and get that bell to the club!', { chapter: 'The swim', fx: 'whistle' }),
      say(null, 'The bell rings out over the beach, clear and bright. Both clubs line up at the water. Nobody argues. For once.', { fx: 'found' }),
      say('bd-stan', '[laughs] Leo, you are a good egg. Next time, ask first. And maybe join a club. Any club. Even Bronte.'),
      steady('Cool down with an easy jog or a walk along the promenade.', { scene: 'surfdawn', chapter: 'Cool down' }),
      quiz('bd-nikki', 'Last one. Who swims first at a surf club carnival, before anyone else?', ['The juniors', 'The president', 'The dogs'], 'The nippers! Kids go first. Then the rest of us look slow.'),
    ],
    finale: 'The Bronte Bell is solved. One bell, fixed and ringing, two clubs on the same beach, and one red cap in a lot of trouble. Nicely done, Runner.',
  }),
  compose({
    id: 'bondi-coogee',
    episode: 3,
    previously: 'Previously on Breakers: a brass bell, a red cap called Leo, and two old clubs sharing one beach.',
    next: 'Next time on Breakers: Australia’s first lighthouse, a light that blinks in a strange pattern, and a message for someone at sea.',
    saga: 'bondi',
    title: 'Wylie’s Medal',
    difficulty: 'Steady effort',
    blurb: 'A swimmer’s silver medal from the 1912 Olympics has vanished from Wylie’s Baths at Coogee. Run the rocks and follow the trail of wet footprints.',
    place: { name: 'Wylie’s Baths, Coogee', lat: -33.9235, lng: 151.2593 },
    loop: line('bd-nikki', 'A loop! Like laps of the baths. Steady strokes.'),
    early: line('bd-nikki', 'Stop there, no worries. Go and float in the baths for a bit.'),
    guide: 'bd-nikki', results: RESULTS['bd-nikki'], easy: EASY,
    open: { scene: 'surfdawn', chapter: 'Coogee', text: 'Coogee Beach, early on a bright morning. Norfolk pines, a long arc of sand, and old pools carved into the rocks. Start with an easy walk or jog.' },
    steps: [
      say('bd-nikki', 'Nikki here, down at Coogee for training. And of course, we have a mystery. Leo is here too. He is a junior now.'),
      say('bd-leo', '[excited] Hi! At Wylie’s Baths there is a copy of an Olympic medal in a glass case. This morning the case was open, and the medal was gone.'),
      quiz('bd-nikki', 'Wylie’s Baths is one of Sydney’s oldest ocean pools. When did it open?', ['1907', '1957', '1888'], 'December 1907, same year as my club. A very good year for swimming.'),
      say(null, 'Wylie’s Baths sits on the rocks at the south end. A wooden boardwalk wraps round the cliff, and the ocean pours in over the edge of the pool.'),
      say('bd-stan', 'Stan here. That medal is a copy of the one Mina Wylie won. Her dad built these baths. My grandmother swam against her, and lost. Every time.'),
      quiz('bd-stan', 'Mina Wylie won a silver medal at the Olympics in which year?', ['1912', '1956', '2000'], 'Stockholm, 1912. One of the very first women to swim at the Olympics.'),
      dash(30, 'Wet footprints, heading up the steps! Pick it up for 30 seconds!', { chapter: 'The steps', fx: 'whoosh' }),
      say(null, 'Small wet footprints lead up the stairs, across the grassy headland and back towards the beach.', { spatial: 'chatter' }),
      quiz('bd-nikki', 'Wylie’s Baths were special in their time. Why?', ['Men and women swam together', 'They had a slide', 'They were heated'], 'Mixed bathing! Back then most baths kept men and women apart.'),
      say('bd-leo', '[curious] The footprints are small. Like a little kid. Or a very small adult with very wet feet.'),
      choice('bd-nikki', 'path', 'The footprints split! Along the beach, or up past the pines?',
        { label: 'Along the beach', line: 'Beach! Watch out for sandcastles.', dash: 'Along the beach! Pick it up for 30 seconds!', after: 'Along the beach, past a row of nippers in pink caps doing push ups on the sand, all giggling.' },
        { label: 'Up past the pines', line: 'The pines! Shady and fast.', dash: 'Up past the pines! Pick it up for 30 seconds!', after: 'Up past the Norfolk pines, the footprints fade on the grass. Then you spot a pink cap behind a bin.' },
        'The beach, then. Go!'),
      steady('Settle into an easy pace along the promenade while Nikki checks the junior carnival list.', { chapter: 'Promenade' }),
      say('bd-nikki', '[laughs] Found it. The under nines are having their swim carnival today. And one of them has a very shiny silver medal round her neck.'),
      say('bd-tilly', 'Hi. I am Tilly. I am seven. I borrowed it for luck. Mina Wylie was the best swimmer. I want to be the best swimmer too.'),
      say('bd-stan', '[laughs] Fair enough, Tilly. Wear it for your race. Then we walk it back together, and you can tell the baths how you went.'),
      dash(45, 'Tilly’s race is starting! Pick it up for 45 seconds to the water’s edge to cheer!', { chapter: 'The carnival', fx: 'whistle' }),
      say(null, 'Tilly swims like a little torpedo. She comes second, beams anyway, and holds the medal up for everyone to see.', { fx: 'found' }),
      steady('Cool down with an easy jog or a walk back to the baths with Tilly and her family.', { chapter: 'Back to Wylie’s' }),
      quiz('bd-nikki', 'Last one. The raised timber boardwalk at Wylie’s was built in which year?', ['1912', '2012', '1812'], 'Same year as Mina’s medal. It still wraps round the rocks today.'),
    ],
    finale: 'Wylie’s Medal is solved. One medal home, one brave seven year old, and a pool full of history. Ripper work, Runner.',
  }),
  compose({
    id: 'bondi-lighthouse',
    episode: 4,
    previously: 'Previously on Breakers: a medal from 1912, a trail of wet footprints, and a seven year old named Tilly.',
    next: 'Next time on Breakers: the beach where surfing came to Australia, a surfboard from 1914, and the biggest paddle out of the year.',
    saga: 'bondi',
    title: 'Greenway’s Light',
    difficulty: 'Push yourself',
    blurb: 'Before dawn, Macquarie Lighthouse seems to blink a strange pattern. Run the cliff tops from Dover Heights and find out who is sending what.',
    place: { name: 'Macquarie Lighthouse, Vaucluse', lat: -33.8546, lng: 151.2856 },
    loop: line('bd-nikki', 'A loop! Like the beam of the light, round and round.'),
    early: line('bd-nikki', 'Stop there, all good. Watch the sun come up. That never gets old.'),
    guide: 'bd-nikki', results: RESULTS['bd-nikki'], easy: EASY,
    open: { scene: 'night', chapter: 'Cliff tops', text: 'The cliff tops north of Bondi, just before dawn. The sea is dark, the sky is going grey, and the lighthouse beam sweeps over the water. Start with an easy walk or jog.' },
    steps: [
      say('bd-nikki', '[curious] Nikki here, early shift. Something odd. Look at the lighthouse. Under the main beam, there is a little light blinking. Short, short, long.'),
      say('bd-stan', 'Stan here. I was a sailor once. That is not the lighthouse. That is someone with a torch, sending Morse code.'),
      quiz('bd-stan', 'Macquarie Lighthouse was Australia’s first. When did the first tower start working?', ['1818', '1918', '1788'], 'Designed by Francis Greenway, a convict architect. His face was once on the ten dollar note.'),
      dash(30, 'North along the cliff top towards the light! Pick it up for 30 seconds!', { chapter: 'North', fx: 'whoosh' }),
      say(null, 'The path runs along the fence line, the cliffs dropping away to the sea. Stay on the path. The light grows bigger with every step.', { spatial: 'owl' }),
      say('bd-leo', 'Leo here! I know Morse. I did it in scouts. Short, short, long. That is a U. And then a lot more letters. Hang on.'),
      quiz('bd-nikki', 'The tower you can see now is a newer one, from 1883. Why was it built?', ['The old one was crumbling', 'A storm blew it away', 'Ships could not see it'], 'The first one was built of soft sandstone, and it was falling apart. So they built a copy beside it.'),
      say('bd-leo', '[excited] Got it! The message is, grandpa, see you at the wharf. Love, Sam. Over and over.'),
      choice('bd-nikki', 'way', 'Someone named Sam! Along the cliff top, or down through the park?',
        { label: 'Along the cliff top', line: 'Cliff top! Stay on the path.', dash: 'Along the cliff top! Pick it up for 30 seconds!', after: 'Along the cliff top, the first gold line of the sun appears on the sea, and a fishing boat chugs out past the heads.' },
        { label: 'Through the park', line: 'Through the park. Watch for magpies.', dash: 'Through the park! Pick it up for 30 seconds!', after: 'Through the park, a magpie warbles from a fence post, and a small figure with a torch stands on a bench near the lighthouse gate.' },
        'Cliff top, then. Go!'),
      steady('Settle into an easy pace while Nikki checks the boats heading out.', { chapter: 'The lighthouse' }),
      say('bd-sam', '[sighs] Hi. I am Sam. My grandpa takes his boat out every morning. He gets lonely out there. So I send him a message with my torch.'),
      say('bd-sam', 'He always flashes back. But today he did not. So I kept trying.'),
      quiz('bd-stan', 'How far out to sea can the lighthouse beam be seen?', ['About 46 kilometres', 'About 4 kilometres', 'About 400 kilometres'], 'Twenty five nautical miles. Sailors have trusted it for over two hundred years.'),
      say('bd-nikki', 'Calling the coast guard radio. They say his boat is fine. His torch battery is flat, that is all. He is waving from the deck.'),
      dash(45, 'His boat is coming back past the heads! Pick it up for 45 seconds to the lookout to wave!', { chapter: 'The wave', fx: 'trainhorn' }),
      say(null, 'Down on the water, an old man stands on his deck and waves both arms. Sam waves back with the torch, laughing.', { fx: 'found', spatial: 'boat' }),
      say('bd-stan', '[laughs] Good kid. Sam, I will lend your grandpa a spare torch. Sailors look after sailors.'),
      steady('Cool down with an easy jog or a walk as the sun climbs out of the sea.', { scene: 'surfdawn', chapter: 'Sunrise' }),
      quiz('bd-nikki', 'Last one. The lighthouse site has guided ships since which year?', ['1794', '1994', '1894'], 'Before the first tower, a fire was lit here on a pole. Over two hundred years of looking after sailors.'),
    ],
    finale: 'Greenway’s Light is solved. One flat battery, one happy grandpa, and a kid who speaks fluent torch. Great running, Runner.',
  }),
  compose({
    id: 'bondi-duke',
    episode: 5,
    previously: 'Previously on Breakers: a torch at the lighthouse, a message in Morse, and a grandpa waving from his boat.',
    saga: 'bondi',
    title: 'The Duke’s Board',
    difficulty: 'Push yourself',
    blurb: 'At Freshwater, where surfing came to Australia in 1914, a famous old board goes missing on the morning of the big paddle out.',
    place: { name: 'Freshwater Beach', lat: -33.7804, lng: 151.2905 },
    loop: line('bd-nikki', 'A loop! Like catching a wave and paddling back out.'),
    early: line('bd-nikki', 'Stop there, no stress. Watch the paddle out from the sand.'),
    guide: 'bd-nikki', results: RESULTS['bd-nikki'], easy: EASY,
    open: { scene: 'surfdawn', chapter: 'Freshwater', text: 'Freshwater Beach, on Sydney’s northern beaches. A small bay, golden cliffs, and a crowd gathering on the sand. Start with an easy walk or jog.' },
    steps: [
      say('bd-nikki', '[excited] Nikki here! Big day. Every club on the coast is here for the paddle out. Bondi, Bronte, Coogee. Even Leo, Tilly and Sam.'),
      say('bd-stan', 'Stan here. And trouble. The old board on the club wall is gone. The one from 1914. It was meant to lead the paddle out.'),
      quiz('bd-stan', 'Who showed Sydney how to ride a surfboard, right here at Freshwater?', ['Duke Kahanamoku', 'Captain Cook', 'Stan, obviously'], 'The Hawaiian swimmer, in December 1914. He carved his own board from local timber.'),
      say(null, 'On the headland stands a statue of a tall man with a surfboard. Under it, someone has left a pink swim cap and a note.', { spatial: 'chatter' }),
      say('bd-tilly', '[curious] That is my cap! I lost it. The note says, follow the wax. Who writes notes like that?'),
      dash(30, 'Smears of surf wax on the path! Follow them for 30 seconds!', { chapter: 'The wax trail', fx: 'whoosh' }),
      say(null, 'Little white smears of surf wax lead along the headland, then down the steps to the next beach.'),
      quiz('bd-nikki', 'Where has the Duke’s board been kept since 1952?', ['The Freshwater surf club', 'A museum in Hawaii', 'A bank vault'], 'Right on the club wall, where everyone can see it. Until this morning.'),
      say('bd-ana', '[laughs] Hi, it is Ana! Yes, me again. Before you ask. I did not take it. But I know who did. And so does Stan.'),
      say('bd-stan', '[sighs] Fine. It was me. I took it at dawn to have it waxed and polished. One hundred and twelve years old. It should look its best.'),
      say('bd-nikki', '[sarcastic] Stan! Five episodes of mysteries, and the last one was you?'),
      choice('bd-nikki', 'route', 'The board is at the polisher’s shed! Along the sand, or over the headland?',
        { label: 'Along the sand', line: 'Sand! Last soft sand of the series.', dash: 'Along the sand! Pick it up for 30 seconds!', after: 'Along the sand, nippers race beside you, and every club flag on the coast flaps in a row.' },
        { label: 'Over the headland', line: 'Headland! Big views.', dash: 'Over the headland! Pick it up for 30 seconds!', after: 'Over the headland, the whole bay spreads out below, and a line of surfers sits waiting on their boards.' },
        'The sand, then. Go!'),
      steady('Settle into an easy pace while the board is carried down to the water, very carefully.', { chapter: 'The board' }),
      quiz('bd-stan', 'The Duke gave a second show soon after, at another northern beach. Which one?', ['Dee Why', 'Bondi', 'Cronulla'], 'Dee Why, in January 1915. Sydney went surfing mad after that.'),
      say(null, 'The old board, gleaming and long and heavy, is carried to the shore on many shoulders. It will not go in the water. It leads from the sand.', { fx: 'bellring' }),
      say('bd-leo', '[excited] The Bronte bell! They brought the bell! Pop, they are ringing it for the start!'),
      dash(45, 'The paddle out begins! Pick it up for 45 seconds along the shore with everyone!', { chapter: 'Paddle out', fx: 'whistle' }),
      say(null, 'Hundreds of surfers paddle out and form a huge circle on the water. They splash and cheer. On the sand, the old board stands tall.', { fx: 'found', scene: 'surfdawn' }),
      say('bd-sam', 'My grandpa came by boat! He is waving! And this time his torch works.'),
      steady('Cool down with an easy jog or a walk along the shore.', { chapter: 'Home' }),
      quiz('bd-nikki', 'Last one, Runner. On the headland stands a statue of who?', ['Duke Kahanamoku', 'Lord Nelson', 'Francis Greenway'], 'The man who brought surfing here. The board, the beach and the statue, all in one spot.'),
      say('bd-stan', '[laughs] Sorry for the fright, everyone. Next year I will leave a note. A proper one.'),
    ],
    finale: 'Breakers is complete. Five beaches, five mysteries, and one old Iceberg who was behind the last one. The beach looks after its own. Thank you, Runner.',
  }),
]

export const CHAIN = ['bondi-breakers', 'bondi-bronte', 'bondi-coogee', 'bondi-lighthouse', 'bondi-duke']

export const CAST = {
  'bondi-narrator': { name: 'Narrator', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.9, rate: 0.98 }, // Lee
  'bd-nikki': { name: 'Nikki', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.2, rate: 1.06, radio: true }, // Ruby, on the patrol radio
  'bd-stan': { name: 'Stan', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.96 }, // Jimbo
  'bd-leo': { name: 'Leo', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.2, rate: 1.08 }, // Ziggy
  'bd-tilly': { name: 'Tilly', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.35, rate: 1.05 }, // Emily, lifted
  'bd-sam': { name: 'Sam', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.25, rate: 1.04 }, // Milly
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
