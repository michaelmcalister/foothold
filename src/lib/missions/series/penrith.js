// River Town: a local Penrith mystery on the River Run loop by the Nepean.
// On a warm Saturday evening, the heritage murder mystery night at Emu Hall
// goes wrong: the pretend victim, Gus, has really vanished, and so has Toby
// Ryan's old pocket watch. Dot, who runs the night, rings the fastest legs
// on the river. You follow the clues past the Police Cottage, over the
// Yandhai Nepean Crossing and back, with Tash, a teenage paddler on her bike,
// and Kev, a retired sergeant with a coffee. Nobody is hurt: the "blood" is
// beetroot relish, and Gus has slipped away to propose at sunset.
//
// Pure data (series/index.js merges it in). Same beat format as signal.js.
// It borrows sounds that already exist: the river, a party in the next room,
// a gentle rain, and Deep Cover's noir score for the mystery.
//
// Episode 2, The Zig Zag Lanterns: "ghost" lanterns and a whistle on the old
// Lapstone Zig Zag at Glenbrook turn out to be art students painting the
// cutting by lantern light. Episode 3, The Duration: a 1943 letter under a
// St Marys floor leads from the Bennett wagons to the old Ropes Creek
// platform, and a wedding photo of Tash's great grandparents. Their sounds
// come from audio/kits/locals.js. Facts checked (web search, November 2026):
// - Lennox Bridge, 1833, built by convicts for the Scottish stonemason David
//   Lennox; his name and AD 1833 are on the keystones; the oldest surviving
//   stone arch bridge on the mainland; it carried the road for 93 years.
// - The Lapstone Zig Zag (John Whitton), opened 1867, the first zig zag on
//   any main line railway in the world; replaced in 1892. The Knapsack
//   Viaduct later carried the highway until the M4 replaced it in 1993. The
//   old Glenbrook tunnel was used to grow mushrooms. Arthur Streeton's
//   Fire's On shows the tunnel being built.
// - St Marys was first called South Creek; the name came from St Mary
//   Magdalene church (1837 to 1840) and the post office of 1840. Mamre was
//   built around 1830 for Samuel Marsden. The Bennett wagon works was near
//   Queen Street, and three Bennett wagons are at South Creek Park.
// - The munitions factory: over 3,500 workers at its peak, 850 buildings
//   over almost five kilometres, the second largest in Australia; workers
//   lived in Duration Cottages; its rail line ran from 1942 to 1986, and the
//   Ropes Creek platform survives. Lang Park has a memorial garden.
//
// Episode 4, The Orphan Mob: a brass tag found behind Jordan Springs leads to
// the dusk kangaroo count in Wianamatta Regional Park, on the old ADI
// munitions site, and Kev's dad's orphan joey, Duchess. The tag, Duchess
// and the count are made up. Facts checked (web search, November 2026):
// - Wianamatta is the Dharug name for South Creek, meaning mother place
//   (dual named 2003). The Commonwealth resumed the farmland from 1941 to
//   1943 for munitions; buildings were ringed with blast mounds (berms).
//   The new factory (Project 590) opened in 1957; production stopped in
//   1993. The Mine Filling building and berms still stand.
// - From the late 1950s, orphaned eastern greys, red kangaroos and emus
//   raised in Sydney were released on the site; the nearest natural red
//   kangaroos are about 400 km west (Wianamatta Plan of Management).
// - A green and golden bell frog was recorded there in 1966. The ADI
//   Residents Action Group formed in 1993 to save the bush; about 900
//   hectares became the regional park, one of the largest remnants of
//   Cumberland Plain Woodland. The Luxfords trail runs through it.
//
// Facts in the story and the trivia were checked (web search, November 2026):
// - Dharug (Darug) Country. The Dharug name for the river is Yandhai; the
//   Yandhai Nepean Crossing's name means "walking in past and present". The
//   crossing is 200 m long and completes the 7 km River Run loop.
// - Watkin Tench's party reached the river on 27 June 1789. Governor Phillip
//   named it after Evan Nepean, Under Secretary at the Home Office, who did
//   much to organise the First Fleet.
// - Emu Plains: named for the emus seen there (first called Emu Island,
//   renamed by Macquarie in July 1814). Blaxland, Lawson and Wentworth crossed
//   the Nepean on 11 May 1813 to start their crossing of the Blue Mountains.
//   Macquarie set up a convict farm there on 11 September 1819.
// - The first bridge over the Nepean, financed by Toby Ryan, opened in
//   January 1856 and was washed away in 1857; rebuilt, it went again in May
//   1860. Victoria Bridge (John Whitton) opened to trains on 11 July 1867;
//   the June 1867 flood, the worst on record at about 13.4 m, took its
//   approaches. Rail moved to a new bridge in 1907.
// - Emu Hall, on the western bank, was built between 1851 and 1854 for James
//   Tobias (Toby) Ryan: butcher, pastoralist, boxer, racehorse owner, gambler
//   and member for Nepean from 1860 to 1872. Victorian Italianate, with iron
//   lace verandahs. Now privately owned.
// - The Police Cottage at 4 Punt Road, Emu Plains, was built in 1908 as the
//   local police residence. Restored by the council, it reopened as a
//   riverside cafe in 2023 after about 70 years closed.
// - The Arms of Australia Inn at Emu Plains was licensed in 1841 and has been
//   a museum since 1976.
// - Penrith Lakes were sand and gravel quarries. The Regatta Centre hosted
//   Olympic rowing and canoe sprint in 2000; the Whitewater Stadium (opened
//   1999) hosted the canoe slalom.
//
// Real people are only mentioned, never voiced. Every character with lines
// is made up, and the murder mystery night is a game. House rules: tense,
// never cruel, and it ends somewhere warm.

const line = (who, text) => ({ who, text })

