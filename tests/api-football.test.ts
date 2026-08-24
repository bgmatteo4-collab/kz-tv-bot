/**
 * La traduction des données API-Football.
 *
 * Elle est testée sur des charges enregistrées, et pas contre l'API : la clé
 * appartient à Matteo, elle n'a rien à faire dans un dépôt ni dans une suite de
 * tests. Ce qui compte ici, c'est que la traduction soit juste et qu'elle ne
 * fabrique jamais une donnée qu'elle n'a pas reçue.
 */
import { describe, expect, it } from 'vitest';
import {
  abregerNom,
  resumerRencontre,
  statutDepuisApi,
  traduireRencontre,
  type RencontreApi,
} from '../serveur/providers/api-football/correspondance.js';
import { saisonPour } from '../serveur/providers/api-football/index.js';
import { Magasin } from '../serveur/etat/magasin.js';

const MINUTE = 60_000;

function rencontre(surcharge: Partial<RencontreApi> = {}): RencontreApi {
  return {
    fixture: { id: 1035037, date: '2026-02-14T20:00:00+00:00', status: { short: '2H', elapsed: 67 } },
    league: { id: 61, name: 'Ligue 1', round: 'Regular Season - 23' },
    teams: { home: { id: 85, name: 'Paris Saint Germain' }, away: { id: 81, name: 'Marseille' } },
    goals: { home: 2, away: 1 },
    ...surcharge,
  };
}

describe('les statuts', () => {
  it('couvrent les phases qui arrivent à chaque match', () => {
    expect(statutDepuisApi('NS')).toBe('avant-match');
    expect(statutDepuisApi('1H')).toBe('premiere-periode');
    expect(statutDepuisApi('HT')).toBe('mi-temps');
    expect(statutDepuisApi('2H')).toBe('seconde-periode');
  });

  it('couvrent les prolongations et les tirs au but', () => {
    expect(statutDepuisApi('ET')).toBe('prolongation-1');
    expect(statutDepuisApi('BT')).toBe('pause-prolongation');
    expect(statutDepuisApi('P')).toBe('tirs-au-but');
  });

  it('traitent les trois façons de finir comme une fin', () => {
    for (const court of ['FT', 'AET', 'PEN']) {
      expect(statutDepuisApi(court)).toBe('termine');
    }
  });

  it('renvoient null sur un code inconnu plutôt que d’en inventer un', () => {
    expect(statutDepuisApi('ZZZ')).toBeNull();
    expect(statutDepuisApi(undefined)).toBeNull();
  });
});

describe('les abrégés', () => {
  it('prennent les initiales d’un nom composé', () => {
    expect(abregerNom('Paris Saint Germain')).toBe('PSG');
    expect(abregerNom('Borussia Mönchengladbach')).toBe('BM');
  });

  it('prennent les trois premières lettres d’un nom simple', () => {
    expect(abregerNom('Marseille')).toBe('MAR');
    expect(abregerNom('Lens')).toBe('LEN');
  });

  it('ignorent les particules et les mentions de club', () => {
    expect(abregerNom('AS Saint-Étienne')).toBe('SE');
  });
});

describe('la traduction d’une rencontre', () => {
  it('reprend équipes, score, compétition et phase', () => {
    const donnees = traduireRencontre(rencontre(), 'match-1');
    expect(donnees).not.toBeNull();
    expect(donnees?.domicile?.nom).toBe('Paris Saint Germain');
    expect(donnees?.domicile?.score).toBe(2);
    expect(donnees?.exterieur?.score).toBe(1);
    expect(donnees?.statut).toBe('seconde-periode');
    expect(donnees?.competition).toBe('Ligue 1 · Regular Season - 23');
  });

  it('transmet la minute, jamais des millisecondes', () => {
    // L'API ne connaît que la minute. Prétendre à la seconde ferait sauter le
    // chrono à chaque interrogation.
    const donnees = traduireRencontre(rencontre(), 'match-1');
    expect(donnees?.chronoMinute).toBe(67);
    expect(donnees?.chronoEcouleMs).toBeUndefined();
  });

  it('n’écrit pas un score de zéro quand l’API n’en donne pas', () => {
    // Avant le coup d'envoi, `goals` vaut null. Écrire 0 effacerait une
    // composition d'avant-match saisie à la main.
    const donnees = traduireRencontre(
      rencontre({ goals: { home: null, away: null }, fixture: { id: 1, status: { short: 'NS' } } }),
      'match-1',
    );
    expect(donnees?.domicile?.score).toBeUndefined();
    expect(donnees?.exterieur?.score).toBeUndefined();
  });

  it('arrête le chrono sur les phases qui ne courent pas', () => {
    const aLaPause = traduireRencontre(
      rencontre({ fixture: { id: 1, status: { short: 'HT', elapsed: 45 } } }),
      'match-1',
    );
    expect(aLaPause?.chronoEnMarche).toBe(false);
  });

  it('renonce plutôt que de traduire une rencontre sans équipes', () => {
    expect(traduireRencontre({ fixture: { id: 1 } }, 'match-1')).toBeNull();
  });
});

