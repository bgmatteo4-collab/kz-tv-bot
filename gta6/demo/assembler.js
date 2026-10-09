#!/usr/bin/env node
// Assemble le film : colle les 6 actes, fabrique la bande-son du storyboard, sort le MP4 final
// et une copie de moins de 30 Mo (deux passes) pour l'envoyer dans la conversation.
//
//   node gta6/demo/assembler.js            → gta6/out/gta6-demo.mp4 + gta6/out/gta6-demo-30mo.mp4
//   node gta6/demo/assembler.js --son      → seulement la bande-son (gta6/out/bande-son.wav)
//   options : --petit 1280x720 (définition de la copie légère, défaut 1280x720 à 60 i/s)
//             --cible 29 (taille visée de la copie légère, en Mo)
//
// Un acte manquant (gta6/out/acte-N.mp4 absent) est remplacé par l'image de raccord fixe pendant
// sa durée, avec un avertissement : on peut assembler à tout moment pour juger le rythme.
// Les actes sont recollés sans réencodage (même réglages x264 dans render.js) : 139,0 s exactement
// si chaque acte a le bon nombre d'images (durée × 60).
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const GTA6 = path.resolve(__dirname, '..');
const OUT = path.join(GTA6, 'out');
const AUDIO = path.join(GTA6, 'assets', 'audio');
const DUREES = [17.1, 26.9, 20.8, 39.2, 21.6, 13.4];
const FPS = 60;

// Bande-son (voir gta6/storyboard.md, section « Bande-son »). Secondes dans les pistes sources.
// Le début de la chanson du trailer 2 (71,24 s) vient de l'analyse d'énergie documentée dans
// le storyboard : temps fort de la grille à 130 BPM, sur la coupe qui suit « Rockstar Games presents ».
const BANDE_SON = [
  { piste: 'trailer-1.wav', de: 0.2, a: 65.0, entree: 0, sortie: 0.8 },        // 0:00.0 → 1:04.8 (actes 1 à 3)
  { piste: 'trailer-2.wav', de: 71.24, a: 132.04, entree: 0.02, sortie: 0.12 }, // 1:04.8 → 2:05.6 (actes 4 et 5)
  { piste: 'trailer-2.wav', de: 153.3, a: 166.7, entree: 0.25, sortie: 0.4 },   // 2:05.6 → 2:19.0 (acte 6)
];

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };

function ff(args, nom) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit', cwd: OUT });
  if (r.status !== 0) throw new Error(`ffmpeg a échoué (${nom})`);
}
function images(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file]);
  return Number(String(r.stdout).trim());
}

function bandeSon() {
  const file = path.join(OUT, 'bande-son.wav');
  const inputs = [], f = [];
  BANDE_SON.forEach((s, i) => {
    inputs.push('-i', path.join(AUDIO, s.piste));
    const d = s.a - s.de;
    const fx = [`atrim=${s.de}:${s.a}`, 'asetpts=PTS-STARTPTS'];
    if (s.entree > 0) fx.push(`afade=t=in:st=0:d=${s.entree}`);
    if (s.sortie > 0) fx.push(`afade=t=out:st=${(d - s.sortie).toFixed(3)}:d=${s.sortie}`);
    f.push(`[${i}:a]${fx.join(',')},aformat=sample_rates=48000:channel_layouts=stereo[s${i}]`);
  });
  f.push(`${BANDE_SON.map((_, i) => `[s${i}]`).join('')}concat=n=${BANDE_SON.length}:v=0:a=1[o]`);
  ff([...inputs, '-filter_complex', f.join(';'), '-map', '[o]', '-c:a', 'pcm_s16le', file], 'bande-son');
  const total = BANDE_SON.reduce((s, x) => s + x.a - x.de, 0);
  console.log(`Bande-son : ${file} (${total.toFixed(2)} s)`);
  return file;
}

function video() {
  const raccord = path.join(OUT, 'raccord.png');
  const liste = [];
  DUREES.forEach((d, i) => {
    const n = Math.round(d * FPS);
    let file = path.join(OUT, `acte-${i + 1}.mp4`);
    if (!fs.existsSync(file)) {
      if (!fs.existsSync(raccord)) {
        const r = spawnSync('node', [path.join(__dirname, 'render.js'), '--raccord'], { stdio: 'inherit' });
        if (r.status !== 0) throw new Error('Impossible de rendre l\'image de raccord');
      }
      file = path.join(OUT, `.provisoire-${i + 1}.mp4`);
      console.warn(`ATTENTION : acte ${i + 1} absent, remplacé par l'image de raccord (${d} s)`);
      ff(['-loop', '1', '-framerate', String(FPS), '-i', raccord, '-frames:v', String(n), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', file], `provisoire ${i + 1}`);
    } else {
      const k = images(file);
      if (k !== n) console.warn(`ATTENTION : acte ${i + 1} a ${k} images au lieu de ${n} (${d} s × ${FPS}) : la bande-son va glisser`);
    }
    liste.push(`file '${path.basename(file)}'`);
  });
  const txt = path.join(OUT, '.actes.txt');
  fs.writeFileSync(txt, liste.join('\n'));
  const file = path.join(OUT, '.video-seule.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', txt, '-c', 'copy', file], 'concat');
  fs.unlinkSync(txt);
  return file;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const son = bandeSon();
  if (opt('son', false)) return;
  const vid = video();
  const film = path.join(OUT, 'gta6-demo.mp4');
  ff(['-i', vid, '-i', son, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', film], 'mux');
  console.log(`Film : ${film} (${(fs.statSync(film).size / 1048576).toFixed(1)} Mo)`);

  // Copie légère : deux passes x264, débit calculé pour tenir sous la cible.
  const cible = Number(opt('cible', 29));
  const [w, h] = String(opt('petit', '1280x720')).split('x').map(Number);
  const duree = DUREES.reduce((a, b) => a + b, 0);
  const audioK = 128;
  const videoK = Math.floor((cible * 8 * 1048576 * 0.97) / duree / 1000 - audioK);
  const petit = path.join(OUT, 'gta6-demo-30mo.mp4');
  const commun = ['-i', film, '-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${videoK}k`, '-pix_fmt', 'yuv420p'];
  ff([...commun, '-pass', '1', '-passlogfile', '.x264-2passes', '-an', '-f', 'mp4', '/dev/null'], 'passe 1');
  ff([...commun, '-pass', '2', '-passlogfile', '.x264-2passes', '-c:a', 'aac', '-b:a', `${audioK}k`, '-movflags', '+faststart', petit], 'passe 2');
  for (const f of fs.readdirSync(OUT)) if (f.startsWith('.x264-2passes') || f.startsWith('.provisoire-') || f === '.video-seule.mp4') fs.unlinkSync(path.join(OUT, f));
  console.log(`Copie légère : ${petit} (${(fs.statSync(petit).size / 1048576).toFixed(1)} Mo, ${w}×${h}, ${videoK} kb/s)`);
}

main();
