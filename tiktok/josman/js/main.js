// Dossier Nº02 — Josman. Chaque image est une fonction pure du temps : window.__render(t).
// Pour l'instant : l'accroche (le luxe d'aujourd'hui, puis « il dormait parfois dehors »).
import { C, clamp, lerp, prog, tw, E, ressort, style, vis, el, $ } from './outils.js';
import { calculer } from './partition.js';
import { creerFrise } from './frise.js';

const params = new URLSearchParams(location.search);
let T;

// ------------------------------------------------------------------ titres

// Un bloc = des lignes qui montent de leur masque, chacune quand la voix la dit, puis sortent
// ensemble par le haut. genre : 'grand' (Archivo), 'serif' (le mot qui compte, en or), 'sur' (surtitre).
function creerBloc(spec) {
  const b = el('div', 'bloc', undefined, $('titres'));
  const lignes = spec.lignes.map(([texte, t, genre = 'grand']) => {
    const l = el('span', `ligne t-${genre}`, undefined, b);
    return { s: el('span', '', texte, l), t };
  });
  return { b, lignes, sortie: spec.sortie };
}
function dessinerBloc(B, t) {
  const visible = t >= B.lignes[0].t - 0.05 && t < B.sortie + 0.6;
  vis(B.b, visible ? 1 : 0);
  if (!visible) return;
  B.lignes.forEach((l, i) => {
    const entree = tw(t, l.t, 0.75);
    const sortie = E.entree(prog(t, B.sortie + i * 0.04, 0.45));
    style(l.s, 'transform', `translate3d(0,${(105 * (1 - entree) - 105 * sortie).toFixed(2)}%,0)`);
  });
}

// ------------------------------------------------------------------ compteur (odomètre)

const MONTANT = 2759975;
let colonnes = [];
function creerCompteur() {
  const c = $('compteur');
  const txt = MONTANT.toLocaleString('fr-FR').replace(/\s/g, ' ');
  let rang = String(MONTANT).length - 1;
  for (const ch of txt) {
    if (ch === ' ') { el('span', 'espace', undefined, c); continue; }
    const col = el('span', 'chiffre', undefined, c);
    const pile = el('span', '', '0123456789 0'.replace(' ', '').split('').map((d) => `<i style="font-style:normal">${d}</i>`).join(''), col);
    colonnes.push({ pile, rang: rang-- });
  }
  el('span', 'devise', '$', c);
}
function dessinerCompteur(t, t0, t1, sortie) {
  const c = $('compteur');
  const p = E.sortie(prog(t, t0, t1 - t0));
  const v = MONTANT * p;
  const a = tw(t, t0 - 0.1, 0.5) * (1 - E.entree(prog(t, sortie, 0.45)));
  vis(c, a);
  if (a <= 0) return;
  style(c, 'transform', `translate3d(0,${(40 * (1 - tw(t, t0 - 0.1, 0.7))).toFixed(1)}px,0)`);
  for (const col of colonnes) {
    // Compteur mécanique : un chiffre ne tourne que pendant la dernière unité avant sa retenue
    // (les rangs inférieurs à 9…9), sinon il resterait entre deux chiffres à l'arrivée.
    const u = 10 ** col.rang, r = v / u;
    const pos = (Math.floor(r) % 10) + (col.rang ? E.doux(clamp((v % u) - (u - 1))) : r - Math.floor(r));
    style(col.pile, 'transform', `translate3d(0,${(-pos * 190).toFixed(1)}px,0)`);
    // Pas de zéro en tête : le chiffre de tête n'apparaît qu'une fois atteint.
    vis(col.pile, col.rang && v < u * 0.98 ? clamp((v - u * 0.9) / (u * 0.08)) : 1);
  }
}

// ------------------------------------------------------------------ objets

function poser(e, { x, y, w, h, z = 0, ry = 0, rx = 0, rz = 0, s = 1, a = 1 }) {
  vis(e, a);
  if (a <= 0) return;
  style(e, 'transform', `translate3d(${(x - w / 2).toFixed(1)}px,${(y - h).toFixed(1)}px,${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`);
}