const D_WIN = line('pr-dot', '[excited] Lovely running, dear. Ease right back now.')
const D_OKAY = line('pr-dot', 'You got there, and that is what counts. Ease right back now.')
const D_HALF = line('pr-dot', 'Halfway, dear. Keep going.')
const T_WIN = line('pr-tash', '[excited] Yes! You are fast. Ease right back now.')
const T_OKAY = line('pr-tash', 'We made it. Catch your breath. Ease right back now.')
const T_HALF = line('pr-tash', 'Halfway! Keep it up!')
const K_EASY = line('pr-sarge', 'Easy now. Good detectives never rush. Save your legs.')
const T_EASY = line('pr-tash', 'Slow down a bit! Even mysteries need a breather.')

const dash = (at, seconds, who, say, recover, extra = {}) => ({
  at, kind: 'surge', seconds, who, say, recover,
  success: who === 'pr-tash' ? T_WIN : D_WIN,
  okay: who === 'pr-tash' ? T_OKAY : D_OKAY,
  half: who === 'pr-tash' ? T_HALF : D_HALF,
  ...extra,
})

export const SAGA = {
  id: 'penrith',
  title: 'River Town',
  blurb: 'A Penrith mystery on the River Run. The pretend victim at Emu Hall has really vanished, and so has Toby Ryan’s pocket watch.',
  note: 'Real Penrith places and history, with a made up mystery. The trivia is all true.',
  narrator: 'penrith-narrator',
  score: 'deepcover', // the noir score suits a mystery
  isNew: true,
}

