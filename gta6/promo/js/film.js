// Dessin sur toile : lumière, matière, transitions.
import { W, H, clamp, h2, TAU, lerp } from './outils.js';

export const C = {
  nuit: '#14021F', aubergine: '#1D002E', bleu: '#3F45BB', violet: '#9A39BB', rose: '#E25790',
  corail: '#FF775C', orange: '#FF9745', creme: '#FFF4E8',
};
export const DEGRADE = [[0, C.bleu], [0.32, C.violet], [0.58, C.rose], [0.8, C.corail], [1, C.orange]];

export function fond(ctx, couleur = C.nuit) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, W, H);
}

// Douche de lumière venue du haut (référence TikTok) : un cône doux sur fond sombre.
export function douche(ctx, cx, force = 1, { largeur = 900, hauteur = 760, teinte = '255,236,220' } = {}) {
  if (force <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(cx, -120, 20, cx, -120, hauteur);
  g.addColorStop(0, `rgba(${teinte},${0.55 * force})`);
  g.addColorStop(0.45, `rgba(${teinte},${0.16 * force})`);
  g.addColorStop(1, `rgba(${teinte},0)`);
  ctx.fillStyle = g;
  ctx.translate(cx, 0);
  ctx.scale(largeur / hauteur, 1);
  ctx.translate(-cx, 0);
  ctx.fillRect(cx - hauteur, 0, hauteur * 2, H);
  ctx.restore();
}

// Halo coloré (bloom) autour d'un point.
export function halo(ctx, x, y, r, couleur, force = 1) {
  if (force <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, couleur.replace('A', String(0.9 * force)));
  g.addColorStop(0.35, couleur.replace('A', String(0.35 * force)));
  g.addColorStop(1, couleur.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// Voile du dégradé VI (pour teinter un fond, jamais le footage).
export function gradientVI(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  DEGRADE.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// Éclat de lumière plein écran (sur les temps forts), additif.
export function eclat(ctx, force, teinte = '255,190,140') {
  if (force <= 0.002) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, `rgba(${teinte},${force})`);
  g.addColorStop(1, `rgba(${teinte},${force * 0.35})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Fuite de lumière orange/rose qui traverse l'image en diagonale.
export function fuite(ctx, p, force = 0.6) {
  if (p <= 0 || p >= 1 || force <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const x = lerp(-700, W + 700, p);
  const g = ctx.createRadialGradient(x, H * 0.4, 0, x, H * 0.4, 900);
  g.addColorStop(0, `rgba(255,151,69,${0.75 * force})`);
  g.addColorStop(0.4, `rgba(226,87,144,${0.35 * force})`);
  g.addColorStop(1, 'rgba(63,69,187,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Grain (motif aléatoire reproductible, change à chaque image) et vignette.
let motif = null;
export function grain(ctx, f, force = 0.05) {
  if (!motif) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d'), im = x.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = (h2(i, 7) * 255) | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0);
    motif = c;
  }
  ctx.save();
  ctx.globalAlpha = force;
  ctx.globalCompositeOperation = 'overlay';
  const ox = Math.floor(h2(f, 1) * 256), oy = Math.floor(h2(f, 2) * 256);
  for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(motif, x, y);
  ctx.restore();
}
export function vignette(ctx, force = 0.5) {
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
  g.addColorStop(0, 'rgba(10,0,16,0)');
  g.addColorStop(1, `rgba(10,0,16,${force})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Parallélogramme (forme des cases de la jaquette).
export function biais(ctx, x, y, w, h, k = 0.12) {
  const d = h * k;
  ctx.beginPath();
  ctx.moveTo(x + d, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - d, y + h); ctx.lineTo(x, y + h); ctx.closePath();
}

// Liseré lumineux le long d'un chemin courant (traînée qui fait le tour).
export function liseré(ctx, longueur, phase, couleur = '255,244,232', larg = 2.5) {
  ctx.save();
  ctx.lineWidth = larg;
  ctx.strokeStyle = `rgba(${couleur},0.22)`;
  ctx.stroke();
  ctx.setLineDash([longueur * 0.18, longueur * 0.82]);
  ctx.lineDashOffset = -phase * longueur;
  ctx.shadowColor = 'rgba(255,151,69,0.95)';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = `rgba(${couleur},0.95)`;
  ctx.stroke();
  ctx.restore();
}

// Flou rapide : l'image passe par une toile minuscule puis est agrandie (lissage bilinéaire).
const mini = document.createElement('canvas');
mini.width = 96; mini.height = 54;
const mx = mini.getContext('2d');
const moyen = document.createElement('canvas');
moyen.width = 384; moyen.height = 216;
const my = moyen.getContext('2d');
export function flouRapide(ctx, im, alpha = 1, { x = 0, y = 0, w = W, h = H } = {}) {
  if (!im) return;
  const s = Math.max(96 / im.naturalWidth, 54 / im.naturalHeight);
  mx.clearRect(0, 0, 96, 54);
  mx.drawImage(im, (96 - im.naturalWidth * s) / 2, (54 - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
  my.imageSmoothingQuality = 'high';
  my.clearRect(0, 0, 384, 216);
  my.drawImage(mini, 0, 0, 384, 216);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(moyen, x, y, w, h);
  ctx.restore();
}

export const sinus = (t, f, ph = 0) => Math.sin(t * f * TAU + ph);
export { clamp };
