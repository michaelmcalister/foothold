// The thriller missions: two four episode series with a full cast, sound
// effects and a score (see src/lib/missions/cast.js and
// src/lib/audio/soundscape.js).
//
//   Ember Run: Wattle Creek, a small town in the hills, on the worst fire day
//   in years. The mobile tower is down, so the brigade needs a runner. You.
//
//   The Night Job: a crooked developer forged a deed to bulldoze a harbourside
//   pool. A crew sets out to steal back the real one, and they need legs.
//
// Same beat format as scripts.js, plus:
//   who    the character speaking (a key in CAST); lines without one use the
//          series narrator
//   fx     a sound to play just before the line (soundscape STINGS)
//   scene  the background sound from this beat on (soundscape SCENES)
// Lines can be plain text or { who, text }. Tags like [whispers] shape the
// expressive server voice and are dropped for the phone voice.
//
// House rules still hold: tense, never cruel. Nobody gets hurt, nobody is
// shamed for a slow surge, and every episode lands somewhere safe.

const line = (who, text) => ({ who, text })

// ---- Ember Run ----
const E_WIN = line('jo', 'Great running. Ease right back now and catch your breath.')
const E_OKAY = line('jo', 'You got there, and that is what counts. Ease right back now.')
const E_WIN_RADIO = line('ollie', 'Copy that, you made it. Brilliant. Ease right back now.')
const E_OKAY_RADIO = line('ollie', 'Copy, you made it. Good stuff. Ease right back now.')
const E_HALF = line('jo', 'Halfway. Stay with it.')
const E_EASY = line('jo', 'Steady. Runners who pace themselves last all day. Ease back a touch.')

const ember = (at, seconds, who, say, recover, extra = {}) =>
  ({ at, kind: 'surge', seconds, who, say, success: who === 'ollie' ? E_WIN_RADIO : E_WIN, okay: who === 'ollie' ? E_OKAY_RADIO : E_OKAY, recover, ...extra })

// ---- The Night Job ----
const H_WIN = line('viv', '[mischievously] Clean getaway. Ease right back now.')
const H_OKAY = line('viv', 'Bit close, but you are clear. Ease right back now.')
const H_WIN_PIX = line('pixel', '[excited] You lost them! Ease right back now.')
const H_OKAY_PIX = line('pixel', 'Okay, you are clear. Breathe. Ease right back now.')
const H_HALF = line('viv', 'Halfway. Keep moving.')
const H_EASY = line('viv', 'Easy. Nobody notices a jogger. Everybody notices a sprinter.')

const job = (at, seconds, who, say, recover, extra = {}) =>
  ({ at, kind: 'surge', seconds, who, say, success: who === 'pixel' ? H_WIN_PIX : H_WIN, okay: who === 'pixel' ? H_OKAY_PIX : H_OKAY, recover, ...extra })

export const SAGAS = [
  {
    id: 'ember',
    title: 'Ember Run',
    blurb: 'Wattle Creek is burning and the phones are down. The brigade needs a runner.',
    note: 'Includes bushfire scenes. It is a story: on a real fire day, follow your local fire service and skip the run if there is smoke.',
    narrator: 'ember-narrator',
    score: 'ember',
  },
  {
    id: 'heist',
    title: 'The Night Job',
    blurb: 'A crooked developer, a forged deed and a crew that needs a runner.',
    narrator: 'heist-narrator',
    score: 'heist',
  },
]

