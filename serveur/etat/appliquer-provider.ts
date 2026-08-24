/**
 * Application des données d'un provider à l'état.
 *
 * Deux garde-fous, tous les deux issus de directs ratés :
 *
 * 1. Des données qui ne portent pas l'identifiant du match courant sont
 *    rejetées en bloc. On ne se fie jamais à l'ordre d'arrivée : un appel
 *    lent sur le match précédent ne doit pas repeupler l'écran.
 * 2. Un champ verrouillé par une correction manuelle n'est jamais écrasé.
 */
import type { Chrono, Cote, EtatMatch } from '../../partage/contrats/etat.js';
import { tempsDeJeuBrutMs } from '../../partage/contrats/chrono.js';
import type { DonneesEquipe, DonneesProvider } from './donnees-provider.js';
import { estVerrouille } from './verrous.js';

const MINUTE_MS = 60_000;

/**
 * Écart de minutes au-delà duquel on recale le chrono sur le provider.
 *
 * En dessous, on garde notre interpolation. Une source qui ne connaît que la
 * minute ferait sinon sauter le chrono à chaque interrogation : on afficherait
 * 45:38, l'API dirait « 45 », et on repartirait à 45:00. Un chrono qui recule à
 * l'antenne se voit immédiatement.
 */
const TOLERANCE_MINUTES = 2;

/**
 * Décide du chrono à partir d'une minute annoncée par le provider.
 *
 * On recale sans hésiter quand la phase change — un coup d'envoi de seconde
 * période fait autorité — et sinon seulement quand la dérive devient visible.
 */
function recalerSurLaMinute(
  chrono: Chrono,
  minute: number,
  phaseChange: boolean,
  maintenantMs: number,
): Chrono {
  const notre = Math.floor(tempsDeJeuBrutMs(chrono, maintenantMs) / MINUTE_MS);
  const derive = Math.abs(notre - minute);
  if (!phaseChange && derive < TOLERANCE_MINUTES) return chrono;
  return { ...chrono, ecouleMs: minute * MINUTE_MS, referenceMs: maintenantMs };
}

export interface ResultatApplication {
  etat: EtatMatch;
  /** Les données ont-elles été retenues ? */
  retenu: boolean;
  /** Chemins ignorés parce qu'ils étaient verrouillés. */
  ignores: string[];
}

function appliquerEquipe(
  etat: EtatMatch,
  cote: Cote,
  donnees: DonneesEquipe | undefined,
  ignores: string[],
): EtatMatch[Cote] {
  const equipe = etat[cote];
  if (!donnees) return equipe;

  const identiteVerrouillee = estVerrouille(etat, `${cote}.identite`);
  const scoreVerrouille = estVerrouille(etat, `${cote}.score`);
  const compositionVerrouillee = estVerrouille(etat, `${cote}.composition`);

  if (compositionVerrouillee && donnees.composition !== undefined) {
    ignores.push(`${cote}.composition`);
  }

  if (identiteVerrouillee && (donnees.nom ?? donnees.abrege ?? donnees.couleur) !== undefined) {
    ignores.push(`${cote}.identite`);
  }
  if (scoreVerrouille && donnees.score !== undefined) {
    ignores.push(`${cote}.score`);
  }

  return {
    nom: identiteVerrouillee ? equipe.nom : donnees.nom ?? equipe.nom,
    abrege: identiteVerrouillee ? equipe.abrege : donnees.abrege ?? equipe.abrege,
    couleur: identiteVerrouillee ? equipe.couleur : donnees.couleur ?? equipe.couleur,
    score: scoreVerrouille ? equipe.score : donnees.score ?? equipe.score,
    composition: compositionVerrouillee
      ? equipe.composition
      : donnees.composition ?? equipe.composition,
  };
}

export function appliquerDonneesProvider(
  etat: EtatMatch,
  donnees: DonneesProvider,
  maintenantMs: number,
): ResultatApplication {
  if (donnees.identifiantMatch !== etat.identifiantMatch) {
    return { etat, retenu: false, ignores: [] };
  }

  const ignores: string[] = [];

  const competitionVerrouillee = estVerrouille(etat, 'competition');
  if (competitionVerrouillee && donnees.competition !== undefined) {
    ignores.push('competition');
  }

  const statutVerrouille = estVerrouille(etat, 'statut');
  if (statutVerrouille && donnees.statut !== undefined) {
    ignores.push('statut');
  }

  const chronoVerrouille = estVerrouille(etat, 'chrono');
  const chronoTouche =
    donnees.chronoEcouleMs !== undefined ||
    donnees.chronoMinute !== undefined ||
    donnees.chronoEnMarche !== undefined ||
    donnees.tempsAdditionnel !== undefined;
  if (chronoVerrouille && chronoTouche) {
    ignores.push('chrono');
  }

  // Un changement de phase ne compte que s'il est réellement appliqué. Si le
  // streamer a pris la main sur la phase, la proposition du provider n'a pas
  // eu lieu — recaler le chrono sur une transition fantôme le ferait sauter
  // sans raison visible.
  const phaseChange =
    !statutVerrouille && donnees.statut !== undefined && donnees.statut !== etat.statut;

  let chrono = etat.chrono;
  if (!chronoVerrouille) {
    chrono = {
      ecouleMs: donnees.chronoEcouleMs ?? chrono.ecouleMs,
      // Une donnée à la milliseconde repose la référence : elle fait foi.
      referenceMs: donnees.chronoEcouleMs !== undefined ? maintenantMs : chrono.referenceMs,
      enMarche: donnees.chronoEnMarche ?? chrono.enMarche,
      tempsAdditionnel: donnees.tempsAdditionnel ?? chrono.tempsAdditionnel,
    };
    if (donnees.chronoMinute !== undefined) {
      chrono = recalerSurLaMinute(chrono, donnees.chronoMinute, phaseChange, maintenantMs);
    }
  }

  return {
    etat: {
      ...etat,
      competition: competitionVerrouillee
        ? etat.competition
        : donnees.competition ?? etat.competition,
      statut: statutVerrouille ? etat.statut : donnees.statut ?? etat.statut,
      coupDEnvoiMs: donnees.coupDEnvoiMs ?? etat.coupDEnvoiMs,
      chrono,
      domicile: appliquerEquipe(etat, 'domicile', donnees.domicile, ignores),
      exterieur: appliquerEquipe(etat, 'exterieur', donnees.exterieur, ignores),
      derniereDonneeMs: maintenantMs,
    },
    retenu: true,
    ignores,
  };
}
