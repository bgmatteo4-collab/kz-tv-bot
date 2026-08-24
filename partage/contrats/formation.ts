/**
 * Le placement des joueurs sur le terrain, à partir d'une formation.
 *
 * C'est une géométrie d'habillage, pas une position réelle : personne ne suit
 * les joueurs, on dessine ce que dit la feuille de match. Elle vit dans
 * `partage/` parce que la régie doit pouvoir montrer le même placement que
 * l'overlay quand le streamer corrige une composition à la main.
 *
 * Repère : `x` de 0 (touche gauche) à 100, `y` de 0 (ligne de but de l'équipe)
 * à 100 (ligne médiane). On ne dessine qu'un demi-terrain — celui de l'équipe
 * affichée.
 */

/** Le gardien, seul et bas. */
const Y_GARDIEN = 7;
/** Bornes verticales des lignes de champ. */
const Y_PREMIERE_LIGNE = 26;
const Y_DERNIERE_LIGNE = 90;
/** Marges latérales : un ailier ne colle pas à la ligne de touche. */
const X_MINIMUM = 12;
const X_MAXIMUM = 88;

export interface Place {
  x: number;
  y: number;
}

/**
 * Découpe « 4-3-3 » en lignes de joueurs de champ.
 *
 * Renvoie null si la formation n'est pas lisible : on préfère ne rien placer
 * plutôt que de dessiner une équipe fausse à l'antenne.
 */
export function lireFormation(formation: string): number[] | null {
  const morceaux = formation.trim().split(/[-–]/);
  if (morceaux.length < 2) return null;

  const lignes = morceaux.map((morceau) => Number(morceau.trim()));
  if (lignes.some((ligne) => !Number.isInteger(ligne) || ligne < 1 || ligne > 6)) return null;
  return lignes;
}

/** Réparti `nombre` joueurs sur la largeur, centrés. */
function repartir(nombre: number): number[] {
  if (nombre <= 0) return [];
  if (nombre === 1) return [50];
  const pas = (X_MAXIMUM - X_MINIMUM) / (nombre - 1);
  return Array.from({ length: nombre }, (_, rang) => X_MINIMUM + rang * pas);
}

/**
 * Les onze places d'une formation, gardien compris et en premier.
 *
 * Renvoie une liste vide si la formation est illisible — l'appelant décide
 * alors de ne pas dessiner de terrain plutôt que d'en inventer un.
 */
export function placesDeFormation(formation: string): Place[] {
  const lignes = lireFormation(formation);
  if (!lignes) return [];

  const places: Place[] = [{ x: 50, y: Y_GARDIEN }];
  const nombreDeLignes = lignes.length;

  lignes.forEach((joueurs, rang) => {
    const y =
      nombreDeLignes === 1
        ? (Y_PREMIERE_LIGNE + Y_DERNIERE_LIGNE) / 2
        : Y_PREMIERE_LIGNE +
          (rang * (Y_DERNIERE_LIGNE - Y_PREMIERE_LIGNE)) / (nombreDeLignes - 1);
    for (const x of repartir(joueurs)) places.push({ x, y });
  });

  return places;
}
