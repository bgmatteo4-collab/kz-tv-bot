/**
 * Les verrous de correction manuelle.
 *
 * Quand la régie corrige une valeur à la main, le champ est marqué et aucun
 * provider ne peut plus l'écraser. C'est l'erreur la plus coûteuse possible
 * dans ce produit : un score rétabli par l'API trente secondes après que le
 * streamer l'a corrigé, en plein direct, devant tout le monde.
 *
 * Les verrous ne sont posés que lorsqu'un provider automatique est actif. En
 * saisie manuelle, la régie est déjà la seule source : il n'y aurait rien à
 * protéger et la liste se remplirait pour rien.
 */
import type { EtatMatch, Verrou } from '../../partage/contrats/etat.js';

/** Chemins verrouillables. Un chemin inconnu est refusé à la compilation. */
export type CheminVerrouillable =
  | 'competition'
  | 'statut'
  | 'chrono'
  | 'domicile.score'
  | 'exterieur.score'
  | 'domicile.identite'
  | 'exterieur.identite';

export function estVerrouille(etat: EtatMatch, chemin: CheminVerrouillable): boolean {
  return etat.verrous.some((verrou) => verrou.chemin === chemin);
}

/**
 * Pose un verrou, sauf en saisie manuelle. Idempotent : reposer un verrou
 * existant rafraîchit son horodatage plutôt que d'empiler des doublons.
 */
export function poser(
  verrous: readonly Verrou[],
  chemin: CheminVerrouillable,
  maintenantMs: number,
): Verrou[] {
  const sansCeChemin = verrous.filter((verrou) => verrou.chemin !== chemin);
  return [...sansCeChemin, { chemin, posseeMs: maintenantMs }];
}

export function liberer(verrous: readonly Verrou[], chemin: string): Verrou[] {
  return verrous.filter((verrou) => verrou.chemin !== chemin);
}
