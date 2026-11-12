// The Gathering: the finale of the Summer of Stories (src/lib/storySeason.js).
// One episode, run anywhere. Each guide keeps their own voice's feel, with a
// few swapped so ten people on one radio channel are easy to tell apart. The ten guides from the Australia wide series
// (Kirra in Hobart, Jade in Warrnambool, Niamh in Fremantle, Lila in Boulia,
// Rosie in Coober Pedy, Amira in Darwin, Ash in Canberra, Sunny in the Blue
// Mountains, Tess on the Hawkesbury, Cass on the goldfields) each get the
// same parcel: a tin with a map of Australia and ten pins. Each pin is one of
// their stories. Together, by radio, they relay a riddle round the country,
// with the runner as the one who carries it, and open a "vault" that turns
// out to hold a thank you from every town. Unlocks when the community hits
// the season's goal, or on the finale weekend, whichever comes first.
// Nobody is hurt; everyone is made up; the trivia comes from the ten series,
// whose sources are in their own files.
import { line, say, quiz, dash, steady, choice, compose } from './compose.js'

const RESULTS = {
  success: line('ga-kirra', '[excited] The whole country felt that one! Ease right back now.'),
  okay: line('ga-kirra', 'You made it, and that is what counts. Ease right back now.'),
  half: line('ga-kirra', 'Halfway! Ten towns are cheering!'),
}
const EASY = line('ga-kirra', 'Easy now. This is a relay. Save some for the last leg.')

export const SAGA = {
  id: 'gathering',
  title: 'The Gathering',
  blurb: 'The finale of the Summer of Stories. Ten guides, ten towns, one parcel each, and you carry the riddle round Australia.',
  note: 'The finale. Unlocks when the community reaches the season goal, or on the finale weekend. Run it anywhere.',
  narrator: 'gathering-narrator',
  score: 'velocity',
  isNew: true,
  finale: true,
}

