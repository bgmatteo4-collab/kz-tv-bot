// Coup n° 5 — la plage de South Beach aux couleurs de Vice City, et les avions-banderoles.
// « Cinq : chaises longues, parasols, et des avions-banderoles pour un club qui n'existe pas. »
//
// Idée de mouvement : on lève les yeux, du sable vers le ciel (panoramique vertical), au rythme
// de l'énumération.
// 1. La caméra se pose sur l'épingle 5 ; sur « chaises », la chaise bleue « Vice city » sort de
//    l'épingle ; sur « longues », les deux chaises rouges « VI » la rejoignent.
// 2. « parasols » : on lève les yeux. Tout descend d'un cran ; la rangée de parasols arrive par
//    le haut, de derrière l'horizon (sous les titres), et les chaises passent au premier plan.
// 3. « et des avions » : on lève encore les yeux, jusqu'au ciel au-dessus de South Beach
//    (l'avion « Welcome to Vice City »). Sur « banderoles », la banderole NINE1NINE traverse
//    l'image de droite à gauche, tirée par son avion ; la caméra la rattrape et l'arrête au centre.
// 4. « pour un club » : gros plan sur NINE1NINE, l'étiquette « CLUB FICTIF DU JEU » se pose
//    dessous. Tout rentre dans l'épingle, la caméra repart.
import { W, C, rgba, clamp, lerp, prog, E, ressort, style } from '../outils.js';
import { carte, placer } from '../photos.js';
import { EPINGLES, ecranEpingle } from '../epingles.js';

// Les photos. iw, ih : taille du fichier ; vise : point de l'image (fractions) tenu au centre
// du cadre. Repères mesurés sur les fichiers.
const BLEUE = { src: 'medias/plage-chaise-bleue.jpg', iw: 1536, ih: 2048, vise: [0.5, 0.44] };     // « Vice city » en rose
const ROUGES = { src: 'medias/plage-chaises-rouges.jpg', iw: 1536, ih: 2048, vise: [0.5, 0.44] };  // deux chaises « VI » face à la mer
const PARASOLS = { src: 'medias/plage-parasols.jpg', iw: 2100, ih: 731, vise: [0.6, 0.6] };       // rangée de parasols « VI »
const CIEL = { src: 'medias/plage-avion-bienvenue.jpg', iw: 972, ih: 1097, vise: [0.53, 0.52] };   // « Welcome to Vice City » au-dessus de South Beach
// NINE1NINE : centre du mot et sa largeur (fraction de la largeur du fichier), bas de la banderole.
const NINE = { src: 'medias/plage-avion-nine1nine.jpg', iw: 972, ih: 1097, mot: [0.602, 0.556], large: 0.263, bas: 0.628 };

// Cadres (centre, taille, rotation) à l'instant où chaque photo est « posée ».
const SLOT = {
  bleue: { x: 330, y: 985, w: 400, h: 533, r: -2.5 },
  rouges: { x: 752, y: 1008, w: 400, h: 533, r: 2 },
  parasols: { x: W / 2, y: 900, w: 960, h: 334, r: 0 },
  ciel: { x: W / 2, y: 930, w: 840, h: 600, r: 0 },
  passe: { y: 930, w: 760, h: 430 },   // la banderole qui traverse
  focus: { x: W / 2, y: 930, w: 860, h: 640 },
};
const D1 = 420, D2 = 640;    // les deux crans du panoramique (px)
const HZ = 612, FONDU = 90;   // l'horizon : ligne sous les titres d'où les photos descendent
const KB_PASSE = 2.35;        // la banderole remplit le cadre pendant sa traversée
const LARGE_MOT = 600;        // largeur de « NINE1NINE » au gros plan (px)

