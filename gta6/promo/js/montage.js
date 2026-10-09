// Montage de footage plein cadre : une liste de plans [début, id, options], coupés sur les temps.
// Chaque coupe a un petit « coup de zoom » (1,06 → 1) et le plan pousse lentement.
import { W, H, E, prog, clamp, lerp } from './outils.js';
import { plan, couvrir } from './medias.js';

export function planCourant(liste, t) {
  let k = -1;
  for (let i = 0; i < liste.length; i++) if (t >= liste[i][0]) k = i;
  if (k < 0) return null;
  const [t0, id, o = {}] = liste[k];
  const t1 = k + 1 < liste.length ? liste[k + 1][0] : t0 + 3;
  return { k, t0, t1, id, o, tl: t - t0 };
}

export function dessinerMontage(ctx, liste, t, { punch = 0.06, pousse = 0.05, fy = 0.5 } = {}) {
  const c = planCourant(liste, t);
  if (!c) return null;
  const { tl, id, o, t0, t1 } = c;
  const im = plan(id, tl, o);
  const p = clamp(tl / Math.max(0.3, t1 - t0));
  const z = (o.zoom || 1) * (1 + (o.pousse ?? pousse) * p) * (1 + (o.punch ?? punch) * (1 - E.sortie(prog(tl, 0, 0.35))));
  const dx = (o.derive || 0) * (p - 0.5);
  couvrir(ctx, im, 0, 0, W, H, { zoom: z, fx: o.fx ?? 0.5, fy: o.fy ?? fy, dx });
  return c;
}

// Flash bref à chaque coupe (0 → 1 → 0 en ~0,12 s), utile pour l'éclat additif.
export function flashCoupe(liste, t, d = 0.12) {
  let f = 0;
  for (const [t0] of liste) { const q = (t - t0) / d; if (q >= 0 && q < 1) f = Math.max(f, 1 - q); }
  return f;
}

export const zoomExp = (p, a, b) => Math.exp(lerp(Math.log(a), Math.log(b), p));
