// Lays out a story episode from its lines, so a writer can think about the
// story and not the stopwatch. Each step says what happens next (a story
// line, a quiz, a surge, a choice with its two branches, a steady stretch)
// and compose() gives every beat its time, in the same beat format as the
// hand timed series (signal.js, bondi.js). The newer Australia wide series
// use it. Pure data helpers: imports nothing.
//
// Gaps (seconds until the next beat): a story line 55, a quiz 65, a choice
// 50, a surge its length plus 50 (its recovery keeps running underneath the
// next lines), the opening walk 47, a steady stretch 30 (lines carry on
// over it). minutes is set so the finale lands two thirds of a minute or so
// before the end.

export const line = (who, text) => ({ who, text })

/** A story line. who null is the narrator. */
export const say = (who, text, extra = {}) => ({ step: 'story', who, text, extra })

/**
 * A three way quiz. answers[0] is the right one (it gets shuffled into
 * place). fact follows the answer in the reply: "1907! fact" or "The answer is
 * 1907. fact", so both replies name it.
 */
export const quiz = (who, question, answers, fact, extra = {}) => ({ step: 'quiz', who, question, answers, fact, extra })

/** A surge for the episode's guide: seconds, what they shout. */
export const dash = (seconds, text, extra = {}) => ({ step: 'surge', seconds, text, extra })

/** An easy steady stretch, with a gentle word if you rush it. */
export const steady = (text, extra = {}) => ({ step: 'steady', text, extra })

/**
 * A two way choice and what follows it: one surge and one line per branch.
 * a and b are { label, line, dash, after } (line is the guide's reply,
 * dash the surge call, after the story line once the surge is done).
 */
export const choice = (who, id, question, a, b, timeout) => ({ step: 'choice', who, id, question, a, b, timeout })

const GAP = { story: 55, quiz: 65, surge: 50, choice: 50, steady: 30 }

function shuffle(answers, seed) {
  // a repeatable spot for the right answer, so it isn't always A
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const at = h % 3
  const rest = answers.slice(1)
  const order = [...rest.slice(0, at), answers[0], ...rest.slice(at)]
  return { options: order.map((label, i) => ({ key: 'ABC'[i], label })), answer: 'ABC'[at] }
}

/**
 * The episode: meta (id, episode, saga, title, difficulty, blurb, place,
 * previously, next, loop, early) plus
 *   guide    who calls the surges
 *   results  { success, okay, half } lines for the guide's surges
 *   easy     the gentle "slow down" line for steady stretches
 *   open     { scene, chapter, text }: the opening walk
 *   steps    the story, in order
 *   finale   the last line
 */
export function compose({ guide, results, easy, open, steps, finale, ...meta }) {
  const beats = [{ at: 3, kind: 'recover', seconds: 200, chapter: open.chapter, scene: open.scene, say: open.text }]
  let t = 50
  const surge = (seconds, text, extra) => ({ at: t, kind: 'surge', seconds, who: guide, say: text, recover: seconds >= 45 ? 120 : 110, ...results, ...extra })
  for (const s of steps) {
    if (s.step === 'story') {
      beats.push({ at: t, kind: 'story', ...(s.who ? { who: s.who } : {}), say: s.text, ...s.extra })
      t += GAP.story
    } else if (s.step === 'quiz') {
      const { options, answer } = shuffle(s.answers, s.question)
      const label = s.answers[0]
      beats.push({ at: t, kind: 'quiz', who: s.who, say: s.question, options, answer,
        right: line(s.who, `${label}! ${s.fact}`), wrong: line(s.who, `The answer is ${label}. ${s.fact}`), ...s.extra })
      t += GAP.quiz
    } else if (s.step === 'surge') {
      beats.push(surge(s.seconds, s.text, s.extra))
      t += s.seconds + GAP.surge
    } else if (s.step === 'steady') {
      beats.push({ at: t, kind: 'steady', seconds: 150, say: s.text, easyNudge: easy, ...s.extra })
      t += GAP.steady
    } else if (s.step === 'choice') {
      const flag = s.a.flag || `${s.id}-a`
      beats.push({ at: t, kind: 'choice', id: s.id, who: s.who, say: s.question,
        options: [
          { key: 'A', label: s.a.label, flag, say: line(s.who, s.a.line) },
          { key: 'B', label: s.b.label, flag: s.b.flag || `${s.id}-b`, say: line(s.who, s.b.line) },
        ],
        default: 'A', timeout: line(s.who, s.timeout) })
      t += GAP.choice
      const secs = s.a.seconds || 30
      beats.push(surge(secs, s.a.dash, { if: flag, ...s.a.extra }))
      t += 1
      beats.push(surge(secs, s.b.dash, { unless: flag, ...s.b.extra }))
      t += secs + GAP.surge - 1
      beats.push({ at: t, kind: 'story', if: flag, say: s.a.after })
      beats.push({ at: t + 1, kind: 'story', unless: flag, say: s.b.after })
      t += GAP.story
    }
  }
  beats.push({ at: t, kind: 'finale', say: finale })
  return { series: 'thriller', type: 'surge', minutes: Math.round(t / 60) + 1, ...meta, beats }
}
