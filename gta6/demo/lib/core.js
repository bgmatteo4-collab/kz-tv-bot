// lib/core.js — outils partagés par tous les actes (module ES).
//
// Règle d'or : chaque image est une fonction PURE du temps t (secondes, local à l'acte).
// Rien ne doit dépendre de l'image précédente (pas d'accumulation, pas de Math.random,
// pas de Date.now) : le rendu est fait image par image, dans le désordre, par plusieurs
// navigateurs en parallèle. Pour du hasard, utiliser hash / h2 / noise1 / mulberry.
//
// Repris de intro/js/core.js (même famille de courbes que l'intro Kayzx TV), plus :
//   ACTES       durées et débuts globaux des 6 actes (le contrat commun)
//   timecode()  « 00:01:04:48 » à partir d'un temps global
//   fenetre()   0→1→0 sur une plage, pour allumer/éteindre une scène
//   typeOn(), setText(), setStyle()  textes et styles sans réécrire le DOM inutilement
//
// Import :  import { E, tw, prog, clamp, split, slideWords } from '../lib/core.js';

export const W = 1920, H = 1080, FPS = 60, TAU = Math.PI * 2;

// Le contrat commun : durées fixées par la fondation (total 139,0 s).
export const DUREES = [17.1, 26.9, 20.8, 39.2, 21.6, 13.4];
export const ACTES = DUREES.map((duree, i) => ({
  numero: i + 1, duree, debut: Math.round(DUREES.slice(0, i).reduce((a, b) => a + b, 0) * 10) / 10,
}));
export const TOTAL = 139.0;

export const Q = new URLSearchParams(location.search);
export const RENDU = Q.has('render');

export const $ = (id) => document.getElementById(id);
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, p) => a + (b - a) * p;
export const prog = (t, t0, d) => clamp((t - t0) / d);
export const bump = (p) => Math.sin(Math.PI * clamp(p));
export const range = (n) => Array.from({ length: n }, (_, i) => i);

// Courbe de Bézier cubique, comme en CSS.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dsx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const d = sx(u) - x;
      if (Math.abs(d) < 1e-6) return sy(u);
      const dd = dsx(u);
      if (Math.abs(dd) < 1e-6) break;
      u -= d / dd;
    }
    let lo = 0, hi = 1;
    u = x;
    for (let i = 0; i < 30; i++) {
      if (sx(u) < x) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return sy(u);
  };
}

// Une seule famille de mouvements pour tout le film : c'est elle qui fait « studio ».
// out = arrivée douce (par défaut), inOut = déplacement, in = sortie.
export const E = {
  lin: (p) => p,
  out: bezier(0.16, 1, 0.3, 1),
  inOut: bezier(0.76, 0, 0.24, 1),
  in: bezier(0.7, 0, 0.84, 0),
  outCubic: (p) => 1 - (1 - p) ** 3,
  inCubic: (p) => p * p * p,
  inOutSine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(p)),
  outBack: (p) => { const c = 1.70158; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; },
  spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6.5 * p) * Math.cos(10.5 * p)),
};
// tw(t, t0, durée, courbe) : 0 avant t0, 1 après t0 + durée.
export const tw = (t, t0, d, e = E.out) => e(prog(t, t0, d));

// 0 → 1 (entrée de durée a) … 1 → 0 (sortie de durée b) sur la plage [t0, t1].
export function fenetre(t, t0, t1, a = 0.6, b = 0.6, eIn = E.out, eOut = E.in) {
  return Math.min(eIn(prog(t, t0, a)), 1 - eOut(prog(t, t1 - b, b)));
}

