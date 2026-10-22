// Coup n° 7 — le dernier, « le plus fou » : le Miami Heat jouera sous le nom de Vice City.
// « Sept : le dix-huit novembre, le Miami Heat jouera sous le nom de Vice City.
//   La veille de la sortie du jeu. »
//
// La caméra revient de Paris et se pose sur le Kaseya Center ; l'épingle 7 a perdu son « ? ».
// 1. « le dix-huit novembre » : l'image du teaser officiel (la Freedom Tower illuminée en rose)
//    sort de l'épingle, on s'approche lentement de la tour ; une feuille de calendrier
//    « 18 NOV. » s'épingle dans le coin de la photo.
// 2. « Vice City » : l'affiche officielle jaillit de l'épingle, en grand, et s'allume en se
//    posant (impact) : elle se redresse, avec une lueur cerise derrière elle. Le teaser recule.
// 3. « La veille » : un trait souligne la date de l'affiche et la feuille « 18 NOV. » en sort ;
//    l'affiche se replie en bandeau sur son néon, la feuille se pose dessous, à gauche. Une
//    flèche part vers la droite, où « 19 NOV. · SORTIE » (cerise) tombe comme un tampon.
// 4. Gros plan pendant la tenue : la feuille 19 avance, le reste s'efface un peu. Puis tout
//    rentre dans l'épingle et la caméra repart.
import { C, rgba, clamp, lerp, prog, E, ressort, style, vis, el, $ } from '../outils.js';
import { carte, placer } from '../photos.js';
import { EPINGLES, ecranEpingle } from '../epingles.js';

// Les deux visuels officiels (1080 × 1080). Repères dans l'image (0..1).
// Teaser : on part de la rue, on finit sur le haut de la tour (centre visé, début → fin).
const TOUR = { src: 'medias/heat-freedom-tower.jpg', iw: 1080, ih: 1080, de: [0.55, 0.62], vers: [0.76, 0.3] };
// Affiche : la ligne « NOVEMBER 18, 2026 » (u début, u fin, v de sa ligne de base) et le centre
// du bandeau (de « A NIGHT IN » au bas du néon).
const AFF = { src: 'medias/heat-affiche.jpg', iw: 1080, ih: 1080, date: [0.143, 0.394, 0.787], neon: 0.455 };

// Cadres. Le teaser en portrait (la tour est verticale), sous la première ligne de titre.
const FT = { x: 540, y: 912, w: 560, h: 680, r: -1.2 };
// L'affiche en grand, sous « VICE CITY. » (bas de bloc ≈ 590) et au-dessus de 1350.
const FA = { x: 540, y: 985, w: 720, h: 720 };
// « La veille » : bandeau sur le néon, sous « DE LA SORTIE. » (bas de bloc ≈ 615).
const FB = { x: 540, y: 798, w: 600, h: 312 };
// Les feuilles de calendrier (236 × 286), alignées sur les bords du bandeau, posées sur son bas.
const LF = 236;
const F18 = { x: FB.x - FB.w / 2 + LF / 2, y: 1078, r: -1.8 }, F19 = { x: FB.x + FB.w / 2 - LF / 2, y: 1078, r: 1.6 };

