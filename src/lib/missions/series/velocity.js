// Velocity: a five episode superhero origin story in Brisbane and on the Gold
// Coast. On a stormy summer evening run, lightning hits a lamp post beside
// you (you are fine) and leaves you with bursts of speed, but only while you
// run, and the faster you go the stronger it gets: every surge is the power
// kicking in. Val Archer, a retired hero once called Zephyr, coaches you over
// the phone; your best mate Benji is tech support; and a slick company,
// Voltaris, is building a Stormcatcher that feeds storms to harvest their
// lightning. Its masked speedster, Riptide, runs on stolen charge, and ends
// up on your side. Rescues and races, never fights.
//
// Pure data (imports nothing): series/index.js hands it to thrillers.js,
// cast.js, covers.js and audio/library.js. Same beat format as signal.js.
//
// Trivia is real (checked with a web search, November 2026):
//   - lightning heats the air to roughly five times the temperature of the
//     Sun's surface (NOAA, via Fox Weather)
//   - count the seconds from flash to thunder and divide by 3 for kilometres;
//     light (about 300,000 km a second) is far faster than sound (about
//     340 m a second) (Hong Kong Observatory)
//   - World Expo 88 was held at South Bank, Brisbane, in 1988, and the site
//     became the South Bank Parklands (Queensland tourism, queensland.com)
//   - CityCat services began on the Brisbane River in November 1996, with
//     catamarans (RiverCity Ferries, Wikipedia)
//   - the Story Bridge opened on 6 July 1940 and is the longest cantilever
//     bridge in Australia (Story Bridge, Wikipedia)
//   - the cheetah is the fastest land animal, over 100 km/h (Live Science)
//   - Queensland's animal emblem is the koala, its bird emblem the brolga
//     (Australian Government, Australian Symbols)
//   - lightning can strike the same place again and again: the Empire State
//     Building is hit about 25 times a year (Fox Weather)
//   - the Gold Coast hosted the 2018 Commonwealth Games, and the mascot was
//     Borobi, a blue koala (2018 Commonwealth Games, Wikipedia)
//   - tropical cyclones spin clockwise in the Southern Hemisphere (AIMS)
//   - on patrolled beaches, swim between the red and yellow flags
//     (healthdirect)
//
// House rules: tense, never cruel. Nobody is hurt, Riptide is thwarted and
// redeemed (her suit only ever powers down), Corbin Vale is led away soaked
// and grumpy, and the finale lands somewhere hopeful.

const line = (who, text) => ({ who, text })

// surge results, by who calls the surge (the okay lines always land kindly)
const RESULTS = {
  'vel-benji': {
    success: line('vel-benji', '[excited] Mate, you lit up like a power line! Ease right back now.'),
    okay: line('vel-benji', 'You got there, and that is what counts. Ease right back now.'),
    half: line('vel-benji', 'Halfway! I can see the sparks from here!'),
  },
  'vel-val': {
    success: line('vel-val', 'That is the gift talking. Lovely running. Ease right back now and breathe.'),
    okay: line('vel-val', 'You made it, love. That is what counts. Ease right back now.'),
    half: line('vel-val', 'Halfway. Let it build. Faster feeds it.'),
  },
  'vel-skye': {
    success: line('vel-skye', '[excited] The crowd is going wild down there! Ease right back now.'),
    okay: line('vel-skye', 'You made it, and Brisbane saw every step. Ease right back now.'),
    half: line('vel-skye', 'Halfway! We have you on camera from the chopper!'),
  },
  'vel-kemp': {
    success: line('vel-kemp', 'Copy, delivered. Outstanding work. Ease right back now.'),
    okay: line('vel-kemp', 'Copy, you made it. That is what counts. Ease right back now.'),
    half: line('vel-kemp', 'Halfway. Keep it coming.'),
  },
  'vel-riptide': {
    success: line('vel-riptide', '[laughs] Not bad, Sparky. Not bad at all. Ease right back now.'),
    okay: line('vel-riptide', 'You got there. That is what counts. Ease right back now.'),
    half: line('vel-riptide', 'Halfway. Stay on my shoulder.'),
  },
}

const EASY_VAL = line('vel-val', 'Ease off a touch, love. The gift is for the big moments. Save your legs for them.')
const EASY_BENJI = line('vel-benji', 'Easy, Sparky. Let us work out how this thing works before you run through a wall.')

const surge = (at, seconds, who, say, recover, extra = {}) => ({ at, kind: 'surge', seconds, who, say, recover, ...RESULTS[who], ...extra })

export const SAGA = {
  id: 'velocity',
  title: 'Velocity',
  blurb: 'A lightning strike, a burst of impossible speed, and a storm machine only you can outrun. A superhero story for Brisbane.',
  note: 'The story is full of storms. In real life, never run in a thunderstorm: when you hear thunder, head indoors and wait it out.',
  narrator: 'velocity-narrator',
  score: 'velocity',
  isNew: true,
}

