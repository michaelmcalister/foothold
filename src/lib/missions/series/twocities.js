// Two Cities: a two episode chase from Kuala Lumpur to Manila. A tin
// trader's silk map, the Lantern Map, is taken from a heritage night at
// Central Market by Victor Kwan, a smooth collector. Mel, a KL night runner
// with a food channel, and Uncle Raj from the mamak stall send you after him,
// from Petaling Street to the river confluence. The back of the map holds a
// riddle that points to Manila, where Bea and her Tito Ramon, who drives a
// calesa in Intramuros, help you race Kwan to the other half. Joined, the map
// shows Mel and Bea are cousins. Kwan gives in with good grace.
//
// Pure data (imports nothing): series/index.js hands it to thrillers.js,
// cast.js, covers.js and audio/library.js. Same beat format as signal.js.
//
// History and trivia were checked with a web search (November 2026):
//   - Kuala Lumpur means "muddy confluence": it began around 1857 where the
//     Gombak and Klang rivers meet, when tin miners opened the valley
//     (History of Kuala Lumpur, Wikipedia)
//   - the town burnt down on 4 January 1881; Swettenham then ordered new
//     buildings in brick and tile (same)
//   - Central Market began in 1888 as a wet market serving the tin miners;
//     its art deco building was finished in 1937 (Central Market, Wikipedia)
//   - Malaya's flag was first raised on the Padang, now Merdeka Square, at
//     midnight to mark independence in 1957; its flagpole is 95 m tall
//     (Independence Square, Wikipedia)
//   - the Petronas Twin Towers' skybridge joins floors 41 and 42, about
//     170 m up; they were the world's tallest buildings from 1998 to 2004
//     (Petronas Towers, Wikipedia)
//   - Batu Caves has 272 steps, painted in rainbow colours in 2018 (Wikipedia)
//   - jeepneys grew from US Army jeeps left after World War II (Jeepney)
//   - Intramuros is Spanish for "within the walls"; Legazpi made Manila the
//     capital in 1571; most of it was destroyed in the Battle of Manila in
//     1945, when San Agustin was the only church inside the walls to survive
//     (Intramuros, Wikipedia)
//   - San Agustin Church was finished in 1607 (same)
//   - Fort Santiago has bronze footprints marking José Rizal's last walk
//     from his cell in 1896 (Fort Santiago, Wikipedia)
//   - Binondo was set up in 1594 and is called the oldest Chinatown in the
//     world (Binondo, Wikipedia)
//   - the Manila galleons sailed between Manila and Acapulco, in Mexico,
//     from 1565 to 1815 (Manila galleon, Wikipedia)
//   - nasi lemak rice is cooked in coconut milk; Rizal Park on Manila Bay
//     holds the Rizal Monument
//
// Real people are only mentioned, never voiced; everyone with lines is made
// up. House rules: tense, never cruel, nobody is hurt, and the collector is
// only ever outrun, never caught.

const line = (who, text) => ({ who, text })

const RESULTS = {
  'tc-mel': {
    success: line('tc-mel', '[excited] Wah, so fast! Ease right back now.'),
    okay: line('tc-mel', 'You made it, and that is what counts. Ease right back now.'),
    half: line('tc-mel', 'Halfway! Keep going, keep going!'),
  },
  'tc-bea': {
    success: line('tc-bea', '[excited] Ang bilis! So fast! Ease right back now.'),
    okay: line('tc-bea', 'You got there, and that is what counts. Ease right back now.'),
    half: line('tc-bea', 'Halfway! Laban! Keep going!'),
  },
}

const EASY_MEL = line('tc-mel', 'Easy, easy. Save your legs. This city is bigger than it looks.')
const EASY_BEA = line('tc-bea', 'Slow down a little. Manila traffic is slow, but the night is long.')

const surge = (at, seconds, who, say, recover, extra = {}) => ({ at, kind: 'surge', seconds, who, say, recover, ...RESULTS[who], ...extra })

