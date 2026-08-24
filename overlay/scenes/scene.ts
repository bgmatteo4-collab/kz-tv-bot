/**
 * Ce qu'est une scène.
 *
 * Une scène occupe le centre du cadre. Il y en a toujours exactement une à
 * l'antenne : aucune vidéo ne passe sous l'overlay, donc « aucune scène »
 * signifierait un rectangle noir devant le public.
 *
 * La scène caméra est le cas particulier qui rend cette règle tenable : elle ne
 * dessine rien, et le centre redevient réellement transparent pour qu'OBS y
 * compose la webcam.
 */
import type { EtatMatch } from '../../partage/contrats/etat.js';

export interface ContexteRendu {
  /** L'heure du serveur vue d'ici, base de toute interpolation. */
  maintenantServeurMs: () => number;
  mouvementReduit: boolean;
}

export interface Scene {
  /** Construit le DOM de la scène, à froid. Le régisseur l'anime. */
  construire(etat: EtatMatch, contexte: ContexteRendu): HTMLElement;
  rafraichir(etat: EtatMatch, contexte: ContexteRendu, anime: boolean): void;
  /** Appelé une fois par seconde. Sert au temps, jamais à du rendu continu. */
  battre?(contexte: ContexteRendu): void;
  detruire?(): void;
}
