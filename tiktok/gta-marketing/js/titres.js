// Titres : blocs de capitales condensées très grasses, chaque ligne mise à la largeur de la
// colonne, un mot à la fois qui sort de son masque avec un ressort, calé sur la voix.
//
// Un bloc = { sortie: instant de disparition, lignes: [[mot, mot…], …] } ; un mot =
// [texte, instant d'apparition, style] où style vaut 'accent' (pavé cerise, un seul par bloc)
// ou 'num' (numéro du coup, en cerise vif). Les blocs se posent en haut (top 300 px).
import { E, prog, ressort, style, vis, el, $ } from './outils.js';

const mots = [];

export function ajouterBlocs(blocs) {
  const racine = $('titres');
  // Un bloc sort toujours avant que le suivant n'entre (jamais deux blocs l'un sur l'autre).
  const premier = (b) => Math.min(...b.lignes.flat().map((m) => m[1]));
  blocs = blocs.map((b) => ({ ...b })).sort((a, b) => premier(a) - premier(b));
  for (let i = 0; i < blocs.length - 1; i++) blocs[i].sortie = Math.min(blocs[i].sortie, premier(blocs[i + 1]) - 0.3);
  for (const b of blocs) {
    const bloc = el('div', 'bloc' + (b.classe ? ` ${b.classe}` : ''), undefined, racine);
    b.lignes.forEach((ligne, il) => {
      const l = el('div', 'ligne', undefined, bloc);
      ligne.forEach(([txt, t0, genre], iw) => {
        const m = el('span', 'mot' + (genre ? ` ${genre}` : ''), undefined, l);
        const int = el('span', '', undefined, m);
        int.textContent = txt;
        mots.push({ int, t0, sortie: b.sortie + (il * 2 + iw) * 0.018 });
      });
    });
  }
}

// Chaque ligne prend toute la largeur de la colonne (taille plafonnée).
export function ajusterLignes(largeur = 866, plafond = 216) {
  for (const l of document.querySelectorAll('.ligne')) {
    l.style.fontSize = '100px';
    l.style.display = 'inline-block';
    const w = l.getBoundingClientRect().width;
    l.style.display = '';
    const p = +(l.closest('.bloc').dataset.plafond || plafond);
    l.style.fontSize = `${Math.min(p, (100 * largeur) / w).toFixed(2)}px`;
  }
}

export function titres(t) {
  for (const m of mots) {
    if (t < m.t0 - 0.02 || t > m.sortie + 0.5) { vis(m.int, 0); continue; }
    const e = ressort(t - m.t0, 210, 24), s = E.entree(prog(t, m.sortie, 0.24));
    const y = (1 - e) * 108 - s * 108;
    style(m.int, 'transform', `translate3d(0,${y.toFixed(2)}%,0)`);
    vis(m.int, t < m.t0 || s >= 1 ? 0 : 1);
  }
}

// Écrit un bloc à partir d'une phrase : « Mot mot *accent* » avec les instants de chaque mot.
// Exemple : bloc(14.6, 19.9, [['LES PUBS', 14.6], ['DU JEU', 15.0]], …) — voir CHAPITRES.md.
export const bloc = (sortie, ...lignes) => ({ sortie, lignes });
