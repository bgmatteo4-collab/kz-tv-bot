// Captures des overlays : node cap.js (depuis stream-pack/overlays) → just-chatting-1/2/3.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 3400 } });
  await p.goto('file://' + __dirname + '/just-chatting.html'); await p.waitForTimeout(700);
  for (const k of [1, 2, 3]) await (await p.$('#v' + k)).screenshot({ path: __dirname + `/just-chatting-${k}.png` });
  await b.close();
})();
