// Your Patch: three gentle mysteries set on your own streets. The lines carry
// tokens like {park}, {street} and {suburb}, filled in at the start of the run
// with real names from around you (missions/local.js, worker/nearby.js), so
// the story happens in the park you're running past. Marlo hosts a tiny
// community radio station, Patch FM; Nan Dot knows everything; Pip, ten, has
// a bike and opinions. Nobody is hurt, nothing is real except your streets,
// and the trivia is puzzles, since every suburb is different. Personalised
// lines aren't kept on the server (they name places near you).
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('yp-marlo', '[excited] Live on Patch FM, that was quick! Ease right back now.'),
  okay: line('yp-marlo', 'You got there, and that is what counts. Ease right back now.'),
  half: line('yp-marlo', 'Halfway! The whole street is listening!'),
}
const EASY = line('yp-marlo', 'Easy now. Nobody runs on a slow Sunday in {suburb}.')
const base = { saga: 'yourpatch', guide: 'yp-marlo', results: RESULTS, easy: EASY, difficulty: 'Steady effort', local: true }

export const SAGA = {
  id: 'yourpatch',
  title: 'Your Patch',
  blurb: 'Three little mysteries set on your own streets. The story uses the real names of the parks and streets around you, wherever you run.',
  note: 'Uses the names of nearby parks and streets from OpenStreetMap, looked up from your position rounded to about a kilometre. Everything else is made up.',
  narrator: 'yourpatch-narrator',
  score: 'locals',
  isNew: true,
}

