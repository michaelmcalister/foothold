// The Mountains Panther: a five episode open mystery in the Blue
// Mountains. For over a century people have said a big black cat roams the
// ridges between Katoomba and Lithgow. Sunny, who leads a bushwalking club,
// gets fresh footage, and with Gwen, who has collected sightings for
// decades, and Doctor Hart, a vet with a DNA kit, you test the evidence: a
// video, a hair sample, the old war mascot story, a night watch and, at the
// end, what you believe. Nobody is hurt, no animal is chased, and the
// runner stays on marked tracks, well back from cliff edges.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the Blue Mountains panther, also called the Lithgow panther, has
//     been reported for over a century, with over 500 reports in twenty
//     years; a NSW government report in 2008 reportedly found a big cat
//     population "more likely than not", but was said to have been edited
//     before release; theories include cats kept as mascots by US
//     servicemen in World War II, and circus escapes; the Penrith Panther
//     was the subject of a 2024 exhibition at Penrith Regional Gallery
//     (Blue Mountains panther, Wikipedia)
//   - the Blue Mountains: Gundungurra people in the upper mountains, Darug
//     in the lower; the blue tinge comes from light scattering, perhaps
//     helped by eucalyptus oils; World Heritage on 29 November 2000; the
//     Three Sisters near Katoomba; the Scenic Railway drops 415 m with a
//     52 degree maximum gradient; Blaxland, Lawson and Wentworth crossed in
//     1813; the Wollemi pine is a Gondwana relict; the Zig Zag Railway runs
//     near Lithgow (Blue Mountains, Wikipedia)
//
// Real people are only mentioned, never voiced. The footage, the samples
// and everyone with lines are made up. Nobody has proven a big cat lives
// in the mountains, and nobody has proven one does not.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('pn-sunny', '[excited] Like a big cat on the prowl! Ease right back now.'),
  okay: line('pn-sunny', 'You made it, and that is what counts. Ease right back now.'),
  half: line('pn-sunny', 'Halfway! Keep it going!'),
}
const EASY = line('pn-sunny', 'Easy now. The mountains are steep. Save some for the hills.')
const base = { saga: 'panther', guide: 'pn-sunny', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'panther',
  title: 'The Mountains Panther',
  blurb: 'For over a hundred years, people have seen a big black cat in the Blue Mountains. Fresh footage, a DNA kit, and five runs to test it. Then you decide.',
  note: 'Real Blue Mountains places and the true history of the sightings. The footage, the samples and the people are made up. Stay on marked tracks, back from cliff edges.',
  narrator: 'panther-narrator',
  score: 'deepcover',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'panther-footage',
    episode: 1,
    next: 'Next time on The Mountains Panther: the steepest ride into the valley, a tuft of black hair, and a vet with a DNA kit.',
    title: 'The Footage',
    blurb: 'A bushwalker filmed a big black shape crossing a track near Katoomba. Sunny wants a runner to check the spot before the rain washes it clean.',
    place: { name: 'Katoomba, Blue Mountains', lat: -33.7320, lng: 150.3120 },
    loop: line('pn-sunny', 'A loop! Big cats walk loops round their territory. Or so they say.'),
    early: line('pn-sunny', 'Stop there, no worries. Grab a hot chocolate in Katoomba.'),
    open: { scene: 'ranges', chapter: 'Katoomba', text: 'Katoomba, high in the Blue Mountains. Cold air, a blue haze over the valley, and three tall rock towers glowing in the morning sun. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Gundungurra Country, and lower down, Darug Country. People have walked these ridges for many thousands of years.'),
      say('pn-sunny', 'Hi! Sunny here. I lead the Saturday bushwalking club. Last night, one of our walkers sent me a video. You need to see this.'),
      say('pn-sunny', '[whispers] A black shape crosses the track. Long body. Long tail. It looks back, just once, then it is gone into the scrub.'),
      quiz('pn-sunny', 'Warm up. Why are the Blue Mountains blue?', ['Light and haze in the air', 'Blue rocks', 'Blue trees'], 'Light scattering in the air, maybe helped by oils from the gum trees. From far away, everything goes blue.'),
      say('pn-gwen', 'Gwen here. I have collected sightings for thirty years. Big cat, black, long tail. That sounds like a lot of what I hear.'),
      dash(30, 'To the track where it was filmed! Pick it up for 30 seconds!', { chapter: 'The track', fx: 'whoosh' }),
      say(null, 'The track runs along the cliff top, behind a safety fence. Below, the valley is a sea of green. A lyrebird calls, copying everything.', { spatial: 'kookaburra', fx: 'lyrebird' }),
      quiz('pn-gwen', 'How long have people been reporting a big cat in these mountains?', ['Over a century', 'Since last week', 'Only since 2020'], 'Over a hundred years. Hundreds of reports. No one has caught one on film clearly. Yet.'),
      say('pn-sunny', '[curious] Here. This is the spot. The fence post from the video, the rock. Now, how big is that rock? We can work out how big the cat was.'),
      quiz('pn-sunny', 'Puzzle. The rock is one metre long. In the video, the animal is about as long as the rock. How long is the animal?', ['About one metre', 'About ten metres', 'About ten centimetres'], 'About a metre, nose to bottom. Plus the tail. Big for a pet cat. Small for a panther.'),
      choice('pn-sunny', 'way', 'Let’s look for prints. Along the cliff track, or down the old fire trail?',
        { label: 'Along the cliff track', line: 'Cliff track! Stay behind the fence.', dash: 'Along the cliff track! Pick it up for 30 seconds!', after: 'Along the cliff track, the Three Sisters stand tall across the valley, gold in the sun. No prints. Just wallaby poo.' },
        { label: 'The fire trail', line: 'Fire trail! Muddy, perfect for prints.', dash: 'Down the fire trail! Pick it up for 30 seconds!', after: 'Down the fire trail, in the soft mud, a line of round prints. Big. No claw marks. Just like a cat.' },
        'Cliff track, then. Go!'),
      steady('Settle into an easy pace while Gwen looks at Sunny’s photos.', { chapter: 'Prints' }),
      say('pn-gwen', 'Hmm. Big cats hide their claws when they walk, so no claw marks. But so do pet cats. And big feral cats. Size matters.'),
      say('pn-sunny', 'My walkers also found something on a barbed wire fence near the prints. Black hair. A little tuft. We need a vet.'),
      dash(45, 'The rain is coming over the ridge! Pick it up for 45 seconds back to town!', { chapter: 'The rain', fx: 'thunder' }),
      say(null, 'Mist rolls over the cliffs, thick and white. In two minutes, you cannot see the valley at all. The mountains have gone.', { scene: 'rain' }),
      steady('Cool down with an easy jog or a walk into town.', { chapter: 'Into town' }),
      quiz('pn-sunny', 'Last one. The Blue Mountains became World Heritage in which year?', ['2000', '1900', '1813'], 'The year 2000. For its forests, its gum trees, and its very old plants.'),
    ],
    finale: 'The Footage is checked. A one metre cat, round prints, and a tuft of black hair for the vet. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'panther-hair',
    episode: 2,
    previously: 'Previously on The Mountains Panther: a video near Katoomba, round prints in the mud, and a tuft of black hair on a fence.',
    next: 'Next time on The Mountains Panther: Lithgow, an old railway, and a story about cats brought here in the war.',
    title: 'The Hair',
    blurb: 'Doctor Hart, a local vet, can test the black hair for DNA. But first, you take the steepest ride into the valley to look for more.',
    place: { name: 'Jamison Valley, Katoomba', lat: -33.7300, lng: 150.3000 },
    loop: line('pn-sunny', 'A loop! Down into the valley, and back up again.'),
    early: line('pn-sunny', 'Stop there, all good. The valley will keep.'),
    open: { scene: 'bush', chapter: 'The valley', text: 'The floor of the Jamison Valley. Giant tree ferns, mossy rocks, a creek trickling, and cliffs rising far overhead. Start with an easy walk or jog.' },
    steps: [
      say('pn-hart', 'Doctor Hart, vet. I have the hair. It goes to a lab in Sydney. It will take a while. Meanwhile, let us look for more.'),
      quiz('pn-sunny', 'The Scenic Railway brought us down here. How steep is it at its steepest?', ['52 degrees', '5 degrees', '90 degrees'], 'Fifty two degrees. You lean back in your seat, and the valley comes up to meet you.'),
      say(null, 'The rainforest is quiet and green. Water drips from the ferns. Somewhere a whipbird cracks its call, and its mate answers.', { spatial: 'bird' }),
      dash(30, 'Along the valley boardwalk! Pick it up for 30 seconds!', { chapter: 'The boardwalk', fx: 'whoosh' }),
      say('pn-tyler', 'Hi. Tyler. I am fifteen. I have a trail camera down here for a school project. On Tuesday it caught something black. Want to see?'),
      say('pn-sunny', '[curious] A black shape, low down, next to a fern. You can see eyes glowing in the camera light. And a tail.'),
      quiz('pn-hart', 'Puzzle. The fern is about half a metre tall. The animal is half as tall as the fern. How tall is the animal?', ['About 25 centimetres', 'About 2 metres', 'About 1 metre'], 'About twenty five centimetres. Shoulder height of a cat. A normal sized cat.'),
      choice('pn-sunny', 'way', 'Check Tyler’s other camera. Up the creek, or along the old mine track?',
        { label: 'Up the creek', line: 'Creek! Mind the slippery rocks.', dash: 'Up the creek track! Pick it up for 30 seconds!', after: 'Up the creek, water tumbles over rocks into clear pools. The second camera is strapped to a tree, its little light blinking.' },
        { label: 'The old mine track', line: 'Mine track! History everywhere.', dash: 'Along the old mine track! Pick it up for 30 seconds!', after: 'Along the old mine track, rusty rails peek out of the ground, left from when people mined coal here.' },
        'The creek, then. Go!'),
      steady('Settle into an easy pace while Tyler downloads the pictures.', { chapter: 'The pictures' }),
      say('pn-tyler', '[excited] Second camera. Same night. A black cat. With a red collar. It is Mrs Lee’s cat, Shadow. From the café. She lets him out at night.'),
      say('pn-hart', '[laughs] So Tyler’s photo is Shadow. But the hair from the fence was coarser. Thicker. Not a pet cat’s, I think. We wait for the lab.'),
      quiz('pn-hart', 'Why do vets say pet cats should stay in at night?', ['To protect wildlife', 'Cats hate stars', 'To save electricity'], 'To protect the wildlife. Cats hunt small native animals at night. Inside is safer for everyone.'),
      dash(45, 'Last ride up is soon! Pick it up for 45 seconds to the railway!', { chapter: 'The ride up', fx: 'noirstab' }),
      say('pn-gwen', 'Gwen here. While you were down there, I found an old story. A man in Lithgow says his grandad saw soldiers with a black cat. In the war.'),
      steady('Cool down with an easy jog or a walk at the top.', { scene: 'ranges', chapter: 'Up top' }),
      quiz('pn-sunny', 'Last one. How far does the Scenic Railway drop?', ['415 metres', '41 metres', '4,150 metres'], 'Four hundred and fifteen metres. Down through the cliffs, into the valley.'),
    ],
    finale: 'The Hair is at the lab. Shadow the café cat is caught on camera, and Lithgow has a story from the war. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'panther-lithgow',
    episode: 3,
    previously: 'Previously on The Mountains Panther: the Scenic Railway, Shadow the café cat, and hair at the lab.',
    next: 'Next time on The Mountains Panther: a night watch in the Grose Valley, a thermal camera, and eyes in the dark.',
    title: 'The Mascots',
    blurb: 'In Lithgow, an old mechanic tells the story of American soldiers who kept big cats as mascots in the war. Is it true? Or a great yarn?',
    place: { name: 'Lithgow', lat: -33.4820, lng: 150.1570 },
    loop: line('pn-sunny', 'A loop! Like an old zig zag railway. Back and forth, round and up.'),
    early: line('pn-sunny', 'Stop there, all good. Lithgow has great pies.'),
    open: { scene: 'ranges', chapter: 'Lithgow', text: 'Lithgow, on the western edge of the mountains. An old steel and coal town, cold and bright, with steep hills and big skies. Start with an easy walk or jog.' },
    steps: [
      say('pn-ray', 'G’day. Ray. Mechanic, forty years. My grandad said in the war, some Yank soldiers had a black cat as their mascot. A big one. When they left, so did the cat. Into the bush.'),
      quiz('pn-gwen', 'The Blue Mountains panther has another name. What is it?', ['The Lithgow panther', 'The Sydney tiger', 'The Bathurst lion'], 'The Lithgow panther. Lithgow claims it. So does Penrith. Everyone wants a panther.'),
      say('pn-sunny', '[curious] Ray, did your grandad ever see the cat himself?'),
      say('pn-ray', '[laughs] He said he did. He also said he caught a cod as big as a car. So, you know.'),
      dash(30, 'Ray says the old army camp was up the hill! Pick it up for 30 seconds!', { chapter: 'The hill', fx: 'whoosh' }),
      say(null, 'Up the hill, an empty paddock where huts once stood. A few concrete footings in the grass. A magpie on a post, watching you.', { spatial: 'magpie' }),
      quiz('pn-sunny', 'One theory is that big cats came from soldiers’ mascots. What is another?', ['Circus escapes', 'They swam here', 'Dropped by planes'], 'Escapes from travelling circuses. There are rumours of both. Proof of neither.'),
      say('pn-gwen', 'Here is the honest bit. These stories are fun. But a story is not evidence. We need something we can test.'),
      choice('pn-sunny', 'way', 'Back to town. Past the old railway, or along the creek?',
        { label: 'Past the old railway', line: 'The railway! Old engines and old stories.', dash: 'Past the old railway! Pick it up for 30 seconds!', after: 'Past the railway, an old steam engine sits on display, black and shiny. A kid sits on the step pretending to drive.' },
        { label: 'Along the creek', line: 'Creek! Ducks and willows.', dash: 'Along the creek! Pick it up for 30 seconds!', after: 'Along the creek, willows trail in the water, and a family of ducks paddles off in a neat line.' },
        'The railway, then. Go!'),
      steady('Settle into an easy pace while Doctor Hart calls with news.', { chapter: 'News' }),
      say('pn-hart', 'Doctor Hart. The lab says the hair is cat. Definitely cat. But they need more time to say which kind of cat. Big, small, feral. Patience.'),
      quiz('pn-hart', 'In 2008, a NSW government report looked at big cat sightings. What did it reportedly say?', ['More likely than not', 'Definitely not', 'Definitely yes'], 'More likely than not, reportedly. Then people said the report was changed before it came out. The argument goes on.'),
      say('pn-tyler', 'Tyler here. My uncle has a thermal camera. It sees heat in the dark. He says we can borrow it for one night. In the Grose Valley.'),
      dash(45, 'The pie shop is closing! Pick it up for 45 seconds for the last pies!', { chapter: 'Pies', fx: 'noirstab' }),
      steady('Cool down with an easy jog or a walk, pie in hand.', { chapter: 'Pie' }),
      quiz('pn-sunny', 'Last one. Which three explorers crossed the Blue Mountains in 1813?', ['Blaxland, Lawson, Wentworth', 'Burke, Wills, King', 'Cook, Banks, Bligh'], 'Blaxland, Lawson and Wentworth. Though Aboriginal people had known the way across for thousands of years.'),
    ],
    finale: 'The Mascots are checked. A great yarn from Ray’s grandad, hair that is definitely cat, and a thermal camera for one night. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'panther-night',
    episode: 4,
    previously: 'Previously on The Mountains Panther: Ray’s grandad’s war story, hair that is definitely cat, and a thermal camera for one night.',
    next: 'Next time on The Mountains Panther: the lab result, everyone together, and you decide what is out there.',
    title: 'The Night Watch',
    difficulty: 'Push yourself',
    blurb: 'One night with a thermal camera above the Grose Valley. Everything warm glows white in the dark. Something big is moving.',
    place: { name: 'Grose Valley, Blackheath', lat: -33.6330, lng: 150.3100 },
    loop: line('pn-sunny', 'A loop! Like a night patrol. Round the camp, quietly.'),
    early: line('pn-sunny', 'Stop there, all good. Hot drinks in the car.'),
    open: { scene: 'night', chapter: 'Nightfall', text: 'A lookout above the Grose Valley at nightfall. Cliffs drop into blackness. Stars burn overhead. Everyone whispers. Start with an easy walk or jog.' },
    steps: [
      say('pn-sunny', '[whispers] Sunny here. Thermal camera on. Anything warm shows up white. Trees are dark. Animals glow. We stay on the track. We watch. That is all.'),
      say('pn-tyler', '[whispers] White dot. Moving. Hopping. A wallaby. Another one. And a possum up a tree, looking at us.'),
      quiz('pn-sunny', 'A thermal camera sees what?', ['Heat', 'Sound', 'Smells'], 'Heat. Warm bodies glow in the dark, even through thin leaves.'),
      dash(30, 'Something is moving on the far track! Pick it up for 30 seconds along the cliff path, quietly!', { chapter: 'The far track', fx: 'whoosh', spatial: 'owl' }),
      say(null, 'On the screen, a long white shape slinks along the far ridge. Low. Slow. A long tail behind it. Everyone stops breathing.', { fx: 'heartbeat' }),
      say('pn-gwen', '[whispers] Thirty years. Thirty years I have waited to see that. Tyler, are you recording?'),
      quiz('pn-hart', 'Puzzle. On the screen the animal crosses the gap between two trees, five metres apart, in one second. How fast?', ['5 metres a second', '50 metres a second', '1 metre a second'], 'Five metres a second. Quick, but a fox can do that. So can a big feral cat.'),
      choice('pn-sunny', 'follow', 'Do we follow, carefully, on the track? Or stay still and let it come?',
        { label: 'Follow on the track', line: 'Follow. Slowly. On the track. No closer than the camera needs.', dash: 'Along the track, quietly! Pick it up for 30 seconds!', after: 'Along the track, the shape stops on a rock, turns, and its eyes flash in the camera. Then it slips over the ridge and is gone.' },
        { label: 'Stay still', line: 'Still. Good trackers wait.', dash: 'Back to the lookout, softly! Pick it up for 30 seconds!', after: 'From the lookout, the shape crosses the open rock, close enough to see clearly on screen. It turns, eyes flashing. Then it is gone.' },
        'Follow, then. Carefully. Go!'),
      steady('Settle into a slow, quiet pace while everyone replays the footage.', { chapter: 'The footage' }),
      say('pn-hart', '[curious] Look at the head. Small and round. The ears pointed. The tail is long, but thin. It is big for a cat. But I think it is a feral cat. A very large one.'),
      say('pn-gwen', '[sighs] Maybe. Or maybe it is a young one of something bigger. We cannot tell from heat alone.'),
      quiz('pn-sunny', 'About how many big cat reports were made in twenty years?', ['Over 500', 'About 5', 'About 50,000'], 'Over five hundred. Some are cats, some are dogs, some are shadows. Some, nobody knows.'),
      dash(45, 'Fog is rolling in! Pick it up for 45 seconds back to the cars!', { chapter: 'The fog', fx: 'noirstab' }),
      say(null, 'Fog pours over the cliff edge like milk. The stars vanish. The thermal camera shows only one thing now: five warm people, grinning.'),
      steady('Cool down with an easy jog or a walk to the cars.', { scene: 'rain', chapter: 'Home' }),
      quiz('pn-hart', 'Last one. Which ancient tree, a relic from Gondwana, grows in a park near here?', ['The Wollemi pine', 'The palm tree', 'The oak'], 'The Wollemi pine. A tree from the age of dinosaurs, hiding in a gorge. The mountains keep surprises.'),
    ],
    finale: 'The Night Watch is over. A long white shape on a cliff, a very big feral cat or something more, and a lab result coming. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'panther-verdict',
    episode: 5,
    previously: 'Previously on The Mountains Panther: a night watch, a long white shape on the thermal camera, and a lab result on its way.',
    title: 'Your Verdict',
    difficulty: 'Push yourself',
    blurb: 'The lab result is in. Everyone meets at the Three Sisters. The evidence is laid out, and then you decide what roams the mountains.',
    place: { name: 'Three Sisters, Katoomba', lat: -33.7320, lng: 150.3120 },
    loop: line('pn-sunny', 'A loop. Back to Katoomba, where it started.'),
    early: line('pn-sunny', 'Stop there, all good. The Sisters will be here tomorrow.'),
    open: { scene: 'ranges', chapter: 'The Sisters', text: 'The lookout by the Three Sisters, at sunset. The rock towers glow orange. The valley below is filling with blue shadow. Start with an easy walk or jog.' },
    steps: [
      say('pn-sunny', 'Sunny here. Everyone is here. Gwen, Doctor Hart, Tyler, Ray. And Mrs Lee from the café, with Shadow on a lead. Shadow is not impressed.'),
      say('pn-hart', '[curious] The lab result. The hair is from a domestic cat. A feral one. A very big one, by the thickness. Not a panther.'),
      quiz('pn-hart', 'Warm up. The hair from the fence came from what?', ['A big feral cat', 'A panther', 'A wallaby'], 'A big feral cat. Real, wild, and very large. But a cat.'),
      say('pn-gwen', '[sighs] One hair. One cat. It does not explain a hundred years of reports. It explains one fence.'),
      dash(30, 'Ray says look at the far cliff! Pick it up for 30 seconds along the lookout path!', { chapter: 'The far cliff', fx: 'whoosh', spatial: 'lorikeets' }),
      say(null, 'Everyone looks. On the far cliff, a dark shape sits on a ledge in the last light. Then a cloud covers the sun, and it is just a shadow on a rock.'),
      quiz('pn-sunny', 'Which of these is NOT one of the big cat theories?', ['Escaped from a zoo in space', 'War mascots', 'Circus escapes'], 'A zoo in space. Sadly. The real theories are mascots, circuses, black market pets, or nothing at all.'),
      say('pn-tyler', 'So. Runner. You saw the footage, the hair, the night watch. What do you reckon is out there?'),
      choice('pn-sunny', 'verdict', 'Your verdict, Runner. There is no wrong answer.',
        { label: 'A real big cat', flag: 'cat', line: 'A real big cat. Gwen is cheering.', dash: 'For the panther! Pick it up for 30 seconds round the lookout!', after: 'Around the lookout, you imagine a black cat padding through the gullies, unseen for a hundred years. Gwen hands you her notebook. Write it down.' },
        { label: 'Big ferals and tall tales', flag: 'feral', line: 'Big ferals and tall tales. Doctor Hart nods.', dash: 'For the evidence! Pick it up for 30 seconds round the lookout!', after: 'Around the lookout, you think of big ferals, black dogs, shadows and stories that grow. Doctor Hart shakes your hand. Good science.' },
        'A real big cat, then. Go!'),
      steady('Settle into an easy pace as the sun sets.', { chapter: 'Sunset' }),
      say('pn-sunny', 'Whatever you chose, here is the truth. Nobody has proven a panther lives here. Nobody has proven one does not. So we keep watching, kindly.'),
      quiz('pn-gwen', 'What can every one of us do to help the bush, whatever is out there?', ['Keep pet cats inside', 'Feed wild animals', 'Leave rubbish out'], 'Keep pet cats inside, especially at night. Big or small, cats and wildlife do not mix.'),
      say('pn-ray', '[laughs] I am telling my grandkids I was on the night watch. And the cat was as big as a car.'),
      dash(45, 'Last light! Pick it up for 45 seconds along the cliff walk!', { chapter: 'Last light', fx: 'whistle' }),
      say(null, 'The Three Sisters go from gold to purple to grey. The first stars come out. Shadow the cat yawns. Somewhere in the valley, something moves. Or nothing does.'),
      steady('Cool down with an easy jog or a walk back into town.', { scene: 'night', chapter: 'Home' }),
      quiz('pn-sunny', 'Last one, Runner. Whose Country are the upper Blue Mountains?', ['Gundungurra', 'Wiradjuri', 'Kaurna'], 'Gundungurra Country, with Darug Country lower down. The oldest stories here are theirs.'),
    ],
    finale: 'The Mountains Panther is complete. One big feral cat, a hundred years of stories, and a verdict that is all yours. Keep watching, Runner. Thank you.',
  }),
]

export const CHAIN = ['panther-footage', 'panther-hair', 'panther-lithgow', 'panther-night', 'panther-verdict']

export const CAST = {
  'panther-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.86, rate: 0.97 }, // Peter Michael
  'pn-sunny': { name: 'Sunny', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.1, rate: 1.05, radio: true }, // Milly, in your earbuds
  'pn-gwen': { name: 'Gwen', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.92, rate: 0.98 }, // Julieanne
  'pn-hart': { name: 'Doctor Hart', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 0.95, rate: 1.0, radio: true }, // Simon, on the phone
  'pn-tyler': { name: 'Tyler', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.15, rate: 1.06 }, // Ziggy
  'pn-ray': { name: 'Ray', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.96 }, // Jimbo
}

export const LOOK = { accent: '#7EC8FF', deep: '#05070F', tag: 'Open mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
