/**
 * Le provider de démonstration : il rejoue un match enregistré.
 *
 * Il sert deux choses à la fois. D'abord tester l'overlay et faire des
 * captures sans attendre un vrai match. Ensuite prouver que la couche
 * `providers/` tient : c'est une seconde implémentation de l'interface, non
 * manuelle, donc elle exerce pour de vrai le verrouillage des corrections.
 */
import { readFile } from 'node:fs/promises';
import type { Statut } from '../../partage/contrats/etat.js';
import type { DonneesEquipe, DonneesProvider } from '../etat/donnees-provider.js';
import type { Provider, PousserDonnees } from './interface.js';

/** Cadence à laquelle un provider réaliste republie l'horloge du match. */
const PERIODE_RECALAGE_MS = 5000;

interface Evenement {
  /** Moment dans le déroulé du match, en millisecondes de temps de jeu. */
  aMs: number;
  statut?: Statut;
  chronoEcouleMs?: number;
  chronoEnMarche?: boolean;
  tempsAdditionnel?: number;
  domicile?: DonneesEquipe;
  exterieur?: DonneesEquipe;
}

interface Enregistrement {
  libelle: string;
  competition: string;
  domicile: DonneesEquipe;
  exterieur: DonneesEquipe;
  evenements: Evenement[];
}

export interface OptionsDemonstration {
  chemin: string;
  identifiantMatch: string;
  /** 60 = une minute de jeu par seconde réelle. */
  vitesse?: number;
}

export class ProviderDemonstration implements Provider {
  readonly nom = 'démonstration';
  readonly manuel = false;

  #options: Required<OptionsDemonstration>;
  #minuteries: NodeJS.Timeout[] = [];
  #recalage: NodeJS.Timeout | null = null;
  #debutReelMs = 0;
  #enMarche = false;
  #dernierChrono = { ecouleMs: 0, enMarche: false };

  constructor(options: OptionsDemonstration) {
    this.#options = { vitesse: 60, ...options };
  }

  async demarrer(pousser: PousserDonnees): Promise<void> {
    const brut = await readFile(this.#options.chemin, 'utf8');
    const enregistrement = JSON.parse(brut) as Enregistrement;
    const { identifiantMatch, vitesse } = this.#options;

    this.#debutReelMs = Date.now();
    this.#enMarche = true;

    // L'identité du match part tout de suite : le bandeau doit être juste
    // avant même le coup d'envoi.
    pousser({
      identifiantMatch,
      competition: enregistrement.competition,
      domicile: enregistrement.domicile,
      exterieur: enregistrement.exterieur,
    });

    for (const evenement of enregistrement.evenements) {
      const delai = evenement.aMs / vitesse;
      const minuterie = setTimeout(() => {
        if (!this.#enMarche) return;
        if (evenement.chronoEcouleMs !== undefined) {
          this.#dernierChrono.ecouleMs = evenement.chronoEcouleMs;
          this.#debutReelMs = Date.now();
        }
        if (evenement.chronoEnMarche !== undefined) {
          this.#dernierChrono.enMarche = evenement.chronoEnMarche;
          if (evenement.chronoEcouleMs === undefined) {
            this.#dernierChrono.ecouleMs = this.#tempsDeJeuMs();
            this.#debutReelMs = Date.now();
          }
        }
        pousser(this.#donnees(evenement));
      }, delai);
      this.#minuteries.push(minuterie);
    }

    // Un vrai fournisseur republie l'horloge en continu. On fait pareil, pour
    // que le recalage côté client soit exercé et pas seulement supposé.
    this.#recalage = setInterval(() => {
      if (!this.#enMarche || !this.#dernierChrono.enMarche) return;
      pousser({
        identifiantMatch,
        chronoEcouleMs: this.#tempsDeJeuMs(),
        chronoEnMarche: true,
      });
    }, PERIODE_RECALAGE_MS);
  }

  arreter(): void {
    this.#enMarche = false;
    for (const minuterie of this.#minuteries) clearTimeout(minuterie);
    this.#minuteries = [];
    if (this.#recalage) clearInterval(this.#recalage);
    this.#recalage = null;
  }

  #tempsDeJeuMs(): number {
    if (!this.#dernierChrono.enMarche) return this.#dernierChrono.ecouleMs;
    const ecouleReel = Date.now() - this.#debutReelMs;
    return this.#dernierChrono.ecouleMs + ecouleReel * this.#options.vitesse;
  }

  #donnees(evenement: Evenement): DonneesProvider {
    const donnees: DonneesProvider = { identifiantMatch: this.#options.identifiantMatch };
    if (evenement.statut !== undefined) donnees.statut = evenement.statut;
    if (evenement.chronoEcouleMs !== undefined) donnees.chronoEcouleMs = evenement.chronoEcouleMs;
    if (evenement.chronoEnMarche !== undefined) donnees.chronoEnMarche = evenement.chronoEnMarche;
    if (evenement.tempsAdditionnel !== undefined) donnees.tempsAdditionnel = evenement.tempsAdditionnel;
    if (evenement.domicile !== undefined) donnees.domicile = evenement.domicile;
    if (evenement.exterieur !== undefined) donnees.exterieur = evenement.exterieur;
    return donnees;
  }
}
