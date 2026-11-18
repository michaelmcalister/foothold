// The Breakwall: a treasure trail along the Newcastle waterfront. Tegan runs
// a coffee van at Nobbys. All week, someone has tied little brass tags to it,
// each with a number and a riddle. You follow them from the Bogey Hole, past
// Fort Scratchley and along the old convict pier to Nobbys, and the trail
// ends in a birthday surprise. Nobody is hurt, the runner stays on paths and
// lookouts above the water, and nobody goes into the fort's tunnels.
//
// Pure data, laid out with compose.js. Sounds reuse existing scenes.
//
// Facts checked (web search, November 2026):
//   - the Bogey Hole was cut from a rock platform by convicts for Commandant
//     James Morisset, about 1819 to 1820, for his own use, and first called
//     the Commandant's Baths (NSW Government, Bogey Hole page; State Heritage
//     Inventory, item 5053928)
//   - it passed to Newcastle Borough Council for public use in 1863 and was
//     enlarged to seven times its first size in 1884; it is the first
//     recorded European purpose built ocean pool on the NSW coast (State
//     Heritage Inventory, item 5053928)
//   - Macquarie Pier, built by convicts to join Nobbys to the mainland, was
//     begun in 1818 and finished in 1846, 28 years later; stone quarried from
//     the headland in 1836 went into the pier and left it about 27 metres
//     high; the lighthouse was founded on a platform cut into the rock in
//     1857 (Port Authority of NSW, Nobbys Headland)
//   - the Awabakal people called the headland Whibayganba; colonists called
//     it Coal Island, then Nobbys; it was cut down because sailing ships lost
//     the wind rounding it; the lighthouse is on Newcastle's coat of arms
//     (Nobbys Head, Wikipedia; Port Authority of NSW)
//   - Fort Scratchley is named after Lieutenant Colonel Peter Scratchley, who
//     designed it; its tunnels were dug in 1881 and 1882, about 600 metres of
//     them; on 8 June 1942 its guns fired four rounds back at a Japanese
//     submarine (Visit Newcastle, 6 things about Fort Scratchley)
//
// Sources:
//   https://www.nsw.gov.au/visiting-and-exploring-nsw/locations-and-attractions/bogey-hole
//   https://apps.environment.nsw.gov.au/dpcheritageapp/ViewHeritageItemDetails.aspx?ID=5053928
//   https://www.portauthoritynsw.com.au/around-ports/newcastle-harbour/see-and-do/nobbys-headland
//   https://en.wikipedia.org/wiki/Nobbys_Head
//   https://visitnewcastle.com.au/insider-guides/6-things-that-will-blow-you-away-about-fort-scratc
//
// Real people (Morisset, Scratchley, Macquarie) are only mentioned, never
// voiced. The tags, the van and everyone with lines are made up.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('bw-tegan', '[excited] Faster than a southerly! Ease right back now.'),
  okay: line('bw-tegan', 'You got there, and that is what counts. Ease right back now.'),
  half: line('bw-tegan', 'Halfway! Keep it rolling!'),
}
const EASY = line('bw-tegan', 'Easy now. The breakwall is long, and the sea is in no hurry.')
const base = { saga: 'breakwall', guide: 'bw-tegan', results: RESULTS, easy: EASY, difficulty: 'Steady effort' }

