// The silly lines the Story Maker shows while it looks around and writes, so
// the wait feels like a busy writers' room. Each starts with a plain line,
// then the rest in a shuffled order. No dashes, kind jokes only.

export const QUIPS = {
  look: {
    first: 'Looking for landmarks near you',
    rest: [
      'Asking the local magpies for directions',
      'Reading every plaque within 5 km',
      'Checking which parks have the good benches',
      'Trading a chip with a seagull for local gossip',
      'Measuring the hills. They are bigger than they look',
      'Digging through the library for old stories',
      'Counting the trees. Then counting them again',
      'Finding out which bridge has the best view',
      'Asking a kookaburra what is so funny',
      'Checking the footpaths for good puddle jumps',
      'Reading the fine print on the park signs',
      'Looking for statues with interesting hats',
      'Mapping every bubbler in the area',
      'Interviewing a very chatty ibis',
      'Spotting which lookouts are worth the climb',
      'Finding the oldest building on the block',
      'Checking where the sausage sizzle usually sets up',
      'Following a possum on its evening rounds',
      'Asking the council for the juicy history',
      'Finding the shortcut only locals know',
    ],
  },
  write: {
    first: 'Writing the script',
    rest: [
      'Casting the characters',
      'Teaching the narrator to whisper dramatically',
      'Hiding a clue behind a bus stop',
      'Arguing with the plot twist. The plot twist is winning',
      'Rehearsing the big entrance',
      'Tuning the dramatic music',
      'Auditioning a cockatoo for a speaking part',
      'Cutting the boring bits',
      'Adding one more cliffhanger. Just one',
      'Checking the hero has comfy shoes',
      'Rewriting the ending. Again',
      'Making the mystery a little more mysterious',
      'Asking the history buff to fact check everything',
      'Giving the villain a slightly better moustache',
      'Writing a twist nobody will see coming',
      'Sharpening the narrator’s best pencil',
      'Hiring a dramatic pause',
      'Choosing the hero’s theme song',
      'Packing snacks for the long chapters',
      'Bribing the plot with a lamington',
      'Practising the spooky whisper. Not too spooky',
      'Telling the sidekick to stop hogging the spotlight',
      'Hiding a riddle in the second chapter',
      'Making the clues just hard enough',
      'Teaching a galah its one line',
      'Sorting out who gets the last Tim Tam',
      'Polishing the cliffhangers until they shine',
      'Moving a landmark into the spotlight',
      'Giving the narrator a cup of tea',
      'Putting the twist where you least expect it',
      'Asking the hills to look extra dramatic',
      'Checking the map twice. Then a third time',
      'Writing the bit where everyone cheers',
      'Deciding if the dog is a hero or a sidekick',
      'Rehearsing the big reveal in the mirror',
      'Making sure nobody gets lost. On purpose, anyway',
      'Adding a dash of mystery. Just a pinch',
      'Saving the best line for the finish',
    ],
  },
  get: {
    first: 'Dusting off the pages',
    rest: [
      'Finding where the hero left off',
      'Waking up the narrator',
      'Warming up the sound effects',
      'Putting the characters back in costume',
      'Checking the landmarks are still where we left them',
      'Finding the bookmark',
      'Reminding the villain of their motive',
      'Untangling the plot threads',
      'Making the narrator a fresh cuppa',
      'Tuning the theme song',
      'Re-reading the last chapter for spoilers',
    ],
  },
}

/** The lines for a wait, plain first, the rest shuffled. Pure when given a random(). */
export function quipsFor(kind, random = Math.random) {
  const q = QUIPS[kind] || QUIPS.write
  const rest = [...q.rest]
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [q.first, ...rest]
}
