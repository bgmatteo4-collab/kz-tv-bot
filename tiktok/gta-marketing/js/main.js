// Assemble le film et expose window.__render(t) pour le rendu image par image.
// Version actuelle : le test des 11 premières secondes (accroche + carte Los Santos → Vice City).
import { W, H, FPS, C, rgba, clamp, lerp, prog, E, ressort, tw, $, style, vis, el } from './outils.js';
import {
  chargerCarte, donnees, vue, vol, dessinerCarte, trajet, dessinerTrajet, epingle, texte, etiquetteLieu,
  LIEUX, RAD, enLonLat,
} from './carte.js';

export const DUREE = 11.4;
const VOIX = 0.2; // la voix off commence 0,2 s après la première image

// ---------------------------------------------------------------- partition
// Repères calés sur les silences de la voix (ElevenLabs, voix « Sterling ») :
// « Ça, ce n'est pas GTA six. » 0,74–2,05 · « C'est le vrai Miami. » 2,43–3,52
// « Après Los Santos, » 4,06–5,09 · « Rockstar nous ramène à Vice City. » 5,30–7,09
// « Et pour vendre le jeu… » 7,57–8,64 · « ils la construisent en vrai. » 9,14–10,42
const T = { recul: 3.45, reculFin: 4.6, losSantos: 4.3, route: 5.3, routeD: 1.75, arrivee: 7.05, cartes: 8.92 };

const BLOCS = [
  { sortie: 2.22, lignes: [[['Ce', 0.05], ["n'est", 0.11], ['pas', 0.17]], [['GTA 6.', 0.4, 1]]] },
  { sortie: 3.4, lignes: [[["C'est", 2.43], ['le', 2.52], ['vrai', 2.62]], [['Miami.', 2.95, 1]]] },
  { sortie: 7.28, lignes: [[['De', 4.06], ['Los', 4.2], ['Santos', 4.3]], [['à', 6.36], ['Vice City.', 6.48, 1]]] },
  { sortie: 99, lignes: [[['Pour', 7.57], ['vendre', 7.7], ['le', 7.86], ['jeu,', 7.95]], [['ils', 9.14], ['la', 9.28], ['construisent', 9.4]], [['en vrai.', 9.9, 1]]] },
];

const CARTES = [ // photos réelles qui surgissent de l'épingle de Miami (crédit : Creapills)
  { src: 'medias/creapills-74.jpeg', t: 0, x: 280, y: 1018, r: -7 },  // le dirigeable
  { src: 'medias/creapills-60.jpeg', t: 0.26, x: 772, y: 1010, r: 6 }, // borne Kowalski
  { src: 'medias/creapills-58.jpeg', t: 0.13, x: 526, y: 972, r: 1 },  // borne Pfister
];

// ---------------------------------------------------------------- caméra

const V0 = vue(...LIEUX.miami, 1.2, 0);              // à la verticale de l'enseigne, comme la photo
const V1 = vue(-112.5, 33.3, 26, 38 * RAD);          // retour en arrière : la Californie
const V2 = vue(-111.0, 33.5, 22, 40 * RAD);          // on se pose sur Los Santos
const V3 = vue(-80.55, 26.15, 6, 44 * RAD);          // arrivée sur la Floride
const V4 = vue(-80.19, 25.8, 1.9, 54 * RAD);         // plongée sur Miami
const reculer = vol(V0, V1), deriver = vol(V1, V2), approcher = vol(V2, V3), plonger = vol(V3, V4);
const ROUTE = trajet(LIEUX.losAngeles, LIEUX.miami, 0.2);
const routeP = (t) => E.doux(prog(t, T.route, T.routeD));

function camera(t) {
  if (t < T.recul) return V0;
  if (t < T.reculFin) return reculer(E.traversee(prog(t, T.recul, T.reculFin - T.recul)));
  if (t < T.route) return deriver(E.doux(prog(t, T.reculFin, T.route - T.reculFin)));
  if (t < T.arrivee) {
    // La caméra suit la tête du trajet, sans à-coup aux deux bouts.
    const q = routeP(t), c = approcher(q), [hx, hy] = ROUTE.point(q), w = Math.sin(Math.PI * q) * 0.45;
    return { ...c, x: lerp(c.x, hx, w), y: lerp(c.y, hy, w) };
  }
  return plonger(E.sortie(prog(t, T.arrivee, 3.6)));
}

// ---------------------------------------------------------------- mise en place

