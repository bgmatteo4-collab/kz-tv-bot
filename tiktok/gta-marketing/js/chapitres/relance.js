// Relance (pas de numéro de coup) — la ville n'est pas ravie.
// « Mais la ville n'est pas ravie : un élu dit qu'on fait passer Miami pour la capitale du meurtre. »
// « Alors, sur l'espace public, jamais le mot G.T.A. »
//
// Chapitre typographique (pas de photo) :
// 1. La caméra recule sur la ville entière ; sur « pas ravie », la carte vire au cerise sombre.
// 2. « un élu dit » : une carte-citation (papier beurre) sort du centre-ville avec un ressort ;
//    la citation y est déjà imprimée en pâle et s'allume mot à mot avec la voix. Sur
//    « capitale du meurtre », un trait cerise la souligne à la main.
// 3. Entre les deux phrases, la carte se replie en plaque « domaine public » ; « GRAND THEFT
//    AUTO » s'y écrit à la machine. Sur « jamais », un trait cerise le barre ; il remonte, pâli,
//    et « VICE CITY · VI » sort de son masque à sa place.
// 4. À la fin de la tenue, la plaque rentre dans le centre-ville ; la carte redevient marine
//    pendant que la caméra repart.
import { H, clamp, lerp, prog, E, ressort, hash, style, vis, el, $ } from '../outils.js';
import { LIEUX } from '../carte.js';

// La citation, ligne par ligne : [mot affiché, mot de la voix qui l'allume].
const CITATION = [
  [['On', 'on fait'], ['fait', 'fait'], ['passer', 'passer']],
  [['Miami', 'Miami'], ['pour', 'pour'], ['la', 'la capitale']],
  [['capitale', 'capitale'], ['du', 'du meurtre'], ['meurtre.', 'meurtre']],
];
const ANCIEN = 'GRAND THEFT AUTO';

// La carte : bord gauche sur la colonne des titres (x = 124), haut à ~70 px sous les titres.
// Marges intérieures de 64 px : le texte s'arrête avant x = 900 (colonne des boutons).
const K = { x: 124, w: 832, haut: 622, marge: 64 };
// Plaque : hauteur, et lignes (px depuis le haut) de l'ancien nom (pendant la frappe, puis
// remonté et réduit) et du nouveau.
const PL = { h: 324, etiq: 46, ancien: 132, centreHaut: 114, reduit: 0.5, nouveau: 154 };

const CSS = `
.ch-relance-carte { position: absolute; left: 0; top: 0; width: ${K.w}px; z-index: 40; will-change: transform; color: var(--marine); }
.ch-relance-fond { position: absolute; inset: 0; border-radius: 22px; background: var(--beurre);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, .1), rgba(11, 27, 58, .07));
  box-shadow: 0 46px 90px rgba(3, 8, 20, .55), 0 10px 24px rgba(3, 8, 20, .3), inset 0 0 0 1.5px rgba(11, 27, 58, .1); }
.ch-relance-boite { position: absolute; inset: 0; overflow: hidden; border-radius: 22px; }
.ch-relance-cit { position: absolute; left: 0; top: 0; width: 100%; padding: 118px ${K.marge}px 46px; }
.ch-relance-guil { position: absolute; left: 50px; top: 22px; font: italic 300px/1 "Instrument Serif"; color: var(--cerise); }
.ch-relance-texte { font: italic 100px/.98 "Instrument Serif"; letter-spacing: -.005em; white-space: nowrap; }
.ch-relance-texte .l { display: block; position: relative; }
.ch-relance-texte .m { display: inline-block; }
.ch-relance-souligne { position: absolute; left: -8px; overflow: visible; }
.ch-relance-vo { margin-top: 32px; font: italic 31px/1.2 "Instrument Serif"; color: rgba(11, 27, 58, .6); white-space: nowrap; }
.ch-relance-qui { margin-top: 22px; padding-top: 20px; border-top: 2px solid rgba(11, 27, 58, .15);
  font: 500 19px/1 "JetBrains Mono"; letter-spacing: .12em; white-space: nowrap; color: rgba(11, 27, 58, .68); }
.ch-relance-qui b { font-weight: 800; color: var(--marine); letter-spacing: .1em; }
.ch-relance-plaque { position: absolute; left: 0; top: 0; width: 100%; height: ${PL.h}px; }
.ch-relance-etiq { position: absolute; left: ${K.marge}px; top: ${PL.etiq}px; font: 600 20px/1 "JetBrains Mono"; letter-spacing: .16em; color: rgba(11, 27, 58, .66); white-space: nowrap; }
.ch-relance-etiq i { display: inline-block; width: 12px; height: 12px; margin-right: 14px; background: var(--cerise); border-radius: 2px; }
.ch-relance-ancien { position: absolute; left: ${K.marge}px; top: ${PL.ancien}px; transform-origin: 0 50%; will-change: transform; white-space: nowrap;
  font: 800 74px/1 "JetBrains Mono"; letter-spacing: -.01em; }
.ch-relance-curseur { display: inline-block; width: .56em; height: .86em; margin-left: .06em; vertical-align: -.08em; background: var(--cerise); }
.ch-relance-barre { position: absolute; left: -10px; top: 0; overflow: visible; }
.ch-relance-masque { position: absolute; left: ${K.marge}px; top: ${PL.nouveau}px; overflow: hidden; padding: .04em .1em .08em 0; }
.ch-relance-nouveau { display: block; white-space: nowrap; font: 900 100px/.9 "Archivo"; font-stretch: 68%; letter-spacing: -.004em; will-change: transform; }
.ch-relance-nouveau em { font-style: normal; color: var(--cerise); }
/* Titres : le pavé « jamais » ouvre sa ligne ; son bord s'aligne sur la colonne. */
.bloc.ch-relance-titre .ligne > .mot.accent:first-child { margin-left: -.1em; }
`;

