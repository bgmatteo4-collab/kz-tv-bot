/**
 * Le magasin : l'unique détenteur de l'état.
 *
 * Il porte le numéro de séquence, applique les intentions et les données
 * provider, et prévient ses abonnés. Il ne connaît ni le WebSocket ni les
 * clients — c'est ce qui le rend testable sans réseau.
 */
import type {
  ConfigurationPublique,
  EtatMatch,
  InfoProvider,
} from '../../partage/contrats/etat.js';
import type { Intention } from '../../partage/contrats/intentions.js';
import type { DonneesProvider } from './donnees-provider.js';
import { appliquerDonneesProvider } from './appliquer-provider.js';
import { etatInitial } from './etat-initial.js';
import { reduire } from './reducteur.js';

export type Abonne = (etat: EtatMatch, sequence: number) => void;

export interface OptionsMagasin {
  /** Horloge injectable, pour que les tests n'attendent pas de vraies minutes. */
  maintenant?: () => number;
  etatDeDepart?: EtatMatch;
  provider?: InfoProvider;
}

const PROVIDER_PAR_DEFAUT: InfoProvider = { nom: 'manuel', manuel: true };

export class Magasin {
  #etat: EtatMatch;
  #sequence = 0;
  #abonnes = new Set<Abonne>();
  #maintenant: () => number;

  constructor(options: OptionsMagasin = {}) {
    this.#maintenant = options.maintenant ?? (() => Date.now());
    const provider = options.provider ?? PROVIDER_PAR_DEFAUT;
    this.#etat = options.etatDeDepart ?? etatInitial(this.#maintenant(), provider);
  }

  get etat(): EtatMatch {
    return this.#etat;
  }

  get sequence(): number {
    return this.#sequence;
  }

  maintenantMs(): number {
    return this.#maintenant();
  }

  s_abonner(abonne: Abonne): () => void {
    this.#abonnes.add(abonne);
    return () => this.#abonnes.delete(abonne);
  }

  /** Applique une intention venue de la régie. Elle prime toujours. */
  appliquerIntention(intention: Intention): EtatMatch {
    const suivant = reduire(this.#etat, intention, this.#maintenant());
    return this.#publier(suivant);
  }

  /**
   * Applique des données provider. Les champs corrigés à la main sont
   * préservés, et des données destinées à un autre match sont rejetées.
   */
  appliquerProvider(donnees: DonneesProvider): EtatMatch {
    const maintenant = this.#maintenant();
    const resultat = appliquerDonneesProvider(this.#etat, donnees, maintenant);
    if (!resultat.retenu) {
      console.warn(
        `[magasin] données ignorées : elles portent le match ${donnees.identifiantMatch}, ` +
          `le match courant est ${this.#etat.identifiantMatch}`,
      );
      return this.#etat;
    }
    if (resultat.ignores.length > 0) {
      console.info(`[magasin] champs corrigés à la main, non écrasés : ${resultat.ignores.join(', ')}`);
    }
    return this.#publier(resultat.etat);
  }

  /** Change le provider actif sans toucher aux données du match en cours. */
  definirProvider(provider: InfoProvider): EtatMatch {
    return this.#publier({ ...this.#etat, provider });
  }

  /**
   * Publie ce que les clients ont le droit de savoir de la configuration.
   * Jamais la clé elle-même — voir `serveur/configuration/secrets.ts`.
   */
  definirConfiguration(configuration: Partial<ConfigurationPublique>): EtatMatch {
    return this.#publier({
      ...this.#etat,
      configuration: { ...this.#etat.configuration, ...configuration },
    });
  }

  /** Rattache l'état à une nouvelle rencontre, en repartant des données à vide. */
  suivreRencontre(identifiantMatch: string): EtatMatch {
    if (identifiantMatch === this.#etat.identifiantMatch) return this.#etat;
    const neuf = etatInitial(this.#maintenant(), this.#etat.provider, this.#etat.decalageVideoSecondes);
    return this.#publier({
      ...neuf,
      identifiantMatch,
      // Ce qui appartient au poste et non au match survit au changement.
      scene: this.#etat.scene,
      configuration: this.#etat.configuration,
    });
  }

  #publier(suivant: EtatMatch): EtatMatch {
    if (suivant === this.#etat) return this.#etat;
    this.#etat = suivant;
    this.#sequence += 1;
    for (const abonne of this.#abonnes) {
      abonne(this.#etat, this.#sequence);
    }
    return this.#etat;
  }
}
