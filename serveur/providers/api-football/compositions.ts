/**
 * Les compositions vues par API-Football.
 *
 * Deux sources de placement, dans cet ordre : la grille que le fournisseur
 * donne parfois pour chaque joueur, sinon la formation. On préfère la grille
 * quand elle est là — elle distingue un 4-2-3-1 d'un 4-5-1, ce que la seule
 * chaîne de formation ne fait pas toujours.
 *
 * Si aucune des deux ne tient, on ne place personne : un onze faux à l'antenne
 * se voit tout de suite, les supporters connaissent leur équipe.
 */
import type { Composition, Joueur } from '../../../partage/contrats/etat.js';
import { placesDeFormation } from '../../../partage/contrats/formation.js';

export interface JoueurApi {
  player?: { id?: number; name?: string; number?: number | null; grid?: string | null };
}

export interface CompositionApi {
  team?: { id?: number; name?: string };
  formation?: string | null;
  startXI?: JoueurApi[];
  substitutes?: JoueurApi[];
}

/** Marges du placement par grille, cohérentes avec `partage/formation.ts`. */
const X_MINIMUM = 12;
const X_MAXIMUM = 88;
const Y_GARDIEN = 7;
const Y_PREMIERE_LIGNE = 26;
const Y_DERNIERE_LIGNE = 90;

/** « 3:2 » : troisième ligne en partant du but, deuxième joueur de la ligne. */
function lireGrille(grille: string | null | undefined): { ligne: number; rang: number } | null {
  if (!grille) return null;
  const [ligne, rang] = grille.split(':').map((morceau) => Number(morceau.trim()));
  if (!Number.isInteger(ligne) || !Number.isInteger(rang)) return null;
  if (ligne === undefined || rang === undefined || ligne < 1 || rang < 1) return null;
  return { ligne, rang };
}

function nom(joueur: JoueurApi): string {
  return joueur.player?.name ?? '';
}

function numero(joueur: JoueurApi): number | null {
  const valeur = joueur.player?.number;
  return typeof valeur === 'number' ? valeur : null;
}

/** Place les titulaires à partir des grilles, si elles sont toutes présentes. */
function placerParGrille(titulaires: JoueurApi[]): Joueur[] | null {
  const grilles = titulaires.map((joueur) => lireGrille(joueur.player?.grid));
  if (grilles.some((grille) => grille === null)) return null;

  const lignes = new Map<number, number>();
  for (const grille of grilles) {
    if (!grille) return null;
    lignes.set(grille.ligne, Math.max(lignes.get(grille.ligne) ?? 0, grille.rang));
  }

  const numerosDeLigne = [...lignes.keys()].sort((a, b) => a - b);
  const lignesDeChamp = numerosDeLigne.filter((ligne) => ligne > 1);

  return titulaires.map((joueur, rang) => {
    const grille = grilles[rang];
    if (!grille) return { numero: numero(joueur), nom: nom(joueur), x: 50, y: Y_GARDIEN };

    const largeurDeLigne = lignes.get(grille.ligne) ?? 1;
    const x =
      largeurDeLigne === 1
        ? 50
        : X_MINIMUM + ((grille.rang - 1) * (X_MAXIMUM - X_MINIMUM)) / (largeurDeLigne - 1);

    let y = Y_GARDIEN;
    if (grille.ligne > 1) {
      const position = lignesDeChamp.indexOf(grille.ligne);
      y =
        lignesDeChamp.length <= 1
          ? (Y_PREMIERE_LIGNE + Y_DERNIERE_LIGNE) / 2
          : Y_PREMIERE_LIGNE +
            (position * (Y_DERNIERE_LIGNE - Y_PREMIERE_LIGNE)) / (lignesDeChamp.length - 1);
    }

    return { numero: numero(joueur), nom: nom(joueur), x, y };
  });
}

/** Place les titulaires à partir de la seule chaîne de formation. */
function placerParFormation(titulaires: JoueurApi[], formation: string): Joueur[] | null {
  const places = placesDeFormation(formation);
  if (places.length !== titulaires.length) return null;
  return titulaires.map((joueur, rang) => ({
    numero: numero(joueur),
    nom: nom(joueur),
    x: places[rang]?.x ?? 50,
    y: places[rang]?.y ?? Y_GARDIEN,
  }));
}

export function traduireComposition(composition: CompositionApi): Composition {
  const titulairesApi = (composition.startXI ?? []).filter((joueur) => nom(joueur) !== '');
  const formation = composition.formation ?? '';

  const titulaires =
    placerParGrille(titulairesApi) ?? placerParFormation(titulairesApi, formation) ?? [];

  return {
    formation,
    titulaires,
    remplacants: (composition.substitutes ?? [])
      .filter((joueur) => nom(joueur) !== '')
      .map((joueur) => ({ numero: numero(joueur), nom: nom(joueur), x: 0, y: 0 })),
  };
}
