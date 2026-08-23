/**
 * Les messages qui circulent sur le WebSocket.
 *
 * Le serveur ne diffuse jamais de différentiel : chaque message porte l'état
 * complet. Un état de match pèse moins de deux kilo-octets, et ça supprime
 * toute une classe de bugs de resynchronisation — celle qui a tué la version
 * précédente du projet.
 */
import type { EtatMatch } from './etat.js';
import type { Intention } from './intentions.js';

/**
 * Pourquoi le client reçoit cet état.
 *
 * - `synchronisation` : première connexion ou reconnexion. Le client se
 *   réaligne d'un coup, sans rejouer les animations d'entrée.
 * - `mise-a-jour` : changement en cours de direct. Les animations jouent.
 */
export type RaisonEtat = 'synchronisation' | 'mise-a-jour';

export interface MessageEtat {
  type: 'etat';
  /**
   * Croît strictement. Un client qui reçoit un numéro plus ancien que le
   * sien ignore le message — il ne l'applique jamais.
   */
  sequence: number;
  /**
   * Horloge du serveur à l'émission. Le client s'en sert pour corriger la
   * dérive entre son horloge et celle du serveur avant d'interpoler le chrono.
   */
  horodatageServeur: number;
  raison: RaisonEtat;
  etat: EtatMatch;
}

export type MessageServeur = MessageEtat;

export interface MessageIntention {
  type: 'intention';
  intention: Intention;
}

export type MessageClient = MessageIntention;
