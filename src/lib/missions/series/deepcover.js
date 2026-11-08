// Deep Cover: a five episode spy thriller in Melbourne. A tiny secret unit
// called the Aviary has lost a prototype called the Lyrebird, a machine that
// can copy any voice from three seconds of it. Whoever has it can fake any
// order from anyone, so phones and radios cannot be trusted. The Aviary needs
// a courier nobody would suspect: a runner. You, codename Swift.
//
//   1 The Courier: laneways and trams in the CBD at night, a drop behind a
//     loose brick, a tail to shake, and a rival called Magpie.
//   2 Under the Clocks: Flinders Street Station and the Yarra, a Caesar
//     shift in a rowing shed, and proof of a traitor inside the Aviary.
//   3 The Last Quarter: rooftops, a hundred thousand footy fans at the MCG,
//     and the double cross: a fake Kestrel who knows the code. Rook wrote it.
//   4 Penguins at Midnight: St Kilda Pier and Port Phillip Bay, a new code
//     word, and Magpie sails off with the Lyrebird.
//   5 The Mist Line: Puffing Billy in the misty Dandenong Ranges. Magpie was
//     deep cover all along, and a real lyrebird helps you find Rook.
//
// Same beat format as thrillers.js. Pure data, imports nothing.
//
// Trivia is real (checked with a web search):
//   - Melbourne has the largest operating urban tram network in the world,
//     about 250 km of double track (Wikipedia, Trams in Melbourne).
//   - In spycraft, a legend is a carefully prepared invented identity; dry
//     cleaning is moving about to find and shake anyone following you
//     (Wikipedia, Tradecraft).
//   - Flinders Street opened on 12 September 1854, the first city railway
//     station in Australia; the present building was completed in 1909;
//     "under the clocks" is the meeting spot at the main entrance, on the
//     corner of Flinders and Swanston streets (Wikipedia).
//   - The Yarra is nicknamed "the upside down river" (Wikipedia, Geography
//     of the Yarra River).
//   - The Caesar cipher is named after Julius Caesar, who used a shift of
//     three (Wikipedia). V K H G shifted back three is S H E D.
//   - The MCG holds about 100,024 (the largest stadium in Australia), and
//     is known locally as "the G" (Wikipedia).
//   - The Melbourne Football Club was founded in 1858 and is widely
//     recognised as the oldest professional club of any football code; it
//     has been called the Demons since 1933 (Wikipedia).
//   - Luna Park Melbourne opened on 13 December 1912 with its Mr Moon face
//     gate; its Great Scenic Railway has run continuously since 1912, the
//     oldest continuously operating roller coaster, and a brakeman rides on
//     the train (Wikipedia).
//   - About 1,400 little penguins live at the St Kilda Pier and breakwater;
//     they are the smallest penguin species and come home at sunset (Parks
//     Victoria).
//   - The Rip is the narrow entrance from Bass Strait into Port Phillip Bay,
//     the only sea route into Melbourne (Wikipedia).
//   - Puffing Billy runs on 762 mm (2 ft 6 in) narrow gauge, the line opened
//     in 1900, it runs in the Dandenong Ranges from Belgrave (via Menzies
//     Creek, Emerald and Lakeside to Gembrook), passengers sit with their
//     legs dangling over the side (Wikipedia), and it crosses the curved
//     timber trestle over Monbulk Creek near Belgrave (pocketoz.com.au).
//   - Mountain ash, the main tree of Sherbrooke Forest in the Dandenong
//     Ranges, is the tallest flowering plant in the world; Sherbrooke is
//     famous for superb lyrebirds (Wikipedia).
//   - Lyrebirds are on the Australian 10 cent coin, and most of their
//     mimicry copies other birds (SBS News).
//
// House rules: tense, never cruel. Nobody is hurt, there are no weapons,
// Rook and the Collector are caught, not harmed, and the Lyrebird comes home.

const line = (who, text) => ({ who, text })

const K_WIN = line('dc-kestrel', 'Clean work, Swift. Ease right back now and get your breath.')
const K_OKAY = line('dc-kestrel', 'You got there, and that is what counts. Ease right back now.')
const K_HALF = line('dc-kestrel', 'Halfway. Stay with it.')
const F_WIN = line('dc-finch', '[excited] Nailed it! Ease right back now.')
const F_OKAY = line('dc-finch', 'Okay, you are clear. Breathe. Ease right back now.')
const F_HALF = line('dc-finch', 'Halfway! Keep going!')
const M_WIN = line('dc-magpie', '[laughs] Look at you go. Ease right back now.')
const M_OKAY = line('dc-magpie', 'You made it. Not bad at all. Ease right back now.')
const M_HALF = line('dc-magpie', 'Halfway, Swift. Keep up.')
const EASY = line('dc-kestrel', 'Easy, Swift. A calm jogger is invisible. A sprinter makes people look.')

const LINES = {
  'dc-kestrel': [K_WIN, K_OKAY, K_HALF],
  'dc-finch': [F_WIN, F_OKAY, F_HALF],
  'dc-magpie': [M_WIN, M_OKAY, M_HALF],
}

// a surge, with kind words from whoever called it
const dash = (at, seconds, who, say, recover, extra = {}) => {
  const [success, okay, half] = LINES[who] || LINES['dc-kestrel']
  return { at, kind: 'surge', seconds, who, say, recover, success, okay, half, ...extra }
}

export const SAGA = {
  id: 'deepcover',
  title: 'Deep Cover',
  blurb: 'A stolen machine that can copy any voice, a city of laneways and trams, and a secret unit that needs a courier nobody would suspect.',
  note: 'The story crosses rooftops, piers and rail lines at night. In real life, stay on the ground, keep off the tracks and run where it is well lit.',
  narrator: 'dc-narrator',
  score: 'deepcover',
  isNew: true,
}