export const SAGA = {
  id: 'twocities',
  title: 'Two Cities',
  blurb: 'A stolen silk map, a riddle in old Spanish and a chase from Kuala Lumpur to Manila. Two episodes, two cities, one mystery.',
  note: 'The places and the history are real. The map, the chase and everyone in it are made up. The trivia is all true.',
  narrator: 'twocities-narrator',
  score: 'twocities',
  isNew: true,
}

export const EPISODES = [
  {
    id: 'twocities-kl',
    episode: 1,
    next: 'Next time on Two Cities: Manila Bay at sunset, a walled city full of secrets, and a race for the other half of the map.',
    saga: 'twocities',
    title: 'The Muddy Confluence',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Gentle',
    blurb: 'Episode 1. Kuala Lumpur at night. A silk map vanishes from Central Market, and a man in a white suit walks calmly towards the river.',
    loop: line('tc-mel', 'You ran a loop! Like the two rivers coming round to meet. Very poetic.'),
    early: line('tc-mel', 'Stopping there is okay lah. Go rest. I will save you some satay.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Petaling Street', scene: 'pasar', say: 'Kuala Lumpur, nine at night. Red lanterns glow over Petaling Street, woks hiss, and the air smells of satay smoke. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', spatial: 'motorbike', say: 'Motorbikes buzz between the stalls. A hawker flips roti, an aunty sells cold coconut drinks, and a gecko chirps from a lamp post.' },
      { at: 105, kind: 'story', who: 'tc-mel', fx: 'squelch', say: 'Hello! Mel here, the night runner with the food channel. You are the visitor doing the night run? Good. I need fast legs. Right now.' },
      { at: 160, kind: 'story', who: 'tc-mel', say: 'My grandma’s silk map was just taken from the heritage night at Central Market. We call it the Lantern Map. It is over a hundred years old.' },
      { at: 215, kind: 'story', who: 'tc-mel', say: '[whispers] A man in a white linen suit took the case and walked off. Very calm. Too calm. He is heading for the river. Come!' },
      surge(265, 30, 'tc-mel', 'Pick it up for 30 seconds through the market! Follow the white suit!', 110, { chapter: 'The white suit', fx: 'gong' }),
      { at: 345, kind: 'story', say: 'You weave past durian stalls and steaming pots. Up ahead, a flash of white linen slips round a corner into the old shophouses.' },
      { at: 400, kind: 'quiz', who: 'tc-mel', say: 'Breathe and tell me. Kuala Lumpur is Malay for what?',
        options: [{ key: 'A', label: 'Muddy confluence' }, { key: 'B', label: 'Golden hill' }, { key: 'C', label: 'City of lights' }], answer: 'A',
        right: line('tc-mel', 'Muddy confluence! The Klang and Gombak rivers meet here. Tin miners started the town there, around 1857.'),
        wrong: line('tc-mel', 'It means muddy confluence. The Klang and Gombak rivers meet here. Tin miners started the town there, around 1857.') },
      { at: 470, kind: 'story', who: 'tc-raj', spatial: 'chatter', say: 'Oi, runner! Raj, from the mamak stall. Mel’s friend. Your white suit just walked past my teh tarik. Towards Central Market.' },
      { at: 520, kind: 'story', say: 'Central Market began in 1888, as a wet market for the tin miners. Its blue and white art deco building went up in 1937.' },
      { at: 575, kind: 'story', who: 'tc-raj', say: 'You know, this whole town burnt down in 1881. Every wooden hut, gone in one night. After that, the British said, no more wood.' },
      { at: 625, kind: 'puzzle', who: 'tc-raj', say: 'So, detective. What did they order the new buildings to be made of?',
        options: [{ key: 'A', label: 'Brick and tile' }, { key: 'B', label: 'Bamboo' }, { key: 'C', label: 'Teak' }], answer: 'A',
        right: line('tc-raj', 'Brick and tile! That is why the old shophouses are still standing. Clever, right?'),
        wrong: line('tc-raj', 'It was brick and tile. That is why the old shophouses are still standing. Clever, right?') },
      { at: 690, kind: 'story', who: 'tc-kwan', fx: 'noirstab', say: '[laughs] Good evening, runner. Victor Kwan. Collector. Please relax. I have not stolen anything. I have only borrowed it.' },
      { at: 745, kind: 'choice', id: 'route', who: 'tc-mel', say: 'He is crossing to Merdeka Square. Straight across the square, or along the river walk?',
        options: [
          { key: 'A', label: 'Across the square', flag: 'square', say: line('tc-mel', 'The square! Wide open. Run!') },
          { key: 'B', label: 'The river walk', flag: 'river', say: line('tc-mel', 'River walk. Shady and fast. Go!') },
        ],
        default: 'A', timeout: line('tc-mel', 'Across the square, then. Go, go, go!') },
      surge(790, 30, 'tc-mel', 'Across Merdeka Square! Pick it up for 30 seconds!', 110, { if: 'square', chapter: 'Merdeka Square', fx: 'whoosh' }),
      surge(791, 30, 'tc-mel', 'Along the river walk! Pick it up for 30 seconds!', 110, { unless: 'square', chapter: 'The river walk', fx: 'whoosh' }),
      { at: 870, kind: 'story', if: 'square', say: 'The great lawn of Merdeka Square opens up under a flagpole 95 metres tall. The copper domes of the Sultan Abdul Samad Building glow gold.' },
      { at: 871, kind: 'story', unless: 'square', say: 'The river walk curves under old rain trees. Across the water, the copper domes of the Sultan Abdul Samad Building glow gold.' },
      { at: 925, kind: 'quiz', who: 'tc-mel', say: 'On that square, at midnight, Malaya’s flag went up for the first time to mark independence. Which year?',
        options: [{ key: 'A', label: '1957' }, { key: 'B', label: '1963' }, { key: 'C', label: '1945' }], answer: 'A',
        right: line('tc-mel', '1957! The Union Flag came down, the new flag went up, and the whole crowd cheered. Merdeka!'),
        wrong: line('tc-mel', 'It was 1957. The Union Flag came down, the new flag went up, and the whole crowd cheered. Merdeka!') },
      { at: 990, kind: 'story', fx: 'tropicthunder', scene: 'monsoon', chapter: 'Monsoon', say: 'Then the sky opens. A monsoon downpour roars onto the awnings, warm as bathwater. The whole city steams.' },
      { at: 1030, kind: 'steady', seconds: 150, say: 'Settle into an easy pace through the rain while Mel works out where he is going.', easyNudge: EASY_MEL },
      { at: 1060, kind: 'story', who: 'tc-kwan', say: '[curious] It is only half a map, runner. Did Mel tell you? The other half sailed to Manila over a century ago. I want them together again.' },
      { at: 1110, kind: 'story', who: 'tc-mel', say: '[sighs] He is right. Grandma always said the other half went to Manila with the family’s trading partner. Nobody knows where.' },
      { at: 1150, kind: 'quiz', who: 'tc-mel', say: 'Keep me calm. Nasi lemak, our favourite breakfast. What is the rice cooked in?',
        options: [{ key: 'A', label: 'Coconut milk' }, { key: 'B', label: 'Tea' }, { key: 'C', label: 'Chicken stock' }], answer: 'A',
        right: line('tc-mel', 'Coconut milk! With sambal, peanuts, anchovies and egg. I am buying you a plate after this.'),
        wrong: line('tc-mel', 'It is coconut milk. With sambal, peanuts, anchovies and egg. I am buying you a plate after this.') },
      { at: 1200, kind: 'story', who: 'tc-mel', say: '[excited] I see him! White suit, at the confluence, under the blue lights. He is just standing there. Waiting.' },
      surge(1225, 45, 'tc-mel', 'Last push! Pick it up for 45 seconds and catch him at the confluence!', 120, { chapter: 'The confluence', fx: 'gong' }),
      { at: 1310, kind: 'story', scene: 'confluence', say: 'The rain has stopped. Where the two rivers meet, blue lights glow on the water and soft mist drifts. Victor Kwan turns and holds out the case.' },
      { at: 1360, kind: 'story', who: 'tc-kwan', fx: 'lanterns', say: 'Here. It is perfectly safe. I only needed a photo of the back. Look closely. Someone wrote on it, in old Spanish.' },
      { at: 1405, kind: 'story', who: 'tc-mel', say: '[curious] It says, where the walls keep the city, the lantern waits. Walls? A lantern? What does that even mean?' },
      { at: 1445, kind: 'story', who: 'tc-kwan', spatial: 'lrt', say: '[laughs] It means Manila, my dear. My flight leaves at dawn. May the fastest family win.' },
      { at: 1480, kind: 'steady', seconds: 120, chapter: 'Two cities', say: 'The airport train hums away into the night. Cool down now with an easy jog or a walk under the city lights.' },
      { at: 1500, kind: 'quiz', who: 'tc-mel', say: 'Look up. The Petronas Twin Towers. The skybridge between them joins which floors?',
        options: [{ key: 'A', label: '41 and 42' }, { key: 'B', label: '50 and 51' }, { key: 'C', label: '88 and 89' }], answer: 'A',
        right: line('tc-mel', '41 and 42! About 170 metres up. From 1998 to 2004 they were the tallest buildings in the world. Now, pack a bag. We are going to Manila.'),
        wrong: line('tc-mel', 'It is 41 and 42. About 170 metres up. From 1998 to 2004 they were the tallest buildings in the world. Now, pack a bag.') },
      { at: 1555, kind: 'finale', say: 'Episode one complete. The map is safe, half a riddle is solved, and Victor Kwan is flying to Manila. So are you. To be continued.' },
    ],
  },
  {
    id: 'twocities-manila',
    episode: 2,
    previously: 'Previously on Two Cities: a silk map taken in Kuala Lumpur, a riddle in old Spanish, and a collector racing you to Manila.',
    saga: 'twocities',
    title: 'The Walled City',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Steady effort',
    blurb: 'Episode 2. Manila Bay at sunset, a calesa in Intramuros and a race to Binondo for the other half of the Lantern Map.',
    loop: line('tc-bea', 'You closed a loop! Tito Ramon says his horse does that every day. He is very proud of you.'),
    early: line('tc-bea', 'Stopping there is okay. Go and eat something. The map can wait. Probably.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Manila Bay', scene: 'bayside', say: 'Manila, at sunset. The sky over Manila Bay burns orange and pink. Joggers, couples and vendors line the seawall. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', spatial: 'jeepney', say: 'A jeepney rumbles past, shining with chrome horses and painted flames, its horn beeping a happy little tune.' },
      { at: 100, kind: 'story', who: 'tc-bea', fx: 'squelch', say: 'Hi! You must be Mel’s runner. I am Bea. Mel says you are fast and you do not ask too many questions. Perfect.' },
      { at: 155, kind: 'story', who: 'tc-bea', say: 'My Tito Ramon drives a calesa in Intramuros. He says our family once had a silk map with lanterns on it. Sound familiar?' },
      { at: 210, kind: 'quiz', who: 'tc-bea', say: 'While we warm up. Those jeepneys? After World War Two, they started out as what?',
        options: [{ key: 'A', label: 'US Army jeeps' }, { key: 'B', label: 'Old buses' }, { key: 'C', label: 'Fishing boats' }], answer: 'A',
        right: line('tc-bea', 'US Army jeeps! Left behind after the war. We added roofs, long benches and a lot of chrome.'),
        wrong: line('tc-bea', 'They started as US Army jeeps, left behind after the war. We added roofs, long benches and a lot of chrome.') },
      { at: 270, kind: 'story', who: 'tc-kwan', say: '[laughs] Good evening again, runner. I landed hours ago. Where the walls keep the city. Have you worked it out yet?' },
      { at: 330, kind: 'quiz', who: 'tc-bea', say: 'Ignore him. Intramuros, the old walled city. In Spanish, what does the name mean?',
        options: [{ key: 'A', label: 'Within the walls' }, { key: 'B', label: 'Old harbour' }, { key: 'C', label: 'Big church' }], answer: 'A',
        right: line('tc-bea', 'Within the walls! Where the walls keep the city. We are going to Intramuros.'),
        wrong: line('tc-bea', 'It means within the walls. Where the walls keep the city. We are going to Intramuros.') },
      surge(395, 30, 'tc-bea', 'Pick it up for 30 seconds along the bay towards the old walls!', 110, { chapter: 'The walls', fx: 'gong' }),
      { at: 475, kind: 'story', scene: 'intramuros', say: 'Huge stone walls rise ahead, old and mossy. In 1571 the Spanish made Manila their capital here, and later built these walls around it.' },
      { at: 530, kind: 'story', who: 'tc-ramon', spatial: 'calesa', say: 'Hoy! Over here, by the calesa. I am Tito Ramon. My horse is Bituin. It means star. Want a ride? No? Okay, follow us!' },
      { at: 590, kind: 'story', who: 'tc-ramon', say: 'In 1945, in the Battle of Manila, most of this was smashed to pieces. We rebuilt it, stone by stone. Manila always gets back up.' },
      { at: 645, kind: 'story', fx: 'chime', say: 'At Fort Santiago, bronze footprints are set into the ground. They mark the last walk of José Rizal, the national hero, from his cell in 1896.' },
      { at: 700, kind: 'story', who: 'tc-ramon', say: 'The lantern part. My lola always said, look for the lantern where the oldest stones pray. That is San Agustin Church.' },
      { at: 755, kind: 'puzzle', who: 'tc-ramon', say: 'San Agustin was finished in 1607. So, about how many centuries old is it now?',
        options: [{ key: 'A', label: 'Four' }, { key: 'B', label: 'Two' }, { key: 'C', label: 'Six' }], answer: 'A',
        right: line('tc-ramon', 'Four centuries! In 1945 it was the only church inside the walls that survived. Tough old stones.'),
        wrong: line('tc-ramon', 'About four centuries. In 1945 it was the only church inside the walls that survived. Tough old stones.') },
      { at: 820, kind: 'choice', id: 'path', who: 'tc-bea', say: 'Kwan is heading for the church! Along the top of the walls, or through the side streets?',
        options: [
          { key: 'A', label: 'Along the walls', flag: 'walls', say: line('tc-bea', 'The walls! Mind the old cannons.') },
          { key: 'B', label: 'Through the streets', flag: 'streets', say: line('tc-bea', 'The streets! Follow the calesa, Bituin knows the way.') },
        ],
        default: 'A', timeout: line('tc-bea', 'Along the walls, then. Bilis! Quick!') },
      surge(870, 30, 'tc-bea', 'Up on the walls! Pick it up for 30 seconds!', 110, { if: 'walls', chapter: 'San Agustin', fx: 'whoosh' }),
      surge(871, 30, 'tc-bea', 'Through the streets! Pick it up for 30 seconds and stay with the calesa!', 110, { unless: 'walls', chapter: 'San Agustin', fx: 'whoosh' }),
      { at: 950, kind: 'story', if: 'walls', say: 'Along the top of the wall, old cannons point out over the city lights. Below you, a calesa clip clops past.' },
      { at: 951, kind: 'story', unless: 'walls', spatial: 'calesa', say: 'You run beside Bituin over the cobblestones, past old houses with wooden shutters and balconies full of flowers.' },
      { at: 1005, kind: 'story', fx: 'lanterns', say: 'Inside San Agustin, under painted ceilings, Victor Kwan kneels by a stone with a tiny lantern carved in its corner. He looks up and smiles.' },
      { at: 1060, kind: 'story', who: 'tc-kwan', say: 'Too slow, runner. The lantern is a key. The other half of the map is in Binondo, at an old tea shop. I will be there first.' },
      { at: 1110, kind: 'steady', seconds: 140, chapter: 'Binondo', say: 'Settle into an easy pace while Bea finds the fastest way to Binondo.', easyNudge: EASY_BEA },
      { at: 1140, kind: 'quiz', who: 'tc-bea', say: 'Binondo is called the oldest Chinatown in the world. When did it start?',
        options: [{ key: 'A', label: '1594' }, { key: 'B', label: '1890' }, { key: 'C', label: '1945' }], answer: 'A',
        right: line('tc-bea', '1594! Set up by the Spanish for Chinese settlers. And it has the best dumplings in Manila. Trust me.'),
        wrong: line('tc-bea', 'It was 1594, set up by the Spanish for Chinese settlers. And it has the best dumplings in Manila. Trust me.') },
      { at: 1200, kind: 'story', who: 'tc-ramon', spatial: 'motorbike', say: 'Across the Pasig River, that way. Quickly now. And mind the tricycles, they stop for nobody!' },
      { at: 1250, kind: 'quiz', who: 'tc-ramon', say: 'Our family were sailors, you know. The old galleons sailed from Manila, right across the Pacific, to which port?',
        options: [{ key: 'A', label: 'Acapulco' }, { key: 'B', label: 'Lisbon' }, { key: 'C', label: 'Sydney' }], answer: 'A',
        right: line('tc-ramon', 'Acapulco, in Mexico. For 250 years, silk and spices went one way, and silver came back the other.'),
        wrong: line('tc-ramon', 'It was Acapulco, in Mexico. For 250 years, silk and spices went one way, and silver came back the other.') },
      surge(1310, 45, 'tc-bea', 'There is the bridge! Pick it up for 45 seconds over the Pasig and beat him to Binondo!', 130, { chapter: 'Over the Pasig', fx: 'gong' }),
      { at: 1395, kind: 'story', scene: 'jeepneys', say: 'Over the river and into Binondo. Red lanterns, steaming dumplings and jeepneys nose to tail. In a tiny tea shop sits Victor Kwan.' },
      { at: 1450, kind: 'story', who: 'tc-kwan', say: '[sighs] The owner will not sell it to me. She says it belongs to a family, not a collector. Any family but mine, it seems.' },
      { at: 1505, kind: 'story', who: 'tc-mel', fx: 'squelch', say: '[excited] Bea, hold it up to the camera! The halves match! The rivers, the ship, the walls. It is one map!' },
      { at: 1560, kind: 'story', fx: 'lanterns', say: 'Joined at last, the lanterns on the map spell out two names. A tin trader’s two children. One stayed in Kuala Lumpur. One sailed to Manila.' },
      { at: 1615, kind: 'story', who: 'tc-bea', say: '[excited] Wait. Mel, that name is your great great grandma. And that one is my lola’s lola. We are cousins! Tito, we are cousins!' },
      { at: 1660, kind: 'story', who: 'tc-kwan', say: '[laughs] Two cities, one family. Fine. I give in. Put it in a museum, half the year in each city. And call me a kind donor.' },
      { at: 1700, kind: 'steady', seconds: 150, scene: 'bayside', chapter: 'Home stretch', say: 'The tea shop bursts into cheers. Cool down now with an easy jog or a walk back towards the bay.' },
      { at: 1740, kind: 'quiz', who: 'tc-bea', say: 'Last one, cousin’s friend. The Rizal Monument stands in which park, by the bay?',
        options: [{ key: 'A', label: 'Rizal Park' }, { key: 'B', label: 'Central Park' }, { key: 'C', label: 'Hyde Park' }], answer: 'A',
        right: line('tc-bea', 'Rizal Park! People call it Luneta too. Families picnic there every Sunday.'),
        wrong: line('tc-bea', 'It is Rizal Park. People call it Luneta too. Families picnic there every Sunday.') },
      { at: 1780, kind: 'story', who: 'tc-ramon', say: 'Next time you visit, the calesa ride is free. For family. And family’s fast friends.' },
      { at: 1805, kind: 'story', say: 'And in one corner of the map, a third little lantern glows over a port nobody can name. Not yet.' },
      { at: 1835, kind: 'finale', say: 'Two Cities is complete. The Lantern Map is whole, two cousins have found each other, and a collector has a new hobby. Salamat, and terima kasih.' },
    ],
  },
]

