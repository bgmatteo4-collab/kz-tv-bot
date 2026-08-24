/**
 * Le tampon de décalage.
 *
 * Matteo commente un flux retardé de trente à soixante secondes sur le match
 * réel. Sans ce tampon, l'overlay annoncerait le but avant que son public le
 * voie — il spoilerait son propre commentaire.
 *
 * Le retard s'applique **aux données du provider et à elles seules**. Les
 * intentions de régie restent immédiates : quand le streamer clique, ça bouge
 * tout de suite. Le décalage est un tampon sur l'entrée, jamais sur la
 * diffusion vers les clients.
 */
import type { DonneesProvider } from '../etat/donnees-provider.js';

interface EnAttente {
  donnees: DonneesProvider;
  minuterie: ReturnType<typeof setTimeout>;
}

export class TamponDecalage {
  #retardMs: () => number;
  #livrer: (donnees: DonneesProvider) => void;
  #enAttente: EnAttente[] = [];

  constructor(retardMs: () => number, livrer: (donnees: DonneesProvider) => void) {
    this.#retardMs = retardMs;
    this.#livrer = livrer;
  }

  /** Nombre de mises à jour retenues, pour l'affichage en régie. */
  get enAttente(): number {
    return this.#enAttente.length;
  }

  recevoir(donnees: DonneesProvider): void {
    const retard = this.#retardMs();
    if (retard <= 0) {
      this.#livrer(donnees);
      return;
    }

    const entree: EnAttente = {
      donnees,
      minuterie: setTimeout(() => {
        this.#enAttente = this.#enAttente.filter((autre) => autre !== entree);
        this.#livrer(donnees);
      }, retard),
    };
    this.#enAttente.push(entree);
  }

  /**
   * Libère tout immédiatement. Sert quand le streamer ramène le décalage à
   * zéro : il ne doit pas attendre une minute pour voir l'état réel.
   */
  vider(): void {
    const enAttente = this.#enAttente;
    this.#enAttente = [];
    for (const entree of enAttente) {
      clearTimeout(entree.minuterie);
      this.#livrer(entree.donnees);
    }
  }

  /** Abandonne ce qui est retenu. Sert au changement de match. */
  abandonner(): void {
    for (const entree of this.#enAttente) clearTimeout(entree.minuterie);
    this.#enAttente = [];
  }
}
