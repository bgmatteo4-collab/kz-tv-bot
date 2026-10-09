// lib/footage.js — lecteur de plans vidéo à partir des séquences JPEG pré-extraites.
//
// Le Chromium de Playwright ne lit pas le H.264 : les plans du storyboard sont extraits par
// demo/extraire.js en JPEG 30 i/s dans /assets/frames/<id>/ (chemins absolus : le serveur
// est enraciné sur gta6/). Chaque image affichée est une fonction pure du temps.
//
// API
//   const p = await plan('t1-03', { vitesse: 0.5, decalage: 0 });
//       vitesse   1 = temps réel, 0.5 = ralenti 50 % (images intermédiaires en fondu enchaîné)
//       decalage  secondes sautées au début du plan (ex. 1.3 pour ne garder que la plage de t1-09)
//       fondu     'auto' (défaut : seulement si vitesse < 1) | true | false
//   p.duree                         durée du plan en secondes de lecture (= (fin - debut - decalage) / vitesse)
//   await p.dessiner(ctx, tl, boite) dessine l'image du temps local tl (secondes depuis le début du plan ;
//                                   de -0,3 à duree + 0,3 grâce aux marges, au-delà l'image est figée)
//       boite = { x, y, w, h,                 rectangle de destination (défaut : plein cadre)
//                 cadrage: 'cover'|'contain', focale: [0.5, 0.5] (point gardé au centre),
//                 zoom: 1 (>1 = plus serré, pour un Ken Burns), decale: [dx, dy] (px),
//                 rayon: 0 (coins arrondis), opacite: 1, filtre: 'none' (filtre CSS canvas),
//                 masque: (ctx, boite) => { ctx.beginPath(); … }  (chemin de découpe libre) }
//   await p.image(tl)               { a, b, k } : ImageBitmap courante, suivante, mélange (Three.js…)
//   await p.precharger(tl0, tl1)    décode d'avance une plage (facultatif : le lecteur anticipe seul)
//   const ph = await photo('/assets/captures/screenshots/Places/…jpg')   image fixe, même dessiner()
//
// Pièges
//   - TOUJOURS attendre (await) dessiner() dans __render, sinon l'image est capturée vide.
//   - Le trailer 2 est extrait sans ses bandes noires : 1920×864 (2,22:1). En 'cover' sur 16:9,
//     il est rogné sur les côtés ; en 'contain' il garde ses bandes.
//   - Le cache garde ~64 images décodées par navigateur : ne pas dessiner plus de ~12 plans à la fois.

import { W, H, clamp, lerp } from './core.js';

const RACINE = '/assets/frames/';
let CLIPS = null;
export async function clips() {
  if (!CLIPS) CLIPS = await (await fetch('/demo/clips.json')).json();
  return CLIPS;
}

// ── Cache LRU d'images décodées (partagé par tous les plans de la page)
const MAX = 64;
const CACHE = new Map(); // url → { promesse, bitmap, prises }
function charger(url) {
  let e = CACHE.get(url);
  if (e) { CACHE.delete(url); CACHE.set(url, e); return e; }
  e = { bitmap: null, prises: 0 };
  e.promesse = fetch(url)
    .then((r) => { if (!r.ok) throw new Error(`Image introuvable : ${url}`); return r.blob(); })
    .then((b) => createImageBitmap(b))
    .then((bm) => { e.bitmap = bm; return bm; });
  CACHE.set(url, e);
  if (CACHE.size > MAX) {
    for (const [k, v] of CACHE) {
      if (CACHE.size <= MAX) break;
      if (v.prises > 0 || !v.bitmap) continue;
      v.bitmap.close();
      CACHE.delete(k);
    }
  }
  return e;
}
async function prendre(url) {
  const e = charger(url);
  e.prises++;
  try { await e.promesse; } catch (err) { e.prises--; throw err; }
  return e;
}
const rendre = (e) => { if (e) e.prises--; };

// ── Géométrie : rectangle source pour un cadrage cover / contain
function geometrie(iw, ih, b) {
  const z = b.zoom ?? 1, f = b.focale ?? [0.5, 0.5], d = b.decale ?? [0, 0];
  if ((b.cadrage ?? 'cover') === 'contain') {
    const s = Math.min(b.w / iw, b.h / ih) * z;
    const w = iw * s, h = ih * s;
    return { sx: 0, sy: 0, sw: iw, sh: ih, dx: b.x + (b.w - w) / 2 + d[0], dy: b.y + (b.h - h) / 2 + d[1], dw: w, dh: h };
  }
  const s = Math.max(b.w / iw, b.h / ih) * z;
  const sw = b.w / s, sh = b.h / s;
  const sx = clamp(f[0] * iw - sw / 2 - d[0] / s, 0, iw - sw);
  const sy = clamp(f[1] * ih - sh / 2 - d[1] / s, 0, ih - sh);
  return { sx, sy, sw, sh, dx: b.x, dy: b.y, dw: b.w, dh: b.h };
}

function boiteParDefaut(b = {}) {
  return { x: 0, y: 0, w: W, h: H, opacite: 1, rayon: 0, ...b };
}

