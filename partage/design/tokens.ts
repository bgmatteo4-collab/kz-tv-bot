/* Généré par « npm run tokens » depuis outils/tokens-source.ts.
   Ne pas éditer à la main : docs/DESIGN_SYSTEM.md fait autorité. */

export const COULEURS = {
  "surface": "#0E1620",
  "surface-raised": "#18242F",
  "line": "#2B3A48",
  "ink": "#F2F6F9",
  "ink-muted": "#8DA0B0",
  "signal": "#FFB020",
  "live": "#FF4438",
  "good": "#3DD68C"
} as const;
export const ESPACEMENTS = [
  4,
  8,
  12,
  16,
  24,
  32,
  48
] as const;
export const TAILLES_TEXTE = [
  11,
  13,
  15,
  18,
  24,
  32,
  44,
  64
] as const;
export const RAYON = 3;
export const ZONE_SURE = 48;
export const LAME = 3;
export const DUREES = {
  "lame": 120,
  "entree": 220,
  "sortie": 160,
  "valeur": 180,
  "interaction": 80,
  "cascade": 40,
  "sequence": 80,
  "pouls": 900
} as const;
export const COURBES = {
  "entree": "cubic-bezier(.16,1,.3,1)",
  "sortie": "cubic-bezier(.4,0,1,1)",
  "valeur": "ease-out",
  "interaction": "ease-out"
} as const;
export const CANEVAS = {
  "largeur": 1920,
  "hauteur": 1080
} as const;
