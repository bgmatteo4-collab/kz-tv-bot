// Coup n° 6 — les fresques des Wynwood Walls, et le musée offert aux habitants.
// « Six : dix fresques de vrais street-artistes, et le musée offert aux habitants jusqu'en
//   deux mille vingt-huit. »
//
// Idée de mouvement : on longe les murs. Les fresques sont longues et horizontales : elles
// vivent dans une bande panoramique calée sur la colonne des titres, qui file hors champ à
// droite (le mur continue). Dedans, un travelling latéral lent, et d'un mur à l'autre un
// panoramique filé (flou de bougé horizontal).
// 1. La caméra se pose sur l'épingle 6 ; la bande sort de l'épingle sur la longue fresque
//    « Vice City » ; le compteur « 01 → 10 NOUVELLES FRESQUES » défile avec la voix.
// 2. « street-artistes » : panoramique filé jusqu'à la fresque de FAILE, le compteur se bloque
//    sur 10 ; sur « artistes », le cartel « FAILE » se pose sur le mur, à côté de l'œuvre.
// 3. « et le musée » : panoramique filé jusqu'au jardin du musée (fresque « Leonida »).
//    « aux habitants » : un billet d'entrée sort de l'épingle ; sur « jusqu'en », le tampon
//    cerise s'abat (GRATUIT · HABITANTS DE MIAMI-DADE · JUSQU'EN 2028).
// 4. « deux mille vingt-huit » : gros plan sur le tampon, tenu jusqu'à la fin de la tenue ; la
//    bande recule, s'assombrit et se floute. Puis tout rentre dans l'épingle, la caméra repart.
import { clamp, lerp, prog, E, ressort, hash, style, vis, el, $ } from '../outils.js';
import { EPINGLES, ecranEpingle } from '../epingles.js';

// Les trois murs, dans l'ordre du travelling. iw, ih : taille du fichier ; kb : grossissement
// dans le cadre ; v : ligne de l'image tenue au milieu de la bande ; de → a : décalage
// horizontal de l'image (px, centre de l'image par rapport au centre du panneau) pendant le
// travelling (positif = on voit la gauche du mur).
const MURS = [
  // Longue fresque « Vice City » (alligator, pin-up, lettrage « Vice City » vers u = 0,69).
  { src: 'medias/fresque-vice-city.jpg', iw: 2048, ih: 1152, kb: 1.4, v: 0.5, de: 205, a: -150 },
  // FAILE (couple sur des alligators) : l'œuvre va de u = 0,29 à 0,69 et de v = 0,15 à 0,84.
  { src: 'medias/fresque-faile.jpg', iw: 2000, ih: 1333, kb: 1.045, v: 0.495, de: 34, a: -8 },
  // « Leonida / Flamingos », dans le jardin des Wynwood Walls (lettrage « Leonida » en haut).
  { src: 'medias/fresque-flamants.jpg', iw: 2048, ih: 1152, kb: 1.3, v: 0.52, de: 170, a: -150 },
];

// La bande : bord gauche sur la colonne des titres (x = 124), elle file hors champ à droite.
// Son bas (y = 1112) couvre entièrement les épingles 6 et 1 (y ≈ 1057 et 1075 à l'écran) :
// aucune épingle n'est coupée par le bord de la photo.
const B = { gauche: 124, w: 1000, h: 516, y: 854 };
B.x = B.gauche + B.w / 2;
const ECART = 40;                 // entre deux murs (visible seulement pendant un panoramique filé)
const DW = 0.3;                   // durée d'un panoramique filé
// Le billet (taille de base) et la position du tampon sur le billet (centre, px).
const BI = { w: 780, h: 340, souche: 170, x: B.gauche + 390, y: 985, r: -2.5 };
const TP = { x: 434, y: 248, r: -7 };
// Gros plan : le tampon vient ici, à cette échelle et cette rotation de billet. Le billet reste
// sous les titres (haut ≈ 580) et au-dessus de la légende (bas ≈ 1200) ; le tampon, à gauche de x = 900.
const GP = { x: 592, y: 1030, s: 1.75, r: 2 };

const cover = (m) => Math.max(B.w / m.iw, B.h / m.ih);
// Décalage vertical (px) qui tient la ligne v au milieu, sans découvrir le bord de l'image.
function decalageV(m) {
  const sc = cover(m), marge = Math.max(0, (m.ih * sc * m.kb - B.h) / 2);
  return clamp(-m.kb * (m.v - 0.5) * m.ih * sc, -marge, marge);
}