// Hasard reproductible : le même (a, b) donne toujours la même valeur dans [0, 1).
export function hash(n) {
  n = (n | 0) ^ 0x27d4eb2d;
  n = Math.imul(n ^ (n >>> 15), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
export const h2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h2(i, seed), h2(i + 1, seed), u);
}
// Générateur reproductible (à n'utiliser qu'à la PRÉPARATION, jamais dans render(t)).
export function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
export function mix(a, b, p) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(p)))).join(',')})`;
}
export const rgba = (hex, a) => `rgba(${rgb(hex).join(',')},${a})`;

// Point sur un arc entre a et b ; bend décale le point de contrôle.
export function arc(a, b, p, bend) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend, u = 1 - p;
  return [u * u * a[0] + 2 * u * p * cx + p * p * b[0], u * u * a[1] + 2 * u * p * cy + p * p * b[1]];
}

// Timecode global « 00:01:04:48 » (heures:minutes:secondes:images à 60 i/s).
export function timecode(tGlobal) {
  const f = Math.round(tGlobal * FPS), s = Math.floor(f / FPS);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(f % FPS)}`;
}

// N'écrit dans le DOM que si la valeur change (évite des recalculs de mise en page).
export function setText(el, s) { if (el.textContent !== s) el.textContent = s; }
export function setStyle(el, k, v) { v = String(v); if (el.style[k] !== v) el.style[k] = v; }

// Découpe un texte en mots (ou lettres) masqués : <span class="mask"><span class="w">mot</span></span>.
// Ne coupe que sur les espaces ordinaires : les insécables restent dans leur mot.
// Retourne la liste des .w à animer (translateY pour un dévoilement par masque).
export function split(el, mode = 'words') {
  const out = [];
  const make = (txt) => {
    const m = document.createElement('span'); m.className = 'mask';
    const w = document.createElement('span'); w.className = 'w'; w.textContent = txt;
    m.appendChild(w); out.push(w);
    return m;
  };
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/([ \t\n]+)/)) {
          if (!part) continue;
          if (/^[ \t\n]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
          if (mode === 'letters') {
            const word = document.createElement('span'); word.className = 'word';
            for (const ch of part) word.appendChild(make(ch));
            frag.appendChild(word);
          } else frag.appendChild(make(part));
        }
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
    }
  };
  walk(el);
  return out;
}

// Entrée (glisse depuis le bas, décalage stag entre mots) puis sortie éventuelle
// out = [début, décalage, durée] (part vers le haut).
export function slideWords(ws, t, t0, stag, dur, out = null) {
  for (let i = 0; i < ws.length; i++) {
    const a = E.out(prog(t, t0 + i * stag, dur));
    const b = out ? E.in(prog(t, out[0] + i * out[1], out[2])) : 0;
    const y = (1 - a) * 115 - b * 115;
    ws[i].style.transform = y === 0 ? 'none' : `translateY(${y}%)`;
  }
}

// Fondu + montée simple pour un bloc.
export function rise(el, t, t0, dur = 0.6, dy = 16, extra = '') {
  const p = tw(t, t0, dur);
  el.style.opacity = p;
  el.style.transform = `translateY(${(1 - p) * dy}px)${extra}`;
  return p;
}

// Texte qui se « décode » : caractères aléatoires puis le texte final, lettre après lettre.
export const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_';
export function scramble(final, t, t0, speed = 0.016) {
  const f = Math.round(t * FPS);
  let s = '';
  for (let i = 0; i < final.length; i++) {
    const c = final[i];
    if (c === ' ') s += ' ';
    else if (t >= t0 + i * speed + 0.1) s += c;
    else s += GLYPHS[Math.floor(h2(f >> 1, i + 7) * GLYPHS.length)];
  }
  return s;
}

// Machine à écrire : le texte apparaît de t0 à t0 + d, avec un curseur « _ ».
export function typeOn(str, t, t0, d) {
  const n = Math.floor(str.length * prog(t, t0, d));
  return n <= 0 ? '' : str.slice(0, n) + (n < str.length ? '_' : '');
}

// Nombre qui défile (compteur) avec séparateur de milliers français.
export function compteur(v, dec = 0) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ /g, ' ');
}

// Charge une image (capture, logo) et attend son décodage.
export async function chargerImage(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
