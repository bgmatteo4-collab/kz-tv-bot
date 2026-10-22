// Fin — la date de sortie, l'appel au commentaire, puis la boucle.
// « G.T.A. six sort le dix-neuf novembre. »
// « Et toi, quelle ville Rockstar devrait transformer ensuite ? »
//
// Chapitre typographique (pas de photo) :
// 1. La caméra se pose sur Miami, un peu plus haut : les 7 épingles, toutes pleines. Une onde
//    les parcourt de 1 à 7 : le dossier est complet.
// 2. « GTA VI sort le » ; sous le titre, la date se compose dans un pavé cerise qui s'ouvre au
//    rythme de la voix : « 19 » sur « dix-neuf », « .11 » sur « novembre », puis « .2026 ».
//    Chaque chiffre roule comme un compteur et se pose. Dessous : « PS5 · XBOX SERIES X|S ».
// 3. « Quelle ville ensuite ? » ; la pastille « DIS-LE EN COMMENTAIRE » sort de l'épingle de
//    l'enseigne (sa bulle « écrit »), puis bat doucement.
// 4. Quand la caméra replonge vers l'enseigne (boucle), les titres sortent et la pastille rentre
//    dans l'épingle de l'enseigne, d'où la photo du début va ressortir.
import { C, TAU, rgba, clamp, lerp, prog, E, ressort, style, vis, el, $ } from '../outils.js';
import { EPINGLES, ecranEpingle } from '../epingles.js';

const DATE = '19.11.2026';
const GROUPES = [[0, 2], [2, 5], [5, 10]];     // « 19 », « .11 », « .2026 » (indices dans DATE)
const COLONNE = 866;                            // largeur de la colonne des titres
const APPEL = 'DIS-LE EN COMMENTAIRE';

const CSS = `
.ch-fin-date { position: absolute; left: 0; top: 0; width: ${COLONNE}px; pointer-events: none; }
.ch-fin-masque { position: absolute; left: 0; top: 0; overflow: hidden; padding: 0 .07em .07em 0; }
.ch-fin-pave { position: relative; width: 0; background: var(--cerise); border-radius: .05em; overflow: hidden;
  box-shadow: .05em .05em 0 rgba(11, 27, 58, .55); will-change: transform, width; }
.ch-fin-rang { position: absolute; left: .1em; top: 0; height: 100%; display: flex; white-space: nowrap;
  font: 900 100px/1 "Archivo"; font-stretch: 68%; color: var(--beurre); }
.ch-fin-col { position: relative; height: 100%; }
.ch-fin-bande { position: absolute; left: 0; top: 0; width: 100%; will-change: transform; }
.ch-fin-bande b { display: flex; justify-content: center; font-weight: 900; }
.ch-fin-plat { position: absolute; left: 0; top: 0; overflow: hidden; padding: 8px 0 12px; font-size: 27px; }
.ch-fin-plat span { display: block; white-space: nowrap; font: 600 27px/1 "JetBrains Mono"; letter-spacing: .16em; color: rgba(246, 231, 168, .88);
  text-shadow: 0 2px 10px rgba(11, 27, 58, .8); will-change: transform; }
.ch-fin-plat i { display: inline-block; width: 12px; height: 12px; margin-right: 16px; vertical-align: .06em; background: var(--cerise-vif); border-radius: 2px; }
.ch-fin-appel { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 20px; padding: 0 40px 0 24px; height: 100px; border-radius: 50px;
  background: rgba(11, 27, 58, .88); box-shadow: inset 0 0 0 2px rgba(246, 231, 168, .5), 0 18px 44px rgba(3, 8, 20, .5);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); transform-origin: 50% 50%; will-change: transform; white-space: nowrap; }
.ch-fin-appel canvas { display: block; width: 64px; height: 64px; }
.ch-fin-appel span.t { font: 700 33px/1 "JetBrains Mono"; letter-spacing: .09em; color: var(--beurre); padding-top: 3px; }
.ch-fin-onde { position: absolute; left: 0; top: 0; border-radius: 50px; box-shadow: inset 0 0 0 2px var(--beurre); pointer-events: none; }
/* Titres : le pavé « ensuite ? » ouvre sa ligne ; son bord s'aligne sur la colonne. */
.bloc.ch-fin-b2 .ligne > .mot.accent:first-child { margin-left: -.1em; }
`;

