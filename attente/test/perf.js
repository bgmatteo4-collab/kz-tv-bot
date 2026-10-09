const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', (m) => console.log('console:', m.text())); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/test/perf.html`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const cdp = await p.context().newCDPSession(p);
  console.log('GL:', await p.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'; }));
  let a = Date.now(); for (let i = 0; i < 5; i++) await p.evaluate((t) => window.__render(t), i / 60); const ren = (Date.now() - a) / 5;
  a = Date.now(); for (let i = 0; i < 5; i++) { const d = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true }); if (i === 4) fs.writeFileSync(path.join(__dirname, 'perf.png'), Buffer.from(d.data, 'base64')); } const cap = (Date.now() - a) / 5;
  console.log(`rendu ${ren} ms · capture ${cap} ms`);
  await b.close(); srv.close();
});
