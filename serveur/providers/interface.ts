/**
 * L'interface des providers de données.
 *
 * Un provider = un fichier. On doit pouvoir changer de fournisseur sans
 * toucher au reste du code : rien en dehors de ce dossier ne connaît le nom
 * d'une API, une URL ou une clé.
 */
import type { DonneesProvider } from '../etat/donnees-provider.js';

export type PousserDonnees = (donnees: DonneesProvider) => void;

export interface Provider {
  readonly nom: string;
  /**
   * Un provider manuel ne pousse rien de lui-même : la régie est la source.
   * C'est le mode de repli quand l'API tombe en plein match, et le défaut
   * pour les matchs non couverts.
   */
  readonly manuel: boolean;
  demarrer(pousser: PousserDonnees): Promise<void> | void;
  arreter(): Promise<void> | void;
}
