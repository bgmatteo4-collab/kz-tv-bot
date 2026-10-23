// Outils partagés. Règle du projet : chaque image est une fonction pure du temps t (secondes).
// Rien ne dépend de l'image précédente : le rendu image par image et l'aperçu donnent la même chose.

export const W = 1080, H = 1920, FPS = 60;
export const TAU = Math.PI * 2;

// Palette du dossier Nº02 (DESIGN.md) : la série Dossier, passée à la nuit et à l'or.
export const C = {
  nuit: '#07090E', ardoise: '#11151F', champagne: '#EFE3C2', or: '#C9A55C', brume: '#8D96A3', cerise: '#D2122E',
};
export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${+a.toFixed(4)})`;
};

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, p) => a + (b - a) * p;
export const prog = (t, t0, d) => clamp((t - t0) / d);
export const $ = (id) => document.getElementById(id);

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

// Une seule famille de courbes pour tout le film.
export const E = {
  lin: (p) => p,
  sortie: bezier(0.16, 1, 0.3, 1),     // arrivées : rapide puis se pose
  traversee: bezier(0.76, 0, 0.24, 1),  // déplacements de caméra
  entree: bezier(0.7, 0, 0.84, 0),      // départs
  doux: bezier(0.45, 0, 0.55, 1),
};

// Ressort amorti (raideur k, amortissement c, masse 1) : position de 0 vers 1 après d secondes.
// Réglage par défaut : un léger dépassement (~4 %), comme les ressorts d'interface d'Apple.
export function ressort(d, k = 190, c = 22) {
  if (d <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * w0);
  if (z >= 1) return 1 - (1 + w0 * d) * Math.exp(-w0 * d);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * d) * (Math.cos(wd * d) + (z * w0 / wd) * Math.sin(wd * d));
}

export const tw = (t, t0, d, e = E.sortie) => e(prog(t, t0, d));

// Hasard reproductible.
export function hash(n) {
  n = (n | 0) ^ 0x27d4eb2d;
  n = Math.imul(n ^ (n >>> 15), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

// Applique un style seulement s'il change (le DOM coûte cher).
export function style(el, k, v) { if (el.style[k] !== v) el.style[k] = v; }
export function vis(el, o) {
  style(el, 'opacity', o <= 0.001 ? '0' : String(+o.toFixed(4)));
  style(el, 'visibility', o <= 0.001 ? 'hidden' : 'visible');
}
export function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