export const EPISODES = [
  {
    id: 'penrith-emuhall',
    episode: 1,
    next: 'Next time on River Town: ghostly lanterns on the old Zig Zag railway, and a whistle in the dark at Glenbrook.',
    saga: 'penrith',
    title: 'The Emu Hall Mystery',
    series: 'thriller',
    type: 'surge',
    minutes: 32,
    difficulty: 'Steady effort',
    blurb: 'A murder mystery night at Emu Hall goes off script. Follow the clues along the Nepean, past the Police Cottage and over the Yandhai crossing.',
    place: { name: 'Emu Hall and the River Run, Penrith', lat: -33.7523, lng: 150.6712 },
    loop: line('pr-sarge', 'You ran a loop. Like the River Run. Over one bridge, back over the other. Very tidy.'),
    early: line('pr-dot', 'Stopping there is fine, dear. The mystery will keep. So will the supper.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Saturday evening', scene: 'harbour', say: 'Penrith, on a warm Saturday evening. The Nepean glows orange under Victoria Bridge, and you are out on the River Run. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', spatial: 'bird', say: 'This is Dharug Country. The Dharug name for this river is Yandhai. A rowing eight glides past, and cockatoos squabble in the river gums.' },
      { at: 105, kind: 'story', who: 'pr-dot', fx: 'squelch', say: 'Hello? Is that the runner? Dot Haverly here. I am running the heritage murder mystery night at Emu Hall, across the river. We have a problem.' },
      { at: 165, kind: 'story', who: 'pr-dot', say: 'Our pretend victim, Gus, was meant to faint on the rug at the start of act two. Very dramatic. Instead he has vanished. Properly vanished.' },
      { at: 220, kind: 'story', who: 'pr-dot', say: '[whispers] And Toby Ryan’s pocket watch has gone with him. The family lent it to us for the night. Could you come? You have the fastest legs on the river.' },
      dash(270, 30, 'pr-dot', 'Emu Hall is on the far bank. Pick it up for 30 seconds towards the Yandhai crossing!', 110, { chapter: 'A call from Dot', fx: 'whoosh' }),
      { at: 345, kind: 'story', say: 'Across the water is Emu Plains, named for the emus the first settlers saw. Blaxland, Lawson and Wentworth crossed the river near here in 1813.' },
      { at: 400, kind: 'quiz', who: 'pr-dot', say: 'While you get your breath, dear. Governor Phillip named this river after a man in London. Who was he?',
        options: [{ key: 'A', label: 'Evan Nepean' }, { key: 'B', label: 'Lord Hawkesbury' }, { key: 'C', label: 'Captain Cook' }], answer: 'A',
        right: line('pr-dot', 'Evan Nepean. He helped organise the First Fleet. Watkin Tench’s party reached this river in 1789.'),
        wrong: line('pr-dot', 'It was Evan Nepean. He helped organise the First Fleet. Watkin Tench’s party reached this river in 1789.') },
      { at: 465, kind: 'story', scene: 'gala', fx: 'creak', say: 'Up on its rise, Emu Hall glows, all iron lace and lamplight. Toby Ryan built it in the 1850s. Inside, guests in bonnets and top hats murmur by the fire.' },
      { at: 495, kind: 'story', say: 'Toby Ryan was a butcher, a boxer, a grazier and a racehorse owner. He was also a famous gambler. He built Emu Hall to look across at the town.' },
      { at: 525, kind: 'story', who: 'pr-dot', say: 'The suspects, then. Mrs Pruitt, playing the grazier’s widow. Reg, playing the toll keeper. And the butler, who is really my nephew Darren.' },
      { at: 580, kind: 'story', fx: 'noirstab', say: 'On the verandah, a smear of something red on the boards. A dropped silk top hat. And footprints heading down the garden, towards the river.' },
      { at: 635, kind: 'story', who: 'pr-tash', say: '[excited] Hey! I’m Tash. I paddle at the Whitewater Stadium. I just saw a bloke in a top hat legging it along the river path. With flowers.' },
      { at: 690, kind: 'choice', id: 'path', who: 'pr-tash', say: 'He went towards the old Police Cottage. Follow the river path, or cut straight across Regatta Park?',
        options: [
          { key: 'A', label: 'The river path', flag: 'river', say: line('pr-tash', 'River path. Watch the pelicans. They do not move for anyone.') },
          { key: 'B', label: 'Across the park', flag: 'park', say: line('pr-tash', 'Across the park. I will ride beside you. Mind the sprinklers.') },
        ],
        default: 'B', timeout: line('pr-tash', 'Across the park, then. Come on!') },
      dash(740, 30, 'pr-tash', 'Along the river path! Pick it up for 30 seconds and keep the top hat in sight!', 110, { if: 'river', chapter: 'Top hat', fx: 'footsteps' }),
      dash(741, 30, 'pr-tash', 'Across Regatta Park! Pick it up for 30 seconds and cut him off at the cottage!', 110, { unless: 'river', chapter: 'Top hat', fx: 'footsteps' }),
      { at: 815, kind: 'story', say: 'The Police Cottage sits by the water. It was built in 1908 for the local policeman. Tonight it is a cafe, full of chatter and the smell of coffee.' },
      { at: 870, kind: 'story', who: 'pr-sarge', say: 'Evening. Kev Mallard. Retired sergeant, forty years in uniform. A man in a top hat? Ran past me with a bunch of roses and a lot of nerves.' },
      { at: 925, kind: 'puzzle', who: 'pr-sarge', say: 'One for a detective. The first bridge over the Nepean opened in 1856, and the river washed it away the next year. What year was that?',
        options: [{ key: 'A', label: '1857' }, { key: 'B', label: '1860' }, { key: 'C', label: '1867' }], answer: 'A',
        right: line('pr-sarge', '1857. Toby Ryan paid for that bridge. They rebuilt it, and the river took it again in 1860. It does not like being told what to do.'),
        wrong: line('pr-sarge', 'It was 1857. Toby Ryan paid for that bridge. They rebuilt it, and the river took it again in 1860. It does not like being told what to do.') },
      { at: 990, kind: 'steady', seconds: 160, chapter: 'The clues', say: 'Settle into an easy pace along the bank while Kev thinks it through.', easyNudge: K_EASY },
      { at: 1015, kind: 'story', say: 'Back in 1819, Governor Macquarie set up a convict farm on Emu Plains. Convicts cleared the land and grew wheat and tobacco along these flats.' },
      { at: 1040, kind: 'story', who: 'pr-sarge', say: 'Red stuff on the verandah, you say. Did anyone sniff it? In my day, the stage stuff was always tomato sauce.' },
      { at: 1090, kind: 'story', who: 'pr-dot', fx: 'squelch', say: '[laughs] Kev Mallard, is that you? It is beetroot relish! From the supper table. Darren knocked the jar over. So no murder. Just a mess.' },
      { at: 1145, kind: 'quiz', who: 'pr-sarge', say: 'While we walk. Victoria Bridge, just upstream. It first opened to trains in which year?',
        options: [{ key: 'A', label: '1867' }, { key: 'B', label: '1907' }, { key: 'C', label: '1932' }], answer: 'A',
        right: line('pr-sarge', '1867. That same winter, the worst flood on record took its approaches. The bridge itself stood firm. Still does.'),
        wrong: line('pr-sarge', 'It was 1867. That same winter, the worst flood on record took its approaches. The bridge itself stood firm. Still does.') },
      { at: 1210, kind: 'story', who: 'pr-tash', fx: 'click', say: 'I see him! Top hat, on the Yandhai crossing, halfway over. He is just standing there. Staring at the sunset.' },
      dash(1260, 45, 'pr-tash', 'Go! Pick it up for 45 seconds and get onto that bridge!', 130, { chapter: 'The crossing', fx: 'whoosh' }),
      { at: 1345, kind: 'story', scene: 'harbour', say: 'Halfway across the Yandhai crossing, a nervous man in a top hat is pacing. From the far side, a young woman with a fishing rod walks towards him.' },
      { at: 1368, kind: 'story', say: 'The Yandhai Nepean Crossing is 200 metres long. It closes the 7 kilometre River Run loop. Its Dharug name means walking in past and present.' },
      { at: 1395, kind: 'story', who: 'pr-gus', say: '[whispers] Oh no. Not now. I am fine, I promise. I am proposing. Lou fishes here every Saturday at sunset. It had to be tonight.' },
      { at: 1450, kind: 'story', who: 'pr-gus', say: 'I borrowed the pocket watch for luck. Toby Ryan was a gambler, you know. I thought, why not. It goes straight back after. Promise.' },
      { at: 1500, kind: 'quiz', who: 'pr-gus', say: '[curious] Quick, help me calm down. Toby Ryan built Emu Hall. He was the member of parliament for where?',
        options: [{ key: 'A', label: 'Nepean' }, { key: 'B', label: 'Parramatta' }, { key: 'C', label: 'Bathurst' }], answer: 'A',
        right: line('pr-gus', 'Nepean! For twelve years. Right. Breathe. If Toby could win an election, I can ask one question.'),
        wrong: line('pr-gus', 'It was Nepean, for twelve years. Right. Breathe. If Toby could win an election, I can ask one question.') },
      { at: 1565, kind: 'story', who: 'pr-lou', say: '[curious] Gus? Why are you dressed like a Victorian ghost? Is that a pocket watch? Why are you kneeling on the bridge?' },
      { at: 1615, kind: 'story', who: 'pr-gus', say: 'Louisa. Every Saturday, by this river. Will you marry me?' },
      { at: 1650, kind: 'story', who: 'pr-lou', fx: 'cheer', say: '[laughs] Yes! Obviously yes. Get up, you will ruin the hire trousers.' },
      { at: 1700, kind: 'steady', seconds: 180, chapter: 'Case closed', say: 'Cheers drift over the water from the riverbank. Cool down now with a gentle jog or a walk back over the river.' },
      { at: 1722, kind: 'story', say: 'Up the road, the Arms of Australia Inn has stood since 1841. Coaches stopped there on the way to the mountains. Today it is a museum.' },
      { at: 1755, kind: 'story', who: 'pr-dot', say: 'Case closed, dear. No murder, one engagement, and the watch is back in its box. Best murder mystery night we have ever had.' },
      { at: 1800, kind: 'quiz', who: 'pr-tash', say: 'Before you go. The lakes where I train, up the road. What were they before they were lakes?',
        options: [{ key: 'A', label: 'Sand and gravel quarries' }, { key: 'B', label: 'Dairy farms' }, { key: 'C', label: 'A swamp' }], answer: 'A',
        right: line('pr-tash', 'Sand and gravel quarries! Dug out, then turned into lakes. They raced the Olympic rowing there in 2000.'),
        wrong: line('pr-tash', 'They were sand and gravel quarries, turned into lakes. They raced the Olympic rowing there in 2000.') },
      { at: 1865, kind: 'story', who: 'pr-sarge', say: 'Not bad, Runner. If you ever want a second career, the river town could use a detective. I will buy the coffee.' },
      { at: 1910, kind: 'finale', say: 'The Emu Hall Mystery is solved. Nobody was harmed, the watch is home, and the river town has one more love story. Thank you, Runner.' },
    ],
  },
  {
    id: 'penrith-zigzag',
    episode: 2,
    previously: 'Previously on River Town: a vanished actor, a borrowed pocket watch, and a proposal on the Yandhai crossing.',
    next: 'Next time on River Town: a tin box under a St Marys floor, a letter from 1943, and a love story that never got finished.',
    saga: 'penrith',
    title: 'The Zig Zag Lanterns',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'Lanterns are moving along the old Lapstone Zig Zag railway at night. The trains stopped in 1892. So who is up there?',
    place: { name: 'Lennox Bridge, Glenbrook', lat: -33.7697, lng: 150.6339 },
    loop: line('pr-sarge', 'A loop! Up and back. The old trains would be proud. Well, they went forwards and backwards. Close enough.'),
    early: line('pr-dot', 'That is plenty for tonight, dear. The ghosts will still be there tomorrow.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Lennox Bridge', scene: 'cutting', say: 'Glenbrook, on a cool spring night. You start at the foot of Mitchell’s Pass, beside a small stone bridge over a creek. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', spatial: 'owl', say: 'This is Lennox Bridge. Convicts built it in 1833 for David Lennox, a Scottish stonemason. His name is still carved into the keystone.' },
      { at: 105, kind: 'story', who: 'pr-dot', fx: 'squelch', say: 'Hello, dear, Dot again. The heritage group has a puzzle. Drivers on the M4 keep seeing lanterns moving along the old Zig Zag railway. At night.' },
      { at: 160, kind: 'story', who: 'pr-dot', say: '[whispers] The trains stopped running up there in 1892. Kev says it is a ghost train. Kev says a lot of things.' },
      { at: 215, kind: 'quiz', who: 'pr-sarge', say: 'Kev here. While you warm up. Lennox Bridge is the oldest one of its kind on the Australian mainland. What kind?',
        options: [{ key: 'A', label: 'Stone arch bridge' }, { key: 'B', label: 'Iron bridge' }, { key: 'C', label: 'Timber bridge' }], answer: 'A',
        right: line('pr-sarge', 'A stone arch bridge. It carried the road to the mountains for 93 years. Built to last. Like me.'),
        wrong: line('pr-sarge', 'It is a stone arch bridge. It carried the road to the mountains for 93 years. Built to last. Like me.') },
      dash(280, 30, 'pr-tash', 'Tash here! I can see the lanterns from up the hill! Pick it up for 30 seconds up the old road!', 110, { chapter: 'Lanterns', fx: 'whoosh' }),
      { at: 360, kind: 'story', say: 'The road climbs through dark bush. A boobook calls. Then, up on the hillside, three small orange lights bob along in a line.' },
      { at: 415, kind: 'story', who: 'pr-sarge', say: 'The Lapstone Zig Zag. Same engineer as Victoria Bridge, John Whitton. Trains went up this hill forwards, then backwards, then forwards again.' },
      { at: 470, kind: 'puzzle', who: 'pr-sarge', say: 'It was the first zig zag on any main line railway in the world. What year did it open?',
        options: [{ key: 'A', label: '1867' }, { key: 'B', label: '1901' }, { key: 'C', label: '1932' }], answer: 'A',
        right: line('pr-sarge', '1867. Steam trains puffing back and forth up this hill. Must have been quite a sight.'),
        wrong: line('pr-sarge', 'It opened in 1867. Steam trains puffing back and forth up this hill. Must have been quite a sight.') },
      { at: 535, kind: 'story', fx: 'steamwhistle', say: 'Then, from the dark, a whistle. Long and lonely, echoing off the sandstone. Every hair on your neck stands up.' },
      { at: 590, kind: 'story', who: 'pr-tash', say: '[whispers] Okay. That was not a car. Kev, I take back everything I said about the ghost train.' },
      { at: 640, kind: 'choice', id: 'way', who: 'pr-tash', say: 'Two ways up. The old Zig Zag walking track, or across the Knapsack Viaduct?',
        options: [
          { key: 'A', label: 'The Zig Zag track', flag: 'zigzag', say: line('pr-tash', 'The Zig Zag! Like a real train. Forwards, backwards, forwards.') },
          { key: 'B', label: 'The viaduct', flag: 'viaduct', say: line('pr-tash', 'The viaduct! Big old arches. Come on!') },
        ],
        default: 'A', timeout: line('pr-tash', 'The Zig Zag track, then. Go!') },
      dash(690, 30, 'pr-tash', 'Up the Zig Zag! Pick it up for 30 seconds!', 110, { if: 'zigzag', chapter: 'The climb', fx: 'whoosh' }),
      dash(691, 30, 'pr-tash', 'Over the viaduct! Pick it up for 30 seconds across the old arches!', 110, { unless: 'zigzag', chapter: 'The climb', fx: 'whoosh' }),
      { at: 770, kind: 'story', if: 'zigzag', say: 'The track switches back and forth up the hill, just like the trains did. Old rusty spikes poke out of the dirt.' },
      { at: 771, kind: 'story', unless: 'zigzag', say: 'The Knapsack Viaduct curves across the gully on tall sandstone arches. Later, cars drove over it, right up until the M4 opened in 1993.' },
      { at: 830, kind: 'steady', seconds: 150, chapter: 'The cutting', say: 'Settle into an easy pace through a deep sandstone cutting while Kev gets his breath back.', easyNudge: K_EASY },
      { at: 860, kind: 'story', who: 'pr-sarge', say: 'Fun fact. When the new line opened, the old Glenbrook tunnel was left empty. So someone grew mushrooms in it. True story.' },
      { at: 910, kind: 'quiz', who: 'pr-dot', say: 'That one is true, dear. Here is another. Which famous painter painted the workers building a railway tunnel near here?',
        options: [{ key: 'A', label: 'Arthur Streeton' }, { key: 'B', label: 'Pablo Picasso' }, { key: 'C', label: 'Claude Monet' }], answer: 'A',
        right: line('pr-dot', 'Arthur Streeton! The painting is called Fire’s On. It shows the tunnel being built, right in these hills.'),
        wrong: line('pr-dot', 'It was Arthur Streeton. The painting is called Fire’s On. It shows the tunnel being built, right in these hills.') },
      { at: 980, kind: 'story', who: 'pr-tash', fx: 'found', say: '[excited] Found them! The lanterns! They are on little stands. And there are easels. Lots of easels. Hang on.' },
      dash(1020, 45, 'pr-tash', 'Someone is running off with a lantern! Pick it up for 45 seconds and catch them!', 120, { chapter: 'The painters', fx: 'footsteps' }),
      { at: 1100, kind: 'story', who: 'pr-priya', say: '[laughs] Wait, wait! Sorry! I am Priya, from the art school. We are painting the old cutting by lantern light. Like Streeton did, over a century ago.' },
      { at: 1155, kind: 'story', who: 'pr-priya', say: 'The whistle? That was me, testing a steam whistle sound for our exhibition. I did not think it would echo all the way down the hill.' },
      { at: 1210, kind: 'story', who: 'pr-sarge', say: '[laughs] A ghost train with a speaker. Forty years in the force and I have seen everything now. Dot, case closed.' },
      { at: 1250, kind: 'quiz', who: 'pr-priya', say: 'Before you go. Trains stopped using the Zig Zag when a new line opened through the hill. Which year?',
        options: [{ key: 'A', label: '1892' }, { key: 'B', label: '1867' }, { key: 'C', label: '1955' }], answer: 'A',
        right: line('pr-priya', '1892. Since then it has been all walkers, owls and painters. And now, runners.'),
        wrong: line('pr-priya', 'It was 1892. Since then it has been all walkers, owls and painters. And now, runners.') },
      { at: 1310, kind: 'steady', seconds: 180, chapter: 'Downhill', say: 'The painters wave their brushes. Cool down now with an easy jog or a walk back down the hill to Lennox Bridge.', easyNudge: T_EASY },
      { at: 1340, kind: 'story', who: 'pr-dot', say: 'Priya’s paintings will hang at the Penrith Regional Gallery next month, dear. You are invited. Bring your legs.' },
      { at: 1380, kind: 'quiz', who: 'pr-tash', say: 'Last one! David Lennox carved his name on the bridge, with a year. Which year?',
        options: [{ key: 'A', label: '1833' }, { key: 'B', label: '1788' }, { key: 'C', label: '1901' }], answer: 'A',
        right: line('pr-tash', '1833! You can still read it on the keystone. Same time next week? Dot has found something in St Marys.'),
        wrong: line('pr-tash', 'It says 1833. You can still read it on the keystone. Same time next week? Dot has found something in St Marys.') },
      { at: 1450, kind: 'finale', say: 'The Zig Zag Lanterns is solved. No ghost, one whistle, and a hillside full of paintings. Thank you, Runner.' },
    ],
  },
  {
    id: 'penrith-duration',
    episode: 3,
    previously: 'Previously on River Town: lanterns on the old Zig Zag, a whistle in the dark, and a hillside full of painters.',
    next: 'Next time on River Town: an old brass tag in the bush behind Jordan Springs, a ranger’s dusk count, and a mob of kangaroos with a secret.',
    saga: 'penrith',
    title: 'The Duration',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'A tin box under a St Marys floor holds a letter from 1943 and a tiny key. Follow Nell’s clues from Queen Street to Ropes Creek.',
    place: { name: 'South Creek Park, St Marys', lat: -33.7690, lng: 150.7700 },
    loop: line('pr-tash', 'You closed a loop! Nan says Pop used to run loops round the factory at lunch. Probably to show off.'),
    early: line('pr-dot', 'That will do for today, dear. The letter has waited this long. It can wait a little more.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Queen Street', scene: 'suburb', say: 'St Marys, on a warm Saturday afternoon. Lorikeets screech in the trees along Queen Street. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', spatial: 'lorikeets', say: 'Long before St Marys was a suburb, this was South Creek. Farms lined the water. The name St Marys came later, from a church built around 1840.' },
      { at: 105, kind: 'story', who: 'pr-tash', fx: 'squelch', say: 'Tash here! Big news. My nan was fixing up her old cottage and found a tin box under the floor. Inside, a letter from 1943. And a tiny key.' },
      { at: 160, kind: 'story', who: 'pr-dot', say: 'It is a Duration Cottage, dear. They were built for the munitions workers in the war. Thousands of people worked at the factory here.' },
      { at: 215, kind: 'story', who: 'pr-tash', say: 'The letter is from a girl called Nell, to someone called Jack. It says, meet me where the wagons rest. I will leave the rest for you to find.' },
      { at: 270, kind: 'quiz', who: 'pr-dot', say: 'So where do the wagons rest? Three old Bennett wagons are on show in St Marys. In which park?',
        options: [{ key: 'A', label: 'South Creek Park' }, { key: 'B', label: 'Hyde Park' }, { key: 'C', label: 'Victoria Park' }], answer: 'A',
        right: line('pr-dot', 'South Creek Park. The Bennett works built horse drawn wagons right here, near Queen Street.'),
        wrong: line('pr-dot', 'It is South Creek Park. The Bennett works built horse drawn wagons right here, near Queen Street.') },
      dash(330, 30, 'pr-tash', 'Pick it up for 30 seconds to South Creek Park!', 110, { chapter: 'Where the wagons rest', fx: 'whoosh' }),
      { at: 410, kind: 'story', say: 'Under a shelter in South Creek Park sit the old Bennett wagons. Big wooden wheels and painted rails, built by hand in St Marys.' },
      { at: 465, kind: 'story', who: 'pr-col', say: 'G’day. Col. I help look after these old wagons. Funny thing. My dad kept a note that was left on them in 1944. For a Jack. Never collected.' },
      { at: 520, kind: 'story', who: 'pr-col', say: 'It says: if you are late again, Jack, I will wait where your train comes in. Ropes Creek. That was the munitions line.' },
      { at: 575, kind: 'quiz', who: 'pr-col', say: 'The munitions factory was enormous. About how many buildings did it have?',
        options: [{ key: 'A', label: '850' }, { key: 'B', label: '85' }, { key: 'C', label: '8' }], answer: 'A',
        right: line('pr-col', '850 buildings, spread over almost five kilometres. The second biggest in Australia.'),
        wrong: line('pr-col', 'It had 850 buildings, spread over almost five kilometres. The second biggest in Australia.') },
      { at: 640, kind: 'story', who: 'pr-col', say: 'Over 3,500 people worked there at its peak. Men and women. A special train line carried them in, from 1942.' },
      { at: 700, kind: 'choice', id: 'route', who: 'pr-tash', say: 'To Ropes Creek! Along the creek path, or past Lang Park and the munitions memorial?',
        options: [
          { key: 'A', label: 'The creek path', flag: 'creek', say: line('pr-tash', 'The creek path. Shady. Watch out for ducks.') },
          { key: 'B', label: 'Past Lang Park', flag: 'park', say: line('pr-tash', 'Past Lang Park. I want to say hi to the memorial.') },
        ],
        default: 'B', timeout: line('pr-tash', 'Past Lang Park, then. Come on!') },
      dash(750, 30, 'pr-tash', 'Along the creek! Pick it up for 30 seconds!', 110, { if: 'creek', chapter: 'Ropes Creek', fx: 'whoosh' }),
      dash(751, 30, 'pr-tash', 'Through Lang Park! Pick it up for 30 seconds!', 110, { unless: 'creek', chapter: 'Ropes Creek', fx: 'whoosh' }),
      { at: 830, kind: 'story', if: 'creek', spatial: 'sydneytrain', say: 'The path follows South Creek through the trees. Ducks paddle away. Somewhere nearby, a train rumbles past.' },
      { at: 831, kind: 'story', unless: 'creek', say: 'In Lang Park, a memorial garden thanks the men and women who worked at the munitions factory. Someone has left fresh flowers.' },
      { at: 885, kind: 'steady', seconds: 150, chapter: 'Nell and Jack', say: 'Settle into an easy pace while Tash reads the next part of the letter.', easyNudge: T_EASY },
      { at: 915, kind: 'story', who: 'pr-tash', say: 'Nell writes: Jack drives the munitions train. He is always late. But he always waves. I might marry him, if he ever stops being late.' },
      { at: 975, kind: 'quiz', who: 'pr-sarge', say: 'Kev here, listening in. The munitions train line kept running long after the war. Until which year?',
        options: [{ key: 'A', label: '1986' }, { key: 'B', label: '1945' }, { key: 'C', label: '1960' }], answer: 'A',
        right: line('pr-sarge', '1986. Only a couple of old platforms are left now. Ropes Creek is one of them.'),
        wrong: line('pr-sarge', 'It ran until 1986. Only a couple of old platforms are left now. Ropes Creek is one of them.') },
      { at: 1040, kind: 'story', fx: 'found', say: 'At the old Ropes Creek platform, now among new houses, a small brass plate is screwed to the edge. It reads: N and J, 1944. Always late.' },
      { at: 1095, kind: 'story', who: 'pr-tash', say: '[excited] The key! There is a tiny lock on the plate! Hang on. [laughs] It opens! There is a photo inside. A wedding photo. Nell and Jack!' },
      { at: 1150, kind: 'story', who: 'pr-tash', say: 'Dot. Nell is my great nan’s name. Jack is my great pop. They are my family. Nan has never seen this photo!' },
      dash(1205, 45, 'pr-tash', 'Nan needs to see this right now! Pick it up for 45 seconds back towards Queen Street!', 120, { chapter: 'Home', fx: 'whoosh' }),
      { at: 1290, kind: 'story', who: 'pr-dot', say: '[sighs] Oh, dear. That is the loveliest thing. Eighty years, that photo waited on a railway platform.' },
      { at: 1345, kind: 'quiz', who: 'pr-col', say: 'One for the road. Before it was St Marys, this place was named after its water. What was it called?',
        options: [{ key: 'A', label: 'South Creek' }, { key: 'B', label: 'Ropes Creek' }, { key: 'C', label: 'Nepean' }], answer: 'A',
        right: line('pr-col', 'South Creek! The farms grew up along it because it never ran dry.'),
        wrong: line('pr-col', 'It was South Creek. The farms grew up along it because it never ran dry.') },
      { at: 1405, kind: 'steady', seconds: 180, chapter: 'Cuppa', say: 'Cool down now with an easy jog or a walk back to the cottage, where the kettle is already on.', easyNudge: T_EASY },
      { at: 1430, kind: 'story', who: 'pr-tash', say: 'Nan cried. Then she laughed. Then she said Pop was late to the wedding too.' },
      { at: 1460, kind: 'quiz', who: 'pr-dot', say: 'One more, dear. Samuel Marsden’s old farmhouse near St Marys, built around 1830, has a name. What is it?',
        options: [{ key: 'A', label: 'Mamre' }, { key: 'B', label: 'Emu Hall' }, { key: 'C', label: 'Fernhill' }], answer: 'A',
        right: line('pr-dot', 'Mamre! It is still standing, on Mamre Road. Lots of history around here, dear.'),
        wrong: line('pr-dot', 'It is Mamre. It is still standing, on Mamre Road. Lots of history around here, dear.') },
      { at: 1505, kind: 'story', who: 'pr-sarge', say: 'Some things never change, Runner. Good work. Lovely work.' },
      { at: 1540, kind: 'finale', say: 'The Duration is solved. A letter found, a photo home, and a love story that waited eighty years for a runner. Thank you, Runner.' },
    ],
  },
  {
    id: 'penrith-orphans',
    episode: 4,
    previously: 'Previously on River Town: a letter under a St Marys floor, a brass plate at Ropes Creek, and a wedding photo eighty years late.',
    saga: 'penrith',
    title: 'The Orphan Mob',
    series: 'thriller',
    type: 'surge',
    minutes: 26,
    difficulty: 'Steady effort',
    blurb: 'Behind Jordan Springs, the old munitions site is bush again. Tash finds a brass tag from 1959, and a ranger needs runners for the dusk kangaroo count.',
    place: { name: 'Wianamatta Regional Park, Jordan Springs', lat: -33.7190, lng: 150.7420 },
    loop: line('pr-ranger', 'You ran a loop. Very tidy. The roos do the same thing every evening, you know. Same track, every night.'),
    early: line('pr-dot', 'That is plenty, dear. The mob will still be there tomorrow. They are not going anywhere.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Jordan Springs', scene: 'suburb', say: 'Jordan Springs, late on a summer afternoon. Past the last row of houses, the bush begins. Wianamatta Regional Park. Start with an easy walk or jog.' },
      { at: 50, kind: 'story', spatial: 'kookaburra', say: 'Wianamatta is the Dharug name for South Creek. It means mother place. For fifty years, this bush sat behind a high wire fence.' },
      { at: 105, kind: 'story', who: 'pr-tash', fx: 'squelch', say: 'Tash here! Guess what I found by the Luxfords trail. An old brass tag, all green. It says Red, number 7, 1959. Red what?' },
      { at: 160, kind: 'story', who: 'pr-sarge', say: 'Kev here. Red kangaroo, I reckon. My dad worked at the munitions factory out there. He used to talk about the orphan roos.' },
      { at: 215, kind: 'quiz', who: 'pr-dot', say: 'Here is the puzzle, dear. The nearest wild red kangaroos live a long way west of here. About how far?',
        options: [{ key: 'A', label: 'About 400 km' }, { key: 'B', label: 'About 10 km' }, { key: 'C', label: 'About 4,000 km' }], answer: 'A',
        right: line('pr-dot', 'About 400 km! So how did red kangaroos end up behind Jordan Springs? That is our mystery.'),
        wrong: line('pr-dot', 'It is about 400 km. So how did red kangaroos end up behind Jordan Springs? That is our mystery.') },
      { at: 280, kind: 'story', who: 'pr-ranger', say: 'G’day. Ranger Mick, National Parks. I am doing the dusk count of the roos tonight. Three count points before dark. Want to help?' },
      dash(330, 30, 'pr-tash', 'Count point one is the old blast mounds! Pick it up for 30 seconds!', 110, { chapter: 'The mounds', fx: 'whoosh' }),
      { at: 410, kind: 'story', scene: 'bush', say: 'Grassy hills rise out of the woodland in rows. They are not hills. They are blast mounds, piled round the old explosives buildings in the war.' },
      { at: 465, kind: 'story', who: 'pr-ranger', say: 'The Commonwealth took this land from farmers in the early 1940s, for munitions. Every building got a wall of earth, so one accident could not spread.' },
      { at: 520, kind: 'quiz', who: 'pr-ranger', say: 'After the war, a brand new factory went up out here. Which decade did it open?',
        options: [{ key: 'A', label: 'The 1950s' }, { key: 'B', label: 'The 1920s' }, { key: 'C', label: 'The 1980s' }], answer: 'A',
        right: line('pr-ranger', 'The 1950s! It opened in 1957 and made munitions for decades, until production stopped in 1993.'),
        wrong: line('pr-ranger', 'It was the 1950s. It opened in 1957 and made munitions for decades, until production stopped in 1993.') },
      { at: 585, kind: 'story', spatial: 'magpie', say: 'Through the trees, grey shapes lift their heads. A mob of eastern grey kangaroos, dozens of them, chewing and watching you.' },
      { at: 635, kind: 'story', who: 'pr-ranger', say: '[whispers] Nice and easy. Stay on the track and give them room. Never run at a mob. We count from right here. Thirty two. Good.' },
      { at: 690, kind: 'choice', id: 'route', who: 'pr-tash', say: 'Count point two! Past the old Mine Filling building, or along Ropes Creek?',
        options: [
          { key: 'A', label: 'The old building', flag: 'building', say: line('pr-tash', 'The old building! Spooky. Love it.') },
          { key: 'B', label: 'Along the creek', flag: 'creek', say: line('pr-tash', 'The creek! Listen out for frogs.') },
        ],
        default: 'A', timeout: line('pr-tash', 'The old building, then. Come on!') },
      dash(740, 30, 'pr-tash', 'To the old building! Pick it up for 30 seconds!', 110, { if: 'building', chapter: 'Count point two', fx: 'whoosh' }),
      dash(741, 30, 'pr-tash', 'Along Ropes Creek! Pick it up for 30 seconds!', 110, { unless: 'building', chapter: 'Count point two', fx: 'whoosh' }),
      { at: 820, kind: 'story', if: 'building', say: 'The old Mine Filling building stands in the bush, roof sagging, doorways empty. Swallows dart in and out where workers once clocked on.' },
      { at: 821, kind: 'story', unless: 'building', say: 'Ropes Creek winds through the woodland. A frog chorus starts up. Back in 1966, someone recorded a rare green and golden bell frog out here.' },
      { at: 875, kind: 'steady', seconds: 150, chapter: 'The orphans', say: 'Settle into an easy pace while Mick tells the story of the tag.', easyNudge: K_EASY },
      { at: 905, kind: 'story', who: 'pr-ranger', say: 'Here is the strange part. From the late 1950s, people raised orphaned joeys from all over New South Wales. When they grew too big, they were let go here.' },
      { at: 960, kind: 'story', who: 'pr-sarge', say: '[sighs] Dad did that. A little red joey called Duchess. Mum fed her from a bottle in the laundry. Then one day, Dad drove her out to the factory.' },
      { at: 1015, kind: 'quiz', who: 'pr-dot', say: 'Big birds came too, dear. Which one was let go here, and still lives in the park?',
        options: [{ key: 'A', label: 'Emus' }, { key: 'B', label: 'Ostriches' }, { key: 'C', label: 'Peacocks' }], answer: 'A',
        right: line('pr-dot', 'Emus! Wild emus, right here in Sydney. People still spot them on the trails.'),
        wrong: line('pr-dot', 'It was emus. Wild emus, right here in Sydney. People still spot them on the trails.') },
      { at: 1080, kind: 'story', who: 'pr-tash', fx: 'found', say: '[excited] Mick! Up on the rise! A big one, rusty red, standing tall. Is that a red kangaroo?' },
      { at: 1130, kind: 'story', who: 'pr-ranger', say: '[laughs] It is. Born long after 1959, mind you. But Duchess’s family could still be out here. Reds have lived in this bush ever since.' },
      dash(1180, 45, 'pr-tash', 'Last count point before dark, the lookout! Pick it up for 45 seconds!', 120, { chapter: 'The count', fx: 'whoosh' }),
      { at: 1265, kind: 'story', scene: 'ranges', say: 'At the lookout, the sun slips behind the Blue Mountains. The woodland turns gold, then grey. Shapes move everywhere below.' },
      { at: 1315, kind: 'story', who: 'pr-ranger', say: 'Final count: plenty. Thanks, Runner. In 1993, locals started fighting to save this bush from houses. Without them, none of it would be here.' },
      { at: 1370, kind: 'quiz', who: 'pr-ranger', say: 'The locals won a big chunk of it. Roughly how big is the protected bush here now?',
        options: [{ key: 'A', label: 'About 900 hectares' }, { key: 'B', label: 'About 9 hectares' }, { key: 'C', label: 'About 90,000 hectares' }], answer: 'A',
        right: line('pr-ranger', 'About 900 hectares. One of the biggest patches of Cumberland Plain Woodland left anywhere.'),
        wrong: line('pr-ranger', 'It is about 900 hectares. One of the biggest patches of Cumberland Plain Woodland left anywhere.') },
      { at: 1430, kind: 'steady', seconds: 180, chapter: 'Home', say: 'Cool down now with an easy jog or a walk back towards the lights of Jordan Springs.', easyNudge: T_EASY },
      { at: 1460, kind: 'story', who: 'pr-sarge', say: 'Thanks, Tash. Dad would have loved tonight. Duchess was a real character. She used to steal his toast.' },
      { at: 1500, kind: 'quiz', who: 'pr-tash', say: 'Last one! Wianamatta, the Dharug name for South Creek. What does it mean?',
        options: [{ key: 'A', label: 'Mother place' }, { key: 'B', label: 'Big river' }, { key: 'C', label: 'Red hill' }], answer: 'A',
        right: line('pr-tash', 'Mother place! For a mob of orphans, that is just about perfect.'),
        wrong: line('pr-tash', 'It means mother place. For a mob of orphans, that is just about perfect.') },
      { at: 1560, kind: 'finale', say: 'The Orphan Mob is solved. An old tag, a dusk count, and a bush full of families who found a home. Thank you, Runner.' },
    ],
  },
]

