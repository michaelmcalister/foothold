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
// Kipchoge ran the first marathon under two hours (Vienna, 2019).
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
  saga: 'quiz', series: 'gameshow', type: 'surge', scored: true, host: 'tex', climbPoints: 50,
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
  { at: 3, kind: 'recover', seconds: 180, chapter: 'Welcome', scene: 'studio', who: 'announcer', fx: 'cheer', say: `From the Foothold studios, it is the trivia show you play on your feet. It is Run Your Mouth! ${show}. And here is your host, Tex Tilley!` },
  { at: 45, kind: 'story', who: 'tex', say: 'Thank you, thank you! Here is how it works. Answer out loud or tap. Quicker answers score more. Sprints pay bonus points, and so does every hill.' },
]

export const GAMESHOW = [
  {
    ...SHOW,
    id: 'quiz-1',
    episode: 1,
    title: 'The Warm Up',
    minutes: 22,
    difficulty: 'Gentle',
    blurb: 'Show 1. Marathons, emus and a place called Nowhere Else.',
    loop: line('tex', 'You closed a loop! The hexes are yours, and so is my respect.'),
    early: line('tex', 'Leaving early? No worries. Your points are safe and the trophy cabinet awaits.'),
    beats: [
      ...intro('Show one, the warm up'),
      q(120, 'tex', 'First question, for a thousand points. How long is a marathon?', ['40 kilometres', '42.195 kilometres', '45 kilometres'], 'B',
        'Correct! 42.195 kilometres, every last metre of it.', 'Ooh, no. It is 42.195 kilometres. That last 195 metres is the cheeky bit.'),
      { at: 200, kind: 'story', who: 'milly', say: 'Hi everyone! I am Milly, and I am in charge of the buzzer. I have already pressed it twice by accident.' },
      q(270, 'tex', 'Next one. Which bird stands beside the kangaroo on Australia’s coat of arms?', ['The emu', 'The kookaburra', 'The cockatoo'], 'A',
        'The emu! Neither of them can walk backwards, so they only go forward. Like you.', 'It is the emu. The kookaburra is laughing about that one.'),
      sprint(380, 30, 'Ad break! Sprint for 30 seconds. The faster you go, the bigger the bonus.', 1000, 120, { chapter: 'Ad break' }),
      { at: 540, kind: 'story', who: 'milly', chapter: 'Real or Rubbish', fx: 'question', say: 'It is time for Real or Rubbish! I say a place name, you tell me if it is a real place in Australia.' },
      realOr(590, 'Nowhere Else, Tasmania', true, 'Real! Nowhere Else is a real place in Tasmania. You cannot make this stuff up.', 'It is real! Nowhere Else is in Tasmania. Somebody had a sense of humour.'),
      realOr(680, 'Snoozebottom, Victoria', false, 'Rubbish! I made that one up. It sounds lovely though.', 'Rubbish! There is no Snoozebottom. I made it up after a long nap.'),
      realOr(770, 'Come By Chance, New South Wales', true, 'Real! Come By Chance is in western New South Wales.', 'It is real! Come By Chance is in western New South Wales.'),
      sprint(870, 45, 'Ad break! 45 seconds this time. Leave nothing in the tank.', 1500, 150, { chapter: 'Ad break' }),
      { at: 1020, kind: 'story', who: 'tex', chapter: 'Double points', fx: 'braam', say: 'Welcome back. It is the double points round, where the questions are worth twice as much.' },
      q(1060, 'tex', 'For two thousand points. At the Sydney 2000 Olympics, Cathy Freeman won gold in which event?', ['The 100 metres', 'The 400 metres', 'The marathon'], 'B',
        'The 400 metres! The whole country stood up for that one.', 'It was the 400 metres. One of the great nights in Australian sport.', 2000),
      q(1150, 'tex', 'The final question, for three thousand points. How far is a parkrun?', ['3 kilometres', '5 kilometres', '10 kilometres'], 'B',
        '5 kilometres! Every Saturday morning. See you there.', 'It is 5 kilometres, every Saturday morning. You will smash it next time.', 3000, { chapter: 'The final question' }),
      finale(1290),
    ],
  },
  {
    ...SHOW,
    id: 'quiz-2',
    episode: 2,
    title: 'Snags and Servos',
    minutes: 22,
    difficulty: 'Steady effort',
    blurb: 'Show 2. Pavlova, City2Surf and a town called Wonglepong.',
    loop: line('tex', 'Loop closed! That is ground and points. A great combination.'),
    early: line('tex', 'Off already? Fair enough. Your points are locked in.'),
    beats: [
      ...intro('Show two, snags and servos'),
      q(120, 'tex', 'For a thousand points. The pavlova is named after a famous what?', ['Ballerina', 'Racehorse', 'Prime minister'], 'A',
        'A ballerina! Anna Pavlova. Light, fluffy and full of energy, like you right now.', 'It was a ballerina, Anna Pavlova. Not a racehorse, though that would be a great story.'),
      { at: 200, kind: 'story', who: 'milly', say: 'Tex, I brought a pav for the studio audience. It is mostly cream. I regret nothing.' },
      q(270, 'tex', 'Sydney’s City2Surf finishes at which beach?', ['Manly', 'Bondi', 'Coogee'], 'B',
        'Bondi! Fourteen kilometres from the city to the surf.', 'It is Bondi. Fourteen kilometres from the city to the surf, and one big hill.'),
      sprint(380, 45, 'Ad break! Sprint for 45 seconds. The quicker you go, the more it pays.', 1500, 150, { chapter: 'Ad break' }),
      { at: 560, kind: 'story', who: 'milly', chapter: 'Real or Rubbish', fx: 'question', say: 'Real or Rubbish time! Is it a real Australian place, or did I make it up?' },
      realOr(610, 'Woolloomooloo, New South Wales', true, 'Real! Woolloomooloo is right next to the Sydney CBD. Eight O’s, if you are counting.', 'Real! Woolloomooloo is right next to the Sydney CBD. Eight O’s, if you are counting.'),
      realOr(700, 'Thongbottom Creek, Queensland', false, 'Rubbish! I invented it on the way to work.', 'Rubbish! There is no Thongbottom Creek. Yet.'),
      realOr(790, 'Wonglepong, Queensland', true, 'Real! Wonglepong is in the Scenic Rim. What a name.', 'It is real! Wonglepong is in Queensland’s Scenic Rim. What a name.'),
      sprint(880, 30, 'Ad break! A short sharp 30 seconds. Make it count.', 1000, 150, { chapter: 'Ad break' }),
      { at: 1020, kind: 'story', who: 'tex', chapter: 'Double points', fx: 'braam', say: 'We are back with double points. Hold on to your hats.' },
      q(1060, 'tex', 'For two thousand points. Which Australian bird is famous for its laugh?', ['The galah', 'The kookaburra', 'The magpie'], 'B',
        'The kookaburra! And it is laughing with you, not at you.', 'It is the kookaburra. It is laughing with you, I promise.', 2000),
      q(1150, 'tex', 'The final question, for three thousand points. The Ashes is a contest in which sport?', ['Rugby', 'Tennis', 'Cricket'], 'C',
        'Cricket! Australia versus England, and nobody ever gets over it.', 'It is cricket. Australia versus England, every couple of years.', 3000, { chapter: 'The final question' }),
      finale(1290),
    ],
  },
  {
    ...SHOW,
    id: 'quiz-3',
    episode: 3,
    title: 'The Grand Final',
    minutes: 25,
    difficulty: 'Hard effort',
    blurb: 'Show 3. Uluru, the Melbourne Cup and the fastest marathon ever run.',
    loop: line('tex', 'A loop in the grand final! The crowd goes wild.'),
    early: line('tex', 'Taking an early mark? Your points are safe. Champions rest too.'),
    beats: [
      ...intro('The grand final'),
      q(120, 'tex', 'For a thousand points. Uluru is in which part of Australia?', ['Western Australia', 'South Australia', 'The Northern Territory'], 'C',
        'The Northern Territory! Right in the red centre.', 'It is the Northern Territory, right in the red centre.'),
      q(220, 'milly', 'My turn! True or false. The platypus lays eggs.', ['True', 'False'], 'A',
        'True! A mammal that lays eggs. Nature was having a fun day.', 'True, believe it or not! A mammal that lays eggs. Nature was having a fun day.'),
      sprint(330, 45, 'Ad break! Sprint for 45 seconds, and do not hold back.', 1500, 120, { chapter: 'Ad break' }),
      sprint(500, 45, 'And another! The sponsors want more. 45 seconds.', 1500, 150),
      { at: 690, kind: 'story', who: 'milly', chapter: 'Real or Rubbish', fx: 'question', say: 'Grand final Real or Rubbish! Three place names. Which are real?' },
      realOr(740, 'Banana, Queensland', true, 'Real! Banana is a town in central Queensland.', 'It is real! Banana is a town in central Queensland. No bananas required.'),
      realOr(830, 'Vegemite Vale, Victoria', false, 'Rubbish! Sadly, no such place. Somebody should build it.', 'Rubbish! No Vegemite Vale, sadly. Somebody should build it.'),
      realOr(920, 'Dingo, Queensland', true, 'Real! Dingo is a small town in central Queensland.', 'It is real! Dingo is a small town in central Queensland.'),
      sprint(1010, 60, 'Last ad break of the season! 60 seconds, everything you have got.', 2500, 180, { chapter: 'Ad break' }),
      { at: 1210, kind: 'story', who: 'tex', chapter: 'Double points', fx: 'braam', say: 'Double points, grand final edition. This is where champions are made.' },
      q(1250, 'tex', 'For two thousand points. The Melbourne Cup is run on which day?', ['First Tuesday in November', 'Boxing Day', 'First Saturday in March'], 'A',
        'The first Tuesday in November! The race that stops a nation.', 'It is the first Tuesday in November. The race that stops a nation.', 2000),
      q(1340, 'tex', 'The final question of the season, for five thousand points. Who ran the first marathon under two hours, in 2019?', ['Eliud Kipchoge', 'Mo Farah', 'Usain Bolt'], 'A',
        'Eliud Kipchoge! One hour, 59 minutes and 40 seconds. Absolute legend.', 'It was Eliud Kipchoge, in one hour 59 minutes and 40 seconds. Usain would have needed a lie down.', 5000, { chapter: 'The final question' }),
      { at: 1420, kind: 'steady', seconds: 60, who: 'tex', say: 'While the judges tally it up, ease into a gentle jog. You have earned it.', easyNudge: EASY },
      finale(1490),
    ],
  },
]

export const GAMESHOW_CHAIN = ['quiz-1', 'quiz-2', 'quiz-3']