export const SAGA = {
  id: 'breakwall',
  title: 'The Breakwall',
  blurb: 'Brass tags keep turning up on a coffee van at Nobbys, each with a number and a riddle. Follow them along the Newcastle waterfront.',
  note: 'Real Newcastle places and true convict and harbour history. The tags, the van and the people are made up. Stay on the paths and out of the surf.',
  narrator: 'breakwall-narrator',
  score: 'locals',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'breakwall-tags',
    episode: 1,
    next: 'Next time on The Breakwall: a light that blinks from Fort Scratchley after dark. Short, short, long. And nobody will say who.',
    title: 'The Brass Tags',
    blurb: 'Someone keeps tying brass tags to Tegan’s coffee van, each with a number and a riddle. Follow them from the Bogey Hole to Nobbys.',
    place: { name: 'The Bogey Hole, Newcastle', lat: -32.9327, lng: 151.7826 },
    loop: line('bw-tegan', 'A loop! Like the tide. Out, and back again.'),
    early: line('bw-tegan', 'Stop there, no worries. The tags are not going anywhere.'),
    open: { scene: 'surfdawn', chapter: 'King Edward Park', text: 'Newcastle, just after dawn. The grass of King Edward Park runs down to the cliffs, and the sea below is busy and bright. Start with an easy walk or jog.' },
    steps: [
      say(null, 'This is Awabakal Country. Out past the harbour mouth, the headland the Awabakal call Whibayganba catches the first light.'),
      say('bw-tegan', 'Morning! Tegan here. I run the coffee van at Nobbys. Every day this week, someone has tied a little brass tag to my van. Each one has a number.'),
      say('bw-tegan', '[curious] Today’s says 1819. And under it, where the Commandant swam. My regulars reckon it is a riddle. I reckon I need a runner.'),
      quiz('bw-tegan', 'Newcastle has a pool cut into the rock by convicts. Who was it cut for?', ['The Commandant', 'The Governor', 'The King'], 'Commandant James Morisset, for his own use. People first called it the Commandant’s Baths.'),
      dash(30, 'To the Bogey Hole lookout! Pick it up for 30 seconds!', { chapter: 'The Bogey Hole', fx: 'whoosh' }),
      say(null, 'From the path above, you look down on the Bogey Hole. A pool cut into the rock around 1820. Waves spill over its edge and drain away.', { spatial: 'kookaburra' }),
      say('bw-bev', '[laughs] Morning, love! Bev. I have swum here most mornings for sixty years. Looking for a tag? There is one on the handrail. Tied with fishing line.'),
      quiz('bw-bev', 'Bev’s question. The Bogey Hole opened for everyone to use in which year?', ['1863', '1763', '1963'], 'In 1863. Then in 1884 the council made it seven times bigger. Plenty of room for me.'),
      say('bw-tegan', 'Read me the tag? It says 1846. And under it, the wall that took the convicts a long time to finish.'),
      quiz('bw-tegan', 'Puzzle. Macquarie Pier was begun in 1818 and finished in 1846. How many years did it take?', ['Twenty eight', 'Eighteen', 'Forty six'], 'Twenty eight years of convict work, to join Nobbys to the mainland. That wall is the breakwall.'),
      choice('bw-tegan', 'way', 'To the breakwall! Along the beach path, or up past the old fort on the hill?',
        { label: 'Along the beach path', line: 'Beach path! Sea spray and surfers.', dash: 'Along the beach path! Pick it up for 30 seconds!', after: 'Along the beach path, surfers paddle out past the rocks, and gulls hang still in the wind above the waves.' },
        { label: 'Up past the old fort', line: 'The fort! Big guns, long views.', dash: 'Up past the fort! Pick it up for 30 seconds!', after: 'Past Fort Scratchley, old guns point out to sea, and the whole harbour mouth opens out below you.' },
        'Beach path, then. Go!'),
      steady('Settle into an easy pace along the harbour while Tegan reads the tags out again.', { chapter: 'The harbour' }),
      quiz('bw-tegan', 'Fort Scratchley sits above the harbour. When were its tunnels dug?', ['The 1880s', 'The 1780s', 'The 1980s'], 'In 1881 and 1882. About 600 metres of tunnels under the hill. Strictly for the tour guides.'),
      say(null, 'At the start of the breakwall, a third brass tag hangs from the bike rack. It says 27, with a tiny drawing of a lighthouse.', { fx: 'found' }),
      quiz('bw-tegan', 'Nobbys was cut down so sailing ships kept the wind in their sails. About how tall is it now?', ['About 27 metres', 'About 270 metres', 'About 2 metres'], 'The rock they cut away went into the pier. Recycling, 1830s style.'),
      dash(45, 'The sun is right up! Pick it up for 45 seconds along the breakwall to Nobbys!', { chapter: 'Nobbys', fx: 'horn' }),
      say(null, 'A coal ship slides out through the harbour mouth. By the gate to the lighthouse path, a kid in a big hoodie sits on a backpack, waving a tag.', { spatial: 'boat' }),
      say('bw-kai', '[excited] You found them all! I am Kai. It is Nan’s birthday today. Nan is Bev. I wanted her to walk the old way to her surprise.'),
      say('bw-bev', '[laughs] Kai! You little rascal. So that is where my fishing line went.'),
      say('bw-tegan', 'And the van? Birthday coffee for Bev, on the house. Kai already paid. In brass tags.'),
      steady('Cool down with an easy jog or a walk back along the harbour.', { scene: 'harbour', chapter: 'Home' }),
      quiz('bw-tegan', 'Last one. Newcastle’s coat of arms shows Nobbys. What stands on top of it?', ['A lighthouse', 'A windmill', 'A castle'], 'The lighthouse on Nobbys, founded in 1857 on a platform cut into the rock.'),
      say('bw-tegan', '[curious] One more thing. Bev just told me. Some nights, a light blinks from the fort on the hill. Short, short, long. Nobody knows who.'),
    ],
    finale: 'The Brass Tags are solved. Three tags, one birthday, and a nan who swims with the waves. But who blinks a light at the fort? Thanks, Runner.',
  }),
]

export const CHAIN = ['breakwall-tags']

export const CAST = {
  'breakwall-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.9, rate: 0.98 }, // Peter Michael
  'bw-tegan': { name: 'Tegan', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.05, rate: 1.04, radio: true }, // Milly, in your earbuds
  'bw-bev': { name: 'Bev', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 0.8, rate: 0.95 }, // Eva, older
  'bw-kai': { name: 'Kai', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.2, rate: 1.08 }, // Ziggy, lifted
}

export const LOOK = { accent: '#F2A65A', deep: '#0F2030', tag: 'Treasure trail' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
