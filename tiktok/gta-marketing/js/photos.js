// Cartes photo : de vraies photos posées dans l'image comme des objets (coins arrondis, ombre,
// léger liseré beurre, étalonnage commun). Elles naissent d'une épingle de la carte avec un
// ressort, vivent (poussée lente à l'intérieur du cadre), puis rentrent dans l'épingle.
import { W, H, clamp, lerp, prog, E, ressort, style, vis, el, $ } from './outils.js';

const toutes = [];

// Crée la carte (cachée). ratio = largeur / hauteur du cadre ; position (cx, cy) au centre.
export function carte(src, { classe = '' } = {}) {
  const d = el('div', `photo ${classe}`.trim(), `<img src="${src}" alt="">`, $('cartes'));
  const c = { src, el: d, img: d.querySelector('img'), utilisee: false };
  vis(d, 0);
  toutes.push(c);
  return c;
}

// Toutes les cartes non placées pendant une image sont cachées (appelé par main.js).
export function debutImage() { for (const c of toutes) c.utilisee = false; }
export function finImage() { for (const c of toutes) if (!c.utilisee) vis(c.el, 0); }

// Place une carte : centre (x, y), taille (w, h), rotation r (degrés), échelle s, opacité a,
// z (ordre d'empilement), kb (échelle de l'image dans son cadre : poussée lente), rayon des coins.
export function placer(c, { x, y, w, h, r = 0, s = 1, a = 1, z = 1, kb = 1.06, kx = 0, ky = 0, rayon = 26 }) {
  if (a <= 0.002 || s <= 0.002) { vis(c.el, 0); return; }
  c.utilisee = true;
  style(c.el, 'width', `${w.toFixed(1)}px`);
  style(c.el, 'height', `${h.toFixed(1)}px`);
  style(c.el, 'borderRadius', `${rayon}px`);
  style(c.el, 'transform', `translate3d(${(x - w / 2).toFixed(2)}px,${(y - h / 2).toFixed(2)}px,0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`);
  style(c.el, 'zIndex', String(z));
  style(c.img, 'transform', `translate(${kx.toFixed(2)}%,${ky.toFixed(2)}%) scale(${kb.toFixed(4)})`);
  vis(c.el, a);
}

// Trajectoire standard d'une carte : sort de l'épingle `depuis` (x, y écran) à t0 avec un
// ressort, se pose sur `cible`, puis rentre dans l'épingle à t1 (ou s'envole si sortie = 'haut').
// Renvoie les paramètres de placer() pour l'instant t, ou null si la carte n'est pas visible.
export function trajectoire(t, { t0, t1, depuis, cible, k = 170, c = 19, duree = 0.38, sortie = 'epingle' }) {
  if (t < t0) return null;
  const e = ressort(t - t0, k, c);
  const q = E.entree(prog(t, t1, duree));
  if (q >= 1) return null;
  let x = lerp(depuis[0], cible.x, e), y = lerp(depuis[1], cible.y, e);
  let s = lerp(0.1, 1, e), r = lerp(0, cible.r || 0, e), a = clamp(e * 4);
  if (q > 0) {
    if (sortie === 'haut') { y -= q * 900; r += q * 8; a *= 1 - q; }
    else { x = lerp(x, depuis[0], q); y = lerp(y, depuis[1], q); s *= 1 - q * 0.9; a *= 1 - q * q; }
  }
  // Poussée lente dans le cadre : la photo vit pendant qu'on la regarde.
  const vie = clamp((t - t0) / Math.max(0.5, t1 - t0));
  return { x, y, w: cible.w, h: cible.h, r, s, a, z: cible.z || 1, kb: lerp(1.14, 1.04, E.doux(vie)), kx: (cible.kx || 0) * vie, ky: (cible.ky || 0) * vie };
}

// Raccourci : trajectoire + placement. Renvoie true si la carte est visible.
export function animer(c, t, opts) {
  const p = trajectoire(t, opts);
  if (!p) return false;
  placer(c, p);
  return true;
}

// Plein cadre : une carte qui grandit jusqu'à occuper tout l'écran (portail), à partir d'un
// rectangle de départ. f ∈ [0,1]. Utilisé par l'accroche et la boucle de fin.
export function versPleinEcran(rect, f) {
  return { x: lerp(rect.x, W / 2, f), y: lerp(rect.y, H / 2, f), w: lerp(rect.w, W, f), h: lerp(rect.h, H, f), rayon: lerp(rect.rayon ?? 26, 0, f) };
}
