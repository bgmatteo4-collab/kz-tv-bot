// Habillage fixe : l'onglet « Dossier » (avec la progression des 7 coups) et la pastille de
// légende (lieu, crédit des photos, ou coordonnées en direct pendant les vols).
import { W, clamp, tw, ressort, style, vis, $ } from './outils.js';
import { enLonLat, RAD } from './carte.js';

let points = [];
export function preparerHud() {
  const etapes = $('dossier').querySelector('.d-etapes');
  points = [...etapes.querySelectorAll('i')];
}

// faits : nombre de coups terminés (0 → 7), courant : numéro du coup en cours (0 = aucun).
export function majDossier(t, { faits = 0, courant = 0, entree = 0.08 } = {}) {
  const o = ressort(t - entree, 170, 17);
  style($('dossier'), 'transform', `translate3d(${((o - 1) * 100).toFixed(2)}px,0,0)`);
  points.forEach((p, i) => {
    const n = i + 1;
    p.className = n <= faits ? 'fait' : n === courant ? 'courant' : '';
  });
}

// Pastille de légende. contenu : chaîne HTML (« LIGNE\n<small>petite ligne</small> »).
export function majLegende(contenu, a, haut = 1262) {
  const L = $('legende');
  if (contenu !== null && L.innerHTML !== contenu) L.innerHTML = contenu;
  style(L, 'top', `${haut}px`);
  vis(L, a);
}

// Coordonnées du centre de la caméra et échelle, pour les vols.
export function coordonnees(cam) {
  const [lon, lat] = enLonLat(cam.x, cam.y);
  const kmPx = (6371 * Math.cos(lat * RAD)) / (W / cam.w);
  const pas = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 300, 500, 1000, 2000].find((d) => d / kmPx >= 90) || 2000;
  const echelle = pas < 1 ? `${pas * 1000} M` : `${pas} KM`;
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(4)}° ${lon < 0 ? 'O' : 'E'}\n`
    + `<small><span class="echelle" style="width:${(pas / kmPx).toFixed(0)}px"></span>${echelle}</small>`;
}
