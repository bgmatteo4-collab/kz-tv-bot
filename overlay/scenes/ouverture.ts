/**
 * La scène d'ouverture : l'avant-match.
 *
 * Elle occupe le centre avant le coup d'envoi et donne au spectateur qui
 * arrive une raison de rester : l'affiche, et le temps qu'il reste à attendre.
 *
 * Le compte à rebours est en temps vidéo comme le reste — le décalage du flux
 * s'y applique, sans quoi il annoncerait le coup d'envoi avant que le public
 * le voie.
 */
import type { EtatMatch } from '../../partage/contrats/etat.js';
import { formaterHorloge } from '../../partage/contrats/chrono.js';
import { revelerContenu } from '../moteur/animation.js';
import type { ContexteRendu, Scene } from './scene.js';

export class SceneOuverture implements Scene {
  #corps!: HTMLElement;
  #competition!: HTMLElement;
  #noms!: Record<'domicile' | 'exterieur', HTMLElement>;
  #pastilles!: Record<'domicile' | 'exterieur', HTMLElement>;
  #compteur!: HTMLElement;
  #libelle!: HTMLElement;
  #etat: EtatMatch | null = null;

  construire(_etat: EtatMatch, _contexte: ContexteRendu): HTMLElement {
    const racine = element('div', 'scene-panneau');

    const lame = element('div', 'lame');
    lame.dataset['role'] = 'lame';

    const corps = element('div', 'scene-panneau__corps');
    corps.dataset['role'] = 'corps';

    const competition = element('span', 'ouverture__competition');

    const affiche = element('div', 'ouverture__affiche');
    const domicile = camp('domicile');
    const contre = element('span', 'ouverture__contre');
    contre.textContent = 'CONTRE';
    const exterieur = camp('exterieur');
    affiche.append(domicile.racine, contre, exterieur.racine);

    const bloc = element('div', 'ouverture__compte');
    const libelle = element('span', 'ouverture__libelle');
    const compteur = element('span', 'ouverture__compteur');
    bloc.append(libelle, compteur);

    corps.append(competition, affiche, bloc);
    racine.append(lame, corps);

    this.#corps = corps;
    this.#competition = competition;
    this.#noms = { domicile: domicile.nom, exterieur: exterieur.nom };
    this.#pastilles = { domicile: domicile.pastille, exterieur: exterieur.pastille };
    this.#compteur = compteur;
    this.#libelle = libelle;

    revelerContenu([competition, affiche, bloc], 'gauche');
    return racine;
  }

  rafraichir(etat: EtatMatch, contexte: ContexteRendu): void {
    this.#etat = etat;
    this.#competition.textContent = etat.competition;
    for (const cote of ['domicile', 'exterieur'] as const) {
      this.#noms[cote].textContent = etat[cote].nom;
      this.#pastilles[cote].style.setProperty('--couleur-equipe', etat[cote].couleur);
    }
    this.#peindreCompte(contexte);
  }

  battre(contexte: ContexteRendu): void {
    if (this.#etat) this.#peindreCompte(contexte);
  }

  #peindreCompte(contexte: ContexteRendu): void {
    const etat = this.#etat;
    if (!etat) return;

    if (etat.coupDEnvoiMs === null) {
      this.#libelle.textContent = 'COUP D’ENVOI';
      this.#compteur.textContent = 'À VENIR';
      this.#corps.dataset['compte'] = 'non';
      return;
    }

    // Temps vidéo : le public verra le coup d'envoi avec le retard du flux.
    const cible = etat.coupDEnvoiMs + etat.decalageVideoSecondes * 1000;
    const restant = cible - contexte.maintenantServeurMs();
    this.#corps.dataset['compte'] = 'oui';

    if (restant <= 0) {
      this.#libelle.textContent = 'COUP D’ENVOI';
      this.#compteur.textContent = 'IMMINENT';
      return;
    }
    this.#libelle.textContent = 'COUP D’ENVOI DANS';
    this.#compteur.textContent = formaterHorloge(restant);
  }
}

function camp(cote: 'domicile' | 'exterieur') {
  const racine = element('div', `ouverture__camp ouverture__camp--${cote}`);
  const pastille = element('span', 'pastille');
  const nom = element('span', 'ouverture__nom');
  racine.append(pastille, nom);
  return { racine, pastille, nom };
}

function element(balise: string, classe: string): HTMLElement {
  const noeud = document.createElement(balise);
  noeud.className = classe;
  return noeud;
}
