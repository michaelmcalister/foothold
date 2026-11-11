// The Last Tiger: a five episode mystery in Hobart. Kirra, a young wildlife
// researcher who runs camera traps, gets a blurry photo of a striped animal
// from an unknown sender. You follow the trail from Salamanca to the Queen's
// Domain, where the last known thylacine lived, up the slopes of kunanyi,
// along the Derwent and past the old brewery, and at the end you choose
// what you believe. Every lead turns out kind: a dog in a striped coat, a
// quoll, an old keeper's diary, and a town that cares about its animals.
// Nobody is hurt, no animal is chased, and the runner stays on paths.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the last known thylacine lived at the zoo on the Queen's Domain in
//     Hobart until 7 September 1936; official protection began on 10 July
//     1936; Threatened Species Day is held on 7 September each year since
//     1996 (Thylacine; Beaumaris Zoo, Wikipedia)
//   - Beaumaris Zoo opened in 1895 at Mary Roberts' home and moved to the
//     Queen's Domain in 1923; it closed in 1937 (Beaumaris Zoo, Wikipedia)
//   - a government bounty ran from 1888 to 1909, with over 2,200 paid;
//     the IUCN listed the thylacine as extinct in 1982, Tasmania in 1986;
//     15 to 20 stripes; both sexes had a pouch; it is on Tasmania's coat
//     of arms; unconfirmed sightings are still reported (Thylacine)
//   - Hobart: settled at Risdon Cove in 1803, moved to Sullivans Cove in
//     1804; the second oldest capital; kunanyi / Mount Wellington is
//     1,271 m; Cascade Brewery, 1824, the longest operating; MONA opened in
//     2011; the Muwinina people call the area nipaluna (Hobart, Wikipedia)
//
// Real people are only mentioned, never voiced. The sightings, the photo
// and everyone with lines are made up. Whether any tigers are left is an
// open question; the story never pretends otherwise.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('tg-kirra', '[excited] Quick as a quoll! Ease right back now.'),
  okay: line('tg-kirra', 'You got there, and that is what counts. Ease right back now.'),
  half: line('tg-kirra', 'Halfway! Keep it going!'),
}
const EASY = line('tg-kirra', 'Easy now. Good trackers move slow and quiet.')
const base = { saga: 'tiger', guide: 'tg-kirra', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'tiger',
  title: 'The Last Tiger',
  blurb: 'A blurry photo of a striped animal lands in a Hobart researcher’s inbox. Five runs, five leads, and at the end you decide what you believe.',
  note: 'Real Hobart places and true thylacine history. The photo, the sightings and the people are made up. Never chase or feed wildlife.',
  narrator: 'tiger-narrator',
  score: 'deepcover',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'tiger-photo',
    episode: 1,
    next: 'Next time on The Last Tiger: a footprint on the slopes of kunanyi, and a plaster cast that changes everything. Or nothing.',
    title: 'The Photo',
    blurb: 'A blurry photo of a striped animal, sent from nobody. Kirra needs a runner to follow it from Salamanca to the old zoo on the Domain.',
    place: { name: 'Salamanca Place, Hobart', lat: -42.8869, lng: 147.3330 },
    loop: line('tg-kirra', 'A loop! Like a tiger’s territory. Round and round the same patch.'),
    early: line('tg-kirra', 'Stop there, no worries. The photo is not going anywhere.'),
    open: { scene: 'harbour', chapter: 'Salamanca', text: 'Hobart, early on a cold Saturday. Old Georgian warehouses line Salamanca Place, and stallholders set up under a grey sky. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is nipaluna, the Muwinina name for this place. The city was settled in 1804, and the mountain behind it watches over everything.'),
      say('tg-kirra', '[curious] Hi. Kirra here. I study wildlife with hidden cameras. At three this morning someone emailed me a photo. No name. Just a photo.'),
      say('tg-kirra', '[whispers] It is blurry. Long body. Stiff tail. And stripes across the back. I have never seen anything like it. Well. Not alive.'),
      quiz('tg-kirra', 'Hobart is old. Which Australian capital is older?', ['Sydney', 'Melbourne', 'Perth'], 'Hobart is the second oldest capital in the country. Only Sydney beats it.'),
      say('tg-maggie', 'Maggie, from the jam stall. You want the tiger? Half the market has an uncle who saw one. The other half has a photo. All blurry.'),
      say('tg-maggie', '[mischievously] But I will tell you this. The man who printed that photo bought my plum jam. Then he headed for the Domain.'),
      dash(30, 'To the Domain! Pick it up for 30 seconds!', { chapter: 'The Domain', fx: 'whoosh' }),
      say(null, 'The Queen’s Domain. A big green hill of bush and grass above the river. In an old quarry here, there was once a small zoo.', { scene: 'bush', spatial: 'magpie' }),
      quiz('tg-kirra', 'The last known thylacine lived at the zoo here. Until which year?', ['1936', '1986', '1906'], 'September 1936. Since 1996, the seventh of September has been Threatened Species Day.'),
      say('tg-kirra', '[sighs] Protection for the tiger came in July 1936. Only weeks before the last known one was gone. Too late, by a whisker.'),
      choice('tg-kirra', 'way', 'The print shop man walked his dog up here. Up the hill track, or round by the old quarry?',
        { label: 'Up the hill track', line: 'Hill track! Big views of the river.', dash: 'Up the hill track! Pick it up for 30 seconds!', after: 'Up the hill track, the Derwent opens out below, wide and silver, with the bridge stretched across it.' },
        { label: 'Round by the quarry', line: 'The quarry. Where the zoo once stood.', dash: 'Round by the quarry! Pick it up for 30 seconds!', after: 'Round by the old quarry, there is not much left. A few walls. A plaque. And a lot of quiet.' },
        'Hill track, then. Go!'),
      steady('Settle into an easy pace along the Domain paths while Kirra zooms in on the photo.', { chapter: 'The photo' }),
      quiz('tg-kirra', 'Look at the photo with me. Thylacines had how many stripes on their back?', ['15 to 20', '3 or 4', 'Over 100'], 'Between fifteen and twenty dark stripes. This animal has, let me count, about twelve. Hmm.'),
      say(null, 'Near the top of the hill, a man in a beanie is walking a long, lean dog. The dog is wearing a knitted coat. With stripes.', { spatial: 'dog' }),
      say('tg-bob', '[laughs] G’day! Bob. This is Duchess. My wife knits her coats. She looks like a tiger in this one, eh? I sent that photo as a joke. Sorry, love.'),
      say('tg-kirra', '[sighs] A greyhound. In a jumper. Okay. Okay. That is fair. That is very funny, Bob.'),
      dash(45, 'Bob says there is something else. Something he did not send. Pick it up for 45 seconds back down the hill!', { chapter: 'Something else', fx: 'noirstab' }),
      say('tg-bob', '[curious] My mate is a bushwalker. Up on the mountain last week, he found a footprint. Five toes up front. He made a plaster cast. He is too shy to email.'),
      steady('Cool down with an easy jog or a walk back down to the water.', { scene: 'harbour', chapter: 'The river' }),
      quiz('tg-kirra', 'Last one. Which animal is on Tasmania’s coat of arms?', ['The thylacine', 'The platypus', 'The wombat'], 'Two tigers hold up the shield. Even the coat of arms has not given up on them.'),
    ],
    finale: 'The Photo is solved. One greyhound in a stripy jumper. But a footprint on the mountain is waiting. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'tiger-footprint',
    episode: 2,
    previously: 'Previously on The Last Tiger: a blurry photo, a greyhound in a stripy jumper, and a footprint up on the mountain.',
    next: 'Next time on The Last Tiger: a keeper’s diary from 1936, found in a Battery Point cottage, and a drawing nobody has seen.',
    title: 'The Footprint',
    blurb: 'A bushwalker found a footprint on the lower slopes of kunanyi and made a plaster cast. Kirra needs it checked before the rain comes.',
    place: { name: 'kunanyi / Mount Wellington foothills', lat: -42.8960, lng: 147.2600 },
    loop: line('tg-kirra', 'A loop! The way animals walk their trails, again and again.'),
    early: line('tg-kirra', 'Stop there, all good. The mountain will be here tomorrow.'),
    open: { scene: 'bush', chapter: 'The foothills', text: 'The lower slopes of kunanyi, Mount Wellington. Tall gums, tree ferns, and a cold breeze sliding down from the summit. Start with an easy walk or jog.' },
    steps: [
      say('tg-kirra', 'Kirra here. Bob’s mate is called Hamish. He is shy, but he said yes. He will meet us at the fire trail with the plaster cast.'),
      quiz('tg-kirra', 'Warm up question. How high is kunanyi, Mount Wellington?', ['1,271 metres', '271 metres', '4,000 metres'], 'It often has snow on top, even when the city is sunny. Bring a jumper. Not a stripy one.'),
      say(null, 'The track climbs gently through stringybark and tree ferns. Water trickles somewhere close. A currawong calls, loud and clear.', { spatial: 'bird' }),
      say('tg-hamish', '[whispers] Hi. Hamish. Here it is. Five toes on the front foot. Four on the back. And a big pad in the middle.'),
      quiz('tg-kirra', 'Thylacines had a pouch, like a kangaroo. Which thylacines had one?', ['Both males and females', 'Only females', 'Only babies'], 'Both. Mums carried their young in it, and the males had one too. Unusual, even for marsupials.'),
      dash(30, 'Hamish found it near the creek crossing. Pick it up for 30 seconds!', { chapter: 'The creek', fx: 'whoosh' }),
      say(null, 'At the creek, the mud is soft and full of prints. Wallaby. Possum. Something with small round toes.'),
      say('tg-kirra', '[curious] Hmm. Hamish, look. The cast. The toes are close together. Little claws. This is not a tiger. I think this is a quoll. A spotted tail quoll.'),
      quiz('tg-kirra', 'Puzzle time. A tiger print was about as big as a big dog’s. This cast is smaller than a matchbox, with tiny claws. Which is it?', ['A quoll', 'A tiger', 'A wombat'], 'Small, neat, little claws. A quoll. Still a beauty. And quolls need protecting too.'),
      choice('tg-kirra', 'path', 'Let’s check the camera trap I set up last month. Uphill by the fire trail, or along the creek?',
        { label: 'The fire trail', line: 'Fire trail! Steady climb.', dash: 'Up the fire trail! Pick it up for 30 seconds!', after: 'Up the fire trail, the city drops away below, and the river shines all the way to the sea.' },
        { label: 'Along the creek', line: 'Creek! Watch your footing.', dash: 'Along the creek path! Pick it up for 30 seconds!', after: 'Along the creek, ferns brush your arms, and the water chatters over rocks the colour of rust.' },
        'Fire trail, then. Go!'),
      steady('Settle into an easy pace while Kirra opens up the camera trap and scrolls through the pictures.', { chapter: 'The camera trap' }),
      say('tg-kirra', '[excited] Night shots. Wallaby. Possum. Possum. Wallaby. And then. A quoll! White spots, a long tail. Right on the creek bank. Beautiful.'),
      say('tg-hamish', '[laughs] So I found a quoll print. Well, that is still a good day.'),
      quiz('tg-kirra', 'From 1888 to 1909, the government paid people a bounty for tigers. About how many bounties were paid?', ['Over 2,200', 'About 20', 'About 200,000'], 'Over two thousand. It is a big reason they became so rare.'),
      dash(45, 'Rain is rolling down the mountain! Pick it up for 45 seconds back to the road!', { chapter: 'The rain', fx: 'thunder' }),
      say(null, 'The rain arrives in a grey wall. You make it under the shelter just in time, and Hamish shares a thermos of hot chocolate.', { scene: 'rain' }),
      say('tg-hamish', '[curious] There is one more thing. My nan grew up in Battery Point. She always said her grandad worked at the old zoo. There is a box of his things.'),
      steady('Cool down with an easy jog or a walk while the rain eases.', { chapter: 'After the rain' }),
      quiz('tg-kirra', 'Last one. When did the world officially list the thylacine as extinct?', ['1982', '1936', '2020'], 'In 1982. Tasmania followed in 1986. People are still out looking, though.'),
    ],
    finale: 'The Footprint is solved. A spotted tail quoll, a happy bushwalker, and a box of old zoo things waiting in Battery Point. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'tiger-diary',
    episode: 3,
    previously: 'Previously on The Last Tiger: a footprint that was a quoll, a camera trap full of night visitors, and a box from the old zoo.',
    next: 'Next time on The Last Tiger: stripes on a camera by the old brewery, and a night watch by the rivulet.',
    title: 'The Keeper’s Diary',
    blurb: 'Hamish’s nan has a box that belonged to a keeper at the old Hobart zoo. Inside is a diary, and a drawing nobody has seen.',
    place: { name: 'Battery Point, Hobart', lat: -42.8925, lng: 147.3335 },
    loop: line('tg-kirra', 'A loop! Like a keeper doing the rounds. Every enclosure, every morning.'),
    early: line('tg-kirra', 'Stop there, all good. Nan has put the kettle on anyway.'),
    open: { scene: 'harbour', chapter: 'Battery Point', text: 'Battery Point, Hobart. Narrow lanes, little weatherboard cottages, and a view of the boats bobbing on the Derwent. Start with an easy walk or jog.' },
    steps: [
      say('tg-kirra', 'Kirra here. Hamish’s nan is called Elsie. She is ninety. She has a box and a lot of opinions. We are on our way.', { spatial: 'boat' }),
      say('tg-elsie', '[laughs] Come in, come in. Mind the cat. My grandad was a keeper at the zoo on the Domain. He fed the animals every morning.'),
      quiz('tg-elsie', 'The zoo moved to the Domain in 1923. But it began earlier, at a lady’s home. In which year?', ['1895', '1795', '1995'], 'Mary Roberts started it in her own garden in 1895. Imagine your neighbours.'),
      say('tg-elsie', 'Here is his diary. Mostly weather and food. But read the page from July 1936.'),
      say('tg-kirra', '[whispers] It says, the tiger paces at dusk. I sketched him today. They say the law will protect them now. I hope it is not too late.'),
      dash(30, 'Elsie says the sketch is pinned in the shed! Pick it up for 30 seconds down the lane!', { chapter: 'The shed', fx: 'whoosh' }),
      say(null, 'At the end of the lane, an old shed leans against a fence. Inside, under dust, a pencil drawing in a frame. A tiger, mouth open in a yawn.', { fx: 'found' }),
      quiz('tg-kirra', 'Look at the yawn in the drawing. People say a thylacine could open its jaws how wide?', ['Very wide indeed', 'Not at all', 'Only a little'], 'Some say up to eighty degrees. Scientists still argue about the exact number, but it was very wide.'),
      say('tg-kirra', '[curious] Elsie, this is wonderful. The museum would love to see this. If you want to share it.'),
      choice('tg-kirra', 'route', 'Let’s show the museum people! Along the waterfront, or up through the lanes?',
        { label: 'Along the waterfront', line: 'Waterfront! Boats and seagulls.', dash: 'Along the waterfront! Pick it up for 30 seconds!', after: 'Along the waterfront, fishing boats unload their catch and the smell of hot chips drifts from a floating kiosk.' },
        { label: 'Up through the lanes', line: 'The lanes! Little cottages, big hills.', dash: 'Up through the lanes! Pick it up for 30 seconds!', after: 'Up through the lanes, past cottages with roses at the gate and a cat watching from every window.' },
        'Waterfront, then. Go!'),
      steady('Settle into an easy pace while Kirra rings a curator she knows.', { chapter: 'To the museum' }),
      say('tg-curator', 'Hello, this is Priya, from the museum. A keeper’s sketch, from 1936? Bring it in. Carefully. Please. Very carefully.'),
      quiz('tg-kirra', 'Puzzle. The keeper wrote that the law would protect them now. Protection came in July 1936. The last known tiger was gone in September. How many months apart?', ['About two', 'About ten', 'About twenty'], 'About two months. That is what the keeper meant by too late.'),
      say('tg-elsie', '[sighs] Grandad never talked about it much. He loved those animals. He would be glad they are remembered.'),
      dash(45, 'The museum closes soon! Pick it up for 45 seconds and get Elsie’s sketch there safely!', { chapter: 'The museum', fx: 'noirstab' }),
      say(null, 'In a quiet room, Priya lays the sketch on a clean white table. She smiles. Then she calls her whole team in to see.', { fx: 'found' }),
      say('tg-curator', 'Kirra, one more thing. We have had a call. Someone has a camera by the Hobart Rivulet. They say it caught stripes last night.'),
      steady('Cool down with an easy jog or a walk back towards the water.', { chapter: 'Evening' }),
      quiz('tg-kirra', 'Last one. Which Hobart brewery, beside the rivulet, has run since 1824?', ['Cascade', 'Salamanca', 'Derwent'], 'The longest running brewery in Australia. And next to it, maybe, some stripes.'),
    ],
    finale: 'The Keeper’s Diary is found. A sketch from 1936 safe at the museum, a grandad remembered, and stripes on a camera by the rivulet. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'tiger-rivulet',
    episode: 4,
    previously: 'Previously on The Last Tiger: a keeper’s diary, a sketch from 1936, and a camera by the rivulet that caught stripes.',
    next: 'Next time on The Last Tiger: everything comes together on the Domain, on the seventh of September. And you decide what you believe.',
    title: 'The Rivulet Watch',
    difficulty: 'Push yourself',
    blurb: 'A camera trap by the Hobart Rivulet caught stripes in the night. Kirra plans a dusk watch, from the old brewery to the city.',
    place: { name: 'Hobart Rivulet, South Hobart', lat: -42.8960, lng: 147.3080 },
    loop: line('tg-kirra', 'A loop! Like a night watch. Out, around, and back.'),
    early: line('tg-kirra', 'Stop there, no stress. I will send you the photos.'),
    open: { scene: 'night', chapter: 'The rivulet', text: 'The Hobart Rivulet at dusk. A little creek winds through bush and backyards, past an old stone brewery glowing in the last of the light. Start with an easy walk or jog.' },
    steps: [
      say('tg-kirra', '[whispers] Kirra here. Quiet voices tonight. The camera belongs to a girl called Zoe. She is twelve. She is very serious about it.'),
      say('tg-zoe', 'Hi. Zoe. Two nights ago my camera caught this. Stripes. On the back half of something. I have watched it two hundred times.'),
      quiz('tg-kirra', 'Warm up, quietly. Thylacines hunted mostly at what time?', ['At dusk and night', 'At midday', 'Only in winter'], 'At night and dusk, like most Tasmanian animals. So, right about now.'),
      dash(30, 'Zoe heard rustling downstream! Pick it up for 30 seconds along the path, quietly!', { chapter: 'Downstream', fx: 'whoosh' }),
      say(null, 'The path follows the water under tall gums. A pademelon thumps away into the ferns. An owl calls once from somewhere above.', { spatial: 'owl' }),
      say('tg-zoe', '[curious] My camera is just there, strapped to the gum. I put a new card in. Should we look?'),
      quiz('tg-zoe', 'Puzzle. The camera takes a photo every time something moves. Four photos a night, for two nights. How many photos?', ['Eight', 'Six', 'Sixteen'], 'Eight. And one of them is the stripy one.'),
      choice('tg-kirra', 'watch', 'Two places to watch from. The old bridge, or the bank by the brewery?',
        { label: 'The old bridge', line: 'The bridge. High and quiet.', dash: 'To the bridge! Pick it up for 30 seconds, softly!', after: 'From the bridge, you look down on the dark water. Something moves on the far bank, low and slow.' },
        { label: 'By the brewery', line: 'The brewery bank. Behind the stone wall.', dash: 'To the brewery bank! Pick it up for 30 seconds, softly!', after: 'Behind the stone wall of the brewery, you crouch and wait. Something moves along the water, low and slow.' },
        'The bridge, then. Go!'),
      steady('Settle into a slow, quiet pace while you all watch the far bank.', { chapter: 'The watch' }),
      say(null, 'It steps into the light. A small, dark, stocky animal with white blazes. It sniffs the air, gives a hoarse little cough, and trundles off.', { fx: 'found' }),
      say('tg-zoe', '[excited] A devil! A Tasmanian devil! In the city! The white marks made stripes in the photo. Oh, it is so cute.'),
      quiz('tg-kirra', 'Tasmanian devils are now the biggest of which kind of animal?', ['Meat eating marsupials', 'Birds', 'Fish'], 'With the tiger gone, the devil is the largest meat eating marsupial left. They need our help too.'),
      say('tg-kirra', '[sighs] Not a tiger. But Zoe, this is huge. Devils are rare. Your camera just helped them. That matters.'),
      dash(45, 'Let’s get Zoe’s card to my office before midnight! Pick it up for 45 seconds!', { chapter: 'Midnight', fx: 'noirstab' }),
      say('tg-zoe', 'Kirra. Next Saturday is the seventh of September. Threatened Species Day. Can we show everything there? The photo, the quoll, the sketch, the devil?'),
      steady('Cool down with an easy jog or a walk back past the brewery.', { scene: 'night', chapter: 'Home' }),
      quiz('tg-kirra', 'Last one. Hobart’s big new art museum, MONA, opened in which year?', ['2011', '1911', '1999'], 'And it says something about Hobart. A city that loves old things and new ideas.'),
    ],
    finale: 'The Rivulet Watch is done. A Tasmanian devil in the city, a twelve year old scientist, and a big day coming on the Domain. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'tiger-domain',
    episode: 5,
    previously: 'Previously on The Last Tiger: a devil by the rivulet, a twelve year old scientist, and a plan for Threatened Species Day.',
    title: 'The Seventh of September',
    difficulty: 'Push yourself',
    blurb: 'Threatened Species Day on the Domain. Everyone from the series gathers, a final mystery photo arrives, and you choose what you believe.',
    place: { name: 'Queen’s Domain, Hobart', lat: -42.8730, lng: 147.3310 },
    loop: line('tg-kirra', 'A loop. Full circle. Back where it all began.'),
    early: line('tg-kirra', 'Stop there, all good. The stalls are open all day.'),
    open: { scene: 'bush', chapter: 'The Domain', text: 'The Queen’s Domain, on the seventh of September. Stalls, school groups, a stage, and the smell of sausages and wattle. Start with an easy walk or jog.' },
    steps: [
      say('tg-kirra', '[excited] Kirra here! Look at this. Bob and Duchess. Hamish. Elsie and the sketch. Zoe and her camera. Maggie and her jam. Everyone came.'),
      say('tg-maggie', '[laughs] Plum jam for every runner. And for the dog in the jumper.'),
      quiz('tg-kirra', 'Warm up. Threatened Species Day has been held on this date since which year?', ['1996', '1936', '2016'], 'Since 1996, on the day the last known tiger was lost.'),
      say(null, 'On the stage, Zoe shows her devil photo to a crowd. Kids cheer. Elsie’s sketch sits in a glass frame, borrowed from the museum for the day.', { spatial: 'chatter' }),
      dash(30, 'Bob’s calling from the hill. He says, come and look! Pick it up for 30 seconds!', { chapter: 'The hill', fx: 'whoosh' }),
      say('tg-bob', '[curious] An email. Just now. To Kirra and me. Another photo. Taken last week, deep in the south west. No name again.'),
      say('tg-kirra', '[whispers] It is blurry. Long body. Stiff tail. Stripes. And no jumper. I cannot tell what it is. Nobody can, from this.'),
      quiz('tg-kirra', 'How many unconfirmed tiger sightings did Tasmania record from 2016 to 2019?', ['Eight', 'None', 'Eight hundred'], 'Eight. None proven. But people keep looking, and keep hoping.'),
      say('tg-hamish', 'So. Runner. You have seen it all. A dog, a quoll, a sketch, a devil, and now this. What do you think?'),
      choice('tg-kirra', 'belief', 'What do you believe, Runner? There is no wrong answer.',
        { label: 'They are still out there', flag: 'hope', line: 'Still out there. A lot of good people agree with you.', dash: 'For the dreamers! Pick it up for 30 seconds to the lookout!', after: 'From the lookout, you can see the far hills, wild and wide. Plenty of room for a secret. Kirra smiles. Keep your camera charged.' },
        { label: 'They are gone, but loved', flag: 'gone', line: 'Gone, but remembered. A lot of good people agree with you too.', dash: 'For the ones still here! Pick it up for 30 seconds to the lookout!', after: 'From the lookout, Kirra points out the bush below. Devils, quolls, bettongs. The tiger’s story is why we look after them now.' },
        'Still out there, then. Go!'),
      steady('Settle into an easy pace as the crowd gathers by the stage.', { chapter: 'The stage' }),
      say('tg-kirra', 'Whatever you chose, here is the truth. Nobody has proven a tiger is left. Nobody has proven one is not. So we look after the bush, just in case.'),
      quiz('tg-elsie', 'Elsie’s question. How many stripes did my grandad draw on his tiger?', ['Sixteen', 'Four', 'Forty'], 'Sixteen. I counted them every night as a girl. Fifteen to twenty, the books say. Grandad got it right.'),
      say(null, 'Zoe stands on the stage with a microphone. She reads out a promise. Everyone in the crowd says it back. Look, listen, and look after.', { fx: 'bellring' }),
      dash(45, 'The fun run starts! Pick it up for 45 seconds round the Domain with everyone!', { chapter: 'The fun run', fx: 'whistle' }),
      say(null, 'Hundreds of runners loop the hill. Duchess runs in her stripy coat. Kids in tiger face paint sprint ahead of their parents.', { spatial: 'kids' }),
      steady('Cool down with an easy jog or a walk among the stalls.', { scene: 'harbour', chapter: 'Home' }),
      quiz('tg-kirra', 'Last one, Runner. Where was the first settlement, in 1803, before Hobart moved to Sullivans Cove?', ['Risdon Cove', 'Battery Point', 'Port Arthur'], 'Risdon Cove, across the river. A year later, it moved here.'),
    ],
    finale: 'The Last Tiger is complete. Five runs, one blurry photo, and a mystery that stays open. Whatever you believe, look after what is still here. Thanks, Runner.',
  }),
]

export const CHAIN = ['tiger-photo', 'tiger-footprint', 'tiger-diary', 'tiger-rivulet', 'tiger-domain']

export const CAST = {
  'tiger-narrator': { name: 'Narrator', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 0.95, rate: 0.98 }, // Amelia
  'tg-kirra': { name: 'Kirra', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.1, rate: 1.04, radio: true }, // Ruby, in your earbuds
  'tg-maggie': { name: 'Maggie', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 1.0, rate: 1.0 }, // Julieanne
  'tg-bob': { name: 'Bob', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.85, rate: 0.98 }, // Jimbo
  'tg-hamish': { name: 'Hamish', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 1.0, rate: 1.0 }, // Simon
  'tg-elsie': { name: 'Elsie', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 0.8, rate: 0.94 }, // Eva, older
  'tg-curator': { name: 'Priya', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.05, rate: 1.02, radio: true }, // Milly, on the phone
  'tg-zoe': { name: 'Zoe', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.3, rate: 1.05 }, // Emily, lifted
}

export const LOOK = { accent: '#E8A33D', deep: '#14231C', tag: 'Open mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
