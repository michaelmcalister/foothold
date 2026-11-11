// The Catalpa Run: a five episode treasure trail in Fremantle, built on
// the true story of the 1876 Catalpa escape. Mr Doyle, a retired history
// teacher, has hidden five clues around Fremantle and Rockingham for the
// escape's anniversary week. Niamh, a guide at Fremantle Prison, and Grace,
// a teenager who loves history, race you through them, from the prison to
// the Round House, the beach at Rockingham, a sailing race and the harbour,
// before a rival team of very polite cousins gets there first. Nobody is
// hurt, nobody breaks any rules, and the old prison is only toured.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the Catalpa rescue: six Irish Fenian prisoners left the Convict
//     Establishment (Fremantle Prison) on 17 April 1876; they were driven to
//     Rockingham and rowed out in a whaleboat to the Catalpa, a three masted
//     bark that had been a New Bedford whaler, under Captain George
//     Anthony; the steamer Georgette fired a warning shot on 19 April;
//     Anthony raised the US flag and stayed outside the three mile limit,
//     and the Georgette turned back; the Catalpa reached New York on 19
//     August 1876 (Catalpa rescue, Wikipedia)
//   - Fremantle Prison: built by convicts from 1851, main cell block done
//     by 1859, from limestone quarried on the site; tunnels dug in the
//     1850s for water; closed on 30 November 1991; World Heritage in 2010;
//     transportation to WA ended in 1868 (Fremantle Prison, Wikipedia)
//   - Fremantle: the Round House, 1830 to 1831, is the oldest intact
//     building in WA, with eight cells; the Whalers Tunnel runs under it;
//     Captain Charles Fremantle claimed the coast in May 1829; the markets
//     opened in 1897; the Fremantle Doctor is the afternoon sea breeze; the
//     America's Cup was defended here in 1987; the Whadjuk Noongar name is
//     Walyalup; C. Y. O'Connor opened up the harbour in 1897 (Fremantle)
//
// Real people are only mentioned, never voiced. Mr Doyle, his trail and
// everyone with lines are made up.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('ct-niamh', '[excited] Grand running! Ease right back now.'),
  okay: line('ct-niamh', 'You got there, and that is what counts. Ease right back now.'),
  half: line('ct-niamh', 'Halfway! Keep rowing! I mean running!'),
}
const EASY = line('ct-niamh', 'Easy now. Mr Doyle’s trail is long, and the Doctor is blowing.')
const base = { saga: 'catalpa', guide: 'ct-niamh', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'catalpa',
  title: 'The Catalpa Run',
  blurb: 'Fremantle, 1876: six prisoners, a whaling ship and a daring escape. Today, a retired teacher’s treasure trail follows their route, and you have to beat the cousins.',
  note: 'The Catalpa escape and the Fremantle history are true. The trail, the teams and the people are made up. The trivia is all real.',
  narrator: 'catalpa-narrator',
  score: 'heist',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'catalpa-prison',
    episode: 1,
    next: 'Next time on The Catalpa Run: the oldest building in Western Australia, a tunnel for whalers, and a clue in a market stall.',
    title: 'The Limestone Walls',
    blurb: 'Mr Doyle’s anniversary treasure trail starts at Fremantle Prison. The first clue is somewhere on the tour, and the cousins are already here.',
    place: { name: 'Fremantle Prison', lat: -32.0551, lng: 115.7531 },
    loop: line('ct-niamh', 'A loop! Like the exercise yard. Round and round.'),
    early: line('ct-niamh', 'Stop there, no bother. The walls will still be here tomorrow.'),
    open: { scene: 'city', chapter: 'The prison', text: 'Fremantle, Western Australia. High pale limestone walls, a gatehouse with a clock, and a warm morning breeze. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Walyalup, Whadjuk Noongar Country. In 1876, six Irish prisoners walked out of these walls and into one of the boldest escapes in history.'),
      say('ct-niamh', 'Hello, Runner! Niamh here. I give tours of the prison. This week it is the escape’s anniversary, and Mr Doyle has set a treasure trail. Five clues.'),
      say('ct-grace', '[excited] Grace here. I am fifteen and I have read every book about the Catalpa. Twice. We are going to win this.'),
      quiz('ct-niamh', 'Warm up. What were the prison walls built from?', ['Limestone', 'Red brick', 'Timber'], 'Limestone, quarried right here on the site, by the convicts themselves.'),
      say('ct-dec', '[laughs] Morning, Niamh. Declan here. My cousins and I are also doing the trail. May the best team win. We will be very polite about it.'),
      dash(30, 'Declan’s heading for the gatehouse! Pick it up for 30 seconds!', { chapter: 'The gatehouse', fx: 'whoosh' }),
      say(null, 'Under the gatehouse clock, visitors gather for the morning tour. A bell clangs. The great door swings open.', { spatial: 'chatter', fx: 'bellring' }),
      quiz('ct-grace', 'How many prisoners escaped on the Catalpa?', ['Six', 'Sixty', 'Two'], 'Six Irish Fenians. Their escape was planned for years, on the other side of the world.'),
      say('ct-niamh', '[curious] Mr Doyle’s first clue says, find the date the doors last shut, and look beneath it.'),
      quiz('ct-niamh', 'When did Fremantle Prison close for good?', ['1991', '1891', '1876'], 'November 1991. It was used for over a hundred and thirty years. Now it is a World Heritage site.'),
      choice('ct-niamh', 'way', 'There is a plaque with that date. By the main cell block, or by the gate?',
        { label: 'The cell block', line: 'Cell block! Watch your head.', dash: 'To the cell block! Pick it up for 30 seconds!', after: 'Past the long cell block, four storeys of tiny windows. Under a plaque, a small brass tag with a shamrock on it.' },
        { label: 'By the gate', line: 'The gate! Quick, before the tour group.', dash: 'Back to the gate! Pick it up for 30 seconds!', after: 'Back at the gate, under the date on the wall, a small brass tag with a shamrock on it, tucked behind a downpipe.' },
        'Cell block, then. Go!'),
      say('ct-grace', '[excited] The tag says, where whalers walked under the town. That is the Whalers Tunnel! Under the Round House!'),
      steady('Settle into an easy pace downhill towards the sea while Niamh tells the story.', { chapter: 'Downhill' }),
      say('ct-niamh', 'Picture it. April 1876. Six men, a whaling ship waiting off the coast, and a plan years in the making, across the whole world.'),
      quiz('ct-niamh', 'The prison has tunnels under it, dug in the 1850s. What were they for?', ['Fresh water', 'Escaping', 'Storing gold'], 'Fresh water, from deep underground. Not escaping, sadly for the story.'),
      dash(45, 'The cousins are ahead by a street! Pick it up for 45 seconds and catch them!', { chapter: 'The cousins', fx: 'noirstab' }),
      say('ct-dec', '[laughs] Well run. We will see you at the Round House, Niamh. Shall I hold the door?'),
      steady('Cool down with an easy jog or a walk down the High Street.', { scene: 'laneway', chapter: 'High Street' }),
      quiz('ct-grace', 'Last one from me. Transportation of convicts to Western Australia ended in which year?', ['1868', '1968', '1788'], 'The last convict ship arrived in 1868. After that, no more convicts were sent west.'),
    ],
    finale: 'The Limestone Walls are cleared. One brass shamrock, one polite rival, and a tunnel waiting under the Round House. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'catalpa-roundhouse',
    episode: 2,
    previously: 'Previously on The Catalpa Run: the prison walls, a brass shamrock, and Declan and his very polite cousins.',
    next: 'Next time on The Catalpa Run: the beach at Rockingham, a whaleboat, and the row that changed everything.',
    title: 'The Whalers Tunnel',
    blurb: 'Clue two is under the Round House, the oldest building in Western Australia. Then a market stall, and a race to the sea.',
    place: { name: 'The Round House, Fremantle', lat: -32.0566, lng: 115.7413 },
    loop: line('ct-niamh', 'A loop! Like the Round House. No corners to hide in.'),
    early: line('ct-niamh', 'Stop there, no bother. Get a coffee on the Cappuccino Strip.'),
    open: { scene: 'harbour', chapter: 'The Round House', text: 'Arthur Head, Fremantle. A small stone building with many sides sits on the headland. Below it, the sea glitters. Start with an easy walk or jog.' },
    steps: [
      say('ct-niamh', 'Niamh here. The Round House. It was a jail too, long before the big prison. Eight cells, and a jailer’s house.'),
      quiz('ct-grace', 'The Round House is the oldest building left in Western Australia. When was it built?', ['1830 to 1831', '1930 to 1931', '1876'], 'Just a year or two after the colony began. Older than anything else still standing here.'),
      say(null, 'Under the headland, a tunnel runs straight through the rock, from the town to the beach. Cool and dim, with a bright arch of sea at the end.', { scene: 'tunnel' }),
      say('ct-grace', '[curious] The Whalers Tunnel! They cut it so whalers could get from the beach to town. There! A shamrock chalked on the wall!'),
      dash(30, 'Through the tunnel to the beach! Pick it up for 30 seconds!', { chapter: 'Bathers Beach', fx: 'whoosh' }),
      say(null, 'Out on Bathers Beach, the sand is white and the water is clear. Kids splash in the shallows. A pelican eyes a fisherman’s bucket.', { scene: 'beachdawn', spatial: 'bird' }),
      say('ct-niamh', 'Clue three says, ask the oldest stall for the Irish apple.'),
      quiz('ct-niamh', 'Fremantle Markets opened in which year?', ['1897', '1997', '1797'], '1897. The same year the harbour was opened up by C. Y. O’Connor. Big year for Freo.'),
      choice('ct-niamh', 'route', 'To the markets! Along the Cappuccino Strip, or through the back lanes?',
        { label: 'The Cappuccino Strip', line: 'The Strip! Dodge the coffee cups.', dash: 'Along the Cappuccino Strip! Pick it up for 30 seconds!', after: 'Along the Strip, cafés spill onto the footpath, and the smell of coffee and pizza follows you all the way.' },
        { label: 'The back lanes', line: 'Back lanes! Old warehouses and street art.', dash: 'Through the back lanes! Pick it up for 30 seconds!', after: 'Through the back lanes, past old warehouses painted with whales and ships. A busker plays a fiddle by the market door.' },
        'The Strip, then. Go!'),
      say('ct-wal', '[laughs] G’day! Wal, fruit and veg, forty years. Irish apple? That is what Mr Doyle calls a potato. Here. Look under the sack.'),
      say('ct-grace', 'A potato, with a tag on it! It says, where the six were rowed to freedom. Rockingham!'),
      steady('Settle into an easy pace while Niamh works out the trains to Rockingham.', { chapter: 'To Rockingham' }),
      quiz('ct-niamh', 'Fremantle has a famous afternoon wind. What do locals call it?', ['The Fremantle Doctor', 'The Perth Nurse', 'The Big Blow'], 'The Fremantle Doctor. It cools the summer heat every afternoon, and makes sailing very exciting.'),
      say('ct-dec', '[sighs] Niamh. My cousins took the potato before us. Wait. No. They took a different potato. Wal, why do you have so many tagged potatoes?'),
      say('ct-wal', '[mischievously] Mr Doyle paid me in fruit cake. I hid a few fakes. Keeps it interesting.'),
      dash(45, 'The Rockingham bus is leaving! Pick it up for 45 seconds to the stop!', { chapter: 'The bus', fx: 'noirstab' }),
      steady('Cool down with an easy jog or a walk while the bus heads south.', { chapter: 'South' }),
      quiz('ct-grace', 'Last one. Who claimed this coast for Britain in 1829, and gave Fremantle its name?', ['Captain Charles Fremantle', 'Captain Cook', 'Captain Anthony'], 'Captain Charles Fremantle, in May 1829. The town was named after him.'),
    ],
    finale: 'The Whalers Tunnel is cleared. A chalk shamrock, a tagged potato, and a beach at Rockingham waiting. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'catalpa-rockingham',
    episode: 3,
    previously: 'Previously on The Catalpa Run: the oldest building in WA, the Whalers Tunnel, and a tagged potato from Wal’s stall.',
    next: 'Next time on The Catalpa Run: a sailing race, a replica steamer, and a warning shot that is only a party popper.',
    title: 'The Whaleboat',
    blurb: 'In 1876 the six men were rowed from Rockingham to the waiting ship. Today the anniversary whaleboat race starts from the same beach.',
    place: { name: 'Rockingham Beach', lat: -32.2770, lng: 115.7290 },
    loop: line('ct-niamh', 'A loop! Like a rowing crew coming back to the beach.'),
    early: line('ct-niamh', 'Stop there, no bother. Watch the boats from the sand.'),
    open: { scene: 'beachdawn', chapter: 'Rockingham', text: 'Rockingham Beach, south of Fremantle. Calm blue water, a long jetty, and wooden rowing boats lined up on the sand. Start with an easy walk or jog.' },
    steps: [
      say('ct-niamh', 'Niamh here. This is where the six men were brought on the morning of the escape. A whaleboat was waiting.'),
      say('ct-tommo', 'G’day. Tommo, rowing club. Today we race replica whaleboats out to a buoy and back. Mr Doyle’s fourth clue is with the winning crew.'),
      quiz('ct-grace', 'How did the six men get from the beach to the Catalpa?', ['In a rowing whaleboat', 'Swimming', 'On a steamer'], 'In a whaleboat, rowing hard. The ship was far out, waiting.'),
      say(null, 'Six boats line up. Rowers grip their oars. A starter raises a flag. The crowd goes quiet.', { spatial: 'chatter' }),
      dash(30, 'They are off! Pick it up for 30 seconds along the beach with the boats!', { chapter: 'The race', fx: 'whistle' }),
      say(null, 'Oars dip and flash in the sun. One boat pulls ahead, then another. Declan’s cousins are in the green boat, rowing very politely.', { spatial: 'boat' }),
      quiz('ct-tommo', 'The Catalpa was once a whaling ship. From which American port?', ['New Bedford', 'New York', 'New Orleans'], 'New Bedford, in Massachusetts. The great whaling town.'),
      say('ct-grace', '[excited] Tommo’s crew is level with the green boat! Come on!'),
      choice('ct-niamh', 'cheer', 'Where do we cheer from? The end of the jetty, or the water’s edge?',
        { label: 'The end of the jetty', line: 'Jetty! Best view in the house.', dash: 'Out along the jetty! Pick it up for 30 seconds!', after: 'From the end of the jetty, you see it all. Tommo’s boat rounds the buoy first, the rowers roaring.' },
        { label: 'The water’s edge', line: 'Water’s edge! Get your feet wet.', dash: 'Along the water’s edge! Pick it up for 30 seconds!', after: 'At the water’s edge, small waves wash your shoes. Tommo’s boat rounds the buoy first, and the beach erupts.' },
        'The jetty, then. Go!'),
      steady('Settle into an easy pace along the beach as the boats race home.', { chapter: 'The finish' }),
      say(null, 'Tommo’s crew crunches onto the sand a boat length ahead. Declan’s cousins come second and shake every hand on the beach.'),
      say('ct-tommo', '[laughs] Here you go. Clue four, from Mr Doyle. It says, beyond three miles, they could not touch her.'),
      quiz('ct-niamh', 'Why did staying beyond three miles from the coast matter?', ['International waters', 'Better fishing', 'Calmer seas'], 'Beyond three miles was international waters. The colony’s ships could not legally stop an American ship there.'),
      dash(45, 'Clue four says go to the sailing club! Pick it up for 45 seconds!', { chapter: 'The sailing club', fx: 'noirstab' }),
      say('ct-dec', 'Well rowed, all. Niamh, you know what comes next. The Georgette. Tomorrow. Bring a hat.'),
      steady('Cool down with an easy jog or a walk back along the foreshore.', { chapter: 'Foreshore' }),
      quiz('ct-grace', 'Last one. What kind of ship was the Catalpa?', ['A three masted bark', 'A steamboat', 'A canoe'], 'A three masted bark. Tall, fast and very, very far from home.'),
    ],
    finale: 'The Whaleboat is cleared. A race won by a boat length, cousins who shake every hand, and a sailing race tomorrow. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'catalpa-georgette',
    episode: 4,
    previously: 'Previously on The Catalpa Run: a whaleboat race at Rockingham, a clue about three miles, and a sailing race tomorrow.',
    next: 'Next time on The Catalpa Run: the last clue, a flag in the harbour, and the cousins one step ahead.',
    title: 'The Georgette',
    difficulty: 'Push yourself',
    blurb: 'A friendly sailing race re-enacts the chase between the Catalpa and the steamer Georgette. Run the shore and read the last clue from the flags.',
    place: { name: 'Fremantle Fishing Boat Harbour', lat: -32.0600, lng: 115.7470 },
    loop: line('ct-niamh', 'A loop! Like a yacht tacking back and forth.'),
    early: line('ct-niamh', 'Stop there, no bother. The boats will be out all afternoon.'),
    open: { scene: 'harbour', chapter: 'The boat harbour', text: 'Fremantle’s fishing boat harbour. Masts clink, gulls wheel, and out in the bay two old boats get ready to race. Start with an easy walk or jog.' },
    steps: [
      say('ct-niamh', 'Niamh here. Two boats. One plays the Catalpa, a tall sailing ship. One plays the Georgette, an old steamer. It is all in fun.'),
      quiz('ct-grace', 'The real Georgette chased the Catalpa on which date in 1876?', ['19 April', '17 August', '1 January'], 'The 19th of April. Two days after the escape. It fired a warning shot across the bow.'),
      say('ct-skip', '[laughs] Skipper here, on the Georgette boat. Our warning shot today is a giant party popper. Very historical.'),
      say(null, 'Out on the water, the two boats square up. The breeze is building. The Fremantle Doctor is on its way in.', { spatial: 'boat' }),
      dash(30, 'They are racing! Pick it up for 30 seconds along the breakwater!', { chapter: 'The breakwater', fx: 'whoosh' }),
      say(null, 'The sailing boat leans into the wind and surges ahead. The steamer chugs behind, puffing smoke from a very small funnel.'),
      quiz('ct-niamh', 'When the real Georgette came close, what did Captain Anthony do?', ['Raised the US flag', 'Turned around', 'Hid below deck'], 'He raised the American flag and said an attack would be an act of war. The Georgette turned back.'),
      say(null, 'Pop! A cloud of streamers bursts from the steamer. Everyone on the shore cheers. On the sailing boat, a big flag goes up.', { fx: 'impact' }),
      say('ct-grace', '[curious] The flag has letters sewn on it! They spell, at the harbour where the bar was blown. That is clue five!'),
      choice('ct-niamh', 'way', 'The inner harbour! Along the wharf, or through the old sheds?',
        { label: 'Along the wharf', line: 'The wharf! Big ships, big ropes.', dash: 'Along the wharf! Pick it up for 30 seconds!', after: 'Along the wharf, a huge container ship slides past, taller than any building in town. Tugs nudge it into place.' },
        { label: 'Through the old sheds', line: 'The old sheds! Mind the forklifts.', dash: 'Through the old sheds! Pick it up for 30 seconds!', after: 'Through the old sheds, past a museum of boats, including a famous yacht with a strange shaped keel.' },
        'The wharf, then. Go!'),
      steady('Settle into an easy pace while Grace explains the clue.', { chapter: 'The bar' }),
      say('ct-grace', 'The harbour entrance once had a bar of limestone and sand. An engineer cleared it so big ships could come in. 1897!'),
      quiz('ct-grace', 'Which engineer opened up Fremantle Harbour in 1897?', ['C. Y. O’Connor', 'Henry Lawson', 'Captain Anthony'], 'C. Y. O’Connor. He also built the water pipeline to the goldfields. A busy man.'),
      dash(45, 'The cousins are already at the harbour! Pick it up for 45 seconds!', { chapter: 'The harbour', fx: 'noirstab' }),
      say('ct-dec', '[sighs] Niamh. Grace. We cannot read the clue. It is in Irish. None of us speak Irish. Would you help us?'),
      steady('Cool down with an easy jog or a walk while Niamh reads the old Irish words.', { chapter: 'The Irish words' }),
      quiz('ct-niamh', 'Last one. Fremantle defended which famous sailing trophy in 1987?', ['The America’s Cup', 'The Melbourne Cup', 'The Davis Cup'], 'The America’s Cup, out in Gage Roads. The whole town went sailing mad.'),
    ],
    finale: 'The Georgette is outrun. A party popper, a flag with a clue, and rivals who asked for help. One clue left. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'catalpa-flag',
    episode: 5,
    previously: 'Previously on The Catalpa Run: a sailing race, a party popper shot, and a final clue in Irish that only Niamh can read.',
    title: 'The Flag',
    difficulty: 'Push yourself',
    blurb: 'The last clue leads to Mr Doyle himself, and a gift for the prison. Both teams, one finish line.',
    place: { name: 'Victoria Quay, Fremantle', lat: -32.0530, lng: 115.7430 },
    loop: line('ct-niamh', 'A loop! Every trail comes home.'),
    early: line('ct-niamh', 'Stop there, all good. Come for the party later.'),
    open: { scene: 'festival', chapter: 'Victoria Quay', text: 'Victoria Quay, Fremantle, at sunset. A crowd, a stage, a fiddle band tuning up, and the smell of fish and chips. Start with an easy walk or jog.' },
    steps: [
      say('ct-niamh', '[curious] Niamh here. The Irish words say, where the six sailed past at last, the old man waits with the green and gold.'),
      say('ct-grace', 'Green and gold. A flag? But where did they sail past at last?'),
      quiz('ct-niamh', 'Warm up. Where did the Catalpa finally arrive, in August 1876?', ['New York', 'Dublin', 'Sydney'], 'New York, four months after the escape. A very long trip to freedom.'),
      say('ct-dec', 'Here is an idea. Let’s do the last bit together. One big team. Shall we?'),
      say('ct-grace', '[laughs] Fine. But we are still counting it as our win.'),
      dash(30, 'To the end of the quay! Pick it up for 30 seconds together!', { chapter: 'The quay', fx: 'whoosh' }),
      say(null, 'At the end of the quay, the ship channel opens to the sea. Past here, ships leave Fremantle for the world. Just like the Catalpa did.', { spatial: 'boat' }),
      say('ct-doyle', '[laughs] Well done, all of you. Mr Doyle. Retired teacher. Professional hider of potatoes. You found me.'),
      quiz('ct-doyle', 'My question. What was the date of the escape?', ['17 April 1876', '25 December 1900', '1 May 1829'], 'The 17th of April 1876. I have been waiting all year to ask somebody that.'),
      say('ct-doyle', 'Now. The green and gold. My students made a copy of a flag from the time, for the prison museum. It is in my van. Who wants to carry it?'),
      choice('ct-niamh', 'carry', 'Who carries the flag to the stage? Grace, or Declan?',
        { label: 'Grace', line: 'Grace! She has read every book. Twice.', dash: 'Grace has the flag! Pick it up for 30 seconds beside her!', after: 'Grace runs ahead with the flag streaming behind her, grinning so wide it nearly falls off her face.' },
        { label: 'Declan', line: 'Declan! He asked for help. That counts.', dash: 'Declan has the flag! Pick it up for 30 seconds beside him!', after: 'Declan runs ahead with the flag held high, very politely saying excuse me to everybody he passes.' },
        'Grace, then. Go!'),
      steady('Settle into an easy pace as the crowd gathers round the stage.', { chapter: 'The stage' }),
      say(null, 'The fiddle band strikes up. On the stage, the flag is hung beside a painting of a tall ship with three masts, sailing for the horizon.', { fx: 'brassfanfare', spatial: 'chatter' }),
      quiz('ct-grace', 'What was the escaped men’s Irish movement called?', ['The Fenians', 'The Vikings', 'The Normans'], 'The Fenians. They wanted Ireland to rule itself.'),
      say('ct-niamh', 'Runner, both teams finished. Mr Doyle says that makes everyone a winner. The prize is free tours for life. And fruit cake.'),
      dash(45, 'Victory lap! Pick it up for 45 seconds along the quay with everyone!', { chapter: 'Victory lap', fx: 'whistle' }),
      say('ct-wal', '[laughs] I brought one last potato. No tag on this one. It is just a potato. For dinner.'),
      steady('Cool down with an easy jog or a walk while the band plays on.', { scene: 'harbour', chapter: 'Home' }),
      quiz('ct-niamh', 'Last one, Runner. Fremantle Prison became World Heritage in which year?', ['2010', '1910', '1991'], 'In 2010, with other convict sites around Australia. Come back and do the tour.'),
    ],
    finale: 'The Catalpa Run is complete. Five clues, two teams, one flag, and a lot of potatoes. Go raibh maith agat, thank you, Runner.',
  }),
]

export const CHAIN = ['catalpa-prison', 'catalpa-roundhouse', 'catalpa-rockingham', 'catalpa-georgette', 'catalpa-flag']

export const CAST = {
  'catalpa-narrator': { name: 'Narrator', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 0.95, rate: 0.98 }, // Amelia
  'ct-niamh': { name: 'Niamh', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.08, rate: 1.04, radio: true }, // Eva, in your earbuds
  'ct-grace': { name: 'Grace', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.2, rate: 1.06 }, // Emily
  'ct-dec': { name: 'Declan', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 1.0, rate: 1.0 }, // Simon
  'ct-wal': { name: 'Wal', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.85, rate: 0.98 }, // Jimbo
  'ct-tommo': { name: 'Tommo', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.95, rate: 1.02 }, // Scotty
  'ct-skip': { name: 'Skipper', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.85, rate: 1.0, radio: true }, // Lee, on the boat radio
  'ct-doyle': { name: 'Mr Doyle', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.75, rate: 0.94 }, // Peter Michael, lower
}

export const LOOK = { accent: '#4FB3E8', deep: '#0D1B33', tag: 'True escape' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
