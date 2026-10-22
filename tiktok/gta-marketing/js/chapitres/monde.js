// Le monde (pas de numéro de coup) — la campagne sort de Miami.
// « Et ça déborde : New York, Los Angeles… jusqu'aux portes de Paris. »
//
// La caméra (camera.js) quitte Wynwood, se pose sur New York, file sur Los Angeles, puis saute
// l'Atlantique jusqu'à Paris. L'idée : un trajet de compagnie aérienne qui se dessine de ville
// en ville et dont chaque escale fait surgir une photo.
// 1. Le trajet part de Miami (l'épingle prend le relais des 7 coups) et file vers New York ;
//    sa tête suit la caméra. À l'arrivée, une épingle tombe (onde).
// 2. « New York » : la fresque de Brooklyn sort de l'épingle ; le nom de la ville se pose
//    au-dessus d'elle. La caméra file sur Los Angeles sous la photo, qui reste.
// 3. « Los Angeles » : la fresque d'Hollywood sort de son épingle et passe devant ; New York
//    recule dans la pile. Sur « jusqu'aux », la pile rentre dans l'épingle d'Hollywood.
// 4. Plan large : Miami, New York, Los Angeles et le grand arc qui traverse l'Atlantique.
//    Sur « portes », la tour des Mercuriales sort de l'épingle de Paris ; « PARIS » tombe avec
//    la voix. Un anneau désigne les cordistes sur la façade ; leur photo en sort, en détail.
// 5. À la fin de la tenue, tout rentre dans l'épingle de Paris ; la caméra repart vers Miami.
// Le titre tient sur une ligne : la place entre lui et les photos va aux noms des villes.
import { C, clamp, lerp, prog, E, ressort, style } from '../outils.js';
import { carte, placer } from '../photos.js';
import { trajet, dessinerTrajet, epingle, texte, projeteur, LIEUX, RAD } from '../carte.js';

// Les photos (taille du fichier) et le point visé dans l'image (0..1) ; umax, vmin : bords à ne
// pas dépasser (la tour : un doigt sur l'objectif en haut à droite, et l'enseigne « LES
// MERCURIALES » qu'on couperait en plein mot).
const IM = {
  ny: { src: 'medias/monde-brooklyn.jpg', iw: 1153, ih: 2048, vise: [0.4, 0.56] },
  la: { src: 'medias/monde-hollywood.jpg', iw: 1351, ih: 2400, vise: [0.5, 0.43] },
  tour: { src: 'medias/monde-paris-tour.jpg', iw: 1920, ih: 2400, vise: [0.62, 0.53], umax: 0.93, vmin: 0.15 },
  pose: { src: 'medias/monde-paris-pose.jpg', iw: 1066, ih: 1600, vise: [0.45, 0.665] },
};
// Les cordistes sur la façade de la tour (dans l'image de la tour).
const CORDISTES = [0.83, 0.685];

// Cadres. Le haut des photos à ~165 px sous le titre (une ligne) : le nom de la ville tient
// entre les deux. Le bas au-dessus de la légende (y = 1262).
const F = { x: 540, y: 905, w: 490, h: 660 };              // devant (New York)
const FL = { x: 578, y: 905, w: 490, h: 660, r: 1.2 };     // devant, Los Angeles (décalé : New York dépasse à gauche)
const B = { x: 368, y: 938, s: 0.84, r: -6.5 };             // derrière (New York recule)
const FP = { x: 540, y: 905, w: 480, h: 660 };             // la tour
const D = { x: 748, y: 972, w: 262, h: 360, r: 3.5 };       // le détail des cordistes (la tour lui fait de la place)
const PLACE = 92;                                           // la tour glisse à gauche d'autant

