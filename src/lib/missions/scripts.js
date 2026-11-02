// The mission scripts: six short audio stories about the Trailkeepers, a
// friendly crew holding ground in an Aussie suburb, and the Magpies, a
// cheeky rival crew. Each beat runs at a time on the mission clock (seconds,
// pauses left out). Kinds: story, surge (seconds or metres, then an easy
// recover), steady (hold an easy pace), recover (walk or jog easy), finale.
// Lines are short so the server voice can cache them, and lines used in
// more than one mission are shared below (cached once by their text).
//
// House rules: Australian English, no dashes, no guilt, never scary or mean.

const WIN = 'You lost them. Brilliant running. Ease right back now.'
const OKAY = 'You got away anyway. Nice work. Ease right back now.'
const MADE_IT = 'Made it. Brilliant running. Ease right back now.'
const MADE_IT_OKAY = 'You got there anyway. Nice work. Ease right back now.'
const HALF = 'Halfway. Keep it up.'
const EASY_NUDGE = 'Easy does it. Scouts move quietly, so ease back a touch.'
const COOL_DOWN = 'Cool down now with a gentle jog or a walk.'
const TIP_CHAT = 'Kofi here. If you can chat in full sentences, your pace is just right.'

const chase = (at, seconds, say, recover, extra = {}) => ({ at, kind: 'surge', seconds, say, success: WIN, okay: OKAY, recover, ...extra })
const dash = (at, seconds, say, recover, extra = {}) => ({ at, kind: 'surge', seconds, say, success: MADE_IT, okay: MADE_IT_OKAY, recover, ...extra })

