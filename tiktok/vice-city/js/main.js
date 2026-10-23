// Dossier Nº02 — la carte de GTA VI. Chaque image est une fonction pure du temps : __render(t).
// Une carte (YANIS V17, communauté GTA mapping) posée dans l'espace ; la caméra la survole.
// Tout se cale sur la voix (partition.js) : aucun instant en dur.
import { clamp, lerp, prog, tw, E, ressort, style, vis, el, $, hash } from './outils.js';
import { calculer } from './partition.js';
import { creerOutro } from './outro.js';

const params = new URLSearchParams(location.search);
const MAP_W = 3760, MAP_H = 5120, PERSP = 1500;
let T, P = [], R = {}, ctxP, ctxM, O;

// Coordonnées du jeu (gtadb) → pixels de notre carte (zoom 3, tuiles à partir de 5).
const versCarte = (x, y) => [(x + 16384) / 4 - 1280, (16384 - y) / 4 - 1280];
const versJeu = (px, py) => [(px + 1280) * 4 - 16384, 16384 - (py + 1280) * 4];

// ------------------------------------------------------------------ caméra

const VUES = {
  depart: { x: 2880, y: 2610, s: 1.15, tilt: 38 },
  tout: { x: 1880, y: 2620, s: 0.3, tilt: 0 },
  cote: { x: 3200, y: 2580, s: 0.185, tilt: 0 },
  regions: { x: 1900, y: 2700, s: 0.31, tilt: 22 },
  vc: { x: 2930, y: 2560, s: 0.95, tilt: 46 },
  fin: { x: 1880, y: 2700, s: 0.27, tilt: 30 },
};
let mouvements = [];
function camera(t) {
  let c = { ...VUES.depart };
  for (const m of mouvements) {
    const p = E.traversee(prog(t, m.t, m.d));
    if (p <= 0) break;
    for (const k of ['x', 'y', 's', 'tilt']) c[k] = k === 's' ? Math.exp(lerp(Math.log(c.s), Math.log(m.v.s), p)) : lerp(c[k], m.v[k], p);
  }
  return c;
}
// Projection d'un point de la carte à l'écran (même calcul que le CSS : scale, rotateX, perspective).
function projeter(c, X, Y) {
  const a = (c.tilt * Math.PI) / 180;
  const x = (X - c.x) * c.s, y = (Y - c.y) * c.s;
  const y2 = y * Math.cos(a), z2 = y * Math.sin(a);
  const f = PERSP / (PERSP - z2);
  return [540 + x * f, 960 + y2 * f, f];
}

// ------------------------------------------------------------------ titres

function creerBloc(spec) {
  const b = el('div', 'bloc', undefined, $('titres'));
  const lignes = spec.lignes.map(([texte, t, genre = 'grand']) => {
    const l = el('span', `ligne t-${genre}`, undefined, b);
    return { s: el('span', '', texte, l), t };
  });
  return { b, lignes, sortie: spec.sortie };
}
function dessinerBloc(B, t) {
  const v = t >= B.lignes[0].t - 0.05 && t < B.sortie + 0.6;
  vis(B.b, v ? 1 : 0);
  if (!v) return;
  B.lignes.forEach((l, i) => {
    const e = tw(t, l.t, 0.7), s = E.entree(prog(t, B.sortie + i * 0.04, 0.45));
    style(l.s, 'transform', `translate3d(0,${(105 * (1 - e) - 105 * s).toFixed(2)}%,0)`);
  });
}

// ------------------------------------------------------------------ préparation

let tuiles = [], blocs = [], noms = [], comps = [], vids = [], rubans = [];
const centre = (liste) => liste.length ? [liste.reduce((a, p) => a + p.X, 0) / liste.length, liste.reduce((a, p) => a + p.Y, 0) / liste.length] : [0, 0];

