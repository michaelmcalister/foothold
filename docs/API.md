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
            appeal?: { note, status: 'open'|'upheld'|'declined' }, kudos }
Cell      { h3, owner, ownerName, ownerColour, ownerCrest, mine, strength, daysToWild,
            flips, heat, lastFlip }   (flips: times taken; heat: recent flips, 0 after 30 quiet days)
Battle    { id, attacker, defender, attackerName, defenderName, attackerColour, defenderColour,
            attackerCrest, defenderCrest, hexes: [h3],
            startedAt, endsAt, endedAt?, winner?,
            score: { attacker, defender, leader } }
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
| GET | /api/rivals | | `{ rivals: [{ userId, name, colour, swaps }] }` |
| GET | /api/feed | | `{ items: [{ activity, userName, userColour, userCrest }] }` |
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

## FormTrack link

FormTrack exposes an MCP endpoint at `{FORMTRACK_URL}/mcp/{ftk_token}`
(JSON-RPC 2.0, `tools/call`). Foothold reads:

- `get_summary`: program, goal and today's planned session
- `list_workouts`: recent strength sessions, for weekly load
- `get_wellbeing`: sleep, resting HR and HRV, for a readiness score

The token is stored encrypted at rest (AES-GCM with the `TOKEN_KEY`
secret) and never returned to the app. Writing runs back into FormTrack
needs a small FormTrack change, see `docs/FORMTRACK.md`.
