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
