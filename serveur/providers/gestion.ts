/**
 * Le cycle de vie des providers.
 *
 * Changer de source de données est une action de régie, pas une modification
 * de code : le streamer doit pouvoir se replier sur la saisie manuelle en
 * plein match sans quitter son interface.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Magasin } from '../etat/magasin.js';
import type { Provider } from './interface.js';
import { ProviderManuel } from './manuel.js';
import { ProviderDemonstration } from './demonstration.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const MATCH_DEMONSTRATION = join(ICI, 'demonstration', 'match-exemple.json');

export class GestionProviders {
  #magasin: Magasin;
  #actif: Provider = new ProviderManuel();

  constructor(magasin: Magasin) {
    this.#magasin = magasin;
  }

  get nomActif(): string {
    return this.#actif.nom;
  }

  async basculer(nom: string): Promise<void> {
    await this.#actif.arreter();

    const suivant = this.#construire(nom);
    this.#actif = suivant;
    this.#magasin.definirProvider({ nom: suivant.nom, manuel: suivant.manuel });

    try {
      await suivant.demarrer((donnees) => this.#magasin.appliquerProvider(donnees));
    } catch (erreur) {
      // Un provider qui ne démarre pas ne doit jamais laisser le streamer sans
      // rien : on retombe sur la saisie manuelle, qui fonctionne toujours.
      console.error(`[providers] « ${nom} » n'a pas démarré, repli sur la saisie manuelle : ${String(erreur)}`);
      this.#actif = new ProviderManuel();
      this.#magasin.definirProvider({ nom: this.#actif.nom, manuel: true });
    }
  }

  async arreter(): Promise<void> {
    await this.#actif.arreter();
  }

  #construire(nom: string): Provider {
    switch (nom) {
      case 'démonstration':
      case 'demonstration':
        return new ProviderDemonstration({
          chemin: MATCH_DEMONSTRATION,
          identifiantMatch: this.#magasin.etat.identifiantMatch,
        });
      default:
        return new ProviderManuel();
    }
  }
}