export const EPISODES = [
  // ===================== 1 The Courier =====================
  {
    id: 'deepcover-courier',
    episode: 1,
    next: 'Next time on Deep Cover: a meeting under the clocks, a code in a rowing shed, and a chase along the Yarra.',
    saga: 'deepcover',
    title: 'The Courier',
    series: 'thriller',
    type: 'surge',
    minutes: 20,
    difficulty: 'Gentle',
    blurb: 'Episode 1. A busker slips you an earpiece in a laneway. A machine that copies voices is missing, and the city needs a courier nobody would suspect.',
    loop: line('dc-finch', 'You closed a loop. Classic dry cleaning. Anyone tailing you just got very dizzy.'),
    early: line('dc-kestrel', 'Stopping there is fine, Swift. The chip is safe and so are you. Get some rest. We will be in touch.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Eleven pm', scene: 'laneway', say: 'Melbourne. Eleven at night, and a fine rain is falling on the laneways. Neon hums. Spray paint glows on wet brick. Start with an easy walk or jog.' },
      { at: 30, kind: 'story', spatial: 'melbtram', say: 'A tram grinds round the corner of Flinders Street, bell clanging, blue sparks flicking off the wire.' },
      { at: 60, kind: 'story', who: 'dc-barry', fx: 'tramding', say: '[laughs] Evening! Barry, I drive the trams round here. Mind the tracks, mate, they are slippery as an eel tonight.' },
      { at: 100, kind: 'story', fx: 'noirstab', say: 'A busker in a long coat is packing up his guitar. As you jog past, he presses something small into your hand without looking up. An earpiece.' },
      { at: 145, kind: 'story', who: 'dc-rook', say: 'Pop it in and keep running. Name is Rook. Do not look back at me. Someone far more important than me is about to say hello.' },
      { at: 195, kind: 'story', who: 'dc-kestrel', say: 'Good evening. You may call me Kestrel. I run a small unit you have never heard of. Insiders call it the Aviary. Tonight, we need a runner.' },
      { at: 250, kind: 'story', who: 'dc-kestrel', say: 'Three hours ago, someone stole a prototype from our lab. We call it the Lyrebird. Give it three seconds of anyone’s voice, and it can say anything, as them.' },
      { at: 300, kind: 'story', who: 'dc-finch', fx: 'lyrebird', say: '[excited] Hi! Finch, tech. So here is the problem. Whoever has it can sound like anyone and give any order. We cannot trust phones. Or radios. Or, honestly, me.' },
      { at: 350, kind: 'story', who: 'dc-kestrel', say: 'Which is why you are on foot. Nobody looks twice at a jogger. And we use a code. When I give an order, I say four seasons. You answer, in one day.' },
      dash(395, 30, 'dc-kestrel', 'First job. A drop in Centre Place. A loose brick with a blue chalk mark. Pick it up for 30 seconds and get there before anyone else does.', 110, { chapter: 'The drop', fx: 'riser' }),
      { at: 480, kind: 'story', say: 'Centre Place. Chairs stacked, shutters down. A blue chalk mark on the third brick from the drain. It wiggles. Behind it sits a tiny silver chip.' },
      { at: 530, kind: 'story', who: 'dc-nell', fx: 'decode', say: 'Dr Nell Pardoe. I built the Lyrebird, I am sorry to say. That chip holds its voice fingerprint. With it, Finch can tell a real voice from a copy. Keep it safe.' },
      { at: 590, kind: 'quiz', who: 'dc-finch', say: 'Quick spy lesson while you jog. In spy talk, what is a legend?',
        options: [{ key: 'A', label: 'A fake identity' }, { key: 'B', label: 'A famous spy' }, { key: 'C', label: 'A secret map' }], answer: 'A',
        right: line('dc-finch', 'A fake identity! A whole made up life. Tonight, yours is, quote, just a jogger.'),
        wrong: line('dc-finch', 'In spy talk, a legend is a fake identity, a whole made up life. Tonight, yours is, quote, just a jogger.') },
      { at: 650, kind: 'story', who: 'dc-rook', fx: 'heartbeat', say: 'Rook again. Do not turn round. Grey coat, thirty metres back. He has been with you since Centre Place. You have a tail.' },
      { at: 700, kind: 'choice', id: 'tail', who: 'dc-kestrel', say: 'Time to shake him. Jump on the next tram and hop off as the doors close, or lose him in the laneways?',
        options: [
          { key: 'A', label: 'Take the tram', flag: 'tram', say: line('dc-finch', '[mischievously] The old tram trick. I love it. On you get, wait, and hop off when the doors beep.') },
          { key: 'B', label: 'The laneways', flag: 'lanes', say: line('dc-kestrel', 'The laneways. Left, right, left. Nobody knows them like a runner.') },
        ],
        default: 'B', timeout: line('dc-kestrel', 'The laneways, Swift. Go.') },
      dash(740, 30, 'dc-finch', 'Tram doors are open! Pick it up for 30 seconds. On board, and off again just as they close!', 110, { if: 'tram', chapter: 'Shake the tail', spatial: 'melbtram', fx: 'tramding' }),
      dash(741, 30, 'dc-kestrel', 'Into the lanes. Left, then right, then left again. Pick it up for 30 seconds and leave him guessing.', 110, { unless: 'tram', chapter: 'Shake the tail', fx: 'footsteps' }),
      { at: 820, kind: 'story', if: 'tram', who: 'dc-barry', say: '[laughs] In and out like a possum! Doors are shut, mate. Your mate in the grey coat is off to the far side of town, whether he likes it or not.' },
      { at: 821, kind: 'story', unless: 'tram', say: 'Three lanes later, you stop under a fire escape and listen. Rain. A dripping gutter. No footsteps. He is gone.' },
      { at: 870, kind: 'steady', seconds: 150, chapter: 'Flinders Lane', say: 'Ease into an easy pace along Flinders Lane. Look like any other late night jogger. That is your legend.', easyNudge: EASY },
      { at: 925, kind: 'story', who: 'dc-magpie', say: '[laughs] Not bad for a beginner. Hello, Swift. Do not stop. Call me Magpie. I like shiny things, and you have one in your pocket.' },
      { at: 975, kind: 'story', who: 'dc-kestrel', say: '[sighs] Magpie. A freelancer. Clever, charming, and she works for whoever pays the most. Check your pocket.' },
      { at: 1015, kind: 'story', fx: 'noirstab', say: 'Your pocket is empty. The chip is gone. Then Magpie jogs past, drops it back into your hand and winks. It is still warm.' },
      { at: 1050, kind: 'story', who: 'dc-magpie', say: '[whispers] A gift. Somebody in your little Aviary is lying to you. Ask yourself who knew where that drop was.' },
      dash(1085, 30, 'dc-kestrel', 'Headlights at the end of the lane. Not ours. Pick it up for 30 seconds, out onto Flinders Street and into the crowd!', 100, { chapter: 'Flinders Street', fx: 'screech' }),
      { at: 1150, kind: 'story', who: 'dc-finch', say: 'Uh, Swift? I just got a voice message. From you. It says you quit. It is your voice, every bit of it. And it is not you.' },
      { at: 1190, kind: 'finale', fx: 'lyrebird', say: 'Episode one complete. You have the chip, a rival has your measure, and someone out there now has your voice. To be continued.' },
    ],
  },

  // ===================== 2 Under the Clocks =====================
  {
    id: 'deepcover-clocks',
    episode: 2,
    previously: 'Previously on Deep Cover: an earpiece in a laneway, a machine that steals voices, and a rival called Magpie who gave back what she took.',
    next: 'Next time on Deep Cover: rooftops at dusk, a hundred thousand footy fans, and a handover in the last quarter.',
    saga: 'deepcover',
    title: 'Under the Clocks',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'Episode 2. A meeting under the clocks at Flinders Street, a courier with a red umbrella, a coded drop on the Yarra, and a traitor in the Aviary.',
    loop: line('dc-finch', 'Loop closed. You just walked a perfect circle round the station. Very hard to follow. Very dizzy making.'),
    early: line('dc-kestrel', 'That will do for tonight, Swift. Finch has the card, and you did plenty. Rest those legs.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 220, chapter: 'Under the clocks', scene: 'city', say: 'Flinders Street Station, the next night. The great dome glows yellow, and under it a row of old clocks shows the next train on every line. Warm up easy.' },
      { at: 45, kind: 'story', spatial: 'melbtram', say: 'Trams rattle across the intersection. A crowd spills down the station steps, and somebody shouts, see you under the clocks.' },
      { at: 90, kind: 'quiz', who: 'dc-finch', say: 'Fun fact while we wait. Flinders Street was the first city railway station in Australia. When did it open?',
        options: [{ key: 'A', label: '1854' }, { key: 'B', label: '1901' }, { key: 'C', label: '1956' }], answer: 'A',
        right: line('dc-finch', '1854! Steam trains and top hats. The building you are looking at came later. It was finished in 1909.'),
        wrong: line('dc-finch', 'It opened in 1854. Steam trains and top hats. The building you are looking at came later, in 1909.') },
      { at: 150, kind: 'story', who: 'dc-rook', say: 'Evening, Swift. Stand under the clocks like you are waiting for a date. The seller’s courier comes through here at nine. Red umbrella.' },
      { at: 205, kind: 'story', who: 'dc-finch', fx: 'decode', say: 'I checked that fake message from last night. It was built from your voice, on this earpiece channel. Somebody has been listening to us.' },
      { at: 260, kind: 'story', who: 'dc-rook', say: '[sighs] Magpie had your chip in her hand last night. Ten to one she bugged it. Never trust a freelancer, kid.' },
      { at: 310, kind: 'story', who: 'dc-kestrel', say: 'There. Red umbrella, grey cap, heading for the river. That is the courier. Follow him. Never closer than one tram length.' },
      { at: 360, kind: 'steady', seconds: 180, chapter: 'The river', scene: 'harbour', say: 'Down the steps to the Yarra. Easy pace along the riverbank. Keep the red umbrella in sight, and keep a tram length back.', easyNudge: line('dc-kestrel', 'Gently, Swift. Followers who hurry get noticed. Ease back a touch.') },
      { at: 425, kind: 'quiz', who: 'dc-kestrel', say: 'While we walk. Melbourne has an old nickname for this river. What is it?',
        options: [{ key: 'A', label: 'The upside down river' }, { key: 'B', label: 'The silver river' }, { key: 'C', label: 'The backwards river' }], answer: 'A',
        right: line('dc-kestrel', 'The upside down river. Locals have called it that for a very long time.'),
        wrong: line('dc-kestrel', 'They call it the upside down river. Locals have called it that for a very long time.') },
      { at: 485, kind: 'story', spatial: 'chatter', say: 'The courier stops at a row of rowing sheds. He slips something under a door, glances round, and walks off fast. Somebody laughs on a passing boat.' },
      dash(530, 40, 'dc-finch', 'He left a drop! Pick it up for 40 seconds and get to that shed before anyone collects it!', 120, { chapter: 'The drop', fx: 'riser' }),
      { at: 625, kind: 'puzzle', who: 'dc-finch', say: 'The note on the door is in code. Kestrel’s favourite, a Caesar shift of three. It says V, K, H, G. Move each letter back three. What word is it?',
        options: [{ key: 'A', label: 'Shed' }, { key: 'B', label: 'Ship' }, { key: 'C', label: 'Shop' }], answer: 'A',
        right: line('dc-finch', 'Shed! Julius Caesar used a shift of three too. So the drop is in this very shed. Under the third oar.'),
        wrong: line('dc-finch', 'It spells shed. V goes back to S, K to H, H to E, G to D. So the drop is in this very shed. Under the third oar.') },
      { at: 695, kind: 'story', fx: 'decode', say: 'Under the third oar, a waterproof pouch. Inside, a card. Finch reads it through the camera in your earpiece. Collector confirmed. MCG. Last quarter.' },
      { at: 750, kind: 'story', who: 'dc-nell', say: 'The Collector. He buys secrets and sells them on. If he gets the Lyrebird, he can fake any voice on Earth. Please, Swift. Be quick.' },
      { at: 800, kind: 'story', who: 'dc-finch', fx: 'heartbeat', say: 'Uh oh. Two people on the bank. Long coats, no umbrellas. They are looking at the shed. Now they are looking at you.' },
      { at: 840, kind: 'choice', id: 'boat', who: 'dc-magpie', say: '[mischievously] Need a lift? I have a little boat right here. Or you could run for Princes Bridge. Your choice, Swift.',
        options: [
          { key: 'A', label: 'Take her boat', flag: 'boat', say: line('dc-magpie', 'Smart. Sit down and hold on. I drive the way I steal. Quickly.') },
          { key: 'B', label: 'Run for the bridge', flag: 'bridge', say: line('dc-kestrel', 'The bridge. Good. Whatever she says, Magpie is not on our side.') },
        ],
        default: 'B', timeout: line('dc-kestrel', 'The bridge, Swift. Now.') },
      dash(880, 40, 'dc-magpie', 'Over the river we go. Hop out at the steps and pick it up for 40 seconds into Birrarung Marr. Do not look back!', 130, { if: 'boat', chapter: 'Across the Yarra', fx: 'whoosh' }),
      dash(881, 40, 'dc-kestrel', 'Princes Bridge. Pick it up for 40 seconds, across the river and into the crowd!', 130, { unless: 'boat', chapter: 'Across the Yarra', fx: 'footsteps' }),
      { at: 970, kind: 'story', if: 'boat', who: 'dc-magpie', say: '[laughs] You are welcome. A tip, free of charge. Ask your friend Rook where he was the night the Lyrebird went missing.' },
      { at: 971, kind: 'story', unless: 'boat', say: 'Halfway across the bridge, a jogger brushes past and tucks a note in your hand. A black and white feather is drawn on it. Ask Rook where he was that night.' },
      { at: 1025, kind: 'story', who: 'dc-rook', say: '[laughs] Where was I? At the pub, kid, with half the unit. Magpie is playing games. That is what magpies do. They swoop.' },
      { at: 1075, kind: 'steady', seconds: 160, chapter: 'Federation Square', scene: 'city', say: 'You lose the coats in the crowd at Federation Square. Big screens flicker in the drizzle. Ease into a steady jog and get your breath back.', easyNudge: EASY },
      { at: 1135, kind: 'story', who: 'dc-finch', say: 'Gadget time! I have left you a little friend in the bin by the steps. I call it the Burr. Stick it on anything, and I can follow it anywhere.' },
      dash(1185, 40, 'dc-kestrel', 'The coats have found you again. Pick it up for 40 seconds, through the station and out the other side!', 130, { chapter: 'The station', fx: 'noirstab' }),
      { at: 1275, kind: 'story', spatial: 'melbtram', say: 'You dive under the clocks and out onto Elizabeth Street. A tram slides between you and the coats. When it has passed, you are gone.' },
      { at: 1330, kind: 'story', who: 'dc-kestrel', say: '[whispers] Swift. Only a handful of people knew the Lyrebird existed. All of them work for me. One of them is the seller.' },
      { at: 1380, kind: 'story', who: 'dc-kestrel', say: 'So from now on, trust no voice on this earpiece. Not Finch. Not Rook. Not even mine. Always ask for the code.' },
      { at: 1440, kind: 'finale', fx: 'betrayal', say: 'Episode two complete. Tomorrow night, a hundred thousand people at the footy, one stolen voice, and a traitor inside the Aviary. To be continued.' },
    ],
  },

  // ===================== 3 The Last Quarter =====================
  {
    id: 'deepcover-quarter',
    episode: 3,
    previously: 'Previously on Deep Cover: a code in a rowing shed, a chase across the Yarra, and a traitor somewhere inside the Aviary.',
    next: 'Next time on Deep Cover: a long pier at midnight, a boat with no lights, and the Collector comes to collect.',
    saga: 'deepcover',
    title: 'The Last Quarter',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Steady effort',
    blurb: 'Episode 3. Roof to roof across the city, into the roar of the MCG, and a handover at the final siren. Then the code comes back right, and everything goes wrong.',
    loop: line('dc-finch', 'Another loop. If anyone is following you, they are now following themselves.'),
    early: line('dc-kestrel', 'Stopping is fine, Swift. Finch will keep eyes on the bag. You got us closer than anyone.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 240, chapter: 'Dusk', scene: 'city', say: 'Dusk over Melbourne. Light towers are blazing at the MCG, and half the city is walking to the footy in scarves. Warm up easy.' },
      { at: 50, kind: 'story', who: 'dc-kestrel', say: 'The seller’s courier is carrying the Lyrebird to the MCG in a footy bag. The Collector’s people are watching every street. So you will not use the streets.' },
      { at: 105, kind: 'story', who: 'dc-rook', say: 'Rooftops, kid. Up the fire escape behind the dumpling shop. From there it is roof to roof, all the way to the park.' },
      { at: 155, kind: 'story', fx: 'creak', say: 'The fire escape groans under your feet. Then you are up, above the trams and the rain, with the whole city glittering round you.' },
      dash(200, 45, 'dc-finch', 'Rooftop run! Flat roofs, with planks and ramps the window cleaners left behind. Pick it up for 45 seconds, roof to roof!', 130, { chapter: 'The rooftops', scene: 'laneway', fx: 'whoosh' }),
      { at: 300, kind: 'story', who: 'dc-magpie', say: '[laughs] Fancy meeting you up here. Race you to the end of the block? Loser buys the coffee.' },
      { at: 345, kind: 'choice', id: 'race', who: 'dc-finch', say: 'Magpie wants a race. Race her across the roofs, or let her go and take the stairs down?',
        options: [
          { key: 'A', label: 'Race her', flag: 'race', say: line('dc-magpie', '[excited] Oh, I like you. Ready, steady...') },
          { key: 'B', label: 'Take the stairs', flag: 'stairs', say: line('dc-kestrel', 'The stairs. Sensible. Never race a magpie. They cheat.') },
        ],
        default: 'B', timeout: line('dc-kestrel', 'Take the stairs, Swift. Save your legs.') },
      dash(385, 45, 'dc-magpie', 'Go! Pick it up for 45 seconds, roof to roof. I will not wait for you!', 130, { if: 'race', chapter: 'The race', fx: 'footsteps' }),
      { at: 386, kind: 'story', unless: 'race', say: 'You let her go and take the stairs. At the bottom, Magpie is leaning on a lamp post with two coffees. One of them is yours.' },
      { at: 470, kind: 'story', if: 'race', who: 'dc-magpie', say: '[laughs] A tie. Fine, I will buy. Listen, Swift. The seller is not who you think. I am here to stop the Collector, same as you.' },
      { at: 471, kind: 'story', unless: 'race', who: 'dc-magpie', say: 'Listen, Swift. The seller is not who you think. I am here to stop the Collector, same as you. Believe me or not.' },
      { at: 575, kind: 'steady', seconds: 200, chapter: 'The G', scene: 'footy', say: 'Through Yarra Park and in at the gates. The MCG. The roar of the crowd hits you like a wave. Settle into an easy lap of the concourse.', easyNudge: EASY },
      { at: 635, kind: 'quiz', who: 'dc-finch', say: 'Ooh, stadium quiz! When it is full, about how many people fit in the MCG?',
        options: [{ key: 'A', label: 'About 50,000' }, { key: 'B', label: 'About 100,000' }, { key: 'C', label: 'About 150,000' }], answer: 'B',
        right: line('dc-finch', 'About 100,000! The biggest stadium in Australia. Locals just call it the G.'),
        wrong: line('dc-finch', 'It holds about 100,000. The biggest stadium in Australia. Locals just call it the G.') },
      { at: 700, kind: 'story', fx: 'noirstab', say: 'There. Level two, a man in a big woolly scarf with a footy bag between his boots. The courier. He checks his watch. Then he checks it again.' },
      { at: 750, kind: 'story', who: 'dc-barry', say: '[laughs] Oi, sit down, mate, you are blocking the view! Oh. It is you. Barry, from the tram. Small world, this town.' },
      { at: 800, kind: 'quiz', who: 'dc-barry', say: 'Here is one for you, then. The oldest professional footy club of any code in the whole world plays right here. Founded in 1858. Which club?',
        options: [{ key: 'A', label: 'Melbourne' }, { key: 'B', label: 'Collingwood' }, { key: 'C', label: 'Geelong' }], answer: 'A',
        right: line('dc-barry', 'Melbourne! The Demons. Kicking about since 1858. Older than my nan’s nan, that is.'),
        wrong: line('dc-barry', 'It is Melbourne, mate. The Demons. Kicking about since 1858. Older than my nan’s nan, that is.') },
      { at: 860, kind: 'story', who: 'dc-kestrel', say: 'Last quarter. The Collector’s people are coming down the aisle. When that final siren goes, the whole crowd stands up. That is your moment.' },
      dash(910, 50, 'dc-kestrel', 'There is the siren! Everyone is on their feet. Grab the bag and pick it up for 50 seconds, up the stairs!', 130, { chapter: 'The final siren', fx: 'finalsiren' }),
      { at: 1010, kind: 'story', say: 'You weave up the stairs through a sea of scarves. The courier is shouting, but the crowd is singing so loudly that nobody hears a word.' },
      { at: 1060, kind: 'story', who: 'dc-finch', say: 'You have got it! Quick, the Burr. Stick it inside the lining of the bag. Just in case. Belt and braces.' },
      { at: 1110, kind: 'story', who: 'dc-kestrel', say: 'Swift, superb work. Take the bag to Gate 3. Rook will meet you there. Four seasons.' },
      { at: 1160, kind: 'story', fx: 'decode', say: 'In one day, you reply. The code is right. It is her voice, every word of it. At Gate 3, Rook is waiting with his hand out.' },
      { at: 1210, kind: 'choice', id: 'check', who: 'dc-rook', say: 'Here, kid. Hand it over, nice and quick. The Collector’s people are right behind you.',
        options: [
          { key: 'A', label: 'Hand it over', flag: 'quick', say: line('dc-rook', 'Good work, kid. Really good work.') },
          { key: 'B', label: 'Let Finch check first', flag: 'check', say: line('dc-finch', 'Checking the voice against Nell’s chip. Hang on. It is... jammed. Something close by is jamming me.') },
        ],
        default: 'A', timeout: line('dc-rook', 'No time, kid. I will take that.') },
      { at: 1250, kind: 'story', if: 'check', who: 'dc-rook', say: '[sighs] No time for gadgets, kid. They are right behind you. Come on.' },
      { at: 1290, kind: 'story', fx: 'betrayal', say: 'Rook takes the bag, pats your shoulder, and melts into the crowd. Then your earpiece crackles.' },
      { at: 1330, kind: 'story', who: 'dc-kestrel', say: 'Swift? Swift, can you hear me? Somebody locked me off this channel for ten minutes. Whatever you just heard, that was not me.' },
      { at: 1380, kind: 'story', who: 'dc-finch', say: '[whispers] Oh no. The fake Kestrel knew the code. Only people in the Aviary know the code. And Rook is the one who wrote it.' },
      { at: 1430, kind: 'story', who: 'dc-rook', say: '[laughs] Sorry, kid. Nothing personal. You ran beautifully. Best courier I ever hired.' },
      dash(1475, 50, 'dc-kestrel', 'After him! He is heading out of the stadium. Pick it up for 50 seconds through the crowd!', 140, { chapter: 'Rook', scene: 'city', fx: 'riser' }),
      { at: 1585, kind: 'story', spatial: 'melbtram', say: 'Outside, the crowd floods into the street. Trams queue, bells clanging. Somewhere in all of it, Rook has vanished.' },
      { at: 1640, kind: 'story', who: 'dc-magpie', say: '[sighs] I did warn you. Rook is selling to the Collector, and the Collector does not like to wait. He has a boat.' },
      { at: 1690, kind: 'story', who: 'dc-finch', fx: 'decode', say: 'But. Hang on. The Burr is still in that bag! It is moving. South, toward the bay. Toward St Kilda.' },
      { at: 1740, kind: 'finale', fx: 'noirstab', say: 'Episode three complete. The traitor has the Lyrebird, you have his trail, and the bay is waiting. To be continued.' },
    ],
  },

  // ===================== 4 Penguins at Midnight =====================
  {
    id: 'deepcover-pier',
    episode: 4,
    previously: 'Previously on Deep Cover: the code was right, the voice was fake, and Rook walked off into the footy crowd with the Lyrebird.',
    next: 'Next time on Deep Cover, the final episode: a steam train in the mist, a forest full of mimics, and one last chase.',
    saga: 'deepcover',
    title: 'Penguins at Midnight',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Hard effort',
    blurb: 'Episode 4. St Kilda at midnight. A traitor on the pier, a boat with no lights on Port Phillip Bay, and a rival who finally picks a side.',
    loop: line('dc-finch', 'Loop closed. The penguins are very impressed. Well, one of them looked at you.'),
    early: line('dc-kestrel', 'That is plenty, Swift. The water police have the bay covered. Rest up for the big one.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 280, chapter: 'Midnight, St Kilda', scene: 'harbour', say: 'St Kilda, near midnight. Palm trees rattle in the sea breeze, and the bay is black and silver. Warm up easy along the Esplanade.' },
      { at: 55, kind: 'story', who: 'dc-finch', fx: 'decode', say: 'The Burr is pinging. The bag is moving along the foreshore toward the pier. Rook has the Lyrebird, and he is in no hurry at all.' },
      { at: 110, kind: 'story', who: 'dc-kestrel', say: 'The Collector is coming to collect, by boat, at the end of St Kilda Pier. If that bag gets on his boat, we lose it for good.' },
      { at: 165, kind: 'story', fx: 'noirstab', say: 'You jog past Luna Park. The giant moon face grins over the gate, lit up and laughing, even at midnight.' },
      { at: 210, kind: 'quiz', who: 'dc-finch', say: 'Luna Park opened in the same year as its famous old roller coaster, the Scenic Railway. Which year?',
        options: [{ key: 'A', label: '1912' }, { key: 'B', label: '1956' }, { key: 'C', label: '1988' }], answer: 'A',
        right: line('dc-finch', '1912! The Scenic Railway is one of the oldest roller coasters in the world. Someone even rides on it to work the brakes.'),
        wrong: line('dc-finch', 'It was 1912. The Scenic Railway is one of the oldest roller coasters in the world. Someone rides on it to work the brakes.') },
      { at: 275, kind: 'story', who: 'dc-kestrel', say: 'Rook knows our old code. He wrote it. So we need a new one, just between you and me. Not on any file. Not on any computer.' },
      { at: 315, kind: 'choice', id: 'word', who: 'dc-kestrel', say: 'Pick our new code word. Penguin, or lamington?',
        options: [
          { key: 'A', label: 'Penguin', flag: 'penguin', say: line('dc-kestrel', 'Penguin. Lovely. Nobody will ever guess.') },
          { key: 'B', label: 'Lamington', flag: 'lamington', say: line('dc-kestrel', 'Lamington. Very Australian. Nobody will ever guess.') },
        ],
        default: 'A', timeout: line('dc-kestrel', 'I will choose, then. Penguin. Remember it.') },
      dash(355, 60, 'dc-kestrel', 'The Burr just sped up. Rook is heading for the pier. Pick it up for 60 seconds along the foreshore!', 140, { chapter: 'The foreshore', fx: 'riser' }),
      { at: 475, kind: 'story', spatial: 'chatter', say: 'A couple on a bench look up as you pass. The pier stretches out into the dark ahead, long and straight, with a little kiosk glowing at the very end.' },
      { at: 530, kind: 'story', who: 'dc-finch', fx: 'lyrebird', say: 'Uh oh. Kestrel just got a call. From you. Your voice, saying you are back at Luna Park and Rook went that way.' },
      { at: 580, kind: 'story', if: 'penguin', who: 'dc-kestrel', say: '[laughs] I asked the caller for our word. They said lamington. Nice try, Rook.' },
      { at: 581, kind: 'story', unless: 'penguin', who: 'dc-kestrel', say: '[laughs] I asked the caller for our word. They said penguin. Nice try, Rook.' },
      { at: 635, kind: 'story', who: 'dc-rook', say: '[sighs] A new code. Clever. I taught you that, you know. Fine, kid. Come and get it.' },
      dash(685, 60, 'dc-finch', 'He is on the pier! Pick it up for 60 seconds, all the way down the planks!', 140, { chapter: 'The pier', fx: 'footsteps' }),
      { at: 800, kind: 'story', fx: 'heartbeat', say: 'The planks drum under your feet. Spray flicks up through the gaps. At the end of the pier, a boat with no lights is gliding in.' },
      { at: 855, kind: 'steady', seconds: 200, chapter: 'The breakwater', say: 'Rook has stopped by the breakwater rocks. Slow to an easy pace and walk in quietly. Do not spook him.', easyNudge: line('dc-kestrel', 'Softly now, Swift. Easy feet. Let him think he has all the time in the world.') },
      { at: 915, kind: 'quiz', who: 'dc-finch', say: '[whispers] Look at the rocks. Something small is waddling home from the sea. About 1,400 of them live here. What are they?',
        options: [{ key: 'A', label: 'Little penguins' }, { key: 'B', label: 'Fur seals' }, { key: 'C', label: 'Pelicans' }], answer: 'A',
        right: line('dc-finch', '[whispers] Little penguins. The smallest penguins in the world. They nest in these very rocks. Cutest witnesses ever.'),
        wrong: line('dc-finch', '[whispers] They are little penguins, the smallest penguins in the world. They nest in these very rocks.') },
      { at: 980, kind: 'story', who: 'dc-collector', fx: 'noirstab', say: 'Good evening, Mr Rook. I believe you have something of mine. My associate will take it from here.' },
      { at: 1035, kind: 'story', say: 'A figure steps off the boat. Black jacket. A familiar grin. It is Magpie. She takes the bag from Rook and hands him a fat envelope.' },
      { at: 1085, kind: 'story', who: 'dc-magpie', say: '[mischievously] Pleasure doing business, Rook. Do count it later. Much later.' },
      dash(1130, 60, 'dc-kestrel', 'The boat is pulling away! Pick it up for 60 seconds along the breakwater and keep it in sight!', 150, { chapter: 'The boat', fx: 'whoosh' }),
      { at: 1250, kind: 'story', who: 'dc-rook', fx: 'downer', say: '[sighs] Paper. The envelope is full of paper. She tricked me. That magpie tricked me.' },
      { at: 1300, kind: 'quiz', who: 'dc-kestrel', say: 'If that boat runs for open sea, there is only one way out of Port Phillip Bay. A narrow, rough entrance between two points. What do sailors call it?',
        options: [{ key: 'A', label: 'The Rip' }, { key: 'B', label: 'The Gap' }, { key: 'C', label: 'The Gate' }], answer: 'A',
        right: line('dc-kestrel', 'The Rip. The water police are waiting there. Nobody gets through the Rip tonight.'),
        wrong: line('dc-kestrel', 'It is called the Rip. The water police are waiting there. Nobody gets through tonight.') },
      { at: 1365, kind: 'story', who: 'dc-finch', fx: 'decode', say: 'Wait. They are not going near the Rip. The Burr is bobbing about in the bay. Magpie found it. She stuck it on a rubber duck.' },
      { at: 1415, kind: 'story', who: 'dc-kestrel', say: 'Then Rook is our only lead. He is running for the Esplanade. Go!' },
      dash(1455, 60, 'dc-kestrel', 'Pick it up for 60 seconds along the Esplanade! Stay with him!', 150, { chapter: 'The Esplanade', scene: 'street', fx: 'screech' }),
      { at: 1575, kind: 'story', spatial: 'car', say: 'A taxi swings to the kerb. Rook dives in, and it is gone up Fitzroy Street in a hiss of wet tyres.' },
      { at: 1625, kind: 'story', who: 'dc-magpie', fx: 'squelch', say: 'Hello, Swift. Yes, I am on your channel. Sorry about tonight. Nothing personal. Well. A little personal.' },
      { at: 1680, kind: 'story', who: 'dc-magpie', say: 'If you want the Lyrebird back, come to Belgrave at dawn. Puffing Billy, first train. Come alone. Well, bring Finch.' },
      { at: 1740, kind: 'finale', fx: 'steamwhistle', say: 'Episode four complete. Magpie has the Lyrebird, Rook is on the run, and a steam train leaves at dawn. To be continued.' },
    ],
  },

  // ===================== 5 The Mist Line =====================
  {
    id: 'deepcover-mist',
    episode: 5,
    previously: 'Previously on Deep Cover: a long pier, a boat with no lights, and Magpie sailing off with the Lyrebird. She left you an invitation.',
    saga: 'deepcover',
    title: 'The Mist Line',
    series: 'thriller',
    type: 'surge',
    minutes: 35,
    difficulty: 'Hard effort',
    blurb: 'Episode 5, the finale. Dawn in the Dandenong Ranges. A steam train in the mist, a secret two years deep, and one last chase through the tallest trees on Earth.',
    loop: line('dc-finch', 'One more loop. Even the lyrebirds cannot keep track of you now.'),
    early: line('dc-kestrel', 'Stopping there is fine, Swift. Magpie and the police will take it from here. You brought us all the way. Thank you.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 300, chapter: 'Dawn, Belgrave', scene: 'dandenongs', say: 'Belgrave, in the Dandenong Ranges. Dawn. Mist hangs in the tall trees, and somewhere ahead a steam engine is breathing. Warm up easy.' },
      { at: 80, kind: 'story', who: 'dc-barry', say: 'Swift! Barry. I volunteer up here on weekends. Finch is my nephew, would you believe. The bloke in carriage one booked the whole thing. Silver case. Lady in a black jacket.' },
      { at: 150, kind: 'story', who: 'dc-kestrel', say: 'The Collector, with Magpie, and the Lyrebird. Rook will be somewhere close. He wants it back, and he is out of friends.' },
      { at: 220, kind: 'quiz', who: 'dc-barry', say: 'While she builds up steam. This old line first opened in which year?',
        options: [{ key: 'A', label: '1900' }, { key: 'B', label: '1950' }, { key: 'C', label: '1980' }], answer: 'A',
        right: line('dc-barry', '1900, mate! Narrow gauge, two foot six. And people still ride with their legs dangling over the side.'),
        wrong: line('dc-barry', 'It opened in 1900, mate. Narrow gauge, two foot six. People still ride with their legs dangling over the side.') },
      dash(285, 60, 'dc-kestrel', 'She is pulling out! Barry is holding the last door. Pick it up for 60 seconds along the platform and hop on!', 150, { chapter: 'All aboard', fx: 'steamwhistle' }),
      { at: 405, kind: 'story', spatial: 'puffer', say: 'The train clanks out over the curved timber trestle at Monbulk Creek. Below, the mist is so thick the creek is only a sound.' },
      { at: 490, kind: 'story', who: 'dc-nell', say: 'Finch and I built something overnight. The Echo. Each time the Lyrebird copies a voice, it gives a tiny chirp, too high for people. The Echo hears it. So might a real lyrebird.' },
      { at: 570, kind: 'steady', seconds: 200, chapter: 'Carriage by carriage', say: 'Make your way forward, carriage by carriage. Easy pace. You are just a passenger with muddy shoes.', easyNudge: line('dc-kestrel', 'Gently, Swift. Let the train do the work for a while.') },
      { at: 630, kind: 'quiz', who: 'dc-finch', say: 'Forest fact! The giant trees out there are the tallest flowering plants in the world. What are they called?',
        options: [{ key: 'A', label: 'Mountain ash' }, { key: 'B', label: 'River red gum' }, { key: 'C', label: 'Snow gum' }], answer: 'A',
        right: line('dc-finch', 'Mountain ash! The tallest flowering plants on Earth. The mist loves them.'),
        wrong: line('dc-finch', 'They are mountain ash. The tallest flowering plants on Earth. The mist loves them.') },
      { at: 695, kind: 'story', fx: 'noirstab', say: 'Carriage one. The Collector sits with a silver case on his knee. Opposite him, Magpie looks up, and smiles at you.' },
      { at: 750, kind: 'story', who: 'dc-collector', say: 'Ah. The famous runner. Do sit down. I was just about to try my new toy. Whose voice shall we borrow first?' },
      { at: 800, kind: 'story', who: 'dc-kestrel', say: 'Swift, there is something I could not tell you, not with a traitor in the Aviary. Magpie, you can come in now.' },
      { at: 850, kind: 'story', who: 'dc-magpie', say: '[laughs] About time. Two years in deep cover inside this man’s little empire. Hello, partner. I am on your side. I always was.' },
      { at: 945, kind: 'choice', id: 'trust', who: 'dc-magpie', say: '[curious] So, partner. Do you trust me now? Or do you want proof?',
        options: [
          { key: 'A', label: 'Trust Magpie', flag: 'trusted', say: line('dc-magpie', '[excited] Finally. That is the nicest thing anyone has said to me in years.') },
          { key: 'B', label: 'Ask for proof', flag: 'proof', say: line('dc-kestrel', 'Good instinct. Here is your proof. On the very first night, she gave your chip back. A real thief would have kept it.') },
        ],
        default: 'A', timeout: line('dc-magpie', 'I will take that as a yes.') },
      { at: 985, kind: 'story', fx: 'steamwhistle', say: 'The whistle shrieks. The train slows into Menzies Creek. And a figure in a long grey coat steps out of the mist onto the platform.' },
      { at: 1035, kind: 'story', who: 'dc-rook', say: '[sighs] Morning, everyone. I will take that, thank you.' },
      { at: 1065, kind: 'story', fx: 'betrayal', say: 'Rook lifts the silver case right off the Collector’s knee, steps down off the back of the carriage, and disappears into the trees.' },
      dash(1105, 60, 'dc-kestrel', 'After him! Down the bank and into the forest. Pick it up for 60 seconds!', 150, { chapter: 'Into the mist', fx: 'riser' }),
      { at: 1225, kind: 'story', if: 'trusted', who: 'dc-magpie', say: 'I will keep the Collector company. You go and get our bird back. Run, partner!' },
      { at: 1226, kind: 'story', unless: 'trusted', who: 'dc-magpie', say: 'Go, Swift. I will mind the Collector. And yes, you can say I told you so later.' },
      { at: 1275, kind: 'story', who: 'dc-finch', fx: 'lyrebird', say: 'The Echo just pinged! He is using the Lyrebird. Uphill, about two hundred metres, toward the lookout.' },
      { at: 1325, kind: 'story', who: 'dc-kestrel', say: '[whispers] Swift, stop. Turn back to the train. That is an order.' },
      { at: 1365, kind: 'story', say: 'You ask the voice for the new code word. The trees drip. The mist drifts. The voice says nothing at all. Rook does not know it.' },
      dash(1405, 60, 'dc-finch', 'He is moving! Pick it up for 60 seconds, up the track and over the ridge!', 150, { chapter: 'The ridge', fx: 'footsteps' }),
      { at: 1570, kind: 'story', fx: 'lyrebird', say: 'The Echo goes silent. Rook has switched it off. Then, from a fallen log, a real lyrebird begins to sing. A whipbird. A kookaburra. And then the Lyrebird’s own tiny chirp.' },
      { at: 1620, kind: 'story', who: 'dc-nell', say: '[excited] It heard the machine, and now it is copying it! Lyrebirds copy what they hear. Follow the bird, Swift.' },
      { at: 1665, kind: 'quiz', who: 'dc-finch', say: 'Quick one while you follow the song. Lyrebirds are so loved here they are on our money. Which coin?',
        options: [{ key: 'A', label: '10 cent coin' }, { key: 'B', label: '20 cent coin' }, { key: 'C', label: '50 cent coin' }], answer: 'A',
        right: line('dc-finch', 'The 10 cent coin! And most of their copying is other birds. Ours just picked up a new trick.'),
        wrong: line('dc-finch', 'It is the 10 cent coin. And most of their copying is other birds. Ours just picked up a new trick.') },
      dash(1725, 60, 'dc-kestrel', 'There he is, by the lookout! Pick it up for 60 seconds, one last time!', 160, { chapter: 'The lookout', fx: 'riser' }),
      { at: 1850, kind: 'story', say: 'Rook is sitting on a log at the lookout, the silver case on his knees, puffing like an old steam engine. He holds up both hands.' },
      { at: 1895, kind: 'story', who: 'dc-rook', say: '[sighs] All right, kid. You win. I am too old to outrun a runner and a lyrebird. It was the money. It is always the money.' },
      { at: 1945, kind: 'story', who: 'dc-kestrel', fx: 'steamwhistle', say: 'Lyrebird recovered. Rook and the Collector are off for a very long chat with the police. Nobody hurt. Exactly how I like it.' },
      { at: 1995, kind: 'steady', seconds: 160, chapter: 'Morning', say: 'The mist is lifting. Sunlight pours down through the mountain ash. Cool down now with a gentle jog or a walk.' },
      { at: 2050, kind: 'story', who: 'dc-magpie', fx: 'cheer', say: 'Not bad, partner. Same time next year? [laughs] I will steal you a coffee.' },
      { at: 2100, kind: 'finale', who: 'dc-kestrel', say: 'Deep Cover is complete. The Lyrebird is locked away, the Aviary is whole again, and you have a codename for life. Welcome aboard, Swift.' },
    ],
  },
]

