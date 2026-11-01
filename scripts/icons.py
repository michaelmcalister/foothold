# Renders the PNG app icons (PWA and iPhone home screen) from the logo.
# Run: python3 scripts/icons.py  (needs Playwright and Chrome)
import asyncio
from playwright.async_api import async_playwright

MARK = ('<polygon points="112,60 86,105.03 34,105.03 8,60 34,14.97 86,14.97" fill="#2E55E6" stroke="#2E55E6" '
        'stroke-width="6" stroke-linejoin="round"/><path d="M47 84V37h31M47 60h24" fill="none" stroke="#F3F5EF" '
        'stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>')

def icon(size, rx, inset):
    scale = (180 - inset * 2) / 120
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 180 180">'
            f'<rect width="180" height="180" rx="{rx}" fill="#16302A"/>'
            f'<g transform="translate({inset} {inset}) scale({scale})">{MARK}</g></svg>')

ICONS = [
    ('icon-192.png', 192, 40, 26),
    ('icon-512.png', 512, 40, 26),
    ('maskable-512.png', 512, 0, 45),
    ('apple-touch-icon.png', 180, 0, 30),
]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for name, size, rx, inset in ICONS:
            pg = await b.new_page(viewport={'width': size, 'height': size})
            await pg.set_content('<html><body style="margin:0;background:transparent">' + icon(size, rx, inset) + '</body></html>')
            await pg.screenshot(path=f'public/icons/{name}', omit_background=True)
        await b.close()

asyncio.run(main())
