/**
 * Le réducteur : une intention entre, un nouvel état sort.
 *
 * Fonction pure, sans effet de bord et sans horloge implicite — le temps est
 * toujours passé en paramètre. C'est ce qui rend l'état testable sans attendre
 * une vraie minute de jeu.
 */
import type { Chrono, EtatMatch, Cote } from '../../partage/contrats/etat.js';
import type { Intention } from '../../partage/contrats/intentions.js';
import { debutDePhase } from '../../partage/contrats/chrono.js';
import { etatInitial } from './etat-initial.js';
import { liberer, poser, type CheminVerrouillable } from './verrous.js';

/** Fige le temps de jeu à l'instant donné, sans le décalage vidéo. */
function figer(chrono: Chrono, maintenantMs: number): number {
  return chrono.enMarche
    ? chrono.ecouleMs + (maintenantMs - chrono.referenceMs)
    : chrono.ecouleMs;
}

export function reduire(
  etat: EtatMatch,
  intention: Intention,
  maintenantMs: number,
): EtatMatch {
  /**
   * Marque le champ comme corrigé à la main. Sans effet en saisie manuelle,
   * où la régie est déjà l'unique source.
   */
  const verrouiller = (chemin: CheminVerrouillable) =>
    etat.provider.manuel ? etat.verrous : poser(etat.verrous, chemin, maintenantMs);

  switch (intention.type) {
    case 'definir-competition':
      return {
        ...etat,
        competition: intention.nom,
        verrous: verrouiller('competition'),
      };

    case 'definir-equipe': {
      const cote: Cote = intention.cote;
      return {
        ...etat,
        [cote]: {
          ...etat[cote],
          nom: intention.nom,
          abrege: intention.abrege,
          couleur: intention.couleur,
        },
        verrous: verrouiller(`${cote}.identite`),
      };
    }

    case 'definir-score': {
      const cote: Cote = intention.cote;
      return {
        ...etat,
        [cote]: { ...etat[cote], score: Math.max(0, Math.trunc(intention.score)) },
        verrous: verrouiller(`${cote}.score`),
      };
    }

    case 'ajuster-score': {
      const cote: Cote = intention.cote;
      const score = Math.max(0, etat[cote].score + Math.trunc(intention.delta));
      return {
        ...etat,
        [cote]: { ...etat[cote], score },
        verrous: verrouiller(`${cote}.score`),
      };
    }

    case 'definir-statut': {
      const base = debutDePhase(intention.statut);
      const chrono: Chrono =
        base === null
          ? // Phase sans horloge : on fige le temps de jeu là où il en est.
            {
              ecouleMs: figer(etat.chrono, maintenantMs),
              referenceMs: maintenantMs,
              enMarche: false,
              tempsAdditionnel: etat.chrono.tempsAdditionnel,
            }
          : // Coup d'envoi d'une phase : le chrono repart de son début connu.
            {
              ecouleMs: base,
              referenceMs: maintenantMs,
              enMarche: true,
              tempsAdditionnel: 0,
            };
      return {
        ...etat,
        statut: intention.statut,
        chrono,
        verrous: verrouiller('statut'),
      };
    }

    case 'demarrer-chrono':
      return {
        ...etat,
        chrono: {
          ...etat.chrono,
          ecouleMs: figer(etat.chrono, maintenantMs),
          referenceMs: maintenantMs,
          enMarche: true,
        },
        verrous: verrouiller('chrono'),
      };

    case 'arreter-chrono':
      return {
        ...etat,
        chrono: {
          ...etat.chrono,
          ecouleMs: figer(etat.chrono, maintenantMs),
          referenceMs: maintenantMs,
          enMarche: false,
        },
        verrous: verrouiller('chrono'),
      };

    case 'definir-chrono':
      return {
        ...etat,
        chrono: {
          ...etat.chrono,
          ecouleMs: Math.max(0, intention.ecouleMs),
          referenceMs: maintenantMs,
        },
        verrous: verrouiller('chrono'),
      };

    case 'definir-temps-additionnel':
      return {
        ...etat,
        chrono: {
          ...etat.chrono,
          tempsAdditionnel: Math.max(0, Math.trunc(intention.minutes)),
        },
        verrous: verrouiller('chrono'),
      };

    case 'definir-decalage-video':
      // Réglage du poste, pas une donnée de match : aucun verrou.
      return { ...etat, decalageVideoSecondes: Math.max(0, intention.secondes) };

    case 'afficher-module':
      return {
        ...etat,
        modules: { ...etat.modules, [intention.module]: { visible: true } },
      };

    case 'masquer-module':
      return {
        ...etat,
        modules: { ...etat.modules, [intention.module]: { visible: false } },
      };

    case 'liberer-verrou':
      return { ...etat, verrous: liberer(etat.verrous, intention.chemin) };

    case 'liberer-tous-les-verrous':
      return { ...etat, verrous: [] };

    case 'definir-provider':
    case 'definir-cle-api':
    case 'effacer-cle-api':
    case 'suivre-rencontre':
      // Ces intentions ont un effet au-delà de l'état : cycle de vie des
      // providers, écriture d'un secret sur disque, appel réseau. Le serveur
      // les intercepte. Le réducteur, lui, reste une fonction pure — et la
      // clé d'API ne traverse jamais l'état.
      return etat;

    case 'nouveau-match': {
      // Le décalage vidéo est un réglage du poste : il survit au match.
      const neuf = etatInitial(maintenantMs, etat.provider, etat.decalageVideoSecondes);
      return { ...neuf, modules: etat.modules };
    }
  }
}
