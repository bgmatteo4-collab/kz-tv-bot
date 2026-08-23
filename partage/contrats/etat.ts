/**
 * L'état du match. Le serveur en est l'unique détenteur ; les clients ne font
 * que l'afficher. Toute valeur affichable à l'antenne vient d'ici.
 */

/** Les deux côtés d'une rencontre. Sert d'index partout dans le code. */
export type Cote = 'domicile' | 'exterieur';

export const COTES: readonly Cote[] = ['domicile', 'exterieur'];

/**
 * Les phases d'un match de football. Chacune a un affichage distinct : ce ne
 * sont pas des cas limites, elles arrivent à chaque match.
 */
export type Statut =
  | 'avant-match'
  | 'premiere-periode'
  | 'mi-temps'
  | 'seconde-periode'
  | 'fin-du-temps-reglementaire'
  | 'prolongation-1'
  | 'pause-prolongation'
  | 'prolongation-2'
  | 'tirs-au-but'
  | 'termine'
  | 'suspendu';

export interface Equipe {
  nom: string;
  /** Trois lettres, pour les affichages contraints. */
  abrege: string;
  /**
   * Couleur du club. N'apparaît que sur des surfaces dédiées et bornées
   * (pastille d'équipe), jamais sur le châssis d'un module.
   */
  couleur: string;
  score: number;
}

/**
 * Le chrono ne se stocke pas comme un nombre de secondes qu'on décrémente :
 * il se stocke comme une référence, et le client interpole entre deux
 * réceptions. Les horloges dérivent, et l'overlay dans OBS peut être ralenti
 * par l'encodage — compter localement produirait un chrono faux.
 */
export interface Chrono {
  /** Temps de jeu écoulé, en millisecondes, au moment de la référence. */
  ecouleMs: number;
  /** Horodatage serveur auquel `ecouleMs` était vrai. */
  referenceMs: number;
  enMarche: boolean;
  /** Minutes de temps additionnel annoncées. 0 = aucune annonce. */
  tempsAdditionnel: number;
}

/**
 * Marque une valeur corrigée à la main par la régie. Tant que le verrou tient,
 * aucun provider ne peut écraser le champ. C'est l'erreur la plus coûteuse
 * possible dans ce produit : une correction annulée trente secondes plus tard,
 * en direct.
 */
export interface Verrou {
  /** Chemin du champ, ex. « domicile.score ». */
  chemin: string;
  /** Horodatage serveur de la correction. */
  posseeMs: number;
}

export interface InfoProvider {
  nom: string;
  /**
   * Un provider manuel ne pousse rien : la régie est la source de vérité des
   * données. Aucun verrou n'est posé dans ce mode — il n'y aurait rien à
   * protéger.
   */
  manuel: boolean;
}

/** Les modules d'overlay connus. Le jalon 1 n'en implémente qu'un. */
export type NomModule = 'bandeau-score';

export interface EtatModule {
  visible: boolean;
}

export interface EtatMatch {
  /**
   * Identifiant de la rencontre. Les données se rattachent à lui, jamais à un
   * ordre d'arrivée ou à un index.
   */
  identifiantMatch: string;
  competition: string;
  domicile: Equipe;
  exterieur: Equipe;
  statut: Statut;
  chrono: Chrono;
  /**
   * Décalage entre le flux vidéo du streamer et le match réel, en secondes.
   * Se soustrait au temps réel : le chrono affiché est en temps vidéo, jamais
   * en temps réel. Le tampon qui retarde les données provider s'appuiera
   * dessus au jalon 2.
   */
  decalageVideoSecondes: number;
  modules: Record<NomModule, EtatModule>;
  verrous: Verrou[];
  provider: InfoProvider;
  /** Horodatage serveur de la dernière donnée reçue d'un provider. */
  derniereDonneeMs: number | null;
}
