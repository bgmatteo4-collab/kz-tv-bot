/**
 * La liaison temps réel, partagée par l'overlay et la régie.
 *
 * Elle vit dans `partage/` pour une raison précise : la reconnexion est ce
 * qui a fait échouer la version précédente du projet. Deux implémentations
 * séparées, c'est deux comportements qui divergent, et la divergence se
 * découvre en direct.
 *
 * Ce que fait cette classe, et qu'aucun appelant n'a à refaire :
 * reconnexion silencieuse avec backoff plafonné, rejet des messages périmés
 * par numéro de séquence, et correction de la dérive entre l'horloge du
 * client et celle du serveur.
 */
import type { EtatMatch } from '../contrats/etat.js';
import type { Intention } from '../contrats/intentions.js';
import type { MessageClient, MessageServeur, RaisonEtat } from '../contrats/messages.js';

export type StatutConnexion = 'connexion' | 'connecte' | 'reconnexion' | 'perdu';

/** Premier délai de reconnexion, doublé à chaque échec. */
const DELAI_INITIAL_MS = 250;
/** Plafond imposé par l'architecture : au-delà, le direct attend trop. */
const DELAI_MAXIMUM_MS = 5000;
/** Nombre de tentatives avant d'annoncer la perte plutôt que la reconnexion. */
const TENTATIVES_AVANT_PERTE = 5;

export interface OptionsLiaison {
  adresse: string;
  surEtat: (etat: EtatMatch, raison: RaisonEtat) => void;
  surStatut?: (statut: StatutConnexion) => void;
}

export class Liaison {
  #options: OptionsLiaison;
  #socket: WebSocket | null = null;
  #sequenceVue = -1;
  #decalageHorlogeMs = 0;
  #tentatives = 0;
  #minuterie: ReturnType<typeof setTimeout> | null = null;
  #ferme = false;
  #statut: StatutConnexion = 'connexion';

  constructor(options: OptionsLiaison) {
    this.#options = options;
  }

  get statut(): StatutConnexion {
    return this.#statut;
  }

  /**
   * L'heure du serveur, vue d'ici. Le chrono s'interpole sur cette base et
   * non sur `Date.now()` : les horloges dérivent, et l'overlay dans OBS peut
   * être ralenti par l'encodage.
   */
  maintenantServeurMs(): number {
    return Date.now() + this.#decalageHorlogeMs;
  }

  connecter(): void {
    this.#ferme = false;
    this.#ouvrir();
  }

  fermer(): void {
    this.#ferme = true;
    if (this.#minuterie) clearTimeout(this.#minuterie);
    this.#minuterie = null;
    this.#socket?.close();
    this.#socket = null;
  }

  envoyer(intention: Intention): void {
    if (this.#socket?.readyState !== WebSocket.OPEN) return;
    const message: MessageClient = { type: 'intention', intention };
    this.#socket.send(JSON.stringify(message));
  }

  #ouvrir(): void {
    const socket = new WebSocket(this.#options.adresse);
    this.#socket = socket;

    socket.addEventListener('open', () => {
      this.#tentatives = 0;
      this.#annoncer('connecte');
    });

    socket.addEventListener('message', (evenement) => {
      this.#recevoir(evenement.data as string);
    });

    socket.addEventListener('close', () => {
      if (this.#ferme) return;
      this.#reprogrammer();
    });

    // Une erreur est toujours suivie d'une fermeture : on laisse `close`
    // piloter la reconnexion, sans quoi on programmerait deux tentatives.
    socket.addEventListener('error', () => socket.close());
  }

  #recevoir(brut: string): void {
    let message: MessageServeur;
    try {
      message = JSON.parse(brut) as MessageServeur;
    } catch {
      return;
    }
    if (message.type !== 'etat') return;

    // Une synchronisation vient toujours d'une connexion neuve : elle fait
    // autorité même si son numéro est plus petit. Sans ça, un serveur
    // redémarré — dont la séquence repart de zéro — serait ignoré pour de
    // bon, et l'overlay resterait figé sur un match terminé.
    if (message.raison === 'synchronisation') {
      this.#sequenceVue = message.sequence;
    } else if (message.sequence <= this.#sequenceVue) {
      return;
    } else {
      this.#sequenceVue = message.sequence;
    }

    this.#decalageHorlogeMs = message.horodatageServeur - Date.now();
    this.#options.surEtat(message.etat, message.raison);
  }

  #reprogrammer(): void {
    this.#socket = null;
    this.#tentatives += 1;
    this.#annoncer(this.#tentatives > TENTATIVES_AVANT_PERTE ? 'perdu' : 'reconnexion');

    const delai = Math.min(DELAI_INITIAL_MS * 2 ** (this.#tentatives - 1), DELAI_MAXIMUM_MS);
    // Un peu de dispersion : deux clients qui reviennent ne tapent pas
    // exactement à la même milliseconde.
    const dispersion = Math.random() * 100;
    this.#minuterie = setTimeout(() => this.#ouvrir(), delai + dispersion);
  }

  #annoncer(statut: StatutConnexion): void {
    if (this.#statut === statut) return;
    this.#statut = statut;
    this.#options.surStatut?.(statut);
  }
}
