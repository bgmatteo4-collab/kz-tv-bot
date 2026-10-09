// Caméra virtuelle (références TikTok « Claude » et « ChatGPT ») : elle ne s'arrête jamais.
// Une dérive lente et légèrement 3D en permanence, et des raccords en mouvement : la coupe
// entre deux chapitres tombe au milieu d'un geste rapide (panoramique ou plongée), là où le
// flou de mouvement est le plus fort, si bien qu'on ne la voit pas.
import { E, prog, mesure, clamp } from './outils.js';

// type : 'gauche' / 'haut' = panoramique rapide ; 'plonge' = on fonce dans un point (ox, oy).
export const RACCORDS = [
  { t: mesure(15), type: 'gauche' },                 // Lucia & Jason → les visages
  { t: mesure(19), type: 'haut' },                   // les visages → le phénomène
  { t: mesure(22), type: 'plonge', ox: 1150, oy: 560 }, // dans la lumière de la barre → éditions
  { t: mesure(27), type: 'plonge', ox: 960, oy: 420 },  // dans la date de préchargement → collection
  { t: mesure(30), type: 'gauche' },                 // collection → radio
  { t: mesure(34), type: 'plonge', ox: 500, oy: 560 },  // dans la pochette de l'album → le final
];
const AVANT = 0.3, APRES = 0.6;

// Passages rapides : rendus avec plusieurs sous-images pour un vrai flou de mouvement.
const RAPIDES = [[2.3, 3.95], [14.7, 17.6], [19.3, 20.6], [24.0, 27.6], ...RACCORDS.map((r) => [r.t - AVANT - 0.05, r.t + APRES + 0.05]),
  [28.5, 34.4], [49.9, 51.4], [57.3, 60.2], [65.7, 66.4]];
export const rapide = (t) => RAPIDES.some(([a, b]) => t >= a && t <= b);

export function camera(t) {
  // Dérive : la caméra respire, pousse un peu et tourne de 1 à 2° autour de l'image.
  const c = {
    s: 1.045 + 0.012 * Math.sin(t * 0.37),
    x: 16 * Math.sin(t * 0.23), y: 10 * Math.sin(t * 0.31 + 1),
    rx: 1.1 * Math.sin(t * 0.29), ry: 1.5 * Math.sin(t * 0.21 + 0.5),
    ox: 960, oy: 540,
  };
  // Pendant l'ouverture et sur le logo final, la caméra reste posée.
  const calme = 1 - clamp(prog(t, 3.4, 0.6)) + clamp(prog(t, mesure(34) + 2.6, 0.5));
  if (calme > 0) {
    const k = clamp(1 - calme);
    c.s = 1 + (c.s - 1) * k; c.x *= k; c.y *= k; c.rx *= k; c.ry *= k;
  }
  for (const r of RACCORDS) {
    let p = 0, entrant = false;
    if (t >= r.t - AVANT && t < r.t) p = E.entree(prog(t, r.t - AVANT, AVANT));
    else if (t >= r.t && t < r.t + APRES) { p = 1 - E.sortie(prog(t, r.t, APRES)); entrant = true; }
    if (p <= 0) continue;
    if (r.type === 'gauche') c.x += (entrant ? 1 : -1) * 1300 * p;
    if (r.type === 'haut') c.y += (entrant ? 1 : -1) * 950 * p;
    if (r.type === 'plonge') {
      c.ox = entrant ? 960 : r.ox; c.oy = entrant ? 540 : r.oy;
      c.s *= entrant ? 1 - 0.25 * p : 1 + 3.2 * p * p;
    }
  }
  return c;
}

export function transformeCamera(c) {
  return `perspective(2200px) translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg) scale(${c.s.toFixed(4)})`;
}