export const CHAIN = ['penrith-emuhall', 'penrith-zigzag', 'penrith-duration', 'penrith-orphans']

export const CAST = {
  'penrith-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.85, rate: 0.98 }, // Peter Michael
  'pr-dot': { name: 'Dot Haverly', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.95, rate: 0.98, radio: true }, // Julieanne, on the phone
  'pr-tash': { name: 'Tash', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.25, rate: 1.08 }, // Milly
  'pr-sarge': { name: 'Kev Mallard', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.98 }, // Jimbo
  'pr-gus': { name: 'Gus', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.95, rate: 1.06 }, // Scotty
  'pr-priya': { name: 'Priya', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 1.1, rate: 1.06 }, // Amelia
  'pr-ranger': { name: 'Ranger Mick', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.9, rate: 0.98, radio: true }, // Lee
  'pr-col': { name: 'Col', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 0.85, rate: 0.98 }, // Simon
  'pr-lou': { name: 'Lou', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.05, rate: 1.04 }, // Emily
}

export const LOOK = { accent: '#F2A65A', deep: '#0E1A1F', tag: 'Local mystery' }

// Episode 1 uses the river and the party; the later ones add a railway
// cutting at night and a suburb at dusk (audio/kits/locals.js).
export const LIBRARY = {
  ambience: {
    cutting: 'A deep sandstone railway cutting in the Blue Mountains bush at night: a cool breeze through gum trees, crickets, water dripping on rock, a boobook owl far away, vast quiet, no music, no voices',
  },
  sfx: {},
  tracks: {},
}
