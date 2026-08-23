/**
 * Ce qu'est un module d'overlay.
 *
 * Chaque module est indépendant : affichable, masquable et testable seul. Il
 * ne connaît ni le WebSocket, ni les autres modules, ni l'ordre dans lequel
 * il entre — c'est la scène qui orchestre.
 */
import type { EtatMatch, NomModule } from '../../partage/contrats/etat.js';

/** Le côté par lequel le module entre. Il décide où se pose la lame. */
export type CoteEntree = 'gauche' | 'droite';

export interface ContexteRendu {
  /** L'heure du serveur vue d'ici, base de toute interpolation. */
  maintenantServeurMs: () => number;
  /** Le spectateur a-t-il demandé moins de mouvement ? */
  mouvementReduit: boolean;
}

export interface ModuleOverlay {
  readonly nom: NomModule;
  readonly coteEntree: CoteEntree;
  /** Construit le DOM du module, à froid. La scène s'occupe de l'animer. */
  construire(etat: EtatMatch, contexte: ContexteRendu): HTMLElement;
  /** Répercute un nouvel état. `anime` est faux lors d'une resynchronisation. */
  rafraichir(etat: EtatMatch, contexte: ContexteRendu, anime: boolean): void;
  /** Appelé une fois par seconde. Sert au chrono, jamais à du rendu continu. */
  battre?(contexte: ContexteRendu): void;
  detruire?(): void;
}
