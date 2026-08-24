/**
 * Le provider API-Football.
 *
 * Il suit une rencontre et pousse ce qu'il en sait. Trois partis pris, tous
 * dictés par le direct :
 *
 * - **Il ne s'arrête jamais sur une erreur réseau.** Une coupure de trente
 *   secondes ne doit pas obliger le streamer à cliquer quoi que ce soit. Seule
 *   une erreur définitive — clé refusée, quota épuisé — le fait renoncer, et
 *   elle est alors remontée pour que la régie propose la saisie manuelle.
 * - **Il compte ses requêtes.** Cent par jour sur le palier gratuit, c'est peu.
 *   La cadence se relâche quand le match n'a pas commencé et s'arrête quand il
 *   est terminé.
 * - **Il ne décide de rien.** Il traduit et il pousse ; c'est l'état qui
 *   arbitre, notamment face à une correction manuelle.
 */
import type { DonneesProvider } from '../../etat/donnees-provider.js';
import type { Provider, PousserDonnees } from '../interface.js';
import { ClientApiFootball, ErreurApi } from './client.js';
import { COMPETITIONS } from './competitions.js';
import { traduireComposition, type CompositionApi } from './compositions.js';
import {
  resumerRencontre,
  traduireRencontre,
  type RencontreApi,
  type RencontreResumee,
} from './correspondance.js';

/** Cadence d'interrogation selon ce que fait le match. */
const CADENCE_MS = {
  /** Match en cours : le compromis entre fraîcheur et quota. */
  enCours: 20_000,
  /** Avant le coup d'envoi : on guette le début, sans gaspiller. */
  avantMatch: 120_000,
};

const STATUTS_TERMINES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD', 'PST']);
const STATUTS_EN_COURS = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'SUSP', 'INT']);

export interface OptionsApiFootball {
  cle: string;
  /** Identifiant de la rencontre chez le fournisseur. */
  identifiantFournisseur: string;
  /** Identifiant du match dans notre état, porté par chaque donnée poussée. */
  identifiantMatch: string;
  surQuota?: (requetesRestantes: number | null) => void;
  surErreurDefinitive?: (message: string) => void;
}

export class ProviderApiFootball implements Provider {
  readonly nom = 'api-football';
  readonly manuel = false;

  #options: OptionsApiFootball;
  #client: ClientApiFootball;
  #minuterie: ReturnType<typeof setTimeout> | null = null;
  #enMarche = false;
  #dernierStatutApi = '';
  /**
   * Les compositions ne se demandent qu'une fois. Elles paraissent environ une
   * heure avant le coup d'envoi et ne changent plus ; les redemander à chaque
   * cycle brûlerait le quota pour rien.
   */
  #compositionsObtenues = false;

  constructor(options: OptionsApiFootball) {
    this.#options = options;
    this.#client = new ClientApiFootball(options.cle);
  }

  async demarrer(pousser: PousserDonnees): Promise<void> {
    this.#enMarche = true;
    await this.#interroger(pousser);
  }

  arreter(): void {
    this.#enMarche = false;
    if (this.#minuterie) clearTimeout(this.#minuterie);
    this.#minuterie = null;
  }

  async #interroger(pousser: PousserDonnees): Promise<void> {
    if (!this.#enMarche) return;

    try {
      const reponse = await this.#client.interroger<RencontreApi>('/fixtures', {
        id: this.#options.identifiantFournisseur,
      });
      this.#options.surQuota?.(reponse.requetesRestantes);

      const rencontre = reponse.donnees[0];
      if (rencontre) {
        this.#dernierStatutApi = rencontre.fixture?.status?.short ?? '';
        const donnees = traduireRencontre(rencontre, this.#options.identifiantMatch);
        if (donnees) pousser(donnees);
      }

      if (!this.#compositionsObtenues) await this.#chercherCompositions(pousser);
    } catch (erreur) {
      if (erreur instanceof ErreurApi && !erreur.recuperable) {
        // Définitif : on ne réessaiera pas en boucle contre un mur.
        this.#enMarche = false;
        this.#options.surErreurDefinitive?.(erreur.message);
        return;
      }
      // Récupérable : on ne dit rien et on retentera. En direct, une coupure
      // de trente secondes ne doit demander aucun geste au streamer.
      console.warn(`[api-football] interrogation échouée, nouvel essai : ${String(erreur)}`);
    }

    if (STATUTS_TERMINES.has(this.#dernierStatutApi)) {
      // Rien ne bougera plus : continuer coûterait des requêtes pour rien.
      this.#enMarche = false;
      return;
    }

    const delai = STATUTS_EN_COURS.has(this.#dernierStatutApi)
      ? CADENCE_MS.enCours
      : CADENCE_MS.avantMatch;
    this.#minuterie = setTimeout(() => void this.#interroger(pousser), delai);
  }

  /**
   * Les compositions, une seule fois.
   *
   * Un échec ici n'arrête rien : le match se commente sans le onze de départ,
   * et on retentera au cycle suivant.
   */
  async #chercherCompositions(pousser: PousserDonnees): Promise<void> {
    const reponse = await this.#client.interroger<CompositionApi>('/fixtures/lineups', {
      fixture: this.#options.identifiantFournisseur,
    });
    this.#options.surQuota?.(reponse.requetesRestantes);

    const [domicile, exterieur] = reponse.donnees;
    if (!domicile && !exterieur) return;

    const donnees: DonneesProvider = { identifiantMatch: this.#options.identifiantMatch };
    if (domicile) donnees.domicile = { composition: traduireComposition(domicile) };
    if (exterieur) donnees.exterieur = { composition: traduireComposition(exterieur) };
    pousser(donnees);
    this.#compositionsObtenues = true;
  }
}

/** Les rencontres du jour sur les compétitions suivies, pour la régie. */
export async function rencontresDuJour(cle: string, dateIso: string): Promise<RencontreResumee[]> {
  const client = new ClientApiFootball(cle);
  const resumes: RencontreResumee[] = [];

  // Une requête par compétition : l'API ne sait pas filtrer sur plusieurs
  // ligues à la fois. Huit requêtes, une fois par jour, tient dans le quota.
  for (const competition of COMPETITIONS) {
    const reponse = await client.interroger<RencontreApi>('/fixtures', {
      date: dateIso,
      league: String(competition.identifiant),
      season: String(saisonPour(dateIso)),
    });
    for (const rencontre of reponse.donnees) {
      const resume = resumerRencontre(rencontre);
      if (resume) resumes.push(resume);
    }
  }

  return resumes.sort((a, b) => (a.debutIso ?? '').localeCompare(b.debutIso ?? ''));
}

/**
 * Une saison européenne porte le millésime de son année d'ouverture : la
 * saison 2025-2026 se demande sous « 2025 ». Juillet fait la bascule.
 */
export function saisonPour(dateIso: string): number {
  const date = new Date(dateIso);
  const annee = date.getUTCFullYear();
  return date.getUTCMonth() >= 6 ? annee : annee - 1;
}
