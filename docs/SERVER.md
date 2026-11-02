# Running the Foothold server

The Worker in `worker/` serves the built app and the `/api` routes in
`docs/API.md`, with player data in a Cloudflare D1 database. Without it the
app still runs on its own in the browser (GitHub Pages), so this is only
needed for real accounts, shared territory and the FormTrack link.

## One-off setup

1. Create the database:

   ```bash
   npx wrangler d1 create foothold
   ```

   Copy the `database_id` it prints into `wrangler.toml`, replacing
   `REPLACE_WITH_D1_ID`.

2. Create the tables:

   ```bash
   npm run db:migrate
   ```

   Run this again whenever a new file lands in `migrations/`.

3. Sign-in. Foothold uses the same Auth0 tenant as FormTrack, so one account
   works for both. In Auth0, add a Single Page Application for Foothold with
   the app's address under Allowed Callback URLs, Logout URLs and Web Origins.
   Then set these as variables (in `wrangler.toml` under `[vars]`, or in the
   Cloudflare dashboard under the Worker's Settings, Variables):

   - `AUTH0_DOMAIN`: the same tenant domain FormTrack uses
   - `AUTH0_CLIENT_ID`: the new Foothold application's client id
   - `AUTH0_AUDIENCE`: the same API identifier FormTrack uses

   The app reads these from `GET /api/config` before it signs anyone in.

4. The key that encrypts linked FormTrack tokens:

   ```bash
   npx wrangler secret put TOKEN_KEY
   ```

   Paste any long random string (for example from `openssl rand -base64 32`).
   Keep it safe: if it changes, everyone has to link FormTrack again.

5. Check `APP_URL` in `wrangler.toml` is the address people will use. If the
   app is also served from GitHub Pages, add that address to
   `ALLOWED_ORIGINS` so the browser may call the API from there.

## Deploying

In the Cloudflare dashboard, go to Workers and Pages, Create, Import a
repository, and pick this repo. Use:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Build variable: `VITE_API_URL` = `self`

That variable tells the app to use this Worker's API (same site) instead of
the practice map. Without it the app still runs, but only as the practice
map with runs saved on each phone.

Every push to `main` then builds and deploys. The hourly cron in
`wrangler.toml` ends finished battles, sends the daily "fading soon"
reminders and runs each season's soft reset (docs/ENGINE.md), with no extra
setup.

## Run recaps in 3D (Google Maps)

Recaps fly over Google's photorealistic 3D map when a Google Maps key is set.
Without one they use the street map with the same camera moves.

1. In Google Cloud, pick or create a project with billing on, then enable
   **Maps JavaScript API** and **Map Tiles API**.
2. Create an API key. Under Application restrictions choose Websites and add
   `https://foothold.michael-0d4.workers.dev/*` (and any custom domain).
   Under API restrictions allow only those two APIs.
3. In Cloudflare, add it to the Worker as a variable named `GOOGLE_MAPS_KEY`.
   The app reads it from `/api/config`. It is a browser key, so it isn't
   secret, but the website restriction is what stops others using it.
4. For the GitHub Pages copy, add the same key as a repository variable
   named `GOOGLE_MAPS_KEY` (Settings, Secrets and variables, Actions,
   Variables) and add `https://michaelmcalister.github.io/foothold/*` to the
   key's websites.

Billing: each recap is one 3D map load (Google's Immersive Maps SKU). Google
lists 5,000 free a month, then about US$7 per 1,000. Set a budget alert in
Google Cloud.

Google's terms don't allow saving their imagery outside the map, so recaps
play live in the app and aren't exported as video files.

## Music during runs (Spotify)

Foothold can start Spotify when a run starts and turn it down while the voice
coach talks. Sign-in uses PKCE in the browser, so there is no client secret.

1. At developer.spotify.com, create an app (Web API). The owner needs Spotify
   Premium.
2. Add the redirect URI `https://foothold.michael-0d4.workers.dev/spotify/callback/`
   (and `https://michaelmcalister.github.io/foothold/spotify/callback/` for
   the GitHub Pages copy). It must match exactly, trailing slash included.
3. In the app's User Management, add the Spotify email of each tester.
4. In Cloudflare, add the app's Client ID to the Worker as a variable named
   `SPOTIFY_CLIENT_ID`. For GitHub Pages, add a repository variable with the
   same name.

Limits: since March 2026, a Spotify app in development mode allows up to five
listed users, each with Premium. Going wider needs Spotify's extended quota,
which Spotify currently grants only to established businesses with a large
user base. Playing music needs Premium for every user.

Phones: Spotify's API can turn the volume down on Android, but not on iPhone,
so on iPhone the music pauses for a moment while the coach talks.

## The coach's Australian voice (ElevenLabs)

The voice coach speaks with an Australian ElevenLabs voice (Charlie, or
Brenna) through `POST /api/tts`, so the key never reaches the app. Repeated
lines come from Cloudflare's cache, and fresh lines are limited to 150 an
hour per address. Without the key, the app uses the phone's own voice.

1. In ElevenLabs, create an API key with Text to Speech access (the same
   account FormTrack uses is fine).
2. In Cloudflare, add it to the Worker as a secret named `ELEVENLABS_API_KEY`
   (Settings, Variables and secrets, Add, type Secret), or run
   `npx wrangler secret put ELEVENLABS_API_KEY`.

## AI built plans (Claude)

The coach can build a plan from the runner's own words through
`POST /api/plan/ai`. Claude picks settings for the plan engine and writes the
explanation; the engine still builds every week, so the safety rules hold.

1. Apply migration `0007_ai.sql` (`npm run db:migrate`). It adds `ai_usage`.
2. Create an Anthropic API key and add it as a Worker secret named
   `ANTHROPIC_API_KEY` (`npx wrangler secret put ANTHROPIC_API_KEY`).
3. Optional variables: `PLAN_MODEL` (default `claude-sonnet-5-5`) and
   `AI_DAILY_CAP_AUD` (default 10). Over the cap, AI plans rest until the
   next UTC day and the manual setup still works.

Without the key, the "Build it with AI" option doesn't show.

## Developing locally

```bash
VITE_API_URL=self npm run build
npx wrangler d1 migrations apply foothold --local
npx wrangler dev --var ALLOW_DEVICE_IDS:1 --var TOKEN_KEY:dev-only-key
```

`ALLOW_DEVICE_IDS=1` lets the app sign in with a device id instead of Auth0.
Never set it in production, since anyone could then pose as another device.

## Tests

`npm test` runs the engine and Worker tests. The Worker tests use Node's
built-in SQLite as a stand-in for D1, so they need no Cloudflare account.

## Privacy notes

- AI plan briefs are never logged or stored on the server; `ai_usage` holds only token counts and cost.
- Tokens, request bodies and locations are never logged. Errors log only the
  method, path and error message.
- FormTrack tokens are stored encrypted (AES-GCM) and never sent back to the app.
- Hexes inside a player's privacy zones are never sent to anyone else, and
  other players only get the public track, with the zone ends trimmed off.
