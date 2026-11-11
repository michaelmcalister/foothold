# Foothold for iPhone

Foothold's iPhone app is the same Vue app wrapped in Capacitor 8, with native
plugins where the browser falls short. The screens are bundled into the app and
talk to the live server, so **API changes must stay backward compatible**: an
older app version keeps calling the server after every deploy.

## What is native in the app

| Feature | Plugin | Code |
| --- | --- | --- |
| GPS that keeps recording with the phone locked | `@capacitor-community/background-geolocation` | `src/lib/recorder.js` |
| Screen kept awake during a run | `@capacitor-community/keep-awake` | `src/lib/native.js` |
| Auth0 sign-in in a secure sheet, back through the app's own link | `@capacitor/browser`, `@capacitor/app` | `src/lib/auth.js` |
| Spotify sign-in (back through the website's return page, then the app link) | same | `src/lib/audio/spotify.js`, `public/spotify/callback/` |
| Answering mission questions out loud | `@capgo/capacitor-speech-recognition` | `src/lib/audio/listen.js` |
| `/api/...` calls sent to the server, share links pointing at the website | none | `src/lib/native.js` |

`isNativeApp()` (in `src/lib/native.js`) is false on the website, so none of
this changes the web app. The plugins are loaded only inside the app.

The app id is `au.net.mcalister.foothold`. It is also the app's link scheme.

## One-off setup outside the code

- **Auth0** (Applications, Foothold, Settings). Add these and save:
  - Allowed Callback URLs and Allowed Logout URLs:
    `au.net.mcalister.foothold://dev-dprob3bsr0oj2dsz.us.auth0.com/capacitor/au.net.mcalister.foothold/callback`
  - Allowed Origins (CORS): `capacitor://localhost`
- **Server**: `wrangler.toml` allows `capacitor://localhost` (`ALLOWED_ORIGINS`).
- **Google Maps key** (for the 3D flyover): in Google Cloud, Credentials, the
  browser key, add `capacitor://localhost/*` to its website restrictions.
- **Spotify**: nothing to add. The app reuses the website's return page.

## On the Mac

Needs Xcode 26 or later (App Store uploads require it), Node 22 or later, git.

```
gh repo clone michaelmcalister/foothold ~/Development/foothold
cd ~/Development/foothold
npm ci
npm run ios:init      # first time: build, add the Xcode project, settings, icons
npm run ios:open      # opens Xcode
```

In Xcode: App target, Signing & Capabilities, tick Automatically manage signing
and pick your team. Plug in the iPhone, switch on Developer Mode on it
(Settings, Privacy & Security), choose it at the top of Xcode and press Run.

After pulling changes: `npm run ios:sync`, then Run again.

`npm run ios:init` and `ios:sync` build with the live server
(`FOOTHOLD_SERVER` to change it) and patch `ios/App/App/Info.plist` with the
permission wording, background modes (location, audio), the app link and
`ITSAppUsesNonExemptEncryption = NO`. Re-running changes nothing already there.
The icon and launch screen come from `assets/` (`npm run ios:icons`).

Commit the `ios/` folder once it exists, so signing settings are kept.

## Releasing

Raise Build in Xcode (App target, General) for every upload. Product, Archive,
then Distribute App, App Store Connect, Upload. Test through TestFlight before
submitting for review. The full walkthrough, including App Review traps, is in
the "Foothold for iPhone: step by step" doc.
