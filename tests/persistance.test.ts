/**
 * La persistance. Si le serveur redémarre en plein match, il repart où il en
 * était — pas à zéro devant un public qui regarde.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EtatPersiste } from '../serveur/persistance/fichier.js';
import { Magasin } from '../serveur/etat/magasin.js';

let dossier: string | null = null;

async function fichierTemporaire(): Promise<string> {
  dossier = await mkdtemp(join(tmpdir(), 'touchline-'));
  return join(dossier, 'sous-dossier', 'etat.json');
}

afterEach(async () => {
  if (dossier) await rm(dossier, { recursive: true, force: true });
  dossier = null;
});

describe('l’état persisté', () => {
  it('se relit à l’identique après un redémarrage', async () => {
    const chemin = await fichierTemporaire();
    const magasin = new Magasin();
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 2 });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'seconde-periode' });

    const persistance = new EtatPersiste(chemin);
    persistance.planifier(magasin.etat);
    await persistance.vider();

    const relu = await new EtatPersiste(chemin).lire();
    expect(relu).toEqual(magasin.etat);
  });

  it('crée l’arborescence manquante plutôt que d’échouer', async () => {
    const chemin = await fichierTemporaire();
    const persistance = new EtatPersiste(chemin);
    persistance.planifier(new Magasin().etat);
    await persistance.vider();

    await expect(readFile(chemin, 'utf8')).resolves.toContain('identifiantMatch');
  });

  it('renvoie null quand rien n’a encore été écrit', async () => {
    const chemin = await fichierTemporaire();
    await expect(new EtatPersiste(chemin).lire()).resolves.toBeNull();
  });

  it('repart à vide plutôt que de refuser de démarrer sur un fichier abîmé', async () => {
    // En direct, un serveur qui ne se lance pas est pire qu'un match vierge.
    const chemin = await fichierTemporaire();
    const persistance = new EtatPersiste(chemin);
    persistance.planifier(new Magasin().etat);
    await persistance.vider();
    await writeFile(chemin, '{ ceci n’est pas du JSON', 'utf8');

    await expect(new EtatPersiste(chemin).lire()).resolves.toBeNull();
  });

  it('fond les écritures rapprochées en une seule', async () => {
    const chemin = await fichierTemporaire();
    const persistance = new EtatPersiste(chemin);
    const magasin = new Magasin();

    for (let but = 0; but < 5; but += 1) {
      magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 1 });
      persistance.planifier(magasin.etat);
    }
    await persistance.vider();

    const relu = await new EtatPersiste(chemin).lire();
    expect(relu?.domicile.score).toBe(5);
  });
});
