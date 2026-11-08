// Time Runners: a five episode time travel adventure. A glitchy prototype
// watch from a future lab clamps onto your wrist mid run and starts jumping
// you through famous moments in Australian history. Sterling Vane, a rival
// time hopper who "collects" souvenirs from history's best moments, keeps
// pulling things out of them, and every theft sends ripples through time. You
// run to put each moment right before its window closes, with Dr Hattie Quill
// talking you through it from the future (over the watch) and Nell, a cheeky
// kid from the 1851 goldfields, who grabs your sleeve at the end of episode
// one and comes along for the ride. Vane is thwarted, never hurt, and in the
// finale he needs your help to undo the knot his ripples have tied.
//
//   1 Gold Fever         Ophir, near Orange, May 1851: the first gold cradle
//   2 Ribbon Day         Sydney Harbour Bridge opening, 19 March 1932
//   3 The Pudding Tin Torch  Sydney and the MCG, November 1956
//   4 The Winged Keel    Newport, Rhode Island, 26 September 1983
//   5 Full Circle        Sydney Olympics opening night, 15 September 2000
//
// Pure data (series/index.js merges it in). Same beat format as signal.js.
//
// Facts in the story and the trivia were checked (web search, November 2026):
// - Ophir: payable gold found in 1851 where Summer Hill Creek meets Lewis
//   Ponds Creek, northeast of Orange; named by Parson Tom after the biblical
//   land of gold. William Tom built a cradle (rocker box) in March 1851.
//   Hargraves' report ran in the Sydney Morning Herald on 2 May 1851, and
//   about 300 diggers had arrived by 15 May. A digging licence cost 30
//   shillings a month (20 shillings to the pound, so one and a half pounds).
// - Harbour Bridge: opened Saturday 19 March 1932 before a crowd estimated at
//   300,000 to a million. Francis de Groot rode up on horseback and cut the
//   ribbon before Premier Jack Lang; it was retied and Lang cut it. The same
//   golden scissors were used. About six million rivets. The two halves of the
//   arch first touched on 19 August 1930. The four pylons have no structural
//   purpose (added for looks and to reassure the public).
// - 1956: first Olympics in the Southern Hemisphere, opened 22 November at
//   the MCG, where Ron Clarke lit the cauldron. The flame flew from Greece to
//   Darwin, then Cairns, where the Australian relay began. In Sydney a
//   university student ran with a fake torch (a silver painted chair leg, a
//   plum pudding tin and burning kerosene soaked underpants) and the Lord
//   Mayor took it at the Town Hall until someone whispered to him. Equestrian
//   events were held in Stockholm in June 1956 because of quarantine rules. A
//   young Melburnian, John Ian Wing, suggested athletes mingle at the closing
//   ceremony, a tradition that continues.
// - 1983: the America's Cup was raced off Newport, Rhode Island. Australia II
//   was down 1 to 3, won the last three, and took race seven on 26 September
//   (27 September in Australia) by 41 seconds, ending a 132 year American
//   streak (since 1851). Ben Lexcen's winged keel was hidden under a skirt
//   until after the final race; a boxing kangaroo flag flew from the mast;
//   the New York Yacht Club had to unbolt the Cup.
// - Sydney 2000: opening ceremony 15 September 2000 at Stadium Australia,
//   Homebush. Cathy Freeman lit a ring of fire inside a waterfall; it stalled
//   for about four minutes on its way up. Mascots Syd (platypus), Olly
//   (kookaburra) and Millie (echidna). About 47,000 volunteers (46,967).
//
// Real people are only mentioned, never voiced. Every character with lines is
// made up. House rules: tense, never cruel. Nobody is hurt, Vane is thwarted
// with flour, cake and a crowd of waving hats, and the finale lands somewhere
// warm.

const line = (who, text) => ({ who, text })

const T_WIN = line('tr-hattie', '[excited] Brilliant! The ring is holding. Ease right back now.')
const T_OKAY = line('tr-hattie', 'You got there, and that is what counts. Ease right back now.')
const T_HALF = line('tr-hattie', 'Halfway. The watch is charging. Keep going.')
const N_WIN = line('tr-nell', '[excited] Strewth, you are quick! Ease right back now.')
const N_OKAY = line('tr-nell', 'We made it! Catch your breath. Ease right back now.')
const N_HALF = line('tr-nell', 'Halfway! Keep those legs going!')
const T_EASY = line('tr-hattie', 'Easy now. The watch charges best on a steady stride. Save your legs.')

const dash = (at, seconds, who, say, recover, extra = {}) => ({
  at, kind: 'surge', seconds, who, say, recover,
  success: who === 'tr-nell' ? N_WIN : T_WIN,
  okay: who === 'tr-nell' ? N_OKAY : T_OKAY,
  half: who === 'tr-nell' ? N_HALF : T_HALF,
  ...extra,
})

export const SAGA = {
  id: 'timerunners',
  title: 'Time Runners',
  blurb: 'A glitchy watch from the future, a cheeky kid from 1851, and five famous Aussie moments to put right before the window closes.',
  note: 'Real moments from Australian history, with a made up time traveller or two. The trivia is all true.',
  narrator: 'timerunners-narrator',
  score: 'timerunners',
  isNew: true,
}