// Dessine 1 ou 2 bitmaps (fondu k) dans la boîte, avec découpe éventuelle.
function peindre(ctx, A, B, k, boite) {
  const b = boiteParDefaut(boite);
  if (b.opacite <= 0 || b.w <= 0 || b.h <= 0) return;
  const g = geometrie(A.width, A.height, b);
  ctx.save();
  if (b.masque || b.rayon > 0) {
    if (b.masque) b.masque(ctx, b);
    else { ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, b.rayon); }
    ctx.clip();
  } else if ((b.cadrage ?? 'cover') === 'cover') {
    ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  }
  if (b.filtre && b.filtre !== 'none') ctx.filter = b.filtre;
  ctx.globalAlpha *= b.opacite;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(A, g.sx, g.sy, g.sw, g.sh, g.dx, g.dy, g.dw, g.dh);
  if (B && k > 0.002) {
    ctx.globalAlpha *= k;
    ctx.drawImage(B, g.sx, g.sy, g.sw, g.sh, g.dx, g.dy, g.dw, g.dh);
  }
  ctx.restore();
}

export class Plan {
  constructor(clip, infos, opts = {}) {
    this.id = clip.id;
    this.clip = clip;
    this.infos = infos;
    this.vitesse = opts.vitesse ?? 1;
    this.decalage = opts.decalage ?? 0;
    this.fondu = opts.fondu ?? 'auto';
    this.duree = (clip.fin - clip.debut - this.decalage) / this.vitesse;
    this.largeur = infos.largeur;
    this.hauteur = infos.hauteur;
  }

  // Index flottant de l'image source pour le temps local tl.
  index(tl) {
    const src = this.clip.debut + this.decalage + tl * this.vitesse;
    return clamp((src - this.infos.t0) * this.infos.fps, 0, this.infos.images - 1);
  }

  url(i) { return `${RACINE}${this.id}/${String(i + 1).padStart(6, '0')}.jpg`; }

  async image(tl) {
    const x = this.index(tl);
    const i = Math.floor(x + 1e-6);
    const fondu = this.fondu === true || (this.fondu === 'auto' && this.vitesse < 1);
    const k = fondu ? x - i : 0;
    const j = Math.min(i + 1, this.infos.images - 1);
    // Anticipation : les images suivantes se décodent pendant qu'on dessine celle-ci.
    for (let n = 1; n <= 3; n++) if (i + n < this.infos.images) charger(this.url(i + n));
    const [ea, eb] = await Promise.all([prendre(this.url(i)), k > 0.002 && j !== i ? prendre(this.url(j)) : null]);
    return { a: ea.bitmap, b: eb ? eb.bitmap : null, k: eb ? k : 0, rendre: () => { rendre(ea); rendre(eb); } };
  }

  async dessiner(ctx, tl, boite) {
    const im = await this.image(tl);
    try { peindre(ctx, im.a, im.b, im.k, boite); } finally { im.rendre(); }
  }

  async precharger(tl0 = 0, tl1 = this.duree) {
    const a = Math.floor(this.index(tl0)), b = Math.ceil(this.index(tl1));
    const tous = [];
    for (let i = a; i <= b && tous.length < MAX / 2; i++) tous.push(charger(this.url(i)).promesse);
    await Promise.all(tous);
  }
}

export async function plan(id, opts = {}) {
  const c = await clips();
  const clip = c.plans.find((p) => p.id === id);
  if (!clip) throw new Error(`Plan inconnu dans clips.json : ${id}`);
  const r = await fetch(`${RACINE}${id}/infos.json`);
  if (!r.ok) throw new Error(`Plan non extrait : ${id} (lancer node gta6/demo/extraire.js)`);
  const p = new Plan(clip, await r.json(), opts);
  await p.precharger(0, 0);
  return p;
}

// Image fixe (captures officielles, logos) avec la même interface que Plan.
export class Photo {
  constructor(bitmap, url) { this.bitmap = bitmap; this.url = url; this.largeur = bitmap.width; this.hauteur = bitmap.height; this.duree = Infinity; }
  async image() { return { a: this.bitmap, b: null, k: 0, rendre() {} }; }
  async dessiner(ctx, _tl, boite) { peindre(ctx, this.bitmap, null, 0, boite); }
}
export async function photo(url, maxLargeur = 2400) {
  const r = await fetch(encodeURI(url));
  if (!r.ok) throw new Error(`Image introuvable : ${url}`);
  const blob = await r.blob();
  let bm = await createImageBitmap(blob);
  // Les captures officielles font jusqu'à 3840 px : on les réduit une fois pour toutes.
  if (bm.width > maxLargeur) {
    const h = Math.round((bm.height * maxLargeur) / bm.width);
    const petit = await createImageBitmap(bm, { resizeWidth: maxLargeur, resizeHeight: h, resizeQuality: 'high' });
    bm.close();
    bm = petit;
  }
  return new Photo(bm, url);
}

// Ken Burns prêt à l'emploi : zoom et focale qui glissent de a à b sur la durée d.
export function kenBurns(tl, d, a = { zoom: 1.0, focale: [0.5, 0.5] }, b = { zoom: 1.12, focale: [0.55, 0.48] }) {
  const p = clamp(tl / d);
  return { zoom: lerp(a.zoom, b.zoom, p), focale: [lerp(a.focale[0], b.focale[0], p), lerp(a.focale[1], b.focale[1], p)] };
}
