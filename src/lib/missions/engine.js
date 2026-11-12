// The mission engine: plays a mission script against a live run. Pure logic,
// no audio or storage. Give it the live numbers (elapsed, distance, pace,
// distance back to the start) and it returns the lines to say and the
// events that happened (a surge starting or ending, a chapter, the finale).
//
// Beats run in order on the mission clock (elapsed time minus pauses). A
// surge holds back every later beat until it ends, and when a beat goes out
// late, the beats after it slide along so the spacing stays the same. Lines
// are never closer together than MIN_GAP seconds.
//
// Some beats ask something: a choice (which way the story goes), a quiz or a
// puzzle. The story waits up to ASK_WAIT_S for an answer (tap one on screen),
// then answers for you, so you never have to stop. Beats with `if: flag` or
// `unless: flag` play only when a choice set (or didn't set) that flag.
//
// A surge succeeds when your speed over it is at least 10% higher than
// your speed over the 90 seconds before it. Either way the line is kind.

export const MIN_GAP = 15 // seconds between mission lines
export const SURGE_GAIN = 1.1 // speed over the surge against speed before it
export const PRE_WINDOW_S = 90 // how far back "your pace before it" looks
export const LOOP_AFTER_M = 1000
export const LOOP_NEAR_M = 150
const SURGE_CAP_S = 240 // a metre surge never runs longer than this
const STEADY_QUICK_S = 15 // this much quicker than easy pace gets a gentle word

const segmentKinds = ['surge', 'steady', 'recover']
const askKinds = ['choice', 'quiz', 'puzzle']
export const ASK_WAIT_S = 30
export const BRISK_GAP = 18 // seconds from an answer to the next beat in a brisk show
export const BRISK_PAUSE = 6 // seconds of air after a line ends, in a brisk show
export const BRISK_MIN = 3
/** About how long a line takes to say (a brisk show waits for it to finish). */
export const lineSeconds = (text) => Math.max(1.5, String(text || '').replace(/\[[^\]]*\]/g, '').length / 14)
export const CLIMB_STEP = 6 // metres: phone GPS heights wobble by a few metres even after smoothing // how long a question waits before the story answers for you

/** The words of a line, without performance cues like [whispers]. */
export const lineText = (line) => String((typeof line === 'string' ? line : line?.text) || '').replace(/\[[^\]]*\]\s*/g, '').replace(/\s+/g, ' ').trim()

/** How many surges a script has. */
export const surgeCount = (script) => script.beats.filter((b) => b.kind === 'surge').length

/**
 * script: a mission from scripts.js. paces: trainingPaces() ranges, used to
 * judge steady stretches and as a fallback "pace before" for surges.
 */