let ctx, villes = [], mots = [], cartes = [];

function construireTitres() {
  const racine = $('titres');
  BLOCS.forEach((b, ib) => {
    const bloc = el('div', 'bloc', undefined, racine);
    b.lignes.forEach((ligne, il) => {
      const l = el('div', 'ligne', undefined, bloc);
      ligne.forEach(([txt, t0, accent], iw) => {
        const m = el('span', 'mot' + (accent ? ' accent' : ''), undefined, l);
        const int = el('span', '', undefined, m);
        int.textContent = txt;
        mots.push({ int, t0, sortie: b.sortie + (il * 2 + iw) * 0.018, bloc: ib });
      });
    });
  });
}

// Chaque ligne de titre prend toute la largeur de la colonne (taille plafonnée).
function ajusterLignes() {
  const largeur = 866, plafond = 216;
  for (const l of document.querySelectorAll('.ligne')) {
    l.style.fontSize = '100px';
    l.style.display = 'inline-block';
    const w = l.getBoundingClientRect().width;
    l.style.display = '';
    l.style.fontSize = `${Math.min(plafond, (100 * largeur) / w).toFixed(2)}px`;
  }
  // Les blocs s'empilent depuis le haut : rien à recalculer, chaque bloc garde top: 0.
}

function construireCartes() {
  cartes = CARTES.map((c) => {
    const d = el('div', 'photo', `<img src="${c.src}" alt="">`, $('cartes'));
    return { ...c, el: d, img: d.querySelector('img') };
  });
}

function preparerVilles() {
  const D = donnees();
  const fond = ['New York', 'Chicago', 'Houston', 'Atlanta', 'Denver', 'Seattle', 'Washington, D.C.', 'Phoenix', 'Dallas', 'New Orleans', 'Tampa', 'Orlando'];
  villes = D.villes.filter((v) => v.pays === 'USA' && fond.includes(v.nom)).map((v) => {
    const pas = ROUTE.passage(v.ll);
    return { ...v, passage: pas.distance < 0.05 && pas.p > 0.08 && pas.p < 0.92 ? pas.p : null };
  });
}

function preparerFx() {
  const fx = $('fx').getContext('2d');
  const g = fx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(3,8,20,0.55)');
  fx.fillStyle = g;
  fx.fillRect(0, 0, W, H);
}