export const EPISODES = [
  compose({
    id: 'gathering-finale',
    episode: 1,
    saga: 'gathering',
    title: 'Ten Pins',
    difficulty: 'Push yourself',
    blurb: 'Ten guides each get the same tin with a map of Australia and ten pins. Carry the riddle round the country, by radio, and open the vault.',
    loop: line('ga-kirra', 'A loop! Like going round Australia. Out and all the way back.'),
    early: line('ga-kirra', 'Stop there, no worries. The vault will keep. Ten towns say thanks anyway.'),
    guide: 'ga-kirra', results: RESULTS, easy: EASY,
    open: { scene: 'city', chapter: 'The parcel', text: 'Wherever you are, the finale starts here. Ten guides, ten towns, one radio channel, and you. Start with an easy walk or jog.' },
    steps: [
      say('ga-kirra', 'Kirra here, in Hobart. Something arrived at the lab this morning. A tin. Inside, a map of Australia with ten pins in it.'),
      say('ga-jade', '[curious] Jade here, Warrnambool. I got one too! Same tin, same map, same ten pins. Who sends tins?'),
      say('ga-rosie', 'Rosie, Coober Pedy. Me too. It came down the mine road in the mail truck. Nonno says it smells like fruit cake.'),
      say('ga-kirra', 'Ten of us, ten tins. Each pin is one of our towns. And on the lid it says, carry the riddle round, and the vault will open.'),
      quiz('ga-kirra', 'Warm up, from Hobart. Which animal is on Tasmania’s coat of arms?', ['The thylacine', 'The wombat', 'The platypus'], 'Two tigers, holding up the shield. Pin number one.'),
      dash(30, 'First leg! Carry the riddle to Warrnambool! Pick it up for 30 seconds!', { chapter: 'Leg one', fx: 'whoosh' }),
      say('ga-jade', 'Got it! The riddle says, I lie in the dunes, I live in the stories. Easy. The Mahogany Ship. Pin two. Over to Fremantle!', { spatial: 'boat' }),
      say('ga-niamh', 'Niamh, Fremantle! Lovely. Our question for you, Runner.'),
      quiz('ga-niamh', 'In 1876, how many prisoners escaped on the Catalpa?', ['Six', 'Sixteen', 'Sixty'], 'Six! Pin three. Now, all the way up to the Top End. Amira?'),
      say('ga-amira', 'Amira, Darwin, in the shade, thank goodness. The riddle has changed. It says, now go where the light floats.'),
      say('ga-lila', '[excited] Lila, Boulia! That is us! The Min Min! Pin five. I had to say that. I have waited all season.'),
      quiz('ga-lila', 'What kind of mirage might explain the Min Min light?', ['A Fata Morgana', 'A rainbow', 'A comet'], 'A Fata Morgana. Cold air bending far lights into view. Maybe. Pin five is in.'),
      choice('ga-kirra', 'route', 'The riddle splits! Carry it south to the goldfields first, or east to the capital?',
        { label: 'South to the goldfields', line: 'Goldfields! Cass is ready with a shovel.', dash: 'South to the goldfields! Pick it up for 30 seconds!', after: 'On the goldfields, Cass holds up her tin. Inside the lid, someone has scratched a tiny nugget. Pin six.' },
        { label: 'East to Canberra', line: 'Canberra! Ash has the map out already.', dash: 'East to Canberra! Pick it up for 30 seconds!', after: 'In Canberra, Ash lines the tin map up with the land axis. A pin glows in the light. Pin six.' },
        'The goldfields, then. Go!'),
      steady('Settle into an easy pace while the radio channel fills with ten very excited voices.', { chapter: 'The middle legs' }),
      say('ga-cass', 'Cass, Moliagul. The Welcome Stranger was found three centimetres down. So is the next clue. Under the tin’s false bottom!'),
      say('ga-ash', 'Ash, Canberra. Under the false bottom, a code. Fifty three, and six. The bells and the notes! The vault opens with fifty nine.'),
      quiz('ga-ash', 'In The Griffin Code, what did fifty three bells and six notes add up to?', ['Fifty nine', 'Sixty six', 'Ninety'], 'Fifty nine. Ten tins, one combination. Somebody planned this carefully.'),
      say('ga-sunny', 'Sunny, Blue Mountains! Pin eight is ours. And the last two pins point to one place. The Hawkesbury.'),
      say('ga-tess', '[laughs] Tess, on the ferry. Pin nine and pin ten. Both on the river. Both on one tiny island. Dangar Island. The vault is here.'),
      dash(45, 'The last leg! Carry the riddle home to the river! Pick it up for 45 seconds!', { chapter: 'The last leg', fx: 'brassfanfare', spatial: 'crowdwave' }),
      say(null, 'On Dangar Island, by the wharf, sits an old green letterbox with a combination lock. Tess turns the dial. Five. Nine. It clicks open.', { fx: 'found' }),
      say('ga-tess', '[sighs] It is full of letters. From every town. Hobart, Warrnambool, Fremantle, Boulia, Coober Pedy, Darwin, Canberra, Katoomba, Moliagul, Brooklyn.'),
      say('ga-kirra', 'They all say the same thing, in different words. Thank you for running our stories. Thank you for coming back. See you next season.'),
      steady('Cool down with an easy jog or a walk, and listen to the radio channel cheer.', { chapter: 'The vault' }),
      quiz('ga-kirra', 'Last one, from all of us. How many pins were on the map?', ['Ten', 'Five', 'A hundred'], 'Ten pins, ten towns, ten stories. And one runner who carried them all. You.'),
      say('ga-rosie', '[laughs] Nonno says the fruit cake smell was the letters. Every town baked one. We are going to need a bigger mail truck.'),
    ],
    finale: 'The Gathering is complete. Ten pins, ten towns, one vault, and a summer of stories carried by you. Thank you, Runner. See you next season.',
  }),
]

export const CHAIN = ['gathering-finale']

export const CAST = {
  'gathering-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.9, rate: 0.98 }, // Peter Michael
  'ga-kirra': { name: 'Kirra', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.1, rate: 1.04, radio: true }, // Ruby, as in The Last Tiger
  'ga-jade': { name: 'Jade', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.1, rate: 1.04, radio: true }, // Milly, as in The Mahogany Ship
  'ga-niamh': { name: 'Niamh', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.08, rate: 1.04, radio: true }, // Eva, as in The Catalpa Run
  'ga-lila': { name: 'Lila', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 1.1, rate: 1.04, radio: true }, // Amelia, as in The Min Min
  'ga-rosie': { name: 'Rosie', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.22, rate: 1.06, radio: true }, // Emily, lifted
  'ga-amira': { name: 'Amira', voiceId: 'ytY8mE6mqKdU3kR6tnVd', pitch: 1.0, rate: 1.04, radio: true }, // Jess
  'ga-ash': { name: 'Ash', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 1.05, rate: 1.04, radio: true }, // Simon
  'ga-sunny': { name: 'Sunny', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 1.0, rate: 1.04, radio: true }, // Scotty
  'ga-tess': { name: 'Tess', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 1.05, rate: 1.03, radio: true }, // Julieanne
  'ga-cass': { name: 'Cass', voiceId: 'Y7xQSS5ZtS4xv4VJotWd', pitch: 1.05, rate: 1.03, radio: true }, // Christine
}

export const LOOK = { accent: '#FFB347', deep: '#1B1030', tag: 'Season finale' }

export const LIBRARY = { ambience: {}, sfx: {}, tracks: {} }
