/**
 * Lecture du chrono, partagée entre le serveur et les deux clients.
 *
 * Elle vit dans `partage/` et pas dans un client : c'est une seule et même
 * façon de lire l'état, pas une valeur qu'un client se calculerait dans son
 * coin. Le client interpole entre deux réceptions, il n'invente rien.
 */
import type { Chrono, EtatMatch, Statut } from './etat.js';

const MINUTE_MS = 60_000;

/** Phases pendant lesquelles le temps de jeu s'écoule et s'affiche. */
const PHASES_AVEC_HORLOGE: readonly Statut[] = [
  'premiere-periode',
  'seconde-periode',
  'prolongation-1',
  'prolongation-2',
];

/**
 * Temps de jeu auquel commence chaque phase. Le chrono d'un match de football
 * est continu : la seconde période démarre à 45:00, pas à 0.
 */
const DEBUT_DE_PHASE_MS: Partial<Record<Statut, number>> = {
  'premiere-periode': 0,
  'seconde-periode': 45 * MINUTE_MS,
  'prolongation-1': 90 * MINUTE_MS,
  'prolongation-2': 105 * MINUTE_MS,
};

const LIBELLE_DE_PHASE: Record<Statut, string> = {
  'avant-match': 'AVANT MATCH',
  'premiere-periode': '1re MI-TEMPS',
  'mi-temps': 'MI-TEMPS',
  'seconde-periode': '2e MI-TEMPS',
  'fin-du-temps-reglementaire': 'FIN DU TEMPS RÉGLEMENTAIRE',
  'prolongation-1': 'PROLONGATION 1',
  'pause-prolongation': 'PAUSE',
  'prolongation-2': 'PROLONGATION 2',
  'tirs-au-but': 'TAB',
  termine: 'TERMINÉ',
  suspendu: 'SUSPENDU',
};

export interface AffichageChrono {
  /** « 78:24 », ou null pour une phase sans horloge (mi-temps, TAB…). */
  horloge: string | null;
  /** « +3 », ou null si aucun temps additionnel n'est annoncé. */
  additionnel: string | null;
  /** Libellé de phase, en majuscules. */
  phase: string;
  /** Le temps de jeu s'écoule-t-il en ce moment ? Commande le pouls de la lame. */
  enMarche: boolean;
  /** Minute de jeu entamée, pour déclencher le pouls une fois par minute. */
  minuteDeJeu: number;
  /** Temps de jeu affiché, en millisecondes. */
  ecouleMs: number;
}

/** Le temps de jeu commence-t-il à une valeur connue pour cette phase ? */
export function debutDePhase(statut: Statut): number | null {
  return DEBUT_DE_PHASE_MS[statut] ?? null;
}

export function phaseAvecHorloge(statut: Statut): boolean {
  return PHASES_AVEC_HORLOGE.includes(statut);
}

/** « 78:24 ». Les minutes ne sont pas rembourrées, les secondes le sont. */
export function formaterHorloge(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const secondes = total % 60;
  return `${minutes}:${String(secondes).padStart(2, '0')}`;
}

/**
 * Temps de jeu à afficher, en temps vidéo.
 *
 * Le décalage du flux se soustrait au temps réel : si le match est à 78:00 et
 * que le streamer commente avec 40 s de retard, l'antenne doit lire 77:20.
 * C'est la seule valeur cohérente avec ce que voit le public.
 *
 * @param maintenantMs Horloge du serveur, corrigée de la dérive côté client.
 */
export function tempsDeJeuMs(etat: EtatMatch, maintenantMs: number): number {
  return Math.max(0, tempsDeJeuBrutMs(etat.chrono, maintenantMs) - etat.decalageVideoSecondes * 1000);
}

/**
 * Temps de jeu réel, sans le décalage d'affichage.
 *
 * C'est cette valeur qu'on confronte à ce que dit un provider : il parle du
 * match, pas du flux que regarde le streamer.
 */
export function tempsDeJeuBrutMs(chrono: Chrono, maintenantMs: number): number {
  return chrono.enMarche
    ? chrono.ecouleMs + (maintenantMs - chrono.referenceMs)
    : chrono.ecouleMs;
}

export function lireChrono(etat: EtatMatch, maintenantMs: number): AffichageChrono {
  const ecouleMs = tempsDeJeuMs(etat, maintenantMs);
  const avecHorloge = phaseAvecHorloge(etat.statut);
  const additionnel = etat.chrono.tempsAdditionnel;

  return {
    horloge: avecHorloge ? formaterHorloge(ecouleMs) : null,
    additionnel: avecHorloge && additionnel > 0 ? `+${additionnel}` : null,
    phase: LIBELLE_DE_PHASE[etat.statut],
    enMarche: etat.chrono.enMarche && avecHorloge,
    minuteDeJeu: Math.floor(ecouleMs / MINUTE_MS),
    ecouleMs,
  };
}
