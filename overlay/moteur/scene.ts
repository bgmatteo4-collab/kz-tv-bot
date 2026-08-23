/**
 * La scène : qui est à l'écran, et dans quel ordre.
 *
 * Elle monte et démonte les modules selon l'état, et elle sérialise les
 * entrées — jamais deux modules qui entrent en même temps, décalage de 80 ms.
 *
 * Un module masqué est retiré du DOM, pas laissé en `opacity: 0` : le
 * navigateur d'OBS continuerait à le composer à chaque frame, pour rien.
 */
import type { EtatMatch, NomModule } from '../../partage/contrats/etat.js';
import type { RaisonEtat } from '../../partage/contrats/messages.js';
import { DUREES } from '../../partage/design/tokens.js';
import { deplierCorps, poserLame, replierCorps, retirerLame } from './animation.js';
import type { ContexteRendu, ModuleOverlay } from './module.js';

interface ModuleMonte {
  module: ModuleOverlay;
  racine: HTMLElement;
}

/** Une seconde : le chrono se met à jour à la seconde, pas à chaque frame. */
const PERIODE_BATTEMENT_MS = 1000;

export class Scene {
  #hote: HTMLElement;
  #contexte: ContexteRendu;
  #disponibles = new Map<NomModule, ModuleOverlay>();
  #montes = new Map<NomModule, ModuleMonte>();
  #fileEntrees: NomModule[] = [];
  #fileEnCours = false;
  #battement: ReturnType<typeof setInterval> | null = null;

  constructor(hote: HTMLElement, contexte: ContexteRendu) {
    this.#hote = hote;
    this.#contexte = contexte;
  }

  enregistrer(module: ModuleOverlay): void {
    this.#disponibles.set(module.nom, module);
  }

  demarrer(): void {
    this.#battement ??= setInterval(() => {
      for (const { module } of this.#montes.values()) module.battre?.(this.#contexte);
    }, PERIODE_BATTEMENT_MS);
  }

  arreter(): void {
    if (this.#battement) clearInterval(this.#battement);
    this.#battement = null;
  }

  /**
   * Répercute un état.
   *
   * Sur une resynchronisation — première connexion, retour du serveur, OBS qui
   * recharge la page — les modules visibles sont posés dans leur état final,
   * sans rejouer leur entrée. L'overlay se réaligne sans clignoter.
   */
  appliquer(etat: EtatMatch, raison: RaisonEtat): void {
    const instantane = raison === 'synchronisation';

    for (const [nom, module] of this.#disponibles) {
      const doitEtreVisible = etat.modules[nom]?.visible ?? false;
      const monte = this.#montes.get(nom);

      if (doitEtreVisible && !monte) {
        this.#monter(module, etat, instantane);
      } else if (!doitEtreVisible && monte) {
        this.#demonter(nom, instantane);
      } else if (monte) {
        monte.module.rafraichir(etat, this.#contexte, !instantane);
      }
    }
  }

  #monter(module: ModuleOverlay, etat: EtatMatch, instantane: boolean): void {
    const racine = module.construire(etat, this.#contexte);
    racine.dataset['module'] = module.nom;
    racine.dataset['entree'] = module.coteEntree;
    this.#hote.append(racine);
    this.#montes.set(module.nom, { module, racine });
    module.rafraichir(etat, this.#contexte, false);

    if (instantane || this.#contexte.mouvementReduit) {
      racine.dataset['pose'] = 'oui';
      return;
    }
    this.#fileEntrees.push(module.nom);
    void this.#viderFile();
  }

  /**
   * Les entrées passent une par une. Deux modules qui arrivent ensemble se
   * disputent l'attention, et la lame perd son rôle d'indicateur d'origine.
   */
  async #viderFile(): Promise<void> {
    if (this.#fileEnCours) return;
    this.#fileEnCours = true;

    while (this.#fileEntrees.length > 0) {
      const nom = this.#fileEntrees.shift();
      const monte = nom ? this.#montes.get(nom) : undefined;
      if (!monte) continue;
      await this.#jouerEntree(monte);
      await patienter(DUREES.sequence);
    }
    this.#fileEnCours = false;
  }

  async #jouerEntree(monte: ModuleMonte): Promise<void> {
    const lame = monte.racine.querySelector<HTMLElement>('[data-role="lame"]');
    const corps = monte.racine.querySelector<HTMLElement>('[data-role="corps"]');
    if (!lame || !corps) return;

    monte.racine.dataset['pose'] = 'oui';
    await poserLame(lame).finished;
    await deplierCorps(corps, monte.module.coteEntree).finished;
  }

  #demonter(nom: NomModule, instantane: boolean): void {
    const monte = this.#montes.get(nom);
    if (!monte) return;
    this.#montes.delete(nom);
    this.#fileEntrees = this.#fileEntrees.filter((attendu) => attendu !== nom);

    const retirer = () => {
      monte.module.detruire?.();
      monte.racine.remove();
    };

    if (instantane || this.#contexte.mouvementReduit) {
      retirer();
      return;
    }

    const lame = monte.racine.querySelector<HTMLElement>('[data-role="lame"]');
    const corps = monte.racine.querySelector<HTMLElement>('[data-role="corps"]');
    if (!lame || !corps) {
      retirer();
      return;
    }

    // La sortie inverse l'entrée, et la lame disparaît en dernier.
    void replierCorps(corps, monte.module.coteEntree).finished.then(async () => {
      await retirerLame(lame).finished;
      retirer();
    });
  }
}

function patienter(ms: number): Promise<void> {
  return new Promise((resoudre) => setTimeout(resoudre, ms));
}
