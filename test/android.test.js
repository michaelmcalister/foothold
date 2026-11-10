// The Android app's project settings: the sign-in link and the "recording"
// notification are added once and never twice, the Android app's address may
// call the API, and the app knows when it is the Android one.
import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { patchManifest, patchStrings, NOTIFY_ICON } from '../scripts/android.mjs'
import { isAndroidApp, allowRecordingNotice } from '../src/lib/native.js'

const MANIFEST = `<manifest>
    <application>
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
            </intent-filter>
        </activity>
    </application>
</manifest>`

const STRINGS = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Foothold</string>
    <string name="custom_url_scheme">au.net.mcalister.foothold</string>
</resources>`

describe('Android project settings', () => {
  it('lets the app open its own sign-in links, once', () => {
    const once = patchManifest(MANIFEST)
    expect(once).toContain('<data android:scheme="@string/custom_url_scheme" />')
    expect(once).toContain('android.intent.category.BROWSABLE')
    expect(once.indexOf('custom_url_scheme')).toBeLessThan(once.indexOf('</activity>'))
    expect(patchManifest(once)).toBe(once)
    expect(() => patchManifest('<manifest></manifest>')).toThrow()
  })

  it('names, colours and gives an icon to the recording notification, once', () => {
    const once = patchStrings(STRINGS)
    expect(once).toContain('>Recording your activity<')
    expect(once).toContain('>drawable/ic_stat_foothold<')
    expect(once).toContain('>#2E55E6<')
    expect(once.trim().endsWith('</resources>')).toBe(true)
    expect(patchStrings(once)).toBe(once)
    expect(NOTIFY_ICON).toContain('#FFFFFFFF') // status bar icons are white on clear
  })

  it('the committed project already has them, and the server lets the Android app in', () => {
    expect(readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')).toContain('@string/custom_url_scheme')
    expect(readFileSync('android/app/src/main/res/values/strings.xml', 'utf8')).toContain('capacitor_background_geolocation_notification_icon')
    expect(readFileSync('android/variables.gradle', 'utf8')).toMatch(/targetSdkVersion = (3[6-9]|[4-9]\d)/) // Google Play needs 36 or newer
    expect(readFileSync('wrangler.toml', 'utf8')).toMatch(/ALLOWED_ORIGINS = "[^"]*https:\/\/localhost/)
    expect(JSON.parse(readFileSync('capacitor.config.json', 'utf8')).android.useLegacyBridge).toBe(true) // GPS keeps going past 5 minutes in the background
  })
})

describe('knowing it is the Android app', () => {
  afterEach(() => { delete globalThis.window })
  const as = (platform) => { globalThis.window = { Capacitor: { isNativePlatform: () => !!platform, getPlatform: () => platform || 'web' } } }

  it('is true only inside the Android app', () => {
    as('android'); expect(isAndroidApp()).toBe(true)
    as('ios'); expect(isAndroidApp()).toBe(false)
    as(null); expect(isAndroidApp()).toBe(false)
  })

  it('asking to show the recording notice never throws, and does nothing outside Android', async () => {
    as('ios'); await expect(allowRecordingNotice()).resolves.toBeUndefined()
    as('android'); await expect(allowRecordingNotice()).resolves.toBeUndefined()
  })
})
