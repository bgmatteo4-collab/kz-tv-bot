#!/usr/bin/env node
// Extrait les plans du storyboard en séquences JPEG (le Chromium headless ne lit pas le H.264).
//
//   node gta6/demo/extraire.js                  → tous les plans de clips.json
//   node gta6/demo/extraire.js --seul t1-03,t2-21
//   node gta6/demo/extraire.js --force          → réextrait même si le dossier est complet
//   node gta6/demo/extraire.js --planche        → seulement la planche de contrôle (gta6/out/controle/plans.jpg)
//
// Sortie : gta6/assets/frames/<id>/000001.jpg… (1920 px de large, JPEG q3, 30 i/s)
// + gta6/assets/frames/<id>/infos.json (nombre d'images, seconde source de la première image).
// Bornes : [debut - marge, fin + marge], arrondies à l'image près (30 i/s).
// gta6/assets/ n'est JAMAIS commité.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const GTA6 = path.resolve(__dirname, '..');
const ASSETS = path.join(GTA6, 'assets');
const CLIPS = JSON.parse(fs.readFileSync(path.join(__dirname, 'clips.json'), 'utf8'));

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const seul = opt('seul') ? String(opt('seul')).split(',') : null;
const force = !!opt('force');

// Indices d'images (30 i/s) de la séquence extraite, marge comprise.
function bornes(p) {
  const fps = CLIPS.fps, m = Math.round(CLIPS.marge * fps);
  const a = Math.max(0, Math.round(p.debut * fps) - m);
  const b = Math.round(p.fin * fps) + m;
  return { a, n: b - a, t0: a / fps };
}

function extraire(p) {
  const src = CLIPS.sources[p.source];
  const dir = path.join(ASSETS, 'frames', p.id);
  const { a, n, t0 } = bornes(p);
  const infos = path.join(dir, 'infos.json');
  if (!force && fs.existsSync(infos)) {
    const i = JSON.parse(fs.readFileSync(infos, 'utf8'));
    if (i.images === n && i.t0 === t0) { console.log(`${p.id} : déjà extrait (${n} images)`); return; }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const vf = [src.recadrage ? `crop=${src.recadrage}` : null, 'scale=1920:-2:flags=lanczos'].filter(Boolean).join(',');
  // -ss avant -i : saut rapide au point clé puis décodage exact jusqu'à t0 (ffmpeg ≥ 2.1).
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-ss', t0.toFixed(4), '-i', path.join(ASSETS, src.fichier),
    '-frames:v', String(n), '-vf', vf, '-q:v', '3', '-start_number', '1', path.join(dir, '%06d.jpg'),
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg a échoué pour ${p.id}`);
  const got = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(dir, '000001.jpg')]);
  const [w, h] = String(probe.stdout).trim().split(',').map(Number);
  fs.writeFileSync(infos, JSON.stringify({ id: p.id, images: got, attendu: n, t0, fps: CLIPS.fps, marge: CLIPS.marge, largeur: w, hauteur: h }, null, 1));
  console.log(`${p.id} : ${got}/${n} images ${w}×${h} depuis ${t0.toFixed(3)} s`);
  if (got !== n) console.warn(`  ATTENTION ${p.id} : ${got} images au lieu de ${n}`);
}

// Planche de contrôle : pour chaque plan, première image utile, milieu, dernière image utile.
function planche() {
  const out = path.join(GTA6, 'out', 'controle');
  fs.mkdirSync(out, { recursive: true });
  const m = Math.round(CLIPS.marge * CLIPS.fps);
  const lignes = [];
  for (const p of CLIPS.plans) {
    const dir = path.join(ASSETS, 'frames', p.id);
    if (!fs.existsSync(path.join(dir, 'infos.json'))) continue;
    const n = JSON.parse(fs.readFileSync(path.join(dir, 'infos.json'), 'utf8')).images;
    const idx = [1, m + 1, Math.round(n / 2), n - m, n];
    lignes.push({ id: p.id, files: idx.map((i) => path.join(dir, `${String(i).padStart(6, '0')}.jpg`)) });
  }
  // 5 colonnes : marge début | 1re image utile | milieu | dernière image utile | marge fin
  const inputs = [], filt = [];
  lignes.forEach((l, r) => l.files.forEach((f, c) => {
    inputs.push('-i', f);
    const k = r * 5 + c;
    filt.push(`[${k}:v]scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,drawtext=text='${l.id} ${['-m', 'debut', 'milieu', 'fin', '+m'][c]}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6[v${k}]`);
  }));
  const k = lignes.length * 5;
  const layout = Array.from({ length: k }, (_, i) => `${(i % 5) * 320}_${Math.floor(i / 5) * 180}`).join('|');
  filt.push(`${Array.from({ length: k }, (_, i) => `[v${i}]`).join('')}xstack=inputs=${k}:layout=${layout}[o]`);
  const file = path.join(out, 'plans.jpg');
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', filt.join(';'), '-map', '[o]', '-frames:v', '1', '-q:v', '4', file], { stdio: 'inherit' });
  if (r.status === 0) console.log(`Planche : ${file}`);
}

if (!opt('planche')) {
  const t = Date.now();
  for (const p of CLIPS.plans) if (!seul || seul.includes(p.id)) extraire(p);
  console.log(`Extraction terminée en ${((Date.now() - t) / 1000).toFixed(0)} s`);
  const du = spawnSync('du', ['-sh', path.join(ASSETS, 'frames')]);
  console.log(`Volume : ${String(du.stdout).trim()}`);
}
planche();
