/**
 * La scène compositions : un terrain, une équipe à la fois.
 *
 * On ne montre pas les deux onze côte à côte. Un seul terrain occupe la scène,
 * et on retourne le même objet pour passer à l'adversaire — c'est la bascule.
 * Le geste dit qu'on retourne ce qu'on regardait, pas qu'on amène autre chose.
 *
 * Le terrain se redessine pendant que la face est de profil, donc le
 * changement de contenu ne se voit jamais.
 */
import type { Composition, Cote, EtatMatch, Joueur } from '../../partage/contrats/etat.js';
import { COURBES, DUREES } from '../../partage/design/tokens.js';
import { revelerContenu } from '../moteur/animation.js';
import type { ContexteRendu, Scene } from './scene.js';

export class SceneCompositions implements Scene {
  #terrain!: HTMLElement;
  #joueurs!: HTMLElement;
  #nomEquipe!: HTMLElement;
  #formation!: HTMLElement;
  #pastille!: HTMLElement;
  #remplacants!: HTMLElement;
  #vide!: HTMLElement;

  #campAffiche: Cote | null = null;
  #bascule: Animation | null = null;

  construire(_etat: EtatMatch, _contexte: ContexteRendu): HTMLElement {
    const racine = element('div', 'scene-panneau');

    const lame = element('div', 'lame');
    lame.dataset['role'] = 'lame';

    const corps = element('div', 'scene-panneau__corps compositions');
    corps.dataset['role'] = 'corps';

    const entete = element('div', 'compositions__entete');
    this.#pastille = element('span', 'pastille');
    const textes = element('div', 'compositions__identite');
    this.#nomEquipe = element('span', 'compositions__equipe');
    this.#formation = element('span', 'compositions__formation');
    textes.append(this.#nomEquipe, this.#formation);
    entete.append(this.#pastille, textes);

    this.#terrain = element('div', 'terrain');
    this.#terrain.append(
      element('div', 'terrain__surface'),
      element('div', 'terrain__surface terrain__surface--petite'),
      element('div', 'terrain__rond'),
    );
    this.#joueurs = element('div', 'terrain__joueurs');
    this.#terrain.append(this.#joueurs);

    this.#vide = element('p', 'compositions__vide');
    this.#vide.textContent = 'Composition non communiquée';

    this.#remplacants = element('div', 'compositions__remplacants');

    corps.append(entete, this.#terrain, this.#vide, this.#remplacants);
    racine.append(lame, corps);

    revelerContenu([entete, this.#terrain, this.#remplacants], 'gauche');
    return racine;
  }

  rafraichir(etat: EtatMatch, contexte: ContexteRendu, anime: boolean): void {
    const changementDeCamp = this.#campAffiche !== null && this.#campAffiche !== etat.campAffiche;
    this.#campAffiche = etat.campAffiche;

    if (changementDeCamp && anime && !contexte.mouvementReduit) {
      this.#retourner(etat);
      return;
    }
    this.#peindre(etat);
  }

  /**
   * Le retournement. Le contenu change à mi-parcours, quand le terrain est de
   * profil : on ne voit jamais l'ancien onze devenir le nouveau.
   */
  #retourner(etat: EtatMatch): void {
    this.#bascule?.cancel();
    const moitie = DUREES.bascule / 2;

    const partir = this.#terrain.animate(
      [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' }],
      { duration: moitie, easing: COURBES.sortie, fill: 'both' },
    );
    this.#bascule = partir;

    void partir.finished.then(() => {
      this.#peindre(etat);
      this.#bascule = this.#terrain.animate(
        [{ transform: 'rotateX(-90deg)' }, { transform: 'rotateX(0deg)' }],
        { duration: moitie, easing: COURBES.entree, fill: 'both' },
      );
    });
  }

  #peindre(etat: EtatMatch): void {
    const equipe = etat[etat.campAffiche];
    const composition = equipe.composition;

    this.#nomEquipe.textContent = equipe.nom;
    this.#formation.textContent = composition.formation;
    this.#pastille.style.setProperty('--couleur-equipe', equipe.couleur);

    const connue = composition.titulaires.length > 0;
    this.#terrain.dataset['connue'] = connue ? 'oui' : 'non';
    this.#vide.dataset['visible'] = connue ? 'non' : 'oui';

    this.#joueurs.replaceChildren(
      ...composition.titulaires.map((joueur) => this.#construireJoueur(joueur, equipe.couleur)),
    );
    this.#peindreRemplacants(composition);
  }

  #construireJoueur(joueur: Joueur, couleur: string): HTMLElement {
    const noeud = element('div', 'joueur');
    // `left` et `top` en pourcentage, parce qu'ils se rapportent au parent.
    // Un `translate` en pourcentage se rapporterait à l'élément lui-même —
    // c'est le piège : onze joueurs empilés dans un coin, et un test qui les
    // compte sans les regarder reste vert.
    //
    // Ce placement est posé une fois au montage, il n'est pas animé : la règle
    // « transform et opacity uniquement » vise l'animation, pas la mise en
    // place initiale.
    noeud.style.left = `${joueur.x}%`;
    noeud.style.top = `${100 - joueur.y}%`;

    const maillot = element('span', 'joueur__maillot');
    maillot.style.setProperty('--couleur-equipe', couleur);
    maillot.textContent = joueur.numero === null ? '' : String(joueur.numero);

    const nom = element('span', 'joueur__nom');
    nom.textContent = joueur.nom;

    noeud.append(maillot, nom);
    return noeud;
  }

  #peindreRemplacants(composition: Composition): void {
    if (composition.remplacants.length === 0) {
      this.#remplacants.replaceChildren();
      return;
    }
    const titre = element('span', 'compositions__titre');
    titre.textContent = 'REMPLAÇANTS';
    const liste = element('div', 'compositions__liste');
    for (const joueur of composition.remplacants) {
      const entree = element('span', 'compositions__remplacant');
      entree.textContent =
        joueur.numero === null ? joueur.nom : `${joueur.numero} ${joueur.nom}`;
      liste.append(entree);
    }
    this.#remplacants.replaceChildren(titre, liste);
  }
}

function element(balise: string, classe: string): HTMLElement {
  const noeud = document.createElement(balise);
  noeud.className = classe;
  return noeud;
}
