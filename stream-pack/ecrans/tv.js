// Capture de l'écran d'accueil de la TV : node tv.js (depuis stream-pack/ecrans) → tv-2058.png, tv-2059.png (transparents)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 1500 } });
  await p.goto('file://' + __dirname + '/tv.html'); await p.waitForTimeout(600);
  for (const h of ['2058', '2059']) await (await p.$('#a' + h)).screenshot({ path: __dirname + '/tv-' + h + '.png', omitBackground: true });
  await b.close();
})();
