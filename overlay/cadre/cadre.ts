/**
 * Le cadre : le sol de l'habillage.
 *
 * Quatre bandes opaques autour d'un trou réellement transparent. Pas un fond
 * plein écran avec une découpe : OBS compose la webcam **sous** la source
 * navigateur, donc le centre doit laisser passer, pas seulement paraître vide.
 *
 * Le cadre ne s'anime jamais et ne porte pas de lame. Il est là avant le
 * direct et il y reste — un sol qui bouge donne le mal de mer au bout de deux
 * heures.
 */
import type { EtatMatch } from '../../partage/contrats/etat.js';
import type { ContexteRendu } from '../scenes/scene.js';
import { BandeauScore } from './bandeau-score.js';

export class Cadre {
  #racine: HTMLElement;
  #scene: HTMLElement;
  #bandeau = new BandeauScore();

  constructor() {
    this.#racine = document.createElement('div');
    this.#racine.id = 'cadre';

    const haut = zone('haut');
    haut.append(this.#bandeau.racine);

    this.#scene = document.createElement('div');
    this.#scene.id = 'scene';

    this.#racine.append(haut, zone('gauche'), this.#scene, zone('droite'), zone('bas'));
  }

  get racine(): HTMLElement {
    return this.#racine;
  }

  /** L'hôte des scènes : le seul endroit du canevas qui change. */
  get hoteScene(): HTMLElement {
    return this.#scene;
  }

  rafraichir(etat: EtatMatch, contexte: ContexteRendu, anime: boolean): void {
    this.#bandeau.rafraichir(etat, contexte, anime);
  }

  battre(contexte: ContexteRendu): void {
    this.#bandeau.battre(contexte);
  }
}

function zone(nom: string): HTMLElement {
  const element = document.createElement('div');
  element.className = `bande bande--${nom}`;
  return element;
}
