// Exporte les 24 emotes texte au format Twitch : PNG transparents 112, 56 et 28 px dans emotes/twitch/<taille>/kayzx<NOM>.png.
//   NODE_PATH=/opt/node-tools/node_modules node emotes/exporter.js   (depuis stream-pack/)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const ici = path.join(process.cwd(), 'emotes'), police = 'file://' + path.join(process.cwd(), 'da', 'Rubik-3.ttf');
  const nav = await chromium.launch(), page = await nav.newPage();
  await page.goto('file://' + path.join(ici, 'emotes-texte.html'));
  const E = await page.evaluate('E');
  for (const t of [112, 56, 28]) {
    const dossier = path.join(ici, 'twitch', String(t)); fs.mkdirSync(dossier, { recursive: true });
    await page.setViewportSize({ width: t, height: t });
    for (const [nom, c] of Object.entries(E)) {
      await page.setContent(`<style>@font-face{font-family:Rubik;font-weight:900;src:url(${police})}*{margin:0}html,body{background:transparent}</style>
        <svg width="${t}" height="${t}" viewBox="0 0 112 112" style="display:block"><g>${c}</g></svg>`);
      await page.evaluate(() => document.fonts.ready);
      // Recadrage : la boîte du dessin + 8 (moitié du contour papier) + 2 de marge, en carré, jamais plus petit que 112.
      await page.evaluate(() => {
        const b = document.querySelector('g').getBBox(), m = 10;
        const x0 = Math.min(0, b.x - m), y0 = Math.min(0, b.y - m), x1 = Math.max(112, b.x + b.width + m), y1 = Math.max(112, b.y + b.height + m);
        const c = Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        document.querySelector('svg').setAttribute('viewBox', `${cx - c / 2} ${cy - c / 2} ${c} ${c}`);
      });
      await page.screenshot({ path: path.join(dossier, `kayzx${nom}.png`), omitBackground: true });
    }
  }
  await nav.close();
})();
