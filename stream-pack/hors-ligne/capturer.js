// Capture l'écran hors ligne en PNG 1920 × 1080 (hors-ligne/hors-ligne.png).
//   NODE_PATH=/opt/node-tools/node_modules node hors-ligne/capturer.js   (depuis stream-pack/)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const ici = path.join(process.cwd(), 'hors-ligne');
  const nav = await chromium.launch(), page = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(ici, 'hors-ligne.html'));
  await page.evaluate(() => document.fonts.ready);
  await (await page.$('#ecran')).screenshot({ path: path.join(ici, 'hors-ligne.png') });
  await nav.close();
})();