export default function creer(T) {
  const c = T.chap.relance, r1 = T.ligne('r1');
  const m1 = (mot, k) => T.mot('r1', mot, k), m2 = (mot, k) => T.mot('r2', mot, k);

  const tR = m1('pas ravie') - 0.08;       // la carte vire au cerise sombre
  const tQ = m1('un élu') - 0.1;           // la carte-citation sort du centre-ville
  const tU0 = m1('capitale') + 0.02;       // le trait souligne « capitale du meurtre »…
  const tU1 = m1('meurtre') + 0.32;        // … jusqu'au bout de la phrase
  const tM = r1.fin + 0.14;                // la citation s'efface, la carte se replie en plaque
  const tF0 = m2('sur') - 0.14;            // « GRAND THEFT AUTO » s'écrit à la machine…
  const tF1 = m2('public') + 0.16;         // … jusqu'à la dernière lettre
  const tX = m2('jamais') - 0.06;          // un trait cerise le barre
  const DX = 0.26;
  const tN = tX + DX + 0.16;               // « VICE CITY · VI » le remplace
  const tS = c.tenue - 0.05;               // la plaque rentre dans le centre-ville

  // Instant de chaque lettre : un rythme de frappe irrégulier (reproductible), plus lent aux espaces.
  const frappes = (() => {
    const pas = [...ANCIEN].map((ch, i) => (0.75 + 0.5 * hash(i + 41)) * (ch === ' ' ? 1.7 : 1));
    const total = pas.reduce((a, b) => a + b, 0);
    let cumul = 0;
    return pas.map((p) => { const t = tF0 + ((tF1 - tF0) * cumul) / total; cumul += p; return t; });
  })();

  const blocs = [
    { sortie: m2('sur') - 0.3, lignes: [[['Mais', m1('Mais')], ['la ville', m1('la ville')]], [['n’est', m1("n'est")], ['pas ravie.', m1('pas ravie'), 'accent']]] },
    { sortie: c.tenue + 0.2, classe: 'ch-relance-titre', lignes: [[['Sur', m2('sur')], ['l’espace', m2('espace')], ['public,', m2('public')]], [['jamais', m2('jamais'), 'accent'], ['“GTA”.', m2('G.T.A')]]] },
  ];

  let carteEl, cit, mots = [], souligne, souligneTrait, plaque, ancien, ancienTxt, curseur, barre, barreTrait, masque, nouveau;
  let HQ = 580;   // hauteur de la carte-citation (mesurée)

  // Trait « à la main » : un chemin SVG tracé de gauche à droite (pathLength = 1).
  function trait(svg, d, epaisseur) {
    const p = svg.querySelector('path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    Object.assign(p.style, { fill: 'none', stroke: 'var(--cerise)', strokeWidth: String(epaisseur), strokeLinecap: 'round', strokeDasharray: '1 1' });
    return p;
  }

  function preparer() {
    el('style', '', CSS, document.head);
    const lignes = CITATION.map((l, il) => `<span class="l">${l.map(([w]) => `<span class="m">${w}</span>`).join(' ')}${il === 2 ? '<svg class="ch-relance-souligne"><path/></svg>' : ''}</span>`).join('');
    carteEl = el('div', 'ch-relance-carte',
      '<div class="ch-relance-fond"></div><div class="ch-relance-boite">'
      + `<div class="ch-relance-cit"><span class="ch-relance-guil">“</span><div class="ch-relance-texte">${lignes}</div>`
      + '<div class="ch-relance-vo">VO : “We’re depicting Miami like a murder capital”</div>'
      + '<div class="ch-relance-qui"><b>RENÉ GARCÍA</b> · ÉLU DE MIAMI-DADE · MIAMI HERALD</div></div>'
      + '<div class="ch-relance-plaque"><div class="ch-relance-etiq"><i></i>DOMAINE PUBLIC · MIAMI</div>'
      + `<div class="ch-relance-ancien"><span class="txt">${ANCIEN}</span><span class="ch-relance-curseur"></span><svg class="ch-relance-barre"><path/></svg></div>`
      + '<div class="ch-relance-masque"><span class="ch-relance-nouveau">VICE CITY <em>·</em> VI</span></div></div>'
      + '</div>', $('cartes'));
    cit = carteEl.querySelector('.ch-relance-cit');
    mots = [...cit.querySelectorAll('.m')].map((e, i) => ({ el: e, t0: m1(CITATION.flat()[i][1]) }));
    plaque = carteEl.querySelector('.ch-relance-plaque');
    ancien = carteEl.querySelector('.ch-relance-ancien');
    ancienTxt = ancien.querySelector('.txt');
    curseur = ancien.querySelector('.ch-relance-curseur');
    masque = carteEl.querySelector('.ch-relance-masque');
    nouveau = carteEl.querySelector('.ch-relance-nouveau');
    // Mesures (les polices sont chargées). La citation : sa plus longue ligne à la largeur utile.
    const texte = cit.querySelector('.ch-relance-texte'), large = K.w - 2 * K.marge;
    const wq = Math.max(...[...texte.querySelectorAll('.l')].map((l) => { const ms = l.querySelectorAll('.m'), d = ms[ms.length - 1]; return d.offsetLeft + d.offsetWidth - ms[0].offsetLeft; }));
    style(texte, 'fontSize', `${Math.min(104, (100 * large) / wq).toFixed(2)}px`);
    HQ = cit.offsetHeight;
    // Le soulignement de « capitale du meurtre. », sous la ligne de base.
    const l3 = texte.querySelectorAll('.l')[2], m3 = l3.querySelectorAll('.m');
    const lu = m3[m3.length - 1].offsetLeft + m3[m3.length - 1].offsetWidth - m3[0].offsetLeft + 14;
    souligne = l3.querySelector('svg');
    souligne.setAttribute('width', lu); souligne.setAttribute('height', 40);
    style(souligne, 'top', `${(l3.offsetHeight * 0.86).toFixed(1)}px`);
    souligneTrait = trait(souligne, `M6,20 C${(lu * 0.3).toFixed(1)},11 ${(lu * 0.64).toFixed(1)},25 ${lu - 6},13`, 10);
    // Le trait qui barre « GRAND THEFT AUTO » (mesuré en entier), un peu en biais.
    const LT = ancienTxt.offsetWidth, hA = ancien.offsetHeight;
    barre = ancien.querySelector('svg');
    barre.setAttribute('width', LT + 20); barre.setAttribute('height', hA);
    barreTrait = trait(barre, `M4,${(hA * 0.6).toFixed(1)} L${LT + 16},${(hA * 0.5).toFixed(1)}`, 12);
    // « VICE CITY · VI » à la largeur utile (taille plafonnée).
    style(nouveau, 'display', 'inline-block');
    const wn = nouveau.offsetWidth;
    style(nouveau, 'display', '');
    style(nouveau, 'fontSize', `${Math.min(150, (100 * large) / wn).toFixed(2)}px`);
    vis(carteEl, 0);
  }

  // La carte vire au cerise sombre (teinte posée par carte.js, fondu « hue »).
  const alerte = (t) => E.doux(prog(t, tR, 0.7)) * (1 - E.doux(prog(t, c.fin - 0.05, 0.95)));
  function dessiner(t, X) {
    if (t < tQ - 0.05 || t > tS + 0.6) { vis(carteEl, 0); return; }
    const [px, py] = X.P.ll(...LIEUX.miami);
    // --- La carte : sort du centre-ville (ressort), se replie en plaque, y rentre à la fin.
    const e = ressort(t - tQ, 170, 19);
    const pli = ressort(t - tM - 0.02, 190, 24);
    const h = lerp(HQ, PL.h, pli);
    const vie = E.doux(prog(t, tQ, tS - tQ));
    let x = lerp(px, K.x + K.w / 2, e), y = lerp(py, K.haut + h / 2, e);
    let s = lerp(0.1, 1, e) * lerp(1, 1.02, vie), a = clamp(e * 4);
    const r = lerp(4, -1.2, e) + 1.4 * pli;
    const retour = E.entree(prog(t, tS, 0.4));
    if (retour > 0) { x = lerp(x, px, retour); y = lerp(y, py, retour); s *= 1 - 0.9 * retour; a *= 1 - retour * retour; }
    style(carteEl, 'height', `${h.toFixed(1)}px`);
    style(carteEl, 'transform', `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`);
    vis(carteEl, a);

    // --- La citation : imprimée en pâle, chaque mot s'allume quand la voix le dit. Elle
    // s'efface juste avant que la carte ne se replie (rien n'est coupé par le bord).
    const q = 1 - E.doux(prog(t, tM - 0.12, 0.18));
    vis(cit, q);
    if (q > 0) {
      for (const w of mots) style(w.el, 'opacity', String(+lerp(0.17, 1, E.sortie(prog(t, w.t0 - 0.05, 0.22))).toFixed(3)));
      style(souligneTrait, 'strokeDashoffset', String(+(1 - E.doux(prog(t, tU0, tU1 - tU0))).toFixed(4)));
      vis(souligne, t > tU0 ? 1 : 0);
    }

    // --- La plaque : l'étiquette, la frappe, le trait qui barre, le remplaçant.
    const pq = E.doux(prog(t, tM + 0.14, 0.2));
    vis(plaque, pq);
    if (pq > 0) {
      ancienTxt.textContent = ANCIEN.slice(0, frappes.filter((f) => t >= f).length);
      // Curseur : plein pendant la frappe, clignote ensuite, disparaît quand on barre.
      const enFrappe = t >= tF0 - 0.25 && t < tF1 + 0.12;
      vis(curseur, t < tX + 0.05 && (enFrappe || (t - tF1) % 0.5 < 0.27) ? 1 : 0);
      const b = E.sortie(prog(t, tX, DX));
      style(barreTrait, 'strokeDashoffset', String(+(1 - b).toFixed(4)));
      vis(barre, b > 0 ? 1 : 0);
      // L'ancien nom remonte, se réduit et pâlit ; le nouveau sort de son masque à sa place.
      const mo = E.sortie(prog(t, tN - 0.06, 0.5));
      const dy = (PL.centreHaut - (PL.ancien + ancien.offsetHeight / 2)) * mo;
      style(ancien, 'transform', `translate3d(0,${dy.toFixed(2)}px,0) scale(${lerp(1, PL.reduit, mo).toFixed(4)})`);
      style(ancienTxt, 'opacity', String(+lerp(1, 0.45, mo).toFixed(3)));   // le trait reste vif
      const en = ressort(t - tN, 210, 24);
      style(nouveau, 'transform', `translate3d(0,${((1 - en) * 108).toFixed(2)}%,0)`);
      vis(masque, en > 0.001 ? 1 : 0);
    }
  }

  const voile = (t) => 0.3 * clamp(prog(t, tQ - 0.1, 0.4)) * (1 - prog(t, tS + 0.1, 0.4));
  const legendes = [
    { de: tQ + 0.3, a: tM + 0.12, html: 'MIAMI-DADE · OCT. 2026\n<small>CITATION : MIAMI HERALD (VIA GAMESPOT)</small>' },
    { de: tM + 0.12, a: tS, html: 'MIAMI · OCT. 2026\n<small>SOURCES : CREAPILLS · GAMESRADAR</small>' },
  ];
  // Flou de mouvement quand la carte sort du centre-ville et quand elle y rentre.
  const sous = (t) => ((t > tQ && t < tQ + 0.3) || (t > tS && t < tS + 0.4) ? 3 : 1);

  function sons(add) {
    add(tR, 'impact', 0.3);
    add(tR, 'grondement', 0.32, { duree: c.fin - tR + 0.9 });
    add(tQ, 'clic', 0.45);
    add(tU0, 'glisse', 0.28, { hauteur: 2 });
    add(tM, 'glisse', 0.3, { hauteur: 0 });
    frappes.forEach((f, i) => add(f, 'frappe', ANCIEN[i] === ' ' ? 0.3 : 0.42, { duree: 0.01 }));
    add(tX, 'glisse', 0.38, { hauteur: 3 });
    add(tX + DX * 0.8, 'verrou', 0.42);
    add(tN, 'ping', 0.35, { hauteur: 1 });
    add(tS, 'clic', 0.3);
  }

  // La teinte cerise est posée par carte.js (fondu « hue ») d'après alerte(t).
  return { id: 'relance', blocs, preparer, dessiner, voile, alerte, legendes, sons, sous };
}
