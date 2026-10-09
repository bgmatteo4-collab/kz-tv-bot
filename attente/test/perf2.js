const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const q of ['', 'noaa', 'noaa&nobloom', 'noaa&nobars', 'noaa&nopts', 'noaa&nophys', 'noaa&nobloom&nobars&nopts&nophys']) {
    await p.goto(`http://127.0.0.1:${srv.address().port}/test/perf.html?${q}`);
    await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
    let a = Date.now();
    for (let i = 0; i < 4; i++) { await p.evaluate((t) => { window.__render(t); const gl = document.querySelector('canvas').getContext('webgl2'); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return px[0]; }, i / 60); }
    console.log((q || 'tout').padEnd(40), ((Date.now() - a) / 4).toFixed(0), 'ms/image');
  }
  await b.close(); srv.close();
});
