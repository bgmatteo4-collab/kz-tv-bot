// lib/habillage.js — grain de pellicule, vignette et bandes cinéma (optionnelles).
//
// Tout est multiplié par une enveloppe qui vaut 0 à t = 0 et à t = durée (contrat de
// raccord : l'image de raccord n'a ni grain ni vignette) et 1 au-delà de « bord » secondes.
//
// API
//   const hab = creerHabillage(stage, { duree, grain: 0.07, vignette: 0.6, bandes: 0, bord: 0.5 });
//   hab.maj(t, { grain, vignette, bandes })   // valeurs facultatives qui remplacent celles de départ
//       grain     opacité du grain d'aperçu (0.05 – 0.12 ; en rendu : voir GRAIN ci-dessous)
//       vignette  0 – 1
//       bandes    hauteur de chaque bande noire en px ; BANDES_239 = format 2,39:1 (138 px)
//   presence(t, duree, bord)  l'enveloppe elle-même (pour d'autres calques)
//
// GRAIN : en rendu (?render), le grain de la page est COUPÉ et c'est render.js qui l'ajoute
// avec ffmpeg (filtre noise, après le flou de mouvement, option --grain, 6 par défaut).
// Raison : un grain dans la page coûte ~90 ms de capture PNG par image (le bruit ne se
// compresse pas). Le grain de la page ne sert qu'à l'aperçu dans le navigateur.

import { E, tw, h2, mulberry, FPS, RENDU } from './core.js';

export const BANDES_239 = Math.round((1080 - 1920 / 2.39) / 2);

export function presence(t, duree, bord = 0.5) {
  return Math.min(tw(t, 0, bord, E.inOut), 1 - tw(t, duree - bord, bord, E.inOut));
}

function tuileGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const d = x.createImageData(256, 256);
  const rnd = mulberry(7);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = (rnd() * 255) | 0;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return c.toDataURL();
}

export function creerHabillage(stage, o = {}) {
  const base = { grain: 0.07, vignette: 0.6, bandes: 0, bord: 0.5, ...o };
  const vig = document.createElement('div'); vig.className = 'vignette';
  const haut = document.createElement('div'); haut.className = 'bande haut';
  const bas = document.createElement('div'); bas.className = 'bande bas';
  const grain = document.createElement('div'); grain.className = 'grain';
  if (!RENDU) grain.style.backgroundImage = `url(${tuileGrain()})`;
  else grain.style.display = 'none';
  stage.append(vig, haut, bas, grain);

  function maj(t, v = {}) {
    const s = { ...base, ...v };
    const p = presence(t, s.duree ?? base.duree, s.bord);
    const f = Math.round(t * FPS);
    grain.style.opacity = RENDU ? 0 : s.grain * p;
    grain.style.transform = `translate(${Math.floor(h2(f, 1) * 256)}px, ${Math.floor(h2(f, 2) * 256)}px)`;
    vig.style.opacity = s.vignette * p;
    const b = `${(s.bandes * p).toFixed(2)}px`;
    haut.style.height = b; bas.style.height = b;
  }
  return { maj, el: { vignette: vig, grain, haut, bas } };
}
