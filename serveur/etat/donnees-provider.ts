/**
 * Ce qu'un provider a le droit de pousser dans l'état.
 *
 * La forme est définie ici, du côté de l'état, et pas du côté des providers :
 * c'est l'état qui décide de ce qu'il accepte. Tout est facultatif — un
 * provider n'a aucune obligation de tout connaître.
 */
import type { Statut } from '../../partage/contrats/etat.js';

export interface DonneesEquipe {
  nom?: string;
  abrege?: string;
  couleur?: string;
  score?: number;
}

export interface DonneesProvider {
  /**
   * Identifiant de la rencontre à laquelle ces données se rapportent. Des
   * données qui ne correspondent pas au match courant sont ignorées : on ne
   * se fie jamais à l'ordre d'arrivée.
   */
  identifiantMatch: string;
  competition?: string;
  domicile?: DonneesEquipe;
  exterieur?: DonneesEquipe;
  statut?: Statut;
  chronoEcouleMs?: number;
  /**
   * Minute de jeu, quand la source ne connaît que la minute — c'est le cas
   * d'API-Football. Volontairement distincte de `chronoEcouleMs` : la convertir
   * en millisecondes ferait croire à une précision à la seconde, et le chrono
   * sauterait à chaque interrogation.
   */
  chronoMinute?: number;
  chronoEnMarche?: boolean;
  tempsAdditionnel?: number;
  /** Heure du coup d'envoi annoncée par le fournisseur. */
  coupDEnvoiMs?: number;
}