// Grain de pellicule : un bruit différent à chaque image, reproductible (graine = numéro d'image).
function grain(f) {
  const c = $('grain'), g = c.getContext('2d'), img = g.createImageData(c.width, c.height), d = img.data;
  let s = (f * 2654435761) >>> 0;
  for (let i = 0; i < d.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = 128 + (((s >>> 24) - 128) * 0.55);
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- scènes

function titres(t) {
  for (const m of mots) {
    const e = ressort(t - m.t0, 210, 24), s = E.entree(prog(t, m.sortie, 0.24));
    const y = (1 - e) * 108 - s * 108;
    style(m.int, 'transform', `translate3d(0,${y.toFixed(2)}%,0)`);
    vis(m.int, t < m.t0 || s >= 1 ? 0 : 1);
  }
}

function accroche(t, P) {
  const box = $('accroche'), [haut, bas] = box.querySelectorAll('.panneau img');
  const a = E.traversee(prog(t, T.recul, 0.55));      // plein écran → carte
  const b = E.entree(prog(t, T.recul + 0.48, 0.3));   // carte → épingle
  if (b >= 1) { vis(box, 0); return; }
  const [mx, my] = P.ll(...LIEUX.miami);
  const w = lerp(W, 210, a) * (1 - b * 0.85), h = lerp(H, 262, a) * (1 - b * 0.85);
  const cx = lerp(W / 2, mx, a), cy = lerp(H / 2, my, a);
  style(box, 'width', `${w.toFixed(1)}px`);
  style(box, 'height', `${h.toFixed(1)}px`);
  style(box, 'transform', `translate3d(${(cx - w / 2).toFixed(2)}px,${(cy - h / 2).toFixed(2)}px,0)`);
  style(box, 'borderRadius', `${(a * 30).toFixed(1)}px`);
  vis(box, 1 - b);
  // Les deux panneaux bougent chacun à leur façon : poussée lente en haut, travelling en bas.
  const p = E.doux(prog(t, 0, T.recul + 0.4));
  style(haut, 'transform', `translate(-50%,-50%) scale(${(1.03 + 0.07 * p).toFixed(4)})`);
  style(bas, 'transform', `translate(${(-50 + 2.2 - 4.4 * p).toFixed(3)}%,-50%) scale(1.09)`);
  vis(box.querySelector('.voile-haut'), 1 - a);
}

function surgir(t, P) {
  const [mx, my] = P.ll(...LIEUX.miami);
  for (const c of cartes) {
    const d = t - (T.cartes + c.t);
    if (d <= 0) { vis(c.el, 0); continue; }
    const e = ressort(d, 170, 19), flotte = Math.sin((t - T.cartes) * 1.3 + c.r) * 5 * clamp(d / 1.2);
    const x = lerp(mx, c.x, e), y = lerp(my, c.y, e) + flotte, s = lerp(0.12, 1, e), r = lerp(0, c.r, e);
    style(c.el, 'transform', `translate3d(${(x - 145).toFixed(2)}px,${(y - 186).toFixed(2)}px,0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`);
    style(c.el, 'zIndex', c.t === 0.13 ? '3' : '1');
    vis(c.el, clamp(e * 4));
    style(c.img, 'transform', `scale(${(1.12 - 0.08 * clamp(d / 2.5)).toFixed(4)})`);
  }
}

// Les repères s'effacent en entrant dans la zone des titres (en haut de l'écran).
const horsTitres = (y) => clamp((y - 640) / 160);

// Repères de la carte : villes, Los Santos, trajet, Vice City.
function reperes(t, cam, P) {
  const largeur = cam.w / RAD, q = routeP(t);
  const fondu = clamp((largeur - 12) / 10) * clamp(prog(t, T.recul + 0.4, 0.6));
  for (const v of villes) {
    const [x, y, f] = P.ll(...v.ll);
    const zone = horsTitres(y);
    let a = 0.4 * fondu * zone, chaud = 0;
    if (v.passage !== null && t > T.route) {
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
  // Los Santos (Los Angeles) — on y arrive sur « Après Los Santos ».
  const [lx, ly, lf] = P.ll(...LIEUX.losAngeles);
  const eL = ressort(t - T.losSantos, 200, 20);
  if (t > T.losSantos) {
    epingle(ctx, lx, ly, { a: clamp(eL * 2), onde: prog(t, T.losSantos, 1.1), r: 7 });
    etiquetteLieu(ctx, lx, ly, 'LOS SANTOS', 'LOS ANGELES · GTA V · 2013', { e: eL, taille: 62 * clamp(lf, 0.85, 1.2), a: (1 - 0.7 * clamp((q - 0.25) / 0.3)) * horsTitres(ly) });
  }
  // Le trajet, dessiné pendant « Rockstar nous ramène à Vice City ».
  if (t > T.route) dessinerTrajet(ctx, P, ROUTE, q, { tete: 1 - prog(t, T.arrivee + 0.2, 0.6) });
  // Miami : l'épingle naît de la photo, puis l'arrivée fait « Vice City ».
  const [mx, my, mf] = P.ll(...LIEUX.miami);
  if (t > T.recul + 0.5) {
    const arrive = t > T.arrivee ? prog(t, T.arrivee, 1.2) : -1;
    epingle(ctx, mx, my, { a: tw(t, T.recul + 0.5, 0.3), onde: arrive >= 0 ? arrive : prog(t, T.recul + 0.5, 1), r: 8 + 3 * ressort(t - T.arrivee, 260, 14) * (t > T.arrivee), halo: 1 + (t > T.arrivee) });
  }
  if (t > T.arrivee) {
    const eV = ressort(t - T.arrivee, 230, 19);
    etiquetteLieu(ctx, mx, my, 'VICE CITY', 'MIAMI · GTA VI · 19.11.2026', { e: eV, taille: 80 * clamp(mf, 0.85, 1.25), a: 1 - 0.85 * tw(t, T.cartes - 0.1, 0.4) });
  }
}

// Légende en bas à gauche : lieu de la photo, puis coordonnées et échelle en direct.
function legende(t, cam) {
  const L = $('legende');
  let html, a;
  if (t < T.recul) {
    html = 'KASEYA CENTER · MIAMI, FL\n<small>SEPT. 2026 · PHOTO CREAPILLS</small>';
    a = tw(t, 0.5, 0.5) * (1 - prog(t, T.recul - 0.2, 0.2));
  } else if (t < T.cartes) {
    const [lon, lat] = enLonLat(cam.x, cam.y);
    const kmPx = (6371 * Math.cos(lat * RAD)) / (W / cam.w);
    const pas = [1, 2, 5, 10, 20, 50, 100, 200, 300, 500, 1000].find((d) => d / kmPx >= 90) || 1000;
    html = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(4)}° ${lon < 0 ? 'O' : 'E'}\n`
      + `<small><span style="display:inline-block;width:${(pas / kmPx).toFixed(0)}px;height:9px;border:2px solid currentColor;border-top:0;vertical-align:middle;margin-right:12px"></span>${pas} KM</small>`;
    a = tw(t, T.recul + 0.3, 0.4) * (1 - prog(t, T.cartes - 0.25, 0.2));
  } else {
    html = 'MIAMI, FL · OCT. 2026\n<small>PHOTOS CREAPILLS</small>';
    a = tw(t, T.cartes + 0.4, 0.4);
  }
  if (L.innerHTML !== html) L.innerHTML = html;
  style(L, 'top', t < T.recul ? '690px' : '1262px'); // pendant l'accroche : sous le titre, sur le voile
  vis(L, a);
}

function dessiner(t) {
  const cam = camera(t);
  const P = dessinerCarte(ctx, cam, { a: t < T.recul - 0.05 ? 0 : 1, lueurZones: tw(t, T.arrivee, 0.6) });
  if (t >= T.recul - 0.05) reperes(t, cam, P);
  accroche(t, P);
  surgir(t, P);
  titres(t);
  legende(t, cam);
  // L'onglet glisse depuis le bord gauche, avec un léger rebond.
  const o = ressort(t - 0.08, 170, 17);
  style($('dossier'), 'transform', `translate3d(${((o - 1) * 100).toFixed(2)}px,0,0)`);
  grain(Math.round(t * FPS));
}

// ---------------------------------------------------------------- bande-son

function partition() {
  const ev = [];
  const add = (t, type, gain = 1, extra = {}) => ev.push({ t: +t.toFixed(3), type, gain, ...extra });
  add(0, 'voix', 1, { fichier: 'medias/voix-accroche.mp3', decalage: VOIX });
  add(0, 'nappe', 0.5, { duree: DUREE });
  add(0.4, 'clic', 0.35); add(2.95, 'clic', 0.35);
  add(T.recul - 0.05, 'rembobinage', 0.8, { duree: 1.1 }); // retour en arrière vers Los Santos
  add(T.recul, 'whoosh', 0.4, { duree: 1.25 });
  add(T.recul + 0.48, 'ping', 0.45);
  add(T.losSantos, 'tic', 0.5);
  add(T.route, 'montee', 0.42, { duree: T.routeD });
  for (const v of villes) if (v.passage !== null) add(T.route + T.routeD * invDoux(v.passage), 'tic', 0.25);
  add(T.arrivee, 'impact', 0.7);
  add(T.arrivee, 'ping', 0.4);
  for (const c of cartes) add(T.cartes + c.t, 'clic', 0.45);
  add(9.9, 'scintille', 0.3);
  return ev;
}
function invDoux(p) { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (E.doux(m) < p) lo = m; else hi = m; } return lo; }

// ---------------------------------------------------------------- démarrage

async function demarrer() {
  ctx = $('carte').getContext('2d');
  document.body.classList.add(location.search.includes('typo=b') ? 'typo-b' : 'typo-a');
  construireTitres();
  construireCartes();
  preparerFx();
  await Promise.all([
    chargerCarte(),
    document.fonts.load('900 100px "Archivo"'), document.fonts.load('italic 120px "Instrument Serif"'), document.fonts.load('500 22px "JetBrains Mono"'),
    ...[...document.images].map((i) => i.decode().catch(() => {})),
  ]);
  preparerVilles();
  ajusterLignes();
  window.__render = (t) => { dessiner(t); return document.fonts.ready.then(() => true); };
  window.__sous = (t) => ((t > T.recul && t < T.reculFin + 0.15) || (t > T.route && t < T.arrivee + 0.25) || (t > T.cartes && t < T.cartes + 0.8) ? 3 : 1);
  window.__sons = partition();
  window.__duree = DUREE;
  window.__ready = true;
  if (!location.search.includes('render')) {
    const t0 = performance.now();
    const boucle = () => { dessiner(((performance.now() - t0) / 1000) % DUREE); requestAnimationFrame(boucle); };
    requestAnimationFrame(boucle);
  }
}
demarrer();