const cover = (im, w, h) => Math.max(w / im.iw, h / im.ih);
// Cadrage d'une photo dans sa carte. object-fit: cover ne montre que la boîte de l'image : on
// choisit la fenêtre visible (taille w/kb × h/kb, centrée au plus près du point visé, sans
// sortir de la photo ni dépasser umax/vmin), puis object-position place la boîte et la
// translation (kx, ky) amène le centre de la fenêtre au centre du cadre.
function cadrer(im, w, h, kb, [u, v]) {
  const sc = cover(im, w, h), lw = im.iw * sc, lh = im.ih * sc;
  const fw = w / (kb * lw), fh = h / (kb * lh);
  const uc = clamp(u, fw / 2, (im.umax ?? 1) - fw / 2), vc = clamp(v, (im.vmin ?? 0) + fh / 2, 1 - fh / 2);
  const ox = clamp(w / 2 - uc * lw, w - lw, 0), oy = clamp(h / 2 - vc * lh, h - lh, 0);
  const tx = -kb * (ox + uc * lw - w / 2), ty = -kb * (oy + vc * lh - h / 2);
  const pos = `${lw - w > 0.5 ? ((100 * ox) / (w - lw)).toFixed(2) : 50}% ${lh - h > 0.5 ? ((100 * oy) / (h - lh)).toFixed(2) : 50}%`;
  return { kx: (100 * tx) / w, ky: (100 * ty) / h, pos, ox, oy, lw, lh };
}
// Place une carte cadrée (object-position compris).
function poser(c, im, o, vise) {
  const k = cadrer(im, o.w, o.h, o.kb, vise);
  style(c.img, 'objectPosition', k.pos);
  const p = { ...o, kx: k.kx, ky: k.ky };
  placer(c, p);
  return { ...p, ...k };
}
// Position à l'écran du point (u, v) de l'image d'une carte posée (p : retour de poser()).
function ecran(p, u, v) {
  const ex = (p.kx / 100) * p.w + p.kb * (p.ox + u * p.lw - p.w / 2), ey = (p.ky / 100) * p.h + p.kb * (p.oy + v * p.lh - p.h / 2);
  const a = ((p.r || 0) * Math.PI) / 180, s = p.s ?? 1;
  return [p.x + s * (ex * Math.cos(a) - ey * Math.sin(a)), p.y + s * (ex * Math.sin(a) + ey * Math.cos(a))];
}

// Nom de ville au-dessus d'un point (même dessin qu'etiquetteLieu), mais le nom et sa ligne de
// détail ont chacun leur entrée : à Paris, le détail arrive avant le nom.
function etiquette(g, x, y, nom, sous, { eNom = 1, eSous = 1, a = 1, taille = 70 } = {}) {
  if (a <= 0) return;
  g.save();
  g.font = `800 ${taille}px "Archivo"`; g.fontStretch = 'semi-condensed'; g.letterSpacing = '3px';
  const demi = g.measureText(nom).width / 2 + 10;
  g.restore();
  const dx = clamp(x, 90 + demi, 930 - demi) - x;
  if (eNom > 0) {
    texte(g, nom, x + dx, y - 34 - (1 - eNom) * 26, {
      taille, poids: 800, police: 'Archivo', etire: 'semi-condensed', espace: lerp(18, 3, clamp(eNom)), a: a * clamp(eNom * 1.4), aligne: 'center',
    });
  }
  if (eSous > 0) texte(g, sous, x + dx, y - 34 - taille * 0.98 - (1 - eSous) * 16, { taille: 23, poids: 500, espace: 3, a: a * clamp(eSous * 1.4 - 0.25) * 0.8, aligne: 'center' });
}

