# Foothold API contract

The app talks to this API through `src/lib/api/index.js`. Two adapters
implement it with identical shapes:

- `src/lib/api/remote.js` calls the Cloudflare Worker (`worker/`) when
  `VITE_API_URL` is set (or the app is served by the Worker itself).
- `src/lib/api/local.js` runs the same engine in the browser with
  IndexedDB storage and a demo world of rival players, so the app is fully
  playable on GitHub Pages without a server.

All bodies are JSON. Times are epoch milliseconds. Distances in metres.
Errors: `{ error: "Plain English message", code?: "short_code" }` with a 4xx/5xx status.

## Auth

`Authorization: Bearer <Auth0 access token>`. Same Auth0 tenant as
FormTrack, so one account signs in to both. For local development only,
`X-Device-Id: <uuid>` is accepted when the Worker has `ALLOW_DEVICE_IDS=1`.

## Types

```
User      { id, name, colour, crest: string|null, units: 'metric', mode: 'run'|'walk'|'ride',
            zones: [{ lat, lng, radiusM, label }], clubId, createdAt, seasonSeen: string|null,
            formtrack: { linked: boolean, linkedAt } }
Point     { lat, lng, t, alt?, acc?, hr?, cad? }
Activity  { id, userId, mode, source: 'phone'|'watch'|'import', startedAt,
            distanceM, durationS, movingS, paceSPerKm, elevGainM,
            loops, gain, claimed, reinforced, taken, held,
            trust, flags: [{ type, message }], rejected, rejectReason,
            appeal?: { note, status: 'open'|'upheld'|'declined' }, kudos, comments,
            bests: { [key]: seconds, longest?: metres } | null,
            feel: 1|2|3|4|5|'hurt'|null, hurt: { area, level } | null, checkinAt: number|null }
            (feel, hurt and checkinAt: your own activities only. feel 1 easy, 2 comfortable,
            3 hard work, 4 very hard, 5 all out; area foot|shin|calf|knee|hip|hamstring|back|other;
            level niggle|sore|hurt. checkinAt with a null feel means the prompt was dismissed)
Cell      { h3, owner, ownerName, ownerColour, ownerCrest, mine, strength, daysToWild,
            flips, heat, lastFlip }   (flips: times taken; heat: recent flips, 0 after 30 quiet days)
Best      { key, label, kind: 'time'|'dist', value, activityId, at }
            (value is seconds, or metres for kind 'dist'; keys: run and walk
            400m, 1k, mile, 5k, 10k, half, marathon; ride 10k, 20k, 40k, longest)
PR        { key, label, kind, value, prev }   (prev null on a first record)
Stronghold { id, name, mode, line (encoded polyline), start: {lat,lng},
            centre: {lat,lng}, distanceM,
            holder: { userId, name, colour, efforts, me } | null,
            mine: { efforts, bestS, holds, toCrown } }
StrongholdRun { id, name, elapsedS, efforts, holds, toCrown, tookFrom,
            holderName, message }
Comment   { id, userId, name, colour, text, at, mine, canDelete }
Rival     { userId, name, colour, crest (emblem id or null), swaps, tookFromThem, tookFromYou,
            record: { won, lost, draws }, battle: Battle|null, lastActive, hexes }
League    { id, name, code, members, mine, createdByMe, createdAt }
Battle    { id, attacker, defender, attackerName, defenderName, attackerColour, defenderColour,
            attackerCrest, defenderCrest, hexes: [h3],
            startedAt, endsAt, endedAt?, winner?,
            score: { attacker, defender, leader } }
Route     { id, name, mode, ring: [[lng, lat], ...], distanceM, plannedAt: number|null, createdAt, updatedAt }
            (a planned route; a closed loop's ring ends where it starts; private to its owner;
            plannedAt: the day and time it's planned for, null when none)
Crew      { id, name, colour, crest }   (someone in your club or one of your private leagues, never you)
SharedRoute { id (the share's id), route: { name, mode, ring, distanceM },
            from: { id, name, colour, crest }, plannedAt: number|null, sharedAt }
            (a copy taken when it was sent: the sender's later edits or delete don't change it)
Week      { key: 'YYYY-MM-DD' (its Monday), start, end }   Monday to Sunday, Sydney time
Quest     { id, kind: 'take'|'loops'|'outings'|'explore'|'newground'|'hold'|'takeback'|'raid',
            title, detail, target, count, progress, done, pending }
            (pending: a hold quest still waiting for the week to end)
Recap     { week: { key, start, end, current, previous }, distanceM, movingS, outings,
            byMode, loops, hexes: { taken, fromRivals, held, lost, lostToRivals, faded },
            explored, quests: Quest[], questsDone, biggestLoop: { activityId, hexes, mode,
            startedAt, distanceM } | null, best: { activityId, text } | null,
            last: { key, distanceM, movingS, outings }, compare, visited: [h3] (max 3000) }
Tier      { index: 0..5, id, name, next: { index, id, name } | null }   Scout, Pathfinder, Ranger, Warden, Sentinel, Marshal
Season    { id: '2026-12', key: 'summer'|'autumn'|'winter'|'spring', name: 'Summer 2026/27',
            label: 'Summer season, Dec to Feb', span: 'Dec to Feb', startsAt, endsAt, daysLeft }
```

