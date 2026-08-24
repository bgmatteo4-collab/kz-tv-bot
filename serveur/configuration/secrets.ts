/**
 * Les secrets du poste : aujourd'hui la clé d'API, demain les autres
 * fournisseurs.
 *
 * Trois règles, et elles ne se négocient pas.
 *
 * 1. **Jamais dans le dépôt.** Le fichier vit dans `donnees/`, qui est ignoré
 *    par git. Aucune clé n'est écrite dans le code, ni dans un exemple.
 * 2. **Jamais dans l'état diffusé.** L'état part vers l'overlay, qui tourne
 *    dans une source navigateur pendant que le stream enregistre. Seul le fait
 *    qu'une clé existe est publié, jamais sa valeur.
 * 3. **Jamais dans les journaux.** Un message d'erreur qui recopie une requête
 *    complète recopierait l'en-tête d'authentification avec.
 */
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface Secrets {
  cleApiFootball: string | null;
}

const VIDE: Secrets = { cleApiFootball: null };

export class MagasinSecrets {
  #chemin: string;
  #secrets: Secrets = { ...VIDE };

  constructor(chemin: string) {
    this.#chemin = chemin;
  }

  get cleApiFootball(): string | null {
    return this.#secrets.cleApiFootball;
  }

  async charger(): Promise<void> {
    try {
      const brut = await readFile(this.#chemin, 'utf8');
      const lu = JSON.parse(brut) as Partial<Secrets>;
      this.#secrets = { cleApiFootball: lu.cleApiFootball ?? null };
    } catch (erreur) {
      const code = (erreur as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        // On ne recopie pas le contenu du fichier dans le message : il
        // contient précisément ce qu'il ne faut pas afficher.
        console.warn('[secrets] fichier illisible, on repart sans clé');
      }
      this.#secrets = { ...VIDE };
    }
  }

  async definirCleApiFootball(cle: string): Promise<void> {
    const propre = cle.trim();
    this.#secrets = { ...this.#secrets, cleApiFootball: propre === '' ? null : propre };
    await this.#ecrire();
  }

  async effacerCleApiFootball(): Promise<void> {
    this.#secrets = { ...this.#secrets, cleApiFootball: null };
    await this.#ecrire();
  }

  async #ecrire(): Promise<void> {
    const temporaire = `${this.#chemin}.${process.pid}.tmp`;
    await mkdir(dirname(this.#chemin), { recursive: true });
    await writeFile(temporaire, JSON.stringify(this.#secrets, null, 2), 'utf8');
    // Lisible par le seul propriétaire. Le poste est perso, mais un secret
    // écrit en 644 est un secret qu'on a oublié de protéger.
    await chmod(temporaire, 0o600);
    await rename(temporaire, this.#chemin);
  }
}
