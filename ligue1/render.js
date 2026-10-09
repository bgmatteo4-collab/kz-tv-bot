#!/usr/bin/env node
// Rend la promo Ligue 1+ image par image avec Chromium (Playwright), puis l'encode avec ffmpeg.
//
//   node render.js                       → out/ligue1plus-promo.mp4 (1080p, 60 i/s, flou de mouvement)
//   node render.js --blur 1              → sans flou de mouvement (4× plus rapide)
//   node render.js --from 9 --to 15      → seulement un passage
//   node render.js --workers 2           → nombre de navigateurs en parallèle
//   node render.js --stills 1.2,5,12.5   → images fixes PNG dans out/stills/
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

function args() {
  const a = {
    fps: 60, blur: 4, from: 0, to: 46, workers: Math.max(1, Math.min(3, os.cpus().length - 1)),
    out: path.join(ROOT, 'out', 'ligue1plus-promo.mp4'), stills: null, query: '',
  };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i += 2) {
    const k = v[i].replace(/^--/, ''), x = v[i + 1];
    if (k === 'stills') a.stills = x.split(',').map(Number);
    else if (k === 'out' || k === 'query') a[k] = x;
    else a[k] = Number(x);
  }
  return a;
}

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// Un navigateur prêt à rendre : at(t) dessine l'image, shot() la capture en PNG.
async function open(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('Erreur dans la page :', e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  const cdp = await page.context().newCDPSession(page);
  return {
    browser,
    page,
    at: (t) => page.evaluate((x) => window.__render(x), t),
    // PNG sans perte, encodage rapide : environ 4× plus vite que page.screenshot().
    shot: async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64'),
  };
}

function encoder(file, a, sub) {
  // Flou de mouvement : sub images par image finale, obturateur à 180°, moyennées par ffmpeg.
  const vf = sub > 1 ? ['-vf', `tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${a.fps}*TB)`] : [];
  return spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(a.fps * sub), '-i', '-',
    ...vf, '-r', String(a.fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
}

async function renderRange(url, a, sub, first, last, file, progress) {
  const r = await open(url);
  const ff = encoder(file, a, sub);
  const closed = new Promise((ok) => ff.on('close', ok));
  for (let i = first; i < last; i++) {
    for (let j = 0; j < sub; j++) {
      await r.at(a.from + (i + (j / sub) * 0.5) / a.fps);
      const buf = await r.shot();
      if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok));
    }
    progress();
  }
  ff.stdin.end();
  await closed;
  await r.browser.close();
}

(async () => {
  const a = args();
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/index.html?render${a.query ? '&' + a.query : ''}`;

  if (a.stills) {
    const r = await open(url);
    const dir = path.join(ROOT, 'out', 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const t of a.stills) {
      await r.at(t);
      const file = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
      fs.writeFileSync(file, await r.shot());
      console.log(file);
    }
    await r.browser.close();
  } else {
    fs.mkdirSync(path.dirname(a.out), { recursive: true });
    const sub = Math.max(1, a.blur | 0);
    const total = Math.round((a.to - a.from) * a.fps);
    const n = Math.max(1, Math.min(a.workers | 0, total));
    const t0 = Date.now();
    let done = 0;
    const progress = () => {
      done++;
      if (done % 60 === 0 || done === total) {
        const s = (Date.now() - t0) / 1000;
        console.log(`${done}/${total} images · ${s.toFixed(0)} s écoulées · reste ~${((s / done) * (total - done)).toFixed(0)} s`);
      }
    };
    // Chaque navigateur rend un morceau continu ; les morceaux sont recollés sans réencodage.
    const parts = Array.from({ length: n }, (_, k) => ({
      first: Math.round((k * total) / n), last: Math.round(((k + 1) * total) / n),
      file: path.join(path.dirname(a.out), `.part-${k}.mp4`),
    }));
    await Promise.all(parts.map((p) => renderRange(url, a, sub, p.first, p.last, p.file, progress)));
    const list = path.join(path.dirname(a.out), '.parts.txt');
    fs.writeFileSync(list, parts.map((p) => `file '${path.basename(p.file)}'`).join('\n'));
    await new Promise((ok, ko) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', a.out], { stdio: 'inherit' })
      .on('close', (code) => (code === 0 ? ok() : ko(new Error(`ffmpeg concat : code ${code}`)))));
    parts.forEach((p) => fs.unlinkSync(p.file));
    fs.unlinkSync(list);
    console.log(`Vidéo : ${a.out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
