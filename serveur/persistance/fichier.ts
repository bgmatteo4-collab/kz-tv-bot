/**
 * Persistance de l'état sur disque.
 *
 * Écriture atomique — fichier temporaire puis renommage — pour qu'un serveur
 * tué en plein milieu d'une écriture ne laisse jamais un fichier tronqué. Au
 * redémarrage en plein match, on repart de l'état, pas de zéro.
 *
 * L'écriture est différée : un but suivi d'une correction produit une seule
 * écriture, pas trois.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { EtatMatch } from '../../partage/contrats/etat.js';

const DELAI_ECRITURE_MS = 250;

export class EtatPersiste {
  #chemin: string;
  #minuterie: NodeJS.Timeout | null = null;
  #enAttente: EtatMatch | null = null;
  #ecritureEnCours: Promise<void> = Promise.resolve();

  constructor(chemin: string) {
    this.#chemin = chemin;
  }

  /** Relit l'état du disque. Renvoie null si rien n'a encore été écrit. */
  async lire(): Promise<EtatMatch | null> {
    try {
      const brut = await readFile(this.#chemin, 'utf8');
      return JSON.parse(brut) as EtatMatch;
    } catch (erreur) {
      const code = (erreur as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return null;
      // Un fichier illisible ne doit pas empêcher le serveur de démarrer :
      // en direct, mieux vaut un match vierge qu'un serveur qui refuse de
      // se lancer.
      console.warn(`[persistance] état illisible, on repart à vide : ${String(erreur)}`);
      return null;
    }
  }

  /** Programme une écriture. Les appels rapprochés se fondent en une seule. */
  planifier(etat: EtatMatch): void {
    this.#enAttente = etat;
    if (this.#minuterie) return;
    this.#minuterie = setTimeout(() => {
      this.#minuterie = null;
      void this.vider();
    }, DELAI_ECRITURE_MS);
  }

  /** Écrit immédiatement ce qui est en attente. */
  async vider(): Promise<void> {
    if (this.#minuterie) {
      clearTimeout(this.#minuterie);
      this.#minuterie = null;
    }
    const etat = this.#enAttente;
    if (!etat) return;
    this.#enAttente = null;

    this.#ecritureEnCours = this.#ecritureEnCours.then(() => this.#ecrire(etat));
    await this.#ecritureEnCours;
  }

  async #ecrire(etat: EtatMatch): Promise<void> {
    const temporaire = `${this.#chemin}.${process.pid}.tmp`;
    try {
      await mkdir(dirname(this.#chemin), { recursive: true });
      await writeFile(temporaire, JSON.stringify(etat, null, 2), 'utf8');
      await rename(temporaire, this.#chemin);
    } catch (erreur) {
      console.error(`[persistance] écriture impossible : ${String(erreur)}`);
    }
  }
}
