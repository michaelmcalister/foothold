// Run Your Mouth: a trivia game show you play on the run. A cheeky host (Tex
// Tilley), a sidekick (Milly) and an announcer. Questions are answered out
// loud or with a tap, and quicker answers score more. The ad breaks are
// sprints that pay more the harder you push, and every metre you climb earns
// a hill bonus (engine.js: points, climbPoints). Three shows, unlocking in
// order. Same beat format as thrillers.js.
//
// Every answer here is checked: the marathon is 42.195 km; the emu is on the
// coat of arms; Nowhere Else (Tas), Come By Chance (NSW), Woolloomooloo (NSW),
// Wonglepong, Banana and Dingo (Qld) are real places; Cathy Freeman won the
// 400 m at Sydney 2000; parkrun is 5 km; the pavlova is named after the
// ballerina Anna Pavlova; City2Surf finishes at Bondi; the kookaburra laughs;
// the Ashes is cricket; Uluru is in the Northern Territory; the platypus lays
// eggs; the Melbourne Cup runs on the first Tuesday in November; Eliud
// Kipchoge ran the first marathon under two hours (Vienna, 2019); emus run at
// about 50 km/h; Mars is the red planet; the Pacific is the biggest ocean;
// Perth is WA's capital; koalas sleep up to about 20 hours a day; the MCG is
// in Melbourne; an octopus has three hearts; Kosciuszko is the mainland's
// tallest mountain; the Murray is Australia's longest river; a half marathon
// is 21.0975 km.
//
// House rules: the host teases, never belittles. A wrong answer is a laugh
// and the right answer, never a put down.

const line = (who, text) => ({ who, text })

const SPRINT_WIN = line('tex', 'Look at that pace! Bonus points in the bank. Ease right back now.')
const SPRINT_OKAY = line('tex', 'Points on the board all the same. Ease right back now.')
const HALF = line('milly', 'Halfway! Keep it going!')
const EASY = line('tex', 'Easy does it. Save the legs for the sprints, that is where the money is.')

const sprint = (at, seconds, say, points, recover, extra = {}) =>
  ({ at, kind: 'surge', seconds, who: 'tex', say, success: SPRINT_WIN, okay: SPRINT_OKAY, recover, points, half: HALF, ...extra })

const q = (at, who, say, options, answer, right, wrong, points = 1000, extra = {}) => ({
  at, kind: 'quiz', who, say, points, wait: 22,
  options: options.map((label, i) => ({ key: 'ABC'[i], label })),
  answer, right: line(who, right), wrong: line(who, wrong), ...extra,
})
const realOr = (at, place, real, right, wrong) =>
  q(at, 'milly', `${place}. Real or rubbish?`, ['Real', 'Rubbish'], real ? 'A' : 'B', right, wrong, 1500)

const finale = (at) => ({
  at, kind: 'finale',
  say: ({ score, right, total }) => line('tex', `That is the show! You got ${right} of ${total} right and finished on ${score.toLocaleString('en-AU')} points. Same time next week?`),
})

const SHOW = {
  saga: 'quiz', series: 'gameshow', type: 'surge', scored: true, brisk: true, host: 'tex', climbPoints: 50,
  hillLines: [
    'Hill bonus! Every metre up is money in the bank.',
    'You are climbing, and so is your score.',
    'Uphill points! The judges love a hill.',
  ],
}

export const QUIZ_SAGA = {
  id: 'quiz',
  title: 'Run Your Mouth',
  blurb: 'The trivia game show you play on your feet. Quick answers score big, sprints and hills pay bonus points.',
  narrator: 'announcer',
  score: 'quiz',
}

const intro = (show) => [
  { at: 3, kind: 'recover', seconds: 150, chapter: 'Welcome', scene: 'studio', who: 'announcer', fx: 'cheer', say: `From the Foothold studios, it is the trivia show you play on your feet. It is Run Your Mouth! ${show}. And here is your host, Tex Tilley!` },
  { at: 45, kind: 'story', who: 'tex', say: 'Thank you, thank you! Here is how it works. Answer out loud or tap. Quicker answers score more. Sprints pay bonus points, and so does every hill.' },
]

