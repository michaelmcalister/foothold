// Comment and name filter shared by the Worker and the practice game: trims text, caps length, and turns away links, slurs and abuse.

export const MAX_COMMENT = 280

// Kept short on purpose. Whole words after folding look-alike characters,
// so "Scunthorpe" and "class" are fine.
const WORDS = new Set([
  'cunt', 'cunts', 'bitch', 'bitches', 'whore', 'whores', 'slut', 'sluts', 'wanker', 'wankers', 'dickhead', 'dickheads',
  'fuck', 'fucks', 'fucking', 'fucker', 'fuckers', 'motherfucker', 'fuk', 'fck', 'stfu', 'kys',
  'fag', 'fags', 'tranny', 'trannies', 'chink', 'chinks', 'gook', 'gooks', 'kike', 'kikes', 'coon', 'coons',
  'abo', 'abos', 'boong', 'boongs', 'spic', 'spics', 'wetback', 'raghead', 'towelhead', 'spastic', 'spaz', 'retard', 'retards', 'retarded',
])
// Word starts that are never friendly
const STEMS = ['nigg', 'nigga', 'faggot', 'retard']
// Phrases aimed at a person
const PHRASES = ['kill yourself', 'kill urself', 'go die', 'neck yourself', 'hope you die', 'you suck', 'nobody likes you', 'get cancer']

const FOLD = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' }

/** Lower case, look-alikes folded, letters only, runs of three or more letters squashed to one */
export function fold(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$!|]/g, (c) => FOLD[c] ?? c)
    .replace(/([a-z])\1{2,}/g, '$1')
}

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\s?(\.|\(dot\)|\[dot\])\s?(com|net|org|au|io|ly|co|me|app|xyz|info|biz|gg|tv|link|site|online|shop|ru|cn)\b)/i

/** Squash spaces and drop invisible control characters */
export function tidy(text) {
  return String(text ?? '')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁠-⁤]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check a comment (or a league name). Returns { ok: true, text } with the
 * tidied text, or { ok: false, code, message } with a friendly message.
 */
export function checkText(raw, { max = MAX_COMMENT, min = 1, what = 'comment' } = {}) {
  if (typeof raw !== 'string') return { ok: false, code: 'empty', message: `Write a ${what} first.` }
  const text = tidy(raw)
  if (text.length < min) return { ok: false, code: 'empty', message: min > 1 ? `Make it at least ${min} letters long.` : `Write a ${what} first.` }
  if (text.length > max) return { ok: false, code: 'too_long', message: `Keep it under ${max} characters.` }
  if (LINK.test(text)) return { ok: false, code: 'link', message: 'Links are not allowed here. Say it in words instead.' }
  const f = fold(text)
  const words = f.split(/[^a-z]+/).filter(Boolean)
  const spaced = ' ' + words.join(' ') + ' '
  // Spelt out with spaces or dots between the letters ("c u n t") counts as one word
  const joined = []
  for (const w of words) {
    if (w.length === 1 && joined.length && joined[joined.length - 1].single) joined[joined.length - 1].w += w
    else joined.push({ w, single: w.length === 1 })
  }
  const all = [...words, ...joined.filter((j) => j.single).map((j) => j.w)]
  const rude = all.some((w) => WORDS.has(w) || STEMS.some((s) => w.startsWith(s)))
    || PHRASES.some((p) => spaced.includes(' ' + p + ' '))
  if (rude) return { ok: false, code: 'unkind', message: "That doesn't sound kind. Try saying it another way." }
  return { ok: true, text }
}
