// Coup n° 4 — les voitures du jeu, en vrai, avec des plaques de l'État de Leonida.
// « Quatre : les voitures du jeu, en vrai, avec des plaques de Leonida. »
//
// Idée de mouvement : la vitesse. Les voitures passent comme dans la circulation.
// 1. La caméra se pose sur l'épingle 4 (Key Biscayne) ; la McLaren « Emerus » en sort (ressort)
//    et roule doucement vers la gauche, comme dans le trafic.
// 2. « du jeu », « en vrai » : la Corvette « Coquette », puis la Lamborghini « Vice Beach Police »
//    déboulent de la droite et freinent (la carte pique du nez) ; celle de devant accélère et
//    sort à gauche. Flou de mouvement (3 sous-images) sur ces passages.
// 3. « plaques » : la plaque arrive à son tour et pile net (décélération constante, la carte se
//    rassoit en oscillant). Elle avance, puis la caméra plonge sur « LEONIDA » : un trait cerise
//    épouse l'arc du mot et l'étiquette « L'ÉTAT DE GTA VI » se pose au-dessus.
// 4. Tout rentre dans l'épingle, la caméra repart.
import { W, C, rgba, clamp, lerp, prog, E, ressort, style, el, $ } from '../outils.js';
import { carte, placer } from '../photos.js';
import { EPINGLES, ecranEpingle } from '../epingles.js';

// Les photos, dans l'ordre de passage. iw, ih : taille du fichier ; vise : point de l'image
// (fractions) tenu au centre du cadre.
const PHOTOS = [
  { src: 'medias/voitures-mclaren.jpg', iw: 1536, ih: 2048, vise: [0.47, 0.475] },  // McLaren « Emerus », Key Biscayne
  // Ces deux-là sont des images de vidéo, plus voilées : un peu plus de contraste pour les accorder.
  { src: 'medias/voitures-coquette.jpg', iw: 1320, ih: 1309, vise: [0.56, 0.58], filtre: 'contrast(1.13) saturate(.95)' },  // Corvette « Coquette »
  { src: 'medias/voitures-police.jpg', iw: 1320, ih: 1510, vise: [0.48, 0.52], filtre: 'contrast(1.13) saturate(.95)' },    // Lamborghini « Vice Beach Police », Testarossa rose
  { src: 'medias/voitures-plaque.jpg', iw: 1536, ih: 2048, vise: [0.49, 0.565] },   // la plaque, sous la calandre chromée
];
const PLAQUE = PHOTOS[3];
// « LEONIDA » sur la plaque (fractions de l'image, mesurées sur le fichier) : centre du mot,
// haut des lettres au milieu de l'arc, et le trait qui souligne (Bézier cubique sous la ligne
// de base arquée, entre le bas des lettres et le haut de « VCE CTY »).
const LEONIDA = { centre: [0.505, 0.4925], haut: 0.4766, trait: [[0.369, 0.5148], [0.43, 0.5046], [0.58, 0.5034], [0.642, 0.5136]] };

// La voie : les cartes y passent au format paysage (4:3). La plaque avance ensuite jusqu'à la
// largeur de la colonne des titres (x = 124 → 956) et s'ouvre en hauteur : le deuxième titre
// tient sur une ligne, la plaque prend la place libérée.
const VOIE = { x: W / 2, y: 910, w: 744, h: 558 };
const FOCUS = { y: 848, w: 832, h: 762 };   // bas à 1229 : 33 px d'air au-dessus de la légende (1262)
const ENTREE = W + VOIE.w / 2 + 30;   // centre d'une carte qui entre (juste hors champ, à droite)
const DERIVE = 30;                     // px/s : le trafic continue d'avancer pendant qu'on regarde
const FUITE = 1080, DF = 0.32;         // la voiture de devant accélère et sort à gauche
const LEO_Y = -150;                     // « LEONIDA » dans le tiers haut : « VCE CTY » et « GOODTIME STATE » entiers dessous
const KB_LEO = 2.6;                     // « LEONIDA » ≈ 570 px de large (≈ 1,4 × le fichier)