function etiquette(texte) { return el('div', 'etiquette', texte, $('etiquettes')); }

// Les instants clés, tous tirés de la voix.
function reperes() {
  const a1 = T.ligne('a1'), a2 = T.ligne('a2'), a3 = T.ligne('a3'), a4 = T.ligne('a4');
  return {
    a1, a2, a3, a4,
    B: a2.debut - 0.35,                     // travelling vers Tulum
    C: a3.debut - 0.3,                      // les pochettes reculent, le billet arrive
    compte: [T.mot('a3', 'deux') - 0.1, T.mot('a3', 'dollars') + 0.2],
    D: T.mot('a4', 'pourtant') - 0.12,      // la lumière s'éteint
    lampe: T.mot('a4', 'quelques'),
  };
}

let R, F, blocs, E_dpc, E_tulum, E_billet, E_echecs, E_dpc2;

function preparer() {
  R = reperes();
  F = creerFrise(T);
  blocs = [
    // Le luxe s'accumule dans un seul bloc (lisible plus longtemps), qui laisse place au compteur.
    creerBloc({ sortie: R.compte[0] - 0.5, lignes: [['Aujourd’hui', R.a1.debut - 0.2, 'sur'], ['Dom Pérignon,', T.mot('a1', 'du')], ['Tulum, Mexique,', T.mot('a2', 'tulum'), 'serif']] }),
    creerBloc({ sortie: R.D, lignes: [['Billets vendus · une soirée', T.mot('a3', 'billets'), 'sur']] }),
    creerBloc({ sortie: F.debut - 0.3, lignes: [['Il y a quelques années', T.mot('a4', 'quelques'), 'sur'], ['Josman', T.mot('a4', 'josman')], ['dormait parfois', T.mot('a4', 'dormait')], ['dehors.', T.mot('a4', 'dehors'), 'serif']] }),
  ];
  // Le bloc du compteur se place sous le chiffre.
  style(blocs[1].b, 'top', '120px');
  creerCompteur();
  $('billet').innerHTML = `<div class="b-corps"><div class="b-or"></div><div class="b-surtitre">PARIS LA DÉFENSE ARENA</div><div class="b-nom">JOSMAN</div><div class="b-lieu">VEN. 10.04.2026 · 20:00<br>39 964 BILLETS VENDUS</div></div><div class="b-talon"><div class="b-num">Nº 039964</div><div class="b-code"></div><div class="b-num">ENTRÉE</div></div>`;
  E_dpc = etiquette('<b>DOM PERIGNON CRYING</b> · ALBUM · 31.10.2025');
  E_tulum = etiquette('<b>TULUM, MÉXICO</b> · SINGLE · 2023');
  E_billet = etiquette('SOURCE · <b>POLLSTAR</b> · RECETTES DE BILLETTERIE');
  E_echecs = etiquette('<b>2015</b> · MIXTAPE');
  E_dpc2 = etiquette('<b>2025</b> · ALBUM');
  const m = T.mot, L = (id) => T.ligne(id);
  // Fin du film : chaque bloc sort 0,5 s avant l'entrée du suivant.
  const fin = [
    { lignes: [['Jusque dans ses titres', L('d1').debut, 'sur'], ['En 2015 :', m('d1', 'deux mille')], ['Échecs positifs.', m('d1', 'échecs'), 'serif']] },
    { lignes: [['Aujourd’hui', L('d2').debut, 'sur'], ['Dom Perignon', m('d2', 'dom')], ['Crying.', m('d2', 'crying'), 'serif']] },
    { lignes: [['Propriétaire.', m('d3', 'propriétaire')]] },
    { lignes: [['Pas une revanche.', m('e1', 'revanche')], ['Réparer ce qu’ont', m('e1', 'réparer'), 'serif'], ['vécu ses parents.', m('e1', 'parents'), 'serif']] },
    { lignes: [['Du champagne…', m('e2', 'champagne')], ['qui pleure.', m('e2', 'pleure'), 'serif']] },
    { lignes: [['Version complète', L('f1').debut], ['sur YouTube ?', m('f1', 'youtube'), 'serif'], ['Dis-le en commentaire', m('f1', 'commentaire'), 'sur']] },
  ];
  fin.forEach((b, i) => { b.sortie = i < fin.length - 1 ? fin[i + 1].lignes[0][1] - 0.5 : T.duree + 1; });
  fin[2].sortie = m('d3', 'dix avril') - 0.2;
  for (const b of fin) blocs.push(creerBloc(b));
}

