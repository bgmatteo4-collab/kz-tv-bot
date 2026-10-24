// Exporte les badges d'abonné au format Twitch : badges/twitch/<mois>-mois-<taille>.png (18, 36, 72 px, fond transparent).
//   NODE_PATH=/opt/node-tools/node_modules node badges/exporter.js   (depuis stream-pack/)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const ici = path.join(process.cwd(), 'badges'), dossier = path.join(ici, 'twitch'); fs.mkdirSync(dossier, { recursive: true });
  const nav = await chromium.launch(), page = await nav.newPage();
  await page.goto('file://' + path.join(ici, 'badges.html'));
  await page.evaluate(() => document.fonts.ready);
  for (const m of [1, 3, 6, 12, 24]) for (const t of [18, 36, 72]) {
    await page.evaluate(([m, t]) => { document.body.innerHTML = svg(m, t); document.body.style.background = 'transparent'; }, [m, t]);
    await page.setViewportSize({ width: t, height: t });
    await (await page.$('svg')).screenshot({ path: path.join(dossier, `${m}-mois-${t}.png`), omitBackground: true });
  }
  await nav.close();
})();
