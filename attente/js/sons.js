// Partition des bruitages : chaque événement est calé sur l'image. son.py la lit
// (exportée par render.js) et synthétise la piste, sans aucune musique.
import { CLICS } from './regie.js';
import { mulberry } from './outils.js';

export function partition() {
  const ev = [];
  const add = (t, type, gain = 1, extra = {}) => ev.push({ t: +t.toFixed(3), type, gain, ...extra });
  const r = mulberry(4);

  // Changements de rubrique : double bip d'interface.
  [22.5, 45, 67.5, 88.4].forEach((t) => add(t, 'rubrique', 0.5));

  // 1. Le studio : souffle d'orbite, scintillements quand les anneaux passent, pings discrets.
  add(0, 'souffle', 0.5, { duree: 6 });
  for (let k = 0; k < 6; k++) add(1.2 + k * 3.25, 'scintille', 0.5 + 0.1 * (k % 2));
  [3.1, 8.6, 13.4].forEach((t, i) => add(t, 'ping', 0.32, { hauteur: i }));
  for (let t = 5; t < 16; t += 2.6 + r() * 1.8) add(t, 'donnees', 0.2, { n: 2 + Math.floor(r() * 3) });
  add(17.6, 'montee', 0.6, { duree: 3 });

  // 2. Le signal : plongée, grondement grave, tic à chaque impulsion dorée, données qui défilent.
  add(19.8, 'whoosh', 1, { duree: 2.4 });
  add(21.9, 'impact', 0.7);
  add(22.5, 'grondement', 0.55, { duree: 23 });
  for (let t = 24; t < 44.5; t += 2.125) add(t, 'tic', 0.55);
  for (let t = 24.6; t < 42; t += 1.1 + r() * 1.5) add(t, 'donnees', 0.32, { n: 3 + Math.floor(r() * 5) });
  add(42.4, 'whoosh', 0.8, { duree: 2.2 });

  // 3. La régie : écrans qui arrivent et se verrouillent, frappe, clics, notifications.
  [44.6, 45.0, 45.3, 45.7].forEach((t, i) => { add(t + 0.35, 'glisse', 0.55, { hauteur: i }); add(t + 2.1, 'verrou', 0.4, { hauteur: i }); });
  add(45.2, 'glisse', 0.25, { hauteur: -2 });
  add(47.2, 'frappe', 0.45, { duree: 1.6 });
  CLICS.forEach((c) => add(c, 'clic', 1));
  [51.7, 53.7, 55.7, 58.0].forEach((t, i) => add(t, 'notif', 0.75, { hauteur: i }));
  add(59.4, 'frappe', 0.4, { duree: 1.2 });
  add(62.6, 'glisse', 0.25, { hauteur: -2 });

  // 4. Le rassemblement : dissolution, tourbillon, montée, impact, retour au calme.
  add(63.3, 'dissolution', 0.8, { duree: 3 });
  add(66, 'souffle', 0.6, { duree: 16 });
  for (let k = 0; k < 8; k++) add(68 + k * 2.1, 'scintille', 0.35);
  for (let t = 68.8; t < 82; t += 1.6 + r() * 1.6) add(t, 'donnees', 0.22, { n: 2 + Math.floor(r() * 4) });
  add(83.2, 'montee', 0.9, { duree: 3.8 });
  add(87.05, 'impact', 1);
  add(87.1, 'scintille', 0.8);
  return ev;
}