export function createMission(script, { paces = null } = {}) {
  const easy = paces?.easy || [390, 430]
  const st = {
    started: false,
    base: 0, // elapsed at the first update
    pausedGap: 0,
    paused: false,
    pausedAtElapsed: null,
    distBase: 0,
    distGap: 0,
    pausedAtDist: null,
    clock: 0,
    dist: 0,
    next: 0, // index of the next beat
    shift: 0, // seconds the timeline has slid
    lastLineAt: -Infinity,
    lastLineS: 0, // about how long the last line takes to say
    seg: null, // the active surge, steady or recover stretch
    chapter: script.beats.find((b) => b.chapter)?.chapter || null,
    samples: [], // [clock, dist] for the pace before a surge
    loopSaid: false,
    loopPending: false,
    done: false,
    finished: false,
    surgesDone: 0,
    surgesWon: 0,
    closing: null,
    ask: null, // a question waiting for an answer: { beat, at }
    flags: new Set(), // choices made, for the beats that depend on them
    fired: new Set(), // beats that have played (group runs check this before changing a choice)
    choices: [], // [{ id, key, label, timedOut }]
    quizRight: 0,
    quizTotal: 0,
    score: 0, // game show points
    climbBase: null, // the lowest height since the last bit of climbing counted
    climbM: 0, // metres climbed (game show hill bonus)
    climbSaidAt: 0, // metres climbed at the last hill bonus line
    hillLine: 0,
  }
  const total = surgeCount(script)

  // A brisk show (the game show) only waits for the last line to finish
  // (estimated from its length), not the usual MIN_GAP
  const canSpeak = () => st.clock - st.lastLineAt >= (script.brisk ? Math.max(BRISK_MIN, st.lastLineS + 1) : MIN_GAP)

  function distSince(clock) {
    // distance covered since the given clock time, from the samples
    let d0 = null
    for (let i = st.samples.length - 1; i >= 0; i--) {
      if (st.samples[i][0] <= clock) { d0 = st.samples[i][1]; break }
    }
    if (d0 == null) d0 = st.samples.length ? st.samples[0][1] : st.dist
    return st.dist - d0
  }

  function paceBefore() {
    const from = Math.max(0, st.clock - PRE_WINDOW_S)
    const d = distSince(from)
    const t = st.clock - (st.samples.find((s) => s[0] >= from)?.[0] ?? st.clock)
    if (d >= 50 && t >= 20) return t / (d / 1000)
    return easy[1] // not enough to go on: assume an easy pace
  }

  function startSegment(beat, out) {
    if (st.seg) endSegment(out, { quiet: true })
    const seg = { kind: beat.kind, beat, at: st.clock, dist: st.dist, seconds: beat.seconds || null, metres: beat.metres || null, halfSaid: false, tenSaid: false, nudged: false }
    if (beat.kind === 'surge') seg.before = paceBefore()
    st.seg = seg
    out.events.push({ type: `${beat.kind}-start`, seconds: seg.seconds, metres: seg.metres })
  }

  function endSegment(out, { quiet = false } = {}) {
    const seg = st.seg
    st.seg = null
    if (!seg) return
    if (seg.kind === 'surge') {
      const t = st.clock - seg.at
      const d = st.dist - seg.dist
      const paceS = d >= 20 && t > 0 ? t / (d / 1000) : null
      const result = paceS && paceS * SURGE_GAIN <= seg.before ? 'success' : 'okay'
      st.surgesDone++
      if (result === 'success') st.surgesWon++
      // game show sprints: the quicker you go, the more it's worth (10% up is full points, 20% up is double)
      let points = 0
      if (seg.beat.points) {
        const lift = paceS ? seg.before / paceS - 1 : 0
        points = Math.round((seg.beat.points * Math.min(2, Math.max(0.3, lift / 0.1))) / 100) * 100
        st.score += points
      }
      out.events.push({ type: 'surge-end', result, paceS: paceS && Math.round(paceS), beforeS: Math.round(seg.before), points, score: st.score })
      if (!quiet) say(out, result === 'success' ? seg.beat.success : seg.beat.okay, seg.beat.who)
      if (seg.beat.recover) {
        st.seg = { kind: 'recover', beat: { kind: 'recover' }, at: st.clock, dist: st.dist, seconds: seg.beat.recover, metres: null }
        out.events.push({ type: 'recover-start', seconds: seg.beat.recover })
      }
      return
    }
    out.events.push({ type: `${seg.kind}-end` })
    if (!quiet && seg.beat.done) say(out, seg.beat.done, seg.beat.who)
  }

  // A line is plain text, or { who, text } for the cast missions. Lines with
  // a speaker or a sound to go with them go out as { text, who, fx }.
  function say(out, line, who = null, fx = null) {
    // a line can be worked out from the game so far ("You finished on 5,400 points.")
    if (typeof line === 'function') line = line({ score: st.score, right: st.quizRight, total: st.quizTotal })
    const text = typeof line === 'string' ? line : line?.text
    if (!text) return
    const speaker = (typeof line === 'object' && line.who) || who
    out.lines.push(speaker || fx ? { text, who: speaker || null, fx: fx || null } : text)
    st.lastLineAt = st.clock
    st.lastLineS = lineSeconds(text) + (fx ? 2 : 0)
  }

  function segmentOver(seg) {
    const t = st.clock - seg.at
    if (seg.metres) return st.dist - seg.dist >= seg.metres || t >= SURGE_CAP_S
    return t >= seg.seconds
  }

  // Climbing (game show hill bonus): heights come in smoothed, and only a
  // rise of CLIMB_STEP metres or more from the last reference counts (the
  // reference follows you down too), so GPS wobble on the flat earns nothing
  function climb(alt, out) {
    if (st.climbBase == null) { st.climbBase = alt; return }
    if (alt <= st.climbBase - CLIMB_STEP) { st.climbBase = alt; return }
    const up = alt - st.climbBase
    if (up < CLIMB_STEP) return
    st.climbM += up
    st.climbBase = alt
    const pts = Math.round(up * script.climbPoints)
    st.score += pts
    out.events.push({ type: 'climb', metres: Math.round(up), points: pts, score: st.score })
    // a word from the host every 10 m or so, when nothing else is talking
    if ((script.hillLines || []).length && st.climbM - st.climbSaidAt >= 10) { st.climbSaidAt = st.climbM; st.hillPending = true }
  }

  function applies(beat) {
    if (beat.if && !st.flags.has(beat.if)) return false
    if (beat.unless && st.flags.has(beat.unless)) return false
    return true
  }

  // An answer to the question on screen (key), or null when time ran out
  function resolve(out, key) {
    const beat = st.ask.beat
    st.askedAt = st.ask.at
    st.ask = null
    // a brisk show (the game show) moves straight on after an answer: the next
    // beat comes BRISK_GAP seconds later, not at its usual time
    if (script.brisk) {
      let n = st.next
      while (script.beats[n] && !applies(script.beats[n])) n++
      const next = script.beats[n]
      if (next && next.at + st.shift > st.clock + BRISK_GAP) st.shift = st.clock + BRISK_GAP - next.at
    }
    const opt = beat.options.find((o) => o.key === key) || null
    if (beat.kind === 'choice') {
      const pick = opt || beat.options.find((o) => o.key === beat.default) || beat.options[0]
      if (pick.flag) st.flags.add(pick.flag)
      st.choices.push({ id: beat.id || String(beat.at), key: pick.key, label: pick.label, timedOut: !opt })
      out.events.push({ type: 'answer', kind: 'choice', key: pick.key, timedOut: !opt })
      // out of time: the timeout line says what happens; otherwise the pick's own line
      say(out, !opt && beat.timeout ? beat.timeout : pick.say, beat.who)
      return
    }
    // a quiz or puzzle
    st.quizTotal++
    const right = !!opt && opt.key === beat.answer
    if (right) st.quizRight++
    // game show points: quicker answers are worth more (half for a slow one)
    let points = 0
    if (right && beat.points) {
      const left = Math.max(0, (beat.wait || ASK_WAIT_S) - (st.clock - st.askedAt))
      points = Math.round((beat.points * (0.5 + 0.5 * left / (beat.wait || ASK_WAIT_S))) / 100) * 100
      st.score += points
    }
    if (right && beat.flag) st.flags.add(beat.flag)
    out.events.push({ type: 'answer', kind: beat.kind, key: opt?.key || null, right, timedOut: !opt, points, score: st.score })
    say(out, right ? beat.right : beat.wrong, beat.who)
  }

  function release(beat, out) {
    st.shift = Math.max(st.shift, st.clock - beat.at)
    if (beat.chapter) {
      st.chapter = beat.chapter
      out.events.push({ type: 'chapter', chapter: beat.chapter })
    }
    if (beat.scene) out.events.push({ type: 'scene', scene: beat.scene })
    if (beat.spatial) out.events.push({ type: 'spatial', name: beat.spatial })
    say(out, beat.say, beat.who, beat.fx)
    if (segmentKinds.includes(beat.kind)) startSegment(beat, out)
    if (askKinds.includes(beat.kind)) {
      st.ask = { beat, at: st.clock }
      out.events.push({ type: 'ask', kind: beat.kind })
    }
    if (beat.kind === 'finale') {
      if (st.seg) endSegment(out, { quiet: true })
      st.done = true
      st.closing = lineText(typeof beat.say === 'function' ? beat.say({ score: st.score, right: st.quizRight, total: st.quizTotal }) : beat.say)
      out.events.push({ type: 'finale' })
    }
  }

  function step(out) {
    // the active stretch first
    const seg = st.seg
    if (seg) {
      if (segmentOver(seg)) {
        // a stretch with a closing line waits for the gap (at most MIN_GAP seconds)
        const hasLine = seg.kind === 'surge' ? !!(seg.beat.success || seg.beat.okay) : !!seg.beat.done
        if (!hasLine || canSpeak()) endSegment(out)
        return
      }
      if (seg.kind === 'surge' && seg.beat.half && !seg.halfSaid && canSpeak()) {
        const half = seg.metres ? st.dist - seg.dist >= seg.metres / 2 : st.clock - seg.at >= seg.seconds / 2
        if (half) { seg.halfSaid = true; say(out, seg.beat.half, seg.beat.who); return }
      }
      // "Ten seconds!": the call that starts the countdown (too late to be useful under 7)
      if (seg.kind === 'surge' && seg.beat.ten && !seg.tenSaid && seg.seconds && !seg.metres) {
        const left = seg.seconds - (st.clock - seg.at)
        if (left <= 11 && left < 7) seg.tenSaid = true
        else if (left <= 11 && canSpeak()) { seg.tenSaid = true; say(out, seg.beat.ten, seg.beat.who); return }
      }
      if (seg.kind === 'steady' && seg.beat.easyNudge && !seg.nudged && st.clock - seg.at >= 60 && canSpeak()) {
        const d = distSince(st.clock - 60)
        if (d > 50 && 60 / (d / 1000) < easy[0] - STEADY_QUICK_S) { seg.nudged = true; say(out, seg.beat.easyNudge, seg.beat.who); return }
      }
      if (seg.kind === 'surge') return // nothing else talks over a surge
    }

    // a word from the host about the hill you just climbed, when there's a gap
    if (st.hillPending && canSpeak() && !st.ask) {
      st.hillPending = false
      say(out, script.hillLines[st.hillLine++ % script.hillLines.length], script.host || null)
      return
    }

    // the loop beat, once, when it fits
    if (script.loop && !st.loopSaid && st.dist >= LOOP_AFTER_M && st.toStart != null && st.toStart < LOOP_NEAR_M) st.loopPending = true
    if (st.loopPending && (st.toStart == null || st.toStart >= LOOP_NEAR_M * 2)) st.loopPending = false
    if (st.loopPending && canSpeak()) {
      st.loopPending = false
      st.loopSaid = true
      say(out, script.loop)
      out.events.push({ type: 'loop' })
      return
    }

    // a question waiting for an answer holds the story; after a while the story answers for you
    if (st.ask) {
      if (st.clock - st.ask.at >= (st.ask.beat.wait || ASK_WAIT_S) && canSpeak()) resolve(out, null)
      return
    }

    if (st.done) return
    // beats that depend on a choice you didn't make are skipped quietly
    while (script.beats[st.next] && !applies(script.beats[st.next])) st.next++
    const beat = script.beats[st.next]
    // a brisk show keeps moving: the next beat comes BRISK_PAUSE seconds after the last line ends
    if (beat && script.brisk && st.lastLineAt > -Infinity) {
      const soonest = st.lastLineAt + st.lastLineS + BRISK_PAUSE
      if (beat.at + st.shift > soonest) st.shift = soonest - beat.at
    }
    if (!beat || st.clock < beat.at + st.shift) return
    if (beat.say && !canSpeak()) return
    if (beat.kind === 'surge' && st.seg?.kind === 'recover' && !st.seg.beat.say) return // a surge's own recovery always runs in full
    st.next++
    st.fired.add(beat)
    release(beat, out)
  }

  return {
    script,

    update({ elapsedS = 0, distanceM = 0, toStartM = null, altM = null } = {}) {
      const out = { lines: [], events: [] }
      if (st.finished) return out
      if (!st.started) {
        st.started = true
        st.base = elapsedS
        st.distBase = distanceM
      }
      if (st.paused) return out
      if (st.pausedAtElapsed != null) {
        // first update after a resume: anything that moved while paused doesn't count
        st.pausedGap += Math.max(0, elapsedS - st.pausedAtElapsed)
        st.distGap += Math.max(0, distanceM - st.pausedAtDist)
        st.pausedAtElapsed = null
      }
      const clock = elapsedS - st.base - st.pausedGap
      if (clock < st.clock) return out // never run backwards
      st.clock = clock
      st.dist = Math.max(0, distanceM - st.distBase - st.distGap)
      st.toStart = toStartM
      if (script.climbPoints && Number.isFinite(altM)) climb(altM, out)
      st.samples.push([st.clock, st.dist])
      while (st.samples.length > 2 && st.samples[0][0] < st.clock - PRE_WINDOW_S - 30) st.samples.shift()
      step(out)
      return out
    },

    /** Answer the question on screen with an option's key. Returns { lines, events }. */
    answer(key) {
      const out = { lines: [], events: [] }
      if (!st.ask || st.finished) return out
      if (!st.ask.beat.options.some((o) => o.key === key)) return out
      st.lastLineAt = -Infinity // an answer is always heard straight away
      resolve(out, key)
      return out
    },

    /**
     * Group runs: the crew voted another way. Swap this choice's flag for the
     * other option's, so the branch that follows is the crew's. Returns the
     * new option, or null if it's too late or nothing changed.
     */
    overrideChoice(choiceId, key) {
      const beat = script.beats.find((b) => b.kind === 'choice' && (b.id || String(b.at)) === choiceId)
      const made = st.choices.find((c) => c.id === choiceId)
      const opt = beat?.options.find((o) => o.key === key)
      if (!beat || !made || !opt || made.key === key) return null
      // too late if a beat that depends on this choice has already played
      const flags = beat.options.map((o) => o.flag).filter(Boolean)
      const depends = (b) => flags.includes(b.if) || flags.includes(b.unless)
      if (script.beats.some((b) => depends(b) && st.fired.has(b))) return null
      const first = script.beats.findIndex(depends)
      if (first >= 0 && script.beats.slice(first).some((b) => st.fired.has(b))) return null // the story has moved on
      for (const f of flags) st.flags.delete(f)
      if (opt.flag) st.flags.add(opt.flag)
      // beats skipped for the old choice may now apply: look again from the first that depends on it
      if (first >= 0 && first < st.next) st.next = first
      made.key = opt.key
      made.label = opt.label
      return opt
    },

    pause({ elapsedS, distanceM } = {}) {
      if (st.paused || st.finished) return
      st.paused = true
      st.pausedAtElapsed = elapsedS ?? st.base + st.pausedGap + st.clock
      st.pausedAtDist = distanceM ?? st.distBase + st.distGap + st.dist
    },
    resume() {
      st.paused = false
    },

    /** Finishing the run. Returns the closing line (kind, even when early) and the summary. */
    finish() {
      const out = { lines: [], events: [] }
      if (st.finished) return { ...out, summary: this.summary() }
      st.ask = null
      if (st.seg?.kind === 'surge') endSegment(out, { quiet: true })
      else if (st.seg) st.seg = null
      if (!st.done) {
        st.closing = lineText(script.early)
        const e = script.early
        out.lines.push(typeof e === 'string' ? e : { text: e.text, who: e.who || null, fx: null })
        out.events.push({ type: 'early' })
      }
      st.finished = true
      return { ...out, summary: this.summary() }
    },

    /** What the mission strip on the Record screen shows. */
    view() {
      const seg = st.seg
      let remainingS = null, remainingM = null, progress = null
      if (seg) {
        if (seg.metres) {
          remainingM = Math.max(0, Math.round(seg.metres - (st.dist - seg.dist)))
          progress = Math.min(1, (st.dist - seg.dist) / seg.metres)
        } else {
          remainingS = Math.max(0, Math.ceil(seg.seconds - (st.clock - seg.at)))
          progress = Math.min(1, (st.clock - seg.at) / seg.seconds)
        }
      }
      return {
        id: script.id,
        title: script.title,
        chapter: st.chapter,
        kind: seg?.kind || null,
        clock: !!seg?.beat?.clock, // a game show ad break: tick through it
        remainingS,
        remainingM,
        progress,
        surgesDone: st.surgesDone,
        surgesWon: st.surgesWon,
        surgesTotal: total,
        paused: st.paused,
        done: st.done,
        ask: st.ask ? {
          kind: st.ask.beat.kind,
          question: lineText(st.ask.beat.ask || st.ask.beat.say),
          options: st.ask.beat.options.map((o) => ({ key: o.key, label: o.label })),
          remainingS: Math.max(0, Math.ceil((st.ask.beat.wait || ASK_WAIT_S) - (st.clock - st.ask.at))),
          waitS: st.ask.beat.wait || ASK_WAIT_S,
        } : null,
        score: script.scored ? st.score : null,
        climbM: script.climbPoints ? Math.round(st.climbM) : null,
      }
    },

    summary() {
      return {
        id: script.id,
        title: script.title,
        completed: st.done,
        surgesDone: st.surgesDone,
        surgesWon: st.surgesWon,
        surgesTotal: total,
        closing: st.closing,
        clockS: Math.round(st.clock),
        choices: st.choices.slice(),
        quizRight: st.quizRight,
        quizTotal: st.quizTotal,
        score: script.scored ? st.score : null,
      }
    },
  }
}
