/**
 * Le bandeau score : équipes, score, chrono, phase.
 *
 * C'est le module toujours affiché, celui que le spectateur cherche du regard
 * en arrivant sur le stream. Tout le reste peut disparaître, pas lui.
 */
import type { EtatMatch } from '../../partage/contrats/etat.js';
import { lireChrono } from '../../partage/contrats/chrono.js';
import { battreLame, revelerContenu } from '../moteur/animation.js';
import type { ContexteRendu, CoteEntree, ModuleOverlay } from '../moteur/module.js';
import { ValeurRoulante } from '../moteur/valeur-roulante.js';

export class BandeauScore implements ModuleOverlay {
  readonly nom = 'bandeau-score' as const;
  readonly coteEntree: CoteEntree = 'gauche';

  #lame!: HTMLElement;
  #pastilles!: Record<'domicile' | 'exterieur', HTMLElement>;
  #abreges!: Record<'domicile' | 'exterieur', HTMLElement>;
  #scores!: Record<'domicile' | 'exterieur', ValeurRoulante>;
  #horloge!: HTMLElement;
  #additionnel!: HTMLElement;
  #phase!: HTMLElement;
  #blocChrono!: HTMLElement;

  #etat: EtatMatch | null = null;
  #derniereMinute = -1;

  construire(etat: EtatMatch, _contexte: ContexteRendu): HTMLElement {
    const racine = element('div', 'module module--bandeau');

    const lame = element('div', 'lame');
    lame.dataset['role'] = 'lame';
    racine.append(lame);

    const corps = element('div', 'corps');
    corps.dataset['role'] = 'corps';
    racine.append(corps);

    const equipeDomicile = this.#construireEquipe('domicile');
    const blocScores = element('div', 'groupe scores');
    const equipeExterieur = this.#construireEquipe('exterieur');
    const blocChrono = element('div', 'groupe chrono');

    const pisteDomicile = element('span', 'valeur score');
    const separateur = element('span', 'separateur');
    const pisteExterieur = element('span', 'valeur score');
    blocScores.append(pisteDomicile, separateur, pisteExterieur);

    const horloge = element('span', 'valeur horloge');
    const additionnel = element('span', 'additionnel');
    const phase = element('span', 'phase');
    const ligneHaute = element('div', 'chrono__haut');
    ligneHaute.append(horloge, additionnel);
    blocChrono.append(ligneHaute, phase);

    corps.append(equipeDomicile.racine, blocScores, equipeExterieur.racine, blocChrono);

    this.#lame = lame;
    this.#pastilles = {
      domicile: equipeDomicile.pastille,
      exterieur: equipeExterieur.pastille,
    };
    this.#abreges = { domicile: equipeDomicile.abrege, exterieur: equipeExterieur.abrege };
    this.#scores = {
      domicile: new ValeurRoulante(pisteDomicile, String(etat.domicile.score)),
      exterieur: new ValeurRoulante(pisteExterieur, String(etat.exterieur.score)),
    };
    // L'horloge ne roule pas : le geste « le chiffre monte » est réservé aux
    // valeurs rares et signifiantes. Une horloge qui s'animerait chaque
    // seconde serait bruyante à l'antenne et coûterait des frames à
    // l'encodage, pour dire ce que le spectateur voit déjà.
    this.#horloge = horloge;
    this.#additionnel = additionnel;
    this.#phase = phase;
    this.#blocChrono = blocChrono;

    revelerContenu(
      [equipeDomicile.racine, blocScores, equipeExterieur.racine, blocChrono],
      this.coteEntree,
    );

    return racine;
  }

  rafraichir(etat: EtatMatch, contexte: ContexteRendu, anime: boolean): void {
    this.#etat = etat;

    for (const cote of ['domicile', 'exterieur'] as const) {
      const equipe = etat[cote];
      this.#abreges[cote].textContent = equipe.abrege;
      // La couleur de club ne vit que sur sa pastille : elle ne déborde
      // jamais sur le châssis du module.
      this.#pastilles[cote].style.setProperty('--couleur-equipe', equipe.couleur);
      this.#scores[cote].definir(String(equipe.score), anime);
    }

    this.#peindreChrono(contexte, anime);
  }

  battre(contexte: ContexteRendu): void {
    if (!this.#etat) return;
    this.#peindreChrono(contexte, true);
  }

  #peindreChrono(contexte: ContexteRendu, _anime: boolean): void {
    if (!this.#etat) return;
    const lecture = lireChrono(this.#etat, contexte.maintenantServeurMs());

    // Sans horloge — mi-temps, tirs au but, avant match — la phase prend la
    // place du chrono : le bloc ne reste jamais vide.
    const sansHorloge = lecture.horloge === null;
    this.#blocChrono.dataset['sansHorloge'] = sansHorloge ? 'oui' : 'non';
    const texteHorloge = lecture.horloge ?? lecture.phase;
    if (this.#horloge.textContent !== texteHorloge) this.#horloge.textContent = texteHorloge;
    this.#additionnel.textContent = lecture.additionnel ?? '';
    this.#phase.textContent = sansHorloge ? '' : lecture.phase;

    if (lecture.enMarche && !contexte.mouvementReduit && lecture.minuteDeJeu !== this.#derniereMinute) {
      if (this.#derniereMinute !== -1) battreLame(this.#lame);
      this.#derniereMinute = lecture.minuteDeJeu;
    }
    if (!lecture.enMarche) this.#derniereMinute = -1;
  }

  #construireEquipe(cote: 'domicile' | 'exterieur'): {
    racine: HTMLElement;
    pastille: HTMLElement;
    abrege: HTMLElement;
  } {
    const racine = element('div', `groupe equipe equipe--${cote}`);
    const pastille = element('span', 'pastille');
    const abrege = element('span', 'abrege');
    racine.append(cote === 'domicile' ? pastille : abrege, cote === 'domicile' ? abrege : pastille);
    return { racine, pastille, abrege };
  }
}

function element(balise: string, classe: string): HTMLElement {
  const noeud = document.createElement(balise);
  noeud.className = classe;
  return noeud;
}