export default function creer(T, K) {
  const c = T.chap.monde, m = (mot, k) => T.mot('m1', mot, k);
  const vols = K.monde;                 // les trois vols de la caméra : → New York, → Los Angeles, → Paris

  // ------------------------------------------------------------ le trajet
  // Trois arcs : Miami → New York → Los Angeles → Paris. La tête de chaque arc suit la caméra
  // (point de l'arc le plus proche du centre visé) et touche la ville quand celle-ci arrive au
  // centre de l'image (à moins de 150 px) : l'épingle tombe à cet instant.
  const ARCS = [
    { tr: trajet(LIEUX.miami, LIEUX.brooklyn, 0.2), vol: vols[0], ll: LIEUX.brooklyn },
    { tr: trajet(LIEUX.brooklyn, LIEUX.hollywood, 0.2), vol: vols[1], ll: LIEUX.hollywood },
    { tr: trajet(LIEUX.hollywood, LIEUX.bagnolet, 0.2), vol: vols[2], ll: LIEUX.bagnolet },
  ];
  const brut = (arc, t) => {
    const cam = K.camera(t);
    let best = 0, bd = Infinity;
    arc.tr.pts.forEach((p, i) => { const d = (p[0] - cam.x) ** 2 + (p[1] - cam.y) ** 2; if (d < bd) { bd = d; best = i; } });
    return arc.tr.cum[best] / arc.tr.total;
  };
  for (const arc of ARCS) {
    let t = arc.vol.t0;
    for (; t < arc.vol.t1; t += 1 / 240) {
      const [x, y] = projeteur(K.camera(t)).ll(...arc.ll);
      if (Math.hypot(x - 540, y - 1075) < 150) break;
    }
    arc.arrivee = t;
    arc.pArr = Math.max(0.5, brut(arc, t));
  }
  const tete = (arc, t) => (t <= arc.vol.t0 ? 0 : t >= arc.arrivee ? 1 : clamp(brut(arc, t) / arc.pArr));

  // ------------------------------------------------------------ les instants
  const [aNY, aLA, aPA] = ARCS.map((a) => a.arrivee);
  const tNY = Math.max(m('New York') - 0.2, aNY + 0.1);       // la fresque de Brooklyn sort de l'épingle
  const tLA = Math.max(m('Los Angeles') - 0.12, aLA + 0.02);  // celle d'Hollywood passe devant
  const tR = m('jusqu') - 0.02;                                // la pile rentre dans l'épingle d'Hollywood
  const tP = Math.max(m('portes') - 0.05, aPA + 0.04);         // la tour sort de l'épingle de Paris
  const tPN = m('Paris') - 0.06;                               // « PARIS »
  const tO = tPN + 0.16;                                       // anneau sur les cordistes…
  const tD = tO + 0.18;                                        // … leur photo en sort
  const tS = c.tenue - 0.05;                                   // tout rentre dans l'épingle de Paris

  const blocs = [
    { sortie: c.tenue + 0.2, lignes: [[['Et', m('Et')], ['ça', m('ça')], ['déborde.', m('déborde'), 'accent']]] },
  ];

  let cartes = {};
  function preparer() {
    for (const k of Object.keys(IM)) cartes[k] = carte(IM[k].src);
  }

  // Sortie d'une épingle (ressort), cadre cible, retour dans une épingle à tRetour.
  function sortir(t, t0, pin, cible, tRetour, pinRetour) {
    const e = ressort(t - t0, 175, 19);
    if (e <= 0.001) return null;
    let o = { x: lerp(pin[0], cible.x, e), y: lerp(pin[1], cible.y, e), w: cible.w, h: cible.h, r: lerp(0, cible.r || 0, e), s: lerp(0.1, 1, e) * (cible.s || 1), a: clamp(e * 4) };
    const q = E.entree(prog(t, tRetour, 0.38));
    if (q > 0) o = { ...o, x: lerp(o.x, pinRetour[0], q), y: lerp(o.y, pinRetour[1], q), s: o.s * (1 - 0.9 * q), a: o.a * (1 - q * q) };
    return q >= 1 ? null : { ...o, e, q };
  }

  function dessiner(t, X) {
    if (t < vols[0].t0 || t > tS + 0.7) return;
    const { ctx, P, cam } = X, g = X.dessus, largeur = cam.w / RAD;
    const pNY = P.ll(...LIEUX.brooklyn), pLA = P.ll(...LIEUX.hollywood), pPA = P.ll(...LIEUX.bagnolet), pMI = P.ll(...LIEUX.miami);
    // Pendant les vols les plus rapides, les petits noms de ville s'effacent : avec le flou de
    // mouvement (3 sous-images sur 1/180 s), ils se dédoubleraient au lieu de filer.
    const P2 = projeteur(K.camera(t + 1 / 180));
    const net = (ll, [x, y]) => { const [x2, y2] = P2.ll(...ll); return clamp(1 - (Math.hypot(x2 - x, y2 - y) - 6) / 14); };
    const fin = 1 - prog(t, tS + 0.05, 0.45);       // le trajet s'efface quand la caméra repart

    // --- Le trajet et les épingles des escales (sur la carte, sous les photos).
    ARCS.forEach((arc, i) => {
      const p = tete(arc, t);
      if (p > 0) dessinerTrajet(ctx, P, arc.tr, p, { a: fin, tete: 1 - prog(t, arc.arrivee, 0.35) });
    });
    // Miami prend le relais des 7 épingles quand on s'éloigne (elles s'effacent de 1° à 1,6°).
    const aMI = clamp((largeur - 1.05) / 0.5) * fin;
    if (aMI > 0) {
      epingle(ctx, pMI[0], pMI[1], { a: aMI * X.horsTitres(pMI[1]), r: 7, halo: 0.6 });
      texte(ctx, 'MIAMI', pMI[0] + 18, pMI[1] - 16, { taille: 20, poids: 600, espace: 3, a: 0.75 * aMI * X.horsTitres(pMI[1]) * net(LIEUX.miami, pMI) });
    }
    [[LIEUX.brooklyn, pNY, aNY, 'NEW YORK', tLA], [LIEUX.hollywood, pLA, aLA, 'LOS ANGELES', tR + 0.3], [LIEUX.bagnolet, pPA, aPA, null, Infinity]].forEach(([ll, pt, a0, nom, petit]) => {
      if (t < a0) return;
      const e = ressort(t - a0, 260, 16), zone = X.horsTitres(pt[1]);
      epingle(ctx, pt[0], pt[1], { a: clamp(e * 3) * fin * zone, r: 7 + 2 * e, onde: prog(t, a0, 0.9), halo: 1 });
      // Une fois l'escale passée, son nom reste en petit (plan large au-dessus de l'Atlantique).
      if (nom && t > petit) texte(ctx, nom, pt[0] + 18, pt[1] - 16, { taille: 20, poids: 600, espace: 3, a: 0.75 * clamp(prog(t, petit, 0.3)) * fin * zone * net(ll, pt) });
    });

    // --- New York, puis Los Angeles (pile), puis tout rentre dans l'épingle d'Hollywood.
    const ny = sortir(t, tNY, pNY, F, tR, pLA);
    if (ny) {
      // À l'arrivée de Los Angeles, New York recule derrière (et s'assombrit).
      const b = E.sortie(prog(t, tLA - 0.04, 0.5));
      const o = { ...ny, x: lerp(ny.x, B.x, b), y: lerp(ny.y, B.y, b), r: lerp(ny.r, B.r, b), s: ny.s * lerp(1, B.s, b), z: 4 };
      const kb = lerp(1.12, 1.04, E.doux(prog(t, tNY, tR - tNY)));
      poser(cartes.ny, IM.ny, { ...o, kb }, IM.ny.vise);
      style(cartes.ny.img, 'filter', `contrast(1.05) saturate(.9) brightness(${(1 - 0.36 * b).toFixed(3)})`);
      // Le nom attend au-dessus de la place de la photo ; il s'efface quand Los Angeles arrive.
      etiquette(g, F.x, F.y - F.h / 2 + 16, 'NEW YORK', 'BROOKLYN · PEINTE À LA MAIN', {
        eNom: ressort(t - (m('New York') - 0.08), 230, 19), eSous: ressort(t - (m('New York') - 0.02), 230, 19), a: (1 - prog(t, tLA - 0.12, 0.14)) * clamp(ny.e * 3),
      });
    }
    const la = sortir(t, tLA, pLA, FL, tR, pLA);
    if (la) {
      const kb = lerp(1.12, 1.04, E.doux(prog(t, tLA, tR - tLA)));
      poser(cartes.la, IM.la, { ...la, z: 6, kb }, IM.la.vise);
      etiquette(g, FL.x, FL.y - FL.h / 2 + 16, 'LOS ANGELES', 'HOLLYWOOD · JASON & LUCIA', {
        eNom: ressort(t - (m('Los Angeles') - 0.04), 230, 19), eSous: ressort(t - (m('Los Angeles') + 0.04), 230, 19), a: (1 - prog(t, tR, 0.2)) * clamp(la.e * 3),
      });
    }

    // --- Paris : la tour, puis le détail des cordistes.
    const tour = sortir(t, tP, pPA, FP, tS, pPA);
    if (tour) {
      // Poussée lente vers l'affiche ; sur « Paris », un petit à-coup (la photo s'avance).
      const bump = ressort(t - tPN, 260, 14) - ressort(t - tPN - 0.09, 260, 14);
      const kb = lerp(1.18, 1.28, E.doux(prog(t, tP, tS - tP)));
      // Quand le détail des cordistes sort, la tour glisse à gauche pour lui faire de la place.
      const place = PLACE * E.sortie(prog(t, tD - 0.04, 0.5)) * (1 - tour.q);
      const o = poser(cartes.tour, IM.tour, { ...tour, x: tour.x - place, s: tour.s * (1 + 0.025 * bump), z: 4, kb }, IM.tour.vise);
      etiquette(g, FP.x, FP.y - FP.h / 2 + 16, 'PARIS', 'PORTE DE BAGNOLET · LES MERCURIALES', {
        eNom: ressort(t - tPN, 230, 19), eSous: ressort(t - tP - 0.12, 230, 19), a: (1 - prog(t, tS, 0.2)) * clamp(tour.e * 3), taille: 92,
      });
      // Anneau cerise autour des cordistes, sur la façade ; leur photo en sort.
      const [cx, cy] = ecran(o, ...CORDISTES);
      const an = clamp(prog(t, tO, 0.16)) * (1 - prog(t, tD + 0.02, 0.14)) * (1 - tour.q);
      if (an > 0) {
        const rr = lerp(70, 38, E.sortie(prog(t, tO, 0.35)));
        g.save();
        g.globalAlpha = an;
        g.lineWidth = 4.5; g.strokeStyle = C.ceriseVif;
        g.shadowColor = C.cerise; g.shadowBlur = 20;
        g.beginPath(); g.ellipse(cx, cy, rr * 0.8, rr * 1.25, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      const det = sortir(t, tD, [cx, cy], D, tS, pPA);
      if (det) {
        const kbD = lerp(1.95, 1.75, E.doux(prog(t, tD, tS - tD)));
        poser(cartes.pose, IM.pose, { ...det, z: 8, kb: kbD, rayon: 20 }, IM.pose.vise);
      }
    }
  }

  // La carte s'assombrit sous les photos ; elle se dégage pendant le saut de l'Atlantique.
  const voile = (t) => Math.max(
    clamp(prog(t, tNY - 0.1, 0.4)) * (1 - prog(t, tR + 0.05, 0.35)),
    clamp(prog(t, tP - 0.05, 0.4)) * (1 - prog(t, tS + 0.1, 0.4)),
  );
  const legendes = [{ de: tNY + 0.3, a: tS, html: 'BROOKLYN · HOLLYWOOD · BAGNOLET\n<small>PHOTOS @GTAVI_COUNTDOWN · @DUVALVICE · @GTASIX_ · @BRUNODECOTTIGNI</small>' }];

  function sons(add) {
    add(aNY, 'ping', 0.4);
    add(tNY, 'clic', 0.45);
    add(aLA, 'ping', 0.4);
    add(tLA, 'clic', 0.45);
    add(tR, 'clic', 0.3);
    add(tR + 0.1, 'montee', 0.4, { duree: aPA - tR - 0.1 });   // le grand saut au-dessus de l'Atlantique
    add(aPA, 'ping', 0.4);
    add(tP, 'clic', 0.45);
    add(tPN, 'impact', 0.45);
    add(tO, 'scintille', 0.3);
    add(tD, 'clic', 0.4);
    add(tS, 'clic', 0.3);
  }

  // Flou de mouvement sur les gestes rapides hors des vols de caméra : le détail des cordistes
  // qui sort, et le retour final dans l'épingle (avant que la caméra ne reparte).
  const sous = (t) => ((t > tD - 0.02 && t < tD + 0.3) || (t > tS && t < tS + 0.45) ? 3 : 1);

  return { id: 'monde', blocs, preparer, dessiner, voile, legendes, sons, sous };
}
