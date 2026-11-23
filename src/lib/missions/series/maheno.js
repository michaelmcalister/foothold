// The Maheno Postcard: a five episode road trip mystery up the Queensland
// coast. Mary, a retired Maryborough teacher, buys a shoebox of old
// postcards at a Brisbane market. The top card, from 1935, says: Dear Bert,
// if you meant what you said, follow my cards north. Love, Ivy. Mary and
// her husband Roger follow Ivy's cards from the Brisbane City Hall clock to
// the Glass House Mountains and the Big Pineapple, to Maryborough, the long
// pier at Hervey Bay and the wreck of the Maheno on K'gari. Nicole guides
// the clock tower, Monique studies the whales and Chris works the barge.
// Bert's answer turns out to be yes, and Roger has a question of his own.
// Nobody is hurt, and the runner stays on paths, well up the beach (it is a
// road), off the wreck and far from the dingoes.
//
// Pure data, laid out with compose.js. Sounds: missions/sound/maheno.js.
//
// Facts checked (web search, November 2026):
//   - Brisbane City Hall opened on 8 April 1930; four clock faces 4.8 m
//     across, the largest in Australia when built; Westminster Chimes every
//     quarter hour; a lift to a platform above the clocks; King George
//     Square was once Albert Square (Brisbane City Hall, Wikipedia).
//     Brisbane is Turrbal and Jagera Country (Brisbane City Council RAP)
//   - the Story Bridge opened on 6 July 1940, named after J. D. Story,
//     Public Service Commissioner 1920 to 1939 (Queensland Museum blog)
//   - Cook named the Glass House Mountains, journal of 17 May 1770, as they
//     resembled glass houses (Queensland Parks); Jinibara Country, with the
//     Kabi Kabi on the coast (Sunshine Coast Council, Mary Cairncross)
//   - the Big Pineapple at Woombye opened on 15 August 1971, 16 m tall,
//     heritage listed in 2009; a plantation train ran a 1 km track (SLQ)
//   - P. L. Travers was born Helen Lyndon Goff in Maryborough in 1899, in
//     the house of the bank her father managed; Maryborough holds a Mary
//     Poppins Festival; about 255 km north of Brisbane (SLQ)
//   - the time cannon, a Dutch East India Company gun given in 1877, was
//     fired at 1 pm daily by the telegraph office until 1890 (Fraser Coast)
//   - Urangan Pier was built 1913 to 1917 for sugar, timber and coal, first
//     1,124 m long; part was pulled down in 1985, protests saved the rest,
//     and it is 868 m now (Urangan Pier, Wikipedia)
//   - Hervey Bay: humpbacks August to October, mothers and calves in
//     September and October; about 2,000 passed in 1992 and about 33,000 in
//     2018; the first Whale Heritage Site in the world in 2019; Butchulla
//     Country; named by Cook in 1770 (Hervey Bay, Wikipedia)
//   - K'gari means paradise (NPR, 2021); Butchulla connection of more than
//     60,000 years; over 120 km long; World Heritage in December 1992
//     (DCCEEW). Boorangoora, Lake McKenzie, is a perched lake of white
//     silica sand, 6.6 m deep on average (Lake McKenzie, Wikipedia)
//   - the Maheno was launched in Dumbarton, Scotland, in 1905; a New
//     Zealand hospital ship for Gallipoli in 1915; under tow to a Japanese
//     shipbreaker, her towline parted in a cyclone in July 1935 and she came
//     ashore on K'gari; access is prohibited now, and Anzac Day services
//     are held there (SS Maheno, Wikipedia)
//
// Real people are only mentioned, never voiced. Ivy, Bert, the postcards
// and everyone with lines are made up.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('mh-mary', '[excited] Gold star, Runner! Ease right back now.'),
  okay: line('mh-mary', 'You got there, and that is what counts. Ease right back now.'),
  half: line('mh-mary', 'Halfway! Keep it going!'),
}
const EASY = line('mh-mary', 'Easy now. Ivy took her time, and so can we.')
const base = { saga: 'maheno', guide: 'mh-mary', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'maheno',
  title: 'The Maheno Postcard',
  blurb: 'A 1935 postcard falls out of a market shoebox: if you meant it, follow my cards north. Five runs up the Queensland coast to a ship on the sand.',
  note: 'Real Queensland places and true history. Ivy, Bert, the postcards and everyone with lines are made up. Watch dingoes from far away, and never climb on the wreck.',
  narrator: 'maheno-narrator',
  score: 'locals',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'maheno-clock',
    episode: 1,
    next: 'Next time on The Maheno Postcard: mountains like glass houses, a giant pineapple, and a question Roger asked in 1975.',
    title: 'The Clock Tower',
    blurb: 'A postcard from 1935 shows the Brisbane City Hall clock. On the back: Dear Bert, follow my cards north. Mary cannot leave a puzzle alone.',
    place: { name: 'King George Square, Brisbane', lat: -27.4686, lng: 153.0236 },
    loop: line('mh-mary', 'A loop! Like the hands of a clock. Round and round, right on time.'),
    early: line('mh-mary', 'Stop there, no worries. The postcard has waited ninety years. It can wait a bit longer.'),
    open: { scene: 'harbour', chapter: 'King George Square', text: 'Brisbane, a warm spring morning. The City Hall clock looks down on the square, and a postcard from 1935 is about to start a trail. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Turrbal and Jagera Country. The river has curled through here for a very long time, and the city grew up along its bends.'),
      say('mh-mary', '[excited] Hello, Runner! Mary here. Retired teacher, Maryborough girl, and I have just bought a shoebox of old postcards at a market stall.'),
      say('mh-mary', 'The top card is from 1935. A photo of this clock tower. On the back: Dear Bert, if you meant what you said, follow my cards north. Love, Ivy.'),
      say('mh-roger', '[sighs] Roger. Her husband. Fifty years married next month. We are meant to be planning a party, love. Not reading strangers’ mail.'),
      quiz('mh-mary', 'First question, class. Brisbane City Hall opened in which year?', ['1930', '1880', '1975'], 'The eighth of April, 1930. Ivy’s card is only five years younger than the building.'),
      say('mh-nicole', 'Hi, I’m Nicole. I take people up the clock tower. Mary showed me the card. Look at the clock in the photo. The hands are stopped at ten past two.'),
      dash(30, 'Ten past two means something! Pick it up for 30 seconds round the square!', { chapter: 'The square' }),
      say(null, 'People sit on the steps with coffees. Above them the tower rises, and its four big faces watch the city every way at once.'),
      quiz('mh-nicole', 'Every quarter hour, the bells ring out a famous tune. Which one?', ['The Westminster Chimes', 'Waltzing Matilda', 'Happy Birthday'], 'The same chimes as Big Ben in London. Listen. There it goes.'),
      quiz('mh-nicole', 'The clock has four faces. How wide is each one?', ['4.8 metres', '1.2 metres', '12 metres'], 'Almost five metres across. When they were built, they were the biggest clock faces in Australia.'),
      say('mh-nicole', '[curious] From the platform above the clocks, ten past two points east. Down the river. Towards the cliffs at Kangaroo Point.'),
      choice('mh-mary', 'way', 'To Kangaroo Point! Along the river walk, or through the gardens?',
        { label: 'Along the river walk', line: 'River walk! Mangroves and joggers.', dash: 'Along the river walk! Pick it up for 30 seconds!', after: 'Along the river, a ferry slides past with a low rumble and a wash of waves, and the Story Bridge steps across the water ahead.' },
        { label: 'Through the gardens', line: 'The gardens! Shade and ibis.', dash: 'Through the gardens! Pick it up for 30 seconds!', after: 'Through the City Botanic Gardens, big old figs throw deep shade, and an ibis eyes your water bottle with real interest.' },
        'River walk, then. Go!'),
      steady('Settle into an easy pace by the river while Mary turns the card over and over.', { chapter: 'The river' }),
      quiz('mh-roger', 'Roger here. The big bridge ahead opened in which year?', ['1940', '1910', '1988'], 'The sixth of July, 1940. So when Ivy wrote her card, it was not open yet.'),
      say('mh-roger', '[laughs] Named after a public servant, too. J. D. Story. Imagine getting a whole bridge for doing the paperwork well.'),
      say(null, 'At the foot of the cliffs, Mary sits on a bench and gasps. The card is two cards, stuck together by ninety years. She peels them gently apart.'),
      say('mh-mary', '[whispers] Card two. Bert, from the train I saw mountains like glass houses, just as Mr Cook said. I will wait one day at the lookout. Ivy.'),
      dash(45, 'To the lookout, Ivy says! Pick it up for 45 seconds up to the clifftop!', { chapter: 'The clifftop' }),
      say('mh-nicole', '[excited] The Glass House Mountains! That is up the Sunshine Coast. Mary, Roger, you are doing a road trip. I can feel it.'),
      say('mh-roger', '[sighs] North for our anniversary, then. Fine. But I am driving. And we are stopping at the Big Pineapple.'),
      steady('Cool down with an easy jog or a walk along the clifftop while the city glitters.', { chapter: 'The view' }),
      quiz('mh-nicole', 'Last one. Before it was King George Square, what was the square called?', ['Albert Square', 'Queen Square', 'River Square'], 'Albert Square. Same spot, same clock looking down, new name.'),
    ],
    finale: 'The Clock Tower is solved. Two cards, stuck together for ninety years, and a lookout up north. Pack the car. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'maheno-glasshouse',
    episode: 2,
    previously: 'Previously on The Maheno Postcard: a clock stopped at ten past two, two cards stuck together, and Ivy waiting at a lookout.',
    next: 'Next time on The Maheno Postcard: Maryborough, a famous author’s birthplace, a cannon that kept the time, and card three.',
    title: 'The Glass Houses',
    blurb: 'Ivy said she would wait at the lookout below the Glass House Mountains. Roger drives, Mary reads, and a postmark leads to a very big pineapple.',
    place: { name: 'Glass House Mountains, Sunshine Coast', lat: -26.9000, lng: 152.9580 },
    loop: line('mh-mary', 'A loop! Round the mountains and back, like a good Sunday drive.'),
    early: line('mh-mary', 'Stop there, all good. Roger needs a pie break anyway.'),
    open: { scene: 'bush', chapter: 'The hinterland', text: 'The Sunshine Coast hinterland, early morning. Strange peaks rise out of the forest, and Ivy promised to wait at a lookout. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Jinibara Country. The peaks are old volcanoes, worn down over a very long time. Each one has its own shape, and its own story.'),
      say('mh-mary', 'Mary here. Roger drove. Roger sang the whole way. Roger is now buying a pie. Card two said Ivy waited at the lookout. So, the lookout.'),
      quiz('mh-mary', 'Who named these the Glass House Mountains, in May 1770?', ['James Cook', 'Matthew Flinders', 'Ivy, on a postcard'], 'He wrote that they looked very much like glass houses. Ivy simply agreed with him.'),
      say('mh-roger', '[laughs] Pie secured. You know I drove cane trains for thirty years? Little engines, long lines of bins, out through the cane at night. Best job going.'),
      dash(30, 'To the lookout! Pick it up for 30 seconds through the trees!', { chapter: 'The lookout' }),
      say(null, 'At the lookout, the peaks stand in a row like old friends. Wind hisses through the she oaks. A whipbird cracks somewhere down below.'),
      say('mh-mary', '[curious] Card three is not in the box. But look at the postmark on card two. Ivy posted it from Woombye.'),
      say('mh-roger', '[sighs] Woombye. Mary. You know what is at Woombye.'),
      say('mh-mary', '[laughs] The Big Pineapple. Where a nervous young train driver asked me a question, in 1975.'),
      choice('mh-roger', 'road', 'Woombye, then. I will drive, you run the last bit. The quick way past the paddocks, or the long way through the forest?',
        { label: 'Past the paddocks', line: 'Paddocks! Cows and big skies.', dash: 'Past the paddocks! Pick it up for 30 seconds!', after: 'Past the paddocks, cattle look up, chewing slowly. Two kookaburras laugh from a fence post, as if they know a joke about you.' },
        { label: 'Through the forest', line: 'Forest! Cool and shady.', dash: 'Through the forest! Pick it up for 30 seconds!', after: 'Through the forest, tall trees creak in the breeze, and the path is soft underfoot. A wallaby watches from far off, then hops away.' },
        'Paddocks, then. Go!'),
      steady('Settle into an easy pace while Roger tells you all about the pineapple.', { chapter: 'The pineapple' }),
      quiz('mh-roger', 'The Big Pineapple stands at Woombye. How tall is it?', ['16 metres', '4 metres', '60 metres'], 'Sixteen metres of pineapple. It opened in August 1971, and it is heritage listed now.'),
      say(null, 'And there it is. Huge, golden and spiky against a blue sky. Kids pose for photos underneath. It is somehow even bigger than you imagined.'),
      quiz('mh-roger', 'Back then, a little train took visitors round the plantation. How long was the track?', ['About 1 kilometre', 'About 10 kilometres', 'About 100 metres'], 'About a kilometre, through the crops. I rode it with Mary. Then I asked her.'),
      say('mh-roger', '[whispers] Runner. Quiet word. Mary does not know. I have a plan for our fiftieth. Keep this trail going all the way north for me, would you?'),
      dash(45, 'Roger is waving us back to the car! Pick it up for 45 seconds!', { chapter: 'The car park' }),
      say('mh-mary', '[excited] Runner! The stall holder said the shoebox came from Maryborough. The rest of it went to the history society. And they have a card. Ivy’s!'),
      steady('Cool down with an easy jog or a walk under the big golden fruit.', { chapter: 'Home' }),
      quiz('mh-mary', 'Last one. Card two was posted in which Sunshine Coast town?', ['Woombye', 'Noosa', 'Caloundra'], 'Woombye. Home of a very large pineapple, and one small, nervous proposal.'),
    ],
    finale: 'The Glass Houses are done. A lookout, a postmark, a pineapple, and a secret plan. Next stop, Mary’s hometown. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'maheno-bank',
    episode: 3,
    previously: 'Previously on The Maheno Postcard: a lookout below the Glass Houses, a postmark from Woombye, and Roger’s secret plan.',
    next: 'Next time on The Maheno Postcard: the long pier at Urangan, a whale researcher called Monique, and card four.',
    title: 'The Bank House',
    blurb: 'Mary’s hometown. A famous author was born in the old bank, a cannon once told the time, and the history society has one of Ivy’s cards.',
    place: { name: 'Kent Street, Maryborough', lat: -25.5381, lng: 152.7029 },
    loop: line('mh-mary', 'A loop! Like my old school run. Same streets, every single day.'),
    early: line('mh-mary', 'Stop there, all good. The history society does a lovely morning tea.'),
    open: { scene: 'harbour', chapter: 'Maryborough', text: 'Maryborough, on the Mary River. Grand old buildings, wide verandahs, and a card from 1935 waiting at the history society. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Butchulla Country. The Mary River winds wide and brown past the old town, on its way out to the sea.'),
      say('mh-mary', '[excited] Mary here, in my hometown! I taught at the school up the road for forty years. Half this town learned their times tables from me.'),
      say('mh-mary', 'And I help at the Mary Poppins Festival every year. Because of who was born here. Right there, in that old bank.'),
      quiz('mh-mary', 'The author of Mary Poppins was born here in 1899. What was her name then?', ['Helen Lyndon Goff', 'Mary Travers', 'Pamela Poppins'], 'Her father managed the bank, and the family lived in the bank house. She became P. L. Travers later.'),
      say('mh-roger', '[laughs] Every festival this street fills with umbrellas, and Mary runs the lot. I carry the chairs. It is a team effort.'),
      dash(30, 'The history society opens at ten! Pick it up for 30 seconds!', { chapter: 'The history society' }),
      say(null, 'Inside the history society, a volunteer in white gloves slides a card from a paper sleeve. The same looping handwriting. Ivy.'),
      say('mh-mary', '[whispers] Card three. Bert, I am at my aunt’s by the river. She says a gun used to boom here at one o’clock every day. Next, the long pier. Ivy.'),
      quiz('mh-roger', 'The one o’clock gun was a real cannon. Why did the town fire it every day?', ['So people could set clocks', 'To scare off the birds', 'To start the school day'], 'From 1877 to 1890, the telegraph office fired it at one o’clock sharp, and the whole town checked its watches.'),
      say(null, 'Down the street stands a time cannon, dark iron and very proud of itself. Kids pat it like a sleeping dog.'),
      quiz('mh-mary', 'The cannon was a gift to the town in 1877. Who made it, long before?', ['The Dutch East India Company', 'The Royal Navy', 'A pirate captain'], 'Old even then. Then it spent thirteen years as Maryborough’s clock.'),
      choice('mh-mary', 'river', 'Ivy’s aunt lived by the river. Along the riverside path, or through the old streets?',
        { label: 'Along the river', line: 'The river! Mind the pelicans.', dash: 'Along the river! Pick it up for 30 seconds!', after: 'Along the river, pelicans drift past like small white boats, and a fish jumps with a flat little slap.' },
        { label: 'Through the old streets', line: 'Old streets! Verandahs and lace.', dash: 'Through the old streets! Pick it up for 30 seconds!', after: 'Through the old streets, timber houses sit high on stumps with wide verandahs and iron lace. A dog barks once, then gets bored.' },
        'River, then. Go!'),
      steady('Settle into an easy pace while Mary studies card three through her reading glasses.', { chapter: 'Card three' }),
      say('mh-mary', '[curious] Look at the stamp. Ivy drew a tiny whale tail on it. She loved her little drawings. A long pier, and a whale. That is Hervey Bay.'),
      quiz('mh-roger', 'Roger here. Maryborough sits on which river?', ['The Mary River', 'The Brisbane River', 'The Murray'], 'Mary from Maryborough, on the Mary. She has never once let me forget it.'),
      say('mh-roger', '[whispers] Runner. Phase two of my plan. I just rang a lady in Hervey Bay who studies whales. She owes me a favour. Long story. Cane trains.'),
      dash(45, 'Let’s reach Hervey Bay by sunset! Pick it up for 45 seconds to the car!', { chapter: 'The road' }),
      say('mh-mary', 'Roger, why are you smiling like that? You only smile like that when you have hidden a cake somewhere.'),
      steady('Cool down with an easy jog or a walk past the old bank where it all began.', { chapter: 'Home' }),
      quiz('mh-mary', 'Last one. Maryborough to Brisbane is about how far?', ['About 255 kilometres', 'About 55 kilometres', 'About 1,000 kilometres'], 'Ivy did it by train in 1935. Roger did it with snacks.'),
    ],
    finale: 'The Bank House is done. Card three, a cannon that kept the time, and a whale tail drawn on a stamp. Next, the long pier. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'maheno-pier',
    episode: 4,
    previously: 'Previously on The Maheno Postcard: an author’s birthplace, a cannon that told the time, and a whale tail on a stamp.',
    next: 'Next time on The Maheno Postcard: K’gari. A barge, a beach that is a road, the old ship on the sand, and Bert’s answer.',
    title: 'The Long Pier',
    difficulty: 'Push yourself',
    blurb: 'Ivy’s fourth card waits at the end of the Urangan Pier. Out in the bay, Monique is watching the whales, and keeping a secret for Roger.',
    place: { name: 'Urangan Pier, Hervey Bay', lat: -25.2900, lng: 152.9100 },
    loop: line('mh-mary', 'A loop! Like a whale’s trip. Up the coast, and all the way back.'),
    early: line('mh-mary', 'Stop there, no worries. The whales will still be here tomorrow.'),
    open: { scene: 'harbour', chapter: 'Urangan', text: 'Hervey Bay, a calm September morning. The long pier runs out over flat blue water, and somewhere out there, whales are passing. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Butchulla Country too. Across the water, low and green on the horizon, lies K’gari. The ship Ivy came to see is still on its far beach.'),
      say('mh-monique', '[excited] Hi! Monique. I study the humpbacks here. Roger called me. He said, there is a postcard, and a runner. And do not tell Mary something.'),
      say('mh-mary', '[curious] Do not tell me what, Monique?'),
      say('mh-monique', '[laughs] About the whales! They are a surprise. Anyway. Mary, Roger says you have another card.'),
      say('mh-mary', 'The history society gave me two cards. I saved the second one for the end of the pier. Ivy said, the long pier.'),
      quiz('mh-monique', 'The pier was built from 1913 to 1917. What was it built to carry?', ['Sugar, timber and coal', 'Holiday makers', 'Mail for the island'], 'All loaded onto ships at the far end. Roger says some of that sugar rode his kind of train.'),
      dash(30, 'To the end of the pier! Pick it up for 30 seconds over the planks!', { chapter: 'The pier' }),
      say(null, 'The planks thump under your feet. Fishers lean on the rails. A pelican sits on a post and watches you go by, completely unimpressed.'),
      quiz('mh-monique', 'The pier was once 1,124 metres long. How long is it now?', ['868 metres', '124 metres', '2 kilometres'], 'Part was pulled down in 1985, then locals fought to save the rest. Good on them.'),
      say('mh-mary', '[whispers] End of the pier. Card four. Bert, I can see the island from here. The ship sits up on the sand, they say, like she is waiting too.'),
      say('mh-mary', 'I will be on the beach by her on the eighteenth. If you come, bring your answer. Ivy.'),
      say('mh-roger', '[sighs] Bring your answer. Oh, Bert. You had better have turned up.'),
      quiz('mh-monique', 'The ship is the Maheno. She came ashore on the island in a cyclone. In which year?', ['1935', '1905', '1965'], 'July 1935. She was under tow to Japan, to be broken up. The towline parted in the storm, and she drifted onto the beach.'),
      choice('mh-monique', 'shore', 'I am heading out on the boat. You two follow along the shore. The beach, or the esplanade path?',
        { label: 'Along the beach', line: 'The beach! Soft sand, go easy.', dash: 'Along the beach! Pick it up for 30 seconds!', after: 'Along the beach, the water is flat as a plate. Far out, a puff of white mist rises and drifts. A whale, breathing.' },
        { label: 'Along the esplanade', line: 'The esplanade! Shady trees and cafes.', dash: 'Along the esplanade! Pick it up for 30 seconds!', after: 'Along the esplanade, people stop and point out to sea. A puff of white mist rises and drifts. A whale, breathing.' },
        'The beach, then. Go!'),
      steady('Settle into an easy pace while Monique’s boat creeps out into the bay.', { chapter: 'The whales' }),
      say('mh-monique', '[excited] Mum and calf, off to the right! She is lifting her tail. The calf is copying her. Badly. It is the best thing you will see all week.'),
      quiz('mh-monique', 'Mums with calves rest in the bay later in the season. Which months?', ['September and October', 'January and February', 'May and June'], 'They rest here in the calm water before the long swim south.'),
      quiz('mh-monique', 'In 2019, Hervey Bay was named the world’s first what?', ['Whale Heritage Site', 'Whale Marine Park', 'Whale Capital City'], 'In 1992, about two thousand humpbacks passed by. By 2018, around thirty three thousand.'),
      dash(45, 'Monique says a breach is coming! Pick it up for 45 seconds and do not miss it!', { chapter: 'The breach' }),
      say(null, 'The whale rises almost all the way out of the water. For one long second she hangs there. Then the splash, like a door slamming on the sea.'),
      say('mh-monique', '[laughs] Roger, I did my bit. Mary, your ride to the island leaves at seven tomorrow. My mate Chris works the barge. He has something to show you.'),
      steady('Cool down with an easy jog or a walk back along the shore as the sun drops.', { chapter: 'Sunset' }),
      quiz('mh-mary', 'Last one, Runner. Who named Hervey Bay, in 1770?', ['James Cook', 'Ivy', 'Matthew Flinders'], 'He got about, that man. Not as much as Ivy, though.'),
    ],
    finale: 'The Long Pier is done. Card four, a whale and her calf, and a barge at seven. Tomorrow, the island. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'maheno-kgari',
    episode: 5,
    previously: 'Previously on The Maheno Postcard: the long pier, a whale and her calf, and Ivy’s promise to wait on the beach by the ship.',
    title: 'The Ship on the Sand',
    difficulty: 'Push yourself',
    blurb: 'K’gari. A clear lake, a rusty ship on a wild beach, and the answer Ivy waited for in 1935. Chris has it in a box. Roger has a question too.',
    place: { name: 'Boorangoora, Lake McKenzie, K’gari', lat: -25.4469, lng: 153.0556 },
    loop: line('mh-mary', 'A loop. Full circle, like a ring. Fitting, really.'),
    early: line('mh-mary', 'Stop there, all good. The island has waited a long time. It is good at it.'),
    open: { scene: 'bush', chapter: 'K’gari', text: 'K’gari, early morning. The barge bumps onto the sand, tall forest crowds the shore, and Bert’s answer is waiting somewhere on this island. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is K’gari, Butchulla Country. The name means paradise. The Butchulla people’s connection to this island goes back more than sixty thousand years.'),
      say('mh-chris', 'G’day. Chris, off the barge. Rules first. Watch the wongari, the dingoes, from far away. Never feed them. And the beach is a road. Stay well up the sand.'),
      quiz('mh-chris', 'Quick one. How long is K’gari, end to end?', ['Over 120 kilometres', 'About 12 kilometres', 'About 1,200 kilometres'], 'With rainforest and lakes on top of all that sand. Ask a ranger how. I just work the barge.'),
      say('mh-mary', '[curious] Chris, Monique said you have something to show me.'),
      say('mh-chris', '[laughs] After the lake. Roger’s orders. Sorry, Mary. He is very firm, for a man holding a pie.'),
      dash(30, 'To the lake! Pick it up for 30 seconds on the forest track!', { chapter: 'The lake' }),
      say(null, 'The track winds through tall forest. Then the trees open, and there it is. Water so clear it looks like glass, over sand as white as sugar.'),
      quiz('mh-chris', 'The white sand at Boorangoora is almost pure what?', ['Silica', 'Salt', 'Crushed shells'], 'Pure white silica sand, so bright you will squint. And the lake is a perched lake, held up high in the dunes.'),
      quiz('mh-chris', 'About how deep is Boorangoora, on average?', ['6.6 metres', '66 metres', '0.6 metres'], 'Clear enough to see your toes from the edge. Do not ask me to swim. I am working.'),
      say('mh-roger', '[whispers] Runner. It is time. Chris has the box. Nicole and Monique came over on the early barge. They are all hiding behind a very small tree.'),
      choice('mh-chris', 'beach', 'Now, the ship. We can see her from the beach. Along the beach track, or up by the lookout?',
        { label: 'Along the beach track', line: 'Beach track! Keep an eye out for cars.', dash: 'Along the beach track! Pick it up for 30 seconds!', after: 'Along the beach, the surf booms and fizzes. Ahead, a huge rusty shape rises out of the sand. The Maheno. You watch her from a safe distance.' },
        { label: 'Up by the lookout', line: 'The lookout! Big views.', dash: 'Up to the lookout! Pick it up for 30 seconds!', after: 'From the lookout, the beach runs on forever. Far along it, a huge rusty shape sits in the sand. The Maheno. Nobody climbs on her now.' },
        'Beach track, then. Go!'),
      steady('Settle into an easy pace while Chris tells you her story.', { chapter: 'The Maheno' }),
      quiz('mh-chris', 'The Maheno was launched in Scotland in 1905. In the First World War, she was what?', ['A hospital ship', 'A warship', 'A cargo ship'], 'From New Zealand. She carried soldiers hurt at Gallipoli in 1915. On Anzac Day, people still gather here.'),
      say('mh-chris', '[sighs] Right. Mary. My great grandparents were Bert and Ivy. Bert came, on the eighteenth. Here is the card he brought. It has been in this box ever since.'),
      say('mh-mary', '[whispers] Dear Ivy. Here is my answer. Yes. A thousand times yes. Now marry me before that ship sinks into the sand. Bert.'),
      say('mh-chris', '[laughs] They married the next spring, in Maryborough. Gran kept his card. The rest went in a house clearance. Until a teacher found them at a market.'),
      dash(45, 'Roger says he has one more thing! Pick it up for 45 seconds back to the lake!', { chapter: 'The question' }),
      say('mh-roger', '[whispers] Mary. Fifty years ago, at the Big Pineapple, I asked you something. I am asking again. Will you marry me, all over again?'),
      say('mh-mary', '[laughs] You old softie. Yes. A thousand times yes. Nicole, Monique, you can come out from behind that very small tree.'),
      say('mh-nicole', '[excited] We brought Ivy’s first card in a frame. And a little clock, set to ten past two. The time on the tower, all along.'),
      say('mh-monique', 'And a whale waved her tail at us on the way over. Just to make it perfect. Congratulations, you two.'),
      steady('Cool down with an easy jog or a walk by the clear water.', { chapter: 'Paradise' }),
      quiz('mh-mary', 'Last one, from the teacher. In December 1992, this island was listed as what?', ['World Heritage', 'A national city', 'A shipping port'], 'Ivy and Bert would be proud. So would their shoebox.'),
    ],
    finale: 'The Maheno Postcard is complete. Five cards, two proposals, one ship on the sand, and a yes that waited ninety years. Thanks, Runner.',
  }),
]