// Cadrage. Le navigateur recadre la photo dans la carte (object-fit: cover) à la position
// op (object-position, en fractions), puis l'agrandit de kb et la décale de (kx, ky) % : seul
// ce recadrage est visible, donc le décalage reste dans ±(kb − 1) × demi-carte.
const cover = (im, w, h) => Math.max(w / im.iw, h / im.ih);
// object-position qui centre au mieux le point (u, v) de l'image dans une carte w × h.
function position(im, w, h, [u, v]) {
  const sc = cover(im, w, h), lw = im.iw * sc - w, lh = im.ih * sc - h;
  return [lw > 0.5 ? clamp((u * im.iw * sc - w / 2) / lw) : 0.5, lh > 0.5 ? clamp((v * im.ih * sc - h / 2) / lh) : 0.5];
}
// Point (u, v) de l'image en px depuis le centre de la carte, avant agrandissement.
function local(im, p, u, v) {
  const sc = cover(im, p.w, p.h);
  return [u * im.iw * sc - p.op[0] * (im.iw * sc - p.w) - p.w / 2, v * im.ih * sc - p.op[1] * (im.ih * sc - p.h) - p.h / 2];
}
// Écart au centre de la carte (px, avant rotation et échelle de la carte).
function ecart(im, p, u, v) {
  const [bx, by] = local(im, p, u, v);
  return [p.kb * bx + (p.kx / 100) * p.w, p.kb * by + (p.ky / 100) * p.h];
}
// Position à l'écran du point (u, v) de l'image d'une carte placée avec les paramètres p.
function ecran(im, p, u, v) {
  const [ex, ey] = ecart(im, p, u, v), a = ((p.r || 0) * Math.PI) / 180, s = p.s ?? 1;
  return [p.x + s * (ex * Math.cos(a) - ey * Math.sin(a)), p.y + s * (ex * Math.sin(a) + ey * Math.cos(a))];
}
// Décalage (kx, ky en %) qui amène le point (u, v) à (dx, dy) du centre, sans découvrir de bord.
function viser(im, p, u, v, dx, dy) {
  const [bx, by] = local(im, p, u, v), mx = ((p.kb - 1) * p.w) / 2, my = ((p.kb - 1) * p.h) / 2;
  return { kx: (clamp(dx - p.kb * bx, -mx, mx) / p.w) * 100, ky: (clamp(dy - p.kb * by, -my, my) / p.h) * 100 };
}

// Arrivée d'une voiture : elle entre vite (v0, en fraction du trajet par seconde) et freine
// sans jamais reculer (amortissement critique). Renvoie la fraction du trajet qui reste.
const approche = (d, v0 = 6.4, w = 16) => (d <= 0 ? 1 : (1 + (w - v0) * d) * Math.exp(-w * d));
// Tangage au freinage : la carte pique du nez (bord gauche, côté avant, vers le bas), puis se rassoit.
const tangage = (d, k = 0.12) => (d <= 0 ? 0 : (d / k) * Math.exp(1 - d / k));

