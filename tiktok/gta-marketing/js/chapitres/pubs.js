// Coup n° 1 — les fausses pubs du jeu dans la vraie rue (Wynwood, bornes de NW 26th St).
// « Un : les pubs des fausses marques du jeu, en pleine rue. Pas de nom, juste Vice City et un QR code. »
//
// Chapitre modèle : c'est lui que les autres imitent (voir CHAPITRES.md).
// 1. La caméra se pose sur l'épingle 1 ; la borne Kowalski sort de l'épingle (ressort).
// 2. Travelling : les six bornes défilent de droite à gauche comme si on marchait dans la rue
//    (défilement en « cover flow » : celles du bord sont plus petites et plus sombres).
// 3. Le défilement se pose sur la borne Pfister, qui avance ; sur « QR code », on plonge dans
//    son QR code (anneau cerise + pastille). 4. Tout rentre dans l'épingle, la caméra repart.
import { W, C, rgba, clamp, lerp, prog, E, ressort } from '../outils.js';
import { carte, placer } from '../photos.js';
import { EPINGLES, ecranEpingle } from '../epingles.js';
import { texte } from '../carte.js';

// Les six bornes, dans l'ordre du défilement. qr : position du QR code dans l'image (0..1).
const BORNES = [
  { src: 'medias/creapills-60.jpeg' },  // Kowalski (bijoutier) — « Suddenly you are big enough »
  { src: 'medias/creapills-62.jpeg' },  // Kronos (montres)
  { src: 'medias/creapills-64.jpeg' },  // Zenith Gym
  { src: 'medias/creapills-68.jpeg' },  // Megamundo (telenovela)
  { src: 'medias/creapills-70.jpeg' },  // ItalRSX
  { src: 'medias/creapills-58.jpeg', qr: [0.507, 0.82] },  // Pfister « Go topless » : on finit ici
];

