#!/usr/bin/env node
// Rend le TikTok image par image (Chromium headless, 1080 × 1920), puis l'encode avec ffmpeg.
// La bande-son se fabrique à part (son.py) et se colle avec ./assembler.sh.
//
//   node render.js                        → out/video.mp4 (60 i/s, flou de mouvement adaptatif),
//                                           par segments de 10 s (out/segments-video/) : relancé après
//                                           une coupure, il reprend au premier segment manquant
//   node render.js --segments 0           → d'un seul tenant
//   node render.js --blur 1               → sans flou de mouvement (3× plus rapide)
//   node render.js --from 3 --to 7        → seulement un passage
//   node render.js --stills 1.2,5,9.5     → images fixes PNG dans out/stills/ (--dossier pour un autre)
//   node render.js --query seulement=pubs  → ne charge que ce chapitre (plus l'accroche)
//   node render.js --sons 1               → out/sons.json (la partition des bruitages)
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const SERVI = __dirname;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.json': 'application/json', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg' };

function args() {
  const a = {
    fps: 60, blur: 3, adaptatif: 1, from: 0, to: null, workers: Math.max(1, Math.min(3, os.cpus().length - 1)), segments: 10,
    out: path.join(ROOT, 'out', 'video.mp4'), stills: null, query: '',
  };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i += 2) {
    const k = v[i].replace(/^--/, ''), x = v[i + 1];
    if (k === 'stills') a.stills = x.split(',').map(Number);
    else if (k === 'out' || k === 'query' || k === 'dossier') a[k] = x;
    else a[k] = Number(x);
  }
  return a;
}

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(SERVI, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(SERVI) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// Un navigateur prêt à rendre : at(t) dessine l'image, shot() la capture en PNG.
async function open(url) {
  // Sans GPU : le canvas 2D est dessiné par Skia sur le processeur. Avec le GPU émulé (SwiftShader),
  // chaque capture coûtait ~3 s à rastériser la carte, contre ~0,35 s ainsi, pour la même image.
  const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-accelerated-2d-canvas', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('Erreur dans la page :', e.stack || e.message); process.exitCode = 1; });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('Console :', m.text().slice(0, 400)); });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: Number(process.env.ATTENTE || 180000) });
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
    const t = a.from + i / a.fps;
    // Flou de mouvement adaptatif : la page dit combien de sous-images il faut à cet instant ;
    // sur les passages calmes, une seule capture est répétée (même moyenne, trois fois moins cher).
    const n = a.adaptatif ? await r.page.evaluate((x) => (window.__sous ? window.__sous(x) : 1), t) : sub;
    let buf = null;
    for (let j = 0; j < sub; j++) {
      if (n > 1 || j === 0) {
        await r.at(a.from + (i + (j / sub) * 0.5) / a.fps);
        buf = await r.shot();
      }
      if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok));
    }
    progress();
  }
  ff.stdin.end();
  await closed;
  await r.browser.close();
}

// Les navigateurs se partagent le morceau en tranches continues, recollées sans réencodage.
async function rendreMorceau(url, a, sub, first, last, out, progress) {
  const n = Math.max(1, Math.min(a.workers | 0, last - first));
  const parts = Array.from({ length: n }, (_, k) => ({
    first: first + Math.round((k * (last - first)) / n), last: first + Math.round(((k + 1) * (last - first)) / n),
    file: `${out}.part-${k}.mp4`,
  }));
  await Promise.all(parts.map((p) => renderRange(url, a, sub, p.first, p.last, p.file, progress)));
  await concat(parts.map((p) => p.file), out);
  parts.forEach((p) => fs.unlinkSync(p.file));
}

async function concat(files, out) {
  const list = `${out}.txt`;
  fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f)}'`).join('\n'));
  await new Promise((ok, ko) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', '-f', 'mp4', out], { stdio: 'inherit' })
    .on('close', (code) => (code === 0 ? ok() : ko(new Error(`ffmpeg concat : code ${code}`)))));
  fs.unlinkSync(list);
}

// Empreinte de tout ce qui change l'image : le code, le style, la voix et les réglages du rendu.
function signature(a) {
  const h = crypto.createHash('sha1').update(JSON.stringify([a.fps, a.blur, a.adaptatif, a.from, a.to, a.query, a.segments]));
  const fichiers = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiers(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of [...fichiers(path.join(ROOT, 'js')), 'index.html', 'style.css', 'medias/voix.json'].map((f) => path.resolve(ROOT, f)).sort()) {
    if (fs.existsSync(f)) h.update(f).update(fs.readFileSync(f));
  }
  return h.digest('hex');
}

(async () => {
  const a = args();
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/index.html?render${a.query ? '&' + a.query : ''}`;

  if (a.sons) {
    const r = await open(url);
    fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'out', 'sons.json'), JSON.stringify(await r.page.evaluate(() => window.__sons), null, 1));
    console.log('out/sons.json');
    await r.browser.close();
  } else if (a.stills) {
    const r = await open(url);
    const dir = a.dossier ? path.resolve(ROOT, a.dossier) : path.join(ROOT, 'out', 'stills');
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
    if (a.to === null) { const r = await open(url); a.to = await r.page.evaluate(() => window.__duree); await r.browser.close(); }
    const sub = Math.max(1, a.blur | 0);
    const total = Math.round((a.to - a.from) * a.fps);
    const t0 = Date.now();
    // Segments [premier, dernier[ en images. Un segment fini est renommé d'un coup : un fichier
    // présent est complet. La signature (sources, voix, réglages) jette ceux d'un film qui a changé.
    const pas = a.segments > 0 ? Math.round(a.segments * a.fps) : total;
    const dossier = path.join(path.dirname(a.out), `segments-${path.basename(a.out, '.mp4')}`);
    const segs = [];
    for (let k = 0; k * pas < total; k++) segs.push({ first: k * pas, last: Math.min(total, (k + 1) * pas), file: path.join(dossier, `seg-${String(k).padStart(3, '0')}.mp4`) });
    const sig = signature(a);
    if (!fs.existsSync(path.join(dossier, 'signature')) || fs.readFileSync(path.join(dossier, 'signature'), 'utf8') !== sig) fs.rmSync(dossier, { recursive: true, force: true });
    fs.mkdirSync(dossier, { recursive: true });
    fs.writeFileSync(path.join(dossier, 'signature'), sig);
    const restants = segs.filter((g) => !fs.existsSync(g.file));
    const aFaire = restants.reduce((n, g) => n + g.last - g.first, 0);
    if (restants.length < segs.length) console.log(`Reprise : ${segs.length - restants.length}/${segs.length} segments déjà rendus`);
    let done = 0;
    const progress = () => {
      done++;
      if (done % 60 === 0 || done === aFaire) {
        const s = (Date.now() - t0) / 1000;
        console.log(`${done}/${aFaire} images · ${s.toFixed(0)} s écoulées · reste ~${((s / done) * (aFaire - done)).toFixed(0)} s`);
      }
    };
    for (const g of restants) {
      await rendreMorceau(url, a, sub, g.first, g.last, g.file + '.tmp.mp4', progress);
      fs.renameSync(g.file + '.tmp.mp4', g.file);
    }
    await concat(segs.map((g) => g.file), a.out);
    fs.rmSync(dossier, { recursive: true, force: true });
    console.log(`Vidéo : ${a.out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
