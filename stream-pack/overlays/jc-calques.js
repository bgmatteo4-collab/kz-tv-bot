// Calques de l'overlay Just Chatting : node jc-calques.js (depuis stream-pack/overlays) → jc-fixe.png, jc-r1.png … jc-r4.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 5500 } });
  await p.goto('file://' + process.cwd() + '/jc-calques.html'); await p.waitForTimeout(700);
  for (const id of ['fixe', 'r1', 'r2', 'r3', 'r4']) await (await p.$('#' + id)).screenshot({ path: process.cwd() + `/jc-${id}.png`, omitBackground: true });
  await b.close();
})();
