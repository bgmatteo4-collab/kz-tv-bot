// Outils communs : temps, courbes, hasard reproductible.
// Règle : chaque image est une fonction pure du temps t (0 ≤ t < DUREE). La boucle
// est parfaite parce que l'image à t = DUREE est exactement celle de t = 0.

export const W = 1920, H = 1080, FPS = 60, DUREE = 90;
export const TAU = Math.PI * 2;
export const Q = new URLSearchParams(location.search);

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, p) => a + (b - a) * p;
export const prog = (t, t0, d) => clamp((t - t0) / d);
export const bump = (p) => Math.sin(Math.PI * clamp(p));
export const lisse = (p) => p * p * (3 - 2 * p);

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u, sy = (u) => ((ay * u + by) * u + cy) * u;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, u = x;
    for (let i = 0; i < 28; i++) { if (sx(u) < x) lo = u; else hi = u; u = (lo + hi) / 2; }
    return sy(u);
  };
}
export const E = {
  out: bezier(0.16, 1, 0.3, 1),
  inOut: bezier(0.76, 0, 0.24, 1),
  doux: bezier(0.45, 0, 0.55, 1),
  in: bezier(0.7, 0, 0.84, 0),
  outBack: (p) => { const c = 1.70158; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; },
};
export const tw = (t, t0, d, e = E.out) => e(prog(t, t0, d));

export function hash(n) {
  n = (n | 0) ^ 0x27d4eb2d;
  n = Math.imul(n ^ (n >>> 15), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
export const h2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
export function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sinus dont la période divise la boucle : revient à l'identique à t = DUREE.
export const onde = (t, tours, phase = 0) => Math.sin((t / DUREE) * TAU * tours + phase);

// Interpolation d'une suite de clés [t, valeur] avec une courbe douce entre chaque clé.
export function cles(t, liste, e = E.doux) {
  if (t <= liste[0][0]) return liste[0][1];
  for (let i = 0; i < liste.length - 1; i++) {
    const [ta, a] = liste[i], [tb, b] = liste[i + 1];
    if (t <= tb) {
      const p = e(prog(t, ta, tb - ta));
      return Array.isArray(a) ? a.map((v, k) => lerp(v, b[k], p)) : lerp(a, b, p);
    }
  }
  return liste[liste.length - 1][1];
}

export const $ = (id) => document.getElementById(id);
export function setText(el, s) { if (el.textContent !== s) el.textContent = s; }
