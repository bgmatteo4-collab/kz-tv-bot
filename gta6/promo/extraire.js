#!/usr/bin/env node
// Extrait les plans de plans.json en séquences JPEG (le Chromium de rendu ne lit pas le H.264).
//   node extraire.js            → tous les plans
//   node extraire.js --seul jetski,vice
// Sortie : ../assets/promo/<id>/000001.jpg… + infos.json. gta6/assets/ n'est jamais commité.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ICI = __dirname;
const ASSETS = path.resolve(ICI, '..', 'assets');
const P = JSON.parse(fs.readFileSync(path.join(ICI, 'plans.json'), 'utf8'));
const i = process.argv.indexOf('--seul');
const seul = i > 0 ? process.argv[i + 1].split(',') : null;

for (const p of P.plans) {
  if (seul && !seul.includes(p.id)) continue;
  const src = P.sources[p.source];
  const fichier = path.join(ASSETS, src.fichier || path.join(src.dossier, p.fichier));
  const dir = path.join(ASSETS, 'promo', p.id);
  const marge = p.fin === null ? 0 : P.marge;
  const t0 = Math.max(0, p.debut - marge);
  const n = p.fin === null ? null : Math.round((p.fin + marge - t0) * P.fps);
  if (fs.existsSync(path.join(dir, 'infos.json'))) { console.log(`${p.id} : déjà extrait`); continue; }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-ss', t0.toFixed(3), '-i', fichier,
    ...(n ? ['-frames:v', String(n)] : []), '-vf', `fps=${P.fps},${src.vf}`, '-q:v', '3', path.join(dir, '%06d.jpg'),
  ], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`échec : ${p.id}`); continue; }
  const images = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
  const pr = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(dir, '000001.jpg')]);
  const [largeur, hauteur] = String(pr.stdout).trim().split(',').map(Number);
  fs.writeFileSync(path.join(dir, 'infos.json'), JSON.stringify({ id: p.id, images, t0, marge, fps: P.fps, largeur, hauteur }));
  console.log(`${p.id} : ${images} images ${largeur}×${hauteur}`);
}