const cover = (im, w, h) => Math.max(w / im.iw, h / im.ih);
// Cadrage d'une photo dans sa carte (même méthode que monde.js). object-fit: cover ne montre que
// la boîte de l'image : on choisit la fenêtre visible (w/kb × h/kb, centrée au plus près du point
// visé, sans sortir de la photo), object-position place la boîte, et la translation (kx, ky)
// amène le centre de la fenêtre au centre du cadre — jamais de bord découvert.
function cadrer(im, w, h, kb, u, v) {
  const sc = cover(im, w, h), lw = im.iw * sc, lh = im.ih * sc;
  const fw = w / (kb * lw), fh = h / (kb * lh);
  const uc = clamp(u, fw / 2, 1 - fw / 2), vc = clamp(v, fh / 2, 1 - fh / 2);
  const ox = clamp(w / 2 - uc * lw, w - lw, 0), oy = clamp(h / 2 - vc * lh, h - lh, 0);
  const tx = -kb * (ox + uc * lw - w / 2), ty = -kb * (oy + vc * lh - h / 2);
  const pos = `${lw - w > 0.5 ? ((100 * ox) / (w - lw)).toFixed(2) : 50}% ${lh - h > 0.5 ? ((100 * oy) / (h - lh)).toFixed(2) : 50}%`;
  return { kx: (100 * tx) / w, ky: (100 * ty) / h, pos, ox, oy, lw, lh };
}
// Pose une carte cadrée (object-position compris) ; renvoie ses paramètres, cadrage inclus.
function poser(c, o, im, u, v) {
  const k = cadrer(im, o.w, o.h, o.kb, u, v);
  style(c.img, 'objectPosition', k.pos);
  const p = { ...o, ...k };
  placer(c, p);
  return p;
}
// Position à l'écran du point (u, v) de l'image d'une carte posée (p : retour de poser()).
function ecran(p, u, v) {
  const ex = (p.kx / 100) * p.w + p.kb * (p.ox + u * p.lw - p.w / 2), ey = (p.ky / 100) * p.h + p.kb * (p.oy + v * p.lh - p.h / 2);
  const a = ((p.r || 0) * Math.PI) / 180, s = p.s ?? 1;
  return [p.x + s * (ex * Math.cos(a) - ey * Math.sin(a)), p.y + s * (ex * Math.sin(a) + ey * Math.cos(a))];
}
// Point (dx, dy) du repère d'une carte (px depuis son centre, avant rotation et échelle) à l'écran.
function surCarte(p, dx, dy) {
  const a = ((p.r || 0) * Math.PI) / 180, s = p.s ?? 1;
  return [p.x + s * (dx * Math.cos(a) - dy * Math.sin(a)), p.y + s * (dx * Math.sin(a) + dy * Math.cos(a))];
}

const CSS = `
.ch-heat-jour { position: absolute; left: 0; top: 0; width: ${LF}px; border-radius: 22px; overflow: hidden; text-align: center;
  background: var(--beurre); color: var(--marine); will-change: transform;
  background-image: linear-gradient(180deg, rgba(255, 255, 255, .08), rgba(11, 27, 58, .06)); }
.ch-heat-entete { display: block; padding: 15px 0 13px .18em; background: var(--marine); color: var(--beurre);
  font: 600 22px/1 "JetBrains Mono"; letter-spacing: .18em; }
.ch-heat-num { display: block; padding-top: 24px; font: 900 170px/.8 "Archivo"; font-stretch: 68%; letter-spacing: -.01em; font-variant-numeric: lining-nums; }
.ch-heat-mois { display: block; padding: 8px 0 22px .08em; font: 900 46px/1 "Archivo"; font-stretch: 68%; letter-spacing: .08em; }
.ch-heat-jour.ch-heat-sortie { background-color: var(--cerise); color: var(--beurre); }
.ch-heat-sortie .ch-heat-entete { background: rgba(11, 27, 58, .34); }
`;