Crests are the ids in `src/lib/crests.js` (`chevron`, `star`, `wave`, ...).
`crest: null` means the app draws a default picked from the player id.

## Routes

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | /api/config | (no sign-in needed) | `{ auth0: { domain, clientId, audience } }` when Auth0 is set up, else `{}` |
| POST | /api/tts | `{ text, voice? }` (no sign-in needed; max 300 characters; voice is a coach voice key from `/api/config` `tts.voices`, or a story character key from `src/lib/missions/cast.js`, read with the expressive `eleven_v3` model) | `audio/mpeg` (cached by voice and text; 503 when the voice isn't set up, 429 when an address asks for too many new lines) |
| POST | /api/route | `{ mode: 'run' \| 'walk' \| 'ride', points: [[lng, lat], ...], steps?: true }` (no sign-in needed; 2 to 25 points, each within 20 km of the last) | `{ line: [[lng, lat], ...], distanceM, provider, steps? }` (with `steps`, turn by turn `[{ turn, name, distanceM, at: [lng, lat] }]` in the same shape from every router) the path through the points along paths you can use (cached; 422 `no_path` when there's no path or it needs a ferry, 429 when an address asks for too many fresh lookups, 502 when the service fails) |
| POST | /api/elevation | `{ grid: 0.001 \| 0.002 \| 0.004, nodes: [[lat, lng]] }` (no sign-in needed; up to 1000 nodes, each on the grid, never route points) | `{ elev: number[] }` terrain heights in metres, one per node (cached by batch; 400 when a node is off the grid, 429 when an address asks for too many fresh lookups, 502 when the lookup fails) |
| GET | /api/me | | `{ user }` |
| PUT | /api/me | `{ name?, colour?, crest?, mode?, zones?, seasonSeen?, foundingAt? }` (`foundingAt`: when the Founding foothold badge was earned; set once, never moved or cleared) | `{ user }` (user has `foundingAt`, null until earned) |
| POST | /api/activities | `{ mode, source, startedAt, points: Point[] }` | `{ activity, diff: { claimed: h3[], reinforced: h3[], taken: [{h3, from}], held: [{h3, owner}] }, battles: Battle[], hexesBefore, hexesAfter, load }` |
| GET | /api/activities | `?limit=50` | `{ activities: Activity[] }` |
| GET | /api/activities/:id | | `{ activity, track: Point[], hills: [{ id, name, seconds, rank, tookCrown, holds }] }` (owner gets full track, others the public track; `hills` are the hills climbed in it, see King of the hill below, empty until they're worked out just after saving) |
| POST | /api/activities/:id/appeal | `{ note }` | `{ activity }` |
| POST | /api/activities/:id/checkin | `{ feel, hurt?: { area, level } }` or `{ dismissed: true }` | `{ activity }` (yours only; answering again replaces it) |
| GET | /api/territory | `?mode=run&bbox=w,s,e,n` | `{ cells: Cell[] }` (others' private hexes left out; max 5000) |
| GET | /api/stats | `?mode=run` | `{ hexes, km2, level, next, toNext, weekKm: number[5], streakWeeks, fadingSoon: number }` |
| GET | /api/leaderboard | `?mode=run&scope=local|world|club&board=all|season&lat&lng` | `{ rows: [{ userId, name, colour, crest, hexes, km2, me }], season: Season }`; with `board=season` rows are `{ userId, name, colour, crest, gained, me }`, ranked by hexes claimed or taken this season |
| GET | /api/season | | `{ season: Season, previous: { season, gained, rank, players, badge: { id, name, min } } \| null, showSummary }` (previous counts every map; `showSummary` is true once, early in a season, until `seasonSeen` is set to this season's id) |
| GET | /api/battles | | `{ live: Battle[], past: Battle[] }` |
| GET | /api/rivals | `?mode=run` | `{ rivals: Rival[], you: { hexes }, days: 30 }` (up to 50, most ground swapped in the last 30 days first; `swaps` is all-time battle hexes as before; `hexes` counts public ground only) |
| GET | /api/feed | | `{ items: [{ activity, userName, userColour, userCrest }] }` |
| POST | /api/activities/:id/kudos | | `{ kudos }` |
| GET | /api/activities/:id/comments | | `{ comments: Comment[], count }` (oldest first; comments you reported are hidden from you) |
| POST | /api/activities/:id/comments | `{ text }` | `{ comment, count }` |
| DELETE | /api/activities/:id/comments/:cid | | `{ ok, count }` (the author, or the activity's owner) |
| POST | /api/activities/:id/comments/:cid/report | `{ reason? }` | `{ ok }` (recorded once per person for the owner to review) |
| GET | /api/leagues | | `{ leagues: League[], max: 5, maxMembers: 50 }` (the leagues you're in) |
| POST | /api/leagues | `{ name }` (3 to 40 characters) | `{ league }` (you join it) |
| POST | /api/leagues/join | `{ code }` (the code or the whole invite link) | `{ league, already? }` |
| POST | /api/leagues/:id/leave | | `{ ok }` (the last one out closes it) |
| GET | /api/leagues/:id | `?mode=run` | `{ league, table: [{ userId, name, colour, gained7d, hexes, me, rank }], members: [{ userId, name, colour, joinedAt, me, owner }], mode, days: 7 }` (members only) |
| GET | /api/clubs | | `{ clubs: [{ id, name, members, hexes, mine }] }` |
| POST | /api/clubs | `{ name }` | `{ club }` |
| POST | /api/clubs/:id/join | | `{ club }` |
| POST | /api/clubs/:id/leave | | `{ ok }` |
| GET | /api/plan | | `{ plan }` (null when none) |
| PUT | /api/plan | `{ plan }` | `{ plan }` |
| POST | /api/plan/ai | `{ brief, answers?, context }` (public, see below) | `{ settings, coach, model }` or `{ questions, model }` |
| GET | /api/notifications | | `{ items: [{ id, at, kind, text, read }] }` |
| POST | /api/notifications/read | `{ ids }` | `{ ok }` |
| POST | /api/integrations/formtrack | `{ token }` (a FormTrack personal token, `ftk_...`) | `{ linked: true, summary }` |
| DELETE | /api/integrations/formtrack | | `{ linked: false }` |
| GET | /api/integrations/formtrack/summary | | `{ today, readiness, strengthThisWeek }` |
| GET | /api/routes | | `{ routes: Route[] }` (yours, newest first, max 200) |
| POST | /api/routes | `{ id?, name, mode, ring, plannedAt? }` (2 to 2000 points; with `id`, updates that route; `plannedAt` epoch ms or null, left out on an update keeps the one it has) | `{ route }` |
| DELETE | /api/routes/:id | | `{ ok }` |
| GET | /api/crew | | `{ crew: Crew[] }` (everyone in your club and your leagues, by name, without you; max 500) |
| POST | /api/routes/:id/share | `{ to: [userId], plannedAt? }` (your own route only; 1 to 20 people, all in your crew; `plannedAt` left out uses the route's own) | `{ ok, sent: [userId], plannedAt }` (404 not your route, 403 `not_crew`, 400 `too_many_recipients`, 429 after 30 sends a day; each person gets a `route` notification) |
| GET | /api/routes/shared | | `{ shared: SharedRoute[] }` (sent to you, newest first, max 100, hidden ones left out) |
| DELETE | /api/routes/shared/:shareId | | `{ ok }` (hides it from your list; yours only) |
| GET | /api/bests | `?mode=run` | `{ bests: Best[] }` (your records on that map, in distance order) |
| GET | /api/strongholds | `?mode=run&bbox=w,s,e,n` | `{ strongholds: Stronghold[] }` (no bbox: around your last activity) |
| GET | /api/strongholds/:id | `?mode=run` | `{ stronghold, byEfforts: [{ userId, name, colour, me, efforts, last }], byTime: [{ userId, name, colour, me, bestS, at }], recent: [{ activityId, at, elapsedS }] }` (top 20 each; `recent` is yours) |
| GET | /api/strongholds/efforts | | `{ efforts: [{ strongholdId, activityId, mode, at, elapsedS }] }` (yours, for export) |
| GET | /api/hills | `?mode=run&bbox=w,s,e,n` (bbox needed, up to 4 square degrees) | `{ hills: Hill[] }` hills whose start is in view, with the holder's name and colour (max 300) |
| GET | /api/hills/:id | | `{ hill: Hill & { profile: [[metres, height]], people }, board: [{ rank, userId, name, colour, seconds, at, me }], mine: { rank, seconds, at, activityId } \| null }` (board: the top 10, each person's best once) |
| GET | /api/me/export | | everything held about you: `{ user, activities (with tracks), club_members, kudos, notifications, plans, feedback, routes, route_shares_sent, route_shares_received, hill_efforts, hills_held, comments, reports, leagues, swaps, ... }` |
| GET | /api/me/year | `?year=2026` (default this year, Sydney time) | Foothold Wrapped: `{ year, start, end, activities: [{ id, mode, startedAt, distanceM, movingS, elevGainM, loops, claimed, taken, bests }], rivals: [{ userId, name, colour, crest, tookFromThem, tookFromYou }], bests: { run, walk, ride } }` (yours only, no tracks; the phone reads tracks for the map film) |
| DELETE | /api/me | | `{ ok }` (removes the account and all of the above; held ground goes wild) |
| POST | /api/feedback | `{ kind: 'bug'|'idea'|'other', text }` | `{ ok }` |
| GET | /api/explored | `?mode=run|walk|ride` (leave out for every mode) | `{ cells: [h3], total, capped }` every res-10 hex your tracks passed through, newest first, max 20000 |
| GET | /api/quests | | `{ week: Week, quests: Quest[] }` this week's three quests |
| GET | /api/week | `?w=YYYY-MM-DD` (any day in the week; leave out for this week) | `{ recap: Recap }` |
| GET | /api/streak | | `{ streak: { current, longest, banked, maxBanked: 3, active, thisWeek: { key, out }, startKey, lastRested, milestone, nextMilestone, weeks: [{ key, state: 'out'\|'rested'\|'missed'\|'now'\|'before', out }] } }` (weeks: the last 16, oldest first) |
| GET | /api/division | | `{ week: Week, daysLeft, endsAt, tier: Tier, bestTier: Tier, active, division: { id, tier: Tier, size, promoteTop } \| null, table: [{ userId, name, colour, crest, score, hexes, outings, rank, top, promotes, me }], you: { rank, score, hexes, outings, promotes } \| null, promotion: { week, tier: Tier } \| null, last: { week, tier, rank, size, promoted } \| null, scoring: { perHex, perOuting, maxOutings, promoteTop, size, activeDays } }` (`active` false and an empty table until you've had an outing in the last 14 days; `promotion` is set when last week moved you up) |
| GET | /api/division/history | | `{ history: [{ week, tier: Tier, rank, size, score, hexes, outings, promoted, finalised }], tier: Tier, bestTier: Tier }` (newest first, up to 52) |

## Personal bests and strongholds

Both are worked out when an activity is saved (rules in `docs/ENGINE.md`).
Deleting an activity removes its stronghold efforts and rebuilds your
records from the activities left. Personal bests and efforts are your data:
they are in "Download my data" and go when your activities do. Server
tables: `personal_bests`, `stronghold_efforts` (`USER_DATA` in
`worker/strongholds.js`), from `migrations/0006_strongholds.sql`, which also
seeds the seven Penrith loops.

## King of the hill

The steepest climbs in each area become hills, tied to the ground. Whoever
holds the fastest time up a hill is King or Queen of the hill (the data says
`holder`; the app says King of the hill). Run, walk and ride have their own
hills. Rules and numbers are in `src/lib/engine/hills.js`:

- A climb is a steady ascent of at least 20 m, at least 250 m long, averaging
  4% or more. Dips under 3 m don't end it.
- A hill's key is `mode:start hex>end hex` at H3 resolution 9. A climb whose
  ends are within 60 m of a known hill's ends (or with the same key, a similar
  length and ends within 120 m) is that hill. The first effort's line,
  simplified, becomes the hill's line, and its heights the profile.
- Efforts on known hills are found from the track alone: it must pass within
  40 m of the start, then the end, cover the hill's length give or take a
  quarter, and follow its line. The time is between those two samples.
- Only the best per person per hill counts on the board. The crown moves only
  on a strictly faster time, and the old holder gets a `hill` notification:
  "Sam took the hill on the 32 m climb. Your time to beat: 1:42. Fancy another go?"
  (not for efforts more than 14 days old, such as imports).
- Heights: terrain heights through the same lookup as `/api/elevation`
  (`terrainHeights` in `worker/elevation.js`), or a watch file's own heights
  for imports. Never the phone's GPS heights. The server finds climbs after the
  response (`ctx.waitUntil`), so `hills` on an activity can be empty for a few seconds.
- Only activities that pass the anti-cheat count, imports included. A climb that
  starts, ends or passes through your privacy zone never makes or counts a hill.
- Names come from the climb's height ("The 32 m climb"). There is no geocoder.

```
Hill {
  id, name, mode, line: [[lng, lat]], gainM, lengthM, grade (0.08 is 8%),
  start: { lat, lng }, end: { lat, lng }, top: { lat, lng } (where the crown sits),
  holder: { userId, name, colour, seconds, me } | null
}
```

Server tables `hills` and `hill_efforts` (`migrations/0013_hills.sql`). Your
efforts are in "Download my data" (`hill_efforts`, and `hills_held` for hills
you hold). Deleting an activity removes its efforts; deleting your account
removes all of them. Hills stay either way, and the next fastest becomes the
holder. On the practice map, hills live on the device (`src/lib/api/localHills.js`),
with two seeded hills held by practice rivals.

## FormTrack link

FormTrack exposes an MCP endpoint at `{FORMTRACK_URL}/mcp/{ftk_token}`
(JSON-RPC 2.0, `tools/call`). Foothold reads:

- `get_summary`: program, goal and today's planned session
- `list_workouts`: recent strength sessions, for weekly load
- `get_wellbeing`: sleep, resting HR and HRV, for a readiness score

The token is stored encrypted at rest (AES-GCM with the `TOKEN_KEY`
secret) and never returned to the app. Writing runs back into FormTrack
needs a small FormTrack change, see `docs/FORMTRACK.md`.

## Planned routes

The route planner (`/app/plan`, logic in `src/lib/planner.js`) previews what
a loop would take with the same engine rules as a real activity: `findLoops`
decides whether it counts, `cellsForLoops` the hexes and `applyClaim` whether
each is wild, yours or a rival's you would take or only weaken. The server
checks routes with the same `cleanRoute` the app uses. Routes need
`migrations/0005_routes.sql`, and they are included in Download my data.

### A day and time, and sending to your crew

`plannedAt` on a route, and route sharing, need `migrations/0011_route_shares.sql`.
`plannedAt` is checked by `cleanPlannedAt` in `src/lib/routeShare.js` (null, or
a time from 2020 to two years ahead). "Add to calendar" builds a one-event
.ics with a one hour alarm (`routeIcs`, on `reminderIcs` in `src/lib/calendar.js`)
and runs nowhere but the phone.

Your crew is everyone in your club and your private leagues (`worker/routeShares.js`).
Sending copies the route's name, mode, ring and distance into `route_shares`
for each person, and notifies them: "{name} sent you a route: {route name}",
plus " for Sat 7 Nov, 7:00 am" (Sydney time) when it has a time. Sending the
same route to the same person again replaces their copy. To keep one, the app
saves it with `POST /api/routes` (`copySharedRoute` in `src/lib/sharedRoutes.js`).
Shares you sent and shares you received are in Download my data, and deleting
your account removes both, including the copies you sent.

The practice map (local.js) has no crew: `crew()` is empty, `shareRoute` asks
you to sign up, and `sharedRoutes()` holds one made-up example from Sam,
labelled as a practice example, that can be hidden.

## Quests, explored map and weekly recap

Rules live in `src/lib/engine/quests.js`, `explore.js`, `weekly.js` and
`weeks.js`, shared by both adapters. Quests are picked from a seeded pool
(same player and week, same quests) and sized from the four weeks before.
Progress is worked out each time from activities, the hexes each one passed
through (`activities.visited` on the server) and the log of hexes rivals took
(`hex_losses`), never stored counters. Missing a quest costs nothing.
Held hexes in a past week's recap come from today's map, so they count
ground held then and still held now. On Monday (Sydney) the cron, and the
practice map's tick, send "Your week in Foothold is ready. Want a look?"
(kind `week`) to anyone who got out the week before.
## Weekly streaks and the first week

Rules live in `src/lib/engine/streaks.js` and `firstweek.js`, shared by both
adapters. A streak counts Sydney weeks (Monday to Sunday) with at least one
outing that wasn't rejected. Each finished week banks a rest week (up to 3);
a quiet week spends one and the streak carries on, and only a quiet week with
none banked ends it. This week is in progress, never missed. Worked out from
activity start times on every call, so imports fill in old weeks; no table.
The hourly cron (and the practice map's tick) only ever celebrates
milestones: 4, 8, 12, 26 and 52 weeks (kind `streak`, once per streak and
milestone). No reminders or warnings about streaks are sent.

The first week journey is worked out in the app from `GET /api/activities`
and the user's `createdAt`; once all three steps are done the app saves
`foundingAt` with `PUT /api/me`.
## Weekly divisions

Rules in `src/lib/engine/divisions.js` (docs/ENGINE.md), server side in
`worker/divisions.js`, tables from `migrations/0009_divisions.sql`
(`divisions`, `division_members`, `division_weeks`). The hourly cron finishes
any week that has ended, groups the new week once (the first run after
midnight on Monday, Sydney; a `division_weeks` row stops it running twice) and
seats late joiners. `GET /api/division` does the same catch-up first, so a
missed cron hour never leaves anyone out. Scores are worked out from
activities and cached in `division_members`. Notifications have kind
`division`. `division_members` is in Download my data and goes with the
account; a division's `city` (an H3 resolution 4 cell) is never sent to the app.
Bots: none on the server yet. When they arrive, leave them out where
`activePlayers` reads activities and seat them after grouping.

The practice map (local.js) builds a division of 20 from the practice rivals
and named practice players whose scores grow through the week
(`src/lib/social/divisionPractice.js`); your score is real. Unlike the server,
practice always places you, so the table is there on day one.

## Comments, leagues and rivals

- Comments are tidied (spaces squashed, invisible characters dropped),
  1 to 280 characters, and checked by `src/lib/social/filter.js` on the
  server: links, slurs and abuse get a 400 with `code` `link` or `unkind`.
  Limits: 30 comments an hour, 20 reports a day. The activity's owner gets a
  `comment` notification. Deleting an activity deletes its comments and
  their reports.
- Invite codes are 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. The
  invite link is `{app}/#/app/leagues/join/CODE`. Up to 5 leagues each and 50
  members a league (`league_limit`, `league_full`). Joining is limited to 20
  tries an hour so codes can't be guessed.
- League tables and rival hex counts only count public ground: hexes inside
  anyone's privacy zone are left out for everyone, including you.
- `tookFromThem` and `tookFromYou` come from the `swaps` table, written with
  each activity. The practice game (local.js) keeps the same records in the
  browser, and its practice rivals leave the odd friendly comment.

## AI built plans

`POST /api/plan/ai` (worker/aiplan.js) is public like `/api/tts`, so it works
on the practice map too. `/api/config` includes `ai: { plans: true }` only when
`ANTHROPIC_API_KEY` is set; without it the route answers 503 `ai_off` and the
app hides the option.

- `brief`: the runner's own words, 3 to 1500 characters.
- `answers`: up to 3 `{ q, a }` answers to the coach's earlier questions (a up to 300 characters).
- `context`: `{ weeklyKm: [8 weeks, oldest first], longestKm, runCount, fiveKS, predictions: { 5k, 10k, half, marathon }, confidence, currentGoal, formtrackLinked, today }`.
  Any other field is dropped before Claude sees it. Never send names, emails, places or tracks.

Claude is called with a forced `design_plan` tool. It never writes sessions:
the server checks and clamps its output into settings for `generatePlan`
(`goal`, `raceDate?`, `daysPerWeek` 2 to 6, `runDays?`, `longRunDay`,
`includeStrength`, `currentWeeklyKm?`, `longestRecentKm?`, `avoid?` of
`intervals`, `tempo`, `hills`), plus `coach: { headline, overview, phases:
[{ fromWeek, toWeek, focus }], tips, safety? }` with dashes turned into commas.
An unknown goal is refused (502 `bad_output`). The app builds the plan on the
phone and stores the words as `plan.ai = { headline, overview, phases, tips,
safety, model, family, createdAt }`.

Limits: 5 an hour and 15 a day per address, 15 a day per signed-in player
(429 `rate_limited`), and a global daily spend cap `AI_DAILY_CAP_AUD`
(default 10, 503 `ai_paused`) counted in the `ai_usage` table, which holds
token counts and cost only.

## Post-run check-ins and the fitness trend

After a run the app asks once "How did that feel?" (Result screen, and the
Activity screen for your latest activity). The answer is saved on the
activity with `POST /api/activities/:id/checkin`; dismissing it saves
`checkinAt` with no `feel`, so it is never asked again for that activity.
The rules live in `src/lib/coach/checkin.js` and both adapters use them.
"Something hurt" with a place and how bad also runs the coach's injury
adaptation on your plan (`adaptPlan` with `{ type: 'injury' }`). When the last
3 planned easy runs, or 2 in a week, felt very hard, the plan gets a
`{ type: 'tired' }` event: the next 4 days are easy at about 80%.

The fitness trend (`/app/fitness`, `src/lib/coach/trend.js`) is worked out
in the app from your activities: a rolling predicted 5K per week (from the
8 weeks before it), easy run pace, heartbeats per km on easy runs when the
track has heart rate, weekly kilometres, and FormTrack readiness. The server
summary only has today's readiness, so the app keeps one score a day on the
device (`src/lib/readiness.js`). Resting heart rate is not in the summary, so
it is not shown.
