// Aperçu de la séquence navigateur : quelques instants capturés sur un fond sombre.
//   NODE_PATH=/opt/node-tools/node_modules node attente/apercu-nav.js 2 6 11 13 17 21   (depuis stream-pack/)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const ici = path.join(process.cwd(), 'attente');
  const temps = process.argv.slice(2).map(Number);
  const nav = await chromium.launch(), page = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
  const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto('file://' + path.join(ici, 'navigateur.html'));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
  await page.evaluate(() => { document.body.style.background = '#123'; });
  for (const t of temps) {
    await page.evaluate((x) => window.__render(x), t);
    await page.screenshot({ path: path.join(ici, `nav-${t}.png`) });
  }
  console.log('erreurs :', erreurs.join(' | ') || 'aucune');
  await nav.close();
})();
