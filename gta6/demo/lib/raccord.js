// lib/raccord.js — l'état de raccord et la « ligne de coucher de soleil ».
//
// LE CONTRAT : à t = 0 et à t = durée, chaque acte montre EXACTEMENT dessinerRaccord(ctx) :
// fond encre de nuit #1E0032 + la ligne de référence LIGNE (centrée, y = 540), rien d'autre
// (pas de grain, pas de cadre, pas de vignette). C'est ce qui permet de coller les actes.
//
// La ligne est un trait fin lumineux, dégradé rose #EB6289 → orange #FF9A50, effilé aux deux
// bouts, avec un cœur crème et deux halos additifs (serré + large). Les halos sont des
// sprites pré-calculés une fois puis étirés : dessiner la ligne coûte < 1 ms.
//
// API
//   LIGNE                         état de référence (à ne pas modifier)
//   dessinerFond(ctx)             remplit 1920×1080 en encre de nuit
//   dessinerLigne(ctx, etat)      dessine la ligne ; etat = LIGNE modifié, champs :
//       x, y          centre (px)                  longueur   (px, effilée aux bouts)
//       epaisseur     trait (px)                   intensite  (0 = éteinte, 1 = réf., >1 = flash)
//       halo          hauteur des halos (×)        angle      (radians)
//       de, a         portion tracée, 0→1 le long de la ligne (tracé progressif, gomme)
//       couleurs      [gauche, droite]
//   dessinerRaccord(ctx)          fond + ligne de référence (l'image de raccord exacte)
//   ligne(p)                      raccourci : { ...LIGNE, ...p }
//   interpoler(a, b, p)           mélange numérique de deux états (transitions)
//   creerCalque(parent, z)        canvas 1920×1080 plein cadre → { canvas, ctx, effacer() }
//
// Exemple (la ligne s'allume depuis le centre puis s'épaissit) :
//   dessinerFond(ctx);
//   dessinerLigne(ctx, ligne({ longueur: 1240 * tw(t, 0.2, 1.4), intensite: tw(t, 0, 0.8) }));

import { W, H, clamp, lerp, rgb } from './core.js';

export const FOND = '#1E0032';
export const LIGNE = Object.freeze({
  x: 960, y: 540, longueur: 1240, epaisseur: 2, intensite: 1, halo: 1, angle: 0, de: 0, a: 1,
  couleurs: Object.freeze(['#EB6289', '#FF9A50']),
});

export const ligne = (p = {}) => ({ ...LIGNE, ...p });

export function interpoler(A, B, p) {
  const o = { ...A };
  for (const k of ['x', 'y', 'longueur', 'epaisseur', 'intensite', 'halo', 'angle', 'de', 'a']) o[k] = lerp(A[k], B[k], p);
  return o;
}

export function dessinerFond(ctx, couleur = FOND) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Sprites de halo : barre horizontale effilée, floutée une fois pour toutes.
const SPRITES = new Map();
function sprite(couleurs, flou) {
  const cle = `${couleurs.join()}|${flou}`;
  if (SPRITES.has(cle)) return SPRITES.get(cle);
  const w = 1024, h = 256, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const m = flou * 2.2;
  const g = x.createLinearGradient(m, 0, w - m, 0);
  const [a, b] = couleurs.map(rgb);
  g.addColorStop(0, `rgba(${a},0)`);
  g.addColorStop(0.2, `rgba(${a},1)`);
  g.addColorStop(0.8, `rgba(${b},1)`);
  g.addColorStop(1, `rgba(${b},0)`);
  x.filter = `blur(${flou}px)`;
  x.fillStyle = g;
  x.fillRect(m, h / 2 - 6, w - 2 * m, 12);
  x.filter = 'none';
  const s = { c, m };
  SPRITES.set(cle, s);
  return s;
}

function degradeTrait(ctx, L, couleurs, alpha) {
  const [a, b] = couleurs.map(rgb);
  const g = ctx.createLinearGradient(-L / 2, 0, L / 2, 0);
  g.addColorStop(0, `rgba(${a},0)`);
  g.addColorStop(0.14, `rgba(${a},${alpha})`);
  g.addColorStop(0.86, `rgba(${b},${alpha})`);
  g.addColorStop(1, `rgba(${b},0)`);
  return g;
}

export function dessinerLigne(ctx, etat = LIGNE) {
  const s = { ...LIGNE, ...etat };
  const I = Math.max(0, s.intensite), L = Math.max(0, s.longueur);
  const de = clamp(Math.min(s.de, s.a)), a = clamp(Math.max(s.de, s.a));
  if (I <= 0 || L < 1 || a - de <= 0) return;
  const x0 = -L / 2 + de * L, x1 = -L / 2 + a * L;
  ctx.save();
  ctx.translate(s.x, s.y);
  if (s.angle) ctx.rotate(s.angle);
  // La portion visible [de, a] coupe les halos et le trait au même endroit.
  ctx.beginPath();
  ctx.rect(x0, -400, x1 - x0, 800);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';

  // Halo large et doux
  const large = sprite(s.couleurs, 34);
  ctx.globalAlpha = clamp(0.42 * I, 0, 1);
  const hl = 150 * s.halo * (0.55 + 0.45 * Math.min(I, 2));
  ctx.drawImage(large.c, -L * 0.6, -hl / 2, L * 1.2, hl);
  // Halo serré
  const serre = sprite(s.couleurs, 7);
  ctx.globalAlpha = clamp(0.85 * I, 0, 1);
  const hs = (34 + s.epaisseur * 4) * s.halo;
  ctx.drawImage(serre.c, -L * 0.53, -hs / 2, L * 1.06, hs);

  // Trait coloré
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = degradeTrait(ctx, L, s.couleurs, clamp(I, 0, 1));
  ctx.fillRect(-L / 2, -s.epaisseur / 2, L, s.epaisseur);
  // Cœur crème, plus court : la ligne « brûle » au centre
  ctx.globalCompositeOperation = 'lighter';
  const Lc = L * 0.7;
  const g = ctx.createLinearGradient(-Lc / 2, 0, Lc / 2, 0);
  const k = clamp(0.55 * I, 0, 1);
  g.addColorStop(0, 'rgba(252,229,209,0)');
  g.addColorStop(0.5, `rgba(252,229,209,${k})`);
  g.addColorStop(1, 'rgba(252,229,209,0)');
  ctx.fillStyle = g;
  const ec = Math.max(1, s.epaisseur * 0.5);
  ctx.fillRect(-Lc / 2, -ec / 2, Lc, ec);
  ctx.restore();
}

export function dessinerRaccord(ctx) {
  dessinerFond(ctx);
  dessinerLigne(ctx, LIGNE);
}

// Canvas plein cadre prêt à dessiner (coordonnées de la scène 1920×1080).
export function creerCalque(parent, z = 0, classe = 'fill') {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.className = classe;
  canvas.style.zIndex = String(z);
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, effacer: () => ctx.clearRect(0, 0, W, H) };
}
