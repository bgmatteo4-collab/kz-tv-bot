// Capture les cartes d'info de l'outro en PNG transparents (outro/carte-1..6.png).
//   NODE_PATH=/opt/node-tools/node_modules node outro/capturer.js   (depuis stream-pack/)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const ici = path.join(process.cwd(), 'outro');
  const nav = await chromium.launch(), page = await nav.newPage({ viewport: { width: 1300, height: 900 } });
  await page.goto('file://' + path.join(ici, 'cartes.html'));
  await page.evaluate(() => document.fonts.ready);
  for (let k = 1; k <= 6; k++)
    await (await page.$('#i' + k)).screenshot({ path: path.join(ici, `carte-${k}.png`), omitBackground: true });
  await nav.close();
})();
