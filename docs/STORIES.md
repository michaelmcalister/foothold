# Writing Foothold stories

How a story mission is researched, written and shipped. This is the same
method as the foothold-story-mission skill, kept in the repo so the
scheduled story builder can follow it too.

## From a runner's idea to a story

1. A runner sends a place and a story from "Know a local story?" in the
   mission browser (`/api/story-requests`, kept in `feedback` with kind
   `story`).
2. The owner opens Settings, then Admin (`/app/admin`, `worker/admin.js`),
   reads the idea, adds an optional note and taps "Approve and build". The
   idea's `status` becomes `approved`. Admins are the user ids in
   `ADMIN_USERS` in `wrangler.toml`.
3. The scheduled story builder runs every few hours. It reads approved ideas
   straight from the D1 database (`SELECT id, text, note FROM feedback WHERE
   kind = 'story' AND status = 'approved'`), writes each one as a new series
   with the method below, tests and ships it, then marks it done:
   `UPDATE feedback SET status = 'built', mission = '<first episode id>',
   reviewed_at = <ms> WHERE id = '<id>'`.
4. A runner's words never go into a GitHub issue, a commit or a code
   comment (the repo is public). Use the place and the history from the
   research, never who asked or the "Near" area.

## The method

Foothold (repo michaelmcalister/foothold, live at foothold.michael-0d4.workers.dev, push to main deploys) tells audio stories while people run. Every story follows the same pattern so it sounds and plays like the others. Use this skill for a new series, a new episode in an existing series, or a local history story someone requested.

## 1. Research first (never write facts from memory)

- Pick a real place and a real story: a mystery, a legend, an odd piece of history, a place locals walk past without knowing. Local beats famous.
- Web search and fetch at least two sources (Wikipedia, council local history pages, NSW Environment and Heritage, museum sites, plans of management PDFs). Note dates, numbers and names exactly.
- Collect 6 to 10 checkable facts. Every quiz answer must come from a source. Where sources disagree, use the safer figure or leave it out.
- Find a hook: something surprising (orphan kangaroos on a munitions site, a bell rung by rain in a sealed tunnel, rats hoarding 120,000 objects).
- Write the checked facts, with sources, into the series file's header comment.

## 2. Story rules (house rules)

- Tense, never cruel. Nobody gets hurt in the story. The mystery resolves into something warm or funny (beetroot relish, art students, a drip on a bell, a family photo).
- Real people are only mentioned, never voiced. All speaking characters are invented. Real deaths are mentioned once, with respect, never as entertainment.
- Never send runners anywhere unsafe or off limits (sealed tunnels, wrecks, archives, private land, wildlife). The runner stays on paths and above ground. Wildlife is watched from a distance, never chased.
- Acknowledge Country where it fits (Dharug, Darug, Dharawal), using the checked name and meaning.
- Australian English, short active sentences, no em dashes, en dashes or double hyphens. Avoid the words kill, blood, dead, die, scary, lazy, failed, weak, disappoint, should have, zombie, pathetic. Wrong-answer lines avoid wrong, nope, failed and silly.
- Leave a hook for the next episode (`next`) and recap with `previously`.

## 3. Files and format

A series lives in `src/lib/missions/series/<id>.js` and exports `SAGA, EPISODES, CHAIN, CAST, LOOK, LIBRARY`. Copy the shape of `series/penrith.js`, `bondi.js` or `sydney.js` (pure data, imports nothing). Then:

- add it to `series/index.js` (`SERIES`)
- add a cover `src/lib/missions/covers/<id>.js` exporting `COVER = { saga, draw(m, rand, u, h) }`, using the helpers `h.sky, h.glow, h.stars, h.hill, h.gum, h.runner, h.blur` on a 300 by 375 canvas, and add it to `covers/index.js`
- `LOOK = { accent, deep, tag }` (every saga needs one)
- give each episode `place: { name, lat, lng }` so it shows in Stories near you (`lib/missions/places.js`); older series use `SAGA_PLACES`

SAGA: `{ id, title, blurb, note, narrator: '<id>-narrator', score, isNew: true }`. The score can reuse `deepcover` (noir mystery), `locals` (sunny local) or a kit's own.