function preparer(lm) {
  const m = T.mot, L = (id) => T.ligne(id);
  // Les 3 346 lieux de gtadb, avec leur zone et leurs étiquettes.
  for (const [id, v] of Object.entries(lm)) {
    const [X, Y] = versCarte(v[1][0], v[1][1]);
    if (!Number.isFinite(X + Y) || X < 0 || Y < 0 || X > MAP_W || Y > MAP_H) continue;
    const parts = v[0].split(', ');
    P.push({ id, X, Y, zone: parts[parts.length - 1], quartier: parts[parts.length - 2] || '', tags: v[6], h: hash(+id.slice(1)) });
  }
  const par = (f) => P.filter(f);
  const vc = par((p) => p.zone === 'Vice City' || p.zone === 'Vice Beach');
  const [vx, vy] = centre(vc);
  vc.forEach((p) => { p.dvc = Math.hypot(p.X - vx, p.Y - vy); });
  const lieu = (id) => P.find((p) => p.id === id);

  R = {
    vc, lieu,
    regions: [
      ['Vice City', 'Miami', [2880, 2610], m('s4', 'vice')],
      ['Leonida Keys', 'Florida Keys', [1740, 4440], m('s4', 'leonida')],
      ['Grassrivers', 'Everglades', [1920, 3660], m('s4', 'grassrivers')],
      ['Port Gellhorn', 'Côte du golfe', centre(par((p) => p.zone === 'Port Gellhorn')), m('s4', 'port')],
      ['Ambrosia', 'Raffinerie de sucre', centre(par((p) => p.zone === 'Ambrosia')), m('s4', 'ambrosia')],
      ['Mount Kalaga', 'Parc national', [1590, 1290], m('s4', 'kalaga')],
    ],
    quartiers: ['Ocean Beach', 'Little Cuba', 'Downtown', 'Washington Beach', 'Tequesta', 'Rockridge'].map((q) => [q, centre(par((p) => p.quartier === q))]),
    comtes: ['Lummox County', 'Kelly County', 'Leonard County', 'Vice-Dale County', 'Mariana County'].map((q) => [q, centre(par((p) => p.zone === q || p.quartier === q))]),
  };

  // Mouvements de caméra, tous tirés de la voix.
  const pin = (id, s, tilt) => { const p = lieu(id); return { x: p.X, y: p.Y + 60, s, tilt }; };
  mouvements = [
    { t: 0.7, d: 4.2, v: VUES.tout },
    { t: L('s3').debut - 0.3, d: 1.3, v: VUES.cote },
    { t: L('s4').debut - 0.4, d: 1.1, v: VUES.regions },
    { t: L('s5').debut - 0.5, d: 1.5, v: VUES.vc },
    { t: L('s6').debut - 0.7, d: 1.0, v: pin('L36', 1.7, 50) },
    { t: L('s7').debut - 0.7, d: 1.0, v: pin('L437', 1.7, 50) },
    { t: L('s7b').debut - 0.6, d: 0.9, v: pin('L556', 1.7, 50) },
    { t: L('s8').debut - 0.6, d: 1.6, v: pin('L447', 1.0, 40) },
    { t: L('s9').debut - 0.5, d: 1.6, v: { ...VUES.tout, tilt: 12 } },
    { t: L('s12').debut - 0.5, d: 2.2, v: VUES.fin },
  ];

  // L'accroche : la carte se reconstruit tuile par tuile, en partant de Vice City.
  const box = $('tuiles');
  for (let r = 0; r < 20; r++) for (let c = 0; c < 15; c++) {
    const d = el('div', 'tuile', undefined, box);
    style(d, 'left', `${c * 256}px`); style(d, 'top', `${r * 256}px`);
    style(d, 'backgroundPosition', `${-c * 256}px ${-r * 256}px`);
    const dist = Math.hypot(c * 256 + 128 - 2880, r * 256 + 128 - 2610);
    tuiles.push({ d, retard: dist / 5200 * 3.4 + hash(r * 15 + c) * 0.3 });
  }
  // Les tuiles arrivent pendant que la caméra recule : on voit la carte se construire.
  R.assemblage = 0.1;
  const bord = el('div', '', undefined, $('monde'));
  Object.assign(bord.style, { position: 'absolute', left: '0', top: '0', width: `${MAP_W}px`, height: `${MAP_H}px`, background: 'radial-gradient(closest-side at 50% 50%, transparent 72%, #071226 100%)', pointerEvents: 'none' });
  $('monde').insertBefore(bord, $('gta5'));
  // Détail de Vice City (zoom 4) par-dessus la carte, visible quand on s'approche.
  R.detail = el('img', '', undefined, $('monde'));
  R.detail.src = 'medias/vicecity-z4.jpg';
  Object.assign(R.detail.style, { position: 'absolute', left: '1792px', top: '1536px', width: '1920px', height: '2048px' });
  $('monde').insertBefore(R.detail, $('gta5'));

  // Étiquettes posées sur la carte (régions, quartiers, comtés).
  const etiquette = (nom, sous, X, Y, taille, cls = '') => {
    const e = el('div', `rep ${cls}`, `<div class="rep-nom">${nom}</div>${sous ? `<div class="rep-sous">${sous}</div>` : ''}`, $('reperes'));
    style(e, 'fontSize', `${taille}px`);
    return { e, X, Y };
  };
  R.etqRegions = R.regions.map(([n, s, [X, Y], t]) => ({ ...etiquette(n, s, X, Y, 150), t }));
  R.etqQuartiers = R.quartiers.map(([n, [X, Y]], i) => ({ ...etiquette(n, '', X, Y, 60), t: L('s5').debut + 0.6 + i * 0.22 }));
  R.etqComtes = R.comtes.map(([n, [X, Y]], i) => ({ ...etiquette(n.replace(' County', ''), 'county · leak', X, Y, 130, 'flou'), t: m('s11', 'comtés') + i * 0.18 }));

  // Comparaisons jeu / vraie vie.
  const comp = (id, jeu, reel, quand, fin) => {
    const c = el('div', 'comp', `<div class="comp-cadre"><img src="medias/photos/${id}-ig.jpg" alt=""><div class="comp-reel"><img src="medias/photos/${id}-rl.jpg" alt=""></div>
      <div class="comp-trait"></div><div class="comp-etq jeu">EN JEU</div><div class="comp-etq reel">VRAIE VIE</div></div>
      <div class="comp-bas"><div>${jeu[0]}<small>${jeu[1]}</small></div><div>${reel[0]}<small>${reel[1]}</small></div></div>`, $('cartes'));
    comps.push({ c, id, quand, fin, reel: c.querySelector('.comp-reel'), trait: c.querySelector('.comp-trait') });
  };
  comp('L36', ['Ocean View Hotel', 'Ocean Beach · Vice City'], ['The Clevelander', 'Ocean Drive · Miami Beach'], L('s6').debut, L('s7').debut - 0.45);
  comp('L437', ['Palaestra Tower', 'Bayside · Vice City'], ['Carnival Tower', 'Biscayne Blvd · Miami'], L('s7').debut, L('s7b').debut - 0.45);
  comp('L556', ['The Vault', 'Downtown · Vice City'], ['Club Space', 'Downtown · Miami'], L('s7b').debut, L('s8').debut - 0.5);
  comp('L447', ['Station sous-marine', 'Leonida Keys'], ['Aquarius Reef Base', 'Key Largo · Floride'], m('s8', 'station'), L('s9').debut - 0.5);

  // Les fuites de 2022 : 90 vidéos, floutées, jamais nettes.
  for (let i = 0; i < 90; i++) {
    const v = el('div', 'vid', '<i></i>', $('fuites'));
    vids.push({ v, x: 63 + (i % 9) * 106, y: 640 + Math.floor(i / 9) * 64 });
  }
  rubans = [
    { e: el('div', 'ruban', 'LEAK · SEPTEMBRE 2022 · IMAGES FLOUTÉES · LEAK · SEPTEMBRE 2022', $('fuites')), de: L('s10').debut + 0.2, a: L('s11').debut - 0.2, rot: -5, y: 560 },
    { e: el('div', 'ruban', 'LEAK · CARTE DE TRAVAIL · NON CONFIRMÉE · LEAK · AOÛT 2026', $('fuites')), de: L('s11').debut, a: L('s12').debut - 0.3, rot: 4, y: 1210 },
  ];

  // Titres, un bloc par phrase ; chaque bloc sort 0,5 s avant le suivant.
  const B = [
    { lignes: [['Moins d’un mois avant GTA VI', m('s1', 'moins'), 'sur'], ['La carte est', m('s1', 'fans')], ['déjà reconstruite.', m('s1', 'reconstruit'), 'serif']] },
    { lignes: [['Ce qu’on sait', m('s2', 'voilà')], ['vraiment.', m('s2', 'vraiment'), 'serif']] },
    { lignes: [['Rockstar · Game Informer', L('s3').debut, 'sur'], ['Leonida =', m('s3', 'leonida')], ['2 × GTA V', m('s3', 'deux'), 'serif']] },
    { lignes: [['Six régions', m('s4', 'six')], ['officielles.', m('s4', 'six') + 0.25, 'serif']] },
    { lignes: [['Vice City', m('s5', 'vice')], ['= Miami.', m('s5', 'miami'), 'serif']] },
    { lignes: [['Repéré par les fans', L('s6').debut, 'sur']] },
    { lignes: [['Sous l’eau', m('s8', 'sous')], ['des Keys.', m('s8', 'keys'), 'serif']] },
    { lignes: [['Au total', L('s9').debut, 'sur'], ['Image par', m('s9', 'image')], ['image.', m('s9', 'image', 2), 'serif']] },
    { lignes: [['Les fuites', m('s10', 'fuites')], ['de 2022.', m('s10', 'deux'), 'serif']] },
    { lignes: [['Carte de travail', m('s11', 'carte')], ['jamais confirmée.', m('s11', 'jamais'), 'serif']] },
    { lignes: [['Rendez-vous le', m('s12', 'vraie')], ['19.11.2026', m('s12', 'dix-neuf'), 'serif'], ['Et toi, tu vas où en premier ?', m('s12', 'toi'), 'sur']] },
  ];
  B.forEach((b, i) => { b.sortie = i < B.length - 1 ? B[i + 1].lignes[0][1] - 0.5 : L('s12').fin + 0.3; });
  B[5].sortie = L('s8').debut - 0.4;
  blocs = B.map(creerBloc);

  // Pastille de source, selon le passage.
  R.sources = [
    [0, 'communaute', 'COMMUNAUTÉ · CARTE RECONSTRUITE PAR LES FANS'],
    [L('s3').debut, 'officiel', 'OFFICIEL · ROCKSTAR (GAME INFORMER, SEPT. 2026)'],
    [L('s4').debut, 'officiel', 'OFFICIEL · SITE DE ROCKSTAR'],
    [L('s5').debut, 'communaute', 'COMMUNAUTÉ · REPÉRÉ DANS LES IMAGES OFFICIELLES'],
    [L('s10').debut, 'leak', 'LEAK · FUITE DE 2022 · IMAGES FLOUTÉES'],
    [L('s11').debut, 'leak', 'LEAK · CARTE NON CONFIRMÉE (AOÛT 2026)'],
    [L('s12').debut, 'officiel', 'OFFICIEL · SORTIE LE 19.11.2026'],
  ];
}

