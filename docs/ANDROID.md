# Foothold for Android

The Android app is the same Vue app wrapped in Capacitor 8, with the same
native plugins as the iPhone app (docs/IOS.md). The screens are bundled into
the app and talk to the live server, so **API changes must stay backward
compatible**.

The app id is `au.net.mcalister.foothold`, the same as on iPhone. It is also
the app's link scheme, so the Auth0 callback is identical on both.

## What is different from iPhone

- The app's web address is `https://localhost` (iPhone: `capacitor://localhost`).
  The server allows it (`ALLOWED_ORIGINS` in `wrangler.toml`); Auth0 and the
  Google Maps key need it too (below).
- Recording with the screen off runs as a foreground service with a
  "Foothold is recording" notification. Android 13 and later asks to allow
  notifications before the first recording (`allowRecordingNotice()` in
  `src/lib/native.js`). Location is only ever "while using the app"; the app
  never asks for background location.
- `capacitor.config.json` sets `android.useLegacyBridge`, so GPS doesn't stop
  after 5 minutes in the background.

## One-off setup outside the code

- **Auth0** (Applications, Foothold, URLs): add `https://localhost` to Allowed
  Web Origins and to Allowed Origins (CORS). The callback and logout URLs are
  the same as iPhone's.
- **Google Maps key** (3D flyover): add `https://localhost/*` to its website
  restrictions.

## On the Mac

Needs Android Studio (latest), Node 22 or later.

```
cd ~/Code/foothold
git pull
npm ci
npm run android:sync     # build, copy into the Android project
npm run android:open     # opens Android Studio
```

`npm run android:init` builds and sets everything up from scratch (adds the
project if `android/` is missing, then icons). `npm run android:icons` remakes
the icons from `assets/` (the adaptive icon uses `icon-foreground.png` on
`icon-background.png`).

To try it on a phone: on the phone, Settings, About phone, tap Build number
seven times, then Developer options, USB debugging on. Plug it in, pick it at
the top of Android Studio and press Run.

## Releasing

1. Raise `versionCode` (and `versionName`) in `android/app/build.gradle` for
   every upload.
2. Android Studio: Build, Generate Signed App Bundle or APK, Android App
   Bundle. The first time, create an upload key: keep the `.jks` file and its
   passwords outside the repo, in your password manager and a backup. Google
   Play App Signing holds the real signing key, so a lost upload key can be
   reset, but it takes days.
3. Upload the `.aab` in Play Console.

New personal developer accounts must run a closed test with at least 12
testers, opted in for 14 days in a row, before they can publish to everyone.
The full walkthrough is in the "Foothold for Android: step by step" doc.