export default function creer(T) {
  const c = T.chap.heat, m = (mot, k) => T.mot('c7', mot, k);
  const ep = EPINGLES.find((e) => e.chap === 'heat');
  const tA = m('dix-huit') - 0.12;        // le teaser sort de l'épingle
  const t18 = m('dix-huit') + 0.16;       // la feuille « 18 NOV. » s'épingle dans son coin
  const tM = m('sous le nom');            // montée vers l'affiche
  const tP = m('Vice City') - 0.1;        // l'affiche jaillit de l'épingle et s'allume (impact)
  const tV = m('La veille') - 0.06;       // la date de l'affiche est soulignée…
  const tL = tV + 0.2;                    // … la feuille « 18 NOV. » en sort
  const tB = tV + 0.24;                   // l'affiche se replie en bandeau sur son néon
  const DB = 0.6;
  const tF = tL + 0.42;                   // la flèche part vers la droite…
  const t19 = m('sortie') - 0.08;         // … « 19 NOV. · SORTIE » tombe comme un tampon
  const tZ = m('jeu') - 0.2;              // gros plan sur la feuille 19
  const tS = c.tenue - 0.05;              // tout rentre dans l'épingle

  const blocs = [
    { sortie: m('La veille') - 0.12, lignes: [[['07', m('Sept'), 'num'], ['Le Heat', m('Miami Heat')], ['devient', m('jouera')]], [['Vice City.', m('Vice City'), 'accent']]] },
    // Sans pavé : le cerise de ce moment, c'est la feuille « 19 NOV. » (jamais deux pavés à la fois).
    { sortie: c.tenue + 0.2, lignes: [[['La veille', m('La veille')]], [['de la', m('de la sortie')], ['sortie.', m('sortie')]]] },
  ];

  let tour, aff, j18, j19;
  function preparer() {
    tour = carte(TOUR.src);
    aff = carte(AFF.src);
    el('style', '', CSS, document.head);
    const feuille = (cls, entete, num) => el('div', `ch-heat-jour ${cls}`.trim(),
      `<span class="ch-heat-entete">${entete}</span><span class="ch-heat-num">${num}</span><span class="ch-heat-mois">NOV.</span>`, $('cartes'));
    j18 = feuille('', 'MATCH', '18');
    j19 = feuille('ch-heat-sortie', 'SORTIE', '19');
    vis(j18, 0); vis(j19, 0);
  }

  // Une feuille : position, échelle, rotation, opacité, ordre, et son ombre (h : hauteur au-dessus
  // de la table, 0 = posée, 1 = soulevée).
  function poserFeuille(d, { x, y, s, r, a, z, h = 0, lum = 1 }) {
    style(d, 'transform', `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`);
    style(d, 'zIndex', String(z));
    style(d, 'boxShadow', `0 ${(24 + 40 * h).toFixed(1)}px ${(44 + 50 * h).toFixed(1)}px rgba(3,8,20,${(0.5 - 0.18 * h).toFixed(3)}), 0 ${(6 + 10 * h).toFixed(1)}px 16px rgba(3,8,20,.3)`);
    style(d, 'filter', lum < 0.999 ? `brightness(${lum.toFixed(3)})` : 'none');
    vis(d, a);
  }
  const rentrer = (o, pin, q) => (q <= 0 ? o : { ...o, x: lerp(o.x, pin[0], q), y: lerp(o.y, pin[1], q), s: o.s * (1 - 0.9 * q), a: o.a * (1 - q * q) });

  function dessiner(t, X) {
    if (t < tA - 0.1 || t > tS + 0.6) { vis(j18, 0); vis(j19, 0); return; }
    const pin = ecranEpingle(X.P, ep);
    const retour = E.entree(prog(t, tS, 0.4));
    const gp = E.sortie(prog(t, tZ, 0.8));
    const g = X.dessus;

    // --- Le teaser : sort de l'épingle, on s'approche de la tour. Il recule quand l'affiche
    // arrive, puis s'efface une fois couvert.
    const eT = ressort(t - tA, 175, 19);
    const recul = E.sortie(prog(t, tP, 0.5));
    let pT = null;
    if (eT > 0.001 && t < tP + 0.6) {
      const q = E.doux(prog(t, tA, tP + 0.3 - tA));
      const kb = lerp(1.04, 1.2, q);
      const k = viser(TOUR, FT.w, FT.h, kb, lerp(TOUR.de[0], TOUR.vers[0], q), lerp(TOUR.de[1], TOUR.vers[1], q));
      pT = {
        x: lerp(pin[0], FT.x, eT), y: lerp(pin[1], FT.y, eT) + 24 * recul, w: FT.w, h: FT.h, r: lerp(0, FT.r, eT),
        s: lerp(0.1, 1, eT) * lerp(1, 0.9, recul), a: clamp(eT * 4) * (1 - prog(t, tP + 0.32, 0.2)), z: 4, kb, ...k,
      };
      style(tour.img, 'filter', `contrast(1.08) saturate(.96) brightness(${(1 - 0.5 * recul).toFixed(3)})`);
      placer(tour, pT);
    }

    // --- L'affiche : jaillit de l'épingle, se redresse et s'allume ; à « la veille », elle se
    // replie en bandeau sur son néon.
    const eA = ressort(t - tP, 200, 18);
    let pA = null;
    if (eA > 0.001) {
      const b = E.traversee(prog(t, tB, DB));
      const vie = E.doux(prog(t, tP, tS - tP));
      const w = lerp(FA.w, FB.w, b), h = lerp(FA.h, FB.h, b), kb = lerp(1.05, 1.0, vie);
      const k = viser(AFF, w, h, kb, 0.5, lerp(0.5, AFF.neon, b));
      let o = {
        x: lerp(pin[0], lerp(FA.x, FB.x, b), eA), y: lerp(pin[1], lerp(FA.y, FB.y, b), eA), w, h, r: 0,
        s: lerp(0.1, 1, eA) * lerp(1, 1.015, vie) * lerp(1, 0.97, gp), a: clamp(eA * 4), z: 10, kb, ...k,
      };
      o = rentrer(o, pin, retour);
      pA = o;
      // Allumage : elle arrive éteinte et s'allume en se posant (un éclat, puis elle tient).
      // Pendant le gros plan, elle s'assombrit et se floute : la mise au point passe aux dates.
      const al = E.sortie(prog(t, tP + 0.05, 0.32));
      const eclat = Math.sin(Math.PI * prog(t, tP + 0.08, 0.3));
      const lum = lerp(0.36, 1, al) + 0.16 * eclat - 0.3 * gp;
      style(aff.img, 'filter', `contrast(1.04) saturate(${lerp(0.55, 1.03, al).toFixed(3)}) brightness(${lum.toFixed(3)}) blur(${(2.2 * gp).toFixed(2)}px)`);
      placer(aff, o);
      // Relief : elle arrive inclinée vers l'arrière et se redresse, puis respire à peine.
      const rx = lerp(20, 0, ressort(t - tP, 150, 15)) + 1.4 * Math.sin((t - tP) * 1.3);
      const ry = -2 * Math.sin((t - tP) * 0.9 + 0.4);
      style(aff.el, 'transform', `translate3d(${(o.x - o.w / 2).toFixed(2)}px,${(o.y - o.h / 2).toFixed(2)}px,0) perspective(1800px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${o.s.toFixed(4)})`);
      // Lueur cerise derrière l'affiche (sur la carte, sous les photos), et un liseré de lumière.
      const lu = al * o.a * (1 - 0.4 * gp);
      if (lu > 0.01) {
        const ctx = X.ctx, R = Math.max(o.w, o.h) * o.s * 0.9;
        const grad = ctx.createRadialGradient(o.x, o.y, R * 0.2, o.x, o.y, R);
        grad.addColorStop(0, rgba(C.cerise, 0.6 * lu));
        grad.addColorStop(0.55, rgba(C.cerise, 0.2 * lu));
        grad.addColorStop(1, rgba(C.cerise, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(o.x - R, o.y - R, 2 * R, 2 * R);
      }
      style(aff.el, 'boxShadow', `0 40px 90px rgba(3,8,20,.6), 0 0 0 2px rgba(246,231,168,.2), 0 0 ${(70 * lu).toFixed(1)}px ${(6 * lu).toFixed(1)}px rgba(210,18,46,${(0.5 * lu).toFixed(3)})`);
    }

    // --- La feuille « 18 NOV. » : d'abord épinglée dans le coin du teaser (sous l'affiche)…
    if (t < tL) {
      const e = ressort(t - t18, 220, 19);
      if (e > 0.001 && pT) {
        const [x, y] = surCarte(pT, -FT.w / 2 + 112, -FT.h / 2 + 128);
        poserFeuille(j18, { x, y: y - (1 - e) * 26, s: 0.6 * pT.s * lerp(1.3, 1, e), r: -4 + pT.r, a: clamp(e * 4) * pT.a, z: 6, h: 1 - e, lum: 1 - 0.5 * recul });
      } else vis(j18, 0);
    } else if (pA) {
      // … puis elle sort de la date de l'affiche et se pose sous le bandeau, à gauche.
      const e = ressort(t - tL, 190, 19);
      const d = ecran(AFF, pA, (AFF.date[0] + AFF.date[1]) / 2, AFF.date[2] - 0.01);
      let o = { x: lerp(d[0], F18.x, e), y: lerp(d[1], F18.y, e), s: lerp(0.2, 1, e), a: clamp(e * 5), r: lerp(0, F18.r, e) };
      o = rentrer(o, pin, retour);
      poserFeuille(j18, { ...o, z: 40, h: clamp(1 - e), lum: 1 - 0.18 * gp });
    } else vis(j18, 0);

    // Trait cerise sous la date de l'affiche, juste avant que la feuille n'en sorte.
    if (pA && t > tV && t < tB + 0.3) {
      const u = E.sortie(prog(t, tV, 0.2)), f = 1 - prog(t, tL + 0.06, 0.16);
      if (u > 0 && f > 0) {
        const a = ecran(AFF, pA, AFF.date[0] - 0.005, AFF.date[2] + 0.027), z = ecran(AFF, pA, AFF.date[1] + 0.005, AFF.date[2] + 0.027);
        g.save();
        g.globalAlpha = f;
        g.lineCap = 'round'; g.lineWidth = 6; g.strokeStyle = C.ceriseVif;
        g.shadowColor = rgba(C.cerise, 0.9); g.shadowBlur = 16;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(lerp(a[0], z[0], u), lerp(a[1], z[1], u)); g.stroke();
        g.restore();
      }
    }

    // --- La flèche, de la feuille 18 vers la place de la 19 (sa pointe y arrive avec elle).
    const fl = E.doux(prog(t, tF, t19 + 0.04 - tF));
    const af = (1 - retour * 1.6) * (1 - 0.35 * gp);
    if (fl > 0 && af > 0) {
      const x0 = F18.x + LF / 2 + 22, x1 = F19.x - LF / 2 - 22, y = F18.y + 8, xe = lerp(x0, x1, fl);
      g.save();
      g.globalAlpha = af;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = C.beurre; g.lineWidth = 7;
      g.shadowColor = rgba(C.marine, 0.85); g.shadowBlur = 10;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(xe, y); g.stroke();
      const k = clamp((fl - 0.3) / 0.4) * 20;
      if (k > 0) { g.beginPath(); g.moveTo(xe - k, y - k); g.lineTo(xe, y); g.lineTo(xe - k, y + k); g.stroke(); }
      g.restore();
    }

    // --- « 19 NOV. · SORTIE » : tombe comme un tampon ; gros plan pendant la tenue.
    const e19 = ressort(t - t19, 280, 22);
    if (e19 > 0.001) {
      let o = { x: F19.x - 10 * gp, y: F19.y - (1 - e19) * 36 - 16 * gp, s: lerp(1.45, 1, e19) * lerp(1, 1.1, gp), a: clamp(e19 * 6), r: lerp(5, F19.r, e19) };
      o = rentrer(o, pin, retour);
      poserFeuille(j19, { ...o, z: 41, h: clamp(1 - e19) + 0.35 * gp });
    } else vis(j19, 0);
  }

  const voile = (t) => clamp(prog(t, tA - 0.2, 0.4)) * (1 - prog(t, tS + 0.1, 0.4));
  const legendes = [
    { de: tA + 0.3, a: tP + 0.04, html: 'FREEDOM TOWER · MIAMI\n<small>TEASER OFFICIEL MIAMI HEAT</small>' },
    { de: tP + 0.04, a: tS, html: 'KASEYA CENTER · 18.11.2026\n<small>VISUELS OFFICIELS MIAMI HEAT</small>' },
  ];
  // Flou de mouvement : l'affiche qui jaillit, le tampon de la feuille 19, le retour final.
  const sous = (t) => ((t > tP && t < tP + 0.26) || (t > t19 && t < t19 + 0.14) || (t > tS && t < tS + 0.42) ? 3 : 1);

  function sons(add) {
    add(tA, 'clic', 0.5);
    add(t18, 'clic', 0.36);
    add(tM, 'montee', 0.3, { duree: tP - tM });
    add(tP, 'impact', 0.5);
    add(tP + 0.06, 'scintille', 0.3);
    add(tV, 'glisse', 0.28, { hauteur: 2 });
    add(tL, 'clic', 0.45);
    add(tB, 'glisse', 0.3, { hauteur: 0 });
    add(tF, 'glisse', 0.28, { hauteur: 1 });
    add(t19 + 0.06, 'verrou', 0.48);
    add(tS, 'clic', 0.3);
  }

  return { id: 'heat', blocs, preparer, dessiner, voile, legendes, sons, sous };
}
