/**
 * La déclaration machine des tokens.
 *
 * `docs/DESIGN_SYSTEM.md` reste l'autorité pour un humain ; ce fichier en est
 * la transcription exploitable par le build. Les deux ne peuvent pas diverger
 * en silence : `tests/tokens.test.ts` relit le document et compare.
 */

export const COULEURS = {
  surface: '#0E1620',
  'surface-raised': '#18242F',
  line: '#2B3A48',
  ink: '#F2F6F9',
  'ink-muted': '#8DA0B0',
  signal: '#FFB020',
  live: '#FF4438',
  good: '#3DD68C',
} as const;

/** Opacité minimale d'un fond de module posé sur la vidéo. */
export const OPACITE_SURFACE = 0.94;

/** Multiples de 4. Rien entre deux valeurs. */
export const ESPACEMENTS = [4, 8, 12, 16, 24, 32, 48] as const;

/** Échelle typographique, base 1920×1080. Le 64 est réservé au score. */
export const TAILLES_TEXTE = [11, 13, 15, 18, 24, 32, 44, 64] as const;

export const RAYON = 3;

/** Zones sûres OBS : rien de vital au-delà, les plateformes recadrent. */
export const ZONE_SURE = 48;

export const OMBRE = '0 8px 24px rgba(0,0,0,.45)';

/** Épaisseur de la lame, la signature du produit. */
export const LAME = 3;

export const DUREES = {
  /** Pose de la lame, avant que le corps se déplie. */
  lame: 120,
  entree: 220,
  sortie: 160,
  valeur: 180,
  interaction: 80,
  /** Décalage entre deux éléments d'un même module qui se révèlent. */
  cascade: 40,
  /** Décalage entre deux modules : jamais deux entrées simultanées. */
  sequence: 80,
  /** Pouls de la lame, une fois par minute de jeu. */
  pouls: 900,
} as const;

export const COURBES = {
  entree: 'cubic-bezier(.16,1,.3,1)',
  sortie: 'cubic-bezier(.4,0,1,1)',
  valeur: 'ease-out',
  interaction: 'ease-out',
} as const;

/** Canevas de référence. La mise à l'échelle se fait par transform. */
export const CANEVAS = { largeur: 1920, hauteur: 1080 } as const;
