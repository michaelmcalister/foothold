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
`wrangler.toml` ends finished battles and sends the daily "fading soon"
reminders, with no extra setup.

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

- Tokens, request bodies and locations are never logged. Errors log only the
  method, path and error message.
- FormTrack tokens are stored encrypted (AES-GCM) and never sent back to the app.
- Hexes inside a player's privacy zones are never sent to anyone else, and
  other players only get the public track, with the zone ends trimmed off.