describe('le résumé pour la régie', () => {
  it('donne de quoi choisir une rencontre', () => {
    const resume = resumerRencontre(rencontre());
    expect(resume?.identifiantFournisseur).toBe('1035037');
    expect(resume?.domicile).toBe('Paris Saint Germain');
    expect(resume?.statutApi).toBe('2H');
  });
});

describe('la saison', () => {
  it('porte le millésime de l’année d’ouverture', () => {
    expect(saisonPour('2026-02-14T20:00:00Z')).toBe(2025);
    expect(saisonPour('2025-09-14T20:00:00Z')).toBe(2025);
  });
});

describe('le recalage du chrono sur une minute', () => {
  /**
   * La phase est posée par le provider, pas par une intention : passer par la
   * régie la verrouillerait, et on ne testerait plus le cas courant.
   */
  function magasinEnSecondePeriode() {
    let maintenant = 1_000_000;
    const magasin = new Magasin({
      maintenant: () => maintenant,
      provider: { nom: 'api-football', manuel: false },
    });
    magasin.appliquerProvider({
      identifiantMatch: magasin.etat.identifiantMatch,
      statut: 'seconde-periode',
      chronoMinute: 45,
      chronoEnMarche: true,
    });
    return { magasin, avancer: (ms: number) => (maintenant += ms) };
  }

  it('laisse le chrono tranquille quand il est d’accord avec l’API', () => {
    // On affiche 45:38, l'API dit « 45 ». Recaler ferait reculer le chrono de
    // trente-huit secondes à l'antenne.
    const { magasin, avancer } = magasinEnSecondePeriode();
    avancer(38_000);
    const avant = magasin.etat.chrono.ecouleMs;

    magasin.appliquerProvider({
      identifiantMatch: magasin.etat.identifiantMatch,
      chronoMinute: 45,
      statut: 'seconde-periode',
    });

    expect(magasin.etat.chrono.ecouleMs).toBe(avant);
  });

  it('recale quand la dérive devient visible', () => {
    const { magasin } = magasinEnSecondePeriode();
    magasin.appliquerProvider({
      identifiantMatch: magasin.etat.identifiantMatch,
      chronoMinute: 67,
      statut: 'seconde-periode',
    });

    expect(magasin.etat.chrono.ecouleMs).toBe(67 * MINUTE);
  });

  it('recale sans hésiter quand la phase change', () => {
    const { magasin, avancer } = magasinEnSecondePeriode();
    avancer(30_000);
    magasin.appliquerProvider({
      identifiantMatch: magasin.etat.identifiantMatch,
      statut: 'prolongation-1',
      chronoMinute: 90,
    });

    expect(magasin.etat.chrono.ecouleMs).toBe(90 * MINUTE);
  });

  it('ne recale pas sur une phase que l’état n’a pas appliquée', () => {
    // Le streamer a pris la main sur la phase. La proposition du provider
    // n'ayant pas eu lieu, il n'y a pas de transition à suivre.
    const { magasin, avancer } = magasinEnSecondePeriode();
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'mi-temps' });
    magasin.appliquerIntention({ type: 'demarrer-chrono' });
    magasin.appliquerIntention({ type: 'liberer-verrou', chemin: 'chrono' });
    avancer(30_000);
    const avant = magasin.etat.chrono.ecouleMs;

    magasin.appliquerProvider({
      identifiantMatch: magasin.etat.identifiantMatch,
      statut: 'prolongation-1',
      chronoMinute: 46,
    });

    expect(magasin.etat.chrono.ecouleMs).toBe(avant);
  });

  it('ne touche à rien si le chrono a été corrigé à la main', () => {
    const { magasin } = magasinEnSecondePeriode();
    magasin.appliquerIntention({ type: 'definir-chrono', ecouleMs: 50 * MINUTE });
    magasin.appliquerProvider({
      identifiantMatch: magasin.etat.identifiantMatch,
      chronoMinute: 67,
      statut: 'seconde-periode',
    });

    expect(magasin.etat.chrono.ecouleMs).toBe(50 * MINUTE);
  });
});
