/**
 * La traduction d'une réponse API-Football vers nos données.
 *
 * Fonction pure, sans réseau : c'est ce qui la rend testable sur des charges
 * enregistrées. Rien d'autre dans le projet ne connaît la forme de cette API.
 */
import type { Statut } from '../../../partage/contrats/etat.js';
import type { DonneesProvider } from '../../etat/donnees-provider.js';

/** Ce que l'API renvoie pour une rencontre. Champs facultatifs par prudence. */
export interface RencontreApi {
  fixture?: {
    id?: number;
    date?: string;
    status?: { short?: string; elapsed?: number | null };
  };
  league?: { id?: number; name?: string; round?: string };
  teams?: {
    home?: { id?: number; name?: string };
    away?: { id?: number; name?: string };
  };
  goals?: { home?: number | null; away?: number | null };
}

/**
 * Les statuts d'API-Football vers les nôtres.
 *
 * `FT`, `AET` et `PEN` disent tous « c'est fini » ; seule la façon d'y arriver
 * diffère, et elle se lit déjà dans le score. `BT` est la pause avant la
 * seconde période de prolongation.
 */
const STATUTS: Record<string, Statut> = {
  TBD: 'avant-match',
  NS: 'avant-match',
  '1H': 'premiere-periode',
  HT: 'mi-temps',
  '2H': 'seconde-periode',
  ET: 'prolongation-1',
  BT: 'pause-prolongation',
  P: 'tirs-au-but',
  FT: 'termine',
  AET: 'termine',
  PEN: 'termine',
  SUSP: 'suspendu',
  INT: 'suspendu',
  PST: 'suspendu',
  CANC: 'suspendu',
  ABD: 'suspendu',
  AWD: 'termine',
  WO: 'termine',
};

/** Phases pendant lesquelles l'API fait avancer sa minute. */
const PHASES_EN_COURS = new Set(['1H', '2H', 'ET', 'P']);

export function statutDepuisApi(court: string | undefined): Statut | null {
  if (!court) return null;
  return STATUTS[court] ?? null;
}

export interface RencontreResumee {
  identifiantFournisseur: string;
  competition: string;
  domicile: string;
  exterieur: string;
  statutApi: string;
  debutIso: string | null;
}

/** Résumé pour la liste de sélection en régie. */
export function resumerRencontre(rencontre: RencontreApi): RencontreResumee | null {
  const identifiant = rencontre.fixture?.id;
  const domicile = rencontre.teams?.home?.name;
  const exterieur = rencontre.teams?.away?.name;
  if (identifiant === undefined || !domicile || !exterieur) return null;

  const competition = [rencontre.league?.name, rencontre.league?.round]
    .filter((morceau): morceau is string => Boolean(morceau))
    .join(' · ');

  return {
    identifiantFournisseur: String(identifiant),
    competition,
    domicile,
    exterieur,
    statutApi: rencontre.fixture?.status?.short ?? '',
    debutIso: rencontre.fixture?.date ?? null,
  };
}

/**
 * Fabrique trois lettres à partir d'un nom de club.
 *
 * L'API ne fournit pas d'abrégé. On prend les initiales des mots significatifs
 * quand il y en a plusieurs, sinon les trois premières lettres. « Paris Saint
 * Germain » donne PSG, « Lens » donne LEN.
 */
export function abregerNom(nom: string): string {
  const mots = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[\s-]+/)
    .filter((mot) => mot.length > 0 && !/^(de|du|des|la|le|les|of|the|fc|cf|ac|as|sc)$/i.test(mot));

  if (mots.length >= 2) {
    return mots
      .slice(0, 3)
      .map((mot) => mot[0] ?? '')
      .join('')
      .toUpperCase();
  }
  return (mots[0] ?? nom).slice(0, 3).toUpperCase();
}

/**
 * Traduit une rencontre en données exploitables.
 *
 * La minute est transmise telle quelle, sans être convertie en millisecondes :
 * l'API ne connaît que la minute, et faire croire à une précision à la seconde
 * ferait sauter le chrono à chaque interrogation. C'est l'état qui décide quoi
 * en faire — voir `serveur/etat/appliquer-provider.ts`.
 */
export function traduireRencontre(
  rencontre: RencontreApi,
  identifiantMatch: string,
): DonneesProvider | null {
  const statut = statutDepuisApi(rencontre.fixture?.status?.short);
  const domicile = rencontre.teams?.home?.name;
  const exterieur = rencontre.teams?.away?.name;
  if (!domicile || !exterieur) return null;

  const donnees: DonneesProvider = {
    identifiantMatch,
    domicile: { nom: domicile, abrege: abregerNom(domicile) },
    exterieur: { nom: exterieur, abrege: abregerNom(exterieur) },
  };

  const competition = [rencontre.league?.name, rencontre.league?.round]
    .filter((morceau): morceau is string => Boolean(morceau))
    .join(' · ');
  if (competition) donnees.competition = competition;

  // Un score absent n'est pas un score nul : avant le coup d'envoi, l'API
  // renvoie null. Écrire 0 effacerait une correction manuelle légitime.
  const butsDomicile = rencontre.goals?.home;
  const butsExterieur = rencontre.goals?.away;
  if (typeof butsDomicile === 'number') donnees.domicile = { ...donnees.domicile, score: butsDomicile };
  if (typeof butsExterieur === 'number') donnees.exterieur = { ...donnees.exterieur, score: butsExterieur };

  if (statut) donnees.statut = statut;

  // L'heure du coup d'envoi alimente le compte à rebours de la scène
  // d'ouverture. Le fournisseur la connaît, le streamer n'a pas à la saisir.
  const debut = rencontre.fixture?.date;
  if (debut) {
    const horodatage = Date.parse(debut);
    if (Number.isFinite(horodatage)) donnees.coupDEnvoiMs = horodatage;
  }

  const court = rencontre.fixture?.status?.short ?? '';
  const minute = rencontre.fixture?.status?.elapsed;
  if (typeof minute === 'number') donnees.chronoMinute = minute;
  donnees.chronoEnMarche = PHASES_EN_COURS.has(court);

  return donnees;
}
