/**
 * Une valeur qui monte quand elle change.
 *
 * Un score qui passe de 1 à 2 ne réapparaît pas : l'ancien sort par le haut,
 * le nouveau entre par le bas. C'est le geste des tableaux de stade, et c'est
 * ce qui rend un but lisible même quand le spectateur regardait ailleurs.
 */
import { faireMonterValeur } from './animation.js';

export class ValeurRoulante {
  #hote: HTMLElement;
  #courant: HTMLElement;
  #texte: string;

  constructor(hote: HTMLElement, texteInitial: string) {
    this.#hote = hote;
    this.#texte = texteInitial;
    this.#courant = ValeurRoulante.#creerTexte(texteInitial);
    this.#hote.append(this.#courant);
  }

  get texte(): string {
    return this.#texte;
  }

  definir(texte: string, anime: boolean): void {
    if (texte === this.#texte) return;
    this.#texte = texte;

    if (!anime) {
      this.#courant.textContent = texte;
      return;
    }

    const sortant = this.#courant;
    const entrant = ValeurRoulante.#creerTexte(texte);
    this.#hote.append(entrant);
    this.#courant = entrant;

    void faireMonterValeur(sortant, entrant).finished.then(() => sortant.remove());
  }

  static #creerTexte(texte: string): HTMLElement {
    const element = document.createElement('span');
    element.className = 'valeur__texte';
    element.textContent = texte;
    return element;
  }
}