export const CHAIN = ['maheno-clock', 'maheno-glasshouse', 'maheno-bank', 'maheno-pier', 'maheno-kgari']

export const CAST = {
  'maheno-narrator': { name: 'Narrator', voiceId: 'nQrhhugoT2bDFBfb4NDd', pitch: 1.0, rate: 0.98 }, // Ben Callisto, warm documentary
  'mh-mary': { name: 'Mary', voiceId: 'XZaHzN3l87VsxLaaU01w', pitch: 1.0, rate: 1.0, radio: true }, // Bronwyn, in your earbuds
  'mh-roger': { name: 'Roger', voiceId: 'EvSDmyGtGwzs67NleuPP', pitch: 0.95, rate: 0.96 }, // Jason, older country
  'mh-nicole': { name: 'Nicole', voiceId: 'L4bD71zGAYHMT7a6MLwc', pitch: 1.0, rate: 1.0 }, // Brenna
  'mh-monique': { name: 'Monique', voiceId: '3F0Z2rlB8b72i7fhQVJ1', pitch: 1.05, rate: 1.04, radio: true }, // Terri, on the boat radio
  'mh-chris': { name: 'Chris', voiceId: 'dSX8MUEljgxrFygPwhF5', pitch: 1.0, rate: 1.0 }, // Danny, dry humour
}

export const LOOK = { accent: '#F2A93B', deep: '#0E2A3A', tag: 'Road trip mystery' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
