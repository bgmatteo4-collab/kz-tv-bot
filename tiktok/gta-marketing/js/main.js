// Assemble le film et expose window.__render(t) pour le rendu image par image.
//
// Ordre de dessin d'une image : carte (canvas #carte) → noms de quartiers → voile sous les
// photos → épingles des 7 coups → chaque chapitre (canvas #carte, calque #dessus, cartes
// photo DOM) → titres → habillage (onglet, légende) → grain.
// Les chapitres sont dans js/chapitres/ (un fichier par chapitre, voir CHAPITRES.md) ; un
// chapitre absent est simplement sauté, ce qui permet de construire le film morceau par morceau.
import { W, H, FPS, C, rgba, clamp, prog, E, ressort, tw, $, style } from './outils.js';
import { chargerCarte, dessinerCarte, quartiers } from './carte.js';
import { calculer, CHAPITRES, NUMERO, VOIX_ACCROCHE } from './partition.js';
import { creerCamera } from './camera.js';
import { debutImage, finImage } from './photos.js';
import { ajouterBlocs, ajusterLignes, titres } from './titres.js';
import { preparerHud, majDossier, majLegende, coordonnees } from './hud.js';
import { dessinerEpingles } from './epingles.js';

let T, K, ctx, dessus, chapitres = [], legendes = [], voixFichiers = {};
const params = new URLSearchParams(location.search);

const horsTitres = (y) => clamp((y - 640) / 160);

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

// Légende : la fenêtre d'un chapitre si l'instant y tombe, sinon les coordonnées en direct.
function legende(t, cam) {
  const rampe = 0.22;
  const f = legendes.find((l) => t >= l.de && t < l.a);
  if (f) {
    const a = Math.min(tw(t, f.de, rampe), 1 - prog(t, f.a - rampe, rampe));
    majLegende(f.html, a, f.haut || 1262);
    return;
  }
  // Entre deux fenêtres : coordonnées, avec un fondu aux bords.
  const avant = legendes.filter((l) => l.a <= t).reduce((m, l) => Math.max(m, l.a), -9);
  const apres = legendes.filter((l) => l.de > t).reduce((m, l) => Math.min(m, l.de), 1e9);
  const a = Math.min(clamp((t - avant) / rampe), clamp((apres - t) / rampe), clamp((t - 3.6) / 0.4), 1 - prog(t, K.boucle.t0, 0.3));
  majLegende(coordonnees(cam), a, 1262);
}

function etatDossier(t) {
  let faits = 0, courant = 0;
  for (const [id, n] of Object.entries(NUMERO)) {
    const c = T.chap[id];
    if (t >= c.tenue + 0.3) faits = Math.max(faits, n);
    else if (t >= c.precedent + 0.06) courant = n;
  }
  return { faits, courant };
}

function dessiner(t) {
  const cam = K.camera(t);
  const visible = chapitres.every((ch) => !ch.carteVisible || ch.carteVisible(t));
  const alerte = Math.max(0, ...chapitres.map((ch) => (ch.alerte ? ch.alerte(t) : 0)));
  const P = dessinerCarte(ctx, cam, { a: visible ? 1 : 0, lueurZones: tw(t, 7.05, 0.6), alerte });
  dessus.clearRect(0, 0, W, H);
  if (visible) {
    quartiers(ctx, P, cam, { zoneTitres: horsTitres });
    const voile = Math.max(0, ...chapitres.map((ch) => (ch.voile ? ch.voile(t) : 0)));
    if (voile > 0) { ctx.fillStyle = rgba(C.marine, 0.6 * voile); ctx.fillRect(0, 0, W, H); }
    dessinerEpingles(ctx, t, T, cam, P, { zoneTitres: horsTitres });
  }
  debutImage();
  const X = { t, T, K, cam, P, ctx, dessus, horsTitres };
  for (const ch of chapitres) ch.dessiner(t, X);
  finImage();
  titres(t);
  legende(t, cam);
  // L'onglet glisse depuis le bord gauche ; il se retire juste avant la fin (la boucle repart sans lui).
  majDossier(t, etatDossier(t));
  const sortie = E.entree(prog(t, T.duree - 0.7, 0.5));
  if (sortie > 0) style($('dossier'), 'transform', `translate3d(${(-100 * sortie + (ressort(t - 0.08, 170, 17) - 1) * 100).toFixed(2)}px,0,0)`);
  grain(Math.round(t * FPS));
}

// ---------------------------------------------------------------- bande-son

function partition() {
  const ev = [];
  const add = (t, type, gain = 1, extra = {}) => ev.push({ t: +t.toFixed(3), type, gain, ...extra });
  add(0, 'voix', 1, { fichier: VOIX_ACCROCHE.fichier, decalage: VOIX_ACCROCHE.decalage });
  for (const l of T.lignes) if (voixFichiers[l.id]) add(l.debut, 'voix', 1, { fichier: voixFichiers[l.id] });
  add(0, 'nappe', 0.5, { duree: T.duree });
  // Un souffle pour chaque vol de caméra après l'accroche.
  for (const [a, b] of K.vols.slice(2)) add(a, 'whoosh', 0.32, { duree: Math.max(0.5, b - a) });
  for (const ch of chapitres) if (ch.sons) ch.sons(add);
  return ev.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- démarrage

async function demarrer() {
  ctx = $('carte').getContext('2d');
  dessus = $('dessus').getContext('2d');
  // Voix définitive : medias/voix.json = { durees: { id: s }, fichiers: { id: chemin } }.
  let voix = {};
  try { const r = await fetch('medias/voix.json'); if (r.ok) voix = await r.json(); } catch (_) { /* voix estimée */ }
  voixFichiers = voix.fichiers || {};
  T = calculer(voix.durees || {});
  K = creerCamera(T);
  await Promise.all([
    chargerCarte(),
    document.fonts.load('900 100px "Archivo"'), document.fonts.load('italic 120px "Instrument Serif"'), document.fonts.load('500 22px "JetBrains Mono"'),
  ]);
  // ?seulement=pubs,enseigne : ne charge que ces chapitres (plus l'accroche), pour aller vite.
  const seulement = params.get('seulement')?.split(',');
  for (const id of CHAPITRES) {
    if (seulement && id !== 'accroche' && !seulement.includes(id)) continue;
    let mod;
    try { mod = await import(`./chapitres/${id}.js`); } catch (e) {
      if (/Failed to fetch|Importing a module script failed|404/.test(String(e))) continue; // chapitre pas encore écrit
      throw e;
    }
    chapitres.push(mod.default(T, K));
  }
  for (const ch of chapitres) if (ch.preparer) ch.preparer();
  ajouterBlocs(chapitres.flatMap((ch) => ch.blocs || []));
  legendes = chapitres.flatMap((ch) => ch.legendes || []).sort((a, b) => a.de - b.de);
  preparerHud();
  preparerFx();
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  ajusterLignes();
  window.__render = (t) => { dessiner(t); return document.fonts.ready.then(() => true); };
  window.__sous = (t) => (K.enVol(t) || chapitres.some((ch) => ch.sous && ch.sous(t) > 1) ? 3 : 1);
  window.__sons = partition();
  window.__duree = T.duree;
  window.__partition = T;
  window.__chapitres = chapitres.map((c) => c.id);
  window.__ready = true;
  if (!params.has('render')) {
    const t0 = performance.now(), depart = +(params.get('t') || 0);
    const boucle = () => { dessiner((depart + (performance.now() - t0) / 1000) % T.duree); requestAnimationFrame(boucle); };
    requestAnimationFrame(boucle);
  }
}
demarrer();
