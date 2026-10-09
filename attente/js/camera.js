// Trajet de la caméra : une seule prise continue sur 90 s.
// Studio (orbite) → plongée au-dessus de la grille → régie → rassemblement.
// La dernière clé reproduit la première par rapport au logo (déplacé à la régie
// pour le final) : l'image de t = 90 est celle de t = 0, la boucle est invisible.
import * as THREE from 'three';
import { DUREE, onde } from './outils.js';

export const REGIE = new THREE.Vector3(0, -4, -128);

// [temps, position, cible]
const CLES = [
  [0, [-4.5, 1.6, 15.5], [0, 0.3, 0]],
  [6, [-0.56, 1.9, 16.13], [0, 0.3, 0]],
  [12, [3.36, 2.2, 15.79], [0, 0.3, 0]],
  [17, [6.56, 2.0, 14.74], [0, 0.2, 0]],
  [20.5, [9.5, -3.5, 6], [2, -6, -10]],
  [24, [3, -7, -12], [0, -14, -40]],
  [30, [-2.5, -7.4, -38], [-1, -14.5, -68]],
  [36, [2.5, -6.8, -64], [1, -14, -94]],
  [42, [-1, -5.8, -92], [0, -6, -128]],
  [47, [0, -4.4, -110], [0, -4.7, -128]],
  [55, [-2.6, -4.2, -111], [0, -4.7, -128]],
  [63, [2.6, -4.6, -111.5], [0, -4.7, -128]],
  [70, [6, -1, -101], [0, -3.5, -128]],
  [78, [-3, -1.5, -106], [0, -3.8, -128]],
  [84, [-5.5, -2.1, -110.5], [0, -3.7, -128]],
  [DUREE, [-4.5, -2.4, -112.5], [0, -3.7, -128]],
];

const v3 = (a) => new THREE.Vector3(...a);
const courbePos = new THREE.CatmullRomCurve3(CLES.map((k) => v3(k[1])), false, 'centripetal');
const courbeCible = new THREE.CatmullRomCurve3(CLES.map((k) => v3(k[2])), false, 'centripetal');

// Temps → paramètre de courbe : Hermite monotone (Fritsch–Carlson), vitesse nulle aux deux
// extrémités pour que la fin de boucle et le début s'enchaînent sans à-coup.
const ts = CLES.map((k) => k[0]);
const us = CLES.map((_, i) => i / (CLES.length - 1));
const pentes = (() => {
  const n = ts.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((us[i + 1] - us[i]) / (ts[i + 1] - ts[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return m; // m[0] = m[n-1] = 0
})();
function parametre(t) {
  if (t <= ts[0]) return 0;
  if (t >= ts[ts.length - 1]) return 1;
  let i = 0;
  while (t > ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i], s = (t - ts[i]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * us[i] + (s3 - 2 * s2 + s) * h * pentes[i] + (-2 * s3 + 3 * s2) * us[i + 1] + (s3 - s2) * h * pentes[i + 1];
}

const p = new THREE.Vector3(), c = new THREE.Vector3();
export function placerCamera(camera, t) {
  const u = parametre(t);
  courbePos.getPoint(u, p);
  courbeCible.getPoint(u, c);
  // Léger flottement « caméra portée », périodique sur la boucle.
  p.x += 0.05 * onde(t, 7, 0.3);
  p.y += 0.04 * onde(t, 9, 1.1);
  camera.position.copy(p);
  camera.lookAt(c);
}
