// Capture du faux chat : node chat.js (depuis stream-pack/ecrans) → chat-cadre.png, chat-fil.png, chat.json
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 760, height: 8000 } });
  await p.goto('file://' + __dirname + '/chat.html'); await p.waitForTimeout(700);
  await (await p.$('#cadre')).screenshot({ path: __dirname + '/chat-cadre.png', omitBackground: true });
  await (await p.$('#fil')).screenshot({ path: __dirname + '/chat-fil.png' });
  const m = await p.evaluate(() => window.MESURES());
  m.tete = 70; m.pied = 150; m.ecran = 1280;
  fs.writeFileSync(__dirname + '/chat.json', JSON.stringify(m));
  console.log('messages', m.messages.length, 'hauteur', m.hauteur);
  await b.close();
})();
