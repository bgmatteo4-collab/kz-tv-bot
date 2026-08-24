/**
 * Le régisseur : qui occupe le centre du cadre.
 *
 * Une seule règle gouverne ce fichier, et elle vient du fait qu'aucune vidéo ne
 * passe sous l'overlay : **le centre n'est jamais vide entre deux scènes**. La
 * sortante ne disparaît qu'une fois l'entrante en place. Un trou d'une seule
 * frame, c'est un clignotement noir en plein direct.
 *
 * La scène caméra est l'exception assumée : ne rien dessiner est précisément
 * son travail, puisque c'est OBS qui compose la webcam derrière.
 */
import type { EtatMatch, NomScene } from '../../partage/contrats/etat.js';
import type { RaisonEtat } from '../../partage/contrats/messages.js';
import { deplierCorps, poserLame, replierCorps, retirerLame } from './animation.js';
import type { ContexteRendu, Scene } from '../scenes/scene.js';

interface SceneMontee {
  nom: NomScene;
  scene: Scene;
  racine: HTMLElement;
}

/** Une seconde : le temps se met à jour à la seconde, pas à chaque frame. */
const PERIODE_BATTEMENT_MS = 1000;

export class Regisseur {
  #hote: HTMLElement;
  #contexte: ContexteRendu;
  #fabriques = new Map<NomScene, () => Scene>();
  #courante: SceneMontee | null = null;
  #demandee: NomScene | null = null;
  #enTransition = false;
  #battement: ReturnType<typeof setInterval> | null = null;

  constructor(hote: HTMLElement, contexte: ContexteRendu) {
    this.#hote = hote;
    this.#contexte = contexte;
  }

  /** La scène caméra n'a pas de fabrique : ne rien monter est son rendu. */
  enregistrer(nom: NomScene, fabrique: () => Scene): void {
    this.#fabriques.set(nom, fabrique);
  }

  demarrer(): void {
    this.#battement ??= setInterval(() => {
      this.#courante?.scene.battre?.(this.#contexte);
    }, PERIODE_BATTEMENT_MS);
  }

  arreter(): void {
    if (this.#battement) clearInterval(this.#battement);
    this.#battement = null;
  }

  appliquer(etat: EtatMatch, raison: RaisonEtat): void {
    const instantane = raison === 'synchronisation' || this.#contexte.mouvementReduit;

    if (this.#courante?.nom === etat.scene) {
      this.#courante.scene.rafraichir(etat, this.#contexte, !instantane);
      return;
    }

    this.#demandee = etat.scene;
    void this.#basculer(etat, instantane);
  }

  async #basculer(etat: EtatMatch, instantane: boolean): Promise<void> {
    // Une bascule à la fois. Si le streamer enchaîne les scènes plus vite que
    // les animations, on ne joue que la dernière demandée.
    if (this.#enTransition) return;
    this.#enTransition = true;

    while (this.#demandee !== null && this.#demandee !== this.#courante?.nom) {
      const vise = this.#demandee;
      const sortante = this.#courante;

      const fabrique = this.#fabriques.get(vise);
      const entrante = fabrique ? this.#monter(vise, fabrique(), etat, instantane) : null;
      this.#courante = entrante;

      // L'entrante est déjà en place quand la sortante s'en va : le centre ne
      // se vide jamais entre les deux.
      if (entrante && !instantane) await this.#jouerEntree(entrante);
      if (sortante) await this.#demonter(sortante, instantane);

      if (this.#demandee === vise) this.#demandee = null;
    }

    this.#enTransition = false;
  }

  #monter(nom: NomScene, scene: Scene, etat: EtatMatch, instantane: boolean): SceneMontee {
    const racine = scene.construire(etat, this.#contexte);
    racine.dataset['scene'] = nom;
    this.#hote.append(racine);
    scene.rafraichir(etat, this.#contexte, false);
    if (instantane) racine.dataset['pose'] = 'oui';
    return { nom, scene, racine };
  }

  async #jouerEntree(montee: SceneMontee): Promise<void> {
    const lame = montee.racine.querySelector<HTMLElement>('[data-role="lame"]');
    const corps = montee.racine.querySelector<HTMLElement>('[data-role="corps"]');
    montee.racine.dataset['pose'] = 'oui';
    if (!lame || !corps) return;
    await poserLame(lame).finished;
    await deplierCorps(corps, 'gauche').finished;
  }

  async #demonter(montee: SceneMontee, instantane: boolean): Promise<void> {
    const retirer = () => {
      montee.scene.detruire?.();
      montee.racine.remove();
    };

    const lame = montee.racine.querySelector<HTMLElement>('[data-role="lame"]');
    const corps = montee.racine.querySelector<HTMLElement>('[data-role="corps"]');
    if (instantane || !lame || !corps) {
      retirer();
      return;
    }

    // La sortie inverse l'entrée, et la lame disparaît en dernier.
    await replierCorps(corps, 'gauche').finished;
    await retirerLame(lame).finished;
    retirer();
  }
}
