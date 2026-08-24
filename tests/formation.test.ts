/**
 * Le placement des joueurs.
 *
 * Une composition fausse à l'antenne se voit tout de suite : les supporters
 * connaissent leur onze. Mieux vaut ne rien dessiner qu'un terrain inventé.
 */
import { describe, expect, it } from 'vitest';
import { lireFormation, placesDeFormation } from '../partage/contrats/formation.js';

describe('la lecture d’une formation', () => {
  it('découpe les formations courantes', () => {
    expect(lireFormation('4-3-3')).toEqual([4, 3, 3]);
    expect(lireFormation('4-2-3-1')).toEqual([4, 2, 3, 1]);
    expect(lireFormation('3-5-2')).toEqual([3, 5, 2]);
  });

  it('tolère les espaces et le tiret long', () => {
    expect(lireFormation(' 4 – 4 – 2 ')).toEqual([4, 4, 2]);
  });

  it('refuse ce qu’elle ne comprend pas plutôt que de deviner', () => {
    expect(lireFormation('')).toBeNull();
    expect(lireFormation('inconnue')).toBeNull();
    expect(lireFormation('4')).toBeNull();
    expect(lireFormation('4-0-3')).toBeNull();
  });
});

describe('le placement', () => {
  it('pose onze joueurs, gardien compris et en premier', () => {
    const places = placesDeFormation('4-3-3');
    expect(places).toHaveLength(11);
    expect(places[0]).toEqual({ x: 50, y: 7 });
  });

  it('couvre les formations à quatre lignes', () => {
    expect(placesDeFormation('4-2-3-1')).toHaveLength(11);
  });

  it('garde tout le monde dans le terrain', () => {
    for (const formation of ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2']) {
      for (const place of placesDeFormation(formation)) {
        expect(place.x).toBeGreaterThanOrEqual(0);
        expect(place.x).toBeLessThanOrEqual(100);
        expect(place.y).toBeGreaterThanOrEqual(0);
        expect(place.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('centre un joueur seul sur sa ligne', () => {
    const places = placesDeFormation('4-2-3-1');
    expect(places.at(-1)?.x).toBe(50);
  });

  it('avance chaque ligne vers la médiane', () => {
    const places = placesDeFormation('4-3-3');
    const defense = places[1]?.y ?? 0;
    const milieu = places[5]?.y ?? 0;
    const attaque = places[8]?.y ?? 0;
    expect(defense).toBeLessThan(milieu);
    expect(milieu).toBeLessThan(attaque);
  });

  it('ne dessine rien quand la formation est illisible', () => {
    expect(placesDeFormation('n’importe quoi')).toEqual([]);
  });
});