export const CHAIN = ['deepcover-courier', 'deepcover-clocks', 'deepcover-quarter', 'deepcover-pier', 'deepcover-mist']

export const CAST = {
  'dc-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.85, rate: 0.97 }, // Peter Michael
  'dc-kestrel': { name: 'Kestrel', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.95, rate: 0.98, radio: true }, // Julieanne
  'dc-finch': { name: 'Finch', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.15, rate: 1.1, radio: true }, // Ziggy
  'dc-magpie': { name: 'Magpie', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.05, rate: 1.0 }, // Eva
  'dc-rook': { name: 'Rook', voiceId: 'dh3YdvdCYZdqFjtSFNTx', pitch: 0.88, rate: 0.97 }, // William
  'dc-nell': { name: 'Dr Nell Pardoe', voiceId: 'L4bD71zGAYHMT7a6MLwc', pitch: 1.05, rate: 1.0, radio: true }, // Brenna
  'dc-collector': { name: 'The Collector', voiceId: 'M4FiuEOcSLrYgftiXoq9', pitch: 0.75, rate: 0.94 }, // Blake
  'dc-barry': { name: 'Barry', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.82, rate: 1.02 }, // Jimbo
}

export const LOOK = { accent: '#FF4D6D', deep: '#16050C', tag: 'Spy thriller' }

