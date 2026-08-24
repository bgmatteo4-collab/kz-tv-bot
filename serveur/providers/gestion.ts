/**
 * Le cycle de vie des providers.
 *
 * Changer de source de données est une action de régie, pas une modification
 * de code : le streamer doit pouvoir se replier sur la saisie manuelle en
 * plein match sans quitter son interface.
 *
 * C'est aussi ici que passe le tampon de décalage. Toute donnée de provider
 * traverse ce fichier avant d'atteindre l'état, et rien d'autre n'y entre.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Magasin } from '../etat/magasin.js';
import type { MagasinSecrets } from '../configuration/secrets.js';
import type { Provider } from './interface.js';
import { ProviderManuel } from './manuel.js';
import { ProviderDemonstration } from './demonstration.js';
import { ProviderApiFootball } from './api-football/index.js';
import { TamponDecalage } from './tampon-decalage.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const MATCH_DEMONSTRATION = join(ICI, 'demonstration', 'match-exemple.json');

export class GestionProviders {
  #magasin: Magasin;
  #secrets: MagasinSecrets;
  #actif: Provider = new ProviderManuel();
  #tampon: TamponDecalage;
  /** Rencontre suivie chez le fournisseur, quand il y en a une. */
  #identifiantFournisseur: string | null = null;

  constructor(magasin: Magasin, secrets: MagasinSecrets) {
    this.#magasin = magasin;
    this.#secrets = secrets;
    this.#tampon = new TamponDecalage(
      () => this.#magasin.etat.decalageVideoSecondes * 1000,
      (donnees) => this.#magasin.appliquerProvider(donnees),
    );
  }

  get nomActif(): string {
    return this.#actif.nom;
  }

  /** Le décalage est retombé à zéro : on ne fait pas attendre le streamer. */
  libererLeTampon(): void {
    this.#tampon.vider();
  }

  definirRencontre(identifiantFournisseur: string): void {
    this.#identifiantFournisseur = identifiantFournisseur;
    this.#tampon.abandonner();
    this.#magasin.suivreRencontre(`api-football:${identifiantFournisseur}`);
  }

  async basculer(nom: string): Promise<void> {
    await this.#actif.arreter();
    this.#tampon.abandonner();

    let suivant: Provider;
    try {
      suivant = this.#construire(nom);
    } catch (erreur) {
      this.#replier(String(erreur instanceof Error ? erreur.message : erreur));
      return;
    }

    this.#actif = suivant;
    this.#magasin.definirProvider({ nom: suivant.nom, manuel: suivant.manuel });

    try {
      await suivant.demarrer((donnees) => this.#tampon.recevoir(donnees));
    } catch (erreur) {
      // Un provider qui ne démarre pas ne doit jamais laisser le streamer sans
      // rien : on retombe sur la saisie manuelle, qui fonctionne toujours.
      this.#replier(String(erreur instanceof Error ? erreur.message : erreur));
    }
  }

  async arreter(): Promise<void> {
    await this.#actif.arreter();
    this.#tampon.abandonner();
  }

  #replier(motif: string): void {
    console.error(`[providers] repli sur la saisie manuelle : ${motif}`);
    this.#actif = new ProviderManuel();
    this.#magasin.definirProvider({ nom: this.#actif.nom, manuel: true });
  }

  #construire(nom: string): Provider {
    switch (nom) {
      case 'démonstration':
      case 'demonstration':
        return new ProviderDemonstration({
          chemin: MATCH_DEMONSTRATION,
          identifiantMatch: this.#magasin.etat.identifiantMatch,
        });

      case 'api-football': {
        const cle = this.#secrets.cleApiFootball;
        if (!cle) throw new Error('aucune clé d’API enregistrée');
        if (!this.#identifiantFournisseur) throw new Error('aucune rencontre sélectionnée');
        return new ProviderApiFootball({
          cle,
          identifiantFournisseur: this.#identifiantFournisseur,
          identifiantMatch: this.#magasin.etat.identifiantMatch,
          surQuota: (requetesRestantes) =>
            this.#magasin.definirConfiguration({ requetesRestantes }),
          surErreurDefinitive: (message) => this.#replier(message),
        });
      }

      default:
        return new ProviderManuel();
    }
  }
}
