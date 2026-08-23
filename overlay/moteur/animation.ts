/**
 * Les gestes d'animation du produit.
 *
 * Deux règles gouvernent ce fichier :
 *
 * - On n'anime que `transform` et `opacity`. Toute autre propriété déclenche
 *   un recalcul de mise en page à chaque frame, et le poste du streamer
 *   encode déjà de la vidéo.
 * - Rien n'apparaît en fondu. Un module se déplie depuis sa lame ; un chiffre
 *   qui change monte. Le fondu est le réflexe par défaut, et c'est celui
 *   qu'on refuse.
 *
 * Toutes les durées et les courbes viennent des tokens. Aucune valeur en dur.
 */
import { COURBES, DUREES } from '../../partage/design/tokens.js';
import type { CoteEntree } from './module.js';

function sens(cote: CoteEntree): -1 | 1 {
  return cote === 'gauche' ? -1 : 1;
}

/** La lame se pose : elle se déploie sur toute la hauteur du module. */
export function poserLame(lame: HTMLElement): Animation {
  return lame.animate(
    [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
    { duration: DUREES.lame, easing: COURBES.entree, fill: 'both' },
  );
}

export function retirerLame(lame: HTMLElement): Animation {
  return lame.animate(
    [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }],
    { duration: DUREES.lame, easing: COURBES.sortie, fill: 'both' },
  );
}

/**
 * Le corps se déplie depuis la lame : il glisse hors de dessous elle. La
 * découpe est portée par le conteneur du module, donc rien ne déborde et
 * rien n'est déformé — un `scaleX` écraserait le texte.
 */
export function deplierCorps(corps: HTMLElement, cote: CoteEntree): Animation {
  return corps.animate(
    [{ transform: `translateX(${sens(cote) * 100}%)` }, { transform: 'translateX(0)' }],
    { duration: DUREES.entree, easing: COURBES.entree, fill: 'both' },
  );
}

export function replierCorps(corps: HTMLElement, cote: CoteEntree): Animation {
  return corps.animate(
    [{ transform: 'translateX(0)' }, { transform: `translateX(${sens(cote) * 100}%)` }],
    { duration: DUREES.sortie, easing: COURBES.sortie, fill: 'both' },
  );
}

/**
 * Le contenu se révèle en cascade derrière la découpe du module. Décalage de
 * 40 ms entre deux groupes, et un déplacement seul — pas d'opacité, pour ne
 * pas réintroduire le fondu par la fenêtre.
 */
export function revelerContenu(groupes: readonly HTMLElement[], cote: CoteEntree): void {
  groupes.forEach((groupe, rang) => {
    groupe.animate(
      [{ transform: `translateX(${sens(cote) * 24}px)` }, { transform: 'translateX(0)' }],
      {
        duration: DUREES.entree,
        delay: DUREES.cascade * (rang + 1),
        easing: COURBES.entree,
        fill: 'both',
      },
    );
  });
}

/**
 * Le geste des tableaux de stade : l'ancien chiffre sort par le haut, le
 * nouveau entre par le bas.
 */
export function faireMonterValeur(sortant: HTMLElement, entrant: HTMLElement): Animation {
  sortant.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
    { duration: DUREES.valeur, easing: COURBES.valeur, fill: 'both' },
  );
  return entrant.animate(
    [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
    { duration: DUREES.valeur, easing: COURBES.valeur, fill: 'both' },
  );
}

/**
 * Le pouls de la lame, une fois par minute de jeu. Discret à l'écran, mais il
 * donne un rythme au bandeau. Jamais à la mi-temps : il ne bat que quand le
 * temps de jeu s'écoule.
 */
export function battreLame(lame: HTMLElement): Animation {
  return lame.animate([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], {
    duration: DUREES.pouls,
    easing: COURBES.valeur,
  });
}
