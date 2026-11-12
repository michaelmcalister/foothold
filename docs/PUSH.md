# Push notifications

In-app notices (the bell) also go out as push notifications to players who
switch them on in Settings > Notifications. The server side is
`worker/push.js`; the app side is `src/lib/push.js`, `public/sw.js` (web) and
`@capacitor-firebase/messaging` (the iPhone and Android apps).

Rules: one push at a time per player (several notices fold into one), never
between 9 pm and 7 am Sydney time, at most two a day, and only the kinds the
player left on (Rivals, Your ground, Stories, Weekly round-up). The cron sends
every 15 minutes. Without the keys below, nothing is sent and the bell works
as before.

## 1. Web push (browsers and the iPhone home-screen app)

1. On your computer, in the foothold folder: `npm run vapid`
2. Cloudflare dashboard > Workers & Pages > foothold > Settings > Variables
   and Secrets > Add, type Secret:
   - `VAPID_PUBLIC_KEY`: the first value
   - `VAPID_PRIVATE_KEY`: the second value (the whole `{...}` line)
3. Deploy (any push to main), then Settings > Notifications > Push to this
   browser, and Send me a test.

## 2. The Android and iPhone apps (Firebase Cloud Messaging)

1. https://console.firebase.google.com > Add project > "Foothold" (Analytics
   off is fine).
2. Add an Android app with package `au.net.mcalister.foothold`. Download
   `google-services.json` into `android/app/`.
3. Add an iOS app with bundle id `au.net.mcalister.foothold`. Download
   `GoogleService-Info.plist`, and in Xcode drag it into App/App (tick "Copy
   items" and the App target).
4. Apple Developer > Keys > + > Apple Push Notifications service. Download the
   .p8 file. In Firebase > Project settings > Cloud Messaging > Apple app
   configuration, upload it with its Key ID and your Team ID.
5. In Xcode > App target > Signing & Capabilities > + Capability: Push
   Notifications, and Background Modes > Remote notifications.
6. Firebase > Project settings > Service accounts > Generate new private key.
   Add the whole JSON file's contents in Cloudflare as the secret
   `FCM_SERVICE_ACCOUNT`.
7. `npm run build && npx cap sync`, then run both apps.

Never paste any of these keys or files into a chat, a commit or an issue.
`google-services.json` and `GoogleService-Info.plist` are fine to keep out of
git; they are in `.gitignore`.