export const EPISODES = [
  {
    id: 'velocity-strike',
    episode: 1,
    next: 'Next time on Velocity: a mentor on the phone, a runaway CityCat on the Brisbane River, and a red blur on the far bank.',
    saga: 'velocity',
    title: 'Strike',
    series: 'thriller',
    type: 'surge',
    minutes: 20,
    difficulty: 'Gentle',
    blurb: 'Episode 1. A storm rolls up the Brisbane River, lightning hits right beside you, and suddenly you are very, very fast.',
    loop: line('vel-benji', 'You closed a loop! Your map looks like a lightning bolt. Very on brand.'),
    early: line('vel-benji', 'Stopping there is fine, mate. Get dry, get some rest. We will work out the sparks tomorrow.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Six forty pm', scene: 'stormfront', say: 'Brisbane, on a sticky summer evening. You are out for a run along the river at Kangaroo Point, and the sky over the city has turned purple. Start with an easy walk or jog.' },
      { at: 45, kind: 'story', fx: 'thunder', say: 'Thunder rolls up the river. The jacarandas thrash in the wind. Everyone else is heading home. You think, one more kilometre.' },
      { at: 100, kind: 'story', who: 'vel-benji', say: 'Benji here. I am watching the radar. Mate, there is a storm cell the size of Moreton Bay heading straight for you. Please tell me you are going home.' },
      { at: 160, kind: 'story', spatial: 'thunderroll', say: 'The first fat raindrops hit the path, warm as bathwater. The cliffs flash white, then go dark again.' },
      { at: 215, kind: 'story', fx: 'boltstrike', chapter: 'The strike', say: 'Then the world goes bright. A bolt hits the lamp post right beside you. A crack like the sky splitting in half. Every hair on your arms stands up.' },
      { at: 265, kind: 'story', say: 'You are sitting on the wet grass. You check. Fingers, toes, everything. You are fine. Better than fine. Your whole body is humming like a fridge.' },
      { at: 325, kind: 'story', who: 'vel-benji', say: '[curious] Your watch just sent me a weird reading. Heart rate normal. Step count up by four hundred in one second. Are you okay?' },
      { at: 385, kind: 'quiz', who: 'vel-benji', say: 'While you get up. That bolt heated the air around it. Compared to the surface of the Sun, how hot does lightning get?',
        options: [{ key: 'A', label: 'Cooler than the Sun' }, { key: 'B', label: 'About the same' }, { key: 'C', label: 'About five times hotter' }], answer: 'C',
        right: line('vel-benji', 'About five times hotter. Around thirty thousand degrees. And you were standing right next to it. Legend.'),
        wrong: line('vel-benji', 'It gets about five times hotter. Around thirty thousand degrees. And you were standing right next to it.') },
      surge(455, 30, 'vel-benji', 'Try something for me. Pick it up for 30 seconds along the river. Just see what happens.', 120, { chapter: 'The first surge', fx: 'chargeup' }),
      { at: 525, kind: 'story', fx: 'zipby', say: 'Something kicks in. Every stride lands further than the last. The rain seems to slow down around you. Blue sparks fizz off your shoes and hiss on the path.' },
      { at: 580, kind: 'story', who: 'vel-benji', say: '[excited] Fifty kilometres an hour! On foot! In the rain! And the faster you went, the faster you got. That is not a thing. That is not a normal thing!' },
      { at: 640, kind: 'steady', seconds: 160, say: 'As you slow down, the humming fades to a gentle buzz. Settle into an easy pace and get your breath back.', easyNudge: EASY_BENJI },
      { at: 700, kind: 'story', fx: 'horn', chapter: 'The coffee van', say: 'Below the cliffs, people are shouting. The wind has knocked the brake off a coffee van, and it is rolling toward the picnic shelter, where a wedding party is waiting out the rain.' },
      { at: 760, kind: 'choice', id: 'save', who: 'vel-benji', say: 'Two ways down. The cliff stairs, or the long path round the river. Which way?',
        options: [
          { key: 'A', label: 'The cliff stairs', flag: 'stairs', say: line('vel-benji', 'The stairs! Brave. Watch your feet, they are slippery.') },
          { key: 'B', label: 'The river path', flag: 'path', say: line('vel-benji', 'The path. Longer, but you can really open up.') },
        ],
        default: 'B', timeout: line('vel-benji', 'Take the path. More room to build speed. Go!') },
      surge(820, 30, 'vel-benji', 'Down the stairs! Pick it up for 30 seconds. Beat that van to the bottom!', 120, { if: 'stairs', fx: 'chargeup' }),
      surge(821, 30, 'vel-benji', 'Round the path! Pick it up for 30 seconds. Feel it build. Beat that van to the shelter!', 120, { unless: 'stairs', fx: 'chargeup' }),
      { at: 890, kind: 'story', if: 'stairs', fx: 'thunk', say: 'You take the stairs three at a time in a shower of sparks. You reach the van, yank the door open and haul on the handbrake. It stops a metre from the shelter.' },
      { at: 891, kind: 'story', unless: 'stairs', fx: 'thunk', say: 'You fly round the bend in a streak of blue light. You reach the van, yank the door open and haul on the handbrake. It stops a metre from the shelter.' },
      { at: 945, kind: 'story', fx: 'crowdroar', say: 'The wedding party bursts out of the shelter, cheering. The bride is holding up her phone. Then everyone is holding up their phones.' },
      { at: 1000, kind: 'story', who: 'vel-benji', say: 'Uh oh. Somebody posted it already. Glowing Runner Saves Wedding. Forty thousand views. Fifty. Mate, you are famous.' },
      { at: 1050, kind: 'puzzle', who: 'vel-benji', say: 'Quick one before the next bolt. You see a flash and count six seconds until the thunder. About how far away is the storm?',
        options: [{ key: 'A', label: '1 km' }, { key: 'B', label: '2 km' }, { key: 'C', label: '6 km' }], answer: 'B',
        right: line('vel-benji', 'Two kilometres. Three seconds for every kilometre. It is moving off. Good.'),
        wrong: line('vel-benji', 'It is about 2 km away. Count the seconds and divide by three. It is moving off. Good.') },
      { at: 1100, kind: 'story', spatial: 'thunderroll', say: 'High above the river, a small drone with a red light hangs in the rain, watching you. Then it zips away toward the city towers.' },
      surge(1135, 30, 'vel-benji', 'Sirens coming. You do not want to explain this to anyone yet. Pick it up for 30 seconds and slip away home!', 100, { chapter: 'Home', fx: 'siren' }),
      { at: 1195, kind: 'story', fx: 'click', say: 'Home. Dripping on the doormat. Your phone rings. No caller ID.' },
      { at: 1220, kind: 'story', who: 'vel-val', say: '[whispers] You felt it, didn’t you? The humming. The faster you go, the stronger it gets. I know, love. Because I had it too.' },
      { at: 1255, kind: 'finale', say: 'Episode one complete. A bolt from the blue, a first save, and a stranger who knows your secret. To be continued.' },
    ],
  },
  {
    id: 'velocity-ferry',
    episode: 2,
    previously: 'Previously on Velocity: a lightning bolt, a burst of impossible speed, a runaway coffee van, and a phone call from someone who knows.',
    next: 'Next time on Velocity: a challenge on every screen, a race across the Story Bridge, and a rival with a secret.',
    saga: 'velocity',
    title: 'Runaway CityCat',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'Episode 2. Lightning hits the river, a CityCat full of people loses steering, and only one runner can catch it.',
    loop: line('vel-benji', 'Another loop closed. Davo says you can have free ferry rides for life.'),
    early: line('vel-val', 'That will do for tonight, love. The ferry is safe and so are you. Rest those legs.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 240, chapter: 'The next evening', scene: 'stormfront', say: 'The next evening. Another storm is building over the ranges. You are on the Riverwalk at New Farm, and your legs have not stopped tingling all day. Warm up easy.' },
      { at: 50, kind: 'story', who: 'vel-val', say: 'It is Val. Val Archer. Forty years ago the papers called me Zephyr. A storm gave me the gift, the same as you. I am old now, and I live at Redcliffe, but I can still talk.' },
      { at: 110, kind: 'story', who: 'vel-val', say: 'Lesson one. The gift only works while you run. Stop, and you are just you. Go faster, and it feeds itself. So never stop halfway through something.' },
      { at: 170, kind: 'story', who: 'vel-benji', say: 'Benji, tech support, reporting for duty. I have hooked your earbuds up to my laptop. I can see your speed, your heart rate and, weirdly, your voltage.' },
      { at: 230, kind: 'story', fx: 'thunder', spatial: 'thunderroll', say: 'Thunder rumbles down the valley. Out on the river, a CityCat glides past, lit up like a lantern, full of people heading home from work.' },
      { at: 290, kind: 'quiz', who: 'vel-val', say: 'While we wait for the storm. When I was young, South Bank was old wharves. Then a huge event was held there in 1988, and the parklands came after. What was it?',
        options: [{ key: 'A', label: 'World Expo 88' }, { key: 'B', label: 'The Olympics' }, { key: 'C', label: 'The Commonwealth Games' }], answer: 'A',
        right: line('vel-val', 'World Expo 88. Six months of fireworks and crowds. I ran past it every night.'),
        wrong: line('vel-val', 'It was World Expo 88. Six months of fireworks and crowds. The parklands came after.') },
      { at: 355, kind: 'story', fx: 'boltstrike', chapter: 'Runaway', say: 'Lightning hits the river right beside the CityCat. Every light on the ferry flickers and goes out. Then its engines roar to full power.' },
      { at: 410, kind: 'story', who: 'vel-davo', fx: 'horn', say: 'Mayday, mayday, this is the CityCat. Davo, deckhand. We have lost steering, the throttle is stuck wide open, and we are heading downstream fast!' },
      surge(470, 40, 'vel-benji', 'The ferry is getting away! Pick it up for 40 seconds and keep pace along the Riverwalk!', 120, { fx: 'chargeup' }),
      { at: 560, kind: 'story', spatial: 'speedster', fx: 'zipby', say: 'As you run, something blurs past on the far bank. A streak of red light, as fast as yours. Gone before you can blink.' },
      { at: 615, kind: 'story', who: 'vel-benji', say: '[whispers] Did you see that? Something else is out there running. And there is a signal jamming the ferry. It is coming from a van on the riverbank.' },
      { at: 675, kind: 'story', who: 'vel-davo', say: 'We are doing twenty knots and the Story Bridge is coming up! Sixty passengers on board, all in life jackets, all a bit nervous!' },
      { at: 735, kind: 'choice', id: 'ferry', who: 'vel-val', say: 'Two jobs, one runner. Stop the jamming van, or race to the next terminal and catch Davo’s rope?',
        options: [
          { key: 'A', label: 'Stop the van', flag: 'van', say: line('vel-val', 'The van. Cut the signal and the ferry gets its steering back. Go!') },
          { key: 'B', label: 'Catch the rope', flag: 'rope', say: line('vel-val', 'The terminal. Davo will throw you a line. You will need every bit of speed.') },
        ],
        default: 'B', timeout: line('vel-val', 'The terminal, love. Davo needs hands on that rope.') },
      surge(795, 45, 'vel-benji', 'The van is pulling away! Pick it up for 45 seconds and catch it before the bridge!', 120, { if: 'van', chapter: 'The jammer', fx: 'screech' }),
      surge(796, 45, 'vel-benji', 'The terminal is up ahead! Pick it up for 45 seconds and get there before the ferry does!', 120, { unless: 'van', chapter: 'The terminal', fx: 'chargeup' }),
      { at: 895, kind: 'story', if: 'van', fx: 'thunk', say: 'You catch the van at a red light, sparks flying off your heels. On its side, a logo: a silver storm cloud. Voltaris. You yank the cable off the box on its roof.' },
      { at: 896, kind: 'story', unless: 'van', fx: 'thunk', say: 'You hit the terminal at full charge. Davo hurls a rope. You catch it, loop it round the bollard and lean back. The CityCat swings in and bumps gently against the pontoon.' },
      { at: 950, kind: 'story', if: 'van', who: 'vel-davo', say: 'Steering is back! The skipper has her! We are slowing right down. Whoever you are, you are a legend!' },
      { at: 951, kind: 'story', unless: 'van', who: 'vel-davo', say: 'We are tied up! Everyone is off and dry. Well, mostly dry. Whoever you are, you are a legend!' },
      { at: 1005, kind: 'story', who: 'vel-skye', spatial: 'helicopter', say: 'Skye Lennox, in the news chopper over the river. A glowing runner has just saved a runaway CityCat. Brisbane, I think we have a superhero!' },
      { at: 1065, kind: 'steady', seconds: 200, chapter: 'Velocity', fx: 'crowdroar', say: 'The crowd at the terminal is chanting something. You listen. Velocity. Velocity. Hold an easy pace and soak it in.', easyNudge: EASY_VAL },
      { at: 1135, kind: 'quiz', who: 'vel-davo', say: 'Oi, Velocity! Quiz from the deckhand. CityCats started running on this river in which year?',
        options: [{ key: 'A', label: '1976' }, { key: 'B', label: '1996' }, { key: 'C', label: '2016' }], answer: 'B',
        right: line('vel-davo', '1996! Nailed it. Thirty years of CityCats, and tonight was the wildest ride yet.'),
        wrong: line('vel-davo', 'It was 1996. Thirty years of CityCats, and tonight was the wildest ride yet.') },
      { at: 1205, kind: 'story', who: 'vel-val', say: 'That blur on the far bank. I have seen one like it before. Somebody is making speed in a lab. And Voltaris builds storm machines.' },
      surge(1265, 45, 'vel-val', 'The blur is back, and it is heading for the city! Pick it up for 45 seconds. See who it is!', 120, { chapter: 'The blur', fx: 'zipby' }),
      { at: 1365, kind: 'story', spatial: 'speedster', say: 'You chase a red streak up the riverbank. It stops under a streetlight, just long enough. A mask. A silver suit, crackling red. Then it is gone.' },
      { at: 1420, kind: 'story', fx: 'herohit', say: 'A giant screen on a tower flicks on. A man in a sharp suit smiles down over the river.' },
      { at: 1450, kind: 'story', who: 'vel-vale', say: 'Brisbane, I am Corbin Vale. Voltaris. Our Stormcatcher will harvest lightning and power your homes. And meet our champion. Riptide.' },
      { at: 1490, kind: 'finale', say: 'Episode two complete. The CityCat is safe, Brisbane has a new hero, and Voltaris has a speedster of its own. To be continued.' },
    ],
  },
  {
    id: 'velocity-bridge',
    episode: 3,
    previously: 'Previously on Velocity: a runaway CityCat, a red blur on the riverbank, and a slick boss with a speedster of his own.',
    next: 'Next time on Velocity: Brisbane in the dark, a hospital on the clock, and a rival who changes sides.',
    saga: 'velocity',
    title: 'Bridge Race',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Steady effort',
    blurb: 'Episode 3. Riptide challenges you to a race across the Story Bridge at midnight, and the whole city turns out to watch.',
    loop: line('vel-benji', 'Loop closed! That is more laps than the Story Bridge has girders. Probably.'),
    early: line('vel-val', 'Stopping there is fine, love. Nobody needs to win tonight. Get some rest.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 270, chapter: 'Saturday night', scene: 'street', say: 'Saturday night in Fortitude Valley. The storm has passed and the streets are steaming. Every screen in the Valley shows the same thing. A challenge. Warm up easy.' },
      { at: 60, kind: 'story', who: 'vel-vale', say: 'Velocity, if you are listening. Riptide challenges you to a race. Midnight. Kangaroo Point to the Valley, over the Story Bridge. Let the city see who is fastest.' },
      { at: 120, kind: 'story', who: 'vel-val', say: 'I do not like it. A race is a show, and Vale loves a show. He does not want a winner. He wants you running flat out, right where his machine can reach you.' },
      { at: 180, kind: 'story', who: 'vel-benji', say: 'Counterpoint. If you skip it, Riptide wins and Vale gets a free ad. Also, I made you a cape. It is a tea towel.' },
      { at: 235, kind: 'choice', id: 'cape', who: 'vel-benji', say: 'Very important question. Will you wear the cape?',
        options: [
          { key: 'A', label: 'Wear the cape', flag: 'cape', say: line('vel-benji', '[excited] Yes! It says Souvenir of Mooloolaba on it, but nobody will notice at speed.') },
          { key: 'B', label: 'No cape', flag: 'nocape', say: line('vel-val', 'Good choice. Capes catch the wind. Trust me.') },
        ],
        default: 'A', timeout: line('vel-benji', 'I am taking that as a yes. Cape on.') },
      { at: 295, kind: 'story', fx: 'crowdroar', chapter: 'Midnight', say: 'Midnight at Kangaroo Point. Thousands of people line the cliffs with their phones held high. Above the river, the Story Bridge glows gold.' },
      { at: 355, kind: 'quiz', who: 'vel-skye', say: 'Skye Lennox, live from the chopper. A little history while we wait. The Story Bridge opened in which year?',
        options: [{ key: 'A', label: '1920' }, { key: 'B', label: '1940' }, { key: 'C', label: '1960' }], answer: 'B',
        right: line('vel-skye', '1940! The longest cantilever bridge in Australia. And tonight, its fastest crossing ever.'),
        wrong: line('vel-skye', 'It opened in 1940. The longest cantilever bridge in Australia. And tonight, its fastest crossing ever.') },
      { at: 420, kind: 'story', spatial: 'speedster', fx: 'zipby', say: 'A streak of red light skids to a stop beside you. Riptide. Silver suit, red mask, a glowing battery pack on her back. She grins.' },
      { at: 470, kind: 'story', if: 'cape', who: 'vel-riptide', say: '[sarcastic] So you are the famous Velocity. Nice tea towel.' },
      { at: 471, kind: 'story', unless: 'cape', who: 'vel-riptide', say: '[sarcastic] So you are the famous Velocity. I thought you would be taller.' },
      { at: 520, kind: 'story', who: 'vel-riptide', say: 'Rules. Up the ramp, over the bridge, down into the Valley. First to Brunswick Street Mall wins.' },
      surge(575, 45, 'vel-skye', 'And they are off! Pick it up for 45 seconds, up the ramp and onto the bridge!', 120, { chapter: 'The race', fx: 'chargeup' }),
      { at: 670, kind: 'story', spatial: 'speedster', say: 'You hit the bridge deck side by side. Steel girders flash past like frames of a film. Riptide is fast. Really fast. But her pack is flickering.' },
      { at: 730, kind: 'story', who: 'vel-val', say: '[whispers] Listen to me. Her suit is not making speed. It is drinking it. Every time you surge near her, that pack glows brighter. It is taking yours.' },
      { at: 790, kind: 'story', who: 'vel-benji', say: 'Val is right. Your voltage dropped twelve percent on the ramp, and hers went up by the same. Vale is using the race to steal your charge!' },
      surge(850, 50, 'vel-val', 'Then go so fast the pack cannot keep up! Pick it up for 50 seconds across the middle of the bridge!', 130, { chapter: 'The span', fx: 'chargeup' }),
      { at: 960, kind: 'story', fx: 'powerdown', say: 'At the top of the span, Riptide’s pack splutters. Sparks. A whine. She slows, stumbles, and sits down hard on the footpath. Her suit has gone dark.' },
      { at: 1010, kind: 'story', who: 'vel-riptide', say: '[sighs] I am okay. The suit just shut itself off. Go on, Velocity. Win. That is what everyone came for.' },
      { at: 1060, kind: 'choice', id: 'help', who: 'vel-skye', say: 'The finish is right there, and the crowd is roaring. Do you sprint for the win, or turn back for Riptide?',
        options: [
          { key: 'A', label: 'Go for the win', flag: 'win', say: line('vel-benji', 'Go! I will ask the bridge crew to check on her.') },
          { key: 'B', label: 'Turn back for her', flag: 'help', say: line('vel-val', 'That is a hero’s answer. Go to her.') },
        ],
        default: 'B', timeout: line('vel-val', 'You are already turning back. I knew you would.') },
      surge(1120, 50, 'vel-benji', 'Down the ramp and into the Valley! Pick it up for 50 seconds, all the way to the mall!', 130, { if: 'win', chapter: 'The finish', fx: 'chargeup' }),
      { at: 1121, kind: 'story', unless: 'win', say: 'You jog back and kneel beside her. You unclip the flickering pack and set it down. She pulls off her mask. Her name is Tess, and she is fine. Just puffed.' },
      surge(1180, 50, 'vel-riptide', '[laughs] I was a sprinter before the suit, you know. Race you to the end. Pick it up for 50 seconds, side by side!', 130, { unless: 'win', chapter: 'The finish', fx: 'chargeup' }),
      { at: 1250, kind: 'story', if: 'win', fx: 'crowdroar', say: 'You burst into the mall in a crackle of blue light and the crowd goes wild. Up on the big screen, the bridge crew reach Riptide. She is fine. She stares at the camera. At you.' },
      { at: 1251, kind: 'story', unless: 'win', fx: 'crowdroar', say: 'You cross the line together. Nobody wins. Everybody cheers. It is the loudest cheer of the night.' },
      { at: 1310, kind: 'quiz', who: 'vel-benji', say: 'Speed nerd question while you cool off. What is the fastest land animal on Earth?',
        options: [{ key: 'A', label: 'Red kangaroo' }, { key: 'B', label: 'Cheetah' }, { key: 'C', label: 'Racehorse' }], answer: 'B',
        right: line('vel-benji', 'The cheetah. Over a hundred kilometres an hour. Tonight you gave it a run for its money.'),
        wrong: line('vel-benji', 'It is the cheetah. Over a hundred kilometres an hour. Tonight you gave it a run for its money.') },
      { at: 1375, kind: 'steady', seconds: 220, say: 'The crowd drifts home. You jog back along the river while the bridge lights twinkle on the water. Hold an easy pace.', easyNudge: EASY_VAL },
      { at: 1440, kind: 'story', unless: 'win', who: 'vel-riptide', say: '[whispers] Thank you. Vale told me the suit was safe. He told me the Stormcatcher would power the city. I think he lied about both.' },
      { at: 1441, kind: 'story', if: 'win', say: 'Your phone buzzes. A message from an unknown number. Nice win. But watch the Stormcatcher. He lied to me. T.' },
      { at: 1500, kind: 'story', who: 'vel-vale', say: 'Well run, Velocity. Did you enjoy the show? So did my machine. Thanks to you, the Stormcatcher is fully charged. Time to switch it on.' },
      surge(1560, 50, 'vel-val', 'Something is wrong with the power. Lights are flickering all over the city. Pick it up for 50 seconds and get to high ground!', 120, { chapter: 'Flicker', fx: 'alarm' }),
      { at: 1665, kind: 'story', fx: 'powerdown', scene: 'citydark', say: 'From the top of the cliffs you watch it happen. One suburb at a time, the lights go out. The towers. The bridge. The whole of Brisbane, dark.' },
      { at: 1725, kind: 'story', who: 'vel-benji', say: '[whispers] Mate. Every power line in the city just drained into one place. The Voltaris tower. He did not catch a storm. He caught Brisbane.' },
      { at: 1780, kind: 'finale', say: 'Episode three complete. A race across the Story Bridge, a rival with a secret, and a city in the dark. To be continued.' },
    ],
  },
  {
    id: 'velocity-blackout',
    episode: 4,
    previously: 'Previously on Velocity: a race across the Story Bridge, a rival named Tess, and a storm machine that just switched off Brisbane.',
    next: 'Next time on Velocity: a super storm over Surfers Paradise, a machine that feeds it, and a race against the storm itself.',
    saga: 'velocity',
    title: 'Blackout',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Hard effort',
    blurb: 'Episode 4. The whole city is dark. A hospital needs a part, Tess has a secret, and the lights are hidden in a tower.',
    loop: line('vel-kemp', 'Loop closed. That is one more street checked. Good work, Velocity.'),
    early: line('vel-kemp', 'Stopping there is fine, Velocity. My crews will take it from here. You did plenty.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 300, chapter: 'One am', scene: 'citydark', say: 'One in the morning. Brisbane in total darkness. No streetlights, no traffic lights, just torches and the stars. You have never seen so many stars over the city. Warm up easy.' },
      { at: 60, kind: 'story', who: 'vel-kemp', say: 'This is Inspector Rana Kemp, emergency services. Phones are patchy, but radios work. Velocity, I hear you are quick. We could use you.' },
      { at: 120, kind: 'story', who: 'vel-benji', say: 'I am on my uncle’s old CB radio, running off a car battery. Very retro. Inspector Kemp sent me a list of jobs. Job one is the hospital.' },
      { at: 180, kind: 'story', who: 'vel-kemp', say: 'The hospital generator is running fine, but it needs a spare part from the depot at Newstead to keep going all night. Our trucks are stuck at dark intersections.' },
      { at: 240, kind: 'quiz', who: 'vel-val', say: 'Before you go, a storm lesson. Why do you always see the lightning before you hear the thunder?',
        options: [{ key: 'A', label: 'Light is faster than sound' }, { key: 'B', label: 'Thunder starts later' }, { key: 'C', label: 'Ears are slower than eyes' }], answer: 'A',
        right: line('vel-val', 'Light is faster than sound. Nearly a million times faster. Remember that, love. It matters tonight.'),
        wrong: line('vel-val', 'Because light is faster than sound. Nearly a million times faster. Remember that, love.') },
      surge(310, 60, 'vel-benji', 'Job one! Pick it up for 60 seconds to the depot. Take the footpaths, they are clear!', 140, { chapter: 'The depot', fx: 'chargeup' }),
      { at: 430, kind: 'story', spatial: 'firetruck', fx: 'siren', say: 'You weave through the dark streets, a streak of blue light. A fire truck rolls past with its siren wailing, and the crew lean out to wave.' },
      { at: 490, kind: 'story', fx: 'thunk', say: 'At the depot, the part is waiting in a box with your name on it. Well, it says Velocity, in texta. Close enough.' },
      surge(545, 60, 'vel-kemp', 'The hospital is waiting! Pick it up for 60 seconds and get that part to the generator!', 140, { chapter: 'The hospital', fx: 'chargeup' }),
      { at: 665, kind: 'story', who: 'vel-kemp', say: 'Generator is happy. Every ward is lit. The night shift want you to know they are cheering. Quietly, because people are asleep.' },
      { at: 725, kind: 'story', spatial: 'speedster', fx: 'zipby', say: 'A red streak skids up beside you. No suit this time. Just running shoes and a Voltaris hoodie. Tess.' },
      { at: 780, kind: 'story', who: 'vel-riptide', say: 'I quit. Tonight. I saw the plans on Vale’s desk. The Stormcatcher was never about catching storms. It feeds them. Bigger storms, more lightning to sell.' },
      { at: 845, kind: 'story', who: 'vel-val', say: '[sighs] I was afraid of that. A machine that feeds a storm could build one bigger than anything this coast has ever seen.' },
      { at: 905, kind: 'story', who: 'vel-riptide', say: 'He is moving it tonight, on a barge, down to the Gold Coast. A huge storm is forming off Surfers Paradise, and he wants to feed it.' },
      { at: 960, kind: 'choice', id: 'trust', who: 'vel-benji', say: 'So. Do we trust her? She did try to beat you on a bridge.',
        options: [
          { key: 'A', label: 'Trust Tess', flag: 'trust', say: line('vel-riptide', 'Thank you. I will not let you down. I know the Voltaris tower like my own house.') },
          { key: 'B', label: 'Keep an eye on her', flag: 'wary', say: line('vel-val', 'Fair enough. Trust is earned. Let her show you.') },
        ],
        default: 'A', timeout: line('vel-benji', 'Okay, Val says trust her. Val is usually right. Annoyingly.') },
      { at: 1020, kind: 'steady', seconds: 200, chapter: 'The Valley', say: 'You and Tess jog side by side through the dark Valley, past cafes lit by candles. Hold an easy pace while you make a plan.', easyNudge: EASY_VAL },
      { at: 1090, kind: 'puzzle', who: 'vel-riptide', say: 'The tower door has a code. Vale uses trivia because he thinks he is clever. Queensland’s animal emblem. Go.',
        options: [{ key: 'A', label: 'Koala' }, { key: 'B', label: 'Platypus' }, { key: 'C', label: 'Brolga' }], answer: 'A',
        right: line('vel-riptide', 'Koala. Door is open. He really is not that clever.'),
        wrong: line('vel-riptide', 'It is the koala. The brolga is the state bird. Door is open.') },
      { at: 1155, kind: 'story', fx: 'beeps', scene: 'tower', chapter: 'The tower', say: 'The door clicks open. Inside, the stairwell hums with stolen power. Battery banks glow on every landing, all the way to the top.' },
      { at: 1215, kind: 'story', who: 'vel-benji', say: 'Here is the plan. Those batteries are full of Brisbane’s power. Get up to the roof and flip the main breaker, and it all flows back into the grid.' },
      surge(1275, 60, 'vel-riptide', 'Race you to the roof! Pick it up for 60 seconds. Go!', 140, { if: 'trust', chapter: 'The stairs', fx: 'chargeup' }),
      surge(1276, 60, 'vel-benji', 'Tess is holding the door. Pick it up for 60 seconds, up the stairwell to the roof!', 140, { unless: 'trust', chapter: 'The stairs', fx: 'chargeup' }),
      { at: 1395, kind: 'story', fx: 'thunk', scene: 'street', say: 'On the roof, a big red lever. You haul it down. Below you, a ripple of light spreads across Brisbane. Suburb after suburb, the city wakes up.' },
      { at: 1455, kind: 'story', who: 'vel-skye', fx: 'crowdroar', say: 'Skye Lennox, back in the chopper. The lights are back on! People are out on their balconies cheering. And they are chanting a name.' },
      { at: 1515, kind: 'quiz', who: 'vel-skye', say: 'While Brisbane celebrates. They say lightning never strikes the same place twice. Can it?',
        options: [{ key: 'A', label: 'Never' }, { key: 'B', label: 'Yes, often' }, { key: 'C', label: 'Only once a year' }], answer: 'B',
        right: line('vel-skye', 'Yes, often. The Empire State Building in New York gets hit about 25 times a year.'),
        wrong: line('vel-skye', 'Yes, often, as it turns out. The Empire State Building in New York gets hit about 25 times a year.') },
      { at: 1580, kind: 'story', who: 'vel-vale', say: 'Clever little hero. You got your lights back. But my barge left an hour ago. By sunrise, the Stormcatcher will be feeding the biggest storm the Gold Coast has ever seen.' },
      surge(1640, 60, 'vel-val', 'Then we go now. Pick it up for 60 seconds to Roma Street. Kemp is holding a train for you!', 140, { chapter: 'The coast train', fx: 'alarm' }),
      { at: 1760, kind: 'story', fx: 'boltstrike', spatial: 'thunderroll', say: 'Out the train window, far to the south, the sky flickers. Purple, white, purple. A storm so tall it blots out the stars.' },
      { at: 1815, kind: 'story', who: 'vel-val', say: '[whispers] I need to tell you something, love. I did not lose my gift by slowing down. I lost it trying to outrun a storm. On my own.' },
      { at: 1860, kind: 'finale', say: 'Episode four complete. Brisbane has its lights back, Tess has switched sides, and a super storm is waiting on the coast. To be continued.' },
    ],
  },
  {
    id: 'velocity-storm',
    episode: 5,
    previously: 'Previously on Velocity: a city in the dark, a rival turned friend, and a storm machine on its way to the Gold Coast.',
    saga: 'velocity',
    title: 'Outrun the Storm',
    series: 'thriller',
    type: 'surge',
    minutes: 35,
    difficulty: 'Hard effort',
    blurb: 'Episode 5, the finale. A super storm over Surfers Paradise, a machine that feeds it, and one way to save the coast: outrun the storm.',
    loop: line('vel-riptide', 'Loop closed, Sparky. From up on the surf club, your route looks like a lightning bolt.'),
    early: line('vel-val', 'Stopping there is fine, love. Tess can lead the storm the rest of the way. You got us so close.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 300, chapter: 'Five am', scene: 'stormfront', say: 'Five in the morning, Surfers Paradise. The towers along the beach glow against a sky the colour of plums. The surf is enormous. Warm up easy.' },
      { at: 60, kind: 'story', who: 'vel-shaz', say: 'Shaz, surf lifesaving patrol captain. The beach is closed and we are moving everyone back from the water. Velocity, Tess. Good to have you.' },
      { at: 120, kind: 'quiz', who: 'vel-shaz', say: 'Quick one, since you are on my beach. When the patrol is on, where is the safest place to swim?',
        options: [{ key: 'A', label: 'Near the rocks' }, { key: 'B', label: 'Between red and yellow flags' }, { key: 'C', label: 'Beside the jetty' }], answer: 'B',
        right: line('vel-shaz', 'Between the red and yellow flags. Not today, though. Today, nobody swims.'),
        wrong: line('vel-shaz', 'Always swim between red and yellow flags. Not today, though. Today, nobody swims.') },
      { at: 180, kind: 'story', fx: 'thunder', spatial: 'thunderroll', say: 'Out past the breakers, the Voltaris barge rocks at anchor. On its deck, a tall silver mast reaches up into the clouds, crackling with purple light.' },
      { at: 240, kind: 'story', who: 'vel-benji', say: 'I am on the surf club roof with three laptops and a sausage roll. Every time that mast fires, the storm grows. And it is pulling the storm toward the towers.' },
      { at: 300, kind: 'story', who: 'vel-vale', fx: 'herohit', say: 'Good morning, Gold Coast! Behold the Stormcatcher at full power. The biggest storm in history, and every bolt of it belongs to Voltaris.' },
      { at: 360, kind: 'story', who: 'vel-val', say: 'Listen, both of you. That machine locks on to the strongest charge it can find. Right now, that is the storm. But it could be you.' },
      { at: 420, kind: 'story', who: 'vel-benji', say: '[excited] Oh. Val, that is brilliant. If Velocity runs fast enough, the mast locks on to the runner instead. And the storm follows the mast!' },
      { at: 480, kind: 'story', who: 'vel-riptide', say: 'So you run, the storm chases you, and you lead it away from the city. Up the beach, past the Spit, and out over the ocean where it can blow itself out.' },
      surge(540, 60, 'vel-val', 'Then let us get its attention. Pick it up for 60 seconds along the sand. Build the biggest charge of your life!', 140, { chapter: 'Lock on', fx: 'chargeup' }),
      { at: 660, kind: 'story', fx: 'boltstrike', say: 'The mast swings round. A beam of purple light locks on to you. Overhead, the whole storm begins to turn, slowly, like a giant wheel. It is following you.' },
      { at: 720, kind: 'puzzle', who: 'vel-benji', say: 'Science check before we go on. Down here in the Southern Hemisphere, which way does a cyclone spin?',
        options: [{ key: 'A', label: 'Clockwise' }, { key: 'B', label: 'Anticlockwise' }, { key: 'C', label: 'It does not spin' }], answer: 'A',
        right: line('vel-benji', 'Clockwise. And this storm spins the same way. On this side of it, the wind blows north. Right at your back.'),
        wrong: line('vel-benji', 'It spins clockwise. And this storm spins the same way. On this side of it, the wind blows north, right at your back.') },
      surge(790, 60, 'vel-riptide', 'Run! Pick it up for 60 seconds, up the beach toward Main Beach. I am right beside you!', 140, { chapter: 'The chase', fx: 'zipby' }),
      { at: 910, kind: 'story', fx: 'stormwall', spatial: 'thunderroll', say: 'A wall of rain sweeps up the beach behind you. The storm is gaining. Bolts stamp down on the sand, one, then another, always a step behind.' },
      { at: 970, kind: 'story', who: 'vel-skye', spatial: 'helicopter', say: 'Skye Lennox, as close as we dare. The storm has turned away from Surfers Paradise! It is following two runners up the beach. I have never seen anything like it.' },
      { at: 1030, kind: 'steady', seconds: 180, say: 'The storm hangs back, gathering itself. Tess says it is catching its breath. So should you. Hold an easy pace and save everything for what comes next.', easyNudge: EASY_VAL },
      { at: 1090, kind: 'quiz', who: 'vel-riptide', say: 'Distraction time. I raced here as a kid. In 2018, the Gold Coast hosted which big sporting event?',
        options: [{ key: 'A', label: 'The Olympics' }, { key: 'B', label: 'The Commonwealth Games' }, { key: 'C', label: 'The Rugby World Cup' }], answer: 'B',
        right: line('vel-riptide', 'The Commonwealth Games. The mascot was Borobi, a blue koala. I had the plush toy.'),
        wrong: line('vel-riptide', 'It was the Commonwealth Games. The mascot was Borobi, a blue koala. I had the plush toy.') },
      { at: 1160, kind: 'story', who: 'vel-kemp', say: 'Kemp here. Water police have reached the barge, but Vale has locked the controls. The mast will not switch off from the deck.' },
      { at: 1220, kind: 'story', who: 'vel-vale', say: '[laughs] Nobody outruns a storm, Velocity. Your old friend Zephyr tried, years ago. Ask her how that went.' },
      { at: 1275, kind: 'story', who: 'vel-val', say: 'He is right. I tried. But I tried alone. You are not alone, love. Not even close.' },
      { at: 1330, kind: 'choice', id: 'plan', who: 'vel-benji', say: 'Last trick. Shaz can take Tess out to the barge in the rescue boat to pull the plug, while you keep the storm busy. Or you two lead it out past the Spit together.',
        options: [
          { key: 'A', label: 'Tess takes the barge', flag: 'barge', say: line('vel-riptide', 'On it. Keep that storm busy, Sparky. Do not you dare slow down.') },
          { key: 'B', label: 'Run it out together', flag: 'together', say: line('vel-riptide', 'Together, then. Matching pace, all the way.') },
        ],
        default: 'B', timeout: line('vel-val', 'Together. Nobody should outrun a storm alone.') },
      surge(1390, 60, 'vel-benji', 'Tess is on the water! Keep that storm on you! Pick it up for 60 seconds, all the way to the Spit!', 140, { if: 'barge', chapter: 'The Spit', fx: 'chargeup' }),
      surge(1391, 60, 'vel-riptide', 'Side by side, Sparky! Pick it up for 60 seconds, all the way to the Spit!', 140, { unless: 'barge', chapter: 'The Spit', fx: 'chargeup' }),
      { at: 1510, kind: 'story', if: 'barge', fx: 'powerdown', say: 'Out on the barge, Tess yanks the master cable. The mast fizzles, splutters and goes dark. Above you, the storm lets go of the coast.' },
      { at: 1511, kind: 'story', unless: 'barge', fx: 'powerdown', say: 'Locked on to you both, the mast drags the storm north, so far that its cable snaps free of the barge. The mast fizzles, splutters and goes dark.' },
      surge(1570, 60, 'vel-val', 'The storm has one last surge in it, and it is coming for the beach! Pick it up for 60 seconds. Outrun it. This is what the gift is for!', 150, { chapter: 'Outrun', fx: 'stormwall' }),
      { at: 1690, kind: 'story', fx: 'herohit', say: 'You run faster than you have ever run. Faster than the rain. Faster than the thunder. The storm falls behind you, and for one moment there is only your breath, and light.' },
      { at: 1750, kind: 'story', fx: 'thunder', say: 'Behind you, the storm breaks apart over the ocean into a hundred harmless clouds. Then the sun comes up through them, gold and pink.' },
      { at: 1810, kind: 'story', who: 'vel-kemp', say: 'Kemp here. Mr Vale has been walked off the barge by water police. He is soaked, grumpy and completely unharmed. The Stormcatcher is switched off for good.' },
      { at: 1870, kind: 'steady', seconds: 180, scene: 'beachdawn', chapter: 'Sunrise', say: 'The beach is quiet now. Gulls, gentle waves and a warm wind. Cool down with an easy jog or a walk along the sand.', easyNudge: EASY_VAL },
      { at: 1950, kind: 'story', fx: 'crowdroar', say: 'People pour back onto the beach, cheering. Lifesavers, kids, surfers, Benji with his laptops. And walking down the sand in a sun hat is Val. In person, at last.' },
      { at: 2020, kind: 'story', who: 'vel-val', say: 'You did what I never could. You did not outrun it alone. That is the real gift, love. Now. Who wants a coffee?' },
      { at: 2080, kind: 'finale', say: 'Velocity is complete. The storm is gone, the coast is safe, and the fastest hero in Queensland knows the fastest way is together. Keep running.' },
    ],
  },
]

