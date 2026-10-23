// Dossier Nº02 — Josman. Chaque image est une fonction pure du temps : window.__render(t).
// Pour l'instant : l'accroche (le luxe d'aujourd'hui, puis « il dormait parfois dehors »).
import { C, clamp, lerp, prog, tw, E, ressort, style, vis, el, $ } from './outils.js';
import { calculer } from './partition.js';

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

let R, blocs, E_dpc, E_tulum, E_billet;

function preparer() {
  R = reperes();
  blocs = [
    // Le luxe s'accumule dans un seul bloc (lisible plus longtemps), qui laisse place au compteur.
    creerBloc({ sortie: R.compte[0] - 0.5, lignes: [['Aujourd’hui', R.a1.debut - 0.2, 'sur'], ['Dom Pérignon,', T.mot('a1', 'du')], ['Tulum, Mexique,', T.mot('a2', 'tulum'), 'serif']] }),
    creerBloc({ sortie: R.D, lignes: [['Billets vendus · une soirée', T.mot('a3', 'billets'), 'sur']] }),
    creerBloc({ sortie: T.duree + 1, lignes: [['Il y a quelques années', T.mot('a4', 'quelques'), 'sur'], ['Josman', T.mot('a4', 'josman')], ['dormait parfois', T.mot('a4', 'dormait')], ['dehors.', T.mot('a4', 'dehors'), 'serif']] }),
  ];
  // Le bloc du compteur se place sous le chiffre.
  style(blocs[1].b, 'top', '120px');
  creerCompteur();
  $('billet').innerHTML = `<div class="b-corps"><div class="b-or"></div><div class="b-surtitre">PARIS LA DÉFENSE ARENA</div><div class="b-nom">JOSMAN</div><div class="b-lieu">VEN. 10.04.2026 · 20:00<br>39 964 BILLETS VENDUS</div></div><div class="b-talon"><div class="b-num">Nº 039964</div><div class="b-code"></div><div class="b-num">ENTRÉE</div></div>`;
  E_dpc = etiquette('<b>DOM PERIGNON CRYING</b> · ALBUM · 31.10.2025');
  E_tulum = etiquette('<b>TULUM, MÉXICO</b> · SINGLE · 2023');
  E_billet = etiquette('SOURCE · <b>POLLSTAR</b> · RECETTES DE BILLETTERIE');
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
  vis($('douche'), lumiere);
  vis($('faisceau'), lumiere * (0.85 + 0.15 * Math.sin(t * 0.9)));
  // L'obscurité recouvre les objets ; le lampadaire, froid, s'allume sur « quelques années ».
  vis($('obscur'), 0.9 * tw(t, D + 0.1, 0.9, E.doux));
  const lamp = t < lampe ? 0 : clamp(prog(t, lampe, 0.18) * (t < lampe + 0.32 ? (Math.floor((t - lampe) * 30) % 3 ? 1 : 0.35) : 1));
  vis($('lampadaire'), lamp * 0.95);

  // Pochette DPC : monte dans la lumière, avance très lentement, puis recule pour Tulum.
  const montee = tw(t, a1.debut - 0.45, 1.0);
  const vB = E.traversee(prog(t, B, 1.0));
  const vC = E.traversee(prog(t, tc, 1.1));
  const pousse = 0.035 * E.doux(prog(t, a1.debut - 0.45, 4));
  poser($('dpc'), {
    x: 540 + lerp(0, -330, vB) + lerp(0, 40, vC), y: 1290 + 140 * (1 - montee), w: 600, h: 600,
    z: lerp(0, -420, vB) + lerp(0, -600, vC), ry: lerp(0, 24, vB) + lerp(0, 6, vC), rx: 6 * (1 - montee),
    s: 1 + pousse, a: montee * lerp(1, 0.6, vB) * lerp(1, 0.5, vC),
  });
  // Tulum : entre par la droite dans le travelling, se pose au centre, puis recule.
  const tulumA = clamp(prog(t, B, 0.4));
  poser($('tulum'), {
    x: lerp(1480, 560, vB) + lerp(0, 230, vC), y: 1290, w: 600, h: 600,
    z: lerp(-200, 0, vB) + lerp(0, -900, vC), ry: lerp(-30, -3, vB) + lerp(0, -16, vC),
    s: 1 + 0.025 * E.doux(prog(t, B, 4)), a: tulumA * lerp(1, 0.5, vC),
  });
  // Le billet : glisse depuis le bas, se pose légèrement de biais, tenu jusqu'au noir.
  const bil = ressort(t - tc - 0.2, 120, 17);
  poser($('billet'), {
    x: 540, y: lerp(2400, 1330, bil), w: 780, h: 300, z: 0, rz: lerp(-16, -4, bil), rx: 0,
    s: 1 + 0.02 * E.doux(prog(t, tc + 0.6, 4)), a: t < tc + 0.15 ? 0 : 1,
  });

  // Étiquettes de crédit, posées au-dessus de chaque objet quand il est au premier plan.
  const eA = tw(t, a1.debut + 0.3, 0.6) * (1 - prog(t, B, 0.3));
  vis(E_dpc, eA); style(E_dpc, 'transform', `translate3d(96px,${(1360 - 12 * eA).toFixed(1)}px,0)`);
  const eB = tw(t, B + 0.9, 0.6) * (1 - prog(t, tc, 0.3));
  vis(E_tulum, eB); style(E_tulum, 'transform', `translate3d(96px,${(1360 - 12 * eB).toFixed(1)}px,0)`);
  const eC = tw(t, compte[1], 0.6) * (1 - prog(t, D, 0.3));
  vis(E_billet, eC); style(E_billet, 'transform', `translate3d(96px,${(1380 - 12 * eC).toFixed(1)}px,0)`);

  for (const b of blocs) dessinerBloc(b, t);
  dessinerCompteur(t, compte[0], compte[1], D);

  // L'onglet de la série glisse du bord.
  style($('onglet'), 'transform', `translate3d(${(-80 * (1 - ressort(t - 0.25, 170, 20))).toFixed(1)}px,0,0)`);
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
  window.__sous = (t) => ((t > R.B && t < R.B + 1) || (t > R.C && t < R.C + 1.3) ? 3 : 1);
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
