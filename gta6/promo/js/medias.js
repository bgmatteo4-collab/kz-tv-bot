// Images : footage (séquences JPEG à 30 i/s), stickers animés (PNG à 15 i/s), visuels fixes.
// Le rendu se fait en deux temps : un premier passage note les images manquantes,
// on les charge, puis on redessine. Une image demandée et pas encore chargée renvoie null.
import { PLANS, STICKERS } from './manifeste.js';
import { clamp } from './outils.js';

const RACINE = '../assets/';
const CACHE = new Map();
const manquantes = new Set();

function image(src) {
  let e = CACHE.get(src);
  if (!e) {
    const im = new Image();
    e = { im, ok: false };
    e.ready = new Promise((fin) => {
      im.onload = () => im.decode().then(() => { e.ok = true; fin(); }, () => { e.ok = true; fin(); });
      im.onerror = () => { console.error('Image introuvable : ' + src); e.ok = true; fin(); };
    });
    im.src = src;
    CACHE.set(src, e);
  }
  return e;
}

export function img(chemin) {
  const e = image(RACINE + chemin);
  if (!e.ok) { manquantes.add(e); return null; }
  return e.im.naturalWidth ? e.im : null;
}

// Charge tout ce qui a manqué au dernier passage. Renvoie false s'il ne manquait rien.
export async function chargerManquantes() {
  if (!manquantes.size) return false;
  const l = [...manquantes];
  manquantes.clear();
  await Promise.all(l.map((e) => e.ready));
  // Mémoire : on oublie les plus anciennes images de footage.
  if (CACHE.size > 420) {
    let n = CACHE.size - 360;
    for (const k of CACHE.keys()) { if (n <= 0) break; if (k.includes('/promo/') && !k.includes('/stickers/')) { CACHE.delete(k); n--; } }
  }
  return true;
}

// Image d'un plan au temps local tl (secondes depuis le début de son utilisation).
// vitesse < 1 ralentit ; boucle : rejoue le plan au lieu de figer la dernière image.
export function plan(id, tl, { vitesse = 1, depart = 0, boucle = false } = {}) {
  const p = PLANS[id];
  if (!p) throw new Error('Plan inconnu : ' + id);
  const [a, b] = p.utile;
  const n = b - a + 1;
  let k = Math.floor(depart * 30 + Math.max(0, tl) * 30 * vitesse);
  k = boucle ? ((k % n) + n) % n : clamp(k, 0, n - 1);
  const dossier = p.dossier || id;
  return img(`promo/${dossier}/${String(a + k).padStart(6, '0')}.jpg`);
}
export const dureePlan = (id, vitesse = 1) => { const [a, b] = PLANS[id].utile; return (b - a + 1) / 30 / vitesse; };

// Sticker animé (PNG avec transparence) ; les animations bouclent.
export function sticker(nom, tl) {
  const n = STICKERS[nom];
  const k = ((Math.floor(Math.max(0, tl) * 15) % n) + n) % n;
  return img(`promo/stickers/${nom}/${String(k + 1).padStart(4, '0')}.png`);
}

// Dessine une image en « cover » dans une boîte, avec zoom et point focal.
export function couvrir(ctx, im, x, y, w, h, { zoom = 1, fx = 0.5, fy = 0.5, dx = 0, dy = 0 } = {}) {
  if (!im) return;
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.drawImage(im, x + (w - dw) * fx + dx, y + (h - dh) * fy + dy, dw, dh);
}
// En « contain » centré.
export function contenir(ctx, im, cx, cy, w, h, { echelle = 1 } = {}) {
  if (!im) return null;
  const s = Math.min(w / im.naturalWidth, h / im.naturalHeight) * echelle;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh);
  return { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh };
}
