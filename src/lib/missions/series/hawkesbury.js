// The River Beast: a five episode open mystery on the Hawkesbury River,
// north of Sydney. Locals have told yarns for generations about something
// long and dark in the deep green water. Tess, a ferry deckhand, sees a
// wake with no boat at Brooklyn, and with Bill the oyster farmer, Maya,
// eleven, and Doctor Prakash, a river scientist, you chase it from the old
// rail bridge to Dangar Island, Wisemans Ferry and Windsor, and at the end
// you choose what you believe. Nobody is hurt, no animal is chased, and the
// runner stays on the shore, the wharves and the ferry.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the Hawkesbury: the Dharug name is Dyarubbin; Governor Phillip named
//     it in June 1789 after Baron Hawkesbury; a 1939 obelisk at Brooklyn
//     marks the naming; it runs about 120 km from where the Nepean and
//     Grose meet to Broken Bay; Dangar Island is reached by ferry from
//     Brooklyn and is the start of the Bridge to Bridge water ski race to
//     Windsor; a cable ferry crosses at Wisemans Ferry on the old Great
//     North Road; the estuary has oysters, prawns and fish (Hawkesbury
//     River, Wikipedia)
//   - the first Hawkesbury River railway bridge opened on 1 May 1889, built
//     by the Union Bridge Company of New York; the current one opened on 1
//     July 1946; the old sandstone capped piers still stand in the river;
//     the line runs through tunnels in Long Island (Hawkesbury River
//     Railway Bridge, Wikipedia)
//   - Windsor was proclaimed one of Macquarie's towns on 15 December 1810,
//     first called Green Hills; St Matthew's Church, by Francis Greenway,
//     was consecrated in 1822; a horseshoe on the Macquarie Arms marks the
//     1867 flood peak; Windsor Bridge, 1874, was the oldest crossing until
//     its 2020 replacement (Windsor, New South Wales, Wikipedia)
//
// Real people are only mentioned, never voiced. The sightings and everyone
// with lines are made up. The river monster is a local yarn, not a fact.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('hk-tess', '[excited] Like a ski boat at full throttle! Ease right back now.'),
  okay: line('hk-tess', 'You got there, and that is what counts. Ease right back now.'),
  half: line('hk-tess', 'Halfway! Keep it going!'),
}
const EASY = line('hk-tess', 'Easy now. The river is long, and the tide is in no hurry.')
const base = { saga: 'hawkesbury', guide: 'hk-tess', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'hawkesbury',
  title: 'The River Beast',
  blurb: 'For generations, Hawkesbury locals have told of something long and dark in the deep water. A ferry deckhand sees a wake with no boat. Five runs, and then you decide.',
  note: 'Real Hawkesbury places and history. The sightings and the people are made up, and the river monster is a local yarn. Stay off the water unless you are on a ferry.',
  narrator: 'hawkesbury-narrator',
  score: 'deepcover',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'hawkesbury-wake',
    episode: 1,
    next: 'Next time on The River Beast: a ferry to Dangar Island, old bridge piers in the water, and a shape on the sonar.',
    title: 'The Wake',
    blurb: 'At dawn, Tess the ferry deckhand saw a long wake cut across the still river at Brooklyn. There was no boat. She needs fresh eyes.',
    place: { name: 'Brooklyn, Hawkesbury River', lat: -33.5470, lng: 151.2240 },
    loop: line('hk-tess', 'A loop! Like the ferry run. Out to the island and back.'),
    early: line('hk-tess', 'Stop there, no worries. Grab a fish and chips on the wharf.'),
    open: { scene: 'harbour', chapter: 'Brooklyn', text: 'Brooklyn, on the Hawkesbury River, at dawn. Mist on the water, houseboats rocking, and steep green hills on every side. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This river is Dyarubbin, its Dharug name. Governor Phillip named it the Hawkesbury in 1789. The river is far older than both names.'),
      say('hk-tess', 'Hi. Tess here. I work on the ferry. This morning, the river was flat as glass. Then a long wake cut straight across it. No boat. Nothing.'),
      say('hk-bill', '[laughs] Bill, oyster farmer. Forty years on this river. My dad called it the River Beast. My grandad too. Every family has a yarn.'),
      quiz('hk-tess', 'Warm up. Who named the Hawkesbury River, and when?', ['Governor Phillip, 1789', 'Captain Cook, 1770', 'Bill’s grandad, 1950'], 'Governor Phillip, in June 1789. There is an obelisk on the shore here to mark it.'),
      dash(30, 'To the wharf to see Tess’s photo! Pick it up for 30 seconds!', { chapter: 'The wharf', fx: 'whoosh' }),
      say(null, 'On the wharf, pelicans stand like old men waiting for a bus. Tess holds up her phone. A long V shape on the water, and nothing at the front.', { spatial: 'boat' }),
      quiz('hk-bill', 'Bill’s question. What do I grow in this river?', ['Oysters', 'Bananas', 'Pumpkins'], 'Oysters! The river is full of good things. Oysters, prawns, fish. And yarns.'),
      say('hk-tess', '[curious] A wake can come from a boat that passed long before. The waves travel. But this one looked fresh. And it was long.'),
      choice('hk-tess', 'way', 'Let’s look from higher up. Along the foreshore, or up to the lookout?',
        { label: 'Along the foreshore', line: 'Foreshore! Watch for jumping mullet.', dash: 'Along the foreshore! Pick it up for 30 seconds!', after: 'Along the foreshore, a fish leaps clean out of the water. Then another. Something is chasing them. Something big.' },
        { label: 'Up to the lookout', line: 'Lookout! Big views up the river.', dash: 'Up to the lookout! Pick it up for 30 seconds!', after: 'From the lookout, the river winds away in great green bends. A silver trail of fish jumps in the middle. Something is chasing them.' },
        'Foreshore, then. Go!'),
      steady('Settle into an easy pace while Tess films the jumping fish.', { chapter: 'The fish' }),
      say('hk-maya', '[excited] Hi! Maya. I am eleven. I saw it too! From my bedroom window! It was long and dark and went under, like a submarine!'),
      quiz('hk-tess', 'Puzzle. The wake was 30 metres long. A typical runabout boat is about 5 metres. How many boats long is the wake?', ['Six', 'Three', 'Twelve'], 'Six boat lengths. A long wake. But wakes spread out behind things. So the thing could be much smaller.'),
      say('hk-bill', 'I know who to call. Doctor Prakash. River scientist. She has a boat with sonar. It sees under the water.'),
      dash(45, 'The morning ferry is leaving! Pick it up for 45 seconds to catch it!', { chapter: 'The ferry', fx: 'noirstab' }),
      say(null, 'You jump aboard just in time. The ferry chugs out past houseboats and moored yachts, towards a small green island.', { scene: 'harbour' }),
      steady('Cool down with an easy jog on the spot, or a walk around the deck.', { chapter: 'On deck' }),
      quiz('hk-tess', 'Last one. The river runs from the hills to the sea. About how long is it?', ['About 120 km', 'About 12 km', 'About 1,200 km'], 'About a hundred and twenty kilometres, from where the Nepean and Grose meet, to Broken Bay.'),
    ],
    finale: 'The Wake is spotted. A long V with no boat, jumping fish, and a scientist with sonar on the way. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'hawkesbury-sonar',
    episode: 2,
    previously: 'Previously on The River Beast: a wake with no boat, jumping fish, and Maya’s submarine sighting.',
    next: 'Next time on The River Beast: Wisemans Ferry at night, a cable ferry, and a sound like breathing in the dark.',
    title: 'The Sonar',
    blurb: 'Doctor Prakash brings a sonar boat to the old railway bridge. Under the water, between the old stone piers, something big shows up.',
    place: { name: 'Hawkesbury River Railway Bridge', lat: -33.5400, lng: 151.2050 },
    loop: line('hk-tess', 'A loop! Round the island and back to the wharf.'),
    early: line('hk-tess', 'Stop there, all good. The bridge will be here tomorrow.'),
    open: { scene: 'harbour', chapter: 'The bridge', text: 'The Hawkesbury River railway bridge. A long steel bridge across the water, and beside it, a row of old stone piers standing alone in the river. Start with an easy walk or jog.' },
    steps: [
      say('hk-prakash', 'Doctor Prakash. River scientist. My sonar sends sound under the water and listens for the echo. It draws a picture of the bottom.'),
      quiz('hk-prakash', 'Why is there a row of old stone piers next to the bridge?', ['From the first bridge', 'For decoration', 'For seagulls'], 'From the first bridge, opened in 1889. It was replaced in 1946. The old piers still stand in the river.'),
      say(null, 'A train rumbles over the bridge, long and loud. Its echo rolls across the water and off the hills.', { spatial: 'sydneytrain' }),
      dash(30, 'Along the shore beside the piers! Pick it up for 30 seconds!', { chapter: 'The piers', fx: 'whoosh' }),
      say('hk-prakash', '[curious] On the screen. Between the third and fourth piers. A long shape on the bottom. About eight metres. It is not moving.'),
      say('hk-maya', '[excited] It is the Beast! It is asleep!'),
      quiz('hk-tess', 'The first rail bridge was built by a company from which city?', ['New York', 'London', 'Paris'], 'New York. An American company won the job in 1886. It opened three years later.'),
      choice('hk-tess', 'way', 'Doctor Prakash wants another pass. Watch from the island, or from the point by the bridge?',
        { label: 'From the island', line: 'The island! Ferry across.', dash: 'Around Dangar Island! Pick it up for 30 seconds!', after: 'Around Dangar Island, little houses peep out of the trees. No cars here. People use wheelbarrows to carry their shopping.' },
        { label: 'From the point', line: 'The point! Closest to the piers.', dash: 'Out to the point! Pick it up for 30 seconds!', after: 'At the point, the old piers loom up out of the water, mossy and huge. A cormorant dries its wings on top of one.' },
        'The island, then. Go!'),
      steady('Settle into an easy pace while the sonar boat makes another slow pass.', { chapter: 'Second pass' }),
      say('hk-prakash', '[laughs] Second pass. Clearer picture. Eight metres long, straight, with branches. It is a tree trunk. A very old, very big log.'),
      say('hk-maya', '[sighs] The Beast is a log?'),
      say('hk-prakash', 'This one is. But logs do not make wakes. And something else showed up. Look. A smaller shape, near the log. Moving.'),
      quiz('hk-prakash', 'Puzzle. The moving shape is two metres long and swims in quick zigzags. A log does not move. Which shape is alive?', ['The moving one', 'The log', 'Both'], 'The moving one. Two metres, quick turns. Could be a big fish. A ray. Or something else.'),
      dash(45, 'It is heading upriver! Pick it up for 45 seconds along the shore!', { chapter: 'Upriver', fx: 'noirstab' }),
      say(null, 'The shape slides off the screen, heading upriver into deeper water. Doctor Prakash swings the boat round, but it is gone.'),
      steady('Cool down with an easy jog or a walk back to the wharf.', { chapter: 'Back to Brooklyn' }),
      quiz('hk-tess', 'Last one. Which island is the start of the big water ski race to Windsor?', ['Dangar Island', 'Long Island', 'Rottnest Island'], 'Dangar Island. The Bridge to Bridge race starts here and roars all the way up to Windsor.'),
    ],
    finale: 'The Sonar is done. One giant old log, one two metre swimmer heading upriver, and Wisemans Ferry next. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'hawkesbury-ferry',
    episode: 3,
    previously: 'Previously on The River Beast: a sonar boat, a giant log between the old piers, and a two metre swimmer heading upriver.',
    next: 'Next time on The River Beast: Windsor, a horseshoe on a pub wall, and the greatest flood the river ever saw.',
    title: 'The Cable Ferry',
    difficulty: 'Push yourself',
    blurb: 'At Wisemans Ferry, the cable ferry runs all night. The deckhand says something has been breathing loudly by the ramp after dark.',
    place: { name: 'Wisemans Ferry', lat: -33.3830, lng: 150.9880 },
    loop: line('hk-tess', 'A loop! Like the cable ferry. Across and back, across and back.'),
    early: line('hk-tess', 'Stop there, all good. Watch the ferry go across.'),
    open: { scene: 'night', chapter: 'Wisemans Ferry', text: 'Wisemans Ferry at dusk. A flat ferry crawls across the river on cables. Sandstone cliffs glow orange above the water. Start with an easy walk or jog.' },
    steps: [
      say('hk-tess', 'Tess here. I swapped shifts to be here. The cable ferry deckhand says every night this week, something by the ramp has been breathing. Loudly.'),
      quiz('hk-tess', 'The ferry here carries an old road across the river. Which road?', ['The Great North Road', 'The Hume Highway', 'The Stuart Highway'], 'The Great North Road. Built by convicts, long ago, to link Sydney with the north.'),
      say(null, 'The ferry clanks across on its cables. Cars roll off. Frogs start up in the reeds. The river goes dark, and very quiet.', { spatial: 'car' }),
      dash(30, 'To the ramp before full dark! Pick it up for 30 seconds!', { chapter: 'The ramp', fx: 'whoosh' }),
      say('hk-tess', '[whispers] Listen. There. A big, wet huff. Then a splash. Then the huff again. Like a person breathing out after a swim.'),
      say('hk-maya', '[whispers] I am scared. But in a good way.'),
      quiz('hk-prakash', 'Puzzle. Fish breathe through gills underwater. Which kind of animal comes up to huff air at the surface?', ['A mammal', 'A fish', 'A crab'], 'A mammal. Dolphins, seals, people. They all need to breathe air. So our swimmer is not a fish.'),
      choice('hk-tess', 'look', 'Torch on, gently. Shine it from the ramp, or from up on the bank?',
        { label: 'From the ramp', line: 'Ramp. Torch low. Stay well back.', dash: 'Along the ramp, softly! Pick it up for 30 seconds!', after: 'From the ramp, the torch catches two big dark eyes in the water. Whiskers. A sleek grey head. Then a flipper waves.' },
        { label: 'From the bank', line: 'Bank. High and safe.', dash: 'Up the bank, softly! Pick it up for 30 seconds!', after: 'From the bank, the torch finds a grey shape on a sunken log. A sleek head turns. Whiskers. Big dark eyes. It huffs at you.' },
        'From the ramp, then. Go!'),
      steady('Settle into a slow, quiet pace while Doctor Prakash watches through binoculars.', { chapter: 'The visitor' }),
      say('hk-prakash', '[laughs] A fur seal. A young one. Sometimes they swim a long way up rivers. It is resting. We leave it alone and call the wildlife rescue to keep an eye on it.'),
      say('hk-maya', '[excited] A seal! I named it. Nugget. Nugget the seal.'),
      quiz('hk-prakash', 'What should you do if you see a seal resting on a ramp or beach?', ['Stay well back', 'Pat it', 'Feed it chips'], 'Stay well back, and call wildlife rescue if it seems unwell. Seals need their rest.'),
      dash(45, 'Last ferry across! Pick it up for 45 seconds to the ramp!', { chapter: 'Last ferry', fx: 'noirstab' }),
      say('hk-bill', 'Bill here. A seal makes sense for the breathing. But a seal does not make a thirty metre wake. And my grandad’s Beast was bigger. Much bigger.'),
      steady('Cool down with an easy jog or a walk under the cliffs.', { chapter: 'Under the cliffs' }),
      quiz('hk-tess', 'Last one. What is the Dharug name for the Hawkesbury River?', ['Dyarubbin', 'Garramilla', 'Wianamatta'], 'Dyarubbin. The river had a name long before 1789.'),
    ],
    finale: 'The Cable Ferry is crossed. A young fur seal called Nugget, and a grandad’s Beast that was much bigger. Windsor next. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'hawkesbury-flood',
    episode: 4,
    previously: 'Previously on The River Beast: Wisemans Ferry at night, huffing in the dark, and Nugget the young fur seal.',
    next: 'Next time on The River Beast: race day, the Bridge to Bridge, and your theory about the Beast.',
    title: 'The Flood Mark',
    difficulty: 'Push yourself',
    blurb: 'At Windsor, Bill’s grandad’s Beast story leads to an old pub, a horseshoe high on the wall, and the greatest flood the river has seen.',
    place: { name: 'Thompson Square, Windsor', lat: -33.6060, lng: 150.8200 },
    loop: line('hk-tess', 'A loop! Round the square, like Macquarie’s planners intended.'),
    early: line('hk-tess', 'Stop there, all good. Windsor has great cafés.'),
    open: { scene: 'street', chapter: 'Windsor', text: 'Windsor, on the upper Hawkesbury. Old brick buildings, a green square sloping down to the river, and a pub that has stood for a very long time. Start with an easy walk or jog.' },
    steps: [
      say('hk-nell', 'Nell, historical society. Bill rang me. His grandad wrote down his Beast story. We have it here. It says it came with the big flood.'),
      quiz('hk-nell', 'Windsor was first called what?', ['Green Hills', 'Blue Hills', 'River Town'], 'Green Hills. Governor Macquarie named it Windsor in 1810, one of his five towns.'),
      say(null, 'On the wall of the old pub, high up, an iron horseshoe. Far above your head. Far above the street.', { spatial: 'car' }),
      quiz('hk-nell', 'The horseshoe on the Macquarie Arms marks what?', ['The 1867 flood peak', 'A famous horse', 'Good luck'], 'The top of the 1867 flood. The water came up to there. Imagine it.'),
      dash(30, 'Down Thompson Square to the river! Pick it up for 30 seconds!', { chapter: 'The square', fx: 'whoosh' }),
      say('hk-nell', 'Bill’s grandad’s notes say, after the flood, a great dark shape was seen rolling in the brown water. Long as a ferry. Then gone.'),
      say('hk-prakash', '[curious] In a big flood, the river carries whole trees. Roots, trunks and all. They roll over in the current. From the bank, they look alive.'),
      quiz('hk-prakash', 'Puzzle. A floating tree rolls over every few seconds in the current. From far away, what might it look like?', ['A swimming animal', 'A boat', 'A cloud'], 'A swimming animal, rolling and diving. Floods have fooled people for centuries.'),
      choice('hk-tess', 'way', 'Let’s see the river. Along the bank path, or over the new bridge?',
        { label: 'Along the bank path', line: 'Bank path! Under the old trees.', dash: 'Along the bank path! Pick it up for 30 seconds!', after: 'Along the bank, the river runs wide and calm today, brown and slow. It is hard to picture it high enough to reach the horseshoe.' },
        { label: 'Over the new bridge', line: 'The bridge! Big view up and down.', dash: 'Over the bridge! Pick it up for 30 seconds!', after: 'From the bridge, the river curves away between farms and trees. A ski boat roars past, practising for race day.' },
        'Bank path, then. Go!'),
      steady('Settle into an easy pace while Nell reads more of the notes.', { chapter: 'The notes' }),
      say('hk-nell', '[laughs] The last line of the notes says, the Beast was never seen again, but I tell the story every Christmas, because the children love it.'),
      say('hk-bill', '[laughs] That is my grandad. A storyteller to the end. So the Beast is a floating tree and a good yarn?'),
      quiz('hk-nell', 'St Matthew’s Church in Windsor was designed by which famous architect?', ['Francis Greenway', 'Walter Burley Griffin', 'Bill’s grandad'], 'Francis Greenway, the convict architect. Finished in 1822, still standing proud.'),
      dash(45, 'Race practice is on the water! Pick it up for 45 seconds along the bank to watch!', { chapter: 'Race practice', fx: 'noirstab' }),
      say('hk-maya', '[excited] Tomorrow is the Bridge to Bridge! I am going with my dad. Will the Beast be there?'),
      steady('Cool down with an easy jog or a walk back up the square.', { chapter: 'The square' }),
      quiz('hk-tess', 'Last one. The old Windsor Bridge was built in which year?', ['1874', '1974', '1774'], '1874. The oldest crossing of the river, until its replacement in 2020.'),
    ],
    finale: 'The Flood Mark is found. A horseshoe high on a pub wall, rolling trees in a flood, and a grandad who loved a yarn. Race day next. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'hawkesbury-race',
    episode: 5,
    previously: 'Previously on The River Beast: a horseshoe from the 1867 flood, rolling trees, and a grandad who told the story every Christmas.',
    title: 'Race Day',
    difficulty: 'Push yourself',
    blurb: 'The Bridge to Bridge water ski race roars up the river. Everyone gathers on the bank. Then a wake appears with no boat, and you decide.',
    place: { name: 'Dangar Island, Hawkesbury River', lat: -33.5380, lng: 151.2410 },
    loop: line('hk-tess', 'A loop. Back to the island, back where it began.'),
    early: line('hk-tess', 'Stop there, all good. Watch the boats roar past.'),
    open: { scene: 'harbour', chapter: 'Race day', text: 'Race day on the Hawkesbury. Boats lined up by Dangar Island, engines rumbling, flags flying, and crowds on every wharf and bank. Start with an easy walk or jog.' },
    steps: [
      say('hk-tess', '[excited] Tess here! The whole river is out. Bill, Maya, Nell, Doctor Prakash. And somewhere, I hope, Nugget the seal, staying out of the way.'),
      quiz('hk-tess', 'Warm up. The Bridge to Bridge race runs from Dangar Island up to which town?', ['Windsor', 'Brooklyn', 'Bondi'], 'Windsor. Up the river, round all those bends. Fast and loud.'),
      say(null, 'A horn blasts. The boats roar off, skiers bouncing behind them, spray flying in great white fans.', { fx: 'horn', spatial: 'boat' }),
      dash(30, 'Along the shore with the first boats! Pick it up for 30 seconds!', { chapter: 'The start', fx: 'whoosh' }),
      say('hk-maya', '[whispers] Tess. Look. Over there. Away from the race. A long V on the water. No boat. Going against the current.'),
      say(null, 'Everyone turns. A long wake cuts across the quiet bay behind the island. Then it fades into ripples. Nothing breaks the surface.', { fx: 'heartbeat' }),
      quiz('hk-prakash', 'Which of these did we find on our search?', ['A giant log and a seal', 'A dinosaur', 'A submarine'], 'A giant log and a young seal. And a lot of good yarns. But not this wake.'),
      say('hk-bill', '[laughs] Well. There it is. Grandad would be thrilled. So, Runner. You have seen it all. What is it?'),
      choice('hk-tess', 'beast', 'Your call, Runner. What made that wake?',
        { label: 'Something unknown', flag: 'beast', line: 'Something unknown. Bill is grinning.', dash: 'For the Beast! Pick it up for 30 seconds along the shore!', after: 'Along the shore, you watch the bay where the wake faded. Deep green water, and who knows what. Bill shakes your hand. Grandad would like you.' },
        { label: 'A wave and a good yarn', flag: 'yarn', line: 'A wave and a good yarn. Doctor Prakash nods.', dash: 'For the science! Pick it up for 30 seconds along the shore!', after: 'Along the shore, Doctor Prakash points out how wakes bounce off headlands and cross the bay later. A boat long gone. Or a seal. Science, with a smile.' },
        'Something unknown, then. Go!'),
      steady('Settle into an easy pace as the race boats roar into the distance.', { chapter: 'The distance' }),
      say('hk-tess', 'Whatever you chose, here is the truth. The river has logs, seals, floods and waves. And yarns. Nobody has proven a Beast. The yarns live on.'),
      quiz('hk-nell', 'Nell’s question. In which year did Governor Macquarie proclaim Windsor?', ['1810', '1910', '1788'], '1810, in December. Over two hundred years of river stories since.'),
      say('hk-maya', 'I am going to tell the Beast story every Christmas. Like Bill’s grandad. But I will add Nugget.'),
      dash(45, 'The ferry home is leaving! Pick it up for 45 seconds to the wharf!', { chapter: 'The ferry home', fx: 'noirstab' }),
      say(null, 'The ferry chugs back towards Brooklyn in the evening light. Just off the bow, a sleek grey head pops up, huffs, and dives. Nugget, saying goodbye.', { spatial: 'bird' }),
      steady('Cool down with an easy jog or a walk on the wharf.', { scene: 'harbour', chapter: 'Home' }),
      quiz('hk-tess', 'Last one, Runner. When did the first railway bridge here open?', ['1889', '1989', '1789'], 'The first of May, 1889. Its old piers are still standing in the river, keeping watch.'),
    ],
    finale: 'The River Beast is complete. A log, a seal, a flood, a yarn, and one wake nobody can explain. The river keeps its secrets. Thanks, Runner.',
  }),
]

export const CHAIN = ['hawkesbury-wake', 'hawkesbury-sonar', 'hawkesbury-ferry', 'hawkesbury-flood', 'hawkesbury-race']

export const CAST = {
  'hawkesbury-narrator': { name: 'Narrator', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 0.92, rate: 0.97 }, // Amelia
  'hk-tess': { name: 'Tess', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.05, rate: 1.04, radio: true }, // Ruby, in your earbuds
  'hk-bill': { name: 'Bill', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.82, rate: 0.96 }, // Jimbo
  'hk-maya': { name: 'Maya', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.3, rate: 1.08 }, // Emily, lifted
  'hk-prakash': { name: 'Doctor Prakash', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.0, rate: 1.0, radio: true }, // Eva, on the boat radio
  'hk-nell': { name: 'Nell', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.9, rate: 0.98 }, // Julieanne
}

export const LOOK = { accent: '#6FE0C0', deep: '#1A1A3A', tag: 'Open mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