// ------------------------------------------------------------------ dessin

function dessiner(t) {
  const m = T.mot, L = (id) => T.ligne(id);
  const c = camera(t);
  style($('monde'), 'transform', `rotateX(${c.tilt.toFixed(3)}deg) scale(${c.s.toFixed(5)}) translate3d(${(-c.x).toFixed(2)}px,${(-c.y).toFixed(2)}px,0)`);

  // Assemblage : chaque tuile tombe du ciel en pivotant, en cascade depuis Vice City.
  for (const u of tuiles) {
    const p = tw(t, R.assemblage + u.retard, 0.8);
    if (p >= 1) { if (u.d.dataset.pose !== '1') { style(u.d, 'transform', 'none'); vis(u.d, 1); u.d.dataset.pose = '1'; } continue; }
    u.d.dataset.pose = '';
    vis(u.d, clamp(p * 3));
    style(u.d, 'transform', `translate3d(0,0,${(900 * (1 - p)).toFixed(1)}px) rotateX(${(-75 * (1 - p)).toFixed(2)}deg)`);
  }
  vis(R.detail, clamp((c.s - 0.55) / 0.3));

  // GTA V à la même échelle : arrive à droite, puis glisse sur Leonida pour comparer.
  const g = tw(t, L('s3').debut, 1.0), sur = E.traversee(prog(t, m('s3', 'deux') - 0.1, 1.3));
  const gOut = 1 - prog(t, L('s4').debut - 0.3, 0.5);
  vis($('gta5'), g * gOut * lerp(1, 0.82, sur));
  style($('gta5'), 'transform', `translate3d(${lerp(3600, 1150, sur).toFixed(1)}px,${lerp(900, 950, sur).toFixed(1)}px,0)`);

  // Points : Vice City d'abord (vague depuis le centre), puis tous les lieux.
  dessinerPoints(t, c);

  // Étiquettes posées sur la carte (elles restent lisibles : taille compensée par le zoom).
  const poser = (q, a, k) => {
    vis(q.e, a);
    if (a > 0) style(q.e, 'transform', `translate3d(${q.X.toFixed(1)}px,${q.Y.toFixed(1)}px,0) scale(${(k / c.s).toFixed(4)}) translate(-50%,-50%)`);
  };
  const finR = L('s5').debut;
  R.etqRegions.forEach((q) => poser(q, tw(t, q.t - 0.1, 0.5) * (1 - prog(t, finR, 0.4)), 0.3));
  R.etqQuartiers.forEach((q) => poser(q, tw(t, q.t, 0.5) * (1 - prog(t, L('s6').debut - 0.6, 0.4)), 0.9));
  R.etqComtes.forEach((q) => {
    const a = tw(t, q.t, 0.6) * (1 - prog(t, L('s12').debut - 0.3, 0.4));
    poser(q, a, 0.3);
    // Flou de la fuite : net seulement à moitié, jamais tout à fait.
    style(q.e, 'filter', a > 0 ? `blur(${(lerp(26, 7, tw(t, q.t, 1.4))).toFixed(1)}px)` : 'none');
    q.e.classList.toggle('vise', q.e.textContent.startsWith('Vice-Dale') && t > m('s11', 'miami-dade') - 0.2);
  });

  // Masque : projecteur sur la région citée ; voile sous les comparaisons et les fuites.
  dessinerMasque(t, c);
  dessinerComps(t, c);
  dessinerFuites(t);
  // L'outro passe par-dessus tout ; la pastille et les coordonnées s'effacent.
  const ao = O.dessiner(t);

  for (const b of blocs) dessinerBloc(b, t);
  // Compteur des lieux (passage « image par image »).
  const cg = tw(t, L('s9').debut + 0.2, 0.6) * (1 - prog(t, L('s10').debut - 0.4, 0.4));
  vis($('grand'), cg);
  if (cg > 0) $('grand').innerHTML = `${Math.round(3346 * E.sortie(prog(t, L('s9').debut + 0.3, 2.2))).toLocaleString('fr-FR').replace(/\s/g, ' ')}<small>lieux répertoriés · gtadb</small>`;

  // Habillage : pastille de source, coordonnées en direct, onglet.
  let src = R.sources[0];
  for (const s of R.sources) if (t >= s[0]) src = s;
  if ($('source').className !== src[1]) { $('source').className = src[1]; $('source').textContent = src[2]; }
  const [gx, gy] = versJeu(c.x, c.y);
  $('coord').textContent = `X ${gx.toFixed(0).padStart(6)}   Y ${gy.toFixed(0).padStart(6)}   ZOOM ${(c.s / 0.3).toFixed(2)}×   INCL. ${c.tilt.toFixed(0)}°`;
  style($('onglet'), 'transform', `translate3d(${(-80 * (1 - ressort(t - 0.2, 170, 20))).toFixed(1)}px,0,0)`);
  // Pendant les comparaisons, la pastille et les coordonnées s'effacent (place aux légendes).
  const enComp = Math.max(...comps.map((k) => tw(t, k.quand, 0.4) * (1 - prog(t, k.fin, 0.4))));
  vis($('source'), (1 - enComp) * (1 - ao)); vis($('coord'), (1 - enComp) * (1 - ao)); vis($('credit'), (1 - enComp * 0.6) * (1 - ao));
}

