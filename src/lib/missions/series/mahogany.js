// The Mahogany Ship: a five episode open mystery at Warrnambool, on
// Victoria's south west coast. After a big storm, dark old timber pokes out
// of the dunes at Armstrong Bay, where people have said for nearly two
// hundred years that a strange wreck lies buried. Jade, a marine science
// student, and Hugo, a ten year old with a metal detector, chase the story
// through old newspapers, a maritime museum, a whale nursery, a penguin
// island and a night survey, and at the end you choose your theory. Nobody
// is hurt, and the dunes are never dug up by runners.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the Mahogany Ship is said to lie at Armstrong Bay, about 3 to 6 km
//     west of Warrnambool; the earliest written account is an 1847 Portland
//     newspaper report; in 1853 a farm renter said he could ride into the
//     wreck; the "1836 whalers" story was first printed in 1898; theories
//     include a Portuguese caravel (1522), a Spanish galleon and a vessel
//     built by escaped convicts; searches in 1890, drilling to 10 m in 1999
//     and 2004; the Victorian Government offered $250,000 in 1992 and
//     withdrew it in 1993; nothing has been verified (Mahogany Ship, Wikipedia)
//   - Warrnambool: southern right whales calve off Logans Beach from late
//     May, leaving by mid to late September; Flagstaff Hill Maritime Village
//     holds the Minton peacock from the Loch Ard; Maremma dogs guard the
//     little penguins on Middle Island, which grew from 4 in 2005 to nearly
//     200 by 2015 (the film Oddball); the name comes from Mount
//     Warrnambool, a volcano; the Dhauwurd Wurrung (Gunditjmara) are the
//     traditional owners (Warrnambool, Wikipedia)
//
// Real people are only mentioned, never voiced. The timber, the finds and
// everyone with lines are made up. No one knows if the ship exists.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('mh-jade', '[excited] Like a wave! Ease right back now.'),
  okay: line('mh-jade', 'You made it, and that is what counts. Ease right back now.'),
  half: line('mh-jade', 'Halfway! Keep going!'),
}
const EASY = line('mh-jade', 'Easy now. The coast is long, and the wind is strong.')
const base = { saga: 'mahogany', guide: 'mh-jade', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'mahogany',
  title: 'The Mahogany Ship',
  blurb: 'A storm uncovers old timber in the Warrnambool dunes, right where a legendary wreck is meant to lie. Five runs, five clues, and your theory at the end.',
  note: 'Real Warrnambool places and the true history of the legend. The timber, the finds and the people are made up. Stay on tracks and off the dunes.',
  narrator: 'mahogany-narrator',
  score: 'deepcover',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'mahogany-storm',
    episode: 1,
    next: 'Next time on The Mahogany Ship: an old newspaper from 1847, a museum full of shipwrecks, and a peacock that survived the sea.',
    title: 'After the Storm',
    blurb: 'A huge storm has shifted the dunes at Armstrong Bay. Hugo, ten, says he saw old dark timber sticking out of the sand.',
    place: { name: 'Armstrong Bay, Warrnambool', lat: -38.3990, lng: 142.4300 },
    loop: line('mh-jade', 'A loop! Like the tide. Out and back.'),
    early: line('mh-jade', 'Stop there, no worries. The dunes have kept their secret for a long time.'),
    open: { scene: 'beachdawn', chapter: 'After the storm', text: 'The coast west of Warrnambool, the morning after a wild storm. Seaweed piled high, the wind still gusting, and the dunes looking freshly carved. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Dhauwurd Wurrung Country, the Gunditjmara people. The town’s name comes from Mount Warrnambool, an old volcano to the north.'),
      say('mh-jade', 'Hi! Jade here. I study the ocean at uni. A kid called Hugo just rang me. He was so excited I could not understand half of it.'),
      say('mh-hugo', '[excited] I saw wood! Old black wood! Sticking out of the sand at Armstrong Bay! Like a ship! Like THE ship!'),
      quiz('mh-jade', 'People have talked about a mystery wreck here for a long time. When is the oldest written report?', ['1847', '1947', '1747'], 'An 1847 newspaper in Portland mentions a wreck near Warrnambool. The legend grew from there.'),
      dash(30, 'Hugo is waiting at the track head! Pick it up for 30 seconds!', { chapter: 'Armstrong Bay', fx: 'whoosh' }),
      say(null, 'The coastal track runs behind the dunes. Below, the sea is churning white, and gulls hang in the wind like kites.', { spatial: 'bird' }),
      say('mh-hugo', 'There! See it? Do not go on the dunes, Mum says. They are fragile. You can see it from the track.'),
      quiz('mh-jade', 'Where do people say the Mahogany Ship lies?', ['West of Warrnambool', 'In Port Phillip Bay', 'Off Bondi'], 'In the dunes at Armstrong Bay, a few kilometres west of town. Right here.'),
      say('mh-ron', 'G’day. Ron. Fished this coast fifty years. Every time a storm moves the sand, somebody sees the Mahogany Ship. Every time, it is something else.'),
      choice('mh-jade', 'look', 'Let’s get a better look. Along the beach at low tide, or up to the lookout?',
        { label: 'Along the beach', line: 'Beach! Stay below the dunes, near the water.', dash: 'Along the beach! Pick it up for 30 seconds!', after: 'Along the wet sand, waves rush up and drag back with a hiss. The black timber looks bigger from down here.' },
        { label: 'Up to the lookout', line: 'Lookout! Big views, no sand in your shoes.', dash: 'Up to the lookout! Pick it up for 30 seconds!', after: 'From the lookout, the whole bay curves away to the west. In the dune below, the dark shape looks like the bones of a boat.' },
        'The beach, then. Go!'),
      steady('Settle into an easy pace along the track while Jade takes photos for the experts.', { chapter: 'The timber' }),
      quiz('mh-ron', 'One idea is that the ship was Portuguese. From an expedition in which year?', ['1522', '1922', '1788'], 'Some say a Portuguese caravel sailed this coast in 1522. Long before Captain Cook. Others say no way.'),
      say('mh-jade', '[curious] Ron, the wood has iron bolts. Round heads. That tells us something. I will send the photos to the museum.'),
      say('mh-hugo', '[sighs] Does that mean it is not the Mahogany Ship?'),
      say('mh-jade', 'It means we keep looking. That is what scientists do. Want to be my assistant, Hugo?'),
      dash(45, 'The tide is turning! Pick it up for 45 seconds back to the car park!', { chapter: 'The tide', fx: 'thunder' }),
      say(null, 'The sea rolls in fast behind you. By the time you reach the car park, the beach is gone under the foam.', { scene: 'beachdawn' }),
      steady('Cool down with an easy jog or a walk as the wind drops.', { chapter: 'Cool down' }),
      quiz('mh-jade', 'Last one. How much money did the Victorian Government once offer for finding the wreck?', ['250,000 dollars', '25 dollars', '25 million dollars'], 'In 1992. Nobody claimed it, and the offer was taken back a year later.'),
    ],
    finale: 'After the Storm is done. Dark timber in the dunes, iron bolts, and a ten year old who just became an assistant. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'mahogany-museum',
    episode: 2,
    previously: 'Previously on The Mahogany Ship: a storm, dark timber in the dunes at Armstrong Bay, and iron bolts with round heads.',
    next: 'Next time on The Mahogany Ship: whales at Logans Beach, an old whalers’ tale, and a story that grew bigger every time it was told.',
    title: 'The Peacock',
    blurb: 'Jade takes the photos of the timber to the maritime museum at Flagstaff Hill, where a china peacock and an old newspaper hold clues.',
    place: { name: 'Flagstaff Hill, Warrnambool', lat: -38.3890, lng: 142.4800 },
    loop: line('mh-jade', 'A loop! Like a lighthouse beam. Round and round.'),
    early: line('mh-jade', 'Stop there, all good. The museum opens again tomorrow.'),
    open: { scene: 'harbour', chapter: 'Flagstaff Hill', text: 'Flagstaff Hill in Warrnambool. Old lighthouses, a rebuilt port village with tall ships, and the sea wind whistling through the rigging. Start with an easy walk or jog.' },
    steps: [
      say('mh-jade', 'Jade here. We are meeting Dot. She volunteers at the museum. She knows every shipwreck on this coast by heart.'),
      say('mh-dot', '[laughs] Hello, love. Come in. Mind the anchors. Now, the photos. Iron bolts, round heads. Let us see what we have.'),
      quiz('mh-dot', 'The prize of our museum is a china peacock that survived a famous shipwreck. Which ship?', ['The Loch Ard', 'The Titanic', 'The Endeavour'], 'The Loch Ard. A tall china peacock that washed ashore, still in its packing case.'),
      say(null, 'The village is full of old buildings, ropes and ships’ wheels. A cannon points out to sea. Somewhere, a bell clangs in the wind.', { spatial: 'chatter', fx: 'bellring' }),
      dash(30, 'Dot says the old newspapers are in the archive room! Pick it up for 30 seconds across the village!', { chapter: 'The archive', fx: 'whoosh' }),
      say('mh-dot', 'Here. 1847. A Portland newspaper. A wreck about two miles from Warrnambool. Not much more. But it is the first time anyone wrote it down.'),
      quiz('mh-dot', 'In 1853, a farmer said something amazing about the wreck. What?', ['He could ride into it', 'He sailed it', 'He slept on it'], 'He said he could ride his horse right into it. Big wreck. Or a big story.'),
      say('mh-hugo', '[curious] So if people could see it back then, why can nobody find it now?'),
      say('mh-dot', 'Sand, Hugo. Dunes move. A storm covers things, another uncovers them. Or perhaps it was never what people thought.'),
      choice('mh-jade', 'route', 'Dot wants to compare the timber with old ship plans. Through the village, or down by the lighthouses?',
        { label: 'Through the village', line: 'The village! Tall ships and old shops.', dash: 'Through the village! Pick it up for 30 seconds!', after: 'Through the village, past the old bank, the chapel and a sailmaker’s loft with canvas hanging from the beams.' },
        { label: 'By the lighthouses', line: 'Lighthouses! Mind the wind on the hill.', dash: 'Down by the lighthouses! Pick it up for 30 seconds!', after: 'Past the old lighthouses, the sea spreads out grey and wide, and a big ship sits on the horizon.' },
        'The village, then. Go!'),
      steady('Settle into an easy pace while Dot spreads the plans out on a big table.', { chapter: 'The plans' }),
      say('mh-dot', '[sighs] Round headed iron bolts. Machine made. Those are from the late 1800s or after. Not 1522. I am sorry, Hugo.'),
      say('mh-hugo', 'So it is a different ship?'),
      say('mh-dot', 'Maybe a jetty. Maybe a small boat. But the old reports talk about dark, hard wood. Like mahogany. Your timber is pine. The mystery is still open.'),
      quiz('mh-jade', 'Puzzle. The bolts are machine made, from the late 1800s. Could the timber be from a 1522 ship?', ['No', 'Yes', 'Only on Tuesdays'], 'No. The bolts are hundreds of years too new. Good science means letting clues change your mind.'),
      dash(45, 'The museum is closing! Pick it up for 45 seconds to the gate!', { chapter: 'Closing time', fx: 'bellring' }),
      say('mh-ron', 'Ron here. While you were in there, I remembered. My grandad told a story about whalers in 1836, rowing up the coast and seeing a wreck.'),
      steady('Cool down with an easy jog or a walk down to the foreshore.', { scene: 'beachdawn', chapter: 'Foreshore' }),
      quiz('mh-dot', 'Last one. What is the museum village at Flagstaff Hill built around?', ['The old lighthouses', 'A shopping centre', 'A football oval'], 'The original lighthouses. They guided ships into Lady Bay.'),
    ],
    finale: 'The Peacock is done. A newspaper from 1847, bolts that are too new, and a whalers’ tale from Ron’s grandad. The legend is still alive. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'mahogany-whales',
    episode: 3,
    previously: 'Previously on The Mahogany Ship: a china peacock, a newspaper from 1847, and timber with bolts that were far too new.',
    next: 'Next time on The Mahogany Ship: a penguin island, a pair of guard dogs, and a strange object found in the rock pools.',
    title: 'The Whalers’ Tale',
    blurb: 'Ron’s grandad told of whalers who saw the wreck in 1836. Jade checks the tale at Logans Beach, where whale mums bring their calves.',
    place: { name: 'Logans Beach, Warrnambool', lat: -38.4030, lng: 142.5330 },
    loop: line('mh-jade', 'A loop! Like a whale cruising the bay. Slow and steady.'),
    early: line('mh-jade', 'Stop there, all good. Stay and watch the whales for a bit.'),
    open: { scene: 'beachdawn', chapter: 'Logans Beach', text: 'Logans Beach, east of Warrnambool, on a calm winter morning. People line the platform with binoculars. Out in the bay, something huge breathes. Start with an easy walk or jog.' },
    steps: [
      say('mh-jade', '[whispers] Jade here. Look, out past the waves. A whale mum and her calf. They come here every winter. We watch from the platform. Never closer.'),
      quiz('mh-jade', 'Which whales come to Logans Beach to have their calves?', ['Southern right whales', 'Blue whales', 'Killer whales'], 'Southern right whales. The mums arrive from late May, and leave with their calves by about September.'),
      say('mh-ron', 'Ron here. My grandad’s story. Three whalers, 1836, rowing back after their boat went over. They saw a wreck in the dunes, dark and old.'),
      say('mh-dot', 'Dot here. I looked it up, Ron. That story was first printed in 1898. Sixty years after it was meant to have happened.'),
      quiz('mh-dot', 'The 1836 whalers story was first printed in which year?', ['1898', '1836', '1999'], 'Sixty years later. Stories can grow a lot in sixty years. Like fish. Ask any fisherman.'),
      say('mh-ron', '[laughs] Fair enough. My grandad’s fish got bigger every year too.'),
      dash(30, 'Along the coast track to the river mouth! Pick it up for 30 seconds!', { chapter: 'The river mouth', fx: 'whoosh' }),
      say(null, 'The Hopkins River meets the sea here. Pelicans float in the shallows. A whale spouts out in the bay, a puff of white mist.', { spatial: 'boat' }),
      say('mh-hugo', '[excited] I am counting whales. One mum, one calf. Two mums, two calves! Is that four whales?'),
      quiz('mh-hugo', 'Hugo’s puzzle. Two mums, each with one calf. How many whales?', ['Four', 'Two', 'Six'], 'Four! Two mums and two calves. Hugo is very proud.'),
      choice('mh-jade', 'path', 'Back towards town. Along the river, or the coast track?',
        { label: 'Along the river', line: 'The river! Calm and flat.', dash: 'Along the river! Pick it up for 30 seconds!', after: 'Along the river, rowers glide past, and black swans paddle out of the way with great dignity.' },
        { label: 'The coast track', line: 'Coast track! Whales on your left.', dash: 'Along the coast track! Pick it up for 30 seconds!', after: 'Along the coast track, the whale calf rolls and slaps a fin on the water. The whole platform cheers.' },
        'The river, then. Go!'),
      steady('Settle into an easy pace while Jade thinks out loud.', { chapter: 'Thinking' }),
      say('mh-jade', 'So. A real newspaper in 1847. A farmer in 1853. And a whalers’ tale first told in 1898. The older the clue, the less it says. Hmm.'),
      say('mh-dot', 'Jade, a call from Middle Island. The penguin guards found something odd in the rock pools after the storm. Brass. Very old.'),
      dash(45, 'Brass from the rock pools! Pick it up for 45 seconds back towards town!', { chapter: 'Brass', fx: 'noirstab' }),
      say(null, 'You pass the breakwater and the beach at Lady Bay. Just off shore sits a small, rocky island, with a few little fishing boats bobbing round it.'),
      steady('Cool down with an easy jog or a walk along the foreshore.', { scene: 'beachdawn', chapter: 'Lady Bay' }),
      quiz('mh-jade', 'Last one. Whale calves usually leave Logans Beach with their mums by which month?', ['September', 'January', 'March'], 'Mid to late September. Then off to the cold southern seas.'),
    ],
    finale: 'The Whalers’ Tale is checked. A great story, printed sixty years late, two whale mums, two calves, and brass in the rock pools. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'mahogany-island',
    episode: 4,
    previously: 'Previously on The Mahogany Ship: whale mums at Logans Beach, a whalers’ tale printed sixty years late, and brass in the rock pools.',
    next: 'Next time on The Mahogany Ship: a night survey of the dunes, three theories, and you choose.',
    title: 'The Penguin Guards',
    blurb: 'Two guard dogs on Middle Island found brass in the rock pools. Jade and Hugo bring it to the ranger, past the penguins’ home.',
    place: { name: 'Middle Island, Warrnambool', lat: -38.4010, lng: 142.4900 },
    loop: line('mh-jade', 'A loop! Like a guard dog on patrol.'),
    early: line('mh-jade', 'Stop there, no worries. The penguins will be home at dusk.'),
    open: { scene: 'beachdawn', chapter: 'Lady Bay', text: 'Lady Bay, in Warrnambool. A small rocky island sits just off the beach. On it, two big white dogs sit very still, watching. Start with an easy walk or jog.' },
    steps: [
      say('mh-jade', 'Jade here. Meet the ranger, Tam. And the two guards. Maremma dogs. They live on the island to protect the little penguins from foxes.'),
      say('mh-tam', 'Hi. Tam. Do not pat the dogs, they are working. And do not go on the island. It is the penguins’ home. We will bring the brass to you.'),
      quiz('mh-tam', 'In 2005, how many little penguins were left on Middle Island?', ['Four', 'Four hundred', 'Forty thousand'], 'Only four. Foxes got the rest. Then the dogs came, and by 2015 there were nearly two hundred.'),
      say('mh-hugo', '[excited] There is a movie about them! Oddball! I have watched it eleven times.'),
      dash(30, 'Tam is coming round by boat! Pick it up for 30 seconds to the boat ramp!', { chapter: 'The boat ramp', fx: 'whoosh', spatial: 'boat' }),
      say(null, 'Tam steps off the little boat holding something wrapped in a towel. Green with age, heavy, and round. A brass ring, with marks on it.'),
      quiz('mh-jade', 'Puzzle. The ring has lines and little numbers round the edge, like a compass. What might it be from?', ['A ship', 'A bicycle', 'A clock tower'], 'A ship. Maybe a compass ring, or part of a navigation tool.'),
      say('mh-dot', 'Dot here, on the phone. Read me the numbers on it, Jade. Carefully.'),
      say('mh-jade', '[curious] There is a maker’s name. A city. And a year. 1871.'),
      say('mh-dot', '[sighs] 1871. Too new for a Portuguese caravel. But maybe from one of the many wrecks on this coast. A real piece of history either way.'),
      choice('mh-jade', 'route', 'Let’s take it to the museum. Along the foreshore, or the breakwater path?',
        { label: 'The foreshore', line: 'Foreshore! Sand and sea.', dash: 'Along the foreshore! Pick it up for 30 seconds!', after: 'Along the foreshore, families build sandcastles, and a lifeguard waves from the flags.' },
        { label: 'The breakwater', line: 'Breakwater! Big waves on one side.', dash: 'Along the breakwater path! Pick it up for 30 seconds!', after: 'Out on the breakwater, waves smash white on the rocks, and the spray hits you like a sea shower.' },
        'Foreshore, then. Go!'),
      steady('Settle into an easy pace while Hugo tells Tam the whole plot of Oddball.', { chapter: 'Oddball' }),
      say('mh-tam', '[laughs] Thanks, Hugo. I was there for some of it. The dogs are better actors than the people.'),
      quiz('mh-tam', 'What animals do the Maremma dogs protect the penguins from?', ['Foxes', 'Sharks', 'Seagulls'], 'Foxes. The dogs sleep on the island and scare them away.'),
      dash(45, 'Dot says the survey team arrives tonight! Pick it up for 45 seconds back to the museum!', { chapter: 'The survey', fx: 'noirstab' }),
      say('mh-dot', 'The university is sending a team with a ground radar. It sees under the sand without digging. Tonight, at Armstrong Bay.'),
      steady('Cool down with an easy jog or a walk while the sun sets over the island.', { chapter: 'Penguin parade' }),
      quiz('mh-jade', 'Last one. At dusk, the little penguins on the island do what?', ['Come home from the sea', 'Fly south', 'Start singing'], 'They come home from fishing at sea, waddling up the rocks. The dogs watch over them.'),
    ],
    finale: 'The Penguin Guards are thanked. A brass ring from 1871, two very good dogs, and a ground radar coming tonight. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'mahogany-night',
    episode: 5,
    previously: 'Previously on The Mahogany Ship: two guard dogs, a brass ring from 1871, and a ground radar coming to the dunes.',
    title: 'Your Theory',
    difficulty: 'Push yourself',
    blurb: 'A night survey of the Armstrong Bay dunes with ground radar. Everyone brings their best theory, and so do you.',
    place: { name: 'Armstrong Bay dunes', lat: -38.4000, lng: 142.4250 },
    loop: line('mh-jade', 'A loop. Back where it all began.'),
    early: line('mh-jade', 'Stop there, all good. I will text you the results.'),
    open: { scene: 'night', chapter: 'The night survey', text: 'Armstrong Bay at night. Torches, a van with a big screen, and the sound of surf in the dark. Stars everywhere. Start with an easy walk or jog.' },
    steps: [
      say('mh-jade', '[whispers] Jade here. The radar team are walking the track with a machine like a lawnmower. It looks under the sand. Nobody digs.'),
      say('mh-ron', 'Ron here. Brought a thermos. And my theory. A Spanish galleon. Blown way off course.'),
      say('mh-dot', 'Dot here. Brought biscuits. My theory? A boat built by escaped convicts from Tasmania. Never finished.'),
      say('mh-hugo', '[excited] Hugo here. Brought my metal detector. Not allowed to use it. My theory is Portuguese. 1522. Definitely.'),
      quiz('mh-dot', 'Warm up. People drilled the dunes to find the ship in 1999 and 2004. How deep did they go?', ['About 10 metres', 'About 1 metre', 'About 100 metres'], 'About ten metres down. They found sand. Lots of sand.'),
      dash(30, 'The radar screen just lit up! Pick it up for 30 seconds to the van!', { chapter: 'The van', fx: 'whoosh', spatial: 'owl' }),
      say(null, 'On the screen, a long shape glows under the sand. Straight lines. A curve at one end. About twenty metres long.', { fx: 'found' }),
      say('mh-jade', '[curious] It could be a hull. It could be a buried fence and an old water tank. The radar cannot tell us which. Not tonight.'),
      quiz('mh-jade', 'Which of these is NOT one of the big theories about the Mahogany Ship?', ['A pirate submarine', 'A Portuguese caravel', 'A Spanish galleon'], 'A pirate submarine. The real theories are a caravel, a galleon, a convict boat, or nothing at all.'),
      choice('mh-jade', 'theory', 'Your turn, Runner. What do you think is under the sand?',
        { label: 'A very old ship', flag: 'ship', line: 'A very old ship. Hugo is cheering.', dash: 'For the old ship! Pick it up for 30 seconds along the dunes!', after: 'Along the dunes, you imagine a ship from long ago, blown onto this coast, waiting in the sand. Hugo high fives you in the dark.' },
        { label: 'A legend that grew', flag: 'legend', line: 'A legend that grew. Dot is nodding.', dash: 'For the great story! Pick it up for 30 seconds along the dunes!', after: 'Along the dunes, you think of every storyteller who added a bit more. A real wreck, perhaps, but a legend far bigger. Dot hands you a biscuit.' },
        'A very old ship, then. Go!'),
      steady('Settle into an easy pace while the radar team packs up under the stars.', { chapter: 'Under the stars' }),
      say('mh-jade', 'Whatever you chose, here is the truth. Nobody has found it. Nobody has proven it is not there. The dunes keep their secret.'),
      quiz('mh-ron', 'In 1853 a farmer said he could do what with the wreck?', ['Ride his horse into it', 'Sail it home', 'Sell it for firewood'], 'Ride right into it. If he was right, it was a big one.'),
      say('mh-hugo', '[sighs] I wanted to find it.'),
      say('mh-jade', 'Hugo, you found a timber jetty, a brass ring from 1871, four whales and a radar shape. That is a great season for a scientist.'),
      dash(45, 'Race the sunrise! Pick it up for 45 seconds along the track!', { chapter: 'Sunrise', fx: 'whistle' }),
      say(null, 'The sky goes pink over the sea. The radar van drives off. On the track, four tired people and a runner watch the sun come up over the dunes.', { scene: 'beachdawn' }),
      steady('Cool down with an easy jog or a walk in the first light.', { chapter: 'First light' }),
      quiz('mh-jade', 'Last one, Runner. Where is the oldest written report of the wreck from?', ['A Portland newspaper', 'A Spanish map', 'A whaler’s diary'], 'A Portland newspaper, in 1847. That is where the true story starts.'),
    ],
    finale: 'The Mahogany Ship is complete. A storm, a museum, whales, penguins and a radar in the night. The dunes keep their secret. Thanks, Runner.',
  }),
]

export const CHAIN = ['mahogany-storm', 'mahogany-museum', 'mahogany-whales', 'mahogany-island', 'mahogany-night']

export const CAST = {
  'mahogany-narrator': { name: 'Narrator', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.92, rate: 0.98 }, // Lee
  'mh-jade': { name: 'Jade', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.1, rate: 1.04, radio: true }, // Milly, in your earbuds
  'mh-hugo': { name: 'Hugo', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.35, rate: 1.08 }, // Ziggy, lifted
  'mh-ron': { name: 'Ron', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.96 }, // Jimbo
  'mh-dot': { name: 'Dot', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.95, rate: 0.98, radio: true }, // Julieanne
  'mh-tam': { name: 'Tam', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 1.0, rate: 1.0 }, // Scotty
}

export const LOOK = { accent: '#D9A066', deep: '#13223A', tag: 'Open mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
