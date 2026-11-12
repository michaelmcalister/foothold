// Short links that preview nicely when shared in a message: /l/CODE (a
// league invite) and /g/CODE (a group run). Each is a tiny page with a title, description and picture
// for link previews, which then opens the app at the right screen. Nothing
// personal goes in the preview: just "a league on Foothold".
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function linkPage({ origin, title, description, to }) {
  const url = `${origin}${to}`
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Foothold">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${origin}/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(url)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head><body style="font-family:system-ui;background:#16302A;color:#fff;padding:24px">
<p><a style="color:#BFF0DC" href="${esc(url)}">Open Foothold</a></p></body></html>`
}

/** GET /l/CODE (a league) or /g/CODE (a group run), or undefined for any other path. */
export function handleShortLink(url) {
  const m = /^\/([lg])\/([A-Za-z0-9]{6})$/.exec(url.pathname)
  if (!m) return undefined
  const code = m[2].toUpperCase()
  const html = m[1] === 'l'
    ? linkPage({
      origin: url.origin,
      title: 'Join my league on Foothold',
      description: 'Run, walk or ride to take ground in your suburb. Join the league and see who holds the most streets this week.',
      to: `/#/app/leagues/join/${code}`,
    })
    : linkPage({
      origin: url.origin,
      title: 'Run a story with me on Foothold',
      description: 'A group run: we each run from wherever we are, hear the same story at the same time, and vote on where it goes.',
      to: `/#/app/record?group=${code}`,
    })
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
