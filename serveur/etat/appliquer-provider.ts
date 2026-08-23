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
import type { Cote, EtatMatch } from '../../partage/contrats/etat.js';
import type { DonneesEquipe, DonneesProvider } from './donnees-provider.js';
import { estVerrouille } from './verrous.js';

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
    donnees.chronoEnMarche !== undefined ||
    donnees.tempsAdditionnel !== undefined;
  if (chronoVerrouille && chronoTouche) {
    ignores.push('chrono');
  }

  const chrono = chronoVerrouille
    ? etat.chrono
    : {
        ecouleMs: donnees.chronoEcouleMs ?? etat.chrono.ecouleMs,
        // Toute donnée de chrono repose la référence : c'est elle qui fait foi.
        referenceMs: donnees.chronoEcouleMs !== undefined ? maintenantMs : etat.chrono.referenceMs,
        enMarche: donnees.chronoEnMarche ?? etat.chrono.enMarche,
        tempsAdditionnel: donnees.tempsAdditionnel ?? etat.chrono.tempsAdditionnel,
      };

  return {
    etat: {
      ...etat,
      competition: competitionVerrouillee
        ? etat.competition
        : donnees.competition ?? etat.competition,
      statut: statutVerrouille ? etat.statut : donnees.statut ?? etat.statut,
      chrono,
      domicile: appliquerEquipe(etat, 'domicile', donnees.domicile, ignores),
      exterieur: appliquerEquipe(etat, 'exterieur', donnees.exterieur, ignores),
      derniereDonneeMs: maintenantMs,
    },
    retenu: true,
    ignores,
  };
}