export const CHAIN = ['velocity-strike', 'velocity-ferry', 'velocity-bridge', 'velocity-blackout', 'velocity-storm']

export const CAST = {
  'velocity-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.85, rate: 0.98 }, // Peter Michael
  'vel-val': { name: 'Val Archer', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.92, rate: 0.96, radio: true }, // Julieanne, on the phone
  'vel-benji': { name: 'Benji', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.15, rate: 1.1, radio: true }, // Ziggy, in your earbuds
  'vel-vale': { name: 'Corbin Vale', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.9, rate: 1.04 }, // Scotty
  'vel-riptide': { name: 'Riptide', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 1.15, rate: 1.08 }, // Amelia
  'vel-skye': { name: 'Skye Lennox', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.2, rate: 1.06, radio: true }, // Ruby, from the news chopper
  'vel-davo': { name: 'Davo', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 1.0, radio: true }, // Jimbo, on the ferry radio
  'vel-kemp': { name: 'Inspector Rana Kemp', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 0.95, rate: 1.0, radio: true }, // Simon
  'vel-shaz': { name: 'Shaz', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.0, rate: 1.02 }, // Eva
}

export const LOOK = { accent: '#FFD23F', deep: '#0D0A26', tag: 'Superhero' }

export const LIBRARY = {
  ambience: {
    stormfront: 'A wild subtropical summer thunderstorm beside the water at night: heavy rain hissing on water and pavement, strong gusting wind through palms and big trees, small waves slapping, thunder rolling near and far, no music, no voices',
    citydark: 'A big city during a total blackout at night: no traffic, an eerie hush, a light warm breeze between towers, crickets in a park, a generator humming far away, a distant siren once, no music, no voices',
    beachdawn: 'A long surf beach at sunrise after a storm: gentle waves washing up the sand, a soft warm breeze, seagulls calling far off, water trickling back down the shore, no music, no voices',
  },
  sfx: {
    'thunder-roll': { prompt: 'Huge thunder rolling across the sky from one side to the other, a long deep rumble that crackles and fades away', seconds: 7 },
    'speedster-pass': { prompt: 'A superhuman runner blurring past at incredible speed, a sharp rushing whoosh with an electric crackle and fizz trailing behind, fading fast', seconds: 2 },
  },
  tracks: {
    'velocity-charge': {
      title: 'Faster Than Thunder',
      prompt: 'Original heroic superhero chase instrumental. Soaring brass fanfare, driving orchestral strings in fast ostinato, thundering drums and cymbal swells, an electric synth pulse under it, bold and triumphant, about 145 bpm. No vocals.',
      seconds: 90,
    },
  },
  chase: 'velocity-charge',
}
