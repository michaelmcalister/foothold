// Builds Foothold for the iPhone app (Capacitor) and keeps the Xcode project
// set up. Run on the Mac (docs/IOS.md):
//   npm run ios:init   first time: build, add the Xcode project, settings, icons
//   npm run ios:sync   after pulling changes: build and copy into Xcode
// The bundled screens talk to the live Foothold server (FOOTHOLD_SERVER to
// change it). Settings go into ios/App/App/Info.plist: permission wording,
// background GPS and audio, the app's own link for sign-in, and the export
// compliance answer. Running it again changes nothing that is already there.

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const SERVER = (process.env.FOOTHOLD_SERVER || 'https://foothold.michael-0d4.workers.dev').replace(/\/$/, '')
const APP_ID = 'au.net.mcalister.foothold'
const PLIST = 'ios/App/App/Info.plist'
const mode = process.argv[2] || 'sync'

const run = (cmd, env = {}) => {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } })
}

// What iOS shows when Foothold asks for each permission
const STRINGS = {
  NSLocationWhenInUseUsageDescription: 'Foothold uses your location to record your runs, walks and rides, draw your route and work out the ground you take.',
  NSLocationAlwaysAndWhenInUseUsageDescription: 'Foothold keeps recording your route while your phone is locked or in your pocket, until you finish the activity.',
  NSMicrophoneUsageDescription: 'Foothold listens for your answers to mission questions when you choose to answer out loud.',
  NSSpeechRecognitionUsageDescription: 'Foothold turns your spoken answers to mission questions into text, so you can play hands free.',
}

/** Add the settings Foothold needs to Info.plist. Pure: plist text in, text out. */
export function patchPlist(xml) {
  let out = xml
  const add = (key, valueXml) => {
    if (out.includes(`<key>${key}</key>`)) return
    const end = out.lastIndexOf('</dict>')
    out = `${out.slice(0, end)}\t<key>${key}</key>\n\t${valueXml}\n${out.slice(end)}`
  }
  for (const [k, v] of Object.entries(STRINGS)) add(k, `<string>${v}</string>`)
  add('UIBackgroundModes', '<array>\n\t\t<string>location</string>\n\t\t<string>audio</string>\n\t</array>')
  add('CFBundleURLTypes', `<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>${APP_ID}</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${APP_ID}</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>`)
  add('ITSAppUsesNonExemptEncryption', '<false/>')
  return out
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  run('npx vite build', { VITE_API_URL: SERVER })
  if (mode === 'init' && !existsSync('ios')) run('npx cap add ios')
  if (!existsSync(PLIST)) {
    console.error('\nNo Xcode project yet. Run npm run ios:init first.')
    process.exit(1)
  }
  writeFileSync(PLIST, patchPlist(readFileSync(PLIST, 'utf8')))
  console.log('\nInfo.plist has Foothold’s permissions, background modes and sign-in link.')
  if (mode === 'init' || mode === 'icons') run('npx @capacitor/assets generate --ios --iconBackgroundColor "#16302A" --splashBackgroundColor "#16302A" --splashBackgroundColorDark "#16302A"')
  run('npx cap sync ios')
  console.log('\nDone. Open it with: npx cap open ios')
}
