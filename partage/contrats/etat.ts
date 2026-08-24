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

/**
 * Ce que les clients ont le droit de savoir de la configuration.
 *
 * La clé d'API n'est pas ici, et n'y sera jamais : l'état est diffusé à
 * l'overlay, qui tourne dans une source navigateur pendant que le stream
 * enregistre. Un secret n'a rien à faire sur ce canal. Le serveur garde la clé
 * pour lui et n'expose que le fait qu'elle existe.
 */
export interface ConfigurationPublique {
  cleApiConfiguree: boolean;
  /** Requêtes restantes annoncées par le fournisseur, si connu. */
  requetesRestantes: number | null;
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

/**
 * Les scènes qui peuvent occuper le centre du cadre.
 *
 * Il n'y a pas d'état « rien à l'antenne » : aucune vidéo ne passe sous
 * l'overlay, donc une scène absente serait un rectangle noir devant le public.
 * C'est pour ça que c'est une valeur unique et pas une liste de visibilités.
 *
 * - `camera` : le centre est réellement transparent, OBS y compose la webcam.
 * - `ouverture` : avant-match, compte à rebours vers le coup d'envoi.
 */
export type NomScene = 'camera' | 'ouverture';

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
  /** La scène à l'antenne. Il y en a toujours une. */
  scene: NomScene;
  /** Coup d'envoi annoncé, pour le compte à rebours. */
  coupDEnvoiMs: number | null;
  verrous: Verrou[];
  provider: InfoProvider;
  configuration: ConfigurationPublique;
  /** Horodatage serveur de la dernière donnée reçue d'un provider. */
  derniereDonneeMs: number | null;
}
