// Coup n° 3 — l'enseigne « Welcome to Vice City » sur le toit du Kaseya Center (l'arène du Heat).
// « Trois : cette enseigne, sur le toit de l'arène du Heat, visible depuis les avions.
//   Près d'un million de dollars. »
//
// On revient sur l'image de l'accroche, mais vue du ciel :
// 1. La caméra se pose sur l'épingle 3 ; la vue d'hélicoptère (WPLG Local 10) en sort (ressort).
// 2. « sur le toit de l'arène » : on prend de la hauteur. Dans le même cadre, la vue d'hélicoptère
//    se fond dans la photo de l'accroche (Creapills), calée sur la même enseigne, qui se dézoome :
//    le toit, l'arène, la baie.
// 3. « visible depuis les avions » : une trajectoire d'avion en pointillés traverse la photo en
//    survolant l'enseigne et file vers l'aéroport de Miami, à l'ouest.
// 4. « Près d'un million de dollars » : une étiquette sort de l'enseigne, un compteur à rouleaux
//    (avec retenue, comme un compteur mécanique) monte jusqu'à 975 000 $. Gros plan pendant la
//    tenue : l'étiquette avance, la photo recule, s'assombrit et se floute. Puis tout rentre dans
//    l'épingle et la caméra repart.
import { W, C, rgba, clamp, lerp, prog, E, ressort, style, vis, el, $ } from '../outils.js';
import { carte, placer } from '../photos.js';
import { EPINGLES, ecranEpingle } from '../epingles.js';

// Les deux photos, avec la position de l'enseigne dans l'image (0..1) : centre du lettrage
// (de « WELCOME TO » au « y » de « city ») et sa largeur, mesurés sur les fichiers.
const HELICO = { src: 'medias/enseigne-helico.jpg', iw: 1070, ih: 606, signe: [0.558, 0.536], large: 0.575 };
const ARENE = { src: 'medias/accroche-haut.jpg', iw: 2244, ih: 1436, signe: [0.501, 0.722], large: 0.4046 };

// Cadres : la vue d'hélicoptère (au format de la photo), puis l'arène (au format de la sienne).
const CH = { x: W / 2, y: 898, w: 900, h: 520 };
const CA = { x: W / 2, y: 930, w: 900, h: 576 };

// Trajectoire de l'avion, dans l'image de l'arène : arrive de la baie (à droite), survole
// l'enseigne entre « Vice » et « city », file à gauche vers l'aéroport (courbe de Bézier).
const AVION = { de: [1.12, 0.2], par: [0.507, 0.69], vers: [-0.14, 0.78] };

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
// Décalage de l'image (kx, ky en %) qui amène le point (u, v) à (dx, dy) du centre du cadre,
// sans jamais découvrir le bord de la photo.
function viser(im, w, h, kb, u, v, dx, dy) {
  const sc = cover(im, w, h), mx = Math.max(0, (im.iw * sc * kb - w) / 2), my = Math.max(0, (im.ih * sc * kb - h) / 2);
  const tx = clamp(dx - kb * (u - 0.5) * im.iw * sc, -mx, mx), ty = clamp(dy - kb * (v - 0.5) * im.ih * sc, -my, my);
  return { kx: (tx / w) * 100, ky: (ty / h) * 100 };
}

// Compteur : trois rouleaux (centaines, dizaines et unités de milliers), puis « 000 $ » fixes.
const MILLIERS = 975;

