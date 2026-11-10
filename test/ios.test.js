// The iPhone app setup: the Info.plist patch adds everything Foothold needs
// once, the native helpers stay out of the way on the website, and top bars
// clear the iPhone's clock and battery.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { patchPlist } from '../scripts/ios.mjs'
import { isNativeApp, appLink, webOrigin, APP_ID } from '../src/lib/native.js'

const PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
\t<key>CFBundleDisplayName</key>
\t<string>Foothold</string>
</dict>
</plist>
`

describe('iPhone app setup', () => {
  it('adds permissions, background modes, the sign-in link and the encryption answer', () => {
    const out = patchPlist(PLIST)
    for (const k of ['NSLocationWhenInUseUsageDescription', 'NSLocationAlwaysAndWhenInUseUsageDescription', 'NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription', 'UIBackgroundModes', 'CFBundleURLTypes', 'ITSAppUsesNonExemptEncryption']) {
      expect(out, k).toContain(`<key>${k}</key>`)
    }
    expect(out).toContain('<string>location</string>')
    expect(out).toContain('<string>audio</string>')
    expect(out).toContain(`<string>${APP_ID}</string>`)
    expect(out.trim().endsWith('</plist>')).toBe(true)
    expect(out).not.toMatch(/[–—]/) // no dashes in what people read
  })
  it('changes nothing the second time', () => {
    const once = patchPlist(PLIST)
    expect(patchPlist(once)).toBe(once)
  })
  it('stays out of the way on the website', () => {
    expect(isNativeApp()).toBe(false)
    expect(appLink('spotify-callback')).toBe('au.net.mcalister.foothold://spotify-callback')
    globalThis.location ??= { origin: 'https://foothold.example' }
    expect(webOrigin()).toBe(globalThis.location.origin)
  })

  it('make room for the clock and camera instead of squashing the top bar', () => {
    const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
    expect(read('src/app/AppShell.vue')).toContain('height: calc(var(--top-h) + env(safe-area-inset-top))')
    expect(read('src/views/app/MapView.vue')).toMatch(/\.mapview \{[^}]*var\(--top-h\) - env\(safe-area-inset-top\)/)
  })
})

describe('top bars in the app', () => {
  it('sit below the clock and battery on every screen outside the app frame', () => {
    const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
    expect(read('index.html')).toContain('viewport-fit=cover')
    expect(read('src/style.css')).not.toMatch(/^\.top \{/m) // a bare .top would pad every card's top row
    for (const f of ['src/style.css', 'src/views/Privacy.vue', 'src/views/try/TryView.vue', 'src/views/app/OnboardingView.vue', 'src/app/AppShell.vue']) {
      expect(read(f), f).toContain('env(safe-area-inset-top)')
    }
  })
})
