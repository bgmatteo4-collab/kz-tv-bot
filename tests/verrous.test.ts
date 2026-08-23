/**
 * Le verrouillage des corrections manuelles.
 *
 * C'est l'erreur la plus coûteuse possible dans ce produit : le streamer
 * corrige un score à la main, et l'API le rétablit trente secondes plus tard,
 * en direct. Ces tests existent pour que ça n'arrive jamais.
 */
import { describe, expect, it } from 'vitest';
import { Magasin } from '../serveur/etat/magasin.js';

const PROVIDER_AUTO = { nom: 'test-api', manuel: false };
const PROVIDER_MANUEL = { nom: 'manuel', manuel: true };

function magasinAuto() {
  return new Magasin({ provider: PROVIDER_AUTO });
}

describe('une correction manuelle', () => {
  it('n’est pas écrasée par le provider au cycle suivant', () => {
    const magasin = magasinAuto();
    const match = magasin.etat.identifiantMatch;

    magasin.appliquerProvider({ identifiantMatch: match, domicile: { score: 1 } });
    expect(magasin.etat.domicile.score).toBe(1);

    // Le streamer voit que le but a été refusé et corrige.
    magasin.appliquerIntention({ type: 'definir-score', cote: 'domicile', score: 0 });
    expect(magasin.etat.domicile.score).toBe(0);

    // L'API republie son score. Il ne doit rien changer.
    magasin.appliquerProvider({ identifiantMatch: match, domicile: { score: 1 } });
    expect(magasin.etat.domicile.score).toBe(0);
  });

  it('ne verrouille que le champ corrigé, pas tout le match', () => {
    const magasin = magasinAuto();
    const match = magasin.etat.identifiantMatch;

    magasin.appliquerIntention({ type: 'definir-score', cote: 'domicile', score: 3 });
    magasin.appliquerProvider({
      identifiantMatch: match,
      domicile: { score: 1 },
      exterieur: { score: 2 },
    });

    expect(magasin.etat.domicile.score).toBe(3);
    expect(magasin.etat.exterieur.score).toBe(2);
  });

  it('se lève explicitement et rend la main au provider', () => {
    const magasin = magasinAuto();
    const match = magasin.etat.identifiantMatch;

    magasin.appliquerIntention({ type: 'definir-score', cote: 'domicile', score: 0 });
    magasin.appliquerIntention({ type: 'liberer-verrou', chemin: 'domicile.score' });
    magasin.appliquerProvider({ identifiantMatch: match, domicile: { score: 2 } });

    expect(magasin.etat.domicile.score).toBe(2);
  });

  it('protège aussi le chrono et la phase', () => {
    const magasin = magasinAuto();
    const match = magasin.etat.identifiantMatch;

    magasin.appliquerIntention({ type: 'definir-statut', statut: 'mi-temps' });
    magasin.appliquerProvider({
      identifiantMatch: match,
      statut: 'seconde-periode',
      chronoEcouleMs: 46 * 60_000,
    });

    expect(magasin.etat.statut).toBe('mi-temps');
  });

  it('ne s’accumule pas quand le même champ est corrigé plusieurs fois', () => {
    const magasin = magasinAuto();
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 1 });
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 1 });
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 1 });

    expect(magasin.etat.verrous.filter((v) => v.chemin === 'domicile.score')).toHaveLength(1);
  });
});

describe('en saisie manuelle', () => {
  it('ne pose aucun verrou : la régie est déjà la seule source', () => {
    const magasin = new Magasin({ provider: PROVIDER_MANUEL });
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 1 });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'premiere-periode' });

    expect(magasin.etat.verrous).toHaveLength(0);
  });
});

describe('des données qui ne sont pas celles du match courant', () => {
  it('sont rejetées en bloc, sans regarder leur contenu', () => {
    const magasin = magasinAuto();
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 2 });

    // Un appel lent sur le match précédent revient après le changement.
    magasin.appliquerProvider({
      identifiantMatch: 'un-autre-match',
      domicile: { score: 0, nom: 'Autre' },
      statut: 'termine',
    });

    expect(magasin.etat.domicile.score).toBe(2);
    expect(magasin.etat.domicile.nom).not.toBe('Autre');
    expect(magasin.etat.statut).not.toBe('termine');
  });

  it('ne remontent pas l’âge de la dernière donnée reçue', () => {
    const magasin = magasinAuto();
    magasin.appliquerProvider({ identifiantMatch: 'ailleurs', domicile: { score: 9 } });
    expect(magasin.etat.derniereDonneeMs).toBeNull();
  });
});

describe('le provider', () => {
  it('met à jour ce qui n’est pas verrouillé et horodate la réception', () => {
    const magasin = magasinAuto();
    const match = magasin.etat.identifiantMatch;

    magasin.appliquerProvider({
      identifiantMatch: match,
      competition: 'LIGUE 1 · J14',
      domicile: { nom: 'Paris', abrege: 'PAR', score: 1 },
    });

    expect(magasin.etat.competition).toBe('LIGUE 1 · J14');
    expect(magasin.etat.domicile.nom).toBe('Paris');
    expect(magasin.etat.derniereDonneeMs).not.toBeNull();
  });
});