const cover = (im, w, h) => Math.max(w / im.iw, h / im.ih);
// Écart au centre de la carte (px, avant rotation et échelle) du point (u, v) de l'image.
function ecart(im, p, u, v) {
  const sc = cover(im, p.w, p.h);
  return [(p.kx / 100) * p.w + p.kb * (u - 0.5) * im.iw * sc, (p.ky / 100) * p.h + p.kb * (v - 0.5) * im.ih * sc];
}
// Position à l'écran du point (u, v) de l'image d'une carte placée avec les paramètres p.
function ecran(im, p, u, v) {
  const [ex, ey] = ecart(im, p, u, v), a = ((p.r || 0) * Math.PI) / 180, s = p.s ?? 1;
  return [p.x + s * (ex * Math.cos(a) - ey * Math.sin(a)), p.y + s * (ex * Math.sin(a) + ey * Math.cos(a))];
}
// Décalage (kx, ky en %) qui amène le point (u, v) à (dx, dy) du centre du cadre, sans découvrir de bord.
function viser(im, w, h, kb, u, v, dx = 0, dy = 0) {
  const sc = cover(im, w, h), mx = Math.max(0, (im.iw * sc * kb - w) / 2), my = Math.max(0, (im.ih * sc * kb - h) / 2);
  const tx = clamp(dx - kb * (u - 0.5) * im.iw * sc, -mx, mx), ty = clamp(dy - kb * (v - 0.5) * im.ih * sc, -my, my);
  return { kx: (tx / w) * 100, ky: (ty / h) * 100 };
}

const CSS = `
.photo.ch-plage-horizon { -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; mask-clip: no-clip; -webkit-mask-origin: border-box; mask-origin: border-box;
  -webkit-mask-position: -140px -140px; mask-position: -140px -140px; -webkit-mask-size: calc(100% + 280px) calc(100% + 280px); mask-size: calc(100% + 280px) calc(100% + 280px); }
`;
const MARGE = 140;