// Clignotement de néon qui meurt, reproductible (aucun hasard).
const CLIGNE = [1, 0.3, 0.85, 0.15, 0.55, 0.05, 0];
function clignote(t, t0, d) {
  if (t < t0) return 1;
  if (t >= t0 + d) return 0;
  const i = Math.floor(((t - t0) / d) * (CLIGNE.length - 1));
  return CLIGNE[i];
}

function dessiner(t) {
  const { a1, B, C: tc, D, lampe, compte } = R;

  // Lumière : s'allume au début, meurt sur « Pourtant ».
  const lumiere = tw(t, 0, 1.1) * clignote(t, D, 0.7);
  vis($('douche'), Math.max(lumiere, 0.6 * tw(t, F.debut + 0.3, 1.4, E.doux)));
  vis($('faisceau'), lumiere * (0.85 + 0.15 * Math.sin(t * 0.9)));
  // L'obscurité recouvre les objets ; le lampadaire, froid, s'allume sur « quelques années ».
  vis($('obscur'), 0.9 * tw(t, D + 0.1, 0.9, E.doux));
  const lamp = t < lampe ? 0 : clamp(prog(t, lampe, 0.18) * (t < lampe + 0.32 ? (Math.floor((t - lampe) * 30) % 3 ? 1 : 0.35) : 1));
  vis($('lampadaire'), lamp * 0.95 * (1 - tw(t, F.debut - 0.2, 0.9, E.doux)));
  // La flaque de lumière se resserre en un point d'or qui devient la première étape de la frise.
  const pt = E.traversee(prog(t, F.debut - 0.5, 0.9));
  vis($('point'), t > F.debut - 0.6 && t < F.debut + 0.6 ? clamp(prog(t, F.debut - 0.6, 0.25)) * (1 - prog(t, F.debut + 0.35, 0.25)) : 0);
  style($('point'), 'transform', `translate3d(531px,${lerp(1541, 1321, pt).toFixed(1)}px,0) scale(${lerp(2.2, 1, pt).toFixed(3)})`);
  const fini = 1 - prog(t, F.debut, 0.6);       // les objets de l'accroche quittent la scène

  // Pochette DPC : monte dans la lumière, avance très lentement, puis recule pour Tulum.
  const montee = tw(t, a1.debut - 0.45, 1.0);
  const vB = E.traversee(prog(t, B, 1.0));
  const vC = E.traversee(prog(t, tc, 1.1));
  const pousse = 0.035 * E.doux(prog(t, a1.debut - 0.45, 4));
  poser($('dpc'), {
    x: 540 + lerp(0, -330, vB) + lerp(0, 40, vC), y: 1290 + 140 * (1 - montee), w: 600, h: 600,
    z: lerp(0, -420, vB) + lerp(0, -600, vC), ry: lerp(0, 24, vB) + lerp(0, 6, vC), rx: 6 * (1 - montee),
    s: 1 + pousse, a: fini * montee * lerp(1, 0.6, vB) * lerp(1, 0.5, vC),
  });
  // Tulum : entre par la droite dans le travelling, se pose au centre, puis recule.
  const tulumA = clamp(prog(t, B, 0.4));
  poser($('tulum'), {
    x: lerp(1480, 560, vB) + lerp(0, 230, vC), y: 1290, w: 600, h: 600,
    z: lerp(-200, 0, vB) + lerp(0, -900, vC), ry: lerp(-30, -3, vB) + lerp(0, -16, vC),
    s: 1 + 0.025 * E.doux(prog(t, B, 4)), a: fini * tulumA * lerp(1, 0.5, vC),
  });
  // Le billet : glisse depuis le bas, se pose légèrement de biais, tenu jusqu'au noir.
  const bil = ressort(t - tc - 0.2, 120, 17);
  poser($('billet'), {
    x: 540, y: lerp(2400, 1330, bil), w: 780, h: 300, z: 0, rz: lerp(-16, -4, bil), rx: 0,
    s: 1 + 0.02 * E.doux(prog(t, tc + 0.6, 4)), a: t < tc + 0.15 ? 0 : fini,
  });

  // Étiquettes de crédit, posées au-dessus de chaque objet quand il est au premier plan.
  const eA = tw(t, a1.debut + 0.3, 0.6) * (1 - prog(t, B, 0.3));
  vis(E_dpc, eA); style(E_dpc, 'transform', `translate3d(96px,${(1360 - 12 * eA).toFixed(1)}px,0)`);
  const eB = tw(t, B + 0.9, 0.6) * (1 - prog(t, tc, 0.3));
  vis(E_tulum, eB); style(E_tulum, 'transform', `translate3d(96px,${(1360 - 12 * eB).toFixed(1)}px,0)`);
  const eC = tw(t, compte[1], 0.6) * (1 - prog(t, D, 0.3));
  vis(E_billet, eC); style(E_billet, 'transform', `translate3d(96px,${(1380 - 12 * eC).toFixed(1)}px,0)`);

  for (const b of blocs) dessinerBloc(b, t);
  F.dessiner(t);
  dessinerFin(t);
  // Les streams : le compteur se pose au-dessus de toute la frise.
  const sa = tw(t, F.dezoom.t0 + 0.2, 0.8);
  vis($('streams'), sa);
  if (sa > 0) {
    style($('streams'), 'transform', `translate3d(0,${(30 * (1 - sa)).toFixed(1)}px,0)`);
    $('st-n').textContent = Math.round(2e9 * E.sortie(prog(t, F.dezoom.t0 + 0.2, 1.8))).toLocaleString('fr-FR').replace(/\s/g, ' ');
  }
  dessinerCompteur(t, compte[0], compte[1], D);

  // L'onglet de la série glisse du bord.
  style($('onglet'), 'transform', `translate3d(${(-80 * (1 - ressort(t - 0.25, 170, 20))).toFixed(1)}px,0,0)`);
}

