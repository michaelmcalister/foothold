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
User      { id, name, colour, units: 'metric', mode: 'run'|'walk'|'ride',
            zones: [{ lat, lng, radiusM, label }], clubId, createdAt,
            formtrack: { linked: boolean, linkedAt } }
Point     { lat, lng, t, alt?, acc?, hr?, cad? }
Activity  { id, userId, mode, source: 'phone'|'watch'|'import', startedAt,
            distanceM, durationS, movingS, paceSPerKm, elevGainM,
            loops, gain, claimed, reinforced, taken, held,
            trust, flags: [{ type, message }], rejected, rejectReason,
            appeal?: { note, status: 'open'|'upheld'|'declined' }, kudos }
Cell      { h3, owner, ownerName, ownerColour, mine, strength, daysToWild }
Battle    { id, attacker, defender, attackerName, defenderName, hexes: [h3],
            startedAt, endsAt, endedAt?, winner?,
            score: { attacker, defender, leader } }
Week      { key: 'YYYY-MM-DD' (its Monday), start, end }   Monday to Sunday, Sydney time
Quest     { id, kind: 'take'|'loops'|'outings'|'explore'|'newground'|'hold'|'takeback'|'raid',
            title, detail, target, count, progress, done, pending }
            (pending: a hold quest still waiting for the week to end)
Recap     { week: { key, start, end, current, previous }, distanceM, movingS, outings,
            byMode, loops, hexes: { taken, fromRivals, held, lost, lostToRivals, faded },
            explored, quests: Quest[], questsDone, biggestLoop: { activityId, hexes, mode,
            startedAt, distanceM } | null, best: { activityId, text } | null,
            last: { key, distanceM, movingS, outings }, compare, visited: [h3] (max 3000) }
```

## Routes

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | /api/config | (no sign-in needed) | `{ auth0: { domain, clientId, audience } }` when Auth0 is set up, else `{}` |
| GET | /api/me | | `{ user }` |
| PUT | /api/me | `{ name?, colour?, mode?, zones? }` | `{ user }` |
| POST | /api/activities | `{ mode, source, startedAt, points: Point[] }` | `{ activity, diff: { claimed: h3[], reinforced: h3[], taken: [{h3, from}], held: [{h3, owner}] }, battles: Battle[], hexesBefore, hexesAfter, load }` |
| GET | /api/activities | `?limit=50` | `{ activities: Activity[] }` |
| GET | /api/activities/:id | | `{ activity, track: Point[] }` (owner gets full track, others the public track) |
| POST | /api/activities/:id/appeal | `{ note }` | `{ activity }` |
| GET | /api/territory | `?mode=run&bbox=w,s,e,n` | `{ cells: Cell[] }` (others' private hexes left out; max 5000) |
| GET | /api/stats | `?mode=run` | `{ hexes, km2, level, next, toNext, weekKm: number[5], streakWeeks, fadingSoon: number }` |
| GET | /api/leaderboard | `?mode=run&scope=local|world|club&lat&lng` | `{ rows: [{ userId, name, colour, hexes, km2, me }] }` |
| GET | /api/battles | | `{ live: Battle[], past: Battle[] }` |
| GET | /api/rivals | | `{ rivals: [{ userId, name, colour, swaps }] }` |
| GET | /api/feed | | `{ items: [{ activity, userName, userColour }] }` |
| POST | /api/activities/:id/kudos | | `{ kudos }` |
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
| POST | /api/feedback | `{ kind: 'bug'|'idea'|'other', text }` | `{ ok }` |
| GET | /api/explored | `?mode=run|walk|ride` (leave out for every mode) | `{ cells: [h3], total, capped }` every res-10 hex your tracks passed through, newest first, max 20000 |
| GET | /api/quests | | `{ week: Week, quests: Quest[] }` this week's three quests |
| GET | /api/week | `?w=YYYY-MM-DD` (any day in the week; leave out for this week) | `{ recap: Recap }` |

## FormTrack link

FormTrack exposes an MCP endpoint at `{FORMTRACK_URL}/mcp/{ftk_token}`
(JSON-RPC 2.0, `tools/call`). Foothold reads:

- `get_summary`: program, goal and today's planned session
- `list_workouts`: recent strength sessions, for weekly load
- `get_wellbeing`: sleep, resting HR and HRV, for a readiness score

The token is stored encrypted at rest (AES-GCM with the `TOKEN_KEY`
secret) and never returned to the app. Writing runs back into FormTrack
needs a small FormTrack change, see `docs/FORMTRACK.md`.

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
