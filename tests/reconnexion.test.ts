/**
 * La liaison temps réel.
 *
 * C'est la pièce qui a coulé la version précédente du projet : sans autorité
 * unique et sans reconnexion silencieuse, il fallait rafraîchir l'overlay à la
 * main, en plein direct. Ces tests décrivent ce qui ne doit plus jamais
 * arriver.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EtatMatch } from '../partage/contrats/etat.js';
import type { MessageEtat, RaisonEtat } from '../partage/contrats/messages.js';
import { Liaison } from '../partage/liaison/connexion.js';
import { etatInitial } from '../serveur/etat/etat-initial.js';

/** Un WebSocket de laboratoire : on décide quand il s'ouvre et quand il meurt. */
class SocketFactice {
  static readonly OPEN = 1;
  static ouverts: SocketFactice[] = [];

  readyState = 0;
  envoyes: string[] = [];
  #ecouteurs = new Map<string, ((evenement: unknown) => void)[]>();

  constructor(readonly url: string) {
    SocketFactice.ouverts.push(this);
  }

  addEventListener(type: string, ecouteur: (evenement: unknown) => void): void {
    const liste = this.#ecouteurs.get(type) ?? [];
    liste.push(ecouteur);
    this.#ecouteurs.set(type, liste);
  }

  send(charge: string): void {
    this.envoyes.push(charge);
  }

  close(): void {
    this.readyState = 3;
    this.#emettre('close', {});
  }

  ouvrir(): void {
    this.readyState = SocketFactice.OPEN;
    this.#emettre('open', {});
  }

  recevoir(message: MessageEtat): void {
    this.#emettre('message', { data: JSON.stringify(message) });
  }

  #emettre(type: string, evenement: unknown): void {
    for (const ecouteur of this.#ecouteurs.get(type) ?? []) ecouteur(evenement);
  }
}

function message(etat: EtatMatch, sequence: number, raison: RaisonEtat, horodatage = 0): MessageEtat {
  return { type: 'etat', sequence, horodatageServeur: horodatage || Date.now(), raison, etat };
}

let recus: { etat: EtatMatch; raison: RaisonEtat }[] = [];
let statuts: string[] = [];
let liaison: Liaison;

beforeEach(() => {
  vi.useFakeTimers();
  SocketFactice.ouverts = [];
  recus = [];
  statuts = [];
  vi.stubGlobal('WebSocket', SocketFactice);
  liaison = new Liaison({
    adresse: 'ws://localhost:4000/temps-reel',
    surEtat: (etat, raison) => recus.push({ etat, raison }),
    surStatut: (statut) => statuts.push(statut),
  });
  liaison.connecter();
});

afterEach(() => {
  liaison.fermer();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function dernierSocket(): SocketFactice {
  const socket = SocketFactice.ouverts.at(-1);
  if (!socket) throw new Error('aucun socket ouvert');
  return socket;
}

const PROVIDER = { nom: 'test', manuel: false };

describe('les messages périmés', () => {
  it('sont ignorés, jamais appliqués', () => {
    const socket = dernierSocket();
    socket.ouvrir();

    const recent = etatInitial(0, PROVIDER);
    const ancien = { ...etatInitial(0, PROVIDER), competition: 'PÉRIMÉ' };

    socket.recevoir(message(recent, 5, 'mise-a-jour'));
    socket.recevoir(message(ancien, 3, 'mise-a-jour'));

    expect(recus).toHaveLength(1);
    expect(recus[0]?.etat.competition).not.toBe('PÉRIMÉ');
  });

  it('rejette aussi un numéro identique', () => {
    const socket = dernierSocket();
    socket.ouvrir();
    socket.recevoir(message(etatInitial(0, PROVIDER), 2, 'mise-a-jour'));
    socket.recevoir(message(etatInitial(0, PROVIDER), 2, 'mise-a-jour'));

    expect(recus).toHaveLength(1);
  });
});

describe('un serveur qui redémarre', () => {
  it('reprend la main même si sa séquence repart de zéro', () => {
    // Sans ce comportement, l'overlay resterait figé pour de bon après un
    // redémarrage : tous les messages du serveur neuf seraient « périmés ».
    const premier = dernierSocket();
    premier.ouvrir();
    premier.recevoir(message(etatInitial(0, PROVIDER), 42, 'mise-a-jour'));
    expect(recus).toHaveLength(1);

    premier.close();
    vi.advanceTimersByTime(1000);

    const second = dernierSocket();
    second.ouvrir();
    const apresRedemarrage = { ...etatInitial(0, PROVIDER), competition: 'APRÈS REDÉMARRAGE' };
    second.recevoir(message(apresRedemarrage, 0, 'synchronisation'));

    expect(recus).toHaveLength(2);
    expect(recus[1]?.etat.competition).toBe('APRÈS REDÉMARRAGE');
    expect(recus[1]?.raison).toBe('synchronisation');
  });
});

describe('la reconnexion', () => {
  it('est silencieuse et automatique', () => {
    dernierSocket().ouvrir();
    const avant = SocketFactice.ouverts.length;

    dernierSocket().close();
    vi.advanceTimersByTime(1000);

    expect(SocketFactice.ouverts.length).toBe(avant + 1);
  });

  it('ne dépasse jamais cinq secondes entre deux tentatives', () => {
    dernierSocket().ouvrir();

    // Dix échecs d'affilée : le délai doit se stabiliser sous le plafond.
    for (let tentative = 0; tentative < 10; tentative += 1) {
      dernierSocket().close();
      const avant = SocketFactice.ouverts.length;
      // 5 s de plafond, plus les 100 ms de dispersion.
      vi.advanceTimersByTime(5100);
      expect(SocketFactice.ouverts.length).toBe(avant + 1);
    }
  });

  it('annonce la perte quand ça dure, et le retour quand ça revient', () => {
    dernierSocket().ouvrir();
    expect(statuts).toContain('connecte');

    for (let tentative = 0; tentative < 7; tentative += 1) {
      dernierSocket().close();
      vi.advanceTimersByTime(5100);
    }
    expect(statuts).toContain('reconnexion');
    expect(statuts).toContain('perdu');

    dernierSocket().ouvrir();
    expect(statuts.at(-1)).toBe('connecte');
  });
});

describe('la dérive des horloges', () => {
  it('se corrige sur l’heure du serveur, pas sur celle du client', () => {
    const socket = dernierSocket();
    socket.ouvrir();

    const horodatageServeur = Date.now() + 30_000;
    socket.recevoir(message(etatInitial(0, PROVIDER), 1, 'mise-a-jour', horodatageServeur));

    expect(liaison.maintenantServeurMs()).toBeCloseTo(horodatageServeur, -2);
  });
});

describe('les intentions', () => {
  it('ne partent pas dans le vide quand la liaison est coupée', () => {
    const socket = dernierSocket();
    socket.close();
    liaison.envoyer({ type: 'ajuster-score', cote: 'domicile', delta: 1 });

    expect(socket.envoyes).toHaveLength(0);
  });
});
