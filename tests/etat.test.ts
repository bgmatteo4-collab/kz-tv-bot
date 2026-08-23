/**
 * L'état et le chrono. C'est là qu'est le risque : une erreur ici se voit à
 * l'antenne, en grand, pendant que le streamer parle.
 */
import { describe, expect, it } from 'vitest';
import { lireChrono, tempsDeJeuMs } from '../partage/contrats/chrono.js';
import { Magasin } from '../serveur/etat/magasin.js';
import { etatInitial } from '../serveur/etat/etat-initial.js';

const MINUTE = 60_000;
const PROVIDER_AUTO = { nom: 'test', manuel: false };

/** Horloge pilotée à la main : les tests n'attendent pas de vraies minutes. */
function horloge(depart = 1_000_000) {
  let maintenant = depart;
  return {
    maintenant: () => maintenant,
    avancer: (ms: number) => {
      maintenant += ms;
    },
  };
}

describe('le chrono', () => {
  it('s’interpole entre deux réceptions plutôt que de se compter localement', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'premiere-periode' });

    temps.avancer(30 * 1000);
    expect(tempsDeJeuMs(magasin.etat, temps.maintenant())).toBe(30 * 1000);
  });

  it('se fige quand il est arrêté', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'premiere-periode' });
    temps.avancer(20 * 1000);
    magasin.appliquerIntention({ type: 'arreter-chrono' });
    temps.avancer(10 * MINUTE);

    expect(tempsDeJeuMs(magasin.etat, temps.maintenant())).toBe(20 * 1000);
  });

  it('reprend la seconde période à 45:00, sans réglage préalable', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'seconde-periode' });

    expect(lireChrono(magasin.etat, temps.maintenant()).horloge).toBe('45:00');
    expect(magasin.etat.chrono.enMarche).toBe(true);
  });

  it('affiche le temps vidéo, pas le temps réel', () => {
    // Le match est à 78:00, le streamer commente avec 40 s de retard :
    // l'antenne doit lire 77:20, sinon l'overlay annonce le but avant que
    // le public le voie.
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'seconde-periode' });
    magasin.appliquerIntention({ type: 'definir-decalage-video', secondes: 40 });
    magasin.appliquerIntention({ type: 'definir-chrono', ecouleMs: 78 * MINUTE });

    expect(lireChrono(magasin.etat, temps.maintenant()).horloge).toBe('77:20');
  });

  it('ne descend jamais sous zéro à cause du décalage', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    magasin.appliquerIntention({ type: 'definir-decalage-video', secondes: 60 });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'premiere-periode' });

    expect(lireChrono(magasin.etat, temps.maintenant()).horloge).toBe('0:00');
  });

  it('n’affiche pas d’horloge quand la phase n’en a pas', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });

    for (const statut of ['mi-temps', 'tirs-au-but', 'termine', 'avant-match'] as const) {
      magasin.appliquerIntention({ type: 'definir-statut', statut });
      expect(lireChrono(magasin.etat, temps.maintenant()).horloge).toBeNull();
    }
  });

  it('annonce le temps additionnel sans casser l’horloge', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'seconde-periode' });
    magasin.appliquerIntention({ type: 'definir-temps-additionnel', minutes: 4 });
    temps.avancer(46 * MINUTE);

    const lecture = lireChrono(magasin.etat, temps.maintenant());
    expect(lecture.horloge).toBe('91:00');
    expect(lecture.additionnel).toBe('+4');
  });

  it('remet le temps additionnel à zéro au coup d’envoi suivant', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    magasin.appliquerIntention({ type: 'definir-temps-additionnel', minutes: 3 });
    magasin.appliquerIntention({ type: 'definir-statut', statut: 'seconde-periode' });

    expect(magasin.etat.chrono.tempsAdditionnel).toBe(0);
  });
});

describe('le score', () => {
  it('ne descend jamais sous zéro', () => {
    const magasin = new Magasin();
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: -1 });
    expect(magasin.etat.domicile.score).toBe(0);
  });

  it('incrémente le bon côté', () => {
    const magasin = new Magasin();
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'exterieur', delta: 1 });
    expect(magasin.etat.exterieur.score).toBe(1);
    expect(magasin.etat.domicile.score).toBe(0);
  });
});

describe('le numéro de séquence', () => {
  it('croît strictement à chaque changement', () => {
    const magasin = new Magasin();
    const depart = magasin.sequence;
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 1 });
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 1 });
    expect(magasin.sequence).toBe(depart + 2);
  });
});

describe('un nouveau match', () => {
  it('garde le décalage du flux, qui est un réglage du poste', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    magasin.appliquerIntention({ type: 'definir-decalage-video', secondes: 45 });
    magasin.appliquerIntention({ type: 'ajuster-score', cote: 'domicile', delta: 2 });
    magasin.appliquerIntention({ type: 'nouveau-match' });

    expect(magasin.etat.decalageVideoSecondes).toBe(45);
    expect(magasin.etat.domicile.score).toBe(0);
  });

  it('change d’identifiant de rencontre', () => {
    const temps = horloge();
    const magasin = new Magasin({ maintenant: temps.maintenant });
    const avant = magasin.etat.identifiantMatch;
    temps.avancer(1000);
    magasin.appliquerIntention({ type: 'nouveau-match' });

    expect(magasin.etat.identifiantMatch).not.toBe(avant);
  });
});

describe('l’état initial', () => {
  it('n’affiche rien tant que la régie n’a pas diffusé', () => {
    const etat = etatInitial(0, PROVIDER_AUTO);
    expect(etat.modules['bandeau-score'].visible).toBe(false);
  });
});
