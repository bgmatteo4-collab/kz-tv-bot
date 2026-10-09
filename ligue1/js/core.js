// Outils partagés : temps, courbes, hasard reproductible, texte découpé.
// Règle du projet : chaque image est une fonction pure du temps t (secondes).
// Aucun état ne doit dépendre de l'image précédente, sinon le rendu image
// par image et la lecture en direct divergent.
'use strict';

const W = 1920, H = 1080, TAU = Math.PI * 2, DUR = 46, FPS = 60;
const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render'), DEV = Q.has('dev'), LOOP = Q.has('loop');

const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, t0, d) => clamp((t - t0) / d);
const bump = (p) => Math.sin(Math.PI * clamp(p));

// Courbe de Bézier cubique, comme en CSS.
function bezier(x1, y1, x2, y2) {
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

// Une seule famille de mouvements pour tout le film : c'est elle qui fait
// « studio ». out = arrivée douce, inOut = déplacement, in = sortie.
const E = {
  lin: (p) => p,
  out: bezier(0.16, 1, 0.3, 1),
  inOut: bezier(0.76, 0, 0.24, 1),
  in: bezier(0.7, 0, 0.84, 0),
  outCubic: (p) => 1 - (1 - p) ** 3,
  inCubic: (p) => p * p * p,
  outBack: (p) => { const c = 1.70158; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; },
  spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6.5 * p) * Math.cos(10.5 * p)),
};
const tw = (t, t0, d, e = E.out) => e(prog(t, t0, d));

// Hasard reproductible : le même (a, b) donne toujours la même valeur.
function hash(n) {
  n = (n | 0) ^ 0x27d4eb2d;
  n = Math.imul(n ^ (n >>> 15), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
const h2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h2(i, seed), h2(i + 1, seed), u);
}
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function mix(a, b, p) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(p)))).join(',')})`;
}

// Point sur un arc entre a et b ; bend décale le point de contrôle.
function arc(a, b, p, bend) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend, u = 1 - p;
  return [u * u * a[0] + 2 * u * p * cx + p * p * b[0], u * u * a[1] + 2 * u * p * cy + p * p * b[1]];
}

// Position d'un point de la scène après le zoom d'une caméra (origine o).
const camMap = (pt, s, o = { x: 960, y: 540 }) => ({ x: o.x + (pt.x - o.x) * s, y: o.y + (pt.y - o.y) * s });

function rectIn(el) {
  const s = $('stage').getBoundingClientRect(), r = el.getBoundingClientRect();
  const k = s.width / W;
  const x = (r.left - s.left) / k, y = (r.top - s.top) / k, w = r.width / k, h = r.height / k;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

// Découpe un texte en mots (ou lettres) masqués. Ne coupe que sur les
// espaces ordinaires : les insécables restent dans leur mot.
function split(el, mode = 'words') {
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

// Entrée (glisse depuis le bas) puis sortie éventuelle (part vers le haut).
function slideWords(ws, t, t0, stag, dur, out = null) {
  for (let i = 0; i < ws.length; i++) {
    const a = E.out(prog(t, t0 + i * stag, dur));
    const b = out ? E.in(prog(t, out[0] + i * out[1], out[2])) : 0;
    const y = (1 - a) * 115 - b * 115;
    ws[i].style.transform = y === 0 ? 'none' : `translateY(${y}%)`;
  }
}

// Fondu + montée simple pour un bloc.
function rise(el, t, t0, dur = 0.6, dy = 16, extra = '') {
  const p = tw(t, t0, dur);
  el.style.opacity = p;
  el.style.transform = `translateY(${(1 - p) * dy}px)${extra}`;
  return p;
}

// Texte qui se « décode » : caractères aléatoires puis le texte final.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_';
function scramble(final, t, t0, f, speed = 0.016) {
  let s = '';
  for (let i = 0; i < final.length; i++) {
    const c = final[i];
    if (c === ' ') s += ' ';
    else if (t >= t0 + i * speed + 0.1) s += c;
    else s += GLYPHS[Math.floor(h2(f >> 1, i + 7) * GLYPHS.length)];
  }
  return s;
}

// Afficheur 7 segments (les circuits temporels).
const SEGS = {
  a: '12,4 48,4 52,8 48,12 12,12 8,8', b: '52,10 56,14 56,46 52,50 48,46 48,14',
  c: '52,50 56,54 56,86 52,90 48,86 48,54', d: '12,88 48,88 52,92 48,96 12,96 8,92',
  e: '8,50 12,54 12,86 8,90 4,86 4,54', f: '8,10 12,14 12,46 8,50 4,46 4,14',
  g: '12,46 48,46 52,50 48,54 12,54 8,50',
};
const DIGITS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
function seg7(parent, h = 72) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 60 100');
  svg.setAttribute('width', String(h * 0.6));
  svg.setAttribute('height', String(h));
  svg.classList.add('seg7');
  const polys = {};
  for (const k in SEGS) {
    const p = document.createElementNS(NS, 'polygon');
    p.setAttribute('points', SEGS[k]);
    p.setAttribute('fill', 'currentColor');
    svg.appendChild(p);
    polys[k] = p;
  }
  parent.appendChild(svg);
  return polys;
}
// mode : 'off' | 'flicker' (p = probabilité) | un chiffre 0-9
function setSeg(polys, mode, f = 0, salt = 0, p = 0) {
  for (const k in polys) {
    let on;
    if (mode === 'off') on = false;
    else if (mode === 'flicker') on = h2(f >> 1, salt * 31 + k.charCodeAt(0)) < p;
    else on = DIGITS[mode].includes(k);
    polys[k].style.opacity = on ? 1 : 0.07;
  }
}

// N'écrit le texte que s'il a changé (évite des recalculs de mise en page).
function setText(el, s) { if (el.textContent !== s) el.textContent = s; }
