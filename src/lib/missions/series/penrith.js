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
    saga: 'penrith',
    title: 'The Emu Hall Mystery',
    series: 'thriller',
    type: 'surge',
    minutes: 32,
    difficulty: 'Steady effort',
    blurb: 'A murder mystery night at Emu Hall goes off script. Follow the clues along the Nepean, past the Police Cottage and over the Yandhai crossing.',
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
]

export const CHAIN = ['penrith-emuhall']

export const CAST = {
  'penrith-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.85, rate: 0.98 }, // Peter Michael
  'pr-dot': { name: 'Dot Haverly', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.95, rate: 0.98, radio: true }, // Julieanne, on the phone
  'pr-tash': { name: 'Tash', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.25, rate: 1.08 }, // Milly
  'pr-sarge': { name: 'Kev Mallard', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 0.98 }, // Jimbo
  'pr-gus': { name: 'Gus', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.95, rate: 1.06 }, // Scotty
  'pr-lou': { name: 'Lou', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.05, rate: 1.04 }, // Emily
}

export const LOOK = { accent: '#F2A65A', deep: '#0E1A1F', tag: 'Local mystery' }

// No new recordings: it uses the river, the party and Deep Cover's score.
export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