export default function creer(T) {
  const c = T.chap.plage, m = (mot, k) => T.mot('c5', mot, k);
  const ep = EPINGLES.find((e) => e.chap === 'plage');
  const tC1 = m('chaises') - 0.1;        // la chaise bleue sort de l'épingle
  const tC2 = m('longues') - 0.1;        // les chaises rouges
  const tP = m('parasols') - 0.16;       // premier cran : les parasols
  const DP = 0.56;
  const tV = m('et des') - 0.06;         // deuxième cran : le ciel
  const DV = 0.62;
  const tB = m('banderoles') - 0.12;     // la banderole entre à droite…
  const DB = 0.95;                        // … et la caméra la rattrape au centre
  const tF = m('club') - 0.32;           // gros plan sur NINE1NINE
  const DF = 0.85;
  const tE = m('club') + 0.08;           // l'étiquette se pose
  const tS = c.tenue - 0.05;             // tout rentre dans l'épingle

  const blocs = [
    { sortie: m('pour') - 0.3, lignes: [[['05', m('Cinq'), 'num'], ['Chaises,', m('chaises')], ['parasols', m('parasols')]], [['et', m('et des')], ['avions…', m('avions'), 'accent']]] },
    { sortie: c.tenue + 0.2, lignes: [[['Pour', m('pour')], ['un club', m('un club')]], [['qui', m('qui')], ['n’existe pas.', m("n'existe"), 'accent']]] },
  ];

  let cartes = {};
  function preparer() {
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
    const opt = { classe: 'ch-plage-horizon' };
    cartes = { bleue: carte(BLEUE.src, opt), rouges: carte(ROUGES.src, opt), parasols: carte(PARASOLS.src, opt), ciel: carte(CIEL.src, opt), nine: carte(NINE.src) };
  }

  // Le panoramique vertical : décalage (px vers le bas) de tout ce qui est posé.
  const bascule = (t) => D1 * E.traversee(prog(t, tP, DP)) + D2 * E.traversee(prog(t, tV, DV));

  // Masque de l'horizon : la carte n'apparaît que sous la ligne HZ (fondu de FONDU px).
  function horizon(cc, p) {
    const s = p.s ?? 1, haut = p.y - (p.h / 2) * s;
    if (haut >= HZ + FONDU / 2 + 4) { style(cc.el, 'maskImage', 'none'); style(cc.el, 'webkitMaskImage', 'none'); return; }
    const a0 = MARGE + p.h / 2 + (HZ - FONDU / 2 - p.y) / s, a1 = a0 + FONDU / s;
    const g = `linear-gradient(180deg, transparent ${a0.toFixed(1)}px, #000 ${a1.toFixed(1)}px)`;
    style(cc.el, 'maskImage', g); style(cc.el, 'webkitMaskImage', g);
  }

  // Pose d'une photo du panoramique : y du cadre + décalage de la bascule.
  function posee(im, slot, t, y0, kb0 = 1.1) {
    const vie = E.doux(clamp((t - tC1) / 4));
    const kb = lerp(kb0, kb0 - 0.05, vie);
    return { x: slot.x, y: y0 + bascule(t), w: slot.w, h: slot.h, r: slot.r, s: 1, a: 1, z: 2, kb, ...viser(im, slot.w, slot.h, kb, ...im.vise) };
  }

  // La banderole : traversée de droite à gauche, rattrapée au centre, puis gros plan.
  function banderole(t) {
    const d = t - tB;
    if (d < 0) return null;
    const u = clamp(d / DB), f = 1 - (1 - u) ** 2.4;          // vitesse de remorquage, puis on la rattrape
    const x0 = W + SLOT.passe.w / 2 + 40;
    const calme = E.doux(clamp(d / (DB + 0.3)));
    // Elle flotte au bout de son câble : roulis et houle, qui se calment quand on la tient.
    const r = (1 - calme) * (2.2 + 1.3 * Math.sin(d * 13.5));
    const y = SLOT.passe.y + (1 - calme) * 9 * Math.sin(d * 9 + 0.6);
    const g = ressort(t - tF, 160, 21);
    const w = lerp(SLOT.passe.w, SLOT.focus.w, g), h = lerp(SLOT.passe.h, SLOT.focus.h, g);
    // Cadrage : la banderole remplit le cadre, puis on serre sur NINE1NINE.
    const kbF = LARGE_MOT / (NINE.large * NINE.iw * cover(NINE, SLOT.focus.w, SLOT.focus.h));
    const q = E.traversee(prog(t, tF, DF));
    const kb = lerp(KB_PASSE, kbF, q) * lerp(1, 1.04, E.doux(prog(t, tF + DF, tS - tF - DF)));
    // Dans le cadre, l'image glisse encore un peu vers la gauche (l'avion continue d'avancer).
    const glisse = 22 * (1 - E.sortie(clamp(d / (DB + 0.6))));
    const k = viser(NINE, w, h, kb, ...NINE.mot, glisse, lerp(-8, -40, q));
    return { x: lerp(x0, SLOT.focus.x, f), y: lerp(y, SLOT.focus.y, g), w, h, r, s: 1, a: 1, z: 20, kb, ...k };
  }

  // Étiquette « CLUB FICTIF DU JEU » : pastille marine, pointe vers le haut (vers la banderole).
  function etiquette(g, x, y, e, a) {
    if (e <= 0.001 || a <= 0) return;
    const txt = 'CLUB FICTIF DU JEU', h = 58;
    g.save();
    g.font = '600 29px "JetBrains Mono"'; g.letterSpacing = '3px';
    const lt = g.measureText(txt).width, w = lt + 36 + 28;
    g.translate(x, y);
    g.scale(lerp(0.7, 1, e), lerp(0.7, 1, e));
    g.translate(0, (1 - e) * -14);
    g.globalAlpha = a * clamp(e * 3);
    g.beginPath();
    g.roundRect(-w / 2, 12, w, h, 14);
    g.moveTo(-11, 12.5); g.lineTo(0, 0); g.lineTo(11, 12.5);
    g.fillStyle = rgba(C.marine, 0.93); g.shadowColor = 'rgba(3,8,20,0.45)'; g.shadowBlur = 26; g.shadowOffsetY = 8; g.fill();
    g.shadowColor = 'transparent';
    g.beginPath(); g.roundRect(-w / 2, 12, w, h, 14); g.lineWidth = 1.2; g.strokeStyle = rgba(C.beurre, 0.2); g.stroke();
    g.fillStyle = C.cerise; g.fillRect(-w / 2 + 20, 12 + h / 2 - 6, 12, 12);
    g.fillStyle = C.beurre; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(txt, -w / 2 + 20 + 12 + 16, 12 + h / 2 + 1.5);
    g.restore();
  }

  function dessiner(t, X) {
    if (t < tC1 - 0.1 || t > tS + 0.6) return;
    const pin = ecranEpingle(X.P, ep);
    const retour = E.entree(prog(t, tS, 0.4));
    const rentre = (o) => (retour <= 0 ? o
      : { ...o, x: lerp(o.x, pin[0], retour), y: lerp(o.y, pin[1], retour), s: o.s * (1 - 0.9 * retour), a: o.a * (1 - retour * retour) });
    const B = bascule(t);

    // 1. Les chaises : sortent de l'épingle sur « chaises » et « longues ».
    [['bleue', BLEUE, tC1, 2], ['rouges', ROUGES, tC2, 3]].forEach(([id, im, t0, z]) => {
      const e = ressort(t - t0, 180, 20);
      if (e <= 0.001) return;
      const sl = SLOT[id], p = posee(im, sl, t, sl.y);
      p.x = lerp(pin[0], p.x, e); p.y = lerp(pin[1], p.y, e); p.s = lerp(0.1, 1, e); p.a = clamp(e * 4); p.r *= e; p.z = z;
      if (p.y - p.h / 2 > 1500) return;
      placer(cartes[id], rentre(p));
      horizon(cartes[id], p);
    });

    // 2. Les parasols : descendent de l'horizon au premier cran.
    if (t >= tP) {
      const p = posee(PARASOLS, SLOT.parasols, t, SLOT.parasols.y - D1, 1.12);
      p.z = 4; p.a = clamp((t - tP) / 0.12);
      if (p.y - p.h / 2 < 1500) { placer(cartes.parasols, rentre(p)); horizon(cartes.parasols, p); }
    }

    // 3. Le ciel au-dessus de South Beach : descend au deuxième cran ; recule quand la banderole passe.
    if (t >= tV) {
      const p = posee(CIEL, SLOT.ciel, t, SLOT.ciel.y - D1 - D2, 1.08);
      const recul = E.doux(prog(t, tF, 0.6));
      p.z = 5; p.a = clamp((t - tV) / 0.12); p.s = 1 - 0.08 * recul;
      placer(cartes.ciel, rentre(p));
      horizon(cartes.ciel, p);
      style(cartes.ciel.img, 'filter', `contrast(1.05) saturate(.9) brightness(${(1 - 0.35 * recul).toFixed(3)})`);
    }

    // 4. La banderole NINE1NINE, puis le gros plan et l'étiquette.
    const b = banderole(t);
    if (b) {
      const o = rentre(b);
      placer(cartes.nine, o);
      const [mx, my] = ecran(NINE, o, ...NINE.mot);
      const [, by] = ecran(NINE, o, NINE.mot[0], NINE.bas);
      etiquette(X.dessus, mx, by + 14, ressort(t - tE, 210, 20), 1 - E.sortie(prog(t, tS, 0.22)));
    }
    void B;
  }

  const voile = (t) => clamp(prog(t, tC1 - 0.2, 0.4)) * (1 - prog(t, tS + 0.1, 0.4));
  const legendes = [{ de: tC1 + 0.3, a: tS, html: 'SOUTH BEACH · OCT. 2026\n<small>PHOTOS @SAMCHRME · @VIDEOTECH · GTA BOOM</small>' }];
  // Flou de mouvement : sorties de l'épingle, les deux crans, la traversée, le retour.
  const rapide = [[tC1, tC1 + 0.22], [tC2, tC2 + 0.22], [tP + 0.08, tP + DP - 0.1], [tV + 0.08, tV + DV - 0.1], [tB, tB + DB * 0.6], [tS, tS + 0.42]];
  const sous = (t) => (rapide.some(([a, b]) => t > a && t < b) ? 3 : 1);

  function sons(add) {
    add(tC1, 'clic', 0.5);
    add(tC2, 'clic', 0.45);
    add(tP + 0.05, 'glisse', 0.4, { hauteur: 0 });
    add(tV + 0.05, 'glisse', 0.45, { hauteur: 2 });
    add(tB - 0.1, 'glisse', 0.42, { hauteur: 1 });   // de droite à gauche
    add(tB, 'souffle', 0.28, { duree: 1.6 });          // le vent, là-haut
    add(tF, 'scintille', 0.3);
    add(tE, 'clic', 0.4);
    add(tS, 'clic', 0.3);
  }

  return { id: 'plage', blocs, preparer, dessiner, voile, legendes, sons, sous };
}