export default function creer(T) {
  const c = T.chap.pubs, m = (mot, k) => T.mot('c1', mot, k);
  const tA = m('pubs') - 0.15;          // la première borne sort de l'épingle
  const tB = m('fausses') + 0.25;       // le travelling commence
  const tC = m('juste') - 0.05;         // il se pose sur la borne Pfister, qui avance
  const tQR = m('QR') - 0.1;            // plongée dans le QR code
  const tS = c.tenue - 0.05;           // tout rentre dans l'épingle (après le gros plan du QR code)
  const ep = EPINGLES.find((e) => e.chap === 'pubs');

  const blocs = [
    { sortie: m('Pas de nom') - 0.12, lignes: [[['01', m('Un'), 'num'], ['Des pubs', m('pubs')], ['du jeu', m('jeu')]], [['en', m('en pleine')], ['pleine rue.', m('pleine'), 'accent']]] },
    { sortie: c.tenue + 0.2, lignes: [[['Pas de nom.', m('Pas de nom')]], [['Juste', m('juste')], ['un QR code.', m('QR'), 'accent']]] },
  ];

  let cartes = [];
  function preparer() { cartes = BORNES.map((b) => ({ ...b, c: carte(b.src) })); }

  const RANG = { y: 980, w: 400, h: 520, pas: 450 };
  const FOCUS = { x: W / 2, y: 990, w: 640, h: 800 };

  function dessiner(t, X) {
    if (t < tA - 0.1 || t > tS + 0.6) return;
    const [px, py] = ecranEpingle(X.P, ep);
    // Défilement : s va de 0 (Kowalski au centre) à 5 (Pfister au centre).
    const s = 5 * E.doux(prog(t, tB, tC - tB));
    const retour = E.entree(prog(t, tS, 0.4));                 // tout rentre dans l'épingle
    cartes.forEach((b, i) => {
      const d = i - s;                                           // écart au centre, en bornes
      // Entrée : la première borne sort de l'épingle ; les autres attendent hors champ, à droite,
      // et entrent avec le travelling.
      const e = i === 0 ? ressort(t - tA, 180, 20) : t >= tB - 0.05 ? 1 : 0;
      if (e <= 0.001) return;
      let x = W / 2 + d * RANG.pas, y = RANG.y, w = RANG.w, h = RANG.h;
      let sc = 1 - 0.13 * Math.min(2, Math.abs(d)), r = clamp(d, -2, 2) * 3, a = 1 - 0.32 * Math.min(1, Math.abs(d) - 0.2 > 0 ? Math.abs(d) - 0.2 : 0);
      let kb = 1.1, kx = 0, ky = 0, z = 10 - Math.round(Math.abs(d) * 2);
      // La borne Pfister avance (focus), puis la caméra plonge dans son QR code.
      if (i === 5) {
        const f = ressort(t - tC, 170, 20);
        x = lerp(x, FOCUS.x, f); y = lerp(y, FOCUS.y, f); w = lerp(w, FOCUS.w, f); h = lerp(h, FOCUS.h, f);
        sc = lerp(sc, 1, f); r = lerp(r, 0, f); a = lerp(a, 1, f); z = 20;
        const q = E.traversee(prog(t, tQR, 0.9));
        kb = lerp(1.06, 5.2, q);
        kx = -kb * (b.qr[0] - 0.5) * 100 * q; ky = -kb * (b.qr[1] - 0.5) * 100 * q;
      } else if (t > tC) {
        // Les autres s'écartent et s'éteignent.
        const f = E.entree(prog(t, tC, 0.45));
        x += Math.sign(d || 1) * f * 500; a *= 1 - f;
      }
      // Sortie de l'épingle au début (première borne), retour dans l'épingle à la fin.
      x = lerp(px, x, e); y = lerp(py, y, e); sc *= lerp(0.1, 1, e); a *= clamp(e * 4);
      if (x > W + 260 || x < -260) return;
      if (retour > 0) { x = lerp(x, px, retour); y = lerp(y, py, retour); sc *= 1 - 0.9 * retour; a *= 1 - retour * retour; }
      placer(b.c, { x, y, w, h, r, s: sc, a, z, kb, kx, ky });
    });
    // Anneau cerise autour du QR code, et sa pastille.
    const q = clamp(prog(t, tQR + 0.55, 0.35)) * (1 - retour);
    if (q > 0) {
      const g = X.dessus, rr = lerp(40, 118, E.sortie(q));
      g.save();
      g.globalAlpha = q;
      g.lineWidth = 6; g.strokeStyle = C.ceriseVif;
      g.shadowColor = rgba(C.cerise, 0.9); g.shadowBlur = 24;
      g.beginPath(); g.arc(FOCUS.x, FOCUS.y, rr, 0, Math.PI * 2); g.stroke();
      g.restore();
      texte(g, 'QR CODE → ROCKSTAR', FOCUS.x, FOCUS.y + rr + 54, { taille: 30, poids: 700, espace: 4, a: q, aligne: 'center' });
    }
  }

  const voile = (t) => clamp(prog(t, tA - 0.2, 0.4)) * (1 - prog(t, tS + 0.1, 0.4));
  const legendes = [{ de: tA + 0.3, a: tS, html: 'WYNWOOD · NW 26TH ST\n<small>OCT. 2026 · PHOTOS CREAPILLS</small>' }];

  function sons(add) {
    add(tA, 'clic', 0.5);
    add(tB, 'glisse', 0.55, { duree: tC - tB });
    for (let i = 1; i <= 5; i++) {
      // Un tic quand chaque borne passe au centre.
      let lo = tB, hi = tC;
      for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (5 * E.doux(prog(mid, tB, tC - tB)) < i) lo = mid; else hi = mid; }
      add(lo, 'tic', 0.3);
    }
    add(tC, 'ping', 0.4);
    add(tQR, 'scintille', 0.4);
    add(tQR + 0.55, 'clic', 0.45);
    add(tS, 'clic', 0.3);
  }

  return { id: 'pubs', blocs, preparer, dessiner, voile, legendes, sons };
}
