// Capture le logo (trois fonds, 800 × 800) et la bannière (1200 × 480) en PNG.
//   NODE_PATH=/opt/node-tools/node_modules node logo/capturer.js   (depuis stream-pack/)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const ici = path.join(process.cwd(), 'logo');
  const nav = await chromium.launch(), page = await nav.newPage({ viewport: { width: 2700, height: 1800 } });
  await page.goto('file://' + path.join(ici, 'logo.html'));
  await page.evaluate(() => document.fonts.ready);
  for (const id of ['logo-encre', 'logo-nuit', 'logo-teal', 'banniere'])
    await (await page.$('#' + id)).screenshot({ path: path.join(ici, `${id}.png`) });
  await nav.close();
})();
