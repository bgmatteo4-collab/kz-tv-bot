// Capture les cartes d'info en PNG transparents (attente/carte-1..6.png).
//   NODE_PATH=/opt/node-tools/node_modules node attente/capturer.js   (depuis stream-pack/)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const ici = path.join(process.cwd(), 'attente');
  const nav = await chromium.launch(), page = await nav.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto('file://' + path.join(ici, 'cartes.html'));
  await page.evaluate(() => document.fonts.ready);
  for (let k = 1; k <= 6; k++)
    await (await page.$('#i' + k)).screenshot({ path: path.join(ici, `carte-${k}.png`), omitBackground: true });
  await nav.close();
})();
