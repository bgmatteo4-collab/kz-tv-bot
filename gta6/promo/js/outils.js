// Outils partagés. Règle du projet : chaque image est une fonction pure du temps t (secondes).
// Rien ne dépend de l'image précédente : le rendu image par image et l'aperçu en direct
// donnent exactement la même chose.

export const W = 1920, H = 1080, FPS = 60, DUREE = 75.5;
export const TEMPS = 0.4625, MESURE = 1.85; // la chanson du trailer 2 : 129,7 BPM
export const TAU = Math.PI * 2;

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, p) => a + (b - a) * p;
export const prog = (t, t0, d) => clamp((t - t0) / d);
export const bump = (p) => Math.sin(Math.PI * clamp(p));
export const mesure = (n) => n * MESURE;
export const $ = (id) => document.getElementById(id);
export function setText(el, s) { if (el.textContent !== s) el.textContent = s; }

// Courbe de Bézier cubique, comme en CSS.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, u = x;
    for (let i = 0; i < 40; i++) { if (sx(u) < x) lo = u; else hi = u; u = (lo + hi) / 2; }
    return sy(u);
  };
}

// La famille de courbes du DESIGN.md.
export const E = {
  lin: (p) => p,
  sortie: bezier(0.16, 1, 0.3, 1),
  traversee: bezier(0.76, 0, 0.24, 1),
  entree: bezier(0.7, 0, 0.84, 0),
  doux: bezier(0.45, 0, 0.55, 1),
};

// Ressort amorti (raideur 170, amortissement 22, masse 1) : position de 0 vers 1 après d secondes.
export function ressort(d, k = 170, c = 22) {
  if (d <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * w0);
  if (z >= 1) return 1 - (1 + w0 * d) * Math.exp(-w0 * d);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * d) * (Math.cos(wd * d) + (z * w0 / wd) * Math.sin(wd * d));
}

// Arrivée standard d'un élément : progression 0→1 avec la courbe voulue.
export const tw = (t, t0, d, e = E.sortie) => e(prog(t, t0, d));
// Entrée puis sortie (sortie 0,6 × plus courte, courbe « entree »).
export function vie(t, t0, t1, d = 0.6) {
  const a = E.sortie(prog(t, t0, d)), b = E.entree(prog(t, t1 - d * 0.6, d * 0.6));
  return a * (1 - b);
}

// Hasard reproductible.
export function hash(n) {
  n = (n | 0) ^ 0x27d4eb2d;
  n = Math.imul(n ^ (n >>> 15), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
export const h2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
export function bruit(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h2(i, seed), h2(i + 1, seed), u);
}

// Applique un style seulement s'il change (le DOM coûte cher).
export function style(el, k, v) { if (el.style[k] !== v) el.style[k] = v; }
export function vis(el, o) {
  style(el, 'opacity', o <= 0.001 ? '0' : String(+o.toFixed(4)));
  style(el, 'visibility', o <= 0.001 ? 'hidden' : 'visible');
}

// Crée un élément avec classes et contenu.
export function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