// Parties 4 à 6 : le train de vie (avant / maintenant, la salle), la nuance (le champagne qui
// pleure), puis l'appel à la version longue. On réutilise les objets de l'accroche.
function dessinerFin(t) {
  const L = (id) => T.ligne(id), m = T.mot;
  const d1 = L('d1').debut, d2 = L('d2').debut, salle = m('d3', 'dix avril') - 0.3, e1 = L('e1').debut, e2 = L('e2').debut, f1 = L('f1').debut;
  if (t < d1 - 0.8) return;
  const sortieFrise = 1 - prog(t, d1 - 0.8, 0.6);
  vis($('frise'), sortieFrise); vis($('streams'), Math.min(+$('streams').style.opacity || 0, sortieFrise));
  // Lumière : pleine sur le luxe, basse sur la nuance, le faisceau revient sur le champagne qui pleure.
  const plein = tw(t, d1 - 0.6, 0.9) * (1 - 0.55 * tw(t, e1 - 0.4, 0.8)) + 0.55 * tw(t, e2 - 0.3, 0.8);
  vis($('douche'), Math.max(0.6 * sortieFrise, plein));
  vis($('faisceau'), tw(t, e2 - 0.3, 0.8) * (1 - tw(t, f1 - 0.2, 0.8)));
  vis($('obscur'), 0.9 * (1 - tw(t, d1 - 0.6, 0.9)) + 0.5 * tw(t, e1 - 0.4, 0.8) * (1 - tw(t, e2 - 0.3, 0.8)));

  // Avant / maintenant : Échecs positifs à gauche, DOM PERIGNON CRYING à droite, puis ils s'écartent pour la salle.
  const ea = tw(t, d1 + 0.4, 0.9), da = tw(t, d2 - 0.2, 0.9), ecart = E.traversee(prog(t, salle - 0.2, 0.9));
  const nuance = E.traversee(prog(t, e2 - 0.4, 1.1));       // DPC revient seul au centre
  poser($('echecs'), { x: lerp(300, -260, ecart), y: 1300 + 90 * (1 - ea), w: 600, h: 600, ry: 14, s: 0.72, z: 0, a: ea * (1 - prog(t, e1 - 0.5, 0.5)) });
  if (t > d2 - 0.4) poser($('dpc'), {
    x: lerp(lerp(780, 1340, ecart), 540, nuance), y: 1300 + 90 * (1 - da), w: 600, h: 600, ry: lerp(-14, 0, nuance), z: 0,
    s: lerp(0.72, 1.05, nuance) + 0.03 * E.doux(prog(t, e2, 4)), a: da * Math.max(1 - prog(t, salle, 0.5), nuance) * (1 - prog(t, f1 - 0.2, 0.6)),
  });
  vis(E_echecs, ea * (1 - ecart)); style(E_echecs, 'transform', 'translate3d(150px,1370px,0)');
  vis(E_dpc2, da * (1 - ecart)); style(E_dpc2, 'transform', 'translate3d(650px,1370px,0)');
  // La larme : une goutte de lumière glisse sur la pochette quand la voix dit « pleure ».
  const larme = prog(t, m('e2', 'pleure') - 0.1, 1.6);
  vis($('larme'), larme > 0 && larme < 1 ? Math.sin(Math.PI * larme) : 0);
  style($('larme'), 'transform', `translate3d(0,${(80 + 380 * E.doux(larme)).toFixed(1)}px,0)`);

  // La salle : le billet du début revient, et le nombre de personnes se compte.
  const sa = tw(t, salle, 0.8) * (1 - prog(t, e1 - 0.5, 0.5));
  vis($('salle'), sa);
  if (sa > 0) $('salle-n').textContent = Math.round(39964 * E.sortie(prog(t, salle + 0.1, 1.8))).toLocaleString('fr-FR').replace(/\s/g, ' ');
  if (t > salle - 0.2) {
    const b = ressort(t - salle - 0.1, 120, 17);
    poser($('billet'), { x: 540, y: lerp(2400, 1330, b), w: 780, h: 300, rz: lerp(-16, -4, b), s: 1, z: 0, a: 1 - prog(t, e1 - 0.5, 0.5) });
  }
}

