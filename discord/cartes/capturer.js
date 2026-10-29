const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 1 });
  await p.goto('file://' + __dirname + '/cartes.html');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  const cartes = [['c-clips','carte-1-communaute.png'],['c-plateau','carte-2-matchs.png'],
                  ['c-bureau','carte-3-staff.png'],['c-vocaux','carte-4-gaming.png']];
  for (const [id, out] of cartes) {
    await p.locator('#' + id).screenshot({ path: out, omitBackground: true });
    console.log('rendu', out);
  }
  await b.close();
})();