export default function creer(T) {
  const c = T.chap.voitures, m = (mot, k) => T.mot('c4', mot, k);
  const ep = EPINGLES.find((e) => e.chap === 'voitures');
  const DP = 0.26;                        // freinage de la plaque (décélération constante)
  const tA = m('voitures') - 0.15;        // la McLaren sort de l'épingle
  const t1 = m('jeu') - 0.12;             // la Coquette déboule de la droite
  const tP = m('plaques') - DP + 0.02;    // la plaque arrive… et pile net sur « plaques »
  const t2 = (t1 + tP) / 2;               // la voiture de police, entre les deux
  const tF = tP + DP + 0.08;              // la plaque avance
  const tL = m('Leonida') - 0.42;         // plongée sur « LEONIDA »
  const DL = 0.7;
  const tU = m('Leonida') - 0.02;         // le trait cerise souligne le mot…
  const DU = 0.34;
  const tE = tU + 0.16;                   // … et l'étiquette se pose au-dessus
  const tS = c.tenue - 0.05;              // tout rentre dans l'épingle
  const ARRIVEE = [tA, t1, t2, tP];
  const DEPART = [t1 - 0.1, t2 - 0.1, tP - 0.1, Infinity];   // celle de devant part juste avant

  const blocs = [
    { sortie: m('plaques') - 0.3, lignes: [[['04', m('Quatre'), 'num'], ['Les', m('les voitures')], ['voitures', m('voitures')]], [['du jeu,', m('du jeu')], ['en vrai.', m('en vrai'), 'accent']]] },
    { sortie: c.tenue + 0.2, lignes: [[['Plaques', m('plaques')], ['“Leonida”.', m('Leonida'), 'accent']]] },
  ];

  // Flou de mouvement horizontal propre à chaque carte (filtre SVG, écart-type « σ 0 ») : les
  // 3 sous-images du rendu sont espacées de v/360 px ; un flou de σ ≈ v/720 comble l'écart, et
  // la voiture file au lieu de se dédoubler. Nul à l'arrêt.
  let cartes = [], flous = [];
  function preparer() {
    cartes = PHOTOS.map((p) => carte(p.src));
    PHOTOS.forEach((p, i) => { if (p.filtre) style(cartes[i].img, 'filter', p.filtre); });
    const svg = el('div', 'ch-voitures-filtres', '<svg width="0" height="0" style="position:absolute">'
      + PHOTOS.map((_, i) => `<filter id="ch-voitures-flou-${i}" x="-25%" y="-20%" width="150%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`).join('')
      + '</svg>', $('cartes'));
    flous = [...svg.querySelectorAll('feGaussianBlur')];
  }
  function filer(i, v) {
    const sd = Math.min(16, Math.abs(v) / 720);
    if (sd < 0.5) { style(cartes[i].el, 'filter', 'none'); return; }
    flous[i].setAttribute('stdDeviation', `${sd.toFixed(2)} 0`);
    style(cartes[i].el, 'filter', `url(#ch-voitures-flou-${i})`);
  }

  // Pose d'une carte dans la voie à l'instant t (sans le retour dans l'épingle), ou null.
  function pose(t, i, pin) {
    const d = t - ARRIVEE[i];
    if (d < 0) return null;
    let x, y = VOIE.y, w = VOIE.w, h = VOIE.h, s = 1, r = 0, a = 1;
    if (i === 0) {
      // La McLaren sort de l'épingle, puis roule doucement.
      const e = ressort(d, 180, 20);
      x = lerp(pin[0], VOIE.x - DERIVE * d, e); y = lerp(pin[1], y, e); s = lerp(0.1, 1, e); a = clamp(e * 4);
    } else if (i < 3) {
      x = VOIE.x + (ENTREE - VOIE.x) * approche(d) - DERIVE * d;
      r = -1.2 * tangage(d);
    } else {
      // La plaque : décélération constante, arrêt net, puis la carte se rassoit en oscillant.
      const u = clamp(d / DP);
      x = VOIE.x + (ENTREE - VOIE.x) * (1 - u) ** 2;
      r = d < DP ? -1.8 * E.sortie(clamp(d / 0.1)) : -1.8 * Math.exp(-7 * (d - DP)) * Math.cos(16 * (d - DP));
      // Elle avance : la carte grandit jusqu'à la colonne des titres et s'ouvre en hauteur.
      const f = ressort(t - tF, 170, 20);
      y = lerp(y, FOCUS.y, f); w = lerp(w, FOCUS.w, f); h = lerp(h, FOCUS.h, f);
    }
    // La voiture de devant accélère (le nez se lève) et sort à gauche.
    // Une fois sortie, elle ne revient plus (pas même avec le retour dans l'épingle).
    const u = prog(t, DEPART[i], DF);
    if (u >= 1) return null;
    if (u > 0) { x -= FUITE * u * u; r += 1.2 * u; }
    if (x + w / 2 < -60 || x - w / 2 > W + 60) return null;
    // Cadrage : la voiture au centre, poussée lente vers l'arrière pendant qu'on la regarde.
    const im = PHOTOS[i], kb = lerp(1.12, 1.05, E.doux(clamp(d / 1.2)));
    const p = { x, y, w, h, r, s, a, z: 10 + i, kb, op: position(im, w, h, im.vise), kx: 0, ky: 0 };
    return { ...p, ...viser(im, p, ...im.vise, 0, 0) };
  }

  // La plongée sur « LEONIDA » : zoom géométrique, le mot glisse de sa place vers le centre.
  function plonger(t, p) {
    const q = E.traversee(prog(t, tL, DL));
    if (q <= 0) return p;
    const S0 = ecart(PLAQUE, p, ...LEONIDA.centre);
    const kb = p.kb * (KB_LEO / p.kb) ** q * lerp(1, 1.035, E.doux(prog(t, tL + DL, tS - tL - DL)));
    const z = { ...p, kb };
    return { ...z, ...viser(PLAQUE, z, ...LEONIDA.centre, lerp(S0[0], 0, q), lerp(S0[1], LEO_Y, q)) };
  }

  // Le trait cerise sous « LEONIDA » (tracé de gauche à droite) et l'étiquette au-dessus.
  function annoter(g, p, t, a) {
    const tr = clamp(prog(t, tU, DU));
    if (tr > 0 && a > 0) {
      const [P0, P1, P2, P3] = LEONIDA.trait.map(([u, v]) => ecran(PLAQUE, p, u, v));
      const n = 48, fin = E.sortie(tr) * n;
      g.save();
      g.globalAlpha = a;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = 11 * p.s * (p.kb / KB_LEO);
      g.strokeStyle = C.cerise;
      g.shadowColor = rgba(C.marine, 0.35); g.shadowBlur = 6; g.shadowOffsetY = 2;
      g.beginPath();
      for (let k = 0; k <= Math.ceil(fin); k++) {
        const u = Math.min(k, fin) / n, v = 1 - u;
        const x = v * v * v * P0[0] + 3 * v * v * u * P1[0] + 3 * v * u * u * P2[0] + u * u * u * P3[0];
        const y = v * v * v * P0[1] + 3 * v * v * u * P1[1] + 3 * v * u * u * P2[1] + u * u * u * P3[1];
        if (k) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
      g.restore();
    }
    const e = ressort(t - tE, 210, 20);
    if (e <= 0.001 || a <= 0) return;
    // Étiquette : pastille marine, pointe vers le haut des lettres.
    const [cx] = ecran(PLAQUE, p, ...LEONIDA.centre), [, hy] = ecran(PLAQUE, p, LEONIDA.centre[0], LEONIDA.haut);
    const txt = 'L’ÉTAT DE GTA VI', h = 58;
    g.save();
    g.font = '600 29px "JetBrains Mono"'; g.letterSpacing = '3px';
    const lt = g.measureText(txt).width, w = lt + 36 + 28;
    const pointe = hy - 16;
    g.translate(cx, pointe);
    g.scale(lerp(0.7, 1, e), lerp(0.7, 1, e));
    g.translate(0, (1 - e) * 14);
    g.globalAlpha = a * clamp(e * 3);
    g.beginPath();
    g.roundRect(-w / 2, -12 - h, w, h, 14);
    g.moveTo(-11, -12.5); g.lineTo(0, 0); g.lineTo(11, -12.5);
    g.fillStyle = rgba(C.marine, 0.93); g.shadowColor = 'rgba(3,8,20,0.45)'; g.shadowBlur = 26; g.shadowOffsetY = 8; g.fill();
    g.shadowColor = 'transparent';
    g.beginPath(); g.roundRect(-w / 2, -12 - h, w, h, 14); g.lineWidth = 1.2; g.strokeStyle = rgba(C.beurre, 0.2); g.stroke();
    // Petit carré cerise, puis le texte.
    g.fillStyle = C.cerise; g.fillRect(-w / 2 + 20, -12 - h / 2 - 6, 12, 12);
    g.fillStyle = C.beurre; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(txt, -w / 2 + 20 + 12 + 16, -12 - h / 2 + 1.5);
    g.restore();
  }

  function dessiner(t, X) {
    if (t < tA - 0.1 || t > tS + 0.6) return;
    const pin = ecranEpingle(X.P, ep);
    const retour = E.entree(prog(t, tS, 0.4));
    PHOTOS.forEach((im, i) => {
      const base = pose(t, i, pin);
      if (!base) return;
      let p = base;
      if (i === 3) p = plonger(t, p);
      // Retour dans l'épingle (seule la plaque est encore là).
      if (retour > 0) p = { ...p, x: lerp(p.x, pin[0], retour), y: lerp(p.y, pin[1], retour), s: p.s * (1 - 0.9 * retour), a: p.a * (1 - retour * retour) };
      placer(cartes[i], p);
      // Vitesse horizontale de la carte (px/s), pour son flou de mouvement.
      const av = pose(t - 0.004, i, pin) || base, ap = pose(t + 0.004, i, pin) || base;
      filer(i, retour > 0 ? 0 : (ap.x - av.x) / (av === base || ap === base ? 0.004 : 0.008));
      style(cartes[i].img, 'objectPosition', `${(p.op[0] * 100).toFixed(2)}% ${(p.op[1] * 100).toFixed(2)}%`);
      if (i === 3) annoter(X.dessus, p, t, 1 - E.sortie(prog(t, tS, 0.22)));
    });
  }

  const voile = (t) => clamp(prog(t, tA - 0.2, 0.4)) * (1 - prog(t, tS + 0.1, 0.4));
  const legendes = [{ de: tA + 0.3, a: tS, html: 'KEY BISCAYNE · 15.10.2026\n<small>PHOTOS @TALLGLASSOFWADA · @GTASIXINFO</small>' }];
  // Flou de mouvement : sortie de l'épingle, chaque passage, la plongée, le retour.
  const rapide = [[tA, tA + 0.25], [t1 - 0.1, t1 + 0.24], [t2 - 0.1, t2 + 0.24], [tP - 0.1, tP + DP + 0.04], [tL + 0.12, tL + DL - 0.12], [tS, tS + 0.42]];
  const sous = (t) => (rapide.some(([a, b]) => t > a && t < b) ? 3 : 1);

  function sons(add) {
    add(tA, 'clic', 0.5);
    // Chaque passage : un souffle qui file de droite à gauche (hauteur impaire), au plus fort
    // quand la voiture est la plus rapide.
    add(t1 - 0.26, 'glisse', 0.42, { hauteur: 1 });
    add(t2 - 0.26, 'glisse', 0.42, { hauteur: 3 });
    add(tP - 0.3, 'glisse', 0.45, { hauteur: 1 });
    add(tP + DP - 0.01, 'verrou', 0.5, { hauteur: 2 });   // la plaque pile au centre (son au centre)
    add(tL, 'scintille', 0.3);
    add(tU, 'glisse', 0.28, { hauteur: 2 });
    add(tE, 'clic', 0.4);
    add(tS, 'clic', 0.3);
  }

  return { id: 'voitures', blocs, preparer, dessiner, voile, legendes, sons, sous };
}