export default function creer(T, K) {
  const c = T.chap.fin, o1 = T.ligne('o1'), o2 = T.ligne('o2');
  const m1 = (mot, k) => T.mot('o1', mot, k), m2 = (mot, k) => T.mot('o2', mot, k);

  const tO = K.versFin.t1 - 0.16;                       // l'onde parcourt les 7 épingles
  const tG = [m1('dix-neuf') - 0.04, m1('novembre') - 0.04, m1('novembre') + 0.24];
  const tP = tG[2] + 0.22;                              // « PS5 · XBOX SERIES X|S »
  const tQ = m2('quelle');
  const sortie1 = tQ - 0.3;                             // la date sort avec son titre (sur « Et toi »)
  const tA = m2('devrait') - 0.2;                       // la pastille sort de l'épingle de l'enseigne
  const tB = tA + 0.62;                                 // premier battement
  const BAT = 1.05;                                     // période des battements
  // Tout rentre quand la caméra replonge ; la photo du début ressort de l'épingle à boucle.t1 - 0.55.
  const tS = Math.min(o2.fin + 0.6, K.boucle.t1 - 0.6 - 0.5);
  const ep = EPINGLES.find((e) => e.chap === 'enseigne');

  const blocs = [
    { sortie: sortie1, classe: 'ch-fin-b1', lignes: [[['GTA', m1('G.T.A')], ['VI', m1('six')], ['sort', m1('sort')], ['le', m1('le')]]] },
    { sortie: tS, classe: 'ch-fin-b2', lignes: [[['Quelle', tQ], ['ville', m2('ville')]], [['ensuite ?', m2('ensuite'), 'accent']]] },
  ];

  // ---------------------------------------------------------------- éléments
  let date, masque, pave, rang, cols = [], plat, platTxt, appel, onde, bulle, gb;
  let S = 200, HP = 200, LARG = [], POS = { pret: false };

  function preparer() {
    el('style', '', CSS, document.head);
    const racine = $('titres');
    // La date : une colonne par caractère ; chaque chiffre est une bande qui « compte » jusqu'à lui.
    const bandes = [...DATE].map((ch) => {
      if (ch === '.') return [ch];
      const d = +ch;
      return [(d + 8) % 10, (d + 9) % 10, d].map(String);
    });
    date = el('div', 'ch-fin-date', '<div class="ch-fin-masque"><div class="ch-fin-pave"><div class="ch-fin-rang">'
      + bandes.map((b) => `<span class="ch-fin-col"><span class="ch-fin-bande">${b.map((x) => `<b>${x}</b>`).join('')}</span></span>`).join('')
      + '</div></div></div><div class="ch-fin-plat"><span><i></i>PS5 · XBOX SERIES X|S</span></div>', racine);
    masque = date.querySelector('.ch-fin-masque');
    pave = date.querySelector('.ch-fin-pave');
    rang = date.querySelector('.ch-fin-rang');
    plat = date.querySelector('.ch-fin-plat');
    platTxt = plat.querySelector('span');
    cols = [...date.querySelectorAll('.ch-fin-col')].map((e, i) => ({ el: e, bande: e.firstChild, n: bandes[i].length }));

    // Mesures à 100 px : largeur de chaque caractère final, puis taille pour remplir la colonne.
    const sonde = el('span', '', '', racine);
    Object.assign(sonde.style, { position: 'absolute', visibility: 'hidden', font: '900 100px/1 "Archivo"', fontStretch: '68%', whiteSpace: 'nowrap' });
    LARG = [...DATE].map((ch) => { sonde.textContent = ch; return sonde.getBoundingClientRect().width; });
    sonde.remove();
    const rang100 = LARG.reduce((a, b) => a + b, 0);
    S = Math.min(240, COLONNE / (rang100 / 100 + 0.2));
    // Hauteur des chiffres et métriques de la police (pour centrer les chiffres dans le pavé).
    const g = document.createElement('canvas').getContext('2d');
    g.font = `900 ${S}px "Archivo"`;
    const mt = g.measureText('0123456789');
    const hc = mt.actualBoundingBoxAscent, A = mt.fontBoundingBoxAscent, D = mt.fontBoundingBoxDescent;
    HP = Math.round(hc + 0.34 * S);
    const decale = (D - A + hc) / 2;    // ramène le centre des chiffres au centre du pavé
    style(date, 'fontSize', `${S.toFixed(2)}px`);
    style(rang, 'fontSize', `${S.toFixed(2)}px`);
    style(pave, 'height', `${HP}px`);
    cols.forEach((col, i) => {
      style(col.el, 'width', `${(LARG[i] * S / 100).toFixed(2)}px`);
      for (const b of col.bande.children) {
        Object.assign(b.style, { height: `${HP}px`, lineHeight: `${HP}px`, transform: `translateY(${decale.toFixed(2)}px)` });
      }
    });
    POS.largeurs = GROUPES.map(([, fin]) => (0.2 * S) + LARG.slice(0, fin).reduce((a, b) => a + b, 0) * S / 100);
    vis(date, 0);

    // La pastille d'appel, avec sa bulle dessinée en canvas et son onde de battement.
    appel = el('div', 'ch-fin-appel', `<canvas width="64" height="64"></canvas><span class="t">${APPEL}</span>`, racine);
    onde = el('div', 'ch-fin-onde', '', racine);
    bulle = appel.querySelector('canvas');
    gb = bulle.getContext('2d');
    POS.appelW = appel.offsetWidth; POS.appelH = appel.offsetHeight;
    vis(appel, 0); vis(onde, 0);
  }

  // Positions qui dépendent des titres (mis à la largeur de la colonne après preparer()).
  function mesurer() {
    if (POS.pret) return;
    const bas = (classe) => {
      const b = document.querySelector(`.bloc.${classe}`), l = [...b.querySelectorAll('.ligne')].pop();
      return l.offsetTop + l.offsetHeight;
    };
    const r = $('titres');
    POS.ox = r.offsetLeft; POS.oy = r.offsetTop;
    POS.dateY = bas('ch-fin-b1') - 0.06 * S;
    POS.platY = POS.dateY + HP + 0.11 * S;
    POS.appelY = bas('ch-fin-b2') + 54 + POS.appelH / 2;
    POS.appelX = POS.appelW / 2;
    POS.pret = true;
  }

  // La bulle : pavé cerise arrondi avec sa queue, trois points qui « écrivent » à tour de rôle.
  function dessinerBulle(t) {
    const g = gb, w = 64, h = 64;
    g.clearRect(0, 0, w, h);
    const x0 = 6, y0 = 9, bw = 53, bh = 40, r = 12;
    g.beginPath();
    g.moveTo(x0 + r, y0);
    g.arcTo(x0 + bw, y0, x0 + bw, y0 + bh, r);
    g.arcTo(x0 + bw, y0 + bh, x0, y0 + bh, r);
    g.lineTo(x0 + 22, y0 + bh);
    g.lineTo(x0 + 9, y0 + bh + 11);
    g.lineTo(x0 + 11, y0 + bh);
    g.arcTo(x0, y0 + bh, x0, y0, r);
    g.arcTo(x0, y0, x0 + bw, y0, r);
    g.closePath();
    g.fillStyle = C.cerise;
    g.fill();
    for (let i = 0; i < 3; i++) {
      const ph = ((t - tA) * 1.5 - i * 0.16) % 1;
      const saut = ph > 0 && ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI) : 0;
      g.beginPath();
      g.arc(x0 + 14.5 + i * 12, y0 + bh / 2 - 4 * saut, 4, 0, TAU);
      g.fillStyle = rgba(C.beurre, 0.62 + 0.38 * saut);
      g.fill();
    }
  }

  function cacher() { vis(date, 0); vis(appel, 0); vis(onde, 0); }

  function dessiner(t, X) {
    if (t < tO - 0.1 || t > tS + 0.6) { cacher(); return; }
    mesurer();

    // --- L'onde du dossier complet : de l'épingle 1 à l'épingle 7.
    for (const e of EPINGLES) {
      const p = prog(t, tO + (e.n - 1) * 0.085, 0.8);
      if (p <= 0 || p >= 1) continue;
      const [x, y, f] = ecranEpingle(X.P, e), r = 22 * clamp(f, 0.75, 1.3);
      const g = X.ctx;
      g.save();
      g.globalAlpha = X.horsTitres(y);
      g.beginPath(); g.arc(x, y, r + E.sortie(p) * 78, 0, TAU);
      g.strokeStyle = rgba(C.ceriseVif, (1 - p) ** 1.6 * 0.85); g.lineWidth = 3 * (1 - p) + 0.5; g.stroke();
      g.restore();
    }

    // --- La date.
    if (t < tG[0] - 0.1 || t > sortie1 + 0.6) vis(date, 0);
    else {
      vis(date, 1);
      style(date, 'transform', `translate3d(0,${POS.dateY.toFixed(2)}px,0)`);
      // Le pavé s'ouvre groupe par groupe, juste avant que les chiffres n'y roulent.
      let w = 0;
      GROUPES.forEach((_, i) => { w += (POS.largeurs[i] - (i ? POS.largeurs[i - 1] : 0)) * ressort(t - tG[i] + 0.05, 230, 26); });
      style(pave, 'width', `${w.toFixed(2)}px`);
      // Chaque chiffre monte depuis le bas du pavé et compte jusqu'à lui (léger décalage dans le groupe).
      GROUPES.forEach(([a, b], ig) => {
        for (let i = a; i < b; i++) {
          const col = cols[i], d = ressort(t - (tG[ig] + (i - a) * 0.05), 150, 21);
          const y = lerp(HP, -(col.n - 1) * HP, d);
          style(col.bande, 'transform', `translate3d(0,${y.toFixed(2)}px,0)`);
        }
      });
      // Sortie avec le titre : le pavé remonte dans son masque, comme un mot.
      const s = E.entree(prog(t, sortie1 + 0.02, 0.26));
      style(pave, 'transform', `translate3d(0,${(-s * 112).toFixed(2)}%,0)`);
      // Les plateformes, sous la date.
      const pe = ressort(t - tP, 210, 24), ps = E.entree(prog(t, sortie1 + 0.08, 0.24));
      style(plat, 'transform', `translate3d(0,${(POS.platY - POS.dateY).toFixed(2)}px,0)`);
      style(platTxt, 'transform', `translate3d(0,${((1 - pe) * 160 - ps * 160).toFixed(2)}%,0)`);
      vis(plat, t >= tP ? 1 : 0);
    }

    // --- La pastille d'appel : sort de l'épingle de l'enseigne, bat, y rentre.
    const e = ressort(t - tA, 170, 19);
    if (e <= 0.001) { vis(appel, 0); vis(onde, 0); return; }
    const [px0, py0] = ecranEpingle(X.P, ep), px = px0 - POS.ox, py = py0 - POS.oy;
    let x = lerp(px, POS.appelX, e), y = lerp(py, POS.appelY, e), s = lerp(0.1, 1, e), a = clamp(e * 4);
    // Battement : un léger gonflement, et une onde qui s'écarte du bord.
    const k = t >= tB ? ((t - tB) % BAT) / BAT : -1;
    const bat = k >= 0 && k < 0.32 ? Math.sin((k / 0.32) * Math.PI) : 0;
    s *= 1 + 0.028 * bat;
    const retour = E.entree(prog(t, tS, 0.4));
    if (retour > 0) { x = lerp(x, px, retour); y = lerp(y, py, retour); s *= 1 - 0.9 * retour; a *= 1 - retour * retour; }
    style(appel, 'transform', `translate3d(${(x - POS.appelW / 2).toFixed(2)}px,${(y - POS.appelH / 2).toFixed(2)}px,0) scale(${s.toFixed(4)})`);
    vis(appel, a);
    dessinerBulle(t);
    if (k >= 0 && k < 0.75 && retour <= 0) {
      const q = E.sortie(k / 0.75), g = 4 + 24 * q;
      style(onde, 'width', `${(POS.appelW + 2 * g).toFixed(1)}px`);
      style(onde, 'height', `${(POS.appelH + 2 * g).toFixed(1)}px`);
      style(onde, 'borderRadius', `${(POS.appelH / 2 + g).toFixed(1)}px`);
      style(onde, 'transform', `translate3d(${(x - POS.appelW / 2 - g).toFixed(2)}px,${(y - POS.appelH / 2 - g).toFixed(2)}px,0)`);
      vis(onde, 0.5 * (1 - q) * clamp((t - tB) / 0.05));
    } else vis(onde, 0);
  }

  // La carte s'assombrit un peu : les épingles (dessinées après le voile) ressortent.
  const voile = (t) => 0.42 * clamp(prog(t, tO - 0.2, 0.6)) * (1 - prog(t, tS - 0.2, 0.5));
  // Flou de mouvement : les chiffres qui roulent, la date qui sort, la pastille qui sort de l'épingle.
  const sous = (t) => (tG.some((g) => t > g - 0.02 && t < g + 0.45) || (t > sortie1 && t < sortie1 + 0.35) || (t > tA && t < tA + 0.3) ? 3 : 1);

  function sons(add) {
    for (const e of EPINGLES) add(tO + (e.n - 1) * 0.085, 'tic', 0.22);
    add(tG[0] - 0.05, 'clic', 0.42);
    GROUPES.forEach(([a, b], ig) => { for (let i = a; i < b; i++) if (DATE[i] !== '.') add(tG[ig] + (i - a) * 0.05 + 0.12, 'tic', 0.27); });
    add(tG[2] + 0.3, 'scintille', 0.35);
    add(tA, 'notif', 0.42);
    add(tS, 'clic', 0.3);
  }

  return { id: 'fin', blocs, preparer, dessiner, voile, legendes: [], sons, sous };
}
