// The Min Min: a five episode open mystery at Boulia, in Queensland's
// Channel Country, where people have reported a strange floating light for
// generations. Lila, an astronomy student with a van full of cameras, tests
// one explanation each run: a road, a river flood, a camel race night, a
// mirage, and finally what you believe. Respectful throughout: the old
// stories of this Country belong to its people and are not retold here.
// Nobody is hurt, and runners stay on roads and town tracks.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the Min Min light is reported across the outback from Brewarrina to
//     Boulia, mostly in the Channel Country; the name's origin is uncertain
//     (perhaps the Min Min Hotel); an 1838 sighting is sometimes cited;
//     Jack Pettigrew proposed a Fata Morgana mirage in 2003; Aboriginal
//     stories of such lights predate colonisation (Min Min light, Wikipedia)
//   - a Fata Morgana bends light through layers of warm and cold air, so
//     distant things appear lifted above the horizon; inverted headlights
//     may explain moving Min Min lights; the name is Italian for Morgan le
//     Fay (Fata Morgana, Wikipedia)
//   - Boulia is on the Burke River, about 289 km SSE of Mount Isa; 314
//     people lived there in 2021; it holds camel races with a 1500 m cup;
//     its name comes from "bool-yo", a waterhole in the Pitta Pitta
//     language; the Burke River is named after Robert O'Hara Burke, who
//     passed through in 1860; it has the Min Min Encounter centre (Boulia)
//   - the Channel Country's rivers, the Georgina, Diamantina and Cooper
//     Creek, reach Lake Eyre only in big wet years; its braided channels
//     cover about 150,000 km2 (Channel Country, Wikipedia)
//
// Real people are only mentioned, never voiced. The sightings in the
// story and everyone with lines are made up. Nobody has proven what the
// Min Min light is.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('mm-lila', '[excited] Faster than light! Well, nearly. Ease right back now.'),
  okay: line('mm-lila', 'You made it, and that is what counts. Ease right back now.'),
  half: line('mm-lila', 'Halfway! Keep it going!'),
}
const EASY = line('mm-lila', 'Easy now. Out here, the heat is the boss. Pace yourself.')
const base = { saga: 'minmin', guide: 'mm-lila', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'minmin',
  title: 'The Min Min',
  blurb: 'A light that floats over the outback, follows travellers, and then is gone. An astronomy student tests one idea each run, and at the end you decide.',
  note: 'Real Boulia places and the true history of the Min Min light. The sightings in the story and the people are made up. Carry water, and run in the cool.',
  narrator: 'minmin-narrator',
  score: 'signal',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'minmin-road',
    episode: 1,
    next: 'Next time on The Min Min: a river that only runs some years, a flood on the way, and a light on the water.',
    title: 'The Road Light',
    blurb: 'Last night, a mail driver saw a light follow her truck for twenty kilometres outside Boulia. Lila brings her cameras and her doubts.',
    place: { name: 'Boulia, Queensland', lat: -22.9120, lng: 139.9090 },
    loop: line('mm-lila', 'A loop! Like the light. Seen here, then there, then back.'),
    early: line('mm-lila', 'Stop there, all good. Find some shade and a cold drink.'),
    open: { scene: 'outback', chapter: 'Boulia', text: 'Boulia, in the far west of Queensland. Red earth, a wide sky, and a main street where everyone waves. Start with an easy walk or jog.' },
    steps: [
      say(null, 'The town’s name comes from bool-yo, a waterhole in the Pitta Pitta language. Their Country, and their stories, go back a very long way.'),
      say('mm-lila', 'Hi! Lila here. I study stars at uni. I have a van, six cameras and a lot of questions. People say there is a light out here. I want to see it.'),
      say('mm-col', 'G’day. Col. I drive the mail run. Last night a light followed me. Twenty k. Then it stopped when I stopped. Then it was gone.'),
      quiz('mm-lila', 'Boulia sits on a river named after an explorer who came through in 1860. Which river?', ['The Burke River', 'The Murray', 'The Yarra'], 'Named after Robert O’Hara Burke, of Burke and Wills. Their trip ended very far from here.'),
      dash(30, 'To Col’s truck at the edge of town! Pick it up for 30 seconds!', { chapter: 'The truck', fx: 'whoosh' }),
      say(null, 'Col’s mail truck is covered in red dust. On the dashboard, a little camera. It was filming the whole time.', { spatial: 'car' }),
      quiz('mm-col', 'How many people lived in Boulia in 2021?', ['About 300', 'About 30,000', 'About 3'], 'About three hundred. Everyone knows everyone. And everyone has a Min Min story.'),
      say('mm-lila', '[curious] The video shows it. A white light, low over the road behind. It bobs. It fades. Hmm. Col, was anyone driving behind you?'),
      say('mm-col', '[laughs] Out here? Could be someone fifty k back. You would never know.'),
      choice('mm-lila', 'test', 'Let’s test it. Watch from the road out of town, or from the water tower hill?',
        { label: 'The road out of town', line: 'The road! Stay well off to the side.', dash: 'Out along the road edge! Pick it up for 30 seconds!', after: 'Along the road, the land is flat to the end of the world. A road train rumbles past, kilometres long, and the dust hangs gold.' },
        { label: 'The hill by the tower', line: 'The hill! Best view in town.', dash: 'Up the rise by the tower! Pick it up for 30 seconds!', after: 'From the rise, the whole plain spreads out, red and gold. You can see the road winding away for ever.' },
        'The road, then. Go!'),
      steady('Settle into an easy pace while Lila sets up a camera facing the road.', { chapter: 'The camera' }),
      say('mm-lila', 'Here is my first idea. Headlights from far away, past the horizon. The air can bend light, so they look like they are floating. Tonight we test it.'),
      quiz('mm-lila', 'Puzzle. If a light stops when you stop, and moves when you move, could it be something following you, or something very far away?', ['Very far away', 'Following you', 'Neither'], 'Very far away. Like the moon. It seems to follow you in the car, but it is just a long way off.'),
      dash(45, 'The sun is setting! Pick it up for 45 seconds back to the van!', { chapter: 'Sunset', fx: 'noirstab' }),
      say(null, 'The sky goes orange, then purple, then black. A million stars come out. Then, on the horizon, a single pale light appears.', { scene: 'night', fx: 'scan' }),
      say('mm-col', '[whispers] There. That is it. That is the one.'),
      say('mm-lila', '[curious] My radio says a cattle truck is coming in on the far road. Sixty kilometres away. Right where that light is. Hmm.'),
      steady('Cool down with an easy jog or a walk under the stars.', { chapter: 'Starlight' }),
      quiz('mm-lila', 'Last one. People say the Min Min was first reported in which year?', ['1838', '1938', '1988'], 'An 1838 report is sometimes quoted. But it may be about something else. Old stories are slippery.'),
    ],
    finale: 'The Road Light is tested. A truck sixty kilometres away, and a light right where it should be. One idea down. Four to go. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'minmin-river',
    episode: 2,
    previously: 'Previously on The Min Min: a mail truck, a light that stopped when it stopped, and a cattle truck sixty kilometres away.',
    next: 'Next time on The Min Min: Boulia’s camel races, a very fast camel called Doris, and a light over the finish line.',
    title: 'The River Light',
    blurb: 'Rain far upstream has the Burke River rising. A station kid on School of the Air says a light hovered over the water last night.',
    place: { name: 'Burke River, Boulia', lat: -22.9050, lng: 139.9000 },
    loop: line('mm-lila', 'A loop! Like the river channels. They wind around and join up.'),
    early: line('mm-lila', 'Stop there, all good. The river is not going anywhere. Well, it is. Slowly.'),
    open: { scene: 'outback', chapter: 'The Burke River', text: 'The Burke River, by Boulia. Usually a string of dry channels and waterholes. Today, brown water creeps along, and the birds have gone wild. Start with an easy walk or jog.' },
    steps: [
      say('mm-lila', 'Lila here. Meet Jack. He is nine. He lives on a station two hours out. He does school by computer, and he saw a light.'),
      say('mm-jack', '[excited] Hi! It was over the river. Green and white. It bounced. Then it went out. Mum said go to bed. I did not.'),
      quiz('mm-lila', 'The rivers out here are part of the Channel Country. Why that name?', ['Many little channels', 'Lots of TV channels', 'A famous canal'], 'Lots of small channels, braided together like hair, over a huge area.'),
      say(null, 'The water spreads slowly over the flat land, filling one channel, then the next. Pelicans arrive from nowhere. Frogs start singing.', { spatial: 'bird' }),
      dash(30, 'Jack’s mum says the road is closing soon! Pick it up for 30 seconds along the bank!', { chapter: 'The bank', fx: 'whoosh' }),
      quiz('mm-jack', 'My question! In big wet years, where does the water from these rivers end up?', ['Lake Eyre', 'Sydney Harbour', 'The Pacific Ocean'], 'Lake Eyre, Kati Thanda, way down in South Australia. Only in big years, though.'),
      say('mm-lila', '[curious] Jack, where exactly was your light? Over the water, or over the far bank?'),
      say('mm-jack', 'Over the far bank. Near where Dad keeps the new solar pump. Is that important?'),
      choice('mm-lila', 'look', 'Let’s check. Upstream along the channel, or down to the crossing?',
        { label: 'Upstream', line: 'Upstream! Watch for snakes on the track.', dash: 'Upstream along the channel! Pick it up for 30 seconds!', after: 'Upstream, a mob of emus watches you from a sandhill, then strolls off, unimpressed.' },
        { label: 'To the crossing', line: 'The crossing! Do not go in the water.', dash: 'Down to the crossing! Pick it up for 30 seconds!', after: 'At the crossing, the water is already over the road. A sign says road closed. Nobody argues with a river.' },
        'Upstream, then. Go!'),
      steady('Settle into an easy pace while Jack’s dad sends a photo of the pump.', { chapter: 'The pump' }),
      say('mm-lila', '[laughs] Jack. The pump has a light on it. Green when it runs, white when it stops. When the wind moves the panels, it flickers.'),
      say('mm-jack', '[sighs] So my Min Min was a pump.'),
      say('mm-lila', 'Your light was a pump. But you watched carefully and told the truth about what you saw. That is exactly what scientists do.'),
      quiz('mm-lila', 'Puzzle. Jack’s light was green, then white, then out. The pump light is green when running and white when stopped. What happened?', ['The pump stopped', 'The pump flew', 'A frog switched it'], 'The pump stopped, then turned off. Mystery solved. Well, this one.'),
      dash(45, 'The road is closing! Pick it up for 45 seconds back to town!', { chapter: 'Road closed', fx: 'thunder' }),
      say(null, 'Storm clouds tower in the east. Lightning flickers on the horizon, silent and far away. Out there, the rain is filling the rivers.', { scene: 'stormfront' }),
      steady('Cool down with an easy jog or a walk while the frogs sing.', { chapter: 'The frogs' }),
      quiz('mm-lila', 'Last one. About how big is the area of these braided channels?', ['150,000 square kms', '150 square kms', '15 square kms'], 'About a hundred and fifty thousand square kilometres. Bigger than some countries.'),
    ],
    finale: 'The River Light is tested. A flood on the way, a solar pump that blinks, and a nine year old scientist. Two ideas down. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'minmin-camels',
    episode: 3,
    previously: 'Previously on The Min Min: a flood on the Burke River, a solar pump that blinks, and Jack, nine, on School of the Air.',
    next: 'Next time on The Min Min: a cold, still night, a mirage in the dark, and a ship that seems to float.',
    title: 'The Camel Cup',
    difficulty: 'Push yourself',
    blurb: 'It is camel race weekend in Boulia. During the night races, a light floats over the finish line. Is it the Min Min, or something else?',
    place: { name: 'Boulia race track', lat: -22.9200, lng: 139.9150 },
    loop: line('mm-lila', 'A loop! Like the race track. Camels go round, you go round.'),
    early: line('mm-lila', 'Stop there, all good. Come watch the camels.'),
    open: { scene: 'festival', chapter: 'Race day', text: 'Camel race weekend in Boulia. Dust, music, a crowd ten times the size of the town, and camels grumbling in the yards. Start with an easy walk or jog.' },
    steps: [
      say('mm-lila', '[excited] Lila here! The town is packed. And I have six cameras on the track. If the light comes tonight, we will catch it.'),
      say('mm-vern', 'G’day, Vern. I train camels. This is Doris. She is fast, she is grumpy, and she spits. Stand to the side, love.'),
      quiz('mm-vern', 'How long is the big camel cup final at Boulia?', ['1500 metres', '15 metres', '15 kilometres'], 'Fifteen hundred metres. That is a long way on a grumpy camel.'),
      say(null, 'The camels line up. The jockeys hang on. The gate drops, and the camels set off in a wobbly, galloping, dusty rush.', { spatial: 'crowdwave' }),
      dash(30, 'Doris is in front! Pick it up for 30 seconds along the rail!', { chapter: 'The race', fx: 'whistle' }),
      say('mm-vern', '[laughs] Go, Doris! Go! Oh. She has stopped to look at something. She is looking at the sky.'),
      say('mm-lila', '[whispers] Everyone, look up. Over the finish line. A light. Floating. Bobbing. Every camera is on it.'),
      quiz('mm-lila', 'Puzzle. The light buzzes, moves in straight lines, and has a red blink underneath. What might it be?', ['A drone', 'A star', 'A ghost'], 'A drone. Red and green blinks, straight lines, and a buzz. Stars do not buzz.'),
      choice('mm-lila', 'find', 'Someone is flying it. Check the grandstand, or the car park?',
        { label: 'The grandstand', line: 'Grandstand! Look for someone holding a controller.', dash: 'To the grandstand! Pick it up for 30 seconds!', after: 'In the grandstand, a teenager in a big hat is staring at a screen. On it, the race from above.' },
        { label: 'The car park', line: 'Car park! Look for a screen glowing.', dash: 'To the car park! Pick it up for 30 seconds!', after: 'In the car park, by a dusty ute, a teenager in a big hat stares at a screen. On it, the race from above.' },
        'Grandstand, then. Go!'),
      say('mm-bree', '[laughs] That is my son, Kai. He films the races for the town page. Kai! You have set off a Min Min hunt!'),
      steady('Settle into an easy pace while Kai shows Lila his drone footage.', { chapter: 'The footage' }),
      say('mm-lila', 'Kai’s footage is amazing. And it shows something else. Out on the plain, far away, two lights that are not his drone. Not moving. Just there.'),
      quiz('mm-lila', 'The Min Min Encounter in Boulia is what kind of place?', ['A visitor centre', 'A camel farm', 'A petrol station'], 'A visitor centre all about the light. Of course Boulia has one.'),
      dash(45, 'Doris is loose! Pick it up for 45 seconds and help Vern steer her back, from a safe distance!', { chapter: 'Doris', fx: 'noirstab' }),
      say(null, 'Doris trots back to her yard all by herself, looking very pleased. Vern follows, waving a bucket of oats and apologising to everyone.'),
      say('mm-vern', '[sighs] She came fourth. She would have won if she had not stopped to look at the drone. Or the Min Min. She will not say which.'),
      steady('Cool down with an easy jog or a walk while the night races finish.', { scene: 'night', chapter: 'Night races' }),
      quiz('mm-lila', 'Last one. Where are the two far lights in Kai’s footage? I checked the map.', ['On the Mount Isa road', 'On the moon', 'In the river'], 'On the Mount Isa road, nearly three hundred kilometres away as the crow flies. Hmm. How can we see that far?'),
    ],
    finale: 'The Camel Cup is run. One drone, one grumpy camel, and two far lights that ought to be out of sight. Three ideas tested. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'minmin-mirage',
    episode: 4,
    previously: 'Previously on The Min Min: camel races, a drone over the finish line, and two far lights that were meant to be out of sight.',
    next: 'Next time on The Min Min: one last night out on the plain, everything Lila has learned, and your theory.',
    title: 'The Mirage',
    difficulty: 'Push yourself',
    blurb: 'A cold, still night after a hot day. Lila thinks the air itself might lift distant lights into view. Time for the big test.',
    place: { name: 'Boulia plain', lat: -22.9300, lng: 139.8800 },
    loop: line('mm-lila', 'A loop! Like light bending round and coming back.'),
    early: line('mm-lila', 'Stop there, all good. Grab a jumper. Desert nights are cold.'),
    open: { scene: 'night', chapter: 'The plain', text: 'The plain outside Boulia, just after sunset. The day was baking. Now the air is cold and very, very still. Start with an easy walk or jog.' },
    steps: [
      say('mm-lila', 'Lila here. Tonight is perfect for my idea. Hot ground, cold air on top, no wind. Light can bend in air like that.'),
      quiz('mm-lila', 'A mirage that lifts far away things above the horizon has an Italian name. What is it?', ['Fata Morgana', 'Spaghetti Lux', 'Bella Notte'], 'Fata Morgana. Named after a sorceress from old legends. Sailors saw ships floating in the sky.'),
      say('mm-col', 'Col here. I am driving out east, slow, with my lights on. Fifty k, then a hundred. You tell me when you see me.'),
      dash(30, 'Get to the rise with the cameras! Pick it up for 30 seconds!', { chapter: 'The rise', fx: 'whoosh' }),
      say(null, 'You reach the rise. The cameras hum. Somewhere out in the dark, a dingo howls, long and lonely, a very long way off.', { spatial: 'dog' }),
      say('mm-jack', '[excited] Jack here, on the radio! Mum let me stay up! I can see the stars! All of them!'),
      quiz('mm-lila', 'Puzzle. Col is driving away from us, over the edge of the horizon. Normally, can we still see his lights?', ['No, the Earth curves', 'Yes, always', 'Only on Fridays'], 'No. The Earth curves, so things past the horizon drop out of sight. Normally.'),
      say('mm-col', 'Col here. One hundred and twenty k out. You will never see me now.'),
      say(null, 'On the horizon, a pale light rises. It floats. It wobbles. It splits into two, then joins again. It is right where Col is.', { fx: 'scan' }),
      say('mm-lila', '[whispers] There it is. Col is over the horizon, and we can still see his lights. The cold air is bending them up to us.'),
      choice('mm-lila', 'wave', 'Let’s signal Col! Flash the van lights, or run to the top of the rise?',
        { label: 'Flash the van lights', line: 'Van lights! Flash flash flash.', dash: 'Back to the van! Pick it up for 30 seconds!', after: 'You flash the van lights three times. A minute later, the floating light far away blinks three times back. Everyone gasps.' },
        { label: 'Top of the rise', line: 'Top of the rise! Wave your torch!', dash: 'Up to the top! Pick it up for 30 seconds!', after: 'At the top, you wave your torch in a circle. A minute later, the floating light far away blinks back. Everyone gasps.' },
        'Van lights, then. Go!'),
      steady('Settle into an easy pace while Lila checks every camera.', { chapter: 'The results' }),
      quiz('mm-lila', 'Who suggested in 2003 that the Min Min light might be this kind of mirage?', ['Jack Pettigrew', 'Robert Burke', 'Doris the camel'], 'Jack Pettigrew, a scientist. He thought cold air could bend far lights into view. A good idea. Not everyone agrees.'),
      say('mm-lila', 'So we know a mirage can do it. But that does not mean every light out here is a mirage. Some people saw lights before there were cars.'),
      dash(45, 'Col is driving back! Pick it up for 45 seconds to meet him at the road!', { chapter: 'Col returns', fx: 'noirstab' }),
      say('mm-col', '[laughs] I have been the Min Min for one night. Lovely. Can I put it on my business card?'),
      steady('Cool down with an easy jog or a walk under the Milky Way.', { chapter: 'The Milky Way' }),
      quiz('mm-lila', 'Last one. Which famous lake can the Channel Country rivers reach in big wet years?', ['Lake Eyre', 'Lake Burley Griffin', 'Lake Tahoe'], 'Lake Eyre, Kati Thanda. Same air, same land, very different weather.'),
    ],
    finale: 'The Mirage is tested. Headlights from over the horizon, lifted into view by cold air. A big clue. One night left. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'minmin-choice',
    episode: 5,
    previously: 'Previously on The Min Min: a still, cold night, headlights bent over the horizon, and Col on his new business card.',
    title: 'Your Light',
    difficulty: 'Push yourself',
    blurb: 'One last night out on the plain with everyone from the series. Lila shares what she found. Then a light appears that nobody can explain, and you choose.',
    place: { name: 'Min Min Encounter, Boulia', lat: -22.9110, lng: 139.9100 },
    loop: line('mm-lila', 'A loop. Like a story told around a campfire. It always comes back.'),
    early: line('mm-lila', 'Stop there, all good. The sky will be here tomorrow night.'),
    open: { scene: 'night', chapter: 'Last night', text: 'The edge of Boulia, on the last night. A campfire, a ring of camp chairs, Doris in her yard, and a sky so full of stars it looks like spilt sugar. Start with an easy walk or jog.' },
    steps: [
      say('mm-lila', 'Lila here. Thank you, everyone. Col, Jack, Vern, Doris, Bree and Kai. Here is what we learned.'),
      say('mm-lila', 'A far truck. A solar pump. A drone. And a mirage that can lift headlights over the horizon. Four lights, four answers.'),
      quiz('mm-lila', 'Warm up. Which light turned out to be a drone?', ['The camel race light', 'The river light', 'The road light'], 'The camel race light. Kai’s drone. Doris was very distracted.'),
      say('mm-bree', 'Bree here. I brought damper and golden syrup. And a question. What about the lights people saw a hundred years ago? No cars then. No drones.'),
      quiz('mm-lila', 'Before cars, what might a mirage have lifted into view instead?', ['Campfires', 'Mobile phones', 'Street lights'], 'Campfires, far away. Some scientists think the old stationary lights were exactly that.'),
      dash(30, 'Kai has spotted something! Pick it up for 30 seconds to the rise!', { chapter: 'The rise', fx: 'whoosh', spatial: 'owl' }),
      say(null, 'Low over the plain, to the south, a soft light glows. No road there. No river. No drone. It hangs, then drifts, then slowly fades away.', { fx: 'scan' }),
      say('mm-jack', '[whispers] Lila. There is no road down there. I checked the map. There is nothing.'),
      say('mm-lila', '[sighs] I know, Jack. I do not have an answer for that one. And that is all right. Some questions stay open.'),
      quiz('mm-vern', 'Vern’s question. Who has stories about lights like this, from long before any of us came here?', ['Aboriginal people', 'Tourists', 'Camel trainers'], 'Aboriginal people, across many Countries. Those stories belong to them, and we listen with respect.'),
      choice('mm-lila', 'belief', 'Your turn, Runner. What do you think that last light was?',
        { label: 'A mirage we can explain', flag: 'mirage', line: 'A mirage. Science is on your side.', dash: 'For science! Pick it up for 30 seconds round the camp!', after: 'You picture a campfire or a farm light far past the horizon, lifted up by cold air. Lila nods. It fits. Maybe.' },
        { label: 'Something still unknown', flag: 'unknown', line: 'Still unknown. Plenty of locals agree.', dash: 'For the mystery! Pick it up for 30 seconds round the camp!', after: 'You look south into the dark, where the light was. No answer. Just a huge sky, and a little shiver. Col grins. Welcome to Boulia.' },
        'A mirage, then. Go!'),
      steady('Settle into an easy pace back to the fire.', { chapter: 'The campfire' }),
      say('mm-lila', 'Whatever you chose, here is the truth. Nobody has proven what the Min Min is. People are still watching. Maybe one day, you will be too.'),
      dash(45, 'Shooting star! Make a wish and pick it up for 45 seconds round the camp!', { chapter: 'Shooting star', fx: 'whistle' }),
      say(null, 'A shooting star streaks across the whole sky. Jack cheers. Doris grumbles. Somebody puts more wood on the fire.', { spatial: 'meteor' }),
      steady('Cool down with an easy jog or a walk around the fire.', { chapter: 'Home' }),
      quiz('mm-lila', 'Last one, Runner. Boulia’s name comes from a waterhole name in which language?', ['Pitta Pitta', 'Latin', 'Italian'], 'Pitta Pitta. The first people of this Country. Their name is still on the town.'),
    ],
    finale: 'The Min Min is complete. Four lights explained, one still a mystery, and a sky full of stars. Keep watching, Runner. Thank you.',
  }),
]

export const CHAIN = ['minmin-road', 'minmin-river', 'minmin-camels', 'minmin-mirage', 'minmin-choice']

export const CAST = {
  'minmin-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.88, rate: 0.97 }, // Peter Michael
  'mm-lila': { name: 'Lila', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 1.1, rate: 1.04, radio: true }, // Amelia, in your earbuds
  'mm-col': { name: 'Col', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.95, rate: 1.0, radio: true }, // Julieanne, on the truck radio
  'mm-jack': { name: 'Jack', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.35, rate: 1.08, radio: true }, // Ziggy, lifted
  'mm-vern': { name: 'Vern', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.96 }, // Jimbo
  'mm-bree': { name: 'Bree', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.0, rate: 1.02 }, // Milly
}

export const LOOK = { accent: '#BDE3FF', deep: '#05060F', tag: 'Open mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