function dessinerPoints(t, c) {
  const L = (id) => T.ligne(id);
  const ctx = ctxP;
  ctx.clearRect(0, 0, 1880, 2560);
  const r = Math.max(1.6, 2.6 / c.s);                       // ≈ 5 px à l'écran
  const tVC = L('s5').debut + 0.1, tTout = L('s9').debut + 0.2, tFuite = L('s10').debut - 0.2;
  const extinction = 1 - prog(t, tFuite, 0.6) * 0.85;
  if (t < tVC) return;
  for (const p of P) {
    let a;
    if (p.dvc !== undefined) a = tw(t, tVC + p.dvc / 1400, 0.4);
    else a = tw(t, tTout + p.h * 1.6, 0.4);
    a *= extinction;
    if (a <= 0.01) continue;
    const ent = p.tags.includes('enterable'), nc = p.tags.includes('unconfirmed');
    ctx.globalAlpha = a;
    ctx.fillStyle = nc ? '#9DB0CF' : ent ? '#3FD28B' : '#F6E7A8';
    ctx.beginPath(); ctx.arc(p.X / 2, p.Y / 2, r * (1 + 0.8 * (1 - clamp(a * 1.4))), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Épingle du lieu comparé : anneaux qui pulsent.
  for (const k of comps) {
    const a = tw(t, k.quand - 0.9, 0.4) * (1 - prog(t, k.fin + 0.3, 0.4));
    if (a <= 0) continue;
    const p = R.lieu(k.id);
    for (let i = 0; i < 2; i++) {
      const o = ((((t - k.quand) * 0.8 + i * 0.5) % 1) + 1) % 1;   // modulo toujours positif (avant l'apparition aussi)
      ctx.globalAlpha = a * (1 - o);
      ctx.strokeStyle = '#F23A55'; ctx.lineWidth = 2 / c.s;
      ctx.beginPath(); ctx.arc(p.X / 2, p.Y / 2, (6 + 40 * o) / c.s, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = a; ctx.fillStyle = '#F23A55';
    ctx.beginPath(); ctx.arc(p.X / 2, p.Y / 2, 5 / c.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function dessinerMasque(t, c) {
  const L = (id) => T.ligne(id);
  const ctx = ctxM;
  ctx.clearRect(0, 0, 540, 960);
  // Projecteur : la région citée reste claire, le reste s'assombrit.
  const actif = R.regions.reduce((a, r, i) => (t >= r[3] - 0.15 ? i : a), -1);
  const spot = tw(t, L('s4').debut + 0.2, 0.5) * (1 - prog(t, L('s5').debut - 0.2, 0.5));
  const voileComp = Math.max(...comps.map((k) => tw(t, k.quand - 0.1, 0.5) * (1 - prog(t, k.fin, 0.4))));
  const voileFuite = tw(t, L('s10').debut - 0.2, 0.6) * (1 - tw(t, L('s11').debut + 0.2, 0.8) * 0.45) * (1 - prog(t, L('s12').debut - 0.3, 0.6));
  const a = Math.max(spot * 0.62, voileComp * 0.55, voileFuite * 0.8);
  if (a <= 0.005) return;
  ctx.fillStyle = `rgba(7,18,38,${a.toFixed(3)})`;
  ctx.fillRect(0, 0, 540, 960);
  if (spot > 0 && actif >= 0) {
    // Le trou glisse d'une région à l'autre.
    const prec = R.regions[Math.max(0, actif - 1)], cur = R.regions[actif];
    const q = E.traversee(prog(t, cur[3] - 0.15, 0.4));
    const [x0, y0] = projeter(c, ...prec[2]), [x1, y1] = projeter(c, ...cur[2]);
    const x = lerp(x0, x1, actif ? q : 1) / 2, y = lerp(y0, y1, actif ? q : 1) / 2;
    const g = ctx.createRadialGradient(x, y, 20, x, y, 150);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = spot; ctx.fillStyle = g; ctx.fillRect(0, 0, 540, 960);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}

function dessinerComps(t, c) {
  for (const k of comps) {
    const ouv = ressort(t - k.quand, 150, 19), ferm = E.entree(prog(t, k.fin, 0.45));
    const a = (t >= k.quand ? 1 : 0) * (1 - ferm);
    vis(k.c, a);
    if (a <= 0) continue;
    // La carte se déplie depuis l'épingle (en bas, au centre de l'écran) vers sa place.
    const p = clamp(ouv);
    const y = lerp(960, 560, ouv) - 300 * ferm;
    style(k.c, 'transform', `translate3d(0,${y.toFixed(1)}px,0) rotateX(${(75 * (1 - p) + 60 * ferm).toFixed(2)}deg) scale(${lerp(0.25, 1, p).toFixed(4)})`);
    // Le volet balaie : tout jeu → tout réel → moitié-moitié, comme un curseur de comparaison.
    const v = prog(t, k.quand + 0.6, Math.max(1.2, k.fin - k.quand - 1));
    const w = v < 0.45 ? lerp(100, 8, E.traversee(v / 0.45)) : lerp(8, 50, E.traversee((v - 0.45) / 0.55));
    style(k.reel, 'clipPath', `inset(0 0 0 ${w.toFixed(2)}%)`);
    style(k.trait, 'left', `${w.toFixed(2)}%`);
    vis(k.trait, w < 99.5 ? 1 : 0);
  }
}

function dessinerFuites(t) {
  const L = (id) => T.ligne(id), m = T.mot;
  const t0 = m('s10', 'quatre-vingt-dix') - 0.6, t1 = L('s11').debut - 0.1;
  vids.forEach((v, i) => {
    const a = tw(t, t0 + i * 0.018, 0.45) * (1 - E.entree(prog(t, t1 + (89 - i) * 0.006, 0.5)));
    vis(v.v, a);
    if (a > 0) style(v.v, 'transform', `translate3d(${v.x}px,${(v.y + 30 * (1 - a)).toFixed(1)}px,0) scale(${(0.6 + 0.4 * a).toFixed(3)})`);
  });
  for (const r of rubans) {
    const a = tw(t, r.de, 0.6) * (1 - prog(t, r.a, 0.4));
    vis(r.e, a);
    if (a > 0) style(r.e, 'transform', `translate3d(${(-400 * (1 - a) + ((t - r.de) * -40)).toFixed(1)}px,${r.y}px,0) rotate(${r.rot}deg)`);
  }
}

// ------------------------------------------------------------------ démarrage

async function demarrer() {
  let voix = {};
  try { const r = await fetch('medias/voix.json'); if (r.ok) voix = await r.json(); } catch (_) { /* voix estimée */ }
  T = calculer(voix.durees || {}, voix.mots || {});
  const lm = await (await fetch('medias/landmarks.json')).json();
  ctxP = $('points').getContext('2d');
  ctxM = $('masque').getContext('2d');
  preparer(lm);
  O = creerOutro(T);
  await Promise.all([
    document.fonts.load('800 100px "Archivo"'), document.fonts.load('italic 120px "Instrument Serif"'), document.fonts.load('500 22px "JetBrains Mono"'),
    ...[...document.images].map((i) => i.decode().catch(() => {})),
    new Promise((ok) => { const i = new Image(); i.onload = ok; i.onerror = ok; i.src = 'medias/leonida.jpg'; }),
  ]);
  window.__render = (t) => { dessiner(t); return document.fonts.ready.then(() => true); };
  window.__sous = (t) => (mouvements.some((mv) => t > mv.t && t < mv.t + mv.d) || (t > R.assemblage && t < R.assemblage + 4.4) || O.enMouvement(t) ? 3 : 1);
  window.__duree = T.duree;
  window.__sons = Object.entries(voix.fichiers || {}).map(([id, f]) => ({ t: T.ligne(id).debut, type: 'voix', gain: 1, fichier: f.fichier, decalage: f.decalage }));
  window.__ready = true;
  if (!params.has('render')) {
    const t0 = performance.now(), depart = +(params.get('t') || 0);
    const boucle = () => { dessiner(depart + ((performance.now() - t0) / 1000) % T.duree); requestAnimationFrame(boucle); };
    boucle();
  }
}
demarrer();
