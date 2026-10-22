// Chapitre 0 — l'accroche (0 → 10,4 s) et la boucle de fin.
// Le diptyque de l'enseigne en plein écran (« Ce n'est pas GTA 6. C'est le vrai Miami. »),
// la photo qui rétrécit en épingle, le rembobinage vers Los Santos, le trajet jusqu'à Vice City,
// puis trois vraies photos qui surgissent de Miami (« ils la construisent en vrai »).
// En fin de film, la caméra replonge sur l'enseigne et le diptyque reprend tout l'écran :
// la dernière image rejoint la première.
import { W, H, C, clamp, lerp, prog, E, ressort, tw, style, vis, $ } from '../outils.js';
import { donnees, dessinerTrajet, epingle, texte, etiquetteLieu, LIEUX, RAD } from '../carte.js';
import { ACCROCHE as A, ROUTE_ACCROCHE, routeAccroche } from '../camera.js';
import { carte, animer } from '../photos.js';

export default function creer(T, K) {
  const SORTIE_CARTES = 10.48;      // les trois photos rentrent dans Miami, la caméra repart
  const m = T.mot;
  // Le premier titre est là dès la première image (c'est la vignette) ; les suivants sortent sur la voix.
  const blocs = [
    { sortie: 2.22, lignes: [[['Ce', 0.05], ["n'est", 0.11], ['pas', 0.17]], [['GTA 6.', 0.4, 'accent']]] },
    { sortie: 3.4, lignes: [[["C'est", m('a2', "C'est")], ['le', m('a2', 'le')], ['vrai', m('a2', 'vrai')]], [['Miami.', m('a2', 'Miami'), 'accent']]] },
    { sortie: 7.28, lignes: [[['De', m('a3', 'Après')], ['Los', m('a3', 'Los')], ['Santos', m('a3', 'Santos')]], [['à', m('a4', 'à')], ['Vice City.', m('a4', 'Vice'), 'accent']]] },
    { sortie: SORTIE_CARTES - 0.1, lignes: [[['Pour', m('a5', 'pour')], ['vendre', m('a5', 'vendre')], ['le', m('a5', 'le')], ['jeu,', m('a5', 'jeu')]], [['ils', m('a6', 'ils')], ['la', m('a6', 'la')], ['construisent', m('a6', 'construisent')]], [['en vrai.', m('a6', 'en vrai'), 'accent']]] },
  ];

  const FAN = [ // photos réelles qui surgissent de l'épingle de Miami (crédit : Creapills)
    { src: 'medias/creapills-74.jpeg', d: 0, x: 280, y: 1018, r: -7, z: 1 },    // le dirigeable
    { src: 'medias/creapills-60.jpeg', d: 0.26, x: 772, y: 1010, r: 6, z: 1 },  // borne Kowalski
    { src: 'medias/creapills-58.jpeg', d: 0.13, x: 526, y: 972, r: 1, z: 3 },   // borne Pfister
  ];
  let fan = [], villes = [];

  function preparer() {
    fan = FAN.map((f) => ({ ...f, c: carte(f.src) }));
    const fond = ['New York', 'Chicago', 'Houston', 'Atlanta', 'Denver', 'Seattle', 'Washington, D.C.', 'Phoenix', 'Dallas', 'New Orleans', 'Tampa', 'Orlando'];
    villes = donnees().villes.filter((v) => v.pays === 'USA' && fond.includes(v.nom)).map((v) => {
      const pas = ROUTE_ACCROCHE.passage(v.ll);
      return { ...v, passage: pas.distance < 0.05 && pas.p > 0.08 && pas.p < 0.92 ? pas.p : null };
    });
  }

  // Le diptyque : plein écran → carte → épingle ; et à la fin, épingle → plein écran.
  function diptyque(t, X) {
    const box = $('accroche'), [haut, bas] = box.querySelectorAll('.panneau img');
    const [mx, my] = X.P.ll(...LIEUX.miami);
    const B = K.boucle, fin = T.duree;
    let a, b;
    if (t < 6) {
      a = E.traversee(prog(t, A.recul, 0.55));             // plein écran → carte
      b = E.entree(prog(t, A.recul + 0.48, 0.3));          // carte → épingle
    } else {
      // Retour : l'épingle redevient carte puis plein écran, arrivée exacte à la dernière image.
      b = 1 - E.sortie(prog(t, B.t1 - 0.55, 0.3));
      a = 1 - E.traversee(prog(t, B.t1 - 0.3, fin - 1 / 60 - (B.t1 - 0.3)));
    }
    if (b >= 1) { vis(box, 0); return; }
    const w = lerp(W, 210, a) * (1 - b * 0.85), h = lerp(H, 262, a) * (1 - b * 0.85);
    const cx = lerp(W / 2, mx, a), cy = lerp(H / 2, my, a);
    style(box, 'width', `${w.toFixed(1)}px`);
    style(box, 'height', `${h.toFixed(1)}px`);
    style(box, 'transform', `translate3d(${(cx - w / 2).toFixed(2)}px,${(cy - h / 2).toFixed(2)}px,0)`);
    style(box, 'borderRadius', `${(a * 30).toFixed(1)}px`);
    vis(box, 1 - b);
    // Les deux panneaux bougent chacun à leur façon : poussée lente en haut, travelling en bas.
    // À la fin, ils reviennent exactement à leur état de la première image.
    const p = t < 6 ? E.doux(prog(t, 0, A.recul + 0.4)) : 0;
    style(haut, 'transform', `translate(-50%,-50%) scale(${(1.03 + 0.07 * p).toFixed(4)})`);
    style(bas, 'transform', `translate(${(-50 + 2.2 - 4.4 * p).toFixed(3)}%,-50%) scale(1.09)`);
    vis(box.querySelector('.voile-haut'), 1 - a);
  }

  const horsTitres = (y) => clamp((y - 640) / 160);

  // Repères de la carte pendant l'accroche : villes, Los Santos, trajet, Vice City.
  function reperes(t, X) {
    const { ctx, cam, P } = X;
    const largeur = cam.w / RAD, q = routeAccroche(t);
    const fondu = clamp((largeur - 12) / 10) * clamp(prog(t, A.recul + 0.4, 0.6));
    for (const v of villes) {
      const [x, y, f] = P.ll(...v.ll);
      const zone = horsTitres(y);
      let a = 0.4 * fondu * zone, chaud = 0;
      if (v.passage !== null && t > A.route) {
        chaud = clamp(1 - Math.abs(q - v.passage) / 0.07);
        a = Math.max(a, q > v.passage ? 0.55 * fondu * zone : 0, chaud);
      }
      if (a <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, 3.2 + chaud * 2.5, 0, Math.PI * 2); ctx.fillStyle = chaud > 0.2 ? C.ceriseVif : C.beurre; ctx.fill();
      ctx.restore();
      texte(ctx, v.nom.replace(', D.C.', '').toUpperCase(), x + 12, y - 10, { taille: 19 * clamp(f, 0.8, 1.2), espace: 2.5, a });
    }
    const [lx, ly, lf] = P.ll(...LIEUX.losAngeles);
    const eL = ressort(t - A.losSantos, 200, 20);
    if (t > A.losSantos) {
      epingle(ctx, lx, ly, { a: clamp(eL * 2) * (1 - prog(t, 11, 0.6)), onde: prog(t, A.losSantos, 1.1), r: 7 });
      etiquetteLieu(ctx, lx, ly, 'LOS SANTOS', 'LOS ANGELES · GTA V · 2013', { e: eL, taille: 62 * clamp(lf, 0.85, 1.2), a: (1 - 0.7 * clamp((q - 0.25) / 0.3)) * horsTitres(ly) });
    }
    // Le trajet reste visible jusqu'à ce qu'on parte vers les 7 coups.
    if (t > A.route) dessinerTrajet(ctx, P, ROUTE_ACCROCHE, q, { tete: 1 - prog(t, A.arrivee + 0.2, 0.6), a: 1 - prog(t, SORTIE_CARTES, 0.6) });
    const [mx, my, mf] = P.ll(...LIEUX.miami);
    if (t > A.recul + 0.5) {
      const arrive = t > A.arrivee ? prog(t, A.arrivee, 1.2) : -1;
      epingle(ctx, mx, my, { a: tw(t, A.recul + 0.5, 0.3) * (1 - prog(t, SORTIE_CARTES + 0.4, 0.5)), onde: arrive >= 0 ? arrive : prog(t, A.recul + 0.5, 1), r: 8 + 3 * ressort(t - A.arrivee, 260, 14) * (t > A.arrivee), halo: 1 + (t > A.arrivee) });
    }
    if (t > A.arrivee) {
      const eV = ressort(t - A.arrivee, 230, 19);
      etiquetteLieu(ctx, mx, my, 'VICE CITY', 'MIAMI · GTA VI · 19.11.2026', { e: eV, taille: 80 * clamp(mf, 0.85, 1.25), a: 1 - 0.85 * tw(t, A.cartes - 0.1, 0.4) });
    }
  }

  function dessiner(t, X) {
    diptyque(t, X);
    if (t > 12.5) return;
    if (t >= A.recul - 0.05) reperes(t, X);
    const [mx, my] = X.P.ll(...LIEUX.miami);
    for (const f of fan) {
      animer(f.c, t, { t0: A.cartes + f.d, t1: SORTIE_CARTES + (0.26 - f.d) * 0.5, depuis: [mx, my], cible: { x: f.x, y: f.y + Math.sin((t - A.cartes) * 1.3 + f.r) * 5, w: 290, h: 372, r: f.r, z: f.z } });
    }
  }

  // La carte est cachée sous la photo pendant l'accroche, et pendant la fin de la boucle.
  const carteVisible = (t) => !(t < A.recul - 0.05 || t > K.boucle.t1 + 0.1);

  const legendes = [
    { de: 0.5, a: A.recul - 0.05, haut: 898, html: 'KASEYA CENTER · MIAMI, FL\n<small>SEPT. 2026 · PHOTO CREAPILLS</small>' },
    { de: A.cartes + 0.4, a: SORTIE_CARTES, html: 'MIAMI, FL · OCT. 2026\n<small>PHOTOS CREAPILLS</small>' },
  ];

  function sons(add) {
    add(0.4, 'clic', 0.35); add(T.mot('a2', 'Miami'), 'clic', 0.35);
    add(A.recul - 0.05, 'rembobinage', 0.8, { duree: 1.1 });
    add(A.recul, 'whoosh', 0.4, { duree: 1.25 });
    add(A.recul + 0.48, 'ping', 0.45);
    add(A.losSantos, 'tic', 0.5);
    add(A.route, 'montee', 0.42, { duree: A.routeD });
    const invDoux = (p) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (E.doux(m) < p) lo = m; else hi = m; } return lo; };
    for (const v of villes) if (v.passage !== null) add(A.route + A.routeD * invDoux(v.passage), 'tic', 0.25);
    add(A.arrivee, 'impact', 0.7);
    add(A.arrivee, 'ping', 0.4);
    for (const f of FAN) add(A.cartes + f.d, 'clic', 0.45);
    add(T.mot('a6', 'en vrai'), 'scintille', 0.3);
    // La boucle : la photo du début revient.
    add(K.boucle.t1 - 0.55, 'ping', 0.4);
    add(K.boucle.t1 - 0.3, 'whoosh', 0.45, { duree: 0.9 });
  }

  return { id: 'accroche', blocs, preparer, dessiner, carteVisible, legendes, sons, voile: () => 0 };
}