const CSS = `
.ch-enseigne-etiquette { position: absolute; left: 0; top: 0; z-index: 40; display: flex; flex-direction: column; align-items: stretch;
  will-change: transform; filter: drop-shadow(0 28px 40px rgba(3, 8, 20, .5)); }
.ch-enseigne-pave { display: flex; align-items: flex-start; padding: .1em .16em .06em .14em; background: var(--cerise); color: var(--beurre);
  border-radius: .07em; font: 900 150px/1 "Archivo"; font-stretch: 68%; letter-spacing: -.005em; font-variant-numeric: tabular-nums lining-nums;
  box-shadow: .045em .05em 0 rgba(11, 27, 58, .55); white-space: nowrap; position: relative; z-index: 2; }
.ch-enseigne-rouleau { display: inline-block; height: 1em; overflow: hidden; vertical-align: top;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 9%, #000 91%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 9%, #000 91%, transparent 100%); }
.ch-enseigne-rouleau > span { display: block; will-change: transform; }
.ch-enseigne-rouleau > span > i { display: block; height: 1em; font-style: normal; text-align: center; }
.ch-enseigne-fixe { display: inline-block; height: 1em; margin-left: .2em; }
.ch-enseigne-dollar { display: inline-block; height: 1em; margin-left: .16em; }
.ch-enseigne-sous { overflow: hidden; margin: 0 .5em; position: relative; z-index: 1; }
.ch-enseigne-mention { display: block; padding: 13px 10px 11px; background: rgba(11, 27, 58, .94); border-radius: 0 0 12px 12px; text-align: center;
  font: 600 22px/1 "JetBrains Mono"; letter-spacing: .13em; color: var(--beurre); white-space: nowrap; will-change: transform;
  box-shadow: inset 0 0 0 1px rgba(246, 231, 168, .16); }
`;

