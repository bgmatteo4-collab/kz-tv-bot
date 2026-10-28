// Rend la séquence navigateur image par image en PNG transparents, pour attente.py.
//   NODE_PATH=/opt/node-tools/node_modules node attente/frames-nav.js <dossier>   (depuis stream-pack/)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FPS = 30, DUREE = 25;
(async () => {
  const ici = path.join(process.cwd(), 'attente');
  const dossier = process.argv[2]; fs.mkdirSync(dossier, { recursive: true });
  const nav = await chromium.launch(), page = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
  const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto('file://' + path.join(ici, 'navigateur.html'));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
  const cdp = await page.context().newCDPSession(page);
  // fond transparent : attente.py pose la fenêtre sur le motif d'encre
  await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (let f = 0; f < DUREE * FPS; f++) {
    await page.evaluate((t) => window.__render(t), f / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
    fs.writeFileSync(path.join(dossier, String(f).padStart(4, '0') + '.png'), Buffer.from(data, 'base64'));
    if (f % 150 === 0) console.log(f, '/', DUREE * FPS);
  }
  console.log('erreurs :', erreurs.join(' | ') || 'aucune');
  await nav.close();
})();
