// Capture chaque panneau Twitch en PNG (640 px de large ; Twitch l'affiche sur 320).
//   NODE_PATH=/opt/node-tools/node_modules node panneaux/capturer.js   (depuis stream-pack/)
const { chromium } = require('playwright');
const path = require('path');
const NOMS = ['discord', 'youtube', 'tiktok', 'x', 'planning', 'regles', 'badges'];
(async () => {
  const ici = path.join(process.cwd(), 'panneaux');
  const nav = await chromium.launch(), page = await nav.newPage({ viewport: { width: 1480, height: 1200 } });
  await page.goto('file://' + path.join(ici, 'panneaux.html'));
  await page.evaluate(() => document.fonts.ready);
  for (const n of NOMS) {
    const el = await page.$('#' + n);
    await el.screenshot({ path: path.join(ici, `panneau-${n}.png`), omitBackground: true });
    const b = await el.boundingBox();
    console.log(n, Math.round(b.width) + ' × ' + Math.round(b.height), '→ affiché', 320 + ' × ' + Math.round(b.height / 2));
  }
  await nav.close();
})();
