# Foothold and FormTrack

Foothold and FormTrack are built to work as a pair: FormTrack makes you
strong, Foothold gets you out the door. This page explains how they talk to
each other and the one small change FormTrack needs.

## What works today

FormTrack already lets a member make a personal link for Claude (Settings,
Connect to Claude, Create my link). That link is an MCP endpoint:
`https://formtrack.com.au/mcp/ftk_...`.

In Foothold, Settings, FormTrack, the member pastes that link. The Foothold
Worker keeps the `ftk_` token encrypted (AES-GCM with the `TOKEN_KEY`
secret) and uses it to read, through FormTrack's existing tools:

| FormTrack tool | What Foothold uses it for |
| --- | --- |
| `get_summary` | Today's planned FormTrack session, so the coach doesn't put a hard run on a heavy leg day |
| `list_workouts` | Strength sessions this week, for total training load |
| `get_wellbeing` | Sleep, resting heart rate and HRV, turned into a readiness score that eases a run when you need it |

Strength sessions in a Foothold plan are marked `formtrack: true` and open
FormTrack. Nothing else is shared.

## The one change FormTrack needs: `log_cardio`

So runs, walks and rides recorded in Foothold count in FormTrack (weekly
training, streaks, the coach knowing you ran yesterday), FormTrack needs one
new MCP tool. It uses the existing `workouts` table, so **no migration is
needed**.

Foothold already calls it after each saved activity, and quietly skips it if
FormTrack doesn't have the tool yet.

### Patch for `worker/mcp.js` in the forma repo

Add to `TOOLS`:

```js
{ name: 'log_cardio', description: 'Log a run, walk or ride recorded in another app (Foothold). Counts towards weekly training.', inputSchema: { type: 'object', required: ['kind', 'started_at', 'duration_s'], properties: { kind: { type: 'string', enum: ['run', 'walk', 'ride'] }, started_at: { type: 'string', description: 'ISO time' }, duration_s: { type: 'integer', minimum: 60, maximum: 86400 }, distance_m: { type: 'integer', minimum: 0, maximum: 400000 }, hexes: { type: 'integer', minimum: 0 }, foothold_id: { type: 'string' } } } },
```

Add to the `switch (name)` in `call()`:

```js
case 'log_cardio': {
  const kind = ['run', 'walk', 'ride'].includes(args.kind) ? args.kind : null
  if (!kind) throw new Error('kind must be run, walk or ride')
  const started = new Date(args.started_at)
  if (Number.isNaN(started.getTime())) throw new Error('started_at must be an ISO time')
  const durationS = Math.max(60, Math.min(86400, Math.round(Number(args.duration_s) || 0)))
  const distanceM = Math.max(0, Math.min(400000, Math.round(Number(args.distance_m) || 0)))
  const title = `${kind === 'run' ? 'Run' : kind === 'walk' ? 'Walk' : 'Ride'} (Foothold)`
  const startedAt = started.toISOString().slice(0, 19)
  // Same activity sent twice? Keep one.
  const dupe = await env.DB.prepare('SELECT id FROM workouts WHERE user_id = ? AND started_at = ? AND title = ?').bind(user.id, startedAt, title).first()
  if (dupe) return `Already logged ${title} at ${startedAt}.`
  const verification = { level: 'synced', source: 'foothold', distanceM, hexes: Math.max(0, Math.round(Number(args.hexes) || 0)), footholdId: String(args.foothold_id || '').slice(0, 64) || null }
  await env.DB.prepare('INSERT INTO workouts (id, user_id, started_at, duration_s, title, sets, notes, verification, started_epoch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), user.id, startedAt, durationS, title, '[]', `${(distanceM / 1000).toFixed(2)} km`, JSON.stringify(verification), Math.round(started.getTime() / 1000))
    .run()
  return `Logged ${title}: ${(distanceM / 1000).toFixed(2)} km in ${Math.round(durationS / 60)} min.`
}
```

### Checks before merging (FormTrack's shipping rules)

- Add a test in `test/` for `log_cardio`: logs once, ignores a duplicate,
  rejects a bad `kind`.
- Make sure cardio rows with `sets = '[]'` don't break screens that expect
  sets (the session report, Form DNA, "coached sessions" counts). If any do,
  filter `verification.source === 'foothold'` out of strength-only views.
- Mention Foothold in the privacy policy's list of connected services.
- Keep API responses backward compatible (this only adds a tool).

## Signing in once

Both apps use Auth0. Point Foothold's `AUTH0_DOMAIN` at the same tenant as
FormTrack (with its own client ID and audience) and members use one login for
both. Linking FormTrack data still needs the member's own link above, so
nothing is shared without them choosing it.