export default function creer(T) {
  const c = T.chap.enseigne, m = (mot, k) => T.mot('c3', mot, k);
  const ep = EPINGLES.find((e) => e.chap === 'enseigne');
  const tA = m('cette') - 0.1;            // la vue d'hélicoptère sort de l'épingle
  const tB = m('sur le toit') - 0.06;     // on prend de la hauteur : l'arène apparaît
  const DB = 1.0;                          // durée de ce dézoom
  const tV0 = m('visible') - 0.05;        // l'avion entre dans le champ
  const tV1 = m('avions') + 0.3;          // il sort à gauche, vers l'aéroport
  const tP = m('Près') - 0.04;            // l'étiquette sort de l'enseigne (compteur à zéro)
  const tC0 = m('million') - 0.06;        // le compteur roule…
  const DC = 1.3;                          // … et ralentit jusqu'à 975 (E.sortie)
  // Le dernier rouleau se verrouille (à 3/100 de cran de 975) : la mention apparaît.
  const tC1 = (() => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const x = (lo + hi) / 2; if (E.sortie(x) < 1 - 0.03 / MILLIERS) lo = x; else hi = x; } return tC0 + hi * DC; })();
  const tZ = tC1 - 0.3;                   // gros plan sur le compteur (jusqu'à la fin de la tenue)
  const tS = c.tenue - 0.05;              // tout rentre dans l'épingle

  const blocs = [
    { sortie: m('Près') - 0.12, lignes: [[['03', m('Trois'), 'num'], ['L’enseigne', m('enseigne')]], [['Visible', m('visible')], ['des avions.', m('depuis'), 'accent']]] },
    // Une seule ligne, sans pavé : le pavé cerise de ce moment, c'est le compteur (jamais deux
    // pavés à la fois), et il lui faut la place sous le titre.
    { sortie: c.tenue + 0.2, lignes: [[['Près', m('Près')], ['d’un', m("d'un")], ['million', m('million')]]] },
  ];

  let ch, ca, etiquette, rouleaux = [], tiroir, mention;
  function preparer() {
    ch = carte(HELICO.src);
    ca = carte(ARENE.src);
    el('style', '', CSS, document.head);
    const chiffres = '<span>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<i>${d}</i>`).join('') + '</span>';
    const rouleau = `<span class="ch-enseigne-rouleau">${chiffres}</span>`;
    etiquette = el('div', 'ch-enseigne-etiquette',
      `<div class="ch-enseigne-pave">${rouleau.repeat(3)}<span class="ch-enseigne-fixe">000</span><span class="ch-enseigne-dollar">$</span></div>`
      + '<div class="ch-enseigne-sous"><span class="ch-enseigne-mention">VERSÉS AU COMTÉ · MIAMI HERALD</span></div>', $('cartes'));
    rouleaux = [...etiquette.querySelectorAll('.ch-enseigne-rouleau > span')];
    tiroir = etiquette.querySelector('.ch-enseigne-sous');
    mention = etiquette.querySelector('.ch-enseigne-mention');
    vis(etiquette, 0);
  }

  // ------------------------------------------------------------ les photos

  // La vue d'hélicoptère, posée (sans le retour) : sort de l'épingle, poussée lente vers l'arrière.
  function poseHelico(t, pin) {
    const e = ressort(t - tA, 180, 20);
    const kb = lerp(1.24, 1.14, E.doux(prog(t, tA, tB - tA)));
    const k = viser(HELICO, CH.w, CH.h, kb, HELICO.signe[0], HELICO.signe[1], 0, 6);
    return { x: lerp(pin[0], CH.x, e), y: lerp(pin[1], CH.y, e), w: CH.w, h: CH.h, r: 0, s: lerp(0.1, 1, e), a: clamp(e * 4), z: 3, kb, ...k };
  }

  // L'arène à l'arrivée du dézoom, puis la photo continue de reculer très doucement.
  const KB_A = 1.06;
  const poseFinA = (kb) => ({ x: CA.x, y: CA.y, w: CA.w, h: CA.h, r: 0, s: 1, a: 1, z: 2, kb, kx: 0, ky: 0 });

  // Toutes les poses à l'instant t (sans le gros plan ni le retour, appliqués ensuite).
  function poses(t, pin) {
    const h0 = poseHelico(Math.min(t, tB), pin);
    if (t < tB) return { h: poseHelico(t, pin), a: null };
    const q = E.traversee(prog(t, tB, DB));
    // Repères : l'enseigne de la vue d'hélicoptère (au début du dézoom) et celle de l'arène (à la fin).
    const sH = ecran(HELICO, h0, ...HELICO.signe);
    const lH = HELICO.large * HELICO.iw * cover(HELICO, h0.w, h0.h) * h0.kb;
    const fin = poseFinA(KB_A);
    const sA = ecran(ARENE, fin, ...ARENE.signe);
    const lA = ARENE.large * ARENE.iw * cover(ARENE, CA.w, CA.h) * KB_A;
    // Zoom de l'arène : au départ, son enseigne a la taille de celle de l'hélicoptère.
    const z0 = lH / lA, z = Math.pow(z0, 1 - q);
    // Le cadre garde le format de la vue d'hélicoptère tant qu'elle est là, puis prend celui de l'arène.
    const qc = E.doux(prog(q, 0.3, 0.7));
    const cadre = { x: lerp(CH.x, CA.x, qc), y: lerp(CH.y, CA.y, qc), w: CA.w, h: lerp(CH.h, CA.h, qc) };
    const vise = [lerp(sH[0], sA[0], q), lerp(sH[1], sA[1], q)];
    const apres = E.doux(prog(t, tB + DB, tS - tB - DB));
    const kbA = KB_A * z * lerp(1, 0.975, apres);
    const k = viser(ARENE, cadre.w, cadre.h, kbA, ...ARENE.signe, vise[0] - cadre.x, vise[1] - cadre.y);
    const a = { ...cadre, r: 0, s: 1, a: 1, z: 2, kb: kbA, ...k };
    // La vue d'hélicoptère, dans le même cadre, recule avec l'arène (son enseigne reste sur celle
    // de l'arène, à la même échelle) et s'efface tôt : un fondu enchaîné pendant qu'on prend de la hauteur.
    const sV = ecran(ARENE, a, ...ARENE.signe), kbH = h0.kb * (z / z0), scH = cover(HELICO, cadre.w, cadre.h);
    const h = q >= 0.45 ? null : {
      ...cadre, r: 0, s: 1, z: 3, kb: kbH, a: h0.a * (1 - E.doux(prog(q, 0, 0.4))),
      kx: ((sV[0] - cadre.x - kbH * (HELICO.signe[0] - 0.5) * HELICO.iw * scH) / cadre.w) * 100,
      ky: ((sV[1] - cadre.y - kbH * (HELICO.signe[1] - 0.5) * HELICO.ih * scH) / cadre.h) * 100,
    };
    return { h, a };
  }

  // Retour : tout rentre dans l'épingle (la caméra repart juste après).
  function retourner(p, pin, retour) {
    if (!p || retour <= 0) return p;
    return { ...p, x: lerp(p.x, pin[0], retour), y: lerp(p.y, pin[1], retour), s: p.s * (1 - 0.9 * retour), a: p.a * (1 - retour * retour) };
  }
  // Gros plan sur le compteur : l'étiquette avance, la photo recule derrière elle.
  const ETIQ = { x: W / 2, y: 800 };
  function reculer(p, gp) {
    if (!p || gp <= 0) return p;
    const f = lerp(1, 0.92, gp);
    return { ...p, x: ETIQ.x + (p.x - ETIQ.x) * f, y: ETIQ.y + (p.y - ETIQ.y) * f, s: p.s * f };
  }

  // ------------------------------------------------------------ l'avion

  // Bézier quadratique passant par AVION.par à mi-parcours, échantillonnée en pixels d'image.
  const trace = (() => {
    const [a, b, d] = [AVION.de, AVION.par, AVION.vers];
    const k = [2 * b[0] - (a[0] + d[0]) / 2, 2 * b[1] - (a[1] + d[1]) / 2];
    const pts = [], cum = [0], n = 180;
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      pts.push([v * v * a[0] + 2 * v * u * k[0] + u * u * d[0], v * v * a[1] + 2 * v * u * k[1] + u * u * d[1]]);
      if (i) cum.push(cum[i - 1] + Math.hypot((pts[i][0] - pts[i - 1][0]) * ARENE.iw, (pts[i][1] - pts[i - 1][1]) * ARENE.ih));
    }
    // Point de la trajectoire à la fraction p de sa longueur.
    const point = (p) => {
      const d = clamp(p) * cum[n];
      let i = 1;
      while (i < n && cum[i] < d) i++;
      const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
    };
    return { pts, cum, total: cum[n], point };
  })();

  // Pastille « aéroport » : sous la fin de la trajectoire, près du bord gauche ; elle apparaît quand
  // l'avion la dépasse. L'avion vole à vitesse constante (fraction de la trajectoire = temps).
  const PAST = { x: 124, w: 372, h: 50 };
  const fPast = (() => {
    const pose = poseFinA(KB_A);
    let p = 0;
    while (p < 1 && ecran(ARENE, pose, ...trace.point(p))[0] > PAST.x + PAST.w * 0.55) p += 0.002;
    return p;
  })();
  const tPast = lerp(tV0, tV1, fPast);

  // Silhouette d'avion de ligne vue de dessus, nez vers +x (unités : px avant échelle).
  const SILHOUETTE = [[50, 0], [44, 3.4], [33, 4.4], [9, 4.4], [-13, 41], [-22, 41], [-11, 4.4], [-33, 4.4], [-44, 16], [-50, 16], [-45, 3],
    [-51, 1.6], [-51, -1.6], [-45, -3], [-50, -16], [-44, -16], [-33, -4.4], [-11, -4.4], [-22, -41], [-13, -41], [9, -4.4], [33, -4.4], [44, -3.4]];

  function avion(g, pa, t) {
    const p = prog(t, tV0, tV1 - tV0);
    const fond = (1 - prog(t, tP - 0.02, 0.3)) * pa.a;
    if (p <= 0 || fond <= 0) return;
    const d = p * trace.total, ecr = [];
    for (let i = 0; i < trace.pts.length && trace.cum[i] <= d; i++) ecr.push(ecran(ARENE, pa, ...trace.pts[i]));
    const tete = ecran(ARENE, pa, ...trace.point(p)), arriere = ecran(ARENE, pa, ...trace.point(p - 0.015));
    ecr.push(tete);
    g.save();
    g.globalAlpha = fond;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const ligne = () => { g.beginPath(); ecr.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); };
    // Pointillés beurre avec un halo marine : lisibles sur le toit clair comme sur la baie.
    ligne(); g.setLineDash([15, 13]); g.lineDashOffset = -(t - tV0) * 70; g.strokeStyle = C.beurre; g.lineWidth = 5;
    g.shadowColor = rgba(C.marine, 0.95); g.shadowBlur = 7; g.stroke(); g.stroke();
    g.setLineDash([]); g.shadowBlur = 0;
    g.restore();
    // Pastille de destination, sous la fin de la ligne : l'aéroport de Miami, à l'ouest.
    const ePast = ressort(t - tPast, 210, 20);
    if (ePast > 0) {
      let bas = 0;   // point le plus bas de toute la trajectoire au-dessus de la pastille
      for (const q of trace.pts) { const [x, y] = ecran(ARENE, pa, ...q); if (x >= PAST.x && x <= PAST.x + PAST.w) bas = Math.max(bas, y); }
      const yp = bas + 18 + PAST.h / 2 + (1 - ePast) * 16;
      g.save();
      g.globalAlpha = fond * clamp(ePast * 3);
      g.beginPath(); g.roundRect(PAST.x, yp - PAST.h / 2, PAST.w, PAST.h, 14);
      g.fillStyle = rgba(C.marine, 0.9); g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 24; g.fill();
      g.shadowBlur = 0; g.lineWidth = 1.2; g.strokeStyle = rgba(C.beurre, 0.2); g.stroke();
      g.font = '600 24px "JetBrains Mono"'; g.letterSpacing = '3px';
      g.fillStyle = C.beurre; g.textBaseline = 'middle'; g.textAlign = 'center';
      g.fillText('← AÉROPORT DE MIAMI', PAST.x + PAST.w / 2 + 1, yp + 1);
      g.restore();
    }
    // L'avion (tête cerise), orienté selon la trajectoire.
    if (p < 1) {
      const [x, y] = tete;
      g.save();
      g.globalAlpha = fond;
      const lu = g.createRadialGradient(x, y, 0, x, y, 70);
      lu.addColorStop(0, rgba(C.ceriseVif, 0.55)); lu.addColorStop(0.45, rgba(C.cerise, 0.18)); lu.addColorStop(1, rgba(C.cerise, 0));
      g.fillStyle = lu; g.fillRect(x - 70, y - 70, 140, 140);
      g.translate(x, y);
      g.rotate(Math.atan2(y - arriere[1], x - arriere[0]));
      g.scale(0.78, 0.78);
      g.beginPath(); SILHOUETTE.forEach(([u, v], k) => (k ? g.lineTo(u, v) : g.moveTo(u, v))); g.closePath();
      g.shadowColor = 'rgba(3,8,20,0.55)'; g.shadowBlur = 14; g.shadowOffsetY = 8;
      g.fillStyle = C.cerise; g.fill();
      g.shadowColor = 'transparent';
      g.lineWidth = 3; g.strokeStyle = C.beurre; g.stroke();
      g.restore();
    }
  }

  // ------------------------------------------------------------ le compteur

  // Valeur en milliers, et position de chaque rouleau (compteur mécanique : un rouleau avance
  // d'un cran pendant que celui de droite passe de 9 à 0).
  const valeur = (t) => MILLIERS * E.sortie(prog(t, tC0, DC));
  function rouleau(v, rang) {
    if (rang === 0) return v % 10;
    const p = 10 ** rang;
    return (Math.floor(v / p) % 10) + clamp((v % p) - (p - 1));
  }

  function compteur(t, g, pa, pin, gp, retour) {
    const e = ressort(t - tP, 200, 21);
    if (e <= 0.001 || !pa) { vis(etiquette, 0); return; }
    const v = valeur(t);
    rouleaux.forEach((r, i) => style(r, 'transform', `translateY(${(-rouleau(v, 2 - i)).toFixed(4)}em)`));
    // La mention sort de sous le pavé quand le chiffre est posé.
    const em = ressort(t - tC1, 210, 22);
    style(mention, 'transform', `translateY(${((em - 1) * 105).toFixed(2)}%)`);
    vis(tiroir, em > 0.001 ? 1 : 0);
    // L'étiquette sort de l'enseigne (dans la photo) et se pose au-dessus, sur la baie.
    const sgn = ecran(ARENE, pa, ...ARENE.signe);
    let x = lerp(sgn[0], ETIQ.x, e), y = lerp(sgn[1], ETIQ.y - 60 * gp, e), s = lerp(0.18, 1, e) * lerp(1, 1.2, gp), a = clamp(e * 4);
    if (retour > 0) { x = lerp(x, pin[0], retour); y = lerp(y, pin[1], retour); s *= 1 - 0.9 * retour; a *= 1 - retour * retour; }
    style(etiquette, 'transform', `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) scale(${s.toFixed(4)})`);
    vis(etiquette, a);
    // Repère sur l'enseigne : un anneau, relié à l'étiquette par un trait fin.
    const l = clamp(prog(t, tP + 0.12, 0.3)) * a * pa.a;
    if (l > 0) {
      const bas = y + (etiquette.offsetHeight / 2) * s;
      g.save();
      g.globalAlpha = l;
      g.strokeStyle = C.beurre; g.lineWidth = 3; g.lineCap = 'round';
      g.shadowColor = rgba(C.marine, 0.7); g.shadowBlur = 8;
      g.beginPath(); g.moveTo(sgn[0], sgn[1] - 15); g.lineTo(sgn[0], Math.min(bas, sgn[1] - 15)); g.stroke();
      g.beginPath(); g.arc(sgn[0], sgn[1], 13, 0, Math.PI * 2); g.lineWidth = 3.5; g.stroke();
      g.beginPath(); g.arc(sgn[0], sgn[1], 5, 0, Math.PI * 2); g.fillStyle = C.ceriseVif; g.fill();
      g.restore();
    }
  }

  // ------------------------------------------------------------ l'image

  function dessiner(t, X) {
    if (t < tA - 0.1 || t > tS + 0.6) { vis(etiquette, 0); return; }
    const pin = ecranEpingle(X.P, ep);
    const gp = E.sortie(prog(t, tZ, 1.0));
    const retour = E.entree(prog(t, tS, 0.4));
    const P = poses(t, pin);
    const ph = retourner(P.h, pin, retour), pa = retourner(reculer(P.a, gp), pin, retour);
    if (ph) {
      style(ch.img, 'filter', 'contrast(1.16) saturate(1.04) brightness(1.03)');   // la vue d'hélicoptère est voilée
      placer(ch, ph);
    }
    if (pa) {
      // Pendant le compteur, la photo s'assombrit, puis se floute : la mise au point passe sur l'étiquette.
      const sombre = 0.2 * E.doux(prog(t, tP, 0.5)) + 0.2 * gp;
      style(ca.img, 'filter', `contrast(1.05) saturate(.9) brightness(${(1 - sombre).toFixed(3)}) blur(${(4 * gp).toFixed(2)}px)`);
      placer(ca, pa);
      avion(X.dessus, pa, t);
    }
    compteur(t, X.dessus, pa, pin, gp, retour);
  }

  const voile = (t) => clamp(prog(t, tA - 0.2, 0.4)) * (1 - prog(t, tS + 0.1, 0.4));
  const legendes = [{ de: tA + 0.3, a: tS, html: 'KASEYA CENTER · MIAMI\n<small>PHOTOS WPLG LOCAL 10 · CREAPILLS</small>' }];
  // Flou de mouvement pendant que les rouleaux tournent vite.
  const sous = (t) => (t > tC0 && t < tC0 + 0.55 * DC ? 3 : 1);

  function sons(add) {
    add(tA, 'clic', 0.5);
    add(tB, 'glisse', 0.4, { hauteur: 0 });
    add(tV0, 'souffle', 0.3, { duree: tV1 - tV0 + 0.3 });
    add(lerp(tV0, tV1, 0.4), 'glisse', 0.38, { hauteur: 1 });   // l'avion passe de droite à gauche
    add(tPast, 'ping', 0.35);
    add(tP, 'clic', 0.45);
    // Un tic à chaque cran du rouleau des dizaines de milliers (assez espacés pour s'entendre).
    let dernier = -1;
    for (let k = 1; k <= Math.floor(MILLIERS / 10); k++) {
      let lo = tC0, hi = tC0 + DC;
      for (let j = 0; j < 40; j++) { const mid = (lo + hi) / 2; if (valeur(mid) < k * 10) lo = mid; else hi = mid; }
      if (hi - dernier >= 0.06) { add(hi, 'tic', 0.28); dernier = hi; }
    }
    add(tC1 - 0.02, 'verrou', 0.45);
    add(tC1, 'scintille', 0.25);
    add(tS, 'clic', 0.3);
  }

  return { id: 'enseigne', blocs, preparer, dessiner, voile, legendes, sons, sous };
}