const scoreboard = (at, who = 'tex') => ({
  at, kind: 'story', who,
  say: ({ score, right, total }) => line(who, total
    ? `Scoreboard check! ${right} of ${total} right, and you are on ${score.toLocaleString('en-AU')} points.`
    : `Scoreboard check! You are on ${score.toLocaleString('en-AU')} points, and the questions are only getting started.`),
})
const lightning = (at, say, options, answer, right, wrong) => q(at, 'tex', say, options, answer, right, wrong, 500, { wait: 15 })
const talk = (at, who, say, extra = {}) => ({ at, kind: 'story', who, say, ...extra })

export const GAMESHOW = [
  {
    ...SHOW,
    id: 'quiz-1',
    episode: 1,
    title: 'The Warm Up',
    minutes: 22,
    difficulty: 'Gentle',
    blurb: 'Show 1. Marathons, emus, a place called Nowhere Else and a lightning round.',
    loop: line('tex', 'You closed a loop! The hexes are yours, and so is my respect.'),
    early: line('tex', 'Leaving early? No worries. Your points are safe and the trophy cabinet awaits.'),
    beats: [
      ...intro('Show one, the warm up'),
      talk(75, 'milly', 'Hi everyone! I am Milly, and I am in charge of the buzzer. I have already pressed it twice by accident.'),
      q(110, 'tex', 'First question, for a thousand points. How long is a marathon?', ['40 kilometres', '42.195 kilometres', '45 kilometres'], 'B',
        'Correct! 42.195 kilometres, every last metre of it.', 'Ooh, no. It is 42.195 kilometres. That last 195 metres is the cheeky bit.'),
      talk(170, 'tex', 'Legend says the very first marathon runner carried news all the way to Athens. Then he needed a very long lie down. Pace yourself.'),
      q(210, 'tex', 'Next one. Which bird stands beside the kangaroo on Australia’s coat of arms?', ['The emu', 'The kookaburra', 'The cockatoo'], 'A',
        'The emu! Neither of them can walk backwards, so they only go forward. Like you.', 'It is the emu. The kookaburra is laughing about that one.'),
      talk(260, 'milly', 'Tex, an emu can run at about 50 kilometres an hour. Should we tell our player?', { fx: 'cheer' }),
      talk(290, 'tex', 'Milly, let us not crush anyone’s dreams on show one.'),
      scoreboard(320),
      sprint(350, 30, 'Ad break! Sprint for 30 seconds. The faster you go, the bigger the bonus.', 1000, 120, { chapter: 'Ad break' }),
      talk(420, 'tex', 'And we are back. The sponsors were thrilled with that. We do not have sponsors, but if we did.'),
      talk(460, 'milly', 'It is time for Real or Rubbish! I say a place name, you tell me if it is a real place in Australia.', { chapter: 'Real or Rubbish', fx: 'question' }),
      realOr(495, 'Nowhere Else, Tasmania', true, 'Real! Nowhere Else is a real place in Tasmania. You cannot make this stuff up.', 'It is real! Nowhere Else is in Tasmania. Somebody had a sense of humour.'),
      realOr(555, 'Snoozebottom, Victoria', false, 'Rubbish! I made that one up. It sounds lovely though.', 'Rubbish! There is no Snoozebottom. I made it up after a long nap.'),
      realOr(615, 'Come By Chance, New South Wales', true, 'Real! Come By Chance is in western New South Wales.', 'It is real! Come By Chance is in western New South Wales.'),
      talk(670, 'milly', 'I would love to live in Nowhere Else. Imagine giving people directions.'),
      talk(705, 'tex', 'Lightning round! Three quick ones, fifteen seconds each, five hundred points a pop. Go!', { chapter: 'Lightning round', fx: 'clock' }),
      lightning(735, 'Which planet is known as the red planet?', ['Mars', 'Venus', 'Jupiter'], 'A', 'Mars!', 'It is Mars. Next!'),
      lightning(770, 'The biggest ocean on Earth?', ['The Atlantic', 'The Pacific', 'The Indian'], 'B', 'The Pacific!', 'It is the Pacific. Last one!'),
      lightning(805, 'The capital of Western Australia?', ['Perth', 'Broome', 'Fremantle'], 'A', 'Perth! What a round.', 'It is Perth. Nice try, what a round.'),
      sprint(850, 45, 'Ad break! 45 seconds this time. Leave nothing in the tank.', 1500, 150, { chapter: 'Ad break' }),
      talk(930, 'milly', 'Did anyone else feel the studio shake? That was you. Brilliant.'),
      scoreboard(980),
      talk(1015, 'tex', 'Welcome back. It is the double points round, where the questions are worth twice as much.', { chapter: 'Double points', fx: 'braam' }),
      q(1050, 'tex', 'For two thousand points. At the Sydney 2000 Olympics, Cathy Freeman won gold in which event?', ['The 100 metres', 'The 400 metres', 'The marathon'], 'B',
        'The 400 metres! The whole country stood up for that one.', 'It was the 400 metres. One of the great nights in Australian sport.', 2000),
      talk(1110, 'milly', 'I watched that race on telly. I mostly remember the hot chips. And the yelling. Lots of yelling.'),
      q(1145, 'tex', 'The final question, for three thousand points. How far is a parkrun?', ['3 kilometres', '5 kilometres', '10 kilometres'], 'B',
        '5 kilometres! Every Saturday morning. See you there.', 'It is 5 kilometres, every Saturday morning. You will smash it next time.', 3000, { chapter: 'The final question' }),
      talk(1200, 'tex', 'While the judges count it up, ease into a gentle jog. You have earned it.'),
      talk(1240, 'milly', 'The judges are me. I am counting on my fingers. Give me a sec.'),
      finale(1275),
    ],
  },
  {
    ...SHOW,
    id: 'quiz-2',
    episode: 2,
    title: 'Snags and Servos',
    minutes: 22,
    difficulty: 'Steady effort',
    blurb: 'Show 2. Pavlova, City2Surf, a town called Wonglepong and a lightning round.',
    loop: line('tex', 'Loop closed! That is ground and points. A great combination.'),
    early: line('tex', 'Off already? Fair enough. Your points are locked in.'),
    beats: [
      ...intro('Show two, snags and servos'),
      talk(75, 'milly', 'Welcome back! I have been practising the buzzer all week. My neighbours are not happy.'),
      q(110, 'tex', 'For a thousand points. The pavlova is named after a famous what?', ['Ballerina', 'Racehorse', 'Prime minister'], 'A',
        'A ballerina! Anna Pavlova. Light, fluffy and full of energy, like you right now.', 'It was a ballerina, Anna Pavlova. Not a racehorse, though that would be a great story.'),
      talk(170, 'milly', 'Tex, I brought a pav for the studio audience. It is mostly cream. I regret nothing.'),
      q(210, 'tex', 'Sydney’s City2Surf finishes at which beach?', ['Manly', 'Bondi', 'Coogee'], 'B',
        'Bondi! Fourteen kilometres from the city to the surf.', 'It is Bondi. Fourteen kilometres from the city to the surf, and one big hill.'),
      talk(265, 'tex', 'That big hill on the City2Surf is called Heartbreak Hill. If you find a hill today, the points are yours.'),
      scoreboard(300),
      sprint(330, 45, 'Ad break! Sprint for 45 seconds. The quicker you go, the more it pays.', 1500, 150, { chapter: 'Ad break' }),
      talk(430, 'tex', 'Lovely running. Milly, what is next?'),
      talk(460, 'milly', 'Real or Rubbish time! Is it a real Australian place, or did I make it up?', { chapter: 'Real or Rubbish', fx: 'question' }),
      realOr(495, 'Woolloomooloo, New South Wales', true, 'Real! Woolloomooloo is right next to the Sydney CBD. Eight O’s, if you are counting.', 'Real! Woolloomooloo is right next to the Sydney CBD. Eight O’s, if you are counting.'),
      realOr(555, 'Thongbottom Creek, Queensland', false, 'Rubbish! I invented it on the way to work.', 'Rubbish! There is no Thongbottom Creek. Yet.'),
      realOr(615, 'Wonglepong, Queensland', true, 'Real! Wonglepong is in the Scenic Rim. What a name.', 'It is real! Wonglepong is in Queensland’s Scenic Rim. What a name.'),
      talk(670, 'milly', 'Wonglepong sounds like a ping pong move. I am going to start using it.'),
      talk(705, 'tex', 'Lightning round! Fifteen seconds each, five hundred points. Here we go.', { chapter: 'Lightning round', fx: 'clock' }),
      lightning(735, 'Which Australian animal sleeps up to twenty hours a day?', ['The koala', 'The wombat', 'The echidna'], 'A', 'The koala! Living the dream.', 'It is the koala. Living the dream. Next!'),
      lightning(770, 'The MCG is in which city?', ['Sydney', 'Melbourne', 'Adelaide'], 'B', 'Melbourne!', 'It is Melbourne. Last one!'),
      lightning(805, 'How many hearts does an octopus have?', ['One', 'Two', 'Three'], 'C', 'Three! Very big hearted.', 'It is three. Very big hearted.'),
      sprint(850, 30, 'Ad break! A short sharp 30 seconds. Make it count.', 1000, 150, { chapter: 'Ad break' }),
      talk(920, 'tex', 'Puffing? Good puffing. That is the sound of points.'),
      scoreboard(955),
      talk(1010, 'tex', 'We are back with double points. Hold on to your hats.', { chapter: 'Double points', fx: 'braam' }),
      q(1045, 'tex', 'For two thousand points. Which Australian bird is famous for its laugh?', ['The galah', 'The kookaburra', 'The magpie'], 'B',
        'The kookaburra! And it is laughing with you, not at you.', 'It is the kookaburra. It is laughing with you, I promise.', 2000, { spatial: 'kookaburra' }),
      talk(1105, 'milly', 'I can do a kookaburra impression. No, Tex says I cannot. Not on air.'),
      q(1140, 'tex', 'The final question, for three thousand points. The Ashes is a contest in which sport?', ['Rugby', 'Tennis', 'Cricket'], 'C',
        'Cricket! Australia versus England, and nobody ever gets over it.', 'It is cricket. Australia versus England, every couple of years.', 3000, { chapter: 'The final question' }),
      talk(1200, 'tex', 'Ease into a gentle jog while we tally it up. Breathe it in.'),
      talk(1240, 'milly', 'Drumroll please. That is me. I am the drumroll.', { fx: 'timpani' }),
      finale(1275),
    ],
  },
  {
    ...SHOW,
    id: 'quiz-3',
    episode: 3,
    title: 'The Grand Final',
    minutes: 25,
    difficulty: 'Hard effort',
    blurb: 'Show 3. Uluru, the Melbourne Cup, the fastest marathon ever and a lightning round.',
    loop: line('tex', 'A loop in the grand final! The crowd goes wild.'),
    early: line('tex', 'Taking an early mark? Your points are safe. Champions rest too.'),
    beats: [
      ...intro('The grand final'),
      talk(75, 'milly', 'It is the grand final! I have a new outfit. It has sequins. You cannot see it, but trust me.'),
      q(110, 'tex', 'For a thousand points. Uluru is in which part of Australia?', ['Western Australia', 'South Australia', 'The Northern Territory'], 'C',
        'The Northern Territory! Right in the red centre.', 'It is the Northern Territory, right in the red centre.'),
      q(175, 'milly', 'My turn! True or false. The platypus lays eggs.', ['True', 'False'], 'A',
        'True! A mammal that lays eggs. Nature was having a fun day.', 'True, believe it or not! A mammal that lays eggs. Nature was having a fun day.'),
      talk(235, 'tex', 'Grand final rules: sprints pay big, and hills pay bigger. If you see a hill, go and say hello.'),
      scoreboard(270),
      sprint(300, 45, 'Ad break! Sprint for 45 seconds, and do not hold back.', 1500, 60, { chapter: 'Ad break' }),
      talk(380, 'milly', 'The sponsors want another one, Tex.'),
      sprint(430, 45, 'And another! The sponsors want more. 45 seconds.', 1500, 150),
      talk(510, 'tex', 'The judges are calling that one a personal best for enthusiasm.'),
      talk(560, 'tex', 'Two big pushes. The crowd is on its feet. Well, Milly is.'),
      talk(595, 'milly', 'Grand final Real or Rubbish! Three place names. Which are real?', { chapter: 'Real or Rubbish', fx: 'question' }),
      realOr(630, 'Banana, Queensland', true, 'Real! Banana is a town in central Queensland.', 'It is real! Banana is a town in central Queensland. No bananas required.'),
      realOr(690, 'Vegemite Vale, Victoria', false, 'Rubbish! Sadly, no such place. Somebody should build it.', 'Rubbish! No Vegemite Vale, sadly. Somebody should build it.'),
      realOr(750, 'Dingo, Queensland', true, 'Real! Dingo is a small town in central Queensland.', 'It is real! Dingo is a small town in central Queensland.'),
      talk(805, 'tex', 'Lightning round, grand final edition! Fifteen seconds, five hundred points each.', { chapter: 'Lightning round', fx: 'clock' }),
      lightning(835, 'The tallest mountain on the Australian mainland?', ['Mount Kosciuszko', 'Mount Bogong', 'Uluru'], 'A', 'Mount Kosciuszko!', 'It is Mount Kosciuszko. Next!'),
      lightning(870, 'Australia’s longest river?', ['The Darling', 'The Murray', 'The Yarra'], 'B', 'The Murray!', 'It is the Murray. Last one!'),
      lightning(905, 'About how long is a half marathon?', ['15 kilometres', '21.1 kilometres', '25 kilometres'], 'B', '21.1 kilometres! Spot on.', 'It is 21.1 kilometres. Half of 42.195, near enough.'),
      sprint(950, 60, 'Last ad break of the season! 60 seconds, everything you have got.', 2500, 180, { chapter: 'Ad break' }),
      talk(1050, 'milly', 'That was the biggest sprint of the season. I am out of breath and I was sitting down.'),
      scoreboard(1090),
      talk(1130, 'tex', 'Double points, grand final edition. This is where champions are made.', { chapter: 'Double points', fx: 'braam' }),
      q(1205, 'tex', 'For two thousand points. The Melbourne Cup is run on which day?', ['First Tuesday in November', 'Boxing Day', 'First Saturday in March'], 'A',
        'The first Tuesday in November! The race that stops a nation.', 'It is the first Tuesday in November. The race that stops a nation.', 2000),
      talk(1265, 'milly', 'I once put five dollars on a horse called Lunchbox. It is still running, I think.'),
      q(1300, 'tex', 'The final question of the season, for five thousand points. Who ran the first marathon under two hours, in 2019?', ['Eliud Kipchoge', 'Mo Farah', 'Usain Bolt'], 'A',
        'Eliud Kipchoge! One hour, 59 minutes and 40 seconds. Absolute legend.', 'It was Eliud Kipchoge, in one hour 59 minutes and 40 seconds. Usain would have needed a lie down.', 5000, { chapter: 'The final question' }),
      { at: 1360, kind: 'steady', seconds: 60, who: 'tex', say: 'While the judges tally it up, ease into a gentle jog. You have earned it.', easyNudge: EASY },
      talk(1395, 'milly', 'It is official, I have run out of fingers. Tex has lent me his.', { fx: 'timpani' }),
      finale(1430),
    ],
  },
]

export const GAMESHOW_CHAIN = ['quiz-1', 'quiz-2', 'quiz-3']
