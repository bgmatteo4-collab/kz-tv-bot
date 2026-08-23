/**
 * L'état de la régie, côté client.
 *
 * Elle ne détient rien : elle tient une copie de ce que le serveur pousse, et
 * elle envoie des intentions. Aucune valeur affichée ici n'est calculée
 * localement — le serveur fait autorité, y compris quand ça semble évident.
 */
import type { EtatMatch } from '../partage/contrats/etat.js';
import type { Intention } from '../partage/contrats/intentions.js';
import { adresseTempsReel } from '../partage/contrats/config.js';
import { Liaison, type StatutConnexion } from '../partage/liaison/connexion.js';

class RegieCliente {
  etat = $state<EtatMatch | null>(null);
  statut = $state<StatutConnexion>('connexion');
  /** Réévalué à la seconde, pour que l'âge de la donnée avance tout seul. */
  maintenantMs = $state(Date.now());

  #liaison: Liaison;

  constructor() {
    this.#liaison = new Liaison({
      adresse: adresseTempsReel(window.location),
      surEtat: (etat) => {
        this.etat = etat;
      },
      surStatut: (statut) => {
        this.statut = statut;
      },
    });
  }

  demarrer(): void {
    this.#liaison.connecter();
    setInterval(() => {
      this.maintenantMs = this.#liaison.maintenantServeurMs();
    }, 1000);
  }

  envoyer(intention: Intention): void {
    this.#liaison.envoyer(intention);
  }

  maintenantServeurMs(): number {
    return this.#liaison.maintenantServeurMs();
  }
}

export const regie = new RegieCliente();
