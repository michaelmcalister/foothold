// Friendly comments the practice rivals leave on your activities in the in-browser game.

export const PRACTICE_LINES = [
  'Good on ya, that was a ripper of a loop.',
  'Nice work out there today. See you on the streets.',
  'Solid effort. I will have to lift my game.',
  'Love that route. Might borrow it this weekend.',
  'Great to see you out. Enjoy the rest of your day.',
  'That is a beauty of a loop. Nice one.',
  'You are flying this week. Keep it up, legend.',
  'Top effort. Hope the legs feel good tomorrow.',
  'Lovely day for it. Well done.',
  'Cheers for the company out there, even from afar.',
  'Fair dinkum, that was a big one. Good stuff.',
  'Onya! Your patch is looking strong.',
]

/**
 * Which practice comments an activity gets, decided once from a seeded
 * random number source. Comments only show once their time has come.
 */
export function practiceCommentsFor(activity, rivals, rand) {
  const roll = rand()
  const n = roll < 0.45 ? 0 : roll < 0.85 ? 1 : 2
  const end = activity.startedAt + (activity.durationS || 0) * 1000
  const out = []
  const used = new Set()
  for (let i = 0; i < n && rivals.length; i++) {
    const who = rivals[Math.floor(rand() * rivals.length)]
    let line = PRACTICE_LINES[Math.floor(rand() * PRACTICE_LINES.length)]
    if (used.has(line)) line = PRACTICE_LINES[(PRACTICE_LINES.indexOf(line) + 1) % PRACTICE_LINES.length]
    used.add(line)
    out.push({ userId: who.id, text: line, at: Math.round(end + (15 + rand() * 165) * 60000 * (i + 1)) })
  }
  return out
}
