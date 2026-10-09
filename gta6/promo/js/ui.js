// Briques d'habillage HTML : textes révélés mot par mot, pastilles éclairées,
// compteurs à rouleaux. Chacune expose une fonction maj(t) pure.
import { E, clamp, prog, el, style, vis, ressort, lerp } from './outils.js';

// ── Texte révélé mot par mot (« Text Reveal »). Chaque mot monte, se défloute et s'allume.
export function texte(parent, html, cls, { x = 0, y = 0, ancre = 'gauche' } = {}) {
  const box = el('div', 'abs ' + (cls || ''), '', parent);
  box.style.left = x + 'px';
  box.style.top = y + 'px';
  if (ancre === 'centre') box.style.transform = 'translateX(-50%)';
  if (ancre === 'droite') box.style.transform = 'translateX(-100%)';
  // Les lignes sont séparées par « | », les mots par des espaces ; <em>…</em> garde son style.
  const mots = [];
  html.split('|').forEach((ligne) => {
    const l = el('span', 'ligne', '', box);
    ligne.trim().split(/ (?![^<]*>)/).forEach((m, i) => {
      if (i) l.appendChild(document.createTextNode(' '));
      mots.push(el('span', 'mot', m, l));
    });
  });
  box.mots = mots;
  return box;
}
// Révèle les mots de t0, un tous les `pas` secondes ; disparition groupée à t1 (facultatif).
export function reveler(box, t, t0, { pas = 0.06, d = 0.55, monte = 40, flou = 14, t1 = null, sortie = 'haut' } = {}) {
  let tout = 0;
  box.mots.forEach((m, i) => {
    const p = E.sortie(prog(t, t0 + i * pas, d));
    let o = p, ty = (1 - p) * monte, b = (1 - p) * flou;
    if (t1 !== null) {
      const q = E.entree(prog(t, t1 + i * pas * 0.5, d * 0.6));
      o *= 1 - q;
      ty += sortie === 'haut' ? -q * monte : q * monte;
      b += q * flou;
    }
    tout = Math.max(tout, o);
    style(m, 'opacity', o.toFixed(3));
    style(m, 'transform', `translateY(${ty.toFixed(1)}px)`);
    style(m, 'filter', b > 0.3 ? `blur(${b.toFixed(1)}px)` : 'none');
  });
  vis(box, tout > 0.001 ? 1 : 0);
}

// ── Titre dont la largeur et la graisse s'animent (les lettres « se resserrent »).
export function largeur(elm, t, t0, d = 1.1, { de = [125, 300], a = [62, 900] } = {}) {
  const p = E.sortie(prog(t, t0, d));
  const w = lerp(de[0], a[0], p), g = lerp(de[1], a[1], p);
  style(elm, 'fontVariationSettings', `"wdth" ${w.toFixed(1)}, "wght" ${g.toFixed(0)}`);
  return p;
}

// ── Pastille éclairée : la traînée de lumière fait le tour du contour.
export function pastille(parent, html, cls = '') {
  const p = el('div', 'pastille ' + cls, '', parent);
  const l = el('span', 'lueur', '<i></i>', p);
  el('span', '', html, p);
  p.lueur = l.firstChild;
  return p;
}
// Apparition avec ressort (échelle 0,92 → 1, flou), position, rotation de la lueur.
export function majPastille(p, t, t0, { x, y, ancre = 'centre', t1 = null, tours = 0.9, rx = 0 } = {}) {
  const a = ressort(t - t0), o = clamp((t - t0) / 0.25);
  let s = lerp(0.92, 1, a), f = (1 - clamp(a)) * 12, opa = o;
  if (t1 !== null) {
    const q = E.entree(prog(t, t1, 0.35));
    opa *= 1 - q; s *= 1 - 0.06 * q; f += q * 14;
  }
  const tx = ancre === 'centre' ? '-50%' : ancre === 'droite' ? '-100%' : '0';
  style(p, 'left', x + 'px');
  style(p, 'top', y + 'px');
  style(p, 'transform', `translate(${tx}, -50%) scale(${s.toFixed(4)})${rx ? ` rotate(${rx}deg)` : ''}`);
  style(p, 'filter', f > 0.3 ? `blur(${f.toFixed(1)}px)` : 'none');
  vis(p, opa);
  // La traînée part du haut et fait environ un tour par seconde, en ralentissant.
  const ang = -90 + 360 * tours * Math.pow(Math.max(0, t - t0), 0.8);
  p.lueur.style.setProperty('--a', `${ang.toFixed(1)}deg`);
}

// ── Compteur à rouleaux (chiffres qui défilent, flou de mouvement selon la vitesse).
// gabarit : par exemple « 99,99 € » ou « 475 000 000 » ; les « 9 » sont des rouleaux.
export function compteur(parent, gabarit, cls = '') {
  const c = el('span', 'compteur ' + cls, '', parent);
  c.cols = [];
  [...gabarit].forEach((ch) => {
    if (ch === '9') {
      const col = el('span', 'col', '', c);
      for (let k = 0; k < 11; k++) el('span', '', String(k % 10), col);
      c.cols.push(col);
    } else el('span', 'fixe', ch === ' ' ? '&nbsp;' : ch, c);
  });
  // background-clip:text ne traverse pas les rouleaux transformés : on le pose sur chaque chiffre.
  if (parent.classList.contains('degrade')) c.querySelectorAll('span:not(.col)').forEach((s) => s.classList.add('degrade'));
  return c;
}
// valeur : nombre entier lu sur tous les rouleaux (ex. 7999 pour « 79,99 »). vit : variation par seconde.
export function majCompteur(c, valeur, vit = 0) {
  const n = c.cols.length;
  const entier = Math.floor(valeur + 1e-6), frac = clamp(valeur - entier);
  c.cols.forEach((col, i) => {
    const place = Math.pow(10, n - 1 - i);
    // Façon compteur kilométrique : un rouleau ne tourne que si tous ceux de droite sont sur 9.
    let pos = Math.floor(entier / place) % 10;
    if (entier % place === place - 1) pos += frac;
    style(col, 'transform', `translateY(${(-pos).toFixed(4)}em)`);
    const v = Math.abs(vit) / place;
    style(col, 'filter', v > 4 ? `blur(${Math.min(0.035, v / 4000).toFixed(4)}em)` : 'none');
  });
}
