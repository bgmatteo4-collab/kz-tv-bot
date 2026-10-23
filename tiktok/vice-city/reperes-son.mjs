// Repères de la bande-son, tirés du même minutage et des mêmes formules que l'image (main.js) :
// chaque bruitage tombe sur le geste qu'il accompagne.
import { calculer } from './js/partition.js';
import { E, hash, prog } from './js/outils.js';
import fs from 'fs';

const lire = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url)));
const v = lire('./medias/voix.json');
const T = calculer(v.durees, v.mots), L = (id) => T.ligne(id).debut, m = T.mot;

// Tuiles de l'accroche : instant où chacune se pose, et sa position (pour le panoramique).
const tuiles = [];
for (let r = 0; r < 20; r++) for (let c = 0; c < 15; c++) {
  const dist = Math.hypot(c * 256 + 128 - 2880, r * 256 + 128 - 2610);
  tuiles.push([0.1 + dist / 5200 * 3.4 + hash(r * 15 + c) * 0.3 + 0.55, (c * 256 + 128) / 3760 * 2 - 1]);
}
tuiles.sort((a, b) => a[0] - b[0]);

// Vague des points de Vice City.
const lm = lire('./medias/landmarks.json');
const vc = [];
for (const [, x] of Object.entries(lm)) {
  const X = (x[1][0] + 16384) / 4 - 1280, Y = (16384 - x[1][1]) / 4 - 1280;
  const z = x[0].split(', ').pop();
  if (Number.isFinite(X + Y) && (z === 'Vice City' || z === 'Vice Beach')) vc.push([X, Y]);
}
const cx = vc.reduce((a, p) => a + p[0], 0) / vc.length, cy = vc.reduce((a, p) => a + p[1], 0) / vc.length;
const tVC = L('s5') + 0.1;
const vague = vc.map(([X, Y]) => [tVC + Math.hypot(X - cx, Y - cy) / 1400 + 0.1, (X - cx) / 900]).sort((a, b) => a[0] - b[0]);

// Comparaisons : ouverture, deux balayages du volet (vers la droite puis vers le milieu), fermeture.
const comps = [[L('s6'), L('s7') - 0.45], [L('s7'), L('s7b') - 0.45], [L('s7b'), L('s8') - 0.5], [m('s8', 'station'), L('s9') - 0.5]]
  .map(([q, f]) => { const D = Math.max(1.2, f - q - 1); return { ouvre: q, balaie: [[q + 0.6, 0.45 * D, 1, -0.85], [q + 0.6 + 0.45 * D, 0.55 * D, -0.85, 0]], ferme: f }; });

// Compteur des 3 346 lieux : un tic à chaque centaine franchie.
const c0 = L('s9') + 0.3, compteur = [];
let dernier = 0;
for (let t = c0; t < c0 + 2.3; t += 1 / 240) {
  const n = Math.floor((3346 * E.sortie(prog(t, c0, 2.2))) / 100);
  if (n > dernier) { compteur.push(+t.toFixed(3)); dernier = n; }
}

const souffles = [[0.7, 4.2], [L('s3') - 0.3, 1.3], [L('s4') - 0.4, 1.1], [L('s5') - 0.5, 1.5], [L('s6') - 0.7, 1.0], [L('s7') - 0.7, 1.0],
  [L('s7b') - 0.6, 0.9], [L('s8') - 0.6, 1.6], [L('s9') - 0.5, 1.6], [L('s12') - 0.5, 2.2]];

console.log(JSON.stringify({
  duree: T.duree,
  voix: Object.entries(v.fichiers).map(([id, f]) => ({ t: T.ligne(id).debut + f.decalage, fichier: f.fichier })),
  plongee: L('s5') - 0.5,
  souffles, tuiles, vague, comps, compteur,
  onglet: 0.2,
  gta5: [L('s3'), m('s3', 'deux') - 0.1, 1.3],
  regions: ['vice', 'leonida', 'grassrivers', 'port', 'ambrosia', 'kalaga'].map((w) => m('s4', w)),
  quartiers: [0, 1, 2, 3, 4, 5].map((i) => L('s5') + 0.6 + i * 0.22),
  eau: [L('s8') - 0.3, L('s9') - 0.4, m('s8', 'sous')],
  fuite: [L('s10') - 0.2, L('s12') - 0.3],
  vids: Array.from({ length: 45 }, (_, i) => m('s10', 'quatre-vingt-dix') - 0.6 + i * 2 * 0.018 + 0.2),
  rubans: [L('s10') + 0.2, L('s11')],
  comtes: [0, 1, 2, 3, 4].map((i) => m('s11', 'comtés') + i * 0.18),
  viceDale: m('s11', 'miami-dade'),
  impact: m('s12', 'dix-neuf'), montee: L('s12') - 1.6,
}));
