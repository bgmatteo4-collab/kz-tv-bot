// Les 7 épingles des « coups de génie », posées sur la carte détaillée de Miami. Elles
// apparaissent en cascade pendant « Sept coups de génie », s'allument une à une (chapitre en
// cours), restent pleines une fois le coup raconté. La 7e garde un « ? » jusqu'au dernier coup.
// Deux coups ont lieu au même endroit qu'un autre (Wynwood, Kaseya Center) : leur pastille est
// décalée à l'écran, comme un satellite.
import { clamp, prog, ressort } from './outils.js';
import { LIEUX, RAD, epingleNumero } from './carte.js';
import { NUMERO } from './partition.js';

export const EPINGLES = [
  { n: 1, chap: 'pubs', ll: LIEUX.wynwood, dx: 0, dy: 0 },
  { n: 2, chap: 'dirigeable', ll: LIEUX.baie, dx: 0, dy: 0 },
  { n: 3, chap: 'enseigne', ll: LIEUX.miami, dx: 0, dy: 0 },
  { n: 4, chap: 'voitures', ll: LIEUX.keyBiscayne, dx: 0, dy: 0 },
  { n: 5, chap: 'plage', ll: LIEUX.southBeach, dx: 0, dy: 0 },
  { n: 6, chap: 'fresques', ll: LIEUX.wynwood, dx: -46, dy: -18 },
  { n: 7, chap: 'heat', ll: LIEUX.miami, dx: 46, dy: -18 },
];

// Position écran d'une épingle (avec son décalage de satellite).
export function ecranEpingle(P, ep) {
  const [x, y, f] = P.ll(...ep.ll);
  return [x + ep.dx * clamp(f, 0.8, 1.2), y + ep.dy * clamp(f, 0.8, 1.2), f];
}

export function dessinerEpingles(ctx, t, T, cam, P, { zoneTitres = () => 1 } = {}) {
  const largeur = cam.w / RAD;
  const visible = clamp((1.6 - largeur) / 0.6);      // seulement à l'échelle de Miami
  if (visible <= 0) return;
  const tSept = T.mot('p1', 'Sept');
  for (const ep of EPINGLES) {
    const c = T.chap[ep.chap];
    const apparition = tSept + 0.12 + (ep.n - 1) * 0.11;
    if (t < apparition) continue;
    const debut = c.precedent + 0.06, fin = c.tenue + 0.3;
    const etat = t < debut ? 0 : t < fin ? 1 : 2;
    const [x, y, f] = ecranEpingle(P, ep);
    const e = ressort(t - apparition, 230, 18);
    // Onde à l'apparition, puis à l'arrivée de la caméra sur le coup.
    const onde = etat === 1 ? prog(t, c.debut + 0.2, 1) : prog(t, apparition, 0.8);
    const marque = ep.n === 7 && t < debut ? '?' : String(ep.n);
    epingleNumero(ctx, x, y, marque, { etat, e, a: visible * zoneTitres(y), onde: onde > 0 && onde < 1 ? onde : -1, f });
  }
}

// Instants d'apparition (pour les bruitages).
export const apparitions = (T) => EPINGLES.map((ep) => T.mot('p1', 'Sept') + 0.12 + (ep.n - 1) * 0.11);
export { NUMERO };
