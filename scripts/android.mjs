// Builds Foothold for the Android app (Capacitor) and keeps the Android
// Studio project set up. Run on the Mac (docs/ANDROID.md):
//   npm run android:init   first time: build, add the project, settings, icons
//   npm run android:sync   after pulling changes: build and copy into the project
// The bundled screens talk to the live Foothold server (FOOTHOLD_SERVER to
// change it). Settings go into android/app/src/main: the app's own link for
// sign-in (AndroidManifest.xml), the wording and colour of the "recording"
// notification (values/strings.xml) and its small white hex icon
// (drawable/ic_stat_foothold.xml). Running it again changes nothing that is
// already there.

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const SERVER = (process.env.FOOTHOLD_SERVER || 'https://foothold.michael-0d4.workers.dev').replace(/\/$/, '')
const MAIN = 'android/app/src/main'
const MANIFEST = `${MAIN}/AndroidManifest.xml`
const STRINGS = `${MAIN}/res/values/strings.xml`
const ICON = `${MAIN}/res/drawable/ic_stat_foothold.xml`
const mode = process.argv[2] || 'sync'

const run = (cmd, env = {}) => {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } })
}

/**
 * Let the app open its own links (au.net.mcalister.foothold://...), which is
 * how Auth0 and Spotify sign-ins come back. Pure: manifest text in, text out.
 */
export function patchManifest(xml) {
  if (xml.includes('@string/custom_url_scheme')) return xml
  const filter = [
    '    <intent-filter>',
    '                <action android:name="android.intent.action.VIEW" />',
    '                <category android:name="android.intent.category.DEFAULT" />',
    '                <category android:name="android.intent.category.BROWSABLE" />',
    '                <data android:scheme="@string/custom_url_scheme" />',
    '            </intent-filter>',
    '',
    '        ',
  ].join('\n')
  const end = xml.indexOf('</activity>')
  if (end < 0) throw new Error('No <activity> in AndroidManifest.xml')
  return xml.slice(0, end) + filter + xml.slice(end)
}

// The notification Android shows while a run records with the screen off
const NOTIFY = {
  capacitor_background_geolocation_notification_channel_name: 'Recording your activity',
  capacitor_background_geolocation_notification_icon: 'drawable/ic_stat_foothold',
  capacitor_background_geolocation_notification_color: '#2E55E6',
}

/** Add the recording notification's wording, icon and colour. Pure. */
export function patchStrings(xml) {
  let out = xml
  for (const [name, value] of Object.entries(NOTIFY)) {
    if (out.includes(`name="${name}"`)) continue
    const end = out.lastIndexOf('</resources>')
    out = `${out.slice(0, end)}    <string name="${name}">${value}</string>\n${out.slice(end)}`
  }
  return out
}

// A plain white hex, the shape Android wants for a status bar icon
export const NOTIFY_ICON = `<?xml version="1.0" encoding="utf-8"?>
<!-- Foothold's hex, white on clear: the small icon on the "recording" notification -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFFFF"
        android:pathData="M12,2L20.66,7L20.66,17L12,22L3.34,17L3.34,7Z" />
</vector>
`

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  run('npx vite build', { VITE_API_URL: SERVER })
  if (mode === 'init' && !existsSync('android')) run('npx cap add android')
  if (!existsSync(MANIFEST)) {
    console.error('\nNo Android project yet. Run npm run android:init first.')
    process.exit(1)
  }
  writeFileSync(MANIFEST, patchManifest(readFileSync(MANIFEST, 'utf8')))
  writeFileSync(STRINGS, patchStrings(readFileSync(STRINGS, 'utf8')))
  if (!existsSync(ICON)) writeFileSync(ICON, NOTIFY_ICON)
  console.log('\nThe Android project has Foothold’s sign-in link and recording notification.')
  if (mode === 'init' || mode === 'icons') run('npx @capacitor/assets generate --android --iconBackgroundColor "#16302A" --splashBackgroundColor "#16302A" --splashBackgroundColorDark "#16302A"')
  run('npx cap sync android')
  console.log('\nDone. Open it with: npx cap open android')
}