const CSS = `
.ch-fresques-bande { position: absolute; left: 0; top: 0; width: ${B.w}px; height: ${B.h}px; border-radius: 26px; overflow: hidden; z-index: 10;
  transform-origin: 50% 50%; will-change: transform; background: var(--marine);
  box-shadow: 0 30px 60px rgba(0, 0, 0, .5), 0 0 0 2px rgba(246, 231, 168, .22); }
.ch-fresques-bande::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(246, 231, 168, .08), rgba(11, 27, 58, .28)); mix-blend-mode: multiply; }
.ch-fresques-mur { position: absolute; left: 0; top: 0; width: ${B.w}px; height: ${B.h}px; overflow: hidden; will-change: transform; }
.ch-fresques-mur img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; transform-origin: 50% 50%; }
.ch-fresques-cartel { position: absolute; left: 30px; top: 112px; padding: 14px 20px 13px 18px; border-radius: 12px; background: rgba(11, 27, 58, .92);
  box-shadow: inset 0 0 0 1px rgba(246, 231, 168, .16), 0 14px 30px rgba(3, 8, 20, .35); color: var(--beurre); will-change: transform; }
.ch-fresques-cartel b { display: block; font: 900 66px/.9 "Archivo"; font-stretch: 68%; letter-spacing: .01em; }
.ch-fresques-cartel span { display: block; margin-top: 10px; padding-top: 10px; border-top: 2px solid var(--cerise);
  font: 600 16px/1 "JetBrains Mono"; letter-spacing: .12em; white-space: nowrap; opacity: .82; }
.ch-fresques-compteur { position: absolute; left: 0; top: 0; z-index: 30; display: flex; align-items: center; gap: 16px; padding: 10px 24px 10px 20px;
  border-radius: 16px; background: rgba(11, 27, 58, .9); color: var(--beurre); will-change: transform; transform-origin: 0 50%;
  box-shadow: inset 0 0 0 1px rgba(246, 231, 168, .16), 0 16px 34px rgba(3, 8, 20, .4); }
.ch-fresques-nombre { position: relative; width: 1.02em; height: .92em; overflow: hidden; font: 900 92px/.92 "Archivo"; font-stretch: 68%;
  font-variant-numeric: tabular-nums lining-nums; letter-spacing: -.005em;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 12%, #000 88%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 12%, #000 88%, transparent 100%); }
.ch-fresques-nombre span { position: absolute; left: 0; top: 0; width: 100%; text-align: center; will-change: transform; }
.ch-fresques-etiq { display: flex; flex-direction: column; gap: 8px; font: 600 15px/1 "JetBrains Mono"; letter-spacing: .16em; white-space: nowrap; }
.ch-fresques-etiq span { opacity: .62; }
.ch-fresques-etiq b { font: 800 25px/1 "JetBrains Mono"; letter-spacing: .12em; }
.ch-fresques-billet { position: absolute; left: 0; top: 0; width: ${BI.w}px; height: ${BI.h}px; z-index: 40; will-change: transform;
  filter: drop-shadow(0 30px 34px rgba(3, 8, 20, .5)) drop-shadow(0 6px 10px rgba(3, 8, 20, .3)); }
.ch-fresques-papier { position: absolute; inset: 0; border-radius: 20px; overflow: hidden; color: var(--marine);
  background: linear-gradient(180deg, rgba(255, 255, 255, .12), rgba(11, 27, 58, .06)), var(--beurre);
  -webkit-mask-image: radial-gradient(circle at ${BI.w - BI.souche}px 0, transparent 17px, #000 18px), radial-gradient(circle at ${BI.w - BI.souche}px 100%, transparent 17px, #000 18px);
  -webkit-mask-composite: source-in; mask-composite: intersect; }
.ch-fresques-perfo { position: absolute; left: ${BI.w - BI.souche - 1}px; top: 26px; bottom: 26px; width: 0; border-left: 3px dotted rgba(11, 27, 58, .32); }
.ch-fresques-haut { position: absolute; left: 36px; top: 32px; width: ${BI.w - BI.souche - 72}px; display: flex; justify-content: space-between;
  font: 600 16px/1 "JetBrains Mono"; letter-spacing: .16em; color: rgba(11, 27, 58, .66); white-space: nowrap; }
.ch-fresques-haut i { display: inline-block; width: 11px; height: 11px; margin-right: 12px; background: var(--cerise); border-radius: 2px; }
.ch-fresques-nom { position: absolute; left: 34px; top: 64px; font: 900 86px/.86 "Archivo"; font-stretch: 68%; letter-spacing: -.004em; white-space: nowrap; }
.ch-fresques-filet { position: absolute; left: 36px; top: 154px; width: ${BI.w - BI.souche - 72}px; border-top: 2px solid rgba(11, 27, 58, .16); }
.ch-fresques-champ { position: absolute; left: 36px; font: 700 17px/1 "JetBrains Mono"; letter-spacing: .1em; white-space: nowrap; }
.ch-fresques-champ small { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 600; letter-spacing: .16em; color: rgba(11, 27, 58, .55); }
.ch-fresques-souche { position: absolute; left: ${BI.w - BI.souche}px; top: 0; width: ${BI.souche}px; height: 100%; }
.ch-fresques-souche span { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-90deg); white-space: nowrap;
  font: 600 14px/1 "JetBrains Mono"; letter-spacing: .2em; color: rgba(11, 27, 58, .6); }
.ch-fresques-code { position: absolute; right: 26px; top: 40px; bottom: 40px; width: 34px; display: flex; flex-direction: column; justify-content: space-between; }
.ch-fresques-code i { display: block; background: rgba(11, 27, 58, .82); }
.ch-fresques-tampon { position: absolute; left: 0; top: 0; padding: 14px 22px 12px; text-align: center; color: var(--cerise); white-space: nowrap;
  border: 5px solid currentColor; border-radius: 9px; outline: 2px solid currentColor; outline-offset: -12px;
  mix-blend-mode: multiply; filter: url(#ch-fresques-encre); will-change: transform; }
.ch-fresques-tampon .t1 { font: 900 74px/.86 "Archivo"; font-stretch: 68%; letter-spacing: .04em; padding: 6px 10px 0; }
.ch-fresques-tampon .t2 { margin: 8px 6px 0; padding-top: 9px; border-top: 3px solid currentColor; font: 800 15px/1 "JetBrains Mono"; letter-spacing: .1em; }
.ch-fresques-tampon .t3 { margin-top: 8px; font: 900 42px/.9 "Archivo"; font-stretch: 68%; letter-spacing: .05em; padding-bottom: 5px; }
`;