async function demarrer() {
  let voix = {};
  try { const r = await fetch('medias/voix.json'); if (r.ok) voix = await r.json(); } catch (_) { /* voix estimée */ }
  T = calculer(voix.durees || {}, voix.mots || {});
  await Promise.all([
    document.fonts.load('800 100px "Archivo"'), document.fonts.load('italic 120px "Instrument Serif"'), document.fonts.load('500 22px "JetBrains Mono"'),
    ...[...document.images].map((i) => i.decode().catch(() => {})),
  ]);
  preparer();
  window.__render = (t) => { dessiner(t); return document.fonts.ready.then(() => true); };
  const L = (id) => T.ligne(id);
  const vite = [[T.mot('d3', 'dix avril') - 0.5, 1.2], [L('e2').debut - 0.4, 1.1]];
  window.__sous = (t) => (vite.some(([a, d]) => t > a && t < a + d) || (t > R.B && t < R.B + 1) || (t > R.C && t < R.C + 1.3) || F.stops.some((s, i) => i && t > s.quand - s.duree - 0.05 && t < s.quand) || (t > F.dezoom.t0 && t < F.dezoom.t0 + F.dezoom.d) ? 3 : 1);
  window.__duree = T.duree;
  window.__sons = [];
  window.__ready = true;
  if (!params.has('render')) {
    const t0 = performance.now(), depart = +(params.get('t') || 0);
    const boucle = () => { dessiner(depart + ((performance.now() - t0) / 1000) % T.duree); requestAnimationFrame(boucle); };
    boucle();
  }
}
demarrer();