export const MISSIONS = [
  {
    id: 'first-steps',
    title: 'First Steps',
    series: 'intro',
    type: 'surge',
    minutes: 15,
    difficulty: 'Gentle',
    blurb: 'Meet the Trailkeepers and slip past the cheeky Magpies twice.',
    loop: 'Close the loop to mark your first patch of ground for the crew.',
    early: 'Calling it there is fine. Welcome to the crew all the same. Your spot on the board is saved.',
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'Joining the crew', say: 'Kofi here on the radio. Welcome to the Trailkeepers. We look after this patch, one hex at a time. Start with an easy walk or jog.' },
      { at: 60, kind: 'story', say: "Nan Bev runs the crew from her back verandah. She says g'day, and the kettle's on." },
      { at: 140, kind: 'story', say: 'Tash is our lookout. She rides ahead on her bike and spots trouble before it spots us.' },
      { at: 215, kind: 'story', chapter: 'The Magpies', say: 'Uh oh. Tash has spotted the Magpies, a cheeky rival crew. They like to chalk their name on our hexes.' },
      chase(245, 30, 'Dazza from the Magpies has seen you. Pick it up for 30 seconds to slip past him.', 120),
      { at: 300, kind: 'story', say: "Ha. Dazza has stopped to retie his shoelace. Again." },
      { at: 380, kind: 'story', say: 'Every street you run is ground the crew can hold. Close a loop and the hexes inside are ours.' },
      chase(460, 30, 'One more. The Magpies are circling back. Pick it up for 30 seconds.', 120, { chapter: 'Home stretch' }),
      { at: 600, kind: 'story', say: "Nan Bev says you're a natural. High praise. She once told a surveyor his maps were wonky." },
      { at: 720, kind: 'steady', seconds: 140, say: "Settle into an easy jog now. Nice and smooth. Let's head for the verandah.", easyNudge: EASY_NUDGE },
      { at: 870, kind: 'finale', say: "Mission complete. Welcome to the Trailkeepers. Nan Bev's put your name on the crew board." },
    ],
  },
  {
    id: 'supply-line',
    title: 'Supply Line',
    series: 'intro',
    type: 'surge',
    minutes: 20,
    difficulty: 'Gentle',
    blurb: 'Fetch supplies for the crew and keep the Magpies off the lamingtons.',
    loop: 'Close the loop to secure the supply line. That ground keeps the crew fed.',
    early: 'Good call stopping there. The supplies are safe at the halfway house, and the crew will fetch them later.',
    beats: [
      { at: 3, kind: 'recover', seconds: 220, chapter: 'The order', say: 'Kofi here. Big job today. The crew is low on supplies, and Nan Bev needs a run to the corner shop. Warm up with an easy jog.' },
      { at: 70, kind: 'story', say: 'The list says milk, a loaf of bread, and lamingtons. Nan Bev underlined lamingtons twice.' },
      { at: 150, kind: 'story', say: 'Tash says the shop is open and the Magpies are nowhere to be seen. So far.' },
      dash(240, 40, 'The Magpies want the last lamingtons too. Pick it up for 40 seconds to beat them to the counter.', 120, { chapter: 'The corner shop' }),
      { at: 330, kind: 'story', say: 'Got them. The shopkeeper says Dazza asked for lamingtons with no coconut. Whatever next.' },
      { at: 420, kind: 'story', say: 'Now for the long way home. Every hex you pass keeps the supply line open.' },
      chase(510, 40, 'Dazza is following you with a very innocent look. Pick it up for 40 seconds to lose him.', 120, { chapter: 'The supply line' }),
      { at: 620, kind: 'story', say: 'Stay smooth. The milk is fine. Probably.' },
      { at: 700, kind: 'steady', seconds: 180, say: 'Hold an easy pace now. Scout the streets and keep the supply line clear.', easyNudge: EASY_NUDGE },
      dash(900, 40, 'Last push. Tash spotted Magpies near the verandah. Pick it up for 40 seconds to get the supplies home.', 150, { chapter: 'Last leg' }),
      { at: 1000, kind: 'story', say: COOL_DOWN },
      { at: 1100, kind: 'finale', say: 'Mission complete. The supplies made it, and Nan Bev has put the kettle on. The crew owes you a lamington.' },
    ],
  },
  {
    id: 'lantern-night',
    title: 'Lantern Night',
    series: 'intro',
    type: 'surge',
    minutes: 25,
    difficulty: 'Gentle',
    blurb: 'Light a lantern on every hex before the street party starts.',
    loop: 'Close the loop and that whole patch glows for the party.',
    early: 'Stopping there is perfect. The lanterns you lit are glowing, and the party can start.',
    beats: [
      { at: 3, kind: 'recover', seconds: 240, chapter: 'Party prep', say: "Kofi here. It's the street party tonight, and the Trailkeepers hang a lantern on every hex we hold. Warm up easy." },
      { at: 80, kind: 'story', say: 'Nan Bev has made enough sausage rolls for the whole suburb. Twice.' },
      { at: 170, kind: 'story', say: "Tash is counting lanterns. We need one for every hex. That's a lot of lanterns." },
      dash(260, 45, 'The Magpies are hanging their lanterns on our hexes. Pick it up for 45 seconds to get there first.', 150, { chapter: 'The lantern run' }),
      { at: 360, kind: 'story', say: "Lovely. That street's glowing in Trailkeeper green." },
      { at: 460, kind: 'story', say: 'Kofi here. Breathe out long and slow. Your legs will thank you.' },
      dash(540, 45, "Dazza's crew is sneaking down the next street with a ladder. Pick it up for 45 seconds.", 150),
      { at: 650, kind: 'story', say: "The Magpies have tangled their lantern string around a letterbox. We'll help them out later." },
      { at: 760, kind: 'steady', seconds: 200, chapter: 'Lights up', say: "Easy pace now. Walk if you like. Take in the streets you've lit up.", easyNudge: EASY_NUDGE },
      dash(980, 45, 'Last lanterns. The party starts soon. Pick it up for 45 seconds to light the final hex.', 180),
      { at: 1180, kind: 'story', say: 'Hear that? The music has started, and the whole street is out.' },
      { at: 1310, kind: 'story', say: "Nan Bev wants you to know there's a sausage roll with your name on it." },
      { at: 1440, kind: 'finale', say: 'Mission complete. Every lantern is lit. Even Dazza came to the party, and he brought a pav. Fair play.' },
    ],
  },
  {
    id: 'magpie-season',
    title: 'Magpie Season',
    series: 'main',
    type: 'surge',
    minutes: 35,
    difficulty: 'Steady effort',
    blurb: 'Swooping season. Six one minute surges to hold the park, a fartlek in disguise.',
    loop: 'Close the loop to hold the park. The Magpies hate that.',
    early: "Fair enough. The ground you held today stays held, and the Magpies are still scratching their heads.",
    beats: [
      { at: 3, kind: 'recover', seconds: 320, chapter: 'Swooping season', say: "Kofi here. It's swooping season, and the Magpies are out in force. Warm up easy for five minutes." },
      { at: 100, kind: 'story', say: 'Spring does this to them. They get cheeky, they get loud, and they chalk their name on everything.' },
      { at: 200, kind: 'story', say: 'Nan Bev has a plan. Every time they swoop, you surge. Every time you surge, we hold the ground.' },
      chase(330, 60, 'A Magpie scout has spotted you. Pick it up for 60 seconds to lose them.', 90, { chapter: 'Six swoops', half: HALF }),
      chase(480, 60, 'Another swoop from the left. Pick it up for 60 seconds.', 90, { half: HALF }),
      chase(630, 60, 'Here comes Dazza on his scooter. Pick it up for 60 seconds.', 90, { half: HALF }),
      { at: 710, kind: 'story', say: 'Kofi here. Arms relaxed, short quick steps. Lovely.' },
      chase(780, 60, 'Halfway through the swoops. Pick it up for 60 seconds to hold the park.', 90, { half: HALF }),
      chase(930, 60, 'Tash says two Magpies are hiding behind the bus shelter. Pick it up for 60 seconds.', 90, { half: HALF }),
      chase(1080, 60, 'Last swoop. Pick it up for 60 seconds and we hold the lot.', 90, { half: HALF }),
      { at: 1160, kind: 'story', say: "That's all six. The Magpies have gone quiet. Very suspicious." },
      { at: 1230, kind: 'steady', seconds: 360, chapter: 'Holding ground', say: 'Settle into an easy pace for a while. Scout the streets and let the crew catch up.', easyNudge: EASY_NUDGE },
      { at: 1420, kind: 'story', say: 'Nan Bev says the Magpies have gone to the skate park to regroup.' },
      dash(1600, 30, 'One last cheeky one. Pick it up for 30 seconds.', 60, { chapter: 'Last laugh' }),
      dash(1690, 30, 'And again, for luck. 30 seconds.', 240),
      { at: 1780, kind: 'story', say: COOL_DOWN },
      { at: 1900, kind: 'story', say: 'Kofi here. Have a big drink of water when you get home.' },
      { at: 2040, kind: 'finale', say: 'Mission complete. The ground is ours, and the Magpies sent a note. It says, see you next swooping season.' },
    ],
  },
  {
    id: 'hilltop-crown',
    title: 'The Hilltop Crown',
    series: 'main',
    type: 'surge',
    minutes: 40,
    difficulty: 'Hard effort',
    blurb: 'Five 300 metre pushes and three quick bursts to win the crown at sunset.',
    loop: 'Close the loop to lock in the ground around the hill.',
    early: 'Smart to stop there. The ground you took today counts, and the crown will wait for a rematch.',
    beats: [
      { at: 3, kind: 'recover', seconds: 320, chapter: 'The challenge', say: 'Kofi here. The Magpies have challenged us for the hilltop crown. Most ground by sunset wears it. Warm up easy.' },
      { at: 110, kind: 'story', say: 'The crown is a bottle top on a string. Nan Bev made it years ago, and it means everything.' },
      { at: 220, kind: 'story', say: 'Tash has mapped it out. Five big pushes of about 300 metres. Recover well between them.' },
      chase(330, null, 'First push. Pick it up for 300 metres and plant our flag on the first hex.', 120, { metres: 300, chapter: 'Five pushes', half: HALF }),
      chase(550, null, 'Second push. The Magpies are on the next street. Pick it up for 300 metres.', 120, { metres: 300, half: HALF }),
      chase(770, null, 'Third push. Dazza is puffing, and so is his dog. Pick it up for 300 metres.', 120, { metres: 300, half: HALF }),
      { at: 920, kind: 'story', say: 'Over halfway. Kofi here. Look ahead, not down.' },
      dash(990, null, 'Fourth push. Tash says the crown is in sight. Pick it up for 300 metres.', 120, { metres: 300, half: HALF }),
      dash(1210, null, 'Final push. Pick it up for 300 metres and the hilltop is ours.', 180, { metres: 300, half: HALF }),
      { at: 1350, kind: 'story', say: 'Breathe. That was big running.' },
      { at: 1450, kind: 'steady', seconds: 360, chapter: 'Holding the hill', say: 'Easy pace now. Hold the ground and scout the streets around the hill.', easyNudge: EASY_NUDGE },
      { at: 1600, kind: 'story', say: "Kofi's checking the map. Our hexes are glowing all the way up the hill." },
      { at: 1760, kind: 'story', say: 'The Magpies want one last contest. Three quick bursts, then the crown is decided.' },
      dash(1850, 60, 'Burst one. Pick it up for 60 seconds.', 90, { chapter: 'Sunset', half: HALF }),
      dash(2000, 60, 'Burst two. Pick it up for 60 seconds.', 90, { half: HALF }),
      dash(2150, 60, 'Last burst. Pick it up for 60 seconds, then the crown is decided.', 180, { half: HALF }),
      { at: 2240, kind: 'story', say: COOL_DOWN },
      { at: 2320, kind: 'story', say: 'Nan Bev is counting hexes. She counts slowly. Very slowly.' },
      { at: 2400, kind: 'finale', say: 'Mission complete. By Nan Bev\'s count, the hilltop crown is ours. Dazza shook your hand. Good sport, that one.' },
    ],
  },
  {
    id: 'steady-scout',
    title: 'Steady Scout',
    series: 'easy',
    type: 'steady',
    minutes: 20,
    difficulty: 'Easy',
    blurb: 'No Magpies today. An easy run scouting the quiet streets for the crew.',
    loop: 'Close the loop to claim the streets you have scouted.',
    early: 'That was a fine scout. Every street you saw today is on the map now.',
    beats: [
      { at: 3, kind: 'steady', seconds: 1140, chapter: 'Quiet streets', say: 'Kofi here. No Magpies today, just quiet streets. Settle into an easy pace and scout the ground.', easyNudge: EASY_NUDGE },
      { at: 150, kind: 'story', say: 'Your job is to look and listen. Which streets are quiet? Where would a loop fit?' },
      { at: 300, kind: 'story', say: TIP_CHAT },
      { at: 450, kind: 'story', say: 'Tash rode past and waved. She says the gardens on this street are looking lovely.' },
      { at: 600, kind: 'story', chapter: 'The far hexes', say: "Halfway. The far hexes haven't seen a Trailkeeper in a while. They'll be glad of the visit." },
      { at: 750, kind: 'story', say: "Nan Bev says easy days build the engine. She's right, as usual." },
      { at: 900, kind: 'story', say: 'Notice your shoulders. Keep them low and loose.' },
      { at: 1050, kind: 'story', chapter: 'Back to base', say: "Start thinking about the way home. A loop back to your start claims what you've scouted." },
      { at: 1170, kind: 'finale', say: 'Mission complete. The streets are scouted and the map is fresher for it. Lovely easy running.' },
    ],
  },
]

/** The order missions unlock in. Steady Scout is always open. */
export const CHAIN = ['first-steps', 'supply-line', 'lantern-night', 'magpie-season', 'hilltop-crown']

export const missionById = (id) => MISSIONS.find((m) => m.id === id) || null
