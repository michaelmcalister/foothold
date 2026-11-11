// The Tunnels: a five episode mystery in Darwin. Under the cliffs of the
// city sit oil storage tunnels dug during World War II, never filled with
// oil in the war. Amira, a tunnel guide, finds an old lunch tin behind a
// loose panel. Inside is a cook's hand drawn map, marked "Tunnel 8", a
// tunnel that was planned but never finished. You follow the map with her,
// a retired navy cook's grandson, a laksa stall at Mindil Beach, the coast
// at East Point and a wet season storm, to the cook's real treasure: a
// letter he never sent. Nobody is hurt, nobody goes anywhere closed, and
// nobody swims in the sea in stinger season.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - Darwin's oil storage tunnels: 11 were planned after the air raids of
//     1942 destroyed above ground tanks; six were complete when peace came
//     in 1945; tunnel 5 is 172 m and tunnel 6 is 77 m long; they never held
//     oil in the war; jet fuel was kept in 5 and 6 for three years in the
//     1950s; they opened to the public on 19 February 1992, fifty years
//     after the bombing of Darwin (Darwin oil storage tunnels, Wikipedia)
//   - Darwin: the Larrakia people's name for the area is Garramilla, "white
//     stone"; John Clements Wickham named the port in 1839, after Charles
//     Darwin, a former shipmate on HMS Beagle; it was called Palmerston
//     from 1869 to 1911; the Mindil Beach Sunset Market runs on Thursdays
//     and Sundays in the dry season; the dry is roughly May to September,
//     the wet December to March; the Waterfront has a wave pool and a safe
//     swimming lagoon; box jellyfish are in the sea from October to May
//     (Darwin, Northern Territory, Wikipedia)
//
// Real people are only mentioned, never voiced. The map, the tin, the
// letter and everyone with lines are made up.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('tn-amira', '[excited] Too easy! Ease right back now.'),
  okay: line('tn-amira', 'You made it, and that is what counts. Ease right back now.'),
  half: line('tn-amira', 'Halfway! Keep it going!'),
}
const EASY = line('tn-amira', 'Easy now. In the Top End, the heat sets the pace.')
const base = { saga: 'tunnels', guide: 'tn-amira', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'tunnels',
  title: 'The Tunnels',
  blurb: 'Under Darwin’s cliffs, wartime tunnels that never held oil. A lunch tin behind a loose panel holds a map to Tunnel 8, which was never finished.',
  note: 'The tunnels and the Darwin history are true. The map, the tin, the letter and the people are made up. Never swim in the sea in stinger season.',
  narrator: 'tunnels-narrator',
  score: 'heist',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'tunnels-tin',
    episode: 1,
    next: 'Next time on The Tunnels: sunset at Mindil Beach, a laksa stall, and a recipe with numbers in it.',
    title: 'The Lunch Tin',
    blurb: 'A loose panel in an old oil tunnel hides a rusty lunch tin. Inside, a hand drawn map with the words Tunnel 8.',
    place: { name: 'WWII Oil Storage Tunnels, Darwin', lat: -12.4672, lng: 130.8460 },
    loop: line('tn-amira', 'A loop! Like walking in and out of a tunnel. Same door, both ways.'),
    early: line('tn-amira', 'Stop there, no worries. It is cool in the tunnels. Come and cool down.'),
    open: { scene: 'tunnel', chapter: 'Tunnel 5', text: 'Darwin, early morning. The air is already warm and thick. Below the cliffs, a door leads into a long, cool tunnel lined with old photos. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Larrakia Country. Their name for this place is Garramilla, meaning white stone, for the pale cliffs along the harbour.'),
      say('tn-amira', 'Hi, Runner. Amira here. I run tours in the tunnels. This morning, a panel came loose by the far wall. Behind it, a rusty lunch tin.'),
      quiz('tn-amira', 'These tunnels were dug in World War II. What were they meant to hold?', ['Oil', 'Gold', 'Soldiers'], 'Oil for the navy, safe from bombs. The old tanks on the hill had been hit in the air raids of 1942.'),
      say('tn-amira', '[curious] Inside the tin. A spoon. A ration card. And a map, drawn in pencil. It says, Tunnel 8. And a name. Cook Jim Doyle.'),
      quiz('tn-amira', 'Eleven tunnels were planned. How many were finished by the end of the war?', ['Six', 'Eleven', 'One'], 'Six. Tunnel 8 was one of the ones never finished. So where does this map go?'),
      dash(30, 'To the tunnel entrance with the map! Pick it up for 30 seconds!', { chapter: 'The entrance', fx: 'whoosh' }),
      say(null, 'Out of the cool tunnel and into a wall of heat. Frangipani trees, a palm swaying, and the harbour blue and flat below.', { scene: 'monsoon', spatial: 'bird' }),
      say('tn-ollie', 'G’day, Amira! Ollie, from the café. Wait. Did you say Jim Doyle? That was my great grandad. He was a navy cook here in the war!'),
      quiz('tn-ollie', 'Tunnel 5, where you found the tin, is how long?', ['172 metres', '17 metres', '1,700 metres'], 'One hundred and seventy two metres. A long way to walk with a tray of sandwiches.'),
      choice('tn-amira', 'way', 'The map shows a path along the cliffs. Along the waterfront, or up on the clifftop?',
        { label: 'Along the waterfront', line: 'Waterfront! Wave to the boats.', dash: 'Along the waterfront! Pick it up for 30 seconds!', after: 'Along the waterfront, the wharf stretches out over the water, and fishing boats rock gently at their moorings.' },
        { label: 'Up on the clifftop', line: 'Clifftop! Shady trees up there.', dash: 'Up on the clifftop! Pick it up for 30 seconds!', after: 'Up on the clifftop, under big shady trees, the whole harbour glitters below, turquoise and huge.' },
        'Waterfront, then. Go!'),
      steady('Settle into an easy pace in the shade while Ollie calls his nan.', { chapter: 'Nan' }),
      say('tn-ollie', '[excited] Nan says her dad, Jim, always said he left something in Tunnel 8. Everyone thought he was joking. There is no Tunnel 8.'),
      say('tn-amira', 'Look at the corner of the map. A bowl drawn in pencil. And numbers. 3, 2, 1, 4. Like a recipe.'),
      quiz('tn-amira', 'Puzzle. The map has a bowl and the numbers 3, 2, 1, 4. What do they add up to?', ['Ten', 'Eight', 'Twelve'], 'Ten. Is that a number of steps? A street? A tunnel? Hmm.'),
      dash(45, 'The tour group is coming! Pick it up for 45 seconds and get the tin to the office!', { chapter: 'The office', fx: 'noirstab' }),
      say('tn-ollie', 'Nan says her dad loved one thing more than cooking. A girl called Rose, who ran a noodle stall. She married someone else.'),
      steady('Cool down with an easy jog or a walk back into the shade.', { chapter: 'Shade' }),
      quiz('tn-amira', 'Last one. The tunnels opened to visitors in 1992. Why that date?', ['Fifty years since bombing', 'Darwin’s birthday', 'It was a Tuesday'], 'Fifty years since the bombing of Darwin. A day to remember everyone who lived through it.'),
    ],
    finale: 'The Lunch Tin is opened. A pencil map, a cook called Jim, and a girl called Rose with a noodle stall. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'tunnels-mindil',
    episode: 2,
    previously: 'Previously on The Tunnels: a lunch tin behind a panel, a map to Tunnel 8, and Ollie’s great grandad Jim, the navy cook.',
    next: 'Next time on The Tunnels: East Point at dawn, wallabies in the grass, and a lookout over the sea.',
    title: 'Sunset at Mindil',
    blurb: 'Rose’s family still runs a laksa stall at the Mindil Beach Sunset Market. Her granddaughter may know what the numbers mean.',
    place: { name: 'Mindil Beach, Darwin', lat: -12.4466, lng: 130.8329 },
    loop: line('tn-amira', 'A loop! Like the market crowd. Round and round the stalls.'),
    early: line('tn-amira', 'Stop there, all good. Grab a laksa and watch the sunset.'),
    open: { scene: 'festival', chapter: 'Mindil Beach', text: 'Mindil Beach, an hour before sunset. Hundreds of stalls, smoke from satay grills, a didgeridoo player, and crowds heading for the sand. Start with an easy walk or jog.' },
    steps: [
      say('tn-amira', 'Amira here. Ollie is with me. We are looking for June’s Laksa. Rose was her grandmother.'),
      quiz('tn-amira', 'The Mindil Beach Sunset Market runs in which season?', ['The dry season', 'The wet season', 'Winter only'], 'The dry season, roughly May to September. Thursdays and Sundays. Best sunsets in Australia, locals say.'),
      say(null, 'Smells everywhere. Laksa. Satay. Mango. Crocodile burgers. A kid with a sparkler. People carrying chairs to the beach for the sunset.', { spatial: 'chatter' }),
      dash(30, 'June’s stall is at the far end! Pick it up for 30 seconds through the crowd!', { chapter: 'The stalls', fx: 'whoosh' }),
      say('tn-june', '[laughs] Hello, darlings! June. Rose was my grandma. Jim Doyle? Oh, she told me about him. A sailor who cooked better than she did. She never forgot that.'),
      say('tn-amira', '[curious] June, the map has a bowl and the numbers 3, 2, 1, 4. Does that mean anything?'),
      say('tn-june', '[laughs] It is her laksa recipe! Three spoons of paste, two of sugar, one of fish sauce, four cups of stock. Jim must have copied it.'),
      quiz('tn-june', 'My puzzle. Three spoons, two spoons, one spoon. How many spoons in all?', ['Six', 'Five', 'Nine'], 'Six spoons. Plus four cups of stock. The best laksa in Darwin. Ask anyone.'),
      choice('tn-amira', 'way', 'June says Rose had a second stall at East Point once. Along the beach, or by the road?',
        { label: 'Along the beach', line: 'The beach! Stay out of the water, stinger season.', dash: 'Along the beach! Pick it up for 30 seconds!', after: 'Along the sand, the sun sinks into the sea, huge and orange. Everybody on the beach goes quiet to watch.' },
        { label: 'By the road', line: 'The road! Mind the bikes.', dash: 'Along the road! Pick it up for 30 seconds!', after: 'Along the road, under the palms, the sky turns pink, then orange, then gold. A pelican flies past, slow and heavy.' },
        'The beach, then. Go!'),
      steady('Settle into an easy pace while June talks about her grandma.', { chapter: 'Rose' }),
      say('tn-june', 'Grandma Rose once said Jim gave her a lookout, not a ring. She thought it was very strange. She laughed about it for sixty years.'),
      quiz('tn-amira', 'Box jellyfish are in the sea near Darwin in which months?', ['October to May', 'June to July', 'Never'], 'October to May. So no swimming in the sea then. Use the lagoon instead.'),
      say('tn-ollie', '[excited] A lookout! East Point has a lookout! Over the sea! That is what Jim meant!'),
      dash(45, 'The market is packing up! Pick it up for 45 seconds back to the car park!', { chapter: 'Pack up', fx: 'noirstab' }),
      say(null, 'Stalls fold away. Lights twinkle along the beach. June presses a hot container of laksa into your hands. For later.'),
      steady('Cool down with an easy jog or a walk under the palms.', { scene: 'night', chapter: 'Night' }),
      quiz('tn-june', 'Last one, darling. Darwin was named after a famous scientist. Who?', ['Charles Darwin', 'Albert Einstein', 'Isaac Newton'], 'Charles Darwin. He had sailed on the ship that came here in 1839. He never visited himself.'),
    ],
    finale: 'Sunset at Mindil is done. A laksa recipe, a lookout instead of a ring, and East Point at dawn. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'tunnels-eastpoint',
    episode: 3,
    previously: 'Previously on The Tunnels: Rose’s laksa recipe, a market at sunset, and a lookout instead of a ring.',
    next: 'Next time on The Tunnels: the build up, a storm over the harbour, and a door that will not open.',
    title: 'East Point',
    blurb: 'At dawn, East Point is full of wallabies and old wartime ruins. Jim’s lookout should be here somewhere, and the map shows where to stand.',
    place: { name: 'East Point Reserve, Darwin', lat: -12.4110, lng: 130.8220 },
    loop: line('tn-amira', 'A loop! Like the bike track round the point.'),
    early: line('tn-amira', 'Stop there, no worries. Watch the wallabies for a while.'),
    open: { scene: 'bush', chapter: 'East Point', text: 'East Point, at dawn. Long grass, monsoon forest, old concrete ruins from the war, and the sea all around. Start with an easy walk or jog.' },
    steps: [
      say('tn-amira', '[whispers] Amira here. Wallabies everywhere. Stay on the path, let them be. They are just having breakfast.'),
      say('tn-ted', 'Ted, ranger. Morning. The wallabies are agile wallabies. Very relaxed. Do not feed them. They have plenty.'),
      quiz('tn-ted', 'East Point has a lake made for swimming. What is it called?', ['Lake Alexander', 'Lake Eyre', 'Lake Darwin'], 'Lake Alexander. Made by people, safe to swim, no stingers.'),
      dash(30, 'Along the coastal path to the lookout! Pick it up for 30 seconds!', { chapter: 'The coast path', fx: 'whoosh', spatial: 'kookaburra' }),
      say(null, 'The path winds between the sea and the forest. Old concrete shapes sit in the grass, left from the war, slowly being taken back by vines.'),
      say('tn-ollie', '[curious] The map says, stand where you can see the white cliffs, and count ten steps to the tree with two trunks.'),
      quiz('tn-amira', 'Remember the numbers 3, 2, 1, 4? What did they add up to?', ['Ten', 'Seven', 'Twenty'], 'Ten. Ten steps! Jim hid the number in the recipe. Clever cook.'),
      choice('tn-amira', 'count', 'There are two trees with two trunks! The one by the cliff, or the one by the path?',
        { label: 'By the cliff', line: 'The cliff tree! Stay back from the edge.', dash: 'To the cliff tree! Pick it up for 30 seconds!', after: 'At the cliff tree, roots grip the rock, and the sea crashes far below. In a hollow, a little metal plate.' },
        { label: 'By the path', line: 'The path tree! Easy to reach.', dash: 'To the path tree! Pick it up for 30 seconds!', after: 'At the path tree, a wallaby hops away. In a hollow between the trunks, a little metal plate.' },
        'Cliff tree, then. Go!'),
      steady('Settle into an easy pace while Ted reads the plate.', { chapter: 'The plate' }),
      say('tn-ted', '[curious] It is a little navy tag. On the back, scratched in. T8 is under the hill, by the wharf. Ask the wet.'),
      say('tn-amira', 'Ask the wet? What does that mean? The wet season? The rain?'),
      quiz('tn-ted', 'In Darwin, roughly when is the wet season?', ['December to March', 'May to September', 'All year'], 'December to March. Big storms, huge rain, and everything turns green.'),
      dash(45, 'Clouds are building over the sea! Pick it up for 45 seconds back along the coast!', { chapter: 'The clouds', fx: 'thunder' }),
      say(null, 'Towering white clouds rise over the sea, taller than mountains. Locals call this time the build up. Hot, sticky, and full of waiting.', { scene: 'stormfront' }),
      steady('Cool down with an easy jog or a walk back to the car park.', { chapter: 'The build up' }),
      quiz('tn-amira', 'Last one. What was Darwin called from 1869 to 1911?', ['Palmerston', 'Port Jackson', 'Garramilla Town'], 'Palmerston. It became Darwin in 1911. There is a new Palmerston now, just down the road.'),
    ],
    finale: 'East Point is searched. Ten steps, a tree with two trunks, and a tag that says ask the wet. Storm coming. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'tunnels-storm',
    episode: 4,
    previously: 'Previously on The Tunnels: wallabies at East Point, ten steps to a tree, and a navy tag that said ask the wet.',
    next: 'Next time on The Tunnels: what is really behind the wall, and a letter for Rose.',
    title: 'The Storm',
    difficulty: 'Push yourself',
    blurb: 'A wet season storm hits Darwin. When the rain pours down the cliff, water shows the outline of an old doorway nobody has seen.',
    place: { name: 'Darwin Waterfront', lat: -12.4685, lng: 130.8475 },
    loop: line('tn-amira', 'A loop! Like rain going round the gutters.'),
    early: line('tn-amira', 'Stop there, all good. Get out of the rain.'),
    open: { scene: 'monsoon', chapter: 'The storm', text: 'Darwin Waterfront, in a monsoon storm. Rain like a waterfall, thunder rattling the windows, and steam rising off the warm footpaths. Start with an easy walk or jog.' },
    steps: [
      say('tn-amira', '[excited] Amira here. Ask the wet! Jim meant it literally. In big rain, water runs down the cliff and shows where the rock was cut.'),
      say('tn-ollie', 'So we go and look at the cliff in a storm? Okay. I brought an umbrella. It is already inside out.'),
      quiz('tn-amira', 'Where can you swim safely at the Waterfront, even in stinger season?', ['The lagoon', 'The open harbour', 'The fountain'], 'The lagoon. It has nets to keep stingers out. There is a wave pool too.'),
      dash(30, 'Under the cliff, along the covered path! Pick it up for 30 seconds!', { chapter: 'The cliff', fx: 'whoosh' }),
      say(null, 'Rainwater pours off the cliff in sheets. In one place, it runs in a straight line, then across, then down again. The shape of a door.', { spatial: 'thunderroll' }),
      say('tn-amira', '[whispers] There. A doorway, filled in long ago. Behind a fence, on the tunnel company’s land. We do not go in. We call the boss.'),
      quiz('tn-amira', 'Puzzle. Tunnels 5 and 6 are open. Tunnel 8 was never finished. Could a short start of a tunnel be behind a filled in door?', ['Yes, it could', 'No, never', 'Only in movies'], 'It could! Diggers often started tunnels and stopped. A few metres of rock, then nothing.'),
      choice('tn-amira', 'call', 'The boss says she will come. Wait by the wharf, or in the café?',
        { label: 'By the wharf', line: 'The wharf! Wet but exciting.', dash: 'To the wharf! Pick it up for 30 seconds!', after: 'On the wharf, lightning flashes over the harbour, and a fishing boat chugs home through the rain, lights blazing.' },
        { label: 'In the café', line: 'The café! Dry and cosy.', dash: 'To the café! Pick it up for 30 seconds!', after: 'In the café, rain hammers the roof. Ollie orders three hot chips and a laksa. In honour of Rose.' },
        'The wharf, then. Go!'),
      steady('Settle into an easy pace while the storm rolls out to sea.', { chapter: 'After the storm' }),
      say('tn-boss', 'Hi. Kath. I look after the tunnels. Amira, we have old plans. There is a short tunnel there that goes nowhere. Just a few metres. Sealed in the 1940s.'),
      say('tn-boss', '[curious] We have to check it for safety anyway. Tomorrow, a crew opens it. Properly. You can watch from outside the fence.'),
      quiz('tn-amira', 'In the 1950s, two tunnels finally held fuel, for a few years. Which kind?', ['Jet fuel', 'Olive oil', 'Lemonade'], 'Jet fuel, in tunnels 5 and 6, for three years. Then they went quiet again.'),
      dash(45, 'The sun is out! Pick it up for 45 seconds along the steaming waterfront!', { chapter: 'Sunshine', fx: 'noirstab' }),
      say(null, 'The clouds break. The sun blazes. The whole city steams like a kettle, and a rainbow drops right into the harbour.'),
      steady('Cool down with an easy jog or a walk past the lagoon.', { scene: 'harbour', chapter: 'Rainbow' }),
      quiz('tn-amira', 'Last one. In which year was the port named Port Darwin?', ['1839', '1939', '1739'], 'In 1839, by the captain of HMS Beagle. Over a hundred years before the tunnels.'),
    ],
    finale: 'The Storm has passed. A doorway shown by the rain, a short sealed tunnel, and a crew to open it tomorrow. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'tunnels-letter',
    episode: 5,
    previously: 'Previously on The Tunnels: a monsoon storm, a doorway drawn by rainwater, and a sealed tunnel opening tomorrow.',
    title: 'Tunnel 8',
    difficulty: 'Push yourself',
    blurb: 'The crew opens the sealed tunnel. Inside is Jim’s secret, and Ollie, June and Amira have to get it somewhere before sunset.',
    place: { name: 'Stokes Hill Wharf, Darwin', lat: -12.4710, lng: 130.8460 },
    loop: line('tn-amira', 'A loop. Back to the tunnels, where it started.'),
    early: line('tn-amira', 'Stop there, all good. Come to the market tonight.'),
    open: { scene: 'harbour', chapter: 'Opening day', text: 'Darwin, a clear morning after the storm. A small crowd behind a safety fence, a crew in hard hats, and a lot of excited whispering. Start with an easy walk or jog.' },
    steps: [
      say('tn-amira', '[whispers] Amira here. The crew is drilling out the old bricks. Ollie is holding June’s hand. June is holding a laksa. Everyone is nervous.'),
      say(null, 'The last brick comes out. The crew shines a torch in. A short tunnel, a few metres long, dry and dusty. On a ledge, a small tin box.', { fx: 'found' }),
      quiz('tn-amira', 'Warm up. How many oil tunnels were finished in the war?', ['Six', 'Eight', 'Eleven'], 'Six finished. And this little one, Jim’s Tunnel 8, just a stub. Until today.'),
      say('tn-boss', 'Kath here. The box is safe to hand out. Ollie. I think this is for your family.'),
      say('tn-ollie', '[curious] It is a letter. To Rose. From Jim. Dated 1945. June, you read it.'),
      say('tn-june', '[sighs] It says, Rose, I dug you a tunnel, since I cannot buy you a ring. When the war ends, meet me at the lookout. Your cook, Jim.'),
      dash(30, 'June needs a moment. Pick it up for 30 seconds along the wharf, gently!', { chapter: 'The wharf', fx: 'whoosh', spatial: 'boat' }),
      say('tn-june', '[laughs] So he never sent it. And she married my grandpa. And Jim married Ollie’s great grandma. Both happy. But oh, Jim.'),
      quiz('tn-june', 'What did Jim give Rose instead of a ring?', ['A lookout', 'A laksa', 'A boat'], 'A lookout! Now we know why. He wanted to meet her there. Grandma Rose laughed about it for sixty years.'),
      choice('tn-amira', 'where', 'June has an idea. Take the letter to East Point at sunset, or read it out at Mindil?',
        { label: 'East Point at sunset', line: 'East Point. Where he wanted to meet her.', dash: 'To East Point! Pick it up for 30 seconds!', after: 'At the lookout, the sun sinks into the sea. June reads the letter aloud, and Ollie puts a frangipani on the tree with two trunks.' },
        { label: 'Read it at Mindil', line: 'Mindil. Rose’s market. Everyone together.', dash: 'To Mindil Beach! Pick it up for 30 seconds!', after: 'At Mindil, June reads the letter by the stall, and a crowd gathers to listen. Everybody claps. Somebody cries. Then everyone orders laksa.' },
        'East Point, then. Go!'),
      steady('Settle into an easy pace as the evening cools.', { chapter: 'Evening' }),
      say('tn-amira', 'The letter goes to the tunnel museum, on loan from both families. Jim’s Tunnel 8 finally made it into the history books.'),
      quiz('tn-amira', 'Tunnel 6, the short one, is how long?', ['77 metres', '7 metres', '777 metres'], 'Seventy seven metres. Jim’s little tunnel is far shorter. But it held the best story.'),
      dash(45, 'The night market lights are on! Pick it up for 45 seconds and celebrate!', { chapter: 'Celebration', fx: 'brassfanfare' }),
      say(null, 'June’s stall is packed. A sign has gone up. Rose and Jim’s Laksa. Three, two, one, four. Ollie is behind the counter, stirring.', { spatial: 'chatter' }),
      steady('Cool down with an easy jog or a walk along the beach.', { scene: 'night', chapter: 'Home' }),
      quiz('tn-june', 'Last one, darling. What is the Larrakia name for this place?', ['Garramilla', 'Palmerston', 'Mindil'], 'Garramilla. White stone. The oldest name, and still the right one.'),
    ],
    finale: 'The Tunnels is complete. A lunch tin, a laksa recipe, a storm and a letter from 1945, home at last. Thanks, Runner.',
  }),
]

export const CHAIN = ['tunnels-tin', 'tunnels-mindil', 'tunnels-eastpoint', 'tunnels-storm', 'tunnels-letter']

export const CAST = {
  'tunnels-narrator': { name: 'Narrator', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 0.95, rate: 0.98 }, // Amelia
  'tn-amira': { name: 'Amira', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.05, rate: 1.04, radio: true }, // Eva, in your earbuds
  'tn-ollie': { name: 'Ollie', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.15, rate: 1.06 }, // Ziggy
  'tn-june': { name: 'June', voiceId: 'Y7xQSS5ZtS4xv4VJotWd', pitch: 0.95, rate: 1.0 }, // Christine
  'tn-ted': { name: 'Ted', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.85, rate: 0.98 }, // Jimbo
  'tn-boss': { name: 'Kath', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 1.0, rate: 1.0, radio: true }, // Julieanne, on the phone
}

export const LOOK = { accent: '#F2C14E', deep: '#1A2A3A', tag: 'Top End mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