export const CHAIN = ['twocities-kl', 'twocities-manila']

export const CAST = {
  'twocities-narrator': { name: 'Narrator', voiceId: 'Y7xQSS5ZtS4xv4VJotWd', pitch: 1.0, rate: 0.98 }, // Christine
  'tc-mel': { name: 'Mel Tan', voiceId: 'jIqiRM4Svh204ihzOZ39', pitch: 1.15, rate: 1.06, radio: true }, // Hana, in your earbuds
  'tc-raj': { name: 'Uncle Raj', voiceId: 'U4hJrwpyl0nYYkeTGFiX', pitch: 0.85, rate: 1.0 }, // Krishna Veer
  'tc-kwan': { name: 'Victor Kwan', voiceId: 'NIkIuJZ8oQMuKZqwKtnm', pitch: 0.8, rate: 0.96, radio: true }, // Shaun Lim, on the phone
  'tc-bea': { name: 'Bea Santos', voiceId: 'eRTv581VyGjXGq0PLm6X', pitch: 1.2, rate: 1.08, radio: true }, // Kalina
  'tc-ramon': { name: 'Tito Ramon', voiceId: 'sILDsuKLk3fKwagl4odK', pitch: 0.85, rate: 1.0 }, // Dennis
}

export const LOOK = { accent: '#FFB347', deep: '#14123A', tag: 'Two cities' }

