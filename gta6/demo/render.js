#!/usr/bin/env node
// Rend un acte de la démo GTA 6 image par image avec Chromium (Playwright), puis l'encode avec ffmpeg.
// Repris de intro/render.js. Serveur statique enraciné sur gta6/ : les pages trouvent
// /assets/frames/… (plans extraits), /assets/captures/…, /demo/lib/…
//
//   node gta6/demo/render.js --acte 2                  → gta6/out/acte-2.mp4 (1080p, 60 i/s, flou de mouvement ×4)
//   node gta6/demo/render.js --acte 2 --blur 1         → sans flou de mouvement (4× plus rapide, pour les essais)
//   node gta6/demo/render.js --acte 2 --from 3 --to 9  → seulement un passage (→ gta6/out/acte-2_3-9.mp4)
//   node gta6/demo/render.js --acte 2 --stills 1.5,4,9 → images PNG dans gta6/out/stills/acte-2/
//   node gta6/demo/render.js --acte 2 --verifier       → compare t = 0 et t = durée à l'image de raccord
//   node gta6/demo/render.js --raccord                 → gta6/out/raccord.png (image de raccord de référence)
//   node gta6/demo/render.js --serveur                 → sert gta6/ sur http://127.0.0.1:8060 pour l'aperçu
//   options : --workers 3 (navigateurs en parallèle ; 1 ou 2 si d'autres équipes rendent en même temps),
//             --grain 6 (grain ajouté par ffmpeg, 0 = sans), --query "a=1" (ajouté à l'URL), --out fichier.mp4
//
// Lancer avec : NODE_PATH=$(npm root -g) node gta6/demo/render.js …  (Playwright est installé globalement)
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(spawnSync('npm', ['root', '-g']).stdout.toString().trim(), 'playwright')));
}

const ROOT = path.resolve(__dirname, '..');          // gta6/
const OUT = path.join(ROOT, 'out');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.txt': 'text/plain',
};

function args() {
  const a = { fps: 60, blur: 4, grain: 6, from: 0, to: null, workers: Math.max(1, Math.min(3, os.cpus().length - 1)), out: null, stills: null, query: '', acte: null };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    const k = v[i].replace(/^--/, '');
    if (['verifier', 'raccord', 'serveur'].includes(k)) { a[k] = true; continue; }
    const x = v[++i];
    if (k === 'stills') a.stills = x.split(',').map(Number);
    else if (k === 'out' || k === 'query') a[k] = x;
    else a[k] = Number(x);
  }
  return a;
}