export const EPISODES = [
  compose({
    ...base,
    id: 'yourpatch-kite',
    episode: 1,
    next: 'Next time on Your Patch: a bicycle bell that rings at midnight on {street2}, and nobody can find the bike.',
    title: 'The Lost Kite',
    blurb: 'A red kite is caught high in a tree in your local park, with a note tied to its tail. Patch FM needs a runner.',
    loop: line('yp-marlo', 'A loop! Round the block, like a good neighbour.'),
    early: line('yp-marlo', 'Stop there, no worries. The kite will still be in the tree tomorrow.'),
    open: { scene: 'suburb', chapter: 'Patch FM', text: 'Your own streets, in {suburb}. The same footpaths as always. But today, Patch FM is on air, and something is up. Start with an easy walk or jog.' },
    steps: [
      say('yp-marlo', 'Good morning, {suburb}! Marlo here, on Patch FM, the smallest radio station in the world. Three listeners. Four, now you.'),
      say('yp-marlo', '[curious] News just in. A red kite is stuck high in a tree at {park}. And tied to its tail, a note. Can you take a look?'),
      dash(30, 'To {park}! Pick it up for 30 seconds!', { chapter: '{park}', fx: 'whoosh' }),
      say(null, 'At {park}, a red kite flaps high in a tree, its tail a string of paper bows. A magpie sits beside it, very interested.', { spatial: 'lorikeets' }),
      say('yp-pip', '[excited] Hi! I am Pip. I am ten. That is my kite. Well, my grandad’s kite. He made it. It flew off this morning and I chased it all down {street}.'),
      quiz('yp-marlo', 'Puzzle. The kite string is 30 metres long. Pip let out two thirds of it. How much string was out?', ['20 metres', '10 metres', '30 metres'], 'Twenty metres. High enough to catch a gust, and a tree.'),
      say('yp-nan', '[laughs] Nan Dot here. I live opposite {park}. Pip, love, the note on the tail. What does it say?'),
      say('yp-pip', 'It says, for whoever finds this, look under the bench by {landmark}. Grandad wrote it. He loves a puzzle.'),
      choice('yp-marlo', 'way', 'To {landmark}! Along {street}, or across {park}?',
        { label: 'Along the street', line: 'The street! Wave to the neighbours.', dash: 'Along {street}! Pick it up for 30 seconds!', after: 'Along {street}, a dog barks hello from a front yard, and someone waters their roses and waves.' },
        { label: 'Across the park', line: 'The park! Mind the sprinklers.', dash: 'Across {park}! Pick it up for 30 seconds!', after: 'Across {park}, the grass is wet and bright, and a lorikeet screeches from the top of a gum tree.' },
        'The street, then. Go!'),
      steady('Settle into an easy pace while Nan Dot rings around.', { chapter: '{landmark}' }),
      say(null, 'By {landmark}, under a bench, taped to the slats: a little tin. Inside, a photo of a boy flying the same red kite. And a date, fifty years ago.', { fx: 'found' }),
      say('yp-pip', '[curious] That is Grandad! He was my age! He flew it here, at {park}!'),
      quiz('yp-nan', 'Nan Dot’s puzzle. The photo is fifty years old, and Grandad was ten in it. How old is he now?', ['Sixty', 'Fifty', 'Seventy'], 'Sixty. And still making kites. Some people never grow up. Good.'),
      dash(45, 'Back to the tree! The wind is picking up! Pick it up for 45 seconds!', { chapter: 'The wind', fx: 'whistle' }),
      say(null, 'A gust shakes the tree, and the red kite slips free and drifts down, slow and gentle, right into Pip’s arms. The magpie looks disappointed.'),
      steady('Cool down with an easy jog or a walk back home along {street}.', { scene: 'suburb', chapter: 'Home' }),
      quiz('yp-marlo', 'Last one, for the Patch FM quiz. A kite needs what to fly?', ['Wind', 'Rain', 'Batteries'], 'Wind! And a grandad who knows what he is doing.'),
      say('yp-marlo', 'This is Patch FM, signing off from {suburb}. Thank you, Runner. Same time next week?'),
    ],
    finale: 'The Lost Kite is home. A red kite, a fifty year old photo, and a grandad who planned the whole thing. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'yourpatch-bell',
    episode: 2,
    previously: 'Previously on Your Patch: a red kite in a tree at {park}, a tin under a bench, and Pip’s grandad at ten.',
    next: 'Next time on Your Patch: a time capsule by {water}, and a list of names nobody remembers writing.',
    title: 'The Midnight Bell',
    blurb: 'Every night at midnight, a bicycle bell rings out somewhere on your street. Nobody ever sees the bike.',
    loop: line('yp-marlo', 'A loop! Like a paper run. Every house, then home.'),
    early: line('yp-marlo', 'Stop there, all good. The bell will ring again tonight.'),
    open: { scene: 'suburb', chapter: '{street2}', text: 'Your streets again, in {suburb}, early in the evening. Porch lights coming on, the smell of someone’s barbecue. Start with an easy walk or jog.' },
    steps: [
      say('yp-marlo', 'Patch FM, live from {suburb}. Our listener mailbag has one letter this week. It says, who rings a bike bell on {street2} every night at midnight?'),
      say('yp-nan', '[sighs] Nan Dot. It is true. Ding ding. Every night. I have looked out the window a hundred times. No bike. No rider. Just the bell.'),
      quiz('yp-marlo', 'Puzzle. The bell rings twice a night, every night, for a week. How many dings?', ['Fourteen', 'Seven', 'Twenty one'], 'Fourteen dings. Nan Dot counted every one. She has a notebook.'),
      dash(30, 'To {street2}! Pick it up for 30 seconds!', { chapter: '{street2}', fx: 'whoosh' }),
      say(null, 'On {street2}, the houses are quiet. A cat watches from a letterbox. In one front yard, a little bike leans on a fence, with a shiny silver bell.', { spatial: 'car' }),
      say('yp-pip', 'Pip here! That is not my bike. Mine is red. That one is tiny. With training wheels.'),
      say('yp-marlo', '[curious] Training wheels. A tiny bike. Hmm. Who on {street2} is just learning to ride?'),
      choice('yp-marlo', 'ask', 'Who do we ask? Nan Dot’s notebook, or knock on the door, politely?',
        { label: 'Nan Dot’s notebook', line: 'The notebook! Nan Dot knows everything.', dash: 'Back to Nan Dot’s! Pick it up for 30 seconds!', after: 'Nan Dot’s notebook says, new family at number twelve, moved in last month, little girl, very shy. Of course.' },
        { label: 'Knock politely', line: 'Knock knock. Politely. With a smile.', dash: 'To the front door! Pick it up for 30 seconds!', after: 'A dad opens the door, a little girl peeking from behind his legs. She is holding a bike helmet. With stars on it.' },
        'The notebook, then. Go!'),
      steady('Settle into an easy pace while Marlo talks to the family.', { chapter: 'Number twelve' }),
      say('yp-dad', '[laughs] Sorry! That is Mia. She is four. She is too shy to ride when people are watching. So she rings her bell from her bedroom window at bedtime. To practise.'),
      say('yp-pip', '[excited] I can teach her! I learned on {street}! You just have to look ahead, not down.'),
      quiz('yp-pip', 'Pip’s puzzle. Mia rides 10 metres today, then twice as far each day. How far on day three?', ['40 metres', '30 metres', '20 metres'], 'Forty metres! Ten, then twenty, then forty. By the weekend she will be in {park}.'),
      dash(45, 'Mia’s first ride, with nobody watching except you! Pick it up for 45 seconds alongside, at a respectful distance!', { chapter: 'First ride', fx: 'bellring' }),
      say(null, 'Mia wobbles, then rolls, then grins. Ding ding! The whole of {street2} hears it. This time, everyone can see who rang.', { fx: 'found' }),
      steady('Cool down with an easy jog or a walk past the porch lights.', { chapter: 'Home' }),
      quiz('yp-marlo', 'Last one. Why does a bike bell matter on a shared path?', ['So people know you’re coming', 'It makes you faster', 'For good luck'], 'So people know you are coming. Ding ding means hello, coming past. Polite and safe.'),
    ],
    finale: 'The Midnight Bell is solved. One shy four year old, one patient ten year old teacher, and a street that cheers. Thanks, Runner.',
  }),
  compose({
    ...base,
    id: 'yourpatch-capsule',
    episode: 3,
    previously: 'Previously on Your Patch: a bell at midnight on {street2}, and Mia’s first ride, with the whole street cheering.',
    title: 'The Time Capsule',
    difficulty: 'Push yourself',
    blurb: 'Workers digging near the water find an old time capsule. Inside, a list of names, and a promise to come back.',
    loop: line('yp-marlo', 'A loop! Like a promise. You come back round.'),
    early: line('yp-marlo', 'Stop there, all good. The capsule has waited this long.'),
    open: { scene: 'suburb', chapter: '{water}', text: 'Your streets in {suburb}, on a bright Saturday morning. Everyone is out. Something is happening down by {water}. Start with an easy walk or jog.' },
    steps: [
      say('yp-marlo', '[excited] Patch FM, special bulletin! Workers digging near {water} have found a time capsule! A steel box, sealed, buried years ago!'),
      say('yp-nan', 'Nan Dot here. Oh my. I think I know that box. Run down and see, would you? My knees say no. My heart says hurry.'),
      dash(30, 'Down to {water}! Pick it up for 30 seconds!', { chapter: '{water}', fx: 'whoosh' }),
      say(null, 'By {water}, a small crowd has gathered round a muddy steel box. The lid has a date painted on it, and the words, open in fifty years.', { spatial: 'lorikeets' }),
      quiz('yp-marlo', 'Puzzle. The box says open in fifty years. It was buried in 1976. Which year is it due?', ['2026', '2016', '2036'], 'Twenty twenty six. This year! Right on time.'),
      say('yp-pip', 'Pip here! Can we open it? Please? I have been good all week. Mostly.'),
      say(null, 'Inside: a cassette tape, a footy card, drawings, and a list of names, written in careful children’s handwriting. Class 4D.', { fx: 'found' }),
      say('yp-nan', '[sighs] Class 4D. That was my class. I was the teacher. That is my handwriting at the top. Dorothy. Nan Dot.'),
      quiz('yp-nan', 'Nan Dot’s puzzle. There are 28 names. Half the class were girls. How many boys?', ['Fourteen', 'Twelve', 'Sixteen'], 'Fourteen. Every one of them a handful. Every one of them lovely.'),
      choice('yp-marlo', 'find', 'Patch FM wants to find Class 4D. Read the names on air, or put a notice up at {landmark}?',
        { label: 'Read them on air', line: 'On air! All three listeners will hear.', dash: 'Back to the Patch FM studio! Pick it up for 30 seconds!', after: 'Marlo reads every name. Within an hour, the phone rings. And rings. And rings. Class 4D grew up, and some of them never left {suburb}.' },
        { label: 'Notice at the landmark', line: 'A notice! Old school, like Nan Dot.', dash: 'To {landmark}! Pick it up for 30 seconds!', after: 'The notice goes up at {landmark}. By afternoon, a crowd of grown ups stands round it, pointing at their own names and laughing.' },
        'On air, then. Go!'),
      steady('Settle into an easy pace while Class 4D starts to arrive.', { chapter: 'Class 4D' }),
      say('yp-pip', '[excited] Nan Dot! My grandad is on the list! The kite grandad! He is in Class 4D!'),
      say('yp-nan', '[laughs] Of course he is. He drew a red kite in the capsule. Look. Fifty years ago. He always loved that kite.'),
      quiz('yp-marlo', 'Pip’s grandad was ten in Nan Dot’s class, fifty years ago. How old is he now?', ['Sixty', 'Fifty', 'Forty'], 'Sixty! The same grandad, the same kite, the same patch. Some stories go in circles.'),
      dash(45, 'Class 4D is having a reunion picnic at {park}! Pick it up for 45 seconds to get there!', { chapter: 'The reunion', fx: 'brassfanfare' }),
      say(null, 'At {park}, grown ups and their kids sit on picnic rugs. Pip’s grandad flies the red kite. Mia rings her bell. Nan Dot reads the class roll, one last time.', { spatial: 'kids' }),
      steady('Cool down with an easy jog or a walk home through {suburb}.', { scene: 'suburb', chapter: 'Home' }),
      quiz('yp-marlo', 'Last one, for the season. What did Class 4D promise on the capsule lid?', ['To open it in fifty years', 'To never open it', 'To bury it twice'], 'To open it in fifty years. And they did. Promises kept, on your patch.'),
    ],
    finale: 'Your Patch is complete. A kite, a bell and a time capsule, all on your own streets. This is Patch FM, signing off. Thank you, Runner.',
  }),
]

export const CHAIN = ['yourpatch-kite', 'yourpatch-bell', 'yourpatch-capsule']

export const CAST = {
  'yourpatch-narrator': { name: 'Narrator', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.95, rate: 0.98 }, // Lee
  'yp-marlo': { name: 'Marlo', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 1.0, rate: 1.04, radio: true }, // Scotty, on Patch FM
  'yp-nan': { name: 'Nan Dot', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.82, rate: 0.95 }, // Julieanne, older
  'yp-pip': { name: 'Pip', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.3, rate: 1.08 }, // Emily, lifted
  'yp-dad': { name: 'Mia’s dad', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 1.0, rate: 1.0 }, // Simon
}

export const LOOK = { accent: '#FFD166', deep: '#1F2A1A', tag: 'On your streets' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