export const LIBRARY = {
  ambience: {
    pasar: 'A busy night market on a Kuala Lumpur street: sizzling woks and clanging spatulas, a crowd murmuring with no clear words, motorbikes buzzing past, a gecko chirping, warm humid tropical night, no music',
    monsoon: 'A tropical monsoon downpour in a Southeast Asian city at night: torrential rain drumming on zinc awnings and pavement, water gushing from drains and gutters, thunder cracking close then rolling away, no music, no voices',
    confluence: 'Where two rivers meet in a city centre at night after rain: gently flowing river water, the soft hiss of misting fountains, distant traffic hum, a light rail train gliding by far off, crickets and geckos, no music, no voices',
    bayside: 'A city bay seawall in the Philippines at sunset: small waves splashing against rocks, a warm sea breeze, people strolling and chatting softly with no clear words, a bicycle bell, jeepneys rumbling on the road behind, no music',
    intramuros: 'Old cobbled stone streets inside a Spanish colonial walled city at dusk: horse hooves clip clopping, carriage wheels creaking, distant church bells, birds settling in old trees, a soft breeze, quiet, no music, no voices',
    jeepneys: 'A crowded Chinatown street in Manila at night: jeepney diesel engines idling and revving, cheerful horns, motorbike tricycles buzzing, sizzling food stalls, a busy crowd murmuring with no clear words, no music',
  },
  sfx: {
    'jeepney-pass': { prompt: 'A Filipino jeepney with a rattling diesel engine driving past on a city street, a cheerful two tone horn beep as it passes, then fading away', seconds: 5 },
    'calesa-pass': { prompt: 'A horse drawn carriage passing on cobblestones, steady hooves clip clopping, wooden wheels creaking, a small bell jingling, then fading away', seconds: 6 },
    'motorbike-pass': { prompt: 'A small motor scooter buzzing past on a busy city street at night, approaching and fading away', seconds: 4 },
    'lrt-pass': { prompt: 'A modern light rail train gliding past on an elevated track at night, electric hum and smooth wheel whoosh, fading away', seconds: 6 },
  },
  tracks: {
    'twocities-chase': {
      title: 'Lantern Chase',
      prompt: 'Original cinematic chase instrumental with Southeast Asian colour: bronze gongs and tuned kulintang style gongs playing a fast pentatonic riff, driving frame drums and taiko, plucked strings, a modern electronic bass pulse, adventurous and thrilling, about 140 bpm. No vocals.',
      seconds: 90,
    },
  },
  chase: 'twocities-chase',
}