export const EPISODES = [
  // ===================== 1. Gold Fever =====================
  {
    id: 'timerunners-gold',
    episode: 1,
    next: 'Next time on Time Runners: a giant steel arch, a man on a horse, and a pair of golden scissors that go missing.',
    saga: 'timerunners',
    title: 'Gold Fever',
    series: 'thriller',
    type: 'surge',
    minutes: 20,
    difficulty: 'Gentle',
    blurb: 'Episode 1. A watch from the future grabs your wrist and drops you in the 1851 gold rush, just as a stranger in silver steals the first cradle.',
    loop: line('tr-nell', 'You ran a loop! Back where we started. Mum says that is how you find gold. Go round twice.'),
    early: line('tr-hattie', 'Stopping there is fine. The watch has saved your spot in 1851. The creek will keep.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 200, chapter: 'The jump', scene: 'goldfield', fx: 'timewarp', say: 'An ordinary morning run. Then a buzz on your wrist, a flash of gold, and the street folds away. You land on red dirt by a creek. Start with an easy walk or jog.' },
      { at: 45, kind: 'story', spatial: 'kookaburra', say: 'A kookaburra laughs at you from a gum tree. Below it, dozens of canvas tents. Men in cabbage tree hats shovel gravel into rocking wooden boxes.' },
      { at: 100, kind: 'story', who: 'tr-hattie', fx: 'timeglitch', say: 'Hello? Is this on? Dr Hattie Quill, from the future. You are wearing my watch. Please do not panic. I am panicking enough for both of us.' },
      { at: 165, kind: 'story', who: 'tr-hattie', say: 'The watch is a prototype. It fell through a test ring and grabbed the nearest wrist. Yours. This is Ophir, near Orange, in May 1851. Gold has just been found.' },
      { at: 230, kind: 'story', who: 'tr-nell', say: '[curious] Oi. You fell out of the sky. I saw you. I am Nell, and my mum runs the store tent. Are you from Sydney? You dress very strange.' },
      dash(290, 30, 'tr-hattie', 'Oh no. The watch has found another time signal, right here. Someone else is jumping. Pick it up for 30 seconds and follow it!', 120, { chapter: 'A second signal', fx: 'timeripple' }),
      { at: 350, kind: 'story', say: 'Up the creek, a tall man in a silver coat is hauling a wooden box onto a wheelbarrow. His wrist glows, just like yours.' },
      { at: 380, kind: 'story', who: 'tr-vane', fx: 'brassfanfare', say: '[laughs] Well, well. A runner. Sterling Vane, collector of history’s finest moments. I take one little souvenir from each. Today, this box.' },
      { at: 440, kind: 'story', who: 'tr-nell', say: 'Oi! That is Will Tom’s cradle! He built it back in March, and everyone on the creek copied it. Put it down!' },
      { at: 490, kind: 'story', who: 'tr-hattie', say: 'Sterling Vane. He stole a prototype from my lab. If he takes the first cradle out of this moment, the whole rush could start to unravel.' },
      { at: 540, kind: 'quiz', who: 'tr-nell', say: '[mischievously] Before we chase him. Do you even know where you are? What is this goldfield called?',
        options: [{ key: 'A', label: 'Ophir' }, { key: 'B', label: 'El Dorado' }, { key: 'C', label: 'Ballarat' }], answer: 'A',
        right: line('tr-nell', 'Ophir! Parson Tom named it after the land of gold in the Bible. You are not so strange after all.'),
        wrong: line('tr-nell', 'It is Ophir. Parson Tom named it after the land of gold in the Bible. Now, after him!') },
      { at: 600, kind: 'choice', id: 'crossing', who: 'tr-hattie', say: 'Vane is wheeling it up the far bank. Hop across the creek on the stepping stones, or take the track round the hill?',
        options: [
          { key: 'A', label: 'The stepping stones', flag: 'creek', say: line('tr-nell', 'Stones it is. Mind the green one. It is slippery and it has a yabby under it.') },
          { key: 'B', label: 'The hill track', flag: 'track', say: line('tr-hattie', 'The track. Longer, but dry. Good thinking.') },
        ],
        default: 'B', timeout: line('tr-hattie', 'The hill track. Dry feet. Go!') },
      dash(650, 30, 'tr-nell', 'Across the stepping stones! Pick it up for 30 seconds. Splash, step, splash!', 120, { if: 'creek', chapter: 'The chase', fx: 'whoosh' }),
      dash(651, 30, 'tr-hattie', 'Round the hill track! Pick it up for 30 seconds and cut him off at the bend.', 120, { unless: 'creek', chapter: 'The chase', fx: 'whoosh' }),
      { at: 710, kind: 'story', if: 'creek', say: 'You hop the last stone and land right in front of the wheelbarrow. Vane skids to a stop, his boots full of creek water.' },
      { at: 711, kind: 'story', unless: 'creek', say: 'You crest the hill and come down the track just as Vane rounds the bend. He skids to a stop in a cloud of red dust.' },
      { at: 760, kind: 'story', who: 'tr-vane', fx: 'ringshut', say: '[sarcastic] Fast legs. Lovely. But I have a time ring, and you have a borrowed watch that hiccups. Ta ta.' },
      { at: 800, kind: 'steady', seconds: 160, chapter: 'The store tent', say: 'Vane blinks out in a shimmer of gold, cradle and all. Settle into an easy pace while Hattie tracks him.', easyNudge: T_EASY },
      { at: 850, kind: 'story', who: 'tr-hattie', say: 'Got him. He only jumped ten minutes ahead, to the store tent. His ring needs time to cool down. So does yours, sadly.' },
      { at: 910, kind: 'story', who: 'tr-maggie', spatial: 'dog', say: 'Nell Cassidy, where have you been? And who is this? A runner. Lovely. A man in a silver coat just put a cradle in my flour sacks and vanished.' },
      { at: 970, kind: 'puzzle', who: 'tr-maggie', say: 'Help me with my sums while you wait. A digger’s licence is thirty shillings a month. Twenty shillings make a pound. How many pounds is that?',
        options: [{ key: 'A', label: 'One pound' }, { key: 'B', label: 'One and a half pounds' }, { key: 'C', label: 'Three pounds' }], answer: 'B',
        right: line('tr-maggie', 'One and a half pounds. Clever. Nell, give the runner a bit of damper.'),
        wrong: line('tr-maggie', 'It is one and a half pounds. Thirty shillings, twenty to the pound. Nell, give the runner some damper.') },
      dash(1010, 30, 'tr-hattie', 'There! Vane is behind the tent, opening a ring. Pick it up for 30 seconds and grab that cradle!', 100, { chapter: 'The grab', fx: 'windup' }),
      { at: 1065, kind: 'story', fx: 'thunk', say: 'You grab one end of the cradle. Vane grabs the other. His ring crackles. Then Nell tips a whole bag of flour over his silver coat.' },
      { at: 1095, kind: 'story', who: 'tr-vane', fx: 'ringshut', say: '[sighs] Flour. On silk. Fine, keep your rocking box. There are shinier souvenirs. I hear a bridge opens in Sydney.' },
      { at: 1130, kind: 'story', who: 'tr-hattie', fx: 'timeglitch', say: 'Cradle is back, the ripple is settling. Oh no. Oh no. Your watch is locking onto his trail. Hold on to something!' },
      { at: 1170, kind: 'finale', fx: 'timewarp', say: 'Nell grabs your sleeve as the world spins gold. Episode one complete. The watch is jumping again, and Nell is coming too. To be continued.' },
    ],
  },

  // ===================== 2. Ribbon Day =====================
  {
    id: 'timerunners-bridge',
    episode: 2,
    previously: 'Previously on Time Runners: a watch from the future, a stolen gold cradle, a bag of flour, and Nell grabbing your sleeve.',
    next: 'Next time on Time Runners: the Olympic torch, a plum pudding tin, and a flame stolen in a jar.',
    saga: 'timerunners',
    title: 'Ribbon Day',
    series: 'thriller',
    type: 'surge',
    minutes: 25,
    difficulty: 'Steady effort',
    blurb: 'Episode 2. The Harbour Bridge opens in 1932. A man on a horse cuts the ribbon early, and Vane pockets the golden scissors.',
    loop: line('tr-lennie', 'You ran a loop, mate. Like an arch. Start on one side, finish on the other, meet in the middle.'),
    early: line('tr-hattie', 'That is fine. The watch has saved your spot on the bridge. It is not going anywhere. It is a bridge.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 220, chapter: 'Saturday, 19 March 1932', scene: 'harbour', fx: 'timewarp', say: 'Gold light, a roar, a thud. You land on a brand new road. Above you, a giant steel arch. Below, a harbour packed with boats. Warm up easy.' },
      { at: 45, kind: 'story', who: 'tr-nell', say: '[excited] Strewth! A bridge? Made of iron? Hanging off the sky? And what are those carts with no horses?' },
      { at: 100, kind: 'story', who: 'tr-hattie', say: 'Saturday the nineteenth of March, 1932. The Sydney Harbour Bridge opens today. Nell, those are motor cars. Please do not lick one.' },
      { at: 160, kind: 'story', scene: 'jubilee', spatial: 'brassband', say: 'A brass band marches past, cornets flashing in the sun. Bunting flaps from every lamp post. Hundreds of thousands of people pack the bridge.' },
      { at: 220, kind: 'story', who: 'tr-lennie', say: 'G’day. Lennie Platt, rigger. I helped put this beauty together. Six million rivets, and me thumbs felt every one. You two look lost.' },
      { at: 280, kind: 'story', who: 'tr-hattie', fx: 'timeripple', say: 'Ripple alert. Vane is here somewhere. The history needle is wobbling. Something about the ribbon is about to change.' },
      dash(330, 45, 'tr-hattie', 'There! Silver coat, by the pylon. He is heading for the official stand. Pick it up for 45 seconds through the crowd!', 130, { chapter: 'Silver coat', fx: 'windup' }),
      { at: 410, kind: 'quiz', who: 'tr-lennie', say: 'While you get your breath back, a riddle from a rigger. Those four big stone pylons. Do they hold the bridge up?',
        options: [{ key: 'A', label: 'Yes, they carry it' }, { key: 'B', label: 'They are for looks' }, { key: 'C', label: 'They hold water' }], answer: 'B',
        right: line('tr-lennie', 'Spot on. The arch does all the work. The pylons are there to look strong, so people feel safe crossing.'),
        wrong: line('tr-lennie', 'They are for looks, mate. The arch does all the work. The pylons just help people feel safe crossing.') },
      { at: 480, kind: 'story', fx: 'brassfanfare', say: 'A fanfare. The crowd hushes. Officials gather at the ribbon, waiting for the Premier. Then, a clatter of hooves.' },
      { at: 530, kind: 'story', spatial: 'crowdwave', say: 'A man in uniform gallops up on a horse and slices through the ribbon before the Premier can. The crowd gasps. Police hurry in.' },
      { at: 580, kind: 'story', who: 'tr-hattie', say: '[laughs] Do not worry, that bit is real. His name is Francis de Groot. History says the ribbon gets tied back together, and the Premier cuts it properly.' },
      { at: 635, kind: 'story', who: 'tr-vane', fx: 'ringshut', say: '[mischievously] And while everyone watches the horse, I take the golden scissors. The most famous snip in Sydney. Ta ta!' },
      dash(680, 45, 'tr-nell', 'He has got the golden scissors! Pick it up for 45 seconds, after him!', 130, { chapter: 'The golden scissors', fx: 'timeripple' }),
      { at: 760, kind: 'story', say: 'Vane weaves through the crowd, scissors flashing. A man with a tray of ice creams spins round. Vane ducks under a rope and onto the footway.' },
      { at: 820, kind: 'choice', id: 'way', who: 'tr-hattie', say: 'His ring is warming up at the far end. Chase him along the footway, or take Lennie’s shortcut along the workers’ catwalk?',
        options: [
          { key: 'A', label: 'Along the footway', flag: 'footway', say: line('tr-hattie', 'Footway it is. Wide, flat and full of people. Say sorry a lot.') },
          { key: 'B', label: 'Lennie’s catwalk', flag: 'catwalk', say: line('tr-lennie', 'Follow me. Hold the rail. Best view in Sydney, and nobody else is allowed up here.') },
        ],
        default: 'A', timeout: line('tr-hattie', 'The footway. Go, go!') },
      dash(870, 45, 'tr-lennie', 'Along the catwalk, under the deck! Pick it up for 45 seconds. Mind your head on the girders.', 130, { if: 'catwalk', chapter: 'Across the harbour', fx: 'whoosh' }),
      dash(871, 45, 'tr-hattie', 'Along the footway! Pick it up for 45 seconds. Past the families, round the prams, and keep him in sight!', 130, { unless: 'catwalk', chapter: 'Across the harbour', fx: 'whoosh' }),
      { at: 950, kind: 'story', if: 'catwalk', say: 'You pop up through a hatch, right in front of Vane. He yelps and drops his hat over the rail. It sails away towards the ferries.' },
      { at: 951, kind: 'story', unless: 'catwalk', say: 'You weave past prams and picnic baskets and close the gap. Vane glances back. He is not smiling now.' },
      { at: 1000, kind: 'steady', seconds: 200, chapter: 'Under the arch', say: 'Vane slips into a crowd watching the ships below. Ease right back and blend in. Easy pace. Eyes open.', easyNudge: T_EASY },
      { at: 1050, kind: 'story', who: 'tr-nell', spatial: 'chatter', say: '[whispers] I see him. He is standing very still and pretending to be a statue. He is very bad at it.' },
      { at: 1110, kind: 'puzzle', who: 'tr-hattie', say: 'His ring has a lock, and Vane uses famous dates. My guess is the year the two halves of this arch first touched. Which year?',
        options: [{ key: 'A', label: '1923' }, { key: 'B', label: '1930' }, { key: 'C', label: '1932' }], answer: 'B',
        right: line('tr-hattie', '1930! The halves met in the middle that August. Lock is open. His ring is offline.'),
        wrong: line('tr-hattie', 'It was 1930. The halves met in the middle that August. Typing it in. His ring is offline.') },
      dash(1170, 45, 'tr-nell', 'He has spotted us! Pick it up for 45 seconds. Corner him by the pylon!', 120, { chapter: 'Snip', fx: 'footsteps' }),
      { at: 1240, kind: 'story', fx: 'thunk', say: 'Nell flaps a picnic rug in his path. Vane sits down, very suddenly, on a sponge cake. The golden scissors skid across the road to your feet.' },
      { at: 1290, kind: 'story', who: 'tr-vane', fx: 'ringshut', say: '[sighs] Cake. On silk. Again. Keep the scissors. I will find something brighter. Something that burns.' },
      { at: 1340, kind: 'story', fx: 'brassfanfare', say: 'You hand the scissors to an official. The ribbon is tied back together. The Premier steps up, and snips. The bridge is open. Sydney roars.' },
      { at: 1385, kind: 'story', who: 'tr-lennie', say: 'Beauty. You two are welcome on my bridge any time. Come back in a hundred years and I will shout you a lemonade.' },
      { at: 1425, kind: 'story', who: 'tr-hattie', fx: 'timeglitch', say: 'Oh no. The watch is on his trail again. Twenty four years ahead. Why can I smell smoke? Nell, hold on!' },
      { at: 1465, kind: 'finale', fx: 'timewarp', say: 'The arch blurs into gold light. Episode two complete. The bridge is open, the scissors are home, and Vane is chasing a flame. To be continued.' },
    ],
  },

  // ===================== 3. The Pudding Tin Torch =====================
  {
    id: 'timerunners-torch',
    episode: 3,
    previously: 'Previously on Time Runners: the Harbour Bridge opened, the golden scissors came home, and Vane went looking for a flame.',
    next: 'Next time on Time Runners: a famous yacht race, a secret hidden under a skirt, and a silver cup bolted down for 132 years.',
    saga: 'timerunners',
    title: 'The Pudding Tin Torch',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Steady effort',
    blurb: 'Episode 3. The 1956 Olympic torch reaches Sydney, a prankster runs with a pudding tin, and Vane steals the flame in a jar.',
    loop: line('tr-clem', 'And the runner has closed a loop, folks! Round the course and back again. Lovely running.'),
    early: line('tr-hattie', 'Stopping is fine. The watch has saved your spot in 1956. The flame will wait for you.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 240, chapter: 'Sydney, November 1956', scene: 'jubilee', fx: 'timewarp', say: 'Gold light, a thump, and the smell of hot chips. You land on George Street. Thousands of people line the footpaths, waving little flags. Warm up easy.' },
      { at: 50, kind: 'story', spatial: 'brassband', say: 'A brass band thumps out a march. Kids sit on their dads’ shoulders. Everyone is waiting for one thing. The Olympic torch.' },
      { at: 110, kind: 'story', who: 'tr-hattie', say: 'November 1956. The torch is on its way to Melbourne, for the first Olympics ever held in the Southern Hemisphere. And Vane loves a flame.' },
      { at: 170, kind: 'story', who: 'tr-clem', say: 'Clem Hartley here, on the wireless, outside Sydney Town Hall. The Lord Mayor is waiting on the steps. The torch could be here any minute, folks!' },
      { at: 230, kind: 'quiz', who: 'tr-hattie', say: 'A quick one to pass the time. The flame flew in from Greece. In which city did the Australian relay begin?',
        options: [{ key: 'A', label: 'Cairns' }, { key: 'B', label: 'Darwin' }, { key: 'C', label: 'Perth' }], answer: 'A',
        right: line('tr-hattie', 'Cairns! The flame landed in Darwin first, then flew on to Cairns, where the runners took over.'),
        wrong: line('tr-hattie', 'It began in Cairns. The flame landed in Darwin first, then flew on to Cairns, where the runners took over.') },
      { at: 300, kind: 'story', fx: 'cheer', spatial: 'crowdwave', say: 'A cheer ripples up the street. A runner comes jogging towards the Town Hall, torch held high, with a police escort. The crowd goes wild.' },
      { at: 350, kind: 'story', who: 'tr-nell', say: '[curious] Runner, look at his torch. Is that a chair leg? And is that a pudding tin on top?' },
      { at: 400, kind: 'story', who: 'tr-hattie', say: '[laughs] It is! This bit is real history. A uni student made a fake torch. A chair leg painted silver, a plum pudding tin, and a pair of burning underpants.' },
      { at: 460, kind: 'story', say: 'The Lord Mayor takes the fake torch and starts his speech. Someone whispers in his ear. He stops. He looks at the tin. The crowd roars with laughter.' },
      { at: 510, kind: 'story', who: 'tr-hattie', fx: 'timeripple', say: 'Ripple! Vane is using the confusion. The real torch is still coming down the street, and he is heading straight for it.' },
      dash(560, 45, 'tr-hattie', 'Pick it up for 45 seconds! Get to the real torch before Vane does!', 130, { chapter: 'The real flame', fx: 'windup' }),
      { at: 640, kind: 'story', fx: 'timeglitch', say: 'Too late. Vane steps out of the crowd with a glass jar and sweeps it past the real torch. The flame leaps inside. The torch goes cold.' },
      { at: 690, kind: 'story', who: 'tr-vane', say: '[excited] The Olympic flame, in a jar. Lit in Greece, carried by thousands of runners. The jewel of my collection. Toodle oo!' },
      { at: 740, kind: 'story', who: 'tr-nell', say: 'He is getting away on a tram! Runner, trams are slow. You are not.' },
      { at: 780, kind: 'choice', id: 'tram', who: 'tr-hattie', say: 'Two ways to catch that tram. Run alongside and hop on the back, or cut through the arcade and meet it at the next stop?',
        options: [
          { key: 'A', label: 'Hop on the tram', flag: 'tram', say: line('tr-nell', '[excited] Yes! I have always wanted to ride a tram. I have never even seen a tram.') },
          { key: 'B', label: 'Cut through the arcade', flag: 'arcade', say: line('tr-hattie', 'The arcade. Clever. Head him off at the next stop.') },
        ],
        default: 'B', timeout: line('tr-hattie', 'The arcade. Cut him off. Go!') },
      dash(830, 60, 'tr-nell', 'Run alongside the tram! Pick it up for 60 seconds and grab the pole!', 130, { if: 'tram', chapter: 'The tram', fx: 'whoosh' }),
      dash(831, 60, 'tr-hattie', 'Through the arcade! Pick it up for 60 seconds. Past the hat shop, round the milk bar, and out the other end!', 130, { unless: 'tram', chapter: 'The tram', fx: 'whoosh' }),
      { at: 920, kind: 'story', if: 'tram', say: 'You swing onto the back step. The conductor tips his cap. Up the front, Vane spots you and nearly drops his jar.' },
      { at: 921, kind: 'story', unless: 'tram', say: 'You burst out of the arcade just as the tram rolls up. Vane steps off, straight into you. The jar wobbles.' },
      { at: 970, kind: 'story', fx: 'timewarp', chapter: 'The MCG', say: 'You both grab the jar. Both watches fizz. The street smears into gold, and you land on grass, in a stadium packed to the rafters.' },
      { at: 1020, kind: 'steady', seconds: 200, say: 'The Melbourne Cricket Ground, the twenty second of November. Opening day of the Games. Ease into a steady pace while Hattie finds Vane.', easyNudge: T_EASY },
      { at: 1070, kind: 'story', who: 'tr-hattie', say: 'Bad news. The jar flame is still tied to the relay. If the last runner’s torch is not lit, the cauldron will not be either.' },
      { at: 1120, kind: 'story', who: 'tr-clem', say: 'Clem Hartley, now at the MCG. What a crowd, folks. And here comes the final torchbearer, young Ron Clarke. But his torch is only flickering.' },
      { at: 1170, kind: 'quiz', who: 'tr-nell', say: 'Vane is showing off to the crowd. He says these Games held their horse events somewhere else entirely. Where?',
        options: [{ key: 'A', label: 'Adelaide' }, { key: 'B', label: 'Stockholm' }, { key: 'C', label: 'London' }], answer: 'B',
        right: line('tr-hattie', 'Stockholm, in Sweden, five months early. Strict quarantine rules kept the horses out. Vane looks very annoyed you knew.'),
        wrong: line('tr-hattie', 'It was Stockholm, in Sweden, five months early. Strict quarantine rules kept the horses out of Australia.') },
      dash(1240, 60, 'tr-hattie', 'Vane is in the grandstand, jar under his coat. Pick it up for 60 seconds, up the stairs, get that jar!', 130, { chapter: 'The cauldron', fx: 'windup' }),
      { at: 1330, kind: 'story', fx: 'thunk', say: 'Nell starts a cheer. Fifty people jump up and wave their hats, right in front of Vane. The jar slips from his coat, rolls down the steps, and you catch it.' },
      { at: 1380, kind: 'story', fx: 'flare', say: 'The lid pops. The flame leaps out in a golden arc, straight into the runner’s torch. It blazes white. He runs his lap, and the cauldron roars into life.' },
      dash(1440, 45, 'tr-nell', 'Vane is opening a ring! Pick it up for 45 seconds. Do not let him take anything else!', 120, { chapter: 'Opening day', fx: 'timeripple' }),
      { at: 1510, kind: 'story', who: 'tr-vane', fx: 'ringshut', say: '[sarcastic] Fine. Keep the flame. I have my eye on something silver, bolted to its stand for a hundred and thirty two years. Bye bye!' },
      { at: 1570, kind: 'story', who: 'tr-clem', say: 'What a day, folks. The Games are open, the flame is burning, and Melbourne has never looked better.' },
      { at: 1630, kind: 'story', who: 'tr-nell', say: '[sighs] Runner, I think I like the future. It has trams and pudding tins and everybody cheers.' },
      { at: 1690, kind: 'story', who: 'tr-hattie', fx: 'timeglitch', say: 'Oh no. He is going a long way this time. Across the Pacific, to 1983. Nell, are you holding on? Runner, deep breath.' },
      { at: 1760, kind: 'finale', fx: 'timewarp', say: 'Salt spray and gold light. Episode three complete. The flame is safe, and Vane is after a silver cup across the ocean. To be continued.' },
    ],
  },

  // ===================== 4. The Winged Keel =====================
  {
    id: 'timerunners-keel',
    episode: 4,
    previously: 'Previously on Time Runners: a pudding tin torch, a flame in a jar, a stadium of waving hats, and a jump across the ocean.',
    next: 'Next time on Time Runners, the final episode: the Sydney Olympics, a ring of fire, and four minutes to untie all of history.',
    saga: 'timerunners',
    title: 'The Winged Keel',
    series: 'thriller',
    type: 'surge',
    minutes: 30,
    difficulty: 'Hard effort',
    blurb: 'Episode 4. Newport, 1983. Race seven of the America’s Cup, a secret keel under wraps, and Vane after the most famous cup in sailing.',
    loop: line('tr-bec', 'You ran a loop! That is a lap of the course. Round the marks and home. Sailor’s legs, you have got.'),
    early: line('tr-hattie', 'That will do. The watch has saved your spot in 1983. The race will wait for you.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 240, chapter: 'Newport, 26 September 1983', scene: 'regatta', fx: 'timewarp', say: 'Gold light, a splash of salt spray, and you land on a wooden dock. Yachts everywhere. Flags snapping in a sea breeze. Warm up easy.' },
      { at: 50, kind: 'story', spatial: 'chatter', say: 'Somewhere a radio crackles. People in green and gold pace up and down the dock, chewing their fingernails.' },
      { at: 110, kind: 'story', who: 'tr-hattie', say: 'Newport, Rhode Island, in America. The twenty sixth of September, 1983. The America’s Cup, race seven. Whoever wins today takes the lot.' },
      { at: 170, kind: 'story', who: 'tr-bec', say: 'G’day! You two look like you need a cuppa. I am Bec. Came all the way from Fremantle to watch. Three races each. Can you believe it?' },
      { at: 230, kind: 'quiz', who: 'tr-bec', say: 'Quiz for the newcomers. Before this year, how many years had the Americans held the Cup?',
        options: [{ key: 'A', label: '32 years' }, { key: 'B', label: '100 years' }, { key: 'C', label: '132 years' }], answer: 'C',
        right: line('tr-bec', '132 years. Ever since 1851, the same year as the gold rush back home.'),
        wrong: line('tr-bec', 'It was 132 years. Ever since 1851, the same year as the gold rush back home.') },
      { at: 290, kind: 'story', who: 'tr-nell', say: '[excited] 1851! That is my year! Gold, and boats. Good year, that one.' },
      { at: 340, kind: 'story', who: 'tr-hattie', fx: 'timeripple', say: 'Ripple! Vane is by the boat shed. Australia II’s keel is wrapped in a skirt to keep it secret, and he wants to whip it off for a photo.' },
      dash(390, 60, 'tr-hattie', 'Pick it up for 60 seconds, down the dock, and stop him!', 140, { chapter: 'The skirt', fx: 'windup' }),
      { at: 480, kind: 'story', say: 'Vane is crouched by the boat shed with an enormous camera, tugging at the skirt round the keel. You plant your foot on its rope. It does not budge.' },
      { at: 530, kind: 'story', who: 'tr-vane', say: '[sarcastic] Oh, come on. One little peek. The most famous secret in sailing. It would look lovely in my collection.' },
      { at: 580, kind: 'story', who: 'tr-bec', say: 'Oi! Hands off our boat. Security! There is a bloke in a silver coat trying to unwrap our keel!' },
      { at: 630, kind: 'story', fx: 'ringshut', say: 'Vane vanishes with a pop of gold, camera and all. The skirt stays put. The secret is safe. For now.' },
      { at: 680, kind: 'steady', seconds: 220, chapter: 'Race seven', say: 'The yachts head out to sea. Bec leads you along the cliff walk to watch. Hold an easy pace and enjoy the view.', easyNudge: T_EASY },
      { at: 740, kind: 'story', spatial: 'helicopter', say: 'A TV helicopter thunders over the water. Hundreds of spectator boats bob along the course, horns honking.' },
      { at: 800, kind: 'story', who: 'tr-bec', say: 'There they go. Liberty is the American boat. Ours is the one with the boxing kangaroo flag up the mast. Go, you good thing!' },
      { at: 860, kind: 'puzzle', who: 'tr-hattie', say: 'A puzzle while they race. Australia II was down one race to three. To win the best of seven, how many races did they need in a row?',
        options: [{ key: 'A', label: 'Two' }, { key: 'B', label: 'Three' }, { key: 'C', label: 'Four' }], answer: 'B',
        right: line('tr-hattie', 'Three in a row. They won races five and six. Today is number three.'),
        wrong: line('tr-hattie', 'It was three in a row. They won races five and six. Today is number three.') },
      { at: 930, kind: 'story', who: 'tr-bec', fx: 'downer', say: 'Oh no. Liberty has pulled ahead. The lead keeps swapping. I cannot watch. Tell me when it is over.' },
      { at: 990, kind: 'story', who: 'tr-hattie', fx: 'timeripple', say: 'Ripple again. A huge one. Vane is not on the water. He is at the yacht club, waiting to grab the Cup the second they unbolt it.' },
      { at: 1040, kind: 'choice', id: 'route', who: 'tr-hattie', say: 'Two ways to the yacht club. Along the harbour wall, flat and fast, or over the hill through town, shorter but steep?',
        options: [
          { key: 'A', label: 'The harbour wall', flag: 'wall', say: line('tr-hattie', 'The harbour wall. Flat, fast, and a lovely view of the finish.') },
          { key: 'B', label: 'Over the hill', flag: 'hill', say: line('tr-nell', 'The hill! I climbed creek banks all my life. Short steps, Runner.') },
        ],
        default: 'A', timeout: line('tr-hattie', 'The harbour wall. Go!') },
      dash(1090, 60, 'tr-nell', 'Up the hill! Pick it up for 60 seconds. Short steps, like climbing a creek bank!', 140, { if: 'hill', chapter: 'The finish', fx: 'whoosh' }),
      dash(1091, 60, 'tr-hattie', 'Along the harbour wall! Pick it up for 60 seconds. Flat and fast, go!', 140, { unless: 'hill', chapter: 'The finish', fx: 'whoosh' }),
      { at: 1180, kind: 'story', if: 'hill', say: 'You crest the hill and see the whole harbour below. Two yachts racing for the line, sails bright as gulls.' },
      { at: 1181, kind: 'story', unless: 'hill', say: 'Spray bursts over the harbour wall. Out on the water, two yachts are racing for the line.' },
      { at: 1230, kind: 'story', fx: 'cheer', spatial: 'crowdwave', say: 'From every boat and balcony, a roar. Australia II crosses the line forty one seconds ahead. After 132 years, the Cup is going to Australia.' },
      { at: 1280, kind: 'story', who: 'tr-nell', say: '[excited] We won! Did we win? Who is we? Oh, it is us! Runner, where is Vane?' },
      { at: 1330, kind: 'story', who: 'tr-hattie', say: 'At the yacht club. They are unbolting the Cup right now, and Vane’s ring is warming up. One last sprint!' },
      dash(1380, 60, 'tr-hattie', 'Pick it up for 60 seconds, through the doors, and get between Vane and that Cup!', 140, { chapter: 'The Cup', fx: 'windup' }),
      { at: 1470, kind: 'story', fx: 'timeglitch', say: 'Vane lunges for the Cup. You step in front of him. His ring sparks, fizzes and splutters. Gold light crackles all over his silver coat.' },
      { at: 1520, kind: 'story', who: 'tr-vane', say: '[whispers] That is not right. My ring has never done that. It is pulling. Everything I ever touched is pulling at once.' },
      { at: 1570, kind: 'story', who: 'tr-hattie', say: 'Oh no, no, no. Every ripple he made is folding into one big knot, in one place. Sydney, in the year 2000.' },
      dash(1610, 60, 'tr-nell', 'His ring is dragging us in! Pick it up for 60 seconds and charge the watch so we can follow!', 120, { chapter: 'The knot', fx: 'timeripple' }),
      { at: 1700, kind: 'story', who: 'tr-bec', say: 'Go on, you two. Whatever that glowing thing is, go and fix it. Australia has got the Cup. You have got this.' },
      { at: 1775, kind: 'finale', fx: 'timewarp', say: 'The dock spins into gold. Episode four complete. The Cup is safe, but Vane’s ring is out of control, and it is pulling history to Sydney. To be continued.' },
    ],
  },

  // ===================== 5. Full Circle =====================
  {
    id: 'timerunners-circle',
    episode: 5,
    previously: 'Previously on Time Runners: the Cup went to Australia, the keel stayed secret, and Vane’s ring started tying history in a knot.',
    saga: 'timerunners',
    title: 'Full Circle',
    series: 'thriller',
    type: 'surge',
    minutes: 35,
    difficulty: 'Hard effort',
    blurb: 'Episode 5, the finale. Opening night of the Sydney 2000 Olympics, a ring of fire that stops, and four minutes to untie all of history.',
    loop: line('tr-priya', 'You ran a full loop! Like a lap of the stadium. The volunteers would give you a medal.'),
    early: line('tr-hattie', 'Stopping there is fine. The watch will hold the knot until you come back. You got us so close.'),
    beats: [
      { at: 3, kind: 'recover', seconds: 300, chapter: 'Homebush, 15 September 2000', scene: 'jubilee', fx: 'timewarp', say: 'Gold light, and a roar louder than anything you have ever heard. You land outside a giant stadium. Fireworks. Flags. The Sydney Olympics. Warm up easy.' },
      { at: 60, kind: 'story', spatial: 'crowdwave', say: 'Inside, a wave of sound sweeps round the stadium, round and round. Tens of thousands of people, all on their feet.' },
      { at: 120, kind: 'story', who: 'tr-nell', say: '[excited] Runner! The whole sky is on fire! Is this the future? Is everyone in the future this loud?' },
      { at: 180, kind: 'story', who: 'tr-hattie', say: 'Friday the fifteenth of September, 2000. Opening night of the Sydney Olympics. And somewhere in there is Vane, with a ring about to pop.' },
      { at: 240, kind: 'story', who: 'tr-priya', say: 'Hi! Priya, volunteer. One of about forty seven thousand of us. You look lost, and you are glowing. Is that part of the show?' },
      { at: 300, kind: 'story', fx: 'timeglitch', spatial: 'brassband', say: 'The air flickers. Gold dust drifts over the crowd. A brass band from 1932 marches straight through a wall, and vanishes.' },
      { at: 360, kind: 'story', who: 'tr-hattie', fx: 'timeripple', say: 'That is the knot. Every moment Vane meddled with is tangled in his ring, and it is pulling them all here at once.' },
      dash(410, 60, 'tr-hattie', 'His signal is inside. Pick it up for 60 seconds, through the gates and up the ramp!', 140, { chapter: 'The knot', fx: 'windup' }),
      { at: 500, kind: 'story', say: 'Inside, the stadium glows. Down on the field, thousands of performers. Up in the stands, a man in a silver coat, fizzing like a sparkler.' },
      { at: 550, kind: 'story', who: 'tr-vane', say: '[sighs] Runner. Hattie. I need help. My ring will not let go. If it snaps tonight, it takes this whole night with it. The flame, the lot.' },
      { at: 610, kind: 'quiz', who: 'tr-priya', say: 'While you think, a volunteer quiz. Our mascots are Syd, Olly and Millie. Olly is which Aussie bird?',
        options: [{ key: 'A', label: 'A kookaburra' }, { key: 'B', label: 'A galah' }, { key: 'C', label: 'An emu' }], answer: 'A',
        right: line('tr-priya', 'A kookaburra! Syd is a platypus and Millie is an echidna. I have all three on my lanyard.'),
        wrong: line('tr-priya', 'Olly is a kookaburra. Syd is a platypus and Millie is an echidna. I have all three on my lanyard.') },
      { at: 680, kind: 'story', who: 'tr-hattie', say: 'Here is the plan. Run the ring round the stadium. Each lap unwinds one tangle: the gold, the ribbon, the flame, the Cup. Each one goes home.' },
      { at: 740, kind: 'choice', id: 'trust', who: 'tr-hattie', say: 'Do we trust Vane? Take his ring and run it yourself, or let him run beside you and unwind it together?',
        options: [
          { key: 'A', label: 'Take his ring', flag: 'solo', say: line('tr-vane', '[sighs] Fair enough. I have not earned it. Here. Be gentle with her.') },
          { key: 'B', label: 'Run it together', flag: 'together', say: line('tr-vane', '[curious] Together? Nobody has ever said that to me. Right. Yes. I will try to keep up.') },
        ],
        default: 'B', timeout: line('tr-hattie', 'Together, then. Everyone deserves a way back.') },
      dash(800, 60, 'tr-hattie', 'Ring on your wrist. Pick it up for 60 seconds. First lap. Unwind the gold!', 140, { if: 'solo', chapter: 'Lap one', fx: 'whoosh' }),
      dash(801, 60, 'tr-vane', 'Side by side, then. Pick it up for 60 seconds. First lap. Unwind the gold!', 140, { unless: 'solo', chapter: 'Lap one', fx: 'whoosh' }),
      { at: 890, kind: 'story', fx: 'ringshut', say: 'A puff of gold dust lifts off the ring and drifts away, back to a creek near Orange in 1851. One down.' },
      { at: 990, kind: 'steady', seconds: 240, chapter: 'The athletes', say: 'Down on the field, the athletes march in, country after country. Ease into a steady pace round the concourse and let the ring cool.', easyNudge: T_EASY },
      { at: 1040, kind: 'story', who: 'tr-hattie', say: 'A bit of history while we wait. In 1956, a young Melburnian wrote in with an idea. At the closing ceremony, athletes should walk together. They still do.' },
      { at: 1100, kind: 'story', who: 'tr-nell', say: 'Like us and Vane. Walking together. [laughs] Even if he did pinch a cradle.' },
      { at: 1160, kind: 'puzzle', who: 'tr-vane', say: 'The ring wants a key to open the next lap. The year of our oldest jump. Is it 1851, 1932 or 1956?',
        options: [{ key: 'A', label: '1851' }, { key: 'B', label: '1932' }, { key: 'C', label: '1956' }], answer: 'A',
        right: line('tr-hattie', '1851, the gold rush. Nell’s year. Key accepted. Second lap ready.'),
        wrong: line('tr-hattie', 'It is 1851, the gold rush. Nell’s year. Key accepted. Second lap ready.') },
      dash(1240, 60, 'tr-nell', 'Second lap! Pick it up for 60 seconds. Unwind the ribbon and the scissors!', 130, { chapter: 'Lap two', fx: 'brassfanfare' }),
      { at: 1330, kind: 'story', fx: 'ringshut', say: 'A golden ribbon of light peels off the ring and flies away towards the harbour, and the bridge, in 1932. Two down.' },
      { at: 1430, kind: 'story', fx: 'flare', say: 'Cathy Freeman lights the cauldron. A ring of fire blazes up around her, inside a curtain of falling water. The stadium gasps.' },
      { at: 1480, kind: 'story', fx: 'timeglitch', say: 'The ring of fire begins to rise up the waterfall. Then it stops. It just hangs there. The whole stadium holds its breath.' },
      { at: 1520, kind: 'story', who: 'tr-hattie', say: 'That pause really happened. A technical hitch, about four minutes long. Tonight the knot is pulling on it. Four minutes. That is our window.' },
      dash(1570, 60, 'tr-hattie', 'Last lap, the big one! Pick it up for 60 seconds. Unwind the flame and the Cup!', 140, { chapter: 'Four minutes', fx: 'windup' }),
      { at: 1660, kind: 'story', fx: 'ringshut', say: 'Two bright sparks fly off the ring. One to Melbourne, 1956. One across the ocean, to Newport, 1983. The ring goes quiet. The knot is undone.' },
      { at: 1700, kind: 'story', fx: 'cheer', spatial: 'crowdwave', say: 'And up the waterfall, the cauldron starts to rise again. It climbs to the top of the stadium and settles there, blazing. The crowd goes bonkers.' },
      dash(1760, 60, 'tr-nell', 'Victory lap! Pick it up for 60 seconds. One more lap of honour, for all of history!', 120, { chapter: 'Lap of honour', fx: 'brassfanfare' }),
      { at: 1850, kind: 'story', if: 'together', who: 'tr-vane', say: '[sighs] Thank you, for running with me. I think I will open my collection to the public. Free entry. Under supervision.' },
      { at: 1851, kind: 'story', unless: 'together', who: 'tr-vane', say: '[sighs] You did it without me, and you were right to. I will open my collection to the public. Free entry. Under supervision.' },
      { at: 1900, kind: 'story', who: 'tr-hattie', say: '[laughs] Very strict supervision. You are on washing up duty at the lab for a year, Sterling.' },
      { at: 1940, kind: 'steady', seconds: 180, chapter: 'Home time', say: 'Fireworks bloom over Homebush. Cool down now with a gentle jog or a walk. The window is closing, softly this time.' },
      { at: 1990, kind: 'story', who: 'tr-nell', say: '[sighs] I have to go home now, don’t I? Will Mum even know I was gone?' },
      { at: 2030, kind: 'story', who: 'tr-hattie', say: 'You will land one second after you left, Nell. With flour on your boots. Maybe hide the lanyard Priya gave you.' },
      { at: 2065, kind: 'story', who: 'tr-nell', say: 'Runner. Thank you. When you are out on a quiet morning run, think of me. I will be at the creek. Running.' },
      { at: 2095, kind: 'finale', who: 'tr-hattie', fx: 'ringshut', say: 'Time Runners is complete. History is safe, Nell is home, and the watch is finally asleep. Probably. Thank you, Runner.' },
    ],
  },
]

