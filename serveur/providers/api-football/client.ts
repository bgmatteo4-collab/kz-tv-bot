/**
 * Le client HTTP d'API-Football.
 *
 * Seul fichier du projet qui connaît une URL de fournisseur. Deux précautions
 * de direct s'y trouvent :
 *
 * - **La clé ne sort jamais d'ici.** Elle n'est ni journalisée, ni recopiée
 *   dans un message d'erreur, ni renvoyée à un appelant.
 * - **Le quota est compté.** Le palier gratuit plafonne à cent requêtes par
 *   jour. Découvrir le mur à la 78e minute n'est pas une option : le nombre de
 *   requêtes restantes remonte jusqu'à la régie.
 */
const BASE = 'https://v3.football.api-sports.io';
const ENTETE_CLE = 'x-apisports-key';
const DELAI_MS = 8000;

export interface ReponseApi<T> {
  donnees: T[];
  /** Requêtes restantes sur la journée, si le fournisseur l'annonce. */
  requetesRestantes: number | null;
}

export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly recuperable: boolean,
  ) {
    super(message);
    this.name = 'ErreurApi';
  }
}

interface Enveloppe<T> {
  response?: T[];
  errors?: unknown;
  results?: number;
}

/** Les erreurs d'API-Football arrivent en 200, dans le corps. */
function lireErreurs(errors: unknown): string | null {
  if (!errors) return null;
  if (Array.isArray(errors)) return errors.length > 0 ? errors.join(', ') : null;
  if (typeof errors === 'object') {
    const entrees = Object.entries(errors as Record<string, unknown>);
    if (entrees.length === 0) return null;
    return entrees.map(([champ, message]) => `${champ} : ${String(message)}`).join(', ');
  }
  return String(errors);
}

export class ClientApiFootball {
  #cle: string;

  constructor(cle: string) {
    this.#cle = cle;
  }

  async interroger<T>(chemin: string, parametres: Record<string, string>): Promise<ReponseApi<T>> {
    const url = new URL(`${BASE}${chemin}`);
    for (const [nom, valeur] of Object.entries(parametres)) url.searchParams.set(nom, valeur);

    const abandon = AbortSignal.timeout(DELAI_MS);
    let reponse: Response;
    try {
      reponse = await fetch(url, {
        headers: { [ENTETE_CLE]: this.#cle, accept: 'application/json' },
        signal: abandon,
      });
    } catch (erreur) {
      // On ne recopie ni l'URL ni les en-têtes : la clé y figure.
      const cause = erreur instanceof Error ? erreur.name : 'inconnue';
      throw new ErreurApi(`fournisseur injoignable (${cause})`, true);
    }

    const requetesRestantes = lireEntier(reponse.headers.get('x-ratelimit-requests-remaining'));

    if (reponse.status === 401 || reponse.status === 403) {
      throw new ErreurApi('clé refusée par le fournisseur', false);
    }
    if (reponse.status === 429) {
      throw new ErreurApi('quota de requêtes épuisé', false);
    }
    if (!reponse.ok) {
      throw new ErreurApi(`réponse ${reponse.status} du fournisseur`, true);
    }

    let enveloppe: Enveloppe<T>;
    try {
      enveloppe = (await reponse.json()) as Enveloppe<T>;
    } catch {
      throw new ErreurApi('réponse illisible du fournisseur', true);
    }

    const erreurs = lireErreurs(enveloppe.errors);
    if (erreurs) throw new ErreurApi(erreurs, false);

    return { donnees: enveloppe.response ?? [], requetesRestantes };
  }
}

function lireEntier(valeur: string | null): number | null {
  if (valeur === null) return null;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : null;
}
