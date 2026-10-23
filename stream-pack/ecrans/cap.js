// Capture des trois écrans du setup : node cap.js (depuis stream-pack/ecrans)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1700, height: 1000 } });
  await p.goto('file://' + __dirname + '/ecrans.html'); await p.waitForTimeout(600);
  for (const id of ['obs', 'bureau', 'discord']) await (await p.$('#' + id)).screenshot({ path: __dirname + '/' + id + '.png' });
  await b.close();
})();