export const LIBRARY = {
  ambience: {
    laneway: 'A narrow Melbourne city laneway at night in fine rain: rain pattering on bricks and awnings, water trickling in a drain, the buzz of a neon sign, a tram bell and steel wheels in the street beyond, no music, no voices',
    footy: 'A packed football stadium at night heard from the stands: a huge wash of crowd roar rising and falling, cheering surges, distant umpire whistles, the hum of floodlights, no clear words, no music, no voices',
    dandenongs: 'A misty mountain ash forest in the Dandenong Ranges at dawn: cool breeze high in very tall trees, water dripping from tree ferns, a bellbird pinging, a whipbird calling far off, a creek below, no music, no voices',
  },
  sfx: {
    'melb-tram-pass': { prompt: 'A Melbourne city tram rumbling past on steel rails at night, wheels squealing on a curve, two dings of its bell, then fading away down the street', seconds: 7 },
    'steam-train-pass': { prompt: 'A small old steam train chuffing past slowly through a forest, a two note whistle, hissing steam, clanking carriages on narrow gauge rails, fading into the distance', seconds: 10 },
  },
  tracks: {
    'lyrebird-run': {
      title: 'Lyrebird Run',
      prompt: 'Original instrumental noir spy chase music. Brooding minor key, driving upright bass ostinato, fast brushed snare, muted trumpet stabs, tense pizzicato strings and a dark vibraphone, rain soaked and cinematic, about 140 bpm. No vocals.',
      seconds: 90,
    },
  },
  chase: 'lyrebird-run',
}
