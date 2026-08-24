/**
 * Le bandeau score du cadre.
 *
 * Il est permanent : le spectateur ne voit pas le terrain, donc l'état du
 * match ne se masque jamais et ne se déplace jamais. Il n'a pas de lame — il
 * n'entre par aucun côté, il est là avant le direct.
 */
import type { EtatMatch } from '../../partage/contrats/etat.js';
import { lireChrono } from '../../partage/contrats/chrono.js';
import { battreLame } from '../moteur/animation.js';
import { ValeurRoulante } from '../moteur/valeur-roulante.js';
import type { ContexteRendu } from '../scenes/scene.js';

type Cote = 'domicile' | 'exterieur';

export class BandeauScore {
  #racine: HTMLElement;
  #competition: HTMLElement;
  #pastilles: Record<Cote, HTMLElement>;
  #abreges: Record<Cote, HTMLElement>;
  #noms: Record<Cote, HTMLElement>;
  #scores: Record<Cote, ValeurRoulante>;
  #horloge: HTMLElement;
  #additionnel: HTMLElement;
  #phase: HTMLElement;
  #pouls: HTMLElement;

  #etat: EtatMatch | null = null;
  #derniereMinute = -1;

  constructor() {
    this.#racine = element('div', 'bandeau');

    this.#competition = element('span', 'bandeau__competition');

    const domicile = construireEquipe('domicile');
    const exterieur = construireEquipe('exterieur');

    const pisteDomicile = element('span', 'valeur bandeau__score');
    const pisteExterieur = element('span', 'valeur bandeau__score');

    this.#horloge = element('span', 'bandeau__horloge');
    this.#additionnel = element('span', 'bandeau__additionnel');
    this.#phase = element('span', 'bandeau__phase');
    this.#pouls = element('span', 'bandeau__pouls');

    const bloc = element('div', 'bandeau__temps');
    const ligneHorloge = element('div', 'bandeau__ligne-horloge');
    ligneHorloge.append(this.#horloge, this.#additionnel);
    bloc.append(this.#pouls, ligneHorloge, this.#phase);

    const centre = element('div', 'bandeau__centre');
    centre.append(pisteDomicile, bloc, pisteExterieur);

    const rangee = element('div', 'bandeau__rangee');
    rangee.append(domicile.racine, centre, exterieur.racine);

    this.#racine.append(this.#competition, rangee);

    this.#pastilles = { domicile: domicile.pastille, exterieur: exterieur.pastille };
    this.#abreges = { domicile: domicile.abrege, exterieur: exterieur.abrege };
    this.#noms = { domicile: domicile.nom, exterieur: exterieur.nom };
    this.#scores = {
      domicile: new ValeurRoulante(pisteDomicile, '0'),
      exterieur: new ValeurRoulante(pisteExterieur, '0'),
    };
  }

  get racine(): HTMLElement {
    return this.#racine;
  }

  rafraichir(etat: EtatMatch, contexte: ContexteRendu, anime: boolean): void {
    this.#etat = etat;
    this.#competition.textContent = etat.competition;

    for (const cote of ['domicile', 'exterieur'] as const) {
      const equipe = etat[cote];
      this.#abreges[cote].textContent = equipe.abrege;
      this.#noms[cote].textContent = equipe.nom;
      // La couleur de club ne vit que sur sa pastille : elle ne déborde
      // jamais sur le châssis.
      this.#pastilles[cote].style.setProperty('--couleur-equipe', equipe.couleur);
      this.#scores[cote].definir(String(equipe.score), anime);
    }

    this.#peindreTemps(contexte);
  }

  battre(contexte: ContexteRendu): void {
    if (this.#etat) this.#peindreTemps(contexte);
  }

  #peindreTemps(contexte: ContexteRendu): void {
    if (!this.#etat) return;
    const lecture = lireChrono(this.#etat, contexte.maintenantServeurMs());

    const sansHorloge = lecture.horloge === null;
    this.#racine.dataset['sansHorloge'] = sansHorloge ? 'oui' : 'non';
    // Sans horloge, la phase prend sa place : le bloc n'est jamais vide.
    const texte = lecture.horloge ?? lecture.phase;
    if (this.#horloge.textContent !== texte) this.#horloge.textContent = texte;
    this.#additionnel.textContent = lecture.additionnel ?? '';
    this.#phase.textContent = sansHorloge ? '' : lecture.phase;
    this.#pouls.dataset['vivant'] = lecture.enMarche ? 'oui' : 'non';

    if (lecture.enMarche && !contexte.mouvementReduit && lecture.minuteDeJeu !== this.#derniereMinute) {
      if (this.#derniereMinute !== -1) battreLame(this.#pouls);
      this.#derniereMinute = lecture.minuteDeJeu;
    }
    if (!lecture.enMarche) this.#derniereMinute = -1;
  }
}

function construireEquipe(cote: Cote) {
  const racine = element('div', `bandeau__equipe bandeau__equipe--${cote}`);
  const pastille = element('span', 'pastille');
  const textes = element('div', 'bandeau__identite');
  const abrege = element('span', 'bandeau__abrege');
  const nom = element('span', 'bandeau__nom');
  textes.append(abrege, nom);
  racine.append(cote === 'domicile' ? pastille : textes, cote === 'domicile' ? textes : pastille);
  return { racine, pastille, abrege, nom };
}

function element(balise: string, classe: string): HTMLElement {
  const noeud = document.createElement(balise);
  noeud.className = classe;
  return noeud;
}
