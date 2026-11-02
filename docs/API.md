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
            appeal?: { note, status: 'open'|'upheld'|'declined' }, kudos, comments }
Cell      { h3, owner, ownerName, ownerColour, mine, strength, daysToWild }
Comment   { id, userId, name, colour, text, at, mine, canDelete }
Rival     { userId, name, colour, crest: { letter, colour }, swaps, tookFromThem, tookFromYou,
            record: { won, lost, draws }, battle: Battle|null, lastActive, hexes }
League    { id, name, code, members, mine, createdByMe, createdAt }
Battle    { id, attacker, defender, attackerName, defenderName, hexes: [h3],
            startedAt, endsAt, endedAt?, winner?,
            score: { attacker, defender, leader } }
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
| GET | /api/rivals | `?mode=run` | `{ rivals: Rival[], you: { hexes }, days: 30 }` (up to 50, most ground swapped in the last 30 days first; `swaps` is all-time battle hexes as before; `hexes` counts public ground only) |
| GET | /api/feed | | `{ items: [{ activity, userName, userColour }] }` |
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
| GET | /api/me/export | | everything held about you: `{ user, activities (with tracks), club_members, kudos, notifications, plans, feedback, comments, reports, leagues, swaps }` |
| DELETE | /api/me | | `{ ok }` (removes the account and all of the above; held ground goes wild) |
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