Episode: `{ id, episode, previously?, next?, saga, title, series: 'thriller', type: 'surge', minutes, difficulty, blurb, place, loop, early, beats }`.

Beats (seconds from the start, in order):
- `recover` first (at 3, about 200 s) with `scene` and `chapter`: set the place and say "Start with an easy walk or jog."
- `story` lines every 50 to 60 s, with optional `who`, `fx` (a sting), `scene`, `spatial`, `chapter`, `if`/`unless` (choice flags)
- `surge` (via a `surge(at, seconds, who, say, recover, extra)` helper with success, okay and half lines): about 3 or 4 per episode, 30, 30, then 45 s, with 110 to 130 s recovery. The okay line must match /made it|got there|clear|that is what counts/
- `quiz` and `puzzle`: 4 to 6 per episode. Three options, labels 28 characters or fewer; the right and wrong replies both name the right option's label
- one `choice` (two options, each with a `flag` and a `say` line, a `default` and a `timeout` line), followed by two surges, one `if: flag` and one `unless: flag`, then a story line for each branch
- `steady` (about 150 s) with an `easyNudge` line for the middle stretch, and a cool-down steady near the end
- `finale` last; its time must fall within minutes minus 3 to minutes plus 1
- lines 180 characters or fewer; allowed tags only: [whispers] [laughs] [sighs] [excited] [curious] [sarcastic] [mischievously]

CAST: one voice per character within a series, ElevenLabs voice ids only from `creative_list_voices` or ones already in the repo. Phone or radio characters get `radio: true`. Local accents help (Malaysian, Filipino, Australian). Voices already used: Peter Michael oKDz3nEzNfwKIVvUwPs0 (narrator), Julieanne 8WaMCGQzWsKvf7sGPqjE, Jimbo YLbQE9U7P1K6rBNJWNSv, Milly BB9S0ZoOunfdUYSciL2X, Scotty gZR4sGJmJaoBOVzKgZ8j, Emily zMK1eWY5DTw3Jjb8efU8, Amelia nBoLwpO4PAjQaQwVKPI1, Lee abRFZIdN4pvo8ZPmGxHP, Eva rQXSFvSjxR8Agb8vn1VY, Ziggy fjgAVa6FpNYGo4UpjqML, Ruby b8gbDO0ybjX1VA89pBdX, Simon zcIk2xc7SGwlywr4TzZu.

## 4. Sound

- Reuse what exists first: scenes in `audio/soundscape.js` and the kits (`audio/kits/*.js`), stings (squelch, whoosh, found, creak, noirstab, footsteps, steamwhistle, trainhorn, whistle, bellring, sonar, horn, clock, gong, chime, tropicthunder, lanterns), spatial sounds (sydneytrain, lorikeets, kookaburra, magpie, owl, boat, car, chatter, jeepney, calesa, motorbike).
- New sounds go in a kit (`stings, scenes, around, spots, spatial, synth, theme, score`), added to `audio/kits/index.js`. Every scene needs a recorded ambience prompt in the series `LIBRARY.ambience` (ending "no music, no voices" or "no clear words"), and every spatial sound with `recorded` needs a `LIBRARY.sfx` prompt. A chase track is optional (`LIBRARY.tracks` plus `chase`).
- Lines and recordings are made by the server on first play and kept in R2.

## 5. Test, ship, check

1. Add the episodes to `test/locals.test.js` (NEW list, chain checks) or write a series test like `test/twocities.test.js`.
2. `npx vitest run --dir test` (the lint in `test/missions.test.js` and `test/thrillers.test.js` checks lengths, banned words, tags, timing and sounds) and `npm run build`.
3. Render the cover with a tiny vitest that writes `coverSvg(mission)` to the scratchpad, then screenshot it with Playwright and look at it.
4. Commit as Michael McAlister with the session trailers, push to main, and poll `gh api repos/michaelmcalister/foothold/commits/<sha>/check-runs` for "Workers Builds: foothold: completed success".
5. In Chrome on the live site, POST one line per new voice to `/api/tts` ({text, voice: castKey}) and GET each new `/api/audio/ambience|sfx/<id>`. All should be 200. Voices from the ElevenLabs library work by id.
6. Reply briefly: what the story is, the real history it tells, the trivia count, and a Sources list.