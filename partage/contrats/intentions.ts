/**
 * Ce que la régie envoie au serveur. Des intentions, jamais des états : la
 * régie déclare ce qu'elle veut, le serveur décide de ce que ça produit.
 */
import type { Cote, NomScene, Statut } from './etat.js';

export type Intention =
  | { type: 'definir-competition'; nom: string }
  | { type: 'definir-equipe'; cote: Cote; nom: string; abrege: string; couleur: string }
  | { type: 'definir-score'; cote: Cote; score: number }
  | { type: 'ajuster-score'; cote: Cote; delta: number }
  | { type: 'definir-statut'; statut: Statut }
  | { type: 'demarrer-chrono' }
  | { type: 'arreter-chrono' }
  | { type: 'definir-chrono'; ecouleMs: number }
  | { type: 'definir-temps-additionnel'; minutes: number }
  | { type: 'definir-decalage-video'; secondes: number }
  | { type: 'definir-scene'; scene: NomScene }
  | { type: 'definir-coup-d-envoi'; horodatageMs: number | null }
  /** La bascule du terrain d'une équipe à l'autre. */
  | { type: 'afficher-camp'; cote: Cote }
  | { type: 'basculer-camp' }
  | { type: 'liberer-verrou'; chemin: string }
  | { type: 'liberer-tous-les-verrous' }
  | { type: 'definir-provider'; nom: string }
  /**
   * La clé ne transite que dans ce sens : régie → serveur. Elle n'est jamais
   * rediffusée, jamais écrite dans l'état, jamais versionnée.
   */
  | { type: 'definir-cle-api'; cle: string }
  | { type: 'effacer-cle-api' }
  | { type: 'suivre-rencontre'; identifiantFournisseur: string }
  | { type: 'nouveau-match' };

export type TypeIntention = Intention['type'];
