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
            bests: { [key]: seconds, longest?: metres } | null }
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
Route     { id, name, mode, ring: [[lng, lat], ...], distanceM, createdAt, updatedAt }
            (a planned route; a closed loop's ring ends where it starts; private to its owner)
Week      { key: 'YYYY-MM-DD' (its Monday), start, end }   Monday to Sunday, Sydney time
Quest     { id, kind: 'take'|'loops'|'outings'|'explore'|'newground'|'hold'|'takeback'|'raid',
            title, detail, target, count, progress, done, pending }
            (pending: a hold quest still waiting for the week to end)
Recap     { week: { key, start, end, current, previous }, distanceM, movingS, outings,
            byMode, loops, hexes: { taken, fromRivals, held, lost, lostToRivals, faded },
            explored, quests: Quest[], questsDone, biggestLoop: { activityId, hexes, mode,
            startedAt, distanceM } | null, best: { activityId, text } | null,
            last: { key, distanceM, movingS, outings }, compare, visited: [h3] (max 3000) }
Season    { id: '2026-12', key: 'summer'|'autumn'|'winter'|'spring', name: 'Summer 2026/27',
            label: 'Summer season, Dec to Feb', span: 'Dec to Feb', startsAt, endsAt, daysLeft }
```

Crests are the ids in `src/lib/crests.js` (`chevron`, `star`, `wave`, ...).
`crest: null` means the app draws a default picked from the player id.

## Routes

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | /api/config | (no sign-in needed) | `{ auth0: { domain, clientId, audience } }` when Auth0 is set up, else `{}` |
| GET | /api/me | | `{ user }` |
| PUT | /api/me | `{ name?, colour?, crest?, mode?, zones?, seasonSeen? }` | `{ user }` |
| POST | /api/activities | `{ mode, source, startedAt, points: Point[] }` | `{ activity, diff: { claimed: h3[], reinforced: h3[], taken: [{h3, from}], held: [{h3, owner}] }, battles: Battle[], hexesBefore, hexesAfter, load }` |
| GET | /api/activities | `?limit=50` | `{ activities: Activity[] }` |
| GET | /api/activities/:id | | `{ activity, track: Point[] }` (owner gets full track, others the public track) |
| POST | /api/activities/:id/appeal | `{ note }` | `{ activity }` |
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
| GET | /api/notifications | | `{ items: [{ id, at, kind, text, read }] }` |
| POST | /api/notifications/read | `{ ids }` | `{ ok }` |
| POST | /api/integrations/formtrack | `{ token }` (a FormTrack personal token, `ftk_...`) | `{ linked: true, summary }` |
| DELETE | /api/integrations/formtrack | | `{ linked: false }` |
| GET | /api/integrations/formtrack/summary | | `{ today, readiness, strengthThisWeek }` |
| GET | /api/routes | | `{ routes: Route[] }` (yours, newest first, max 200) |
| POST | /api/routes | `{ id?, name, mode, ring }` (2 to 2000 points; with `id`, updates that route) | `{ route }` |
| DELETE | /api/routes/:id | | `{ ok }` |
| GET | /api/bests | `?mode=run` | `{ bests: Best[] }` (your records on that map, in distance order) |
| GET | /api/strongholds | `?mode=run&bbox=w,s,e,n` | `{ strongholds: Stronghold[] }` (no bbox: around your last activity) |
| GET | /api/strongholds/:id | `?mode=run` | `{ stronghold, byEfforts: [{ userId, name, colour, me, efforts, last }], byTime: [{ userId, name, colour, me, bestS, at }], recent: [{ activityId, at, elapsedS }] }` (top 20 each; `recent` is yours) |
| GET | /api/strongholds/efforts | | `{ efforts: [{ strongholdId, activityId, mode, at, elapsedS }] }` (yours, for export) |
| GET | /api/me/export | | everything held about you: `{ user, activities (with tracks), club_members, kudos, notifications, plans, feedback, comments, reports, leagues, swaps }` |
| DELETE | /api/me | | `{ ok }` (removes the account and all of the above; held ground goes wild) |
| POST | /api/feedback | `{ kind: 'bug'|'idea'|'other', text }` | `{ ok }` |
| GET | /api/explored | `?mode=run|walk|ride` (leave out for every mode) | `{ cells: [h3], total, capped }` every res-10 hex your tracks passed through, newest first, max 20000 |
| GET | /api/quests | | `{ week: Week, quests: Quest[] }` this week's three quests |
| GET | /api/week | `?w=YYYY-MM-DD` (any day in the week; leave out for this week) | `{ recap: Recap }` |

## Personal bests and strongholds

Both are worked out when an activity is saved (rules in `docs/ENGINE.md`).
Deleting an activity removes its stronghold efforts and rebuilds your
records from the activities left. Personal bests and efforts are your data:
they are in "Download my data" and go when your activities do. Server
tables: `personal_bests`, `stronghold_efforts` (`USER_DATA` in
`worker/strongholds.js`), from `migrations/0006_strongholds.sql`, which also
seeds the seven Penrith loops.

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