const SVG = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<filter id="ch-fresques-file" x="-6%" y="0" width="112%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0" edgeMode="duplicate"/></filter>
<filter id="ch-fresques-encre" x="-4%" y="-4%" width="108%" height="108%">
  <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="11" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4" result="nappe"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.4 0 0 0 2.75" result="trous"/>
  <feColorMatrix in="nappe" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.6 0 0 0 1.75" result="charge"/>
  <feComposite in="trous" in2="charge" operator="arithmetic" k1="1" result="encre"/>
  <feDisplacementMap in="SourceGraphic" in2="grain" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="bave"/>
  <feComposite in="bave" in2="encre" operator="in"/>
</filter></defs></svg>`;

export default function creer(T) {
  const c = T.chap.fresques, m = (mot, k) => T.mot('c6', mot, k);
  const ep = EPINGLES.find((e) => e.chap === 'fresques');
  const tA = m('fresques') - 0.1;           // la bande sort de l'épingle, sur la fresque « Vice City »
  const tK0 = tA + 0.16;                    // le compteur apparaît sur 01…
  const tW1 = m('street') - 0.2;            // panoramique filé jusqu'à FAILE
  const tK1 = tW1 + DW;                     // … et se bloque sur 10 quand le panoramique se pose
  const tF = m('artistes') - 0.04;          // le cartel « FAILE » se pose sur le mur
  const tW2 = m('et le') - 0.02;            // panoramique filé jusqu'au jardin du musée
  const tT = m('habitants') - 0.12;         // le billet sort de l'épingle
  const tP = m('jusqu') - 0.04;             // le tampon s'abat
  const tZ = m('deux mille') - 0.12;        // gros plan sur le tampon (tenu jusqu'à la fin)
  const DZ = 1.05;
  const tS = c.tenue - 0.05;                // tout rentre dans l'épingle

  // Le compteur : instant de chaque cran (02 … 10), de plus en plus espacés, comme un
  // compteur qui ralentit avant de se bloquer.
  const crans = Array.from({ length: 9 }, (_, k) => tK0 + 0.1 + (tK1 - tK0 - 0.1) * Math.pow((k + 1) / 9, 1.45));
  const nombre = (t) => 1 + crans.filter((x) => t >= x).length;

  const blocs = [
    { sortie: m('musée') - 0.3, lignes: [[['06', m('Six'), 'num'], ['Dix', m('dix')], ['fresques', m('fresques')]], [['de vrais', m('de vrais')], ['artistes.', m('street'), 'accent']]] },
    { sortie: c.tenue + 0.2, lignes: [[['Musée', m('musée')], ['offert', m('offert'), 'accent']], [['aux', m('aux habitants')], ['habitants.', m('habitants')]]] },
  ];

  let bande, murs = [], cartel, compteur, chiffres = [], billet, tampon, flou;
  function preparer() {
    el('style', '', CSS, document.head);
    const svg = el('div', '', SVG, document.body);
    flou = svg.querySelector('#ch-fresques-file feGaussianBlur');
    bande = el('div', 'ch-fresques-bande', '', $('cartes'));
    murs = MURS.map((m) => {
      const d = el('div', 'ch-fresques-mur', `<img src="${m.src}" alt="">`, bande);
      return { ...m, el: d, img: d.querySelector('img'), dy: decalageV(m) };
    });
    cartel = el('div', 'ch-fresques-cartel', '<b>FAILE</b><span>FRESQUE POUR GTA VI</span>', murs[1].el);
    compteur = el('div', 'ch-fresques-compteur',
      '<div class="ch-fresques-nombre"><span></span><span></span></div><div class="ch-fresques-etiq"><span>NOUVELLES</span><b>FRESQUES</b></div>', $('cartes'));
    chiffres = [...compteur.querySelectorAll('.ch-fresques-nombre span')];
    // Le code-barres de la souche : des barres d'épaisseur irrégulière (reproductible).
    const barres = Array.from({ length: 30 }, (_, i) => `<i style="height:${(1.5 + 5 * hash(i + 7) ** 2).toFixed(1)}px"></i>`).join('');
    billet = el('div', 'ch-fresques-billet',
      '<div class="ch-fresques-papier">'
      + '<div class="ch-fresques-haut"><span><i></i>BILLET D’ENTRÉE</span><span>MUSÉE · MIAMI</span></div>'
      + '<div class="ch-fresques-nom">WYNWOOD WALLS</div><div class="ch-fresques-filet"></div>'
      + '<div class="ch-fresques-champ" style="top:180px"><small>VALABLE</small>DÈS LE 13.10.2026</div>'
      + '<div class="ch-fresques-champ" style="top:246px"><small>OFFERT PAR</small>ROCKSTAR GAMES</div>'
      + `<div class="ch-fresques-perfo"></div><div class="ch-fresques-souche"><span>ENTRÉE · WYNWOOD</span><div class="ch-fresques-code">${barres}</div></div>`
      + '<div class="ch-fresques-tampon"><div class="t1">GRATUIT</div><div class="t2">HABITANTS DE MIAMI-DADE</div><div class="t3">JUSQU’EN 2028</div></div>'
      + '</div>', $('cartes'));
    tampon = billet.querySelector('.ch-fresques-tampon');
    vis(bande, 0); vis(compteur, 0); vis(billet, 0);
  }

  // Position du travelling : 0 = « Vice City », 1 = FAILE, 2 = le jardin du musée.
  const defile = (t) => E.traversee(prog(t, tW1, DW)) + E.traversee(prog(t, tW2, DW));
  // Vitesse du défilement (murs par seconde), pour le flou de bougé.
  const vitesse = (t) => (defile(t + 0.004) - defile(t - 0.004)) / 0.008;
  // Décalage horizontal de l'image dans son panneau : le travelling lent le long de chaque mur.
  function decalage(i, t) {
    const mu = MURS[i];
    if (i === 0) return lerp(mu.de, mu.a, (t - tA) / (tW1 + DW - tA));
    if (i === 1) return lerp(mu.de, mu.a, E.sortie(prog(t, tW1, tW2 + DW - tW1)));
    const p = prog(t, tW2, tS - tW2);
    return lerp(mu.de, mu.a, 0.45 * p + 0.55 * E.sortie(p));
  }

  function dessiner(t, X) {
    if (t < tA - 0.1 || t > tS + 0.6) { vis(bande, 0); vis(compteur, 0); vis(billet, 0); return; }
    const [px, py] = ecranEpingle(X.P, ep);
    const retour = E.entree(prog(t, tS, 0.4));
    const gp = E.traversee(prog(t, tZ, DZ));                        // gros plan sur le tampon
    const tient = E.doux(prog(t, tZ + DZ, Math.max(0.2, tS - tZ - DZ)));

    // --- La bande : sort de l'épingle, recule pendant le gros plan, rentre à la fin.
    const e = ressort(t - tA, 170, 19);
    let x = lerp(px, B.x, e), y = lerp(py, B.y, e), s = lerp(0.1, 1, e) * lerp(1, 0.955, gp), a = clamp(e * 4);
    if (retour > 0) { x = lerp(x, px, retour); y = lerp(y, py, retour); s *= 1 - 0.9 * retour; a *= 1 - retour * retour; }
    style(bande, 'transform', `translate3d(${(x - B.w / 2).toFixed(2)}px,${(y - B.h / 2).toFixed(2)}px,0) scale(${s.toFixed(4)})`);
    vis(bande, a);
    // Les murs, côte à côte ; flou de bougé horizontal pendant les panoramiques filés.
    const d = defile(t), fl = Math.min(46, Math.abs(vitesse(t)) * (B.w + ECART) / 300);
    flou.setAttribute('stdDeviation', `${fl.toFixed(2)} 0`);
    const sombre = 0.42 * gp, net = 6 * gp;
    murs.forEach((mu, i) => {
      const o = i - d;
      if (Math.abs(o) >= 1) { vis(mu.el, 0); return; }
      vis(mu.el, 1);
      style(mu.el, 'transform', `translate3d(${(o * (B.w + ECART)).toFixed(2)}px,0,0)`);
      style(mu.el, 'filter', fl > 0.4 ? 'url(#ch-fresques-file)' : 'none');
      style(mu.img, 'transform', `translate(${((decalage(i, t) / B.w) * 100).toFixed(3)}%,${((mu.dy / B.h) * 100).toFixed(3)}%) scale(${mu.kb})`);
      style(mu.img, 'filter', `contrast(1.05) saturate(.9) brightness(${(1 - sombre).toFixed(3)})${net > 0.05 ? ` blur(${net.toFixed(2)}px)` : ''}`);
    });

    // --- Le cartel « FAILE », posé sur le mur à côté de l'œuvre (il part avec le mur).
    const ec = ressort(t - tF, 210, 24);
    style(cartel, 'transform', `translate3d(0,${((1 - ec) * 26).toFixed(2)}px,0)`);
    vis(cartel, clamp(ec * 3));

    // --- Le compteur, accroché au coin bas gauche de la bande.
    const ek = ressort(t - tK0, 220, 22), sk = E.entree(prog(t, tT - 0.06, 0.26));
    if (ek > 0.001 && sk < 1) {
      const n = nombre(t), k = n > 1 ? crans[n - 2] : tK0;
      const r = ressort(t - k, 520, 34);              // le nouveau chiffre monte, l'ancien sort par le haut
      chiffres[0].textContent = String(n).padStart(2, '0');
      chiffres[1].textContent = String(Math.max(1, n - 1)).padStart(2, '0');
      style(chiffres[0], 'transform', `translate3d(0,${(n > 1 ? (1 - r) * 100 : 0).toFixed(2)}%,0)`);
      style(chiffres[1], 'transform', `translate3d(0,${(-r * 100).toFixed(2)}%,0)`);
      vis(chiffres[1], n > 1 && r < 0.999 ? 1 : 0);
      const cx = B.gauche + 30, cy = B.y + B.h / 2 + 18 * sk;
      const sc = lerp(0.82, 1, ek) * (1 + 0.05 * Math.exp(-(t - tK1) * 9) * (t >= tK1 ? 1 : 0));
      style(compteur, 'transform', `translate3d(${cx}px,${cy.toFixed(2)}px,0) translate(0,-50%) scale(${sc.toFixed(4)})`);
      vis(compteur, clamp(ek * 3) * (1 - sk) * (1 - retour));
    } else vis(compteur, 0);

    // --- Le billet : sort de l'épingle, le tampon s'abat, gros plan, retour dans l'épingle.
    const eb = ressort(t - tT, 180, 20);
    if (eb > 0.001) {
      const vie = E.doux(prog(t, tT, tZ - tT));
      // Le tampon frappe : le billet encaisse le coup (petite oscillation amortie).
      const k = t - tP, choc = k >= 0 ? 0.028 * Math.exp(-k * 16) * Math.cos(k * 42) : 0;
      let sb = lerp(0.1, 1, eb) * lerp(1, 1.03, vie) * (1 - choc), rb = lerp(-9, BI.r, eb);
      let bx = lerp(px, BI.x, eb), by = lerp(py, BI.y, eb);
      if (gp > 0) {
        // Le tampon file au centre ; le billet tourne et grossit autour de lui.
        rb = lerp(BI.r, GP.r, gp);
        sb = lerp(sb, GP.s, gp) * lerp(1, 1.035, tient);
        const ox = TP.x - BI.w / 2, oy = TP.y - BI.h / 2;
        const at = (r, sc) => { const q = (r * Math.PI) / 180; return [sc * (ox * Math.cos(q) - oy * Math.sin(q)), sc * (ox * Math.sin(q) + oy * Math.cos(q))]; };
        const [ax, ay] = at(BI.r, lerp(1, 1.03, vie));
        const [gx, gy] = at(rb, sb);
        const tx = lerp(BI.x + ax, GP.x, gp), ty = lerp(BI.y + ay, GP.y, gp);
        bx = tx - gx; by = ty - gy;
      }
      let ab = clamp(eb * 4);
      if (retour > 0) { bx = lerp(bx, px, retour); by = lerp(by, py, retour); sb *= 1 - 0.9 * retour; ab *= 1 - retour * retour; }
      style(billet, 'transform', `translate3d(${(bx - BI.w / 2).toFixed(2)}px,${(by - BI.h / 2).toFixed(2)}px,0) rotate(${rb.toFixed(3)}deg) scale(${sb.toFixed(4)})`);
      vis(billet, ab);
      // Le tampon : il descend (grand, transparent) et s'imprime d'un coup sur le papier.
      const q = prog(t, tP - 0.13, 0.13);
      const st = lerp(1.5, 1, E.entree(q));
      style(tampon, 'transform', `translate3d(${(TP.x).toFixed(1)}px,${(TP.y).toFixed(1)}px,0) translate(-50%,-50%) rotate(${TP.r}deg) scale(${st.toFixed(4)})`);
      vis(tampon, q <= 0 ? 0 : q < 1 ? 0.35 * E.entree(q) : 0.94);
    } else vis(billet, 0);
  }

  const voile = (t) => clamp(prog(t, tA - 0.2, 0.4)) * (1 - prog(t, tS + 0.1, 0.4));
  const legendes = [{ de: tA + 0.3, a: tS, html: 'WYNWOOD WALLS · OCT. 2026\n<small>PHOTOS MIAMI NEW TIMES · @GTASIXPOLSKA</small>' }];
  // Flou de mouvement : sorties de la bande et du billet, panoramiques filés, coup de tampon, retour.
  const sous = (t) => ((t > tA && t < tA + 0.3) || (t > tW1 - 0.02 && t < tW1 + DW + 0.02) || (t > tW2 - 0.02 && t < tW2 + DW + 0.02)
    || (t > tT && t < tT + 0.3) || (t > tP - 0.14 && t < tP + 0.02) || (t > tS && t < tS + 0.4) ? 3 : 1);

  function sons(add) {
    add(tA, 'clic', 0.5);
    add(tA + 0.12, 'glisse', 0.3, { hauteur: 0 });
    crans.forEach((x, i) => add(x, 'tic', i < 8 ? 0.26 : 0.3));
    add(tK1, 'verrou', 0.4);
    add(tW1 - 0.12, 'whoosh', 0.42, { duree: 0.55 });
    add(tF, 'ping', 0.35, { hauteur: 1 });
    add(tW2 - 0.12, 'whoosh', 0.4, { duree: 0.55 });
    add(tT, 'clic', 0.45);
    add(tP, 'impact', 0.42);
    add(tP, 'verrou', 0.35, { hauteur: 0 });
    add(tZ + 0.2, 'scintille', 0.25);
    add(tS, 'clic', 0.3);
  }

  return { id: 'fresques', blocs, preparer, dessiner, voile, legendes, sons, sous };
}