function serve(port = 0) {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'max-age=3600' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

// Un navigateur prêt à rendre : at(t) dessine l'image (attend la promesse de __render), shot() la capture.
async function open(url) {
  const browser = await chromium.launch({ args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('Erreur dans la page :', e.message); process.exitCode = 1; });
  page.on('console', (m) => {
    // Les messages de performance de SwiftShader (« GPU stall due to ReadPixels ») sont normaux.
    if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GroupMarkerNotSet/.test(m.text())) console.error(`[page] ${m.text()}`);
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const cdp = await page.context().newCDPSession(page);
  return {
    browser,
    page,
    duree: await page.evaluate(() => window.__duration),
    at: (t) => page.evaluate((x) => window.__render(x), t),
    // PNG sans perte, encodage rapide : environ 4× plus vite que page.screenshot().
    shot: async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64'),
  };
}

function encoder(file, a, sub) {
  // Flou de mouvement : sub images par image finale, obturateur à 180°, moyennées par ffmpeg.
  // Grain de pellicule ajouté ensuite (bruit de luminance, différent à chaque image).
  const f = [];
  if (sub > 1) f.push(`tmix=frames=${sub}`, `select='eq(mod(n\\,${sub})\\,${sub - 1})'`, `setpts=N/(${a.fps}*TB)`);
  if (a.grain > 0) f.push(`noise=c0s=${a.grain}:c0f=t+u`);
  const vf = f.length ? ['-vf', f.join(',')] : [];
  return spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(a.fps * sub), '-i', '-',
    ...vf, '-r', String(a.fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
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

// Écart entre deux PNG (PSNR ffmpeg) : « inf » = identiques au pixel près.
function psnr(a, b) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-']);
  const m = String(r.stderr).match(/average:([0-9.]+|inf)/);
  return m ? (m[1] === 'inf' ? Infinity : Number(m[1])) : NaN;
}

async function raccordPng(base) {
  const file = path.join(OUT, 'raccord.png');
  const r = await open(`${base}/demo/lib/raccord.html?render`);
  await r.at(0);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file, await r.shot());
  await r.browser.close();
  return file;
}

(async () => {
  const a = args();
  if (a.serveur) {
    const s = await serve(8060);
    console.log('Aperçu : http://127.0.0.1:8060/demo/acte-0/index.html?dev  (Ctrl+C pour arrêter)');
    return s;
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;

  if (a.raccord) {
    console.log(await raccordPng(base));
    server.close();
    return;
  }
  if (a.acte === null || Number.isNaN(a.acte)) throw new Error('Préciser --acte N (0 à 6)');
  const url = `${base}/demo/acte-${a.acte}/index.html?render${a.query ? '&' + a.query : ''}`;

  if (a.verifier) {
    const ref = await raccordPng(base);
    const r = await open(url);
    const dir = path.join(OUT, 'stills', `acte-${a.acte}`);
    fs.mkdirSync(dir, { recursive: true });
    let ok = true;
    for (const [nom, t] of [['debut', 0], ['fin', r.duree]]) {
      await r.at(t);
      const file = path.join(dir, `raccord-${nom}.png`);
      fs.writeFileSync(file, await r.shot());
      const p = psnr(ref, file);
      const bon = p === Infinity || p > 60;
      ok = ok && bon;
      console.log(`Raccord ${nom} (t = ${t} s) : PSNR ${p === Infinity ? 'inf (identique)' : p.toFixed(1) + ' dB'} → ${bon ? 'OK' : 'DIFFÉRENT'}  ${file}`);
    }
    await r.browser.close();
    server.close();
    if (!ok) process.exitCode = 2;
    return;
  }

  if (a.stills) {
    const r = await open(url);
    const dir = path.join(OUT, 'stills', `acte-${a.acte}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const t of a.stills) {
      const t0 = Date.now();
      await r.at(t);
      const file = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
      fs.writeFileSync(file, await r.shot());
      console.log(`${file} (${Date.now() - t0} ms)`);
    }
    await r.browser.close();
  } else {
    // Durée lue dans la page (window.__duration) si --to n'est pas donné.
    if (a.to === null) {
      const r = await open(url);
      a.to = r.duree;
      await r.browser.close();
    }
    const partiel = a.from > 0 || process.argv.includes('--to');
    a.out = a.out || path.join(OUT, partiel ? `acte-${a.acte}_${a.from}-${a.to}.mp4` : `acte-${a.acte}.mp4`);
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
      file: path.join(path.dirname(a.out), `.part-${a.acte}-${k}.mp4`),
    }));
    await Promise.all(parts.map((p) => renderRange(url, a, sub, p.first, p.last, p.file, progress)));
    const list = path.join(path.dirname(a.out), `.parts-${a.acte}.txt`);
    fs.writeFileSync(list, parts.map((p) => `file '${path.basename(p.file)}'`).join('\n'));
    await new Promise((ok, ko) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', a.out], { stdio: 'inherit' })
      .on('close', (code) => (code === 0 ? ok() : ko(new Error(`ffmpeg concat : code ${code}`)))));
    parts.forEach((p) => fs.unlinkSync(p.file));
    fs.unlinkSync(list);
    const s = (Date.now() - t0) / 1000;
    console.log(`Vidéo : ${a.out} (${s.toFixed(0)} s, ${((s * 1000 * n) / (total * sub)).toFixed(0)} ms par sous-image et par navigateur, ${n} navigateurs)`);
  }
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