export const CHAIN = ['timerunners-gold', 'timerunners-bridge', 'timerunners-torch', 'timerunners-keel', 'timerunners-circle']

export const CAST = {
  'timerunners-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.85, rate: 0.98 }, // Peter Michael
  'tr-hattie': { name: 'Dr Hattie Quill', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 1.15, rate: 1.1, radio: true }, // Amelia, over the watch
  'tr-nell': { name: 'Nell', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.3, rate: 1.08 }, // Milly
  'tr-vane': { name: 'Sterling Vane', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.9, rate: 1.04 }, // Scotty
  'tr-maggie': { name: 'Maggie Cassidy', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.95, rate: 0.98 }, // Julieanne
  'tr-lennie': { name: 'Lennie Platt', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 1.0 }, // Jimbo
  'tr-clem': { name: 'Clem Hartley', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.85, rate: 1.02, radio: true }, // Lee, on the wireless
  'tr-bec': { name: 'Bec', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.0, rate: 1.02 }, // Eva
  'tr-priya': { name: 'Priya', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.05, rate: 1.04 }, // Emily
}

export const LOOK = { accent: '#FFC83D', deep: '#160F03', tag: 'Time travel adventure' }

export const LIBRARY = {
  ambience: {
    goldfield: 'A busy 1850s gold diggings beside a bush creek in New South Wales: water babbling over stones, picks clinking on rock, wooden cradles rocking and rattling gravel, wind in gum trees, a far off kookaburra, no music, no voices',
    jubilee: 'A huge outdoor crowd at a grand public celebration on a sunny day: the low roar of thousands of people with no words you can make out, swells of cheering and clapping, flags flapping in the breeze, no music, no voices',
    regatta: 'Out on open water during a big yacht race: waves slapping a hull, a strong sea breeze, sails flapping and ropes creaking, rigging clinking on a mast, gulls far off, spectator boat engines in the distance, no music, no voices',
  },
  sfx: {
    'brass-band-pass': { prompt: 'A small brass marching band playing a cheerful march as it parades past along a street, tuba, cornets and a bass drum, approaching and then fading away', seconds: 8 },
    'crowd-wave': { prompt: 'A huge stadium crowd cheering in a rolling wave that sweeps around the stands from one side to the other, then settles', seconds: 6 },
  },
  tracks: {
    'time-runners-chase': {
      title: 'Against the Clock',
      prompt: 'Original cinematic adventure chase instrumental. Ticking clock percussion, galloping strings, bold brass fanfares, shimmering bells and swirling harp runs, heroic and urgent, about 140 bpm. No vocals.',
      seconds: 90,
    },
  },
  chase: 'time-runners-chase',
}
