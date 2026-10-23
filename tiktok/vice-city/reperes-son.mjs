// Repères de la bande-son, tirés du même minutage que l'image (mêmes formules que main.js).
import { calculer } from './js/partition.js';
import fs from 'fs';
const v = JSON.parse(fs.readFileSync(new URL('./medias/voix.json', import.meta.url)));
const T = calculer(v.durees, v.mots), L = (id) => T.ligne(id).debut;
const souffles = [[0.7, 4.2], [L('s3') - 0.3, 1.3], [L('s4') - 0.4, 1.1], [L('s5') - 0.5, 1.5], [L('s6') - 0.7, 1.0], [L('s7') - 0.7, 1.0],
  [L('s7b') - 0.6, 0.9], [L('s8') - 0.6, 1.6], [L('s9') - 0.5, 1.6], [L('s12') - 0.5, 2.2]];
const clics = [L('s6'), L('s7'), L('s7b'), T.mot('s8', 'station')];
const regions = ['vice', 'leonida', 'grassrivers', 'port', 'ambrosia', 'kalaga'].map((w) => T.mot('s4', w));
const voix = Object.entries(v.fichiers).map(([id, f]) => ({ t: T.ligne(id).debut + f.decalage, fichier: f.fichier }));
console.log(JSON.stringify({ duree: T.duree, souffles, clics, regions, fuite: L('s10'), voix }));
