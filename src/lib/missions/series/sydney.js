// Sydney After Dark: three true Sydney mysteries, told on night runs through
// the city with Ivy, who makes a history podcast called Under Sydney.
//   1. The Ghost Platforms: a bell heard at midnight in the sealed tunnels
//      under St James station. (It's water dripping onto an old bell after
//      rain, in the flooded tunnel.)
//   2. The Lost Sub: the Japanese midget submarine M24, gone after the 1942
//      attack on the harbour, and found by recreational divers in 2006.
//   3. The Rat Nests: the 120,000 lost things found under the floors of the
//      Hyde Park Barracks, and a bonnet with a name stitched inside.
//   4. The Writing on the Rocks: the carvings at the North Head quarantine
//      station, and a kangaroo cut by Sam's great grandad in 1919.
//   5. The Pinchgut Prank: a cannon booms over the harbour at midnight, like
//      Lightoller's prank of 1900. (A film crew, with a very big speaker.)
//
// Pure data (imports nothing): series/index.js hands it on. Same beat format
// as signal.js. Sounds come from audio/kits/locals.js and the city scenes in
// soundscape.js; Deep Cover's noir score suits a mystery.
//
// History and trivia were checked with a web search (November 2026):
//   - St James opened on 20 December 1926, with Museum the first underground
//     stations in Australia. Bradfield planned lines in four directions;
//     two of its four platforms were never used. A mushroom farm grew in a
//     tunnel in 1933 and 1934. In the war the southern tunnels were an air
//     raid shelter, and the RAAF ran a fighter operations bunker there. The
//     northern tunnel flooded into a lake about 1 km long, 10 m wide and 5 m
//     deep. A bell hangs in one tunnel (said to have been used by the ABC as
//     Big Ben; another source says a 1992 art installation). The Matrix
//     Revolutions filmed on the platforms. (St James station, Wikipedia)
//   - On the night of 31 May 1942, M24 followed a Manly ferry in through the
//     harbour defences and fired both its torpedoes near Bradleys Head at the
//     USS Chicago. Both missed: one ran onto Garden Island and didn't go off,
//     the other sank HMAS Kuttabul, and 21 men died. M24 was the only midget
//     to escape the harbour, and vanished. Recreational divers from No Frills
//     Divers found it in November 2006, in over 50 m of water about three
//     miles off Bungan Head, Newport. It is protected, with a no-entry zone.
//     (NSW Environment and Heritage, Maritime Heritage)
//   - Hyde Park Barracks, designed by the convict architect Francis Greenway,
//     opened on 4 June 1819 and took in 589 convicts that day; up to 1,400
//     lived there at once. From 1848 it was a depot for single immigrant
//     women, many of them Irish famine survivors. Renovations in 1979 lifted
//     the floorboards: about 120,000 artefacts came out of rats' nests and
//     rubbish, including bonnets, rosaries, clay pipes and playing cards. It
//     has been World Heritage listed since 2010. (Museums of History NSW;
//     Hyde Park Barracks, Wikipedia)
//   - North Head Quarantine Station ran from 1832 to 1984; over 13,000 people
//     were held there; at least 854 rock carvings are recorded (likely over
//     1,000), mostly by the wharf and at Old Man's Hat. The first ship held
//     was the Bussorah Merchant (1828). In February 1919 about 900 soldiers
//     from the Argyllshire walked off and were moved to the Sydney Cricket
//     Ground. North Head's little penguins are the only mainland breeding
//     colony in NSW. (North Head Quarantine Station, Wikipedia)
//   - Pinchgut: in 1788 the convict Thomas Hill spent a week there on bread
//     and water. Fort Denison was finished in 1857 for fear of a Russian
//     attack in the Crimean War; its Martello tower is the only one in
//     Australia and the last in the British Empire, with walls 3.3 to 6.7 m
//     thick, and its guns were too slow to be much use. The one o'clock gun
//     has fired since 1906 (stopped in the war, back in 1986). In 1900
//     Charles Lightoller, later an officer on the Titanic, fired a cannon
//     there as a prank and broke windows. A shell from USS Chicago hit the
//     tower in 1942. (Fort Denison, Wikipedia)
//
// Real people are only mentioned, never voiced; the losses of 1942 are
// spoken of with respect. Everyone with lines is made up. House rules:
// tense, never cruel, nobody is hurt now, and nobody goes where they
// shouldn't: the tunnels, the wreck and the archive stay off limits.

const line = (who, text) => ({ who, text })

const RESULTS = {
  'sd-ivy': {
    success: line('sd-ivy', '[excited] That was quick! Ease right back now.'),
    okay: line('sd-ivy', 'You made it, and that is what counts. Ease right back now.'),
    half: line('sd-ivy', 'Halfway! Keep going!'),
  },
  'sd-sam': {
    success: line('sd-sam', '[excited] Flying, mate! Ease right back now.'),
    okay: line('sd-sam', 'You got there. That is what counts. Ease right back now.'),
    half: line('sd-sam', 'Halfway! Keep it up!'),
  },
}
const EASY = line('sd-ivy', 'Ease off a little. Good stories take their time.')
const surge = (at, seconds, who, say, recover, extra = {}) => ({ at, kind: 'surge', seconds, who, say, recover, ...RESULTS[who], ...extra })

export const SAGA = {
  id: 'sydney',
  title: 'Sydney After Dark',
  blurb: 'True Sydney mysteries on night runs: sealed tunnels, a lost submarine, treasure hidden by rats, carvings at North Head and a midnight cannon.',
  note: 'The history is real; the characters and clues are made up. The tunnels, the wreck and the archives are off limits, so the story keeps you above ground.',
  narrator: 'sydney-narrator',
  score: 'deepcover',
  isNew: true,
}

