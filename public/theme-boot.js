// Night mode before first paint (the same rule as src/lib/theme.js), kept
// out of index.html so the content security policy can ban inline scripts.
try {
  var fhRoot = document.documentElement
  var fhTheme = localStorage.getItem('fh-theme')
  var fhNight = fhTheme === 'night' || (fhTheme !== 'day' && matchMedia('(prefers-color-scheme: dark)').matches)
  fhRoot.dataset.theme = fhNight ? 'night' : 'day'
  if (fhNight) {
    fhRoot.classList.add('night')
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0F1916')
  }
  if (/^#\/app/.test(location.hash)) fhRoot.classList.add('in-app')
} catch (e) { /* storage blocked: the app sets it when it starts */ }