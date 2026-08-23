/**
 * Ce que la régie envoie au serveur. Des intentions, jamais des états : la
 * régie déclare ce qu'elle veut, le serveur décide de ce que ça produit.
 */
import type { Cote, NomModule, Statut } from './etat.js';

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
  | { type: 'afficher-module'; module: NomModule }
  | { type: 'masquer-module'; module: NomModule }
  | { type: 'liberer-verrou'; chemin: string }
  | { type: 'liberer-tous-les-verrous' }
  | { type: 'definir-provider'; nom: string }
  | { type: 'nouveau-match' };

export type TypeIntention = Intention['type'];