export const EPISODES = [
  {
    id: 'sydney-stjames',
    episode: 1,
    next: 'Next time on Sydney After Dark: a midget submarine that vanished in 1942, and a deep dark spot off the Northern Beaches.',
    saga: 'sydney',
    title: 'The Ghost Platforms',
    series: 'thriller',
    type: 'surge',
    minutes: 24,
    difficulty: 'Steady effort',
    blurb: 'Episode 1. A bell rings at midnight somewhere under Macquarie Street. Below the city lie platforms no train has ever stopped at.',
    place: { name: 'St James station and Hyde Park', lat: -33.8710, lng: 151.2110 },
    loop: line('sd-ivy', 'A loop! Bradfield wanted the trains to run in loops under here too. You finished yours.'),
    early: line('sd-ivy', 'Stopping there is fine. The tunnels have kept their secrets for a hundred years. They can wait.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Hyde Park', scene: 'city', say: 'Sydney, near midnight. The fig trees in Hyde Park are full of fruit bats, and the city hums. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', who: 'sd-ivy', fx: 'squelch', say: 'Hi, it is Ivy, from the Under Sydney podcast. I need a runner tonight. Three nights in a row, people on Macquarie Street have heard a bell. At midnight. Underground.' },
      { at: 110, kind: 'story', who: 'sd-ivy', say: '[whispers] There is nothing down there but old railway tunnels. Sealed. Nobody goes in. So who is ringing the bell?' },
      { at: 165, kind: 'quiz', who: 'sd-ivy', say: 'Warm up question. St James station opened in 1926. What was it, along with Museum?',
        options: [{ key: 'A', label: 'First underground stations' }, { key: 'B', label: 'Biggest in the world' }, { key: 'C', label: 'Built by convicts' }], answer: 'A',
        right: line('sd-ivy', 'The first underground stations in Australia! Bradfield, the Harbour Bridge man, dreamed up the whole thing.'),
        wrong: line('sd-ivy', 'They were the first underground stations in Australia. Bradfield, the Harbour Bridge man, dreamed up the whole thing.') },
      { at: 230, kind: 'story', who: 'sd-frank', say: 'Frank here. Forty years on the railways. I worked the old signal box at St James. Smallest in New South Wales, people said. I know those tunnels.' },
      surge(285, 30, 'sd-ivy', 'Frank is waiting by the station! Pick it up for 30 seconds across the park!', 110, { chapter: 'St James', fx: 'whoosh' }),
      { at: 365, kind: 'story', scene: 'station', spatial: 'sydneytrain', say: 'Down the steps, the old station glows. A train rumbles out. Somewhere beyond the walls, there are two more platforms no train has ever used.' },
      { at: 420, kind: 'story', who: 'sd-frank', say: 'Bradfield planned lines going four ways from here. They dug the tunnels ready, then the plans changed. So the tunnels just sat there, waiting.' },
      { at: 475, kind: 'puzzle', who: 'sd-frank', say: 'In 1933, someone found a use for one empty tunnel. Dark, damp, cool. What did they grow?',
        options: [{ key: 'A', label: 'Mushrooms' }, { key: 'B', label: 'Tomatoes' }, { key: 'C', label: 'Orchids' }], answer: 'A',
        right: line('sd-frank', 'Mushrooms! Tonnes of them. A mushroom farm, under the middle of Sydney. True story.'),
        wrong: line('sd-frank', 'It was mushrooms. Tonnes of them. A mushroom farm, under the middle of Sydney. True story.') },
      { at: 540, kind: 'story', fx: 'bellring', scene: 'tunnel', say: 'Then you hear it. Deep, slow and muffled, through the grate at your feet. A bell. Ringing out, somewhere under the road.' },
      { at: 590, kind: 'story', who: 'sd-ivy', say: '[whispers] Okay. Okay. I am recording this. Frank, please tell me there is a sensible reason.' },
      { at: 640, kind: 'choice', id: 'way', who: 'sd-frank', say: 'The sound carries along the old tunnels. Follow it north up Macquarie Street, or south to the old air raid shelters?',
        options: [
          { key: 'A', label: 'North, Macquarie Street', flag: 'north', say: line('sd-frank', 'North it is. That is the long tunnel.') },
          { key: 'B', label: 'South, the old shelters', flag: 'south', say: line('sd-frank', 'South. Where the city hid in the war.') },
        ],
        default: 'A', timeout: line('sd-frank', 'North, then. Follow the grates.') },
      surge(690, 30, 'sd-ivy', 'North up Macquarie Street! Pick it up for 30 seconds!', 110, { if: 'north', chapter: 'The long tunnel', fx: 'whoosh' }),
      surge(691, 30, 'sd-ivy', 'South to the shelters! Pick it up for 30 seconds!', 110, { unless: 'north', chapter: 'The shelters', fx: 'whoosh' }),
      { at: 770, kind: 'story', if: 'north', say: 'Along Macquarie Street, past the old sandstone buildings. Under your feet, a tunnel runs about 250 metres the same way.' },
      { at: 771, kind: 'story', unless: 'north', say: 'In the war, the southern tunnels became an air raid shelter, with heavy blast curtains. And a secret RAAF operations room, tracking the radar.' },
      { at: 825, kind: 'steady', seconds: 150, chapter: 'The lake', say: 'Settle into an easy pace while Frank tells you about the lake.', easyNudge: EASY },
      { at: 855, kind: 'story', who: 'sd-frank', say: 'The northern tunnel flooded, years ago. Now there is a lake down there. About a kilometre long. Black water, in the dark, under the city.' },
      { at: 915, kind: 'quiz', who: 'sd-frank', say: 'How deep do you reckon that underground lake is?',
        options: [{ key: 'A', label: 'About 5 metres' }, { key: 'B', label: 'About 50 cm' }, { key: 'C', label: 'About 50 metres' }], answer: 'A',
        right: line('sd-frank', 'About 5 metres. Ten metres wide. People have talked about using it to water the gardens.'),
        wrong: line('sd-frank', 'It is about 5 metres deep. Ten metres wide. People have talked about using it to water the gardens.') },
      { at: 980, kind: 'story', who: 'sd-frank', say: 'And the bell. There has been an old bell hanging in one of those tunnels for years. Some say the ABC used it for Big Ben. Some say it was art.' },
      { at: 1035, kind: 'story', who: 'sd-ivy', fx: 'found', say: '[excited] Wait. It rained all week. Frank, if the lake is rising, and water drips from the roof right onto that bell...' },
      surge(1085, 45, 'sd-ivy', 'Frank is calling the engineers! Pick it up for 45 seconds back to the station!', 120, { chapter: 'The drip', fx: 'whoosh' }),
      { at: 1170, kind: 'story', scene: 'station', who: 'sd-frank', say: '[laughs] The engineers checked their camera. One fat drip, every few minutes, right on the bell. Loudest at midnight, when the city goes quiet.' },
      { at: 1225, kind: 'story', who: 'sd-ivy', say: 'A ghost bell, rung by rain. That is my episode. Thank you, Frank. And thank you, Runner.' },
      { at: 1265, kind: 'steady', seconds: 150, scene: 'city', chapter: 'Above ground', say: 'Cool down now with an easy jog or a walk back through Hyde Park.', easyNudge: EASY },
      { at: 1295, kind: 'quiz', who: 'sd-ivy', say: 'Last one. A famous film shot scenes on the empty platforms at St James. Which one?',
        options: [{ key: 'A', label: 'The Matrix Revolutions' }, { key: 'B', label: 'Finding Nemo' }, { key: 'C', label: 'Mad Max' }], answer: 'A',
        right: line('sd-ivy', 'The Matrix Revolutions! Those platforms have played a lot of roles. Tonight, they played a ghost.'),
        wrong: line('sd-ivy', 'It was The Matrix Revolutions. Those platforms have played a lot of roles. Tonight, they played a ghost.') },
      { at: 1360, kind: 'finale', say: 'The Ghost Platforms is solved. Old tunnels, a hidden lake, and a bell rung by the rain. To be continued.' },
    ],
  },
  {
    id: 'sydney-sub',
    episode: 2,
    previously: 'Previously on Sydney After Dark: a midnight bell under Macquarie Street, a hidden lake, and a drip.',
    next: 'Next time on Sydney After Dark: rats, a convict barracks, and 120,000 lost things under the floor.',
    saga: 'sydney',
    title: 'The Lost Sub',
    series: 'thriller',
    type: 'surge',
    minutes: 23,
    difficulty: 'Steady effort',
    blurb: 'Episode 2. In 1942 a midget submarine slipped into Sydney Harbour, fired, escaped, and vanished. For 64 years.',
    place: { name: 'Bradleys Head, Mosman', lat: -33.8530, lng: 151.2460 },
    loop: line('sd-sam', 'You ran a loop, mate. Like a ferry. Out and back, every time.'),
    early: line('sd-ivy', 'That is fine to stop there. The harbour has waited eighty years for this story. It can wait a day.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Bradleys Head', scene: 'harbour', say: 'Mosman, on a still winter night. From Bradleys Head, the Opera House and the Bridge glitter across the black water. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', who: 'sd-ivy', fx: 'squelch', say: 'Ivy again. New episode. On the night of 31 May 1942, three tiny Japanese submarines crept into Sydney Harbour. One of them was never seen again.' },
      { at: 110, kind: 'story', who: 'sd-sam', fx: 'horn', say: 'G’day! Sam, deckhand on the Manly ferry. Ivy says you are a runner. I am a talker. Between us we will get this done.' },
      { at: 165, kind: 'story', who: 'sd-ivy', say: 'That submarine was called M24. It slipped in behind a Manly ferry, right through the harbour defences. Right past where you are running.' },
      { at: 220, kind: 'quiz', who: 'sd-sam', say: 'So, how do you sneak a submarine into the harbour in 1942?',
        options: [{ key: 'A', label: 'Follow a ferry in' }, { key: 'B', label: 'Dig a tunnel' }, { key: 'C', label: 'Fly it in' }], answer: 'A',
        right: line('sd-sam', 'Follow a ferry in! Right behind a Manly ferry. Cheeky. Very, very cheeky.'),
        wrong: line('sd-sam', 'It used a ferry. Follow a ferry in, right behind a Manly ferry. Cheeky. Very, very cheeky.') },
      surge(285, 30, 'sd-sam', 'Pick it up for 30 seconds along the harbour track, past the lighthouse!', 110, { chapter: 'The attack', fx: 'whoosh' }),
      { at: 365, kind: 'story', fx: 'sonar', say: 'Near here, just after midnight, M24 fired both its torpedoes at an American cruiser, the USS Chicago. Both missed.' },
      { at: 420, kind: 'story', who: 'sd-ivy', say: '[sighs] One ran onto Garden Island and never went off. The other hit HMAS Kuttabul, an old ferry where sailors were sleeping. Twenty one men died. We remember them.' },
      { at: 480, kind: 'story', who: 'sd-sam', say: 'And then M24 just slipped out of the harbour. The only one of the three that got away. And nobody knew where it went.' },
      { at: 535, kind: 'quiz', who: 'sd-ivy', say: 'People searched for M24 for decades. How long was it missing in the end?',
        options: [{ key: 'A', label: '64 years' }, { key: 'B', label: '6 months' }, { key: 'C', label: '640 years' }], answer: 'A',
        right: line('sd-ivy', '64 years. Grandkids of the people on that night grew up wondering about it.'),
        wrong: line('sd-ivy', 'It was 64 years. Grandkids of the people on that night grew up wondering about it.') },
      { at: 600, kind: 'choice', id: 'way', who: 'sd-sam', say: 'Down to the water at Chowder Bay, or up through the bush on the old fort track?',
        options: [
          { key: 'A', label: 'Down to Chowder Bay', flag: 'bay', say: line('sd-sam', 'The bay! Mind the oysters.') },
          { key: 'B', label: 'The old fort track', flag: 'fort', say: line('sd-sam', 'The fort track! Watch your footing in the dark.') },
        ],
        default: 'B', timeout: line('sd-sam', 'The fort track, then. Up you go!') },
      surge(650, 30, 'sd-sam', 'Down to the bay! Pick it up for 30 seconds!', 110, { if: 'bay', chapter: 'The search', fx: 'whoosh' }),
      surge(651, 30, 'sd-sam', 'Up the fort track! Pick it up for 30 seconds!', 110, { unless: 'bay', chapter: 'The search', fx: 'whoosh' }),
      { at: 730, kind: 'story', if: 'bay', spatial: 'boat', say: 'Waves slap on the sandstone at Chowder Bay. A little boat putters past, its light bobbing out towards the Heads.' },
      { at: 731, kind: 'story', unless: 'bay', say: 'The old track climbs through gum trees and past gun pits from long ago. Through a gap, the Heads open out to the dark ocean.' },
      { at: 785, kind: 'steady', seconds: 150, chapter: 'The divers', say: 'Settle into an easy pace while Ivy tells you who finally found it.', easyNudge: EASY },
      { at: 815, kind: 'story', who: 'sd-ivy', say: 'In November 2006, a group of weekend divers, the No Frills Divers, went down off Bungan Head at Newport. More than fifty metres down.' },
      { at: 870, kind: 'story', fx: 'sonar', say: 'In the green dark, a long shape lay on the sand. Two torpedo tubes, both empty. M24. Exactly as it was, after 64 years.' },
      { at: 925, kind: 'quiz', who: 'sd-sam', say: 'So who found the most famous missing wreck in Sydney? Navy? Scientists?',
        options: [{ key: 'A', label: 'Weekend divers' }, { key: 'B', label: 'The navy' }, { key: 'C', label: 'A fisherman' }], answer: 'A',
        right: line('sd-sam', 'Weekend divers! Mates with tanks and a hunch. Legends.'),
        wrong: line('sd-sam', 'It was weekend divers. Mates with tanks and a hunch. Legends.') },
      { at: 990, kind: 'story', who: 'sd-ivy', say: 'Its two crew were never found. So the wreck is treated as a grave. Within days it got a protected zone, and nobody may dive there without a permit.' },
      surge(1045, 45, 'sd-sam', 'The last ferry is coming in! Pick it up for 45 seconds to the wharf!', 120, { chapter: 'The last ferry', fx: 'horn' }),
      { at: 1130, kind: 'story', scene: 'harbour', say: 'You reach the wharf as the ferry pulls in, all lights and engine rumble. Sam throws you a wave from the deck.' },
      { at: 1180, kind: 'story', who: 'sd-sam', say: 'Every night I take this ferry through the same water M24 came in on. I think about all of them. Both sides.' },
      { at: 1230, kind: 'steady', seconds: 150, chapter: 'The harbour', say: 'Cool down now with an easy jog or a walk along the water.', easyNudge: EASY },
      { at: 1260, kind: 'quiz', who: 'sd-ivy', say: 'Last one. Of the two torpedoes M24 fired, where did the one that missed end up?',
        options: [{ key: 'A', label: 'On Garden Island' }, { key: 'B', label: 'Under the Bridge' }, { key: 'C', label: 'At Manly Beach' }], answer: 'A',
        right: line('sd-ivy', 'On Garden Island. It ran aground and never went off. Sydney was very, very lucky that night.'),
        wrong: line('sd-ivy', 'It ended up on Garden Island. It ran aground and never went off. Sydney was very, very lucky that night.') },
      { at: 1320, kind: 'finale', say: 'The Lost Sub is complete. A secret attack, a 64 year search, and a wreck at rest off the Northern Beaches. To be continued.' },
    ],
  },
  {
    id: 'sydney-barracks',
    episode: 3,
    previously: 'Previously on Sydney After Dark: a submarine that vanished in 1942, and the weekend divers who found it.',
    next: 'Next time on Sydney After Dark: a thousand carvings on the rocks at North Head, and a kangaroo cut into stone in 1919.',
    saga: 'sydney',
    title: 'The Rat Nests',
    series: 'thriller',
    type: 'surge',
    minutes: 23,
    difficulty: 'Steady effort',
    blurb: 'Episode 3. Under the floors of a convict barracks, rats hid 120,000 things for over a century. One of them has a name stitched inside.',
    place: { name: 'Hyde Park Barracks, Macquarie Street', lat: -33.8693, lng: 151.2128 },
    loop: line('sd-ivy', 'A loop! Round and back, like a rat with a button. Very efficient.'),
    early: line('sd-june', 'Rest up, love. Bridget has waited a long time. She can wait a little more.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Macquarie Street', scene: 'city', say: 'Macquarie Street, on a warm night. The old sandstone of the Hyde Park Barracks glows under the streetlights. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', who: 'sd-ivy', fx: 'squelch', say: 'Ivy here. Last episode. Tonight’s mystery was hidden by rats. Lots of rats. For over a hundred years.' },
      { at: 105, kind: 'story', who: 'sd-june', say: 'Hello, dear. June. I volunteer at the Barracks. In 1979, builders lifted the old floorboards here, and found a treasure trove. In the rats’ nests.' },
      { at: 160, kind: 'quiz', who: 'sd-june', say: 'Guess how many things came out from under those floors?',
        options: [{ key: 'A', label: 'About 120,000' }, { key: 'B', label: 'About 120' }, { key: 'C', label: 'About 12' }], answer: 'A',
        right: line('sd-june', 'About 120,000! Buttons, pipes, playing cards, rosaries, bits of bonnets. The rats were magpies, really.'),
        wrong: line('sd-june', 'It was about 120,000. Buttons, pipes, playing cards, rosaries, bits of bonnets. The rats were magpies, really.') },
      { at: 225, kind: 'story', who: 'sd-ivy', say: 'And this week, June found something new in the collection. A scrap of a letter. It says: Bridget, I hid it where the convict architect prays.' },
      surge(280, 30, 'sd-ivy', 'Pick it up for 30 seconds along Macquarie Street!', 110, { chapter: 'The convict architect', fx: 'whoosh' }),
      { at: 360, kind: 'story', who: 'sd-june', say: 'The convict architect is Francis Greenway. He designed the Barracks. Governor Macquarie liked it so much he gave Greenway a full pardon.' },
      { at: 415, kind: 'puzzle', who: 'sd-june', say: 'The Barracks opened in June 1819. That first day, how many convicts moved in?',
        options: [{ key: 'A', label: '589' }, { key: 'B', label: '59' }, { key: 'C', label: '5,890' }], answer: 'A',
        right: line('sd-june', '589! Sleeping in hammocks. Later, up to 1,400 men lived here at once. Imagine the snoring.'),
        wrong: line('sd-june', 'It was 589. Sleeping in hammocks. Later, up to 1,400 men lived here at once. Imagine the snoring.') },
      { at: 480, kind: 'story', who: 'sd-ivy', say: 'Where the convict architect prays. Greenway also designed St James’ Church, right across the road. That has to be it.' },
      { at: 535, kind: 'story', fx: 'creak', spatial: 'chatter', say: 'Across Queens Square, St James’ Church stands quiet, its spire dark against the sky. A church warden is locking up for the night.' },
      { at: 590, kind: 'story', who: 'sd-june', say: '[curious] The warden says they keep an old box of things found in the church, decades ago. One is a tiny bonnet. With a name stitched inside.' },
      { at: 645, kind: 'choice', id: 'way', who: 'sd-ivy', say: 'The archive closes soon. Through Hyde Park, or round by the Domain?',
        options: [
          { key: 'A', label: 'Through Hyde Park', flag: 'park', say: line('sd-ivy', 'Hyde Park! Under the figs. Go!') },
          { key: 'B', label: 'Round by the Domain', flag: 'domain', say: line('sd-ivy', 'The Domain! Wide and fast. Go!') },
        ],
        default: 'A', timeout: line('sd-ivy', 'Hyde Park, then. Run!') },
      surge(695, 30, 'sd-ivy', 'Through Hyde Park! Pick it up for 30 seconds!', 110, { if: 'park', chapter: 'The bonnet', fx: 'whoosh' }),
      surge(696, 30, 'sd-ivy', 'Round the Domain! Pick it up for 30 seconds!', 110, { unless: 'park', chapter: 'The bonnet', fx: 'whoosh' }),
      { at: 775, kind: 'story', if: 'park', say: 'Under the fig trees of Hyde Park, fruit bats squabble overhead, and the fountain splashes in the dark.' },
      { at: 776, kind: 'story', unless: 'park', say: 'The Domain opens out, wide and dark, with the city towers glowing behind the trees.' },
      { at: 830, kind: 'steady', seconds: 150, chapter: 'Bridget', say: 'Settle into an easy pace while June tells you who lived at the Barracks next.', easyNudge: EASY },
      { at: 860, kind: 'story', who: 'sd-june', say: 'From 1848, the Barracks took in young women arriving alone from overseas. Many were Irish, escaping the famine. Bridget was a common name.' },
      { at: 915, kind: 'quiz', who: 'sd-june', say: 'There is a famine memorial at the Barracks now. How many women’s names are etched into its glass?',
        options: [{ key: 'A', label: '420' }, { key: 'B', label: '42' }, { key: 'C', label: '4,200' }], answer: 'A',
        right: line('sd-june', '420 names. Every one of them started a whole new life here.'),
        wrong: line('sd-june', 'There are 420 names. Every one of them started a whole new life here.') },
      { at: 980, kind: 'story', who: 'sd-ivy', fx: 'found', say: '[excited] June! The bonnet in the church box. The stitching says Bridget. And the fabric matches the scrap from under the floor. Same blue check!' },
      surge(1035, 45, 'sd-ivy', 'June needs it at the Barracks before they lock up! Pick it up for 45 seconds!', 120, { chapter: 'Lock up', fx: 'clock' }),
      { at: 1120, kind: 'story', who: 'sd-june', say: '[laughs] You made it! Look. The bonnet, and the scrap from the rats’ nest. Two halves of the same bit of cloth, apart for a hundred and fifty years.' },
      { at: 1175, kind: 'story', who: 'sd-june', say: 'A rat stole half of Bridget’s bonnet, so she must have left the rest in church. We will put them on show together. Her story, home at last.' },
      { at: 1230, kind: 'steady', seconds: 150, chapter: 'Goodnight, Sydney', say: 'Cool down now with an easy jog or a walk back down Macquarie Street.', easyNudge: EASY },
      { at: 1260, kind: 'quiz', who: 'sd-ivy', say: 'Last one. In 2010 the Barracks joined a famous list. Which one?',
        options: [{ key: 'A', label: 'World Heritage' }, { key: 'B', label: 'Tallest buildings' }, { key: 'C', label: 'Best cafes' }], answer: 'A',
        right: line('sd-ivy', 'World Heritage! One of eleven Australian convict sites. Not bad for a building full of rats.'),
        wrong: line('sd-ivy', 'It was World Heritage. One of eleven Australian convict sites. Not bad for a building full of rats.') },
      { at: 1320, kind: 'finale', say: 'The Rat Nests is solved. A scrap from a rat’s nest, a bonnet in a church, and Bridget’s story home at last. To be continued.' },
    ],
  },
  {
    id: 'sydney-qstation',
    episode: 4,
    previously: 'Previously on Sydney After Dark: rats under the Barracks floors, and half a bonnet that waited 150 years.',
    next: 'Next time on Sydney After Dark, the finale: a cannon fired over the harbour at midnight, and the oldest prank in Sydney.',
    saga: 'sydney',
    title: 'The Writing on the Rocks',
    series: 'thriller',
    type: 'surge',
    minutes: 24,
    difficulty: 'Steady effort',
    blurb: 'Episode 4. At North Head, people kept apart from Sydney carved over a thousand messages into the rocks. One is a kangaroo, cut by Sam’s great grandad.',
    place: { name: 'Q Station, North Head, Manly', lat: -33.8040, lng: 151.2860 },
    loop: line('sd-sam', 'A loop! Like the ferry. Manly and back, all day long.'),
    early: line('sd-ivy', 'That is fine to stop there. The rocks have kept these messages for nearly two hundred years.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Manly', scene: 'harbour', say: 'Manly, at dusk. The last ferries churn in and out, and North Head rises dark against the sea. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', who: 'sd-sam', fx: 'horn', say: 'Sam here! Off shift, and I need your legs. My family has a legend. Great grandad Joe carved a kangaroo on a rock at North Head. In 1919.' },
      { at: 110, kind: 'story', who: 'sd-ivy', fx: 'squelch', say: 'And I need a story. North Head was Sydney’s quarantine station. Ships with sickness on board stopped here, and everyone waited it out.' },
      { at: 165, kind: 'quiz', who: 'sd-ivy', say: 'Warm up. The quarantine station opened in 1832. When did it finally close?',
        options: [{ key: 'A', label: '1984' }, { key: 'B', label: '1850' }, { key: 'C', label: '1919' }], answer: 'A',
        right: line('sd-ivy', '1984! More than 150 years of ships, and over 13,000 people kept here till they were safe to go.'),
        wrong: line('sd-ivy', 'It closed in 1984. More than 150 years of ships, and over 13,000 people kept here till they were safe to go.') },
      surge(230, 30, 'sd-sam', 'Pick it up for 30 seconds along the Manly foreshore!', 110, { chapter: 'North Head', fx: 'whoosh' }),
      { at: 310, kind: 'story', scene: 'ranges', spatial: 'owl', say: 'The road climbs onto the headland. Old sandstone buildings sit in the bush, quiet and pale in the dusk. This is Q Station.' },
      { at: 365, kind: 'story', who: 'sd-ivy', say: 'While people waited here, they carved messages into the rocks. Names, dates, ships, pictures. In English, and in many other languages too.' },
      { at: 420, kind: 'quiz', who: 'sd-ivy', say: 'How many carvings do people think are on these rocks?',
        options: [{ key: 'A', label: 'Over 1,000' }, { key: 'B', label: 'About 10' }, { key: 'C', label: 'About 100' }], answer: 'A',
        right: line('sd-ivy', 'Over 1,000! At least 854 recorded so far. Finding Joe’s kangaroo will take some looking.'),
        wrong: line('sd-ivy', 'It is over 1,000. At least 854 recorded so far. Finding Joe’s kangaroo will take some looking.') },
      { at: 485, kind: 'story', who: 'sd-sam', say: 'Here is the thing. Joe came home from the war in 1919 on a ship called the Argyllshire. They kept everyone here, in case of the Spanish flu.' },
      { at: 540, kind: 'story', who: 'sd-sam', say: '[laughs] And the family story says Joe and hundreds of his mates got fed up and just walked out. Is that even true?' },
      { at: 590, kind: 'puzzle', who: 'sd-ivy', say: 'It is true! About 900 soldiers walked off North Head in February 1919. Where were they moved to?',
        options: [{ key: 'A', label: 'The Cricket Ground' }, { key: 'B', label: 'The Opera House' }, { key: 'C', label: 'Taronga Zoo' }], answer: 'A',
        right: line('sd-ivy', 'The Cricket Ground! The Sydney Cricket Ground. Imagine camping on the pitch.'),
        wrong: line('sd-ivy', 'It was the Cricket Ground. The Sydney Cricket Ground. Imagine camping on the pitch.') },
      { at: 655, kind: 'choice', id: 'way', who: 'sd-sam', say: 'Most carvings are by the old wharf, or up at a rock called Old Man’s Hat. Which first?',
        options: [
          { key: 'A', label: 'The old wharf', flag: 'wharf', say: line('sd-sam', 'The wharf! Down to the water.') },
          { key: 'B', label: 'Old Man’s Hat', flag: 'hat', say: line('sd-sam', 'Old Man’s Hat! Up the hill, then.') },
        ],
        default: 'A', timeout: line('sd-sam', 'The wharf, then. Go!') },
      surge(705, 30, 'sd-sam', 'Down to the wharf! Pick it up for 30 seconds!', 110, { if: 'wharf', chapter: 'The carvings', fx: 'whoosh' }),
      surge(706, 30, 'sd-sam', 'Up to Old Man’s Hat! Pick it up for 30 seconds!', 110, { unless: 'wharf', chapter: 'The carvings', fx: 'whoosh' }),
      { at: 785, kind: 'story', if: 'wharf', say: 'By the old wharf, the sandstone is covered in letters. Ship names, dates from the 1800s, a sailing ship cut so finely you can count its ropes.' },
      { at: 786, kind: 'story', unless: 'wharf', say: 'Up at Old Man’s Hat, a great overhang of rock is crowded with carvings, some so old the wind has nearly rubbed them away.' },
      { at: 840, kind: 'steady', seconds: 150, chapter: 'The search', say: 'Settle into an easy pace while Sam searches with his torch.', easyNudge: EASY },
      { at: 870, kind: 'story', who: 'sd-sam', say: 'There is a shield, a ship, some names. Nineteen nineteen. Lots from nineteen nineteen. No kangaroo yet. Come on, Joe.' },
      { at: 925, kind: 'quiz', who: 'sd-ivy', say: 'While Sam looks. Little penguins nest on North Head. What makes this colony special?',
        options: [{ key: 'A', label: 'Only mainland one in NSW' }, { key: 'B', label: 'They are purple' }, { key: 'C', label: 'They live in trees' }], answer: 'A',
        right: line('sd-ivy', 'The only mainland one in NSW! So we stay on the path and keep our torches low.'),
        wrong: line('sd-ivy', 'It is the only mainland one in NSW. So we stay on the path and keep our torches low.') },
      { at: 990, kind: 'story', who: 'sd-sam', fx: 'found', say: '[excited] Got it! A little kangaroo, mid hop. J. K. 1919. Argyllshire. And underneath, two words. Home soon.' },
      { at: 1040, kind: 'story', who: 'sd-sam', say: '[sighs] Home soon. And he was. Three weeks later he married my great nan. Mate, I need to show Mum this.' },
      surge(1090, 45, 'sd-sam', 'The last ferry back to the city! Pick it up for 45 seconds to the wharf!', 120, { chapter: 'The last ferry', fx: 'horn' }),
      { at: 1175, kind: 'story', scene: 'harbour', say: 'You make the ferry as the ropes come in. North Head slides away behind you, its carvings keeping their stories in the dark.' },
      { at: 1225, kind: 'steady', seconds: 150, chapter: 'Across the water', say: 'Cool down now with an easy jog or a walk when you reach the other side.', easyNudge: EASY },
      { at: 1255, kind: 'quiz', who: 'sd-ivy', say: 'Last one. The first ship ever held at the quarantine station arrived in 1828. What was it called?',
        options: [{ key: 'A', label: 'Bussorah Merchant' }, { key: 'B', label: 'Endeavour' }, { key: 'C', label: 'Titanic' }], answer: 'A',
        right: line('sd-ivy', 'The Bussorah Merchant! The first of at least 580 ships to wait at North Head.'),
        wrong: line('sd-ivy', 'It was the Bussorah Merchant. The first of at least 580 ships to wait at North Head.') },
      { at: 1315, kind: 'finale', say: 'The Writing on the Rocks is solved. A thousand messages in stone, and one little kangaroo that said home soon. To be continued.' },
    ],
  },
  {
    id: 'sydney-pinchgut',
    episode: 5,
    previously: 'Previously on Sydney After Dark: a thousand carvings at North Head, and a kangaroo that said home soon.',
    saga: 'sydney',
    title: 'The Pinchgut Prank',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Hard effort',
    blurb: 'Episode 5, the finale. A cannon booms over the harbour at midnight. Fort Denison has done this before, in 1900, as a prank.',
    place: { name: 'Mrs Macquarie’s Chair, facing Fort Denison', lat: -33.8597, lng: 151.2225 },
    loop: line('sd-ivy', 'You closed a loop. Round the harbour and home. Perfect finale.'),
    early: line('sd-ivy', 'Stopping there is fine. The fort has stood since 1857. It will wait for you.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Farm Cove', scene: 'harbour', say: 'The Royal Botanic Garden, near midnight. Across Farm Cove, the Opera House glows, and out in the water sits a small stone fort. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', fx: 'boom', say: 'Then, from the harbour, a deep BOOM. It rolls off the water and rattles the windows along the shore. Every bat in the garden takes off.' },
      { at: 100, kind: 'story', who: 'sd-ivy', fx: 'squelch', say: 'Ivy! Did you hear that? That came from Fort Denison. Our finale just walked in the door. Run to Mrs Macquarie’s Chair and tell me what you see.' },
      { at: 160, kind: 'quiz', who: 'sd-ivy', say: 'While you go. Fort Denison has an old nickname from 1788, when a convict was left there on bread and water. What is it?',
        options: [{ key: 'A', label: 'Pinchgut' }, { key: 'B', label: 'Rumbletum' }, { key: 'C', label: 'Hungry Rock' }], answer: 'A',
        right: line('sd-ivy', 'Pinchgut! A week on bread and water would pinch anyone’s gut.'),
        wrong: line('sd-ivy', 'It is Pinchgut. A week on bread and water would pinch anyone’s gut.') },
      surge(225, 30, 'sd-ivy', 'Pick it up for 30 seconds round Farm Cove to the point!', 110, { chapter: 'The boom', fx: 'whoosh' }),
      { at: 305, kind: 'story', spatial: 'boat', say: 'At Mrs Macquarie’s Chair, the fort is right there across the water. A round stone tower, and lights moving on its roof.' },
      { at: 355, kind: 'story', who: 'sd-frank', say: 'Frank here. Ivy rang me. I know that fort. They built it in the 1850s, scared of a Russian attack. Finished in 1857.' },
      { at: 410, kind: 'quiz', who: 'sd-frank', say: 'That round tower on Fort Denison is the only one of its kind in Australia. What kind of tower is it?',
        options: [{ key: 'A', label: 'A Martello tower' }, { key: 'B', label: 'A lighthouse' }, { key: 'C', label: 'A water tower' }], answer: 'A',
        right: line('sd-frank', 'A Martello tower! The last one built anywhere in the British Empire. Walls up to six metres thick.'),
        wrong: line('sd-frank', 'It is a Martello tower. The last one built anywhere in the British Empire. Walls up to six metres thick.') },
      { at: 475, kind: 'story', who: 'sd-frank', say: '[laughs] And here is a funny one. The cannons were nearly useless. By the time they loaded a gun, the ship had already sailed past.' },
      { at: 530, kind: 'story', fx: 'boom', say: 'BOOM. Another one. A puff of white smoke drifts off the tower. Along the shore, apartment lights flick on, one after another.' },
      { at: 580, kind: 'story', who: 'sd-ivy', say: '[whispers] Okay, Frank. Is this a real cannon? Who is out there, firing a cannon over Sydney at midnight?' },
      { at: 630, kind: 'choice', id: 'way', who: 'sd-sam', say: 'Sam here, on the harbour patrol radio! I can pick you up at the Opera House steps, or you can watch from the Botanic Garden wall.',
        options: [
          { key: 'A', label: 'Opera House steps', flag: 'boat', say: line('sd-sam', 'Steps it is. I will bring the boat round!') },
          { key: 'B', label: 'The garden wall', flag: 'wall', say: line('sd-sam', 'The wall. Best view in Sydney. Go!') },
        ],
        default: 'A', timeout: line('sd-sam', 'Opera House steps, then. Run!') },
      surge(680, 45, 'sd-sam', 'To the Opera House steps! Pick it up for 45 seconds!', 130, { if: 'boat', chapter: 'Out on the water', fx: 'whoosh' }),
      surge(681, 45, 'sd-sam', 'Along the garden wall! Pick it up for 45 seconds!', 130, { unless: 'boat', chapter: 'The wall', fx: 'whoosh' }),
      { at: 780, kind: 'story', if: 'boat', spatial: 'boat', say: 'Sam’s boat noses up to the steps. You climb in, and the harbour opens around you, black and glittering.' },
      { at: 781, kind: 'story', unless: 'boat', say: 'From the sandstone wall, you can see the whole fort, the tower, and a small crowd of people with cameras on its roof.' },
      { at: 840, kind: 'steady', seconds: 150, chapter: 'The prank', say: 'Settle into an easy pace while Frank tells you about the oldest prank in Sydney.', easyNudge: EASY },
      { at: 870, kind: 'story', who: 'sd-frank', say: 'In 1900, a young sailor called Charles Lightoller and two mates snuck onto the fort and fired a cannon, to fake an attack. It broke windows.' },
      { at: 930, kind: 'quiz', who: 'sd-frank', say: 'Lightoller became famous later on, as an officer on a very famous ship. Which one?',
        options: [{ key: 'A', label: 'The Titanic' }, { key: 'B', label: 'The Endeavour' }, { key: 'C', label: 'The Bounty' }], answer: 'A',
        right: line('sd-frank', 'The Titanic! The prankster of Pinchgut became an officer on the Titanic. He survived it, too.'),
        wrong: line('sd-frank', 'It was the Titanic. The prankster of Pinchgut became an officer on the Titanic. He survived it, too.') },
      { at: 995, kind: 'story', who: 'sd-sam', fx: 'found', say: '[laughs] Mystery solved! It is a film crew! They are shooting a documentary about the 1900 prank. With a cannon sound out of a speaker. A very big speaker.' },
      { at: 1050, kind: 'story', who: 'sd-ivy', say: '[sighs] They forgot to tell the neighbours. Three hundred phone calls to the police later, they are packing up. Nobody is in trouble. Much.' },
      { at: 1100, kind: 'story', who: 'sd-frank', say: 'And look at the tower, in the floodlights. That dent. In 1942, a shell from the USS Chicago hit it, the night of the midget subs. Still there.' },
      surge(1160, 45, 'sd-ivy', 'One last run for the finale! Pick it up for 45 seconds round to the Opera House!', 130, { chapter: 'Finale', fx: 'whoosh' }),
      { at: 1250, kind: 'story', scene: 'city', say: 'You stop on the Opera House steps, breathing hard. The fort sits quiet now. The city hums. Ivy hits record one last time.' },
      { at: 1300, kind: 'steady', seconds: 150, chapter: 'Goodnight, Sydney', say: 'Cool down now with an easy jog or a walk along the harbour.', easyNudge: EASY },
      { at: 1330, kind: 'quiz', who: 'sd-ivy', say: 'Last question of the season. Every day since 1906, apart from a long break, a gun on Fort Denison has fired at what time?',
        options: [{ key: 'A', label: 'One o’clock' }, { key: 'B', label: 'Midnight' }, { key: 'C', label: 'Six in the morning' }], answer: 'A',
        right: line('sd-ivy', 'One o’clock! So sailors could set their clocks. Not at midnight. Never at midnight.'),
        wrong: line('sd-ivy', 'It is one o’clock. So sailors could set their clocks. Not at midnight. Never at midnight.') },
      { at: 1395, kind: 'story', who: 'sd-ivy', say: 'Tunnels, a lost sub, rats, carvings and a cannon. Thank you for running Sydney with me. This has been Under Sydney.' },
      { at: 1440, kind: 'finale', say: 'Sydney After Dark is complete. A bell, a submarine, a bonnet, a kangaroo and a cannon. Goodnight, Sydney. Goodnight, Runner.' },
    ],
  },
]

export const CHAIN = ['sydney-stjames', 'sydney-sub', 'sydney-barracks', 'sydney-qstation', 'sydney-pinchgut']

export const CAST = {
  'sydney-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.85, rate: 0.98 }, // Peter Michael
  'sd-ivy': { name: 'Ivy', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 1.1, rate: 1.04, radio: true }, // Amelia, on the podcast line
  'sd-frank': { name: 'Frank', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.96 }, // Jimbo
  'sd-sam': { name: 'Sam', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.1, rate: 1.06, radio: true }, // Ziggy
  'sd-june': { name: 'June', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.95, rate: 0.96 }, // Julieanne
}

export const LOOK = { accent: '#8FD3FF', deep: '#0A1626', tag: 'True mysteries' }

export const LIBRARY = {
  ambience: {
    tunnel: 'Inside an old disused railway tunnel deep under a city at night: water dripping into a still underground pool, a deep low rumble of a train passing somewhere far off, cold air moving, a huge echoing silence, no music, no voices',
  },
  sfx: {},
  tracks: {},
}