export const THRILLERS = [
  // ===================== Ember Run =====================
  {
    id: 'ember-smoke',
    saga: 'ember',
    title: 'Smoke on the Ridge',
    series: 'thriller',
    type: 'surge',
    minutes: 20,
    difficulty: 'Gentle',
    blurb: 'Episode 1. Smoke on the ridge, no phone signal, and a lane full of people who need to hear the warning.',
    loop: line('jo', 'You have closed a loop. That patch is checked and clear. Good work.'),
    early: line('jo', 'Calling it there is fine. Banksia Lane got the warning, thanks to you. Rest up.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'A hot northerly', scene: 'bush', say: 'Wattle Creek. Forty one degrees, a hot northerly, and cicadas so loud you can feel them. Start with an easy walk or jog.' },
      { at: 60, kind: 'story', say: 'Up on the ridge, a thin grey line of smoke is rising. It was not there an hour ago.' },
      { at: 130, kind: 'story', who: 'jo', say: 'Captain Jo Harker, Wattle Creek brigade. The mobile tower is down, so we need runners. That is you. Welcome aboard.' },
      { at: 200, kind: 'story', who: 'ollie', say: 'Ollie here in the comms van. Fire is about twenty k out. No panic. We are just getting people ready.' },
      ember(260, 30, 'jo', 'First job. Banksia Lane has not heard the warning. Pick it up for 30 seconds and get there before the wind does.', 120, { chapter: 'Banksia Lane', scene: 'smoke', fx: 'siren' }),
      { at: 330, kind: 'story', who: 'gwen', say: '[curious] Oh, hello love. Gwen Patterson. A fire, you say? Well, I am not leaving without my chooks. All six of them.' },
      { at: 400, kind: 'story', who: 'jo', say: 'Tell Gwen the chooks can come. Bluey is bringing a cage. Keep moving.' },
      ember(470, 30, 'ollie', 'Wind is picking up. Two more houses at the top of the lane. Pick it up for 30 seconds.', 120),
      { at: 560, kind: 'story', who: 'bluey', say: "G'day. Bluey Walsh. I have got eight horses, a float and a chook cage. I will run them all down to the oval. No worries." },
      { at: 640, kind: 'steady', seconds: 160, say: 'The lane is empty now. Smoke drifts over the gum trees. Settle into an easy pace and head back to the station.', easyNudge: E_EASY },
      { at: 810, kind: 'story', who: 'ollie', say: 'Ollie here. Evacuation centre is the footy oval. Everyone from Banksia Lane has checked in. Six chooks included.' },
      ember(880, 30, 'ember-narrator', 'A low rumble rolls down the valley. Then an orange glow on the ridge. Pick it up for 30 seconds to the station.', 150, { chapter: 'The glow', fx: 'boom' }),
      { at: 1030, kind: 'story', who: 'jo', say: '[sighs] Good work today. But that glow means it is coming. Get some rest. Tomorrow, the wind changes.' },
      { at: 1140, kind: 'finale', say: 'Episode one complete. Banksia Lane is safe, the chooks are in the ute, and the ridge is still glowing. To be continued.' },
    ],
  },
  {
    id: 'ember-wind',
    saga: 'ember',
    title: 'The Wind Change',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'Episode 2. A southerly is coming at three. Embers in the main street, a blown tyre and a brigade without maps.',
    loop: line('jo', 'Loop closed. That block is checked for spot fires. Nice running.'),
    early: line('jo', 'Good call to stop. The maps got through and the main street is holding. We will take it from here.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 220, chapter: 'Three o’clock', scene: 'smoke', say: 'Day two. The sky is the colour of milky tea and the sun is a red coin. Warm up easy.' },
      { at: 80, kind: 'story', who: 'jo', say: 'Listen up. A southerly change hits at three. When it does, the fire turns and runs straight at town.' },
      { at: 160, kind: 'story', who: 'ollie', say: 'The strike team at the dam has no maps and the radio keeps dropping out. They need paper maps. By hand.' },
      ember(240, 45, 'jo', 'That is your job. Maps in your pocket. Pick it up for 45 seconds and get them to the dam.', 150, { chapter: 'The dam road', half: E_HALF }),
      { at: 330, kind: 'story', say: 'Through the haze, a fire truck. A firefighter leans out, grabs the maps and gives you a thumbs up.' },
      { at: 420, kind: 'story', who: 'bluey', say: '[sighs] Bluey here. Blown a tyre on the float. The horses are fine, they think it is a picnic. Can you run for a jack?' },
      ember(500, 45, 'bluey', 'The servo on the corner has one. Pick it up for 45 seconds and bring it back.', 150, { half: E_HALF }),
      { at: 590, kind: 'story', who: 'bluey', say: '[laughs] Beauty. Tyre is on. Eight horses, one very relieved bloke. See you at the oval.' },
      { at: 680, kind: 'story', who: 'ollie', say: 'Uh oh. The change has come early. Wind is swinging round. Embers are landing on the main street.', fx: 'whoosh', scene: 'fire', chapter: 'Ember attack' },
      ember(760, 45, 'jo', 'Spot fires near the bakery. Pick it up for 45 seconds and tell the crew where they are.', 150, { fx: 'siren', half: E_HALF }),
      { at: 850, kind: 'story', say: 'Hoses hiss. Steam rises off the bakery gutter. The crew knocks down every spot fire you point at.' },
      { at: 940, kind: 'steady', seconds: 240, say: 'Hold an easy pace and sweep the back streets. Look for glowing embers in gutters and doormats.', easyNudge: E_EASY },
      { at: 1100, kind: 'story', who: 'gwen', say: 'Is that you, love? The chooks are cross about the smoke, but they are safe. Thank you for coming back for us.' },
      ember(1200, 45, 'ollie', 'One more ember run. The old hall has a doormat smouldering. Pick it up for 45 seconds.', 150, { half: E_HALF }),
      { at: 1290, kind: 'story', say: 'A crack, then a fizz. Down the street, a power line sags and the lights of Wattle Creek flicker.', fx: 'crack', chapter: 'Lights out' },
      { at: 1380, kind: 'story', who: 'ollie', say: 'Jo, the repeater is losing power. If it goes, we lose the radio. Jo, do you copy? Jo?' },
      { at: 1460, kind: 'finale', say: 'Static. Then nothing. Episode two complete. The town is dark, and the radio has gone quiet. To be continued.', fx: 'squelch' },
    ],
  },
  {
    id: 'ember-tower',
    saga: 'ember',
    title: 'Blackout',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Steady effort',
    blurb: 'Episode 3. No power, no radio, and a lost dog. The old fire lookout on the hill holds the only way to call for help.',
    loop: line('jo', 'Loop closed. That ground is checked. You are a natural at this.'),
    early: line('jo', 'Fair call. You got us halfway to the lookout. Bluey will take the ute the rest of the way.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 240, chapter: 'In the dark', scene: 'night', say: 'Night. No power, no phones, no radio. Just torches, a red sky, and the hum of a generator at the oval. Warm up easy.' },
      { at: 90, kind: 'story', who: 'jo', say: 'Here is the plan. The old fire lookout on Mount Bellamy has a backup radio. Get it on and we can talk to the water bombers.' },
      { at: 180, kind: 'story', who: 'pip', say: 'Excuse me. I am Pip. Have you seen a little brown dog? His name is Pickles. He ran off when the lights went out.' },
      { at: 250, kind: 'story', who: 'jo', say: 'Keep an eye out for Pickles on the way up. Off you go. Steady first, the hill comes later.' },
      { at: 330, kind: 'steady', seconds: 240, chapter: 'Mount Bellamy road', say: 'Follow the fire trail up through the stringybarks. Easy pace. Your torch makes the smoke glow.', easyNudge: E_EASY },
      { at: 470, kind: 'story', say: 'Something rustles in the bracken. Two bright eyes. A tail, wagging very hard.', fx: 'thunk' },
      { at: 540, kind: 'story', who: 'pip', say: '[excited] Pickles! You found him! Thank you, thank you. He is licking everything. Sorry.' },
      ember(600, null, 'jo', 'The trail gets steep from here. Pick it up for 300 metres to the first switchback.', 150, { metres: 300, chapter: 'The climb', half: E_HALF }),
      { at: 760, kind: 'story', say: 'Below you, Wattle Creek is a scatter of torches. Above you, the lookout tower is black against the orange sky.' },
      ember(840, null, 'jo', 'Second switchback. Pick it up for 300 metres. You are nearly there.', 150, { metres: 300, half: E_HALF }),
      { at: 1000, kind: 'story', say: 'The lookout door is stiff. You lean on it. It gives with a groan.', fx: 'thunk' },
      ember(1070, null, 'jo', 'Last stretch. Up the tower stairs and the hill behind it. Pick it up for 300 metres.', 150, { metres: 300, half: E_HALF }),
      { at: 1230, kind: 'story', say: 'An old radio. A big red switch. You flick it. Lights blink on. Then a voice through the static.', fx: 'click', chapter: 'Hello, Wattle Creek' },
      { at: 1290, kind: 'story', who: 'ollie', say: '[excited] Is that the lookout? Wattle Creek comms, reading you loud and clear. You legend!' },
      { at: 1370, kind: 'steady', seconds: 240, say: 'Head back down the trail at an easy pace. Let the legs recover. The night is not over yet.', easyNudge: E_EASY },
      ember(1620, 60, 'ollie', 'Water bombers are coming at first light. Pick it up for 60 seconds back to the oval.', 120),
      { at: 1720, kind: 'story', who: 'ollie', say: 'Uh oh. Jo, the last school bus from Ridge Road has stalled. Eleven people on board and the front is getting closer.' },
      { at: 1790, kind: 'finale', say: 'Episode three complete. The radio is back, Pickles is home, and a bus is stuck on Ridge Road. To be continued.', fx: 'boom' },
    ],
  },
  {
    id: 'ember-dawn',
    saga: 'ember',
    title: 'The Long Night',
    series: 'thriller',
    type: 'surge',
    minutes: 35,
    difficulty: 'Hard effort',
    blurb: 'Episode 4, the finale. A stalled bus, a fire front at midnight, and a long run to the morning.',
    loop: line('jo', 'Loop closed. Another patch of Wattle Creek, checked and safe.'),
    early: line('jo', 'That is plenty. The bus is moving and the crews have the line. You have done your bit tonight.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 300, chapter: 'Ridge Road', scene: 'night', say: 'Midnight on Ridge Road. A yellow bus, hazard lights blinking, eleven worried faces at the windows. Warm up easy.' },
      { at: 100, kind: 'story', who: 'jo', say: 'The bus is not broken, just stuck. A fallen branch is blocking the road. You run ahead, we clear the way.' },
      { at: 200, kind: 'story', who: 'bluey', say: 'Bluey here. I have got a chainsaw and a bad attitude towards branches. Show me where they are.' },
      ember(300, 60, 'jo', 'Run ahead and find the next branch. Pick it up for 60 seconds.', 120, { chapter: 'Clearing the way', half: E_HALF, fx: 'siren' }),
      { at: 390, kind: 'story', say: 'A chainsaw roars. Wood splits. The bus rolls forward with a hiss of air brakes.', fx: 'crack' },
      ember(450, 60, 'jo', 'Another one round the bend. Pick it up for 60 seconds.', 120, { half: E_HALF }),
      ember(600, 60, 'ollie', 'Smoke is thick near the creek. The driver needs you as a guide light. Pick it up for 60 seconds.', 120, { half: E_HALF }),
      { at: 690, kind: 'story', who: 'pip', say: 'Pickles and I are watching from the oval. Everyone is cheering for the bus. Go, go, go!' },
      { at: 760, kind: 'story', say: 'The bus pulls into the oval. Eleven people step off. Somebody hugs the driver. Somebody hugs you.', chapter: 'The front' },
      { at: 840, kind: 'steady', seconds: 300, scene: 'fire', say: 'Now the front arrives. The crews hold the line at the creek. Run easy laps round the oval, and stay ready.', easyNudge: E_EASY },
      { at: 980, kind: 'story', who: 'jo', say: 'This is it. Every crew on the creek line. We hold here and the town holds. Stay with me.' },
      { at: 1100, kind: 'story', say: 'The roar is enormous. Embers stream overhead like orange snow. The sprinklers on the oval hiss.' },
      ember(1200, 60, 'jo', 'Spot fire on the grandstand roof. Pick it up for 60 seconds and get the hose crew.', 120, { half: E_HALF, fx: 'siren' }),
      ember(1350, 60, 'jo', 'Another, by the canteen. Pick it up for 60 seconds.', 120, { half: E_HALF }),
      { at: 1440, kind: 'story', who: 'gwen', say: 'Love, the chooks have stopped fussing. Do you feel that? The wind is dropping.', chapter: 'First light' },
      { at: 1530, kind: 'story', say: 'A deep thudding in the grey dawn. Water bombers, low over the ridge, one after another.', fx: 'rotor' },
      ember(1620, 60, 'ollie', 'Bombers have the head of the fire. One last run, Jo needs you at the creek line. Pick it up for 60 seconds.', 180, { half: E_HALF }),
      { at: 1700, kind: 'story', scene: 'rain', say: 'Then, a sound nobody expected. Pattering on tin roofs. Rain. Real rain. People step out with their faces turned up.' },
      { at: 1800, kind: 'story', who: 'jo', say: '[sighs] The front is out. Every person in Wattle Creek is safe. We lost the old hall roof. We will build a better one.' },
      { at: 1890, kind: 'story', who: 'bluey', say: 'Horses are fine. Gwen is fine. And mate, one of her chooks just laid an egg. In the middle of all this. Legend.' },
      { at: 1970, kind: 'story', say: 'Cool down now with a gentle jog or a walk. Breathe in that wet bush smell.' },
      { at: 2080, kind: 'finale', say: 'Ember Run complete. Wattle Creek made it through. Here is to every real volunteer who runs towards the smoke.' },
    ],
  },

  // ===================== The Night Job =====================
  {
    id: 'heist-recruit',
    saga: 'heist',
    title: 'The Recruit',
    series: 'thriller',
    type: 'surge',
    minutes: 20,
    difficulty: 'Gentle',
    blurb: 'Episode 1. A stranger at the fish markets, a parcel that must not be followed, and a job offer.',
    loop: line('viv', 'A loop. You doubled back on your own trail. Very professional.'),
    early: line('viv', 'Stopping there is fine. You have shown me enough. I will be in touch.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'The fish markets', scene: 'city', say: 'Sydney. Ten past nine at night. The harbour is black glass and the city hums. Start with an easy walk or jog.' },
      { at: 70, kind: 'story', who: 'viv', say: 'Do not turn around. My name is Viv. I need a runner, and I have been watching you. You are quick and nobody notices you.' },
      { at: 150, kind: 'story', who: 'viv', say: 'Here is an earpiece. Pop it in. Tonight is a test. Carry one parcel across The Rocks without being followed.' },
      { at: 220, kind: 'story', who: 'pixel', say: '[excited] Hi! Pixel. I do the cameras and the clever bits. I can see you on six of them. Wave. No, do not wave.' },
      job(270, 30, 'pixel', 'Grey sedan, two streets back. That is Crane security. Pick it up for 30 seconds and lose them.', 120, { chapter: 'The parcel', fx: 'heartbeat' }),
      { at: 350, kind: 'story', who: 'viv', say: 'Who is Crane? Lachlan Crane. Property developer. He is about to bulldoze the Harbourside Pool with a deed he forged.' },
      { at: 430, kind: 'story', who: 'mack', say: 'Mack. I drive. Do not talk to me before coffee. Grey sedan is circling back towards Argyle Street.' },
      job(500, 30, 'viv', 'Through the Argyle Cut and down the steps. Pick it up for 30 seconds.', 120),
      { at: 590, kind: 'story', who: 'pixel', say: 'Lost them! He is stuck behind a garbage truck. I may have changed a traffic light. Allegedly.' },
      { at: 660, kind: 'steady', seconds: 160, say: 'Blend in now. Easy pace along the wharves, like any other night jogger.', easyNudge: H_EASY },
      { at: 830, kind: 'story', who: 'viv', say: 'Open the parcel. Go on. Yes, it is a lamington. You passed the test before you even started.' },
      job(900, 30, 'mack', 'Change of plan. Grey sedan is back and it is heading your way. Pick it up for 30 seconds to the van.', 150, { chapter: 'The offer', fx: 'whoosh' }),
      { at: 1040, kind: 'story', who: 'viv', say: '[whispers] Welcome to the crew. Tomorrow night, Crane throws a gala in his tower. The real deed is in his safe. We take it back.' },
      { at: 1140, kind: 'finale', who: 'crane', say: '[sarcastic] Someone is asking questions about my deed. Find them. Episode one complete. To be continued.', fx: 'boom' },
    ],
  },
  {
    id: 'heist-gala',
    saga: 'heist',
    title: 'The Gala',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'Episode 2. Black tie on the top floor. Forty flights of service stairs. One safe.',
    loop: line('viv', 'Loop closed. You know this block better than his guards do now.'),
    early: line('viv', 'Abort is fine. Always have an exit. Mack, bring the van round. We go again another night.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 220, chapter: 'Crane Tower', scene: 'city', say: 'Crane Tower. Glass and money, forty floors high. Tonight the top floor is a gala. Warm up easy.' },
      { at: 80, kind: 'story', who: 'viv', say: 'Plan is simple. I go in the front in a very nice dress. You go up the service stairs. Pixel opens doors. Mack waits.' },
      { at: 160, kind: 'story', who: 'pixel', say: 'Cameras on a loop in three, two, one. They are now watching yesterday. Yesterday was very boring.', fx: 'click' },
      { at: 230, kind: 'steady', seconds: 200, chapter: 'The stairs', scene: 'tower', say: 'Into the stairwell. Easy, even pace. Forty floors is a long way, so save your legs.', easyNudge: H_EASY },
      { at: 330, kind: 'story', who: 'reg', say: '[sighs] Evening. Reg, night security. Twenty eight years in this building. Do not mind me, I am just checking the doors.' },
      job(450, 45, 'pixel', 'Reg is coming up the stairs behind you. Pick it up for 45 seconds to the next landing.', 150, { half: H_HALF, fx: 'heartbeat' }),
      { at: 540, kind: 'story', scene: 'gala', say: 'The top floor. Music, champagne, a string quartet. Crane laughs too loudly at his own joke.', chapter: 'The gala' },
      { at: 620, kind: 'story', who: 'crane', say: '[laughs] A pool! For the public! Can you imagine? No, this harbour deserves apartments. Very expensive apartments.' },
      { at: 700, kind: 'story', who: 'viv', say: '[whispers] I have got his attention. His study is the second door on the left. Pixel, the lock.' },
      job(770, 45, 'pixel', 'Lock is open, but a waiter is heading your way. Pick it up for 45 seconds through the study door.', 150, { half: H_HALF }),
      { at: 860, kind: 'story', say: 'The study. Leather chairs, a painting of Crane, and behind it, a safe.', fx: 'thunk', chapter: 'The safe' },
      { at: 930, kind: 'story', who: 'pixel', say: 'Safe code is his boat name backwards. These people. Okay, in you go.', fx: 'click' },
      { at: 1000, kind: 'story', say: 'An old envelope. Inside, a deed dated nineteen oh two. The Harbourside Pool, gifted to the people of Sydney forever.' },
      job(1060, 45, 'viv', 'Alarm! Someone tripped it downstairs. Pick it up for 45 seconds to the stairwell.', 150, { fx: 'alarm', scene: 'tower', half: H_HALF }),
      { at: 1150, kind: 'story', who: 'reg', say: 'You. With the envelope. [sighs] My grandad built that pool. I did not see anything. Go.' },
      job(1230, 45, 'mack', 'Van is at the loading dock. Pick it up for 45 seconds and get in.', 150, { half: H_HALF }),
      { at: 1340, kind: 'story', scene: 'city', who: 'pixel', say: 'Wait. Hold the envelope up to the light. Oh no. That watermark is from last year. It is a copy.' },
      { at: 1440, kind: 'finale', who: 'crane', say: '[mischievously] Looking for this? The real deed never leaves my side. Episode two complete. To be continued.', fx: 'boom' },
    ],
  },
  {
    id: 'heist-cross',
    saga: 'heist',
    title: 'The Double Cross',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Steady effort',
    blurb: 'Episode 3. Crane is moving the real deed to his yacht. A courier, a briefcase and a city in the way.',
    loop: line('viv', 'Loop closed. You are making a map of this city in your legs.'),
    early: line('viv', 'Pull out, that is fine. Mack will tail the courier. Rest those legs for the big night.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 240, chapter: 'The briefcase', scene: 'street', say: 'Two nights later. Rain on the windscreen, the crew squashed in Mack’s van. Warm up easy.' },
      { at: 90, kind: 'story', who: 'viv', say: 'Crane thinks he won. Good. People who think they won get sloppy. He is moving the real deed to his yacht at Rose Bay.' },
      { at: 170, kind: 'story', who: 'pixel', say: 'His courier just left the tower with a silver briefcase. On foot. I have him on camera. Your turn.' },
      { at: 240, kind: 'steady', seconds: 180, say: 'Follow at a distance. Easy pace, like you are just out for a run. Never closer than a block.', easyNudge: H_EASY },
      job(440, null, 'pixel', 'He has jumped on a bike. Pick it up for 300 metres before he turns the corner.', 150, { metres: 300, chapter: 'The chase', half: H_HALF, fx: 'whoosh' }),
      { at: 620, kind: 'story', who: 'mack', say: '[sighs] I am boxed in by a tour bus. A tour bus. You are on your own for a bit.' },
      job(700, null, 'pixel', 'Bike lane through the park. Pick it up for 300 metres and keep him in sight.', 150, { metres: 300, half: H_HALF }),
      { at: 880, kind: 'story', who: 'viv', say: 'Here is the double cross. The courier works for Crane, but he does not love Crane. Nobody does. Pixel, call him.' },
      { at: 960, kind: 'story', who: 'pixel', say: 'Done. I told him Crane forgot to pay him. He has stopped at the ferry wharf to make a very angry phone call.' },
      job(1040, null, 'viv', 'He has put the briefcase down. Pick it up for 300 metres to the wharf.', 150, { metres: 300, half: H_HALF, chapter: 'The swap', fx: 'heartbeat' }),
      { at: 1210, kind: 'story', scene: 'harbour', say: 'The wharf. Water slapping the pylons. A silver briefcase, next to a very cross courier, who is not looking.' },
      { at: 1280, kind: 'story', who: 'viv', say: '[whispers] Your bag looks exactly like his briefcase. Swap them. Smooth. Do not run. Then run.' },
      job(1340, 60, 'mack', 'Got it? Then go. Van is two streets up. Pick it up for 60 seconds.', 150, { half: H_HALF, fx: 'horn' }),
      { at: 1440, kind: 'story', who: 'pixel', say: 'Watermark checks out. Nineteen oh two. Original ink. That is the real one. [excited] We have the real deed!' },
      { at: 1530, kind: 'steady', seconds: 180, scene: 'street', say: 'Ease into a gentle pace while the crew celebrates. Breathe out long and slow.', easyNudge: H_EASY },
      { at: 1650, kind: 'story', who: 'crane', say: 'My lawyers have filed. The bulldozers start at dawn, deed or no deed. Unless the council says otherwise. And they meet at midnight.' },
      { at: 1730, kind: 'story', who: 'viv', say: 'Midnight at the Town Hall. Across the harbour. And Mack’s van has a flat tyre.' },
      { at: 1790, kind: 'finale', say: 'Episode three complete. The real deed is in your bag, and the last ferry leaves in forty minutes. To be continued.', fx: 'boom' },
    ],
  },
  {
    id: 'heist-ferry',
    saga: 'heist',
    title: 'The Last Ferry',
    series: 'thriller',
    type: 'surge',
    minutes: 35,
    difficulty: 'Hard effort',
    blurb: 'Episode 4, the finale. A deed, a deadline and the whole city between you and the Town Hall.',
    loop: line('viv', 'One more loop. This city is yours now.'),
    early: line('viv', 'That will do. Pixel has a scan of the deed on its way to the council. You got us close enough.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 300, chapter: 'Forty minutes', scene: 'harbour', say: 'Eleven twenty at night. The deed is zipped in your bag. The last ferry leaves soon. Warm up easy.' },
      { at: 110, kind: 'story', who: 'viv', say: 'Plan. Ferry to Circular Quay, then on foot to the Town Hall. Pixel clears the lights. I stall the council. You run.' },
      { at: 210, kind: 'story', who: 'pixel', say: 'Bad news. Crane has people at every taxi rank. Good news. Nobody looks at runners. You are invisible.' },
      job(300, 60, 'viv', 'Ferry is pulling out. Pick it up for 60 seconds and make the jump.', 120, { chapter: 'The ferry', half: H_HALF, fx: 'horn' }),
      { at: 390, kind: 'story', say: 'The ferry chugs across black water. The Opera House glows. Your heart slowly comes back down.' },
      { at: 470, kind: 'story', who: 'reg', say: 'Reg here. I am at the Town Hall. Twenty eight years of night shifts and I have finally got something to say to a council.' },
      job(560, 60, 'pixel', 'Two of Crane’s people at the Quay. Pick it up for 60 seconds off the wharf and into the crowd.', 120, { chapter: 'Circular Quay', half: H_HALF, scene: 'street', fx: 'heartbeat' }),
      job(710, 60, 'pixel', 'They are following. Up George Street. Pick it up for 60 seconds. I will turn the lights red behind you.', 120, { half: H_HALF }),
      { at: 800, kind: 'story', who: 'pixel', say: '[laughs] Six red lights in a row. They are very cross. Very stopped.' },
      { at: 870, kind: 'steady', seconds: 240, say: 'You have lost them. Hold an easy pace through the back lanes. Stay invisible.', easyNudge: H_EASY },
      { at: 1000, kind: 'story', who: 'viv', say: 'I am in the chamber. Crane is here too. He is smiling. He thinks you are stuck at the Quay.' },
      { at: 1120, kind: 'story', who: 'crane', say: 'Councillors, there is no deed. There never was. Let us vote, and let us all go home rich.' },
      job(1180, 60, 'viv', 'They are about to vote. Pick it up for 60 seconds. Town Hall steps, now.', 120, { chapter: 'The Town Hall', half: H_HALF, scene: 'tower' }),
      job(1330, 60, 'mack', 'Crane’s security is on the steps. Back entrance, through the loading bay. Pick it up for 60 seconds.', 150, { half: H_HALF, fx: 'alarm' }),
      { at: 1440, kind: 'story', say: 'The chamber doors swing open. Every head turns. You hold up an old envelope. Crane stops smiling.', fx: 'thunk' },
      { at: 1520, kind: 'story', who: 'reg', say: 'That is the real deed. I saw it in his safe for twenty eight years. And I saw him make the copy.' },
      { at: 1610, kind: 'story', who: 'crane', say: 'This is outrageous. Get your hands off me. Do you know who I am?', fx: 'siren' },
      { at: 1700, kind: 'story', who: 'viv', say: 'The fraud squad knows exactly who you are, Lachlan. Pixel sent them everything an hour ago.' },
      { at: 1790, kind: 'steady', seconds: 180, scene: 'harbour', say: 'Cool down now with a gentle jog or a walk. The city is quiet, and the harbour is still.', chapter: 'Morning' },
      { at: 1900, kind: 'story', who: 'mack', say: 'Coffee. Finally. And for the record, you were not bad. For someone without a van.' },
      { at: 2000, kind: 'story', who: 'pixel', say: 'The Harbourside Pool opens at six. First swim is on Reg. He has been waiting twenty eight years.' },
      { at: 2080, kind: 'finale', who: 'viv', say: 'The Night Job is complete. The pool stays and Crane goes. Same time next year? [laughs] I will be in touch.' },
    ],
  },
]

export const THRILLER_CHAINS = {
  ember: ['ember-smoke', 'ember-wind', 'ember-tower', 'ember-dawn'],
  heist: ['heist-recruit', 'heist-gala', 'heist-cross', 'heist-ferry'],
}
