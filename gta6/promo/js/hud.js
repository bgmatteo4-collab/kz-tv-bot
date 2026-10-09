// Cadre de régie, collant du début à la radio : coins, chapitre, direct, timecode,
// barre de progression du film (le dixième effet du vocabulaire).
import { E, prog, clamp, el, vis, style, setText, mesure, DUREE } from './outils.js';

const CHAPITRES = [
  [3.7, '01', 'Leonida'], [mesure(9), '02', 'Lucia & Jason'], [mesure(15), '03', 'Les visages'], [mesure(19), '04', 'Le phénomène'],
  [mesure(22), '05', 'Les éditions'], [mesure(27), '06', 'La collection'], [mesure(30), '07', 'La radio'],
];
const DEBUT = 3.7, FIN = mesure(34);

export function creerHud(ui) {
  const h = el('div', '', '', ui);
  h.id = 'hud';
  ['tl', 'tr', 'bl', 'br'].forEach((c) => el('i', 'coin ' + c, '', h));
  h.gauche = el('div', 'abs mono', '', h);
  Object.assign(h.gauche.style, { left: '110px', top: '58px', fontSize: '16px', lineHeight: '1.7' });
  h.marque = el('div', '', 'GTA VI <span style="color:var(--orange)">●</span> campagne de lancement', h.gauche);
  h.chap = el('div', '', '', h.gauche);
  h.chap.style.color = 'var(--creme)';
  h.droite = el('div', 'abs mono', '', h);
  Object.assign(h.droite.style, { right: '110px', top: '58px', fontSize: '16px', lineHeight: '1.7', textAlign: 'right' });
  h.direct = el('div', '', '<i class="rec"></i>En direct de Leonida', h.droite);
  h.direct.style.color = 'var(--creme)';
  h.tc = el('div', 'tab', '', h.droite);
  const barre = el('div', 'barre', '', h);
  h.prog = el('i', '', '', barre);
  return h;
}

export function majHud(h, t, f) {
  const o = E.sortie(prog(t, DEBUT, 0.5)) * (1 - E.entree(prog(t, FIN - 0.35, 0.35)));
  vis(h, o);
  if (o <= 0) return;
  let c = CHAPITRES[0];
  for (const x of CHAPITRES) if (t >= x[0]) c = x;
  setText(h.chap, `${c[1]} / 07 — ${c[2]}`);
  const a = E.sortie(prog(t, c[0], 0.45));
  style(h.chap, 'transform', `translateY(${((1 - a) * 12).toFixed(1)}px)`);
  style(h.chap, 'opacity', a.toFixed(3));
  const s = Math.floor(t), im = f % 60;
  setText(h.tc, `TC 00:00:${String(s).padStart(2, '0')}:${String(im).padStart(2, '0')}`);
  style(h.direct.firstChild, 'opacity', (0.35 + 0.65 * (Math.floor(t * 2) % 2 ? 0.3 : 1)).toFixed(2));
  style(h.prog, 'transform', `scaleX(${clamp(t / DUREE).toFixed(4)})`);
}
