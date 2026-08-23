/**
 * La diffusion temps réel.
 *
 * Une seule règle gouverne ce fichier : le serveur ne diffuse jamais de
 * différentiel. Chaque message porte l'état complet et un numéro de séquence.
 * Un client qui arrive, qui revient ou qui a raté un message se réaligne avec
 * le message suivant, sans rien avoir à demander et sans rien à réconcilier.
 */
import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';
import type { EtatMatch } from '../../partage/contrats/etat.js';
import type { MessageClient, MessageEtat, RaisonEtat } from '../../partage/contrats/messages.js';
import type { Intention } from '../../partage/contrats/intentions.js';
import type { Magasin } from '../etat/magasin.js';

/**
 * Ce qui traite une intention reçue de la régie. Injecté plutôt que codé en
 * dur : le serveur intercepte certaines intentions — le changement de
 * provider a un effet au-delà de l'état — sans que cette couche ait à le
 * savoir.
 */
export type TraiterIntention = (intention: Intention) => void;

/** Fréquence des battements. OBS ferme sans prévenir : il faut le détecter. */
const PERIODE_BATTEMENT_MS = 15_000;

function encoder(etat: EtatMatch, sequence: number, raison: RaisonEtat, maintenantMs: number): string {
  const message: MessageEtat = {
    type: 'etat',
    sequence,
    horodatageServeur: maintenantMs,
    raison,
    etat,
  };
  return JSON.stringify(message);
}

export function brancherDiffusion(
  serveurHttp: Server,
  magasin: Magasin,
  traiterIntention: TraiterIntention,
): WebSocketServer {
  const wss = new WebSocketServer({ server: serveurHttp, path: '/temps-reel' });
  const vivants = new WeakSet<WebSocket>();

  wss.on('connection', (client) => {
    vivants.add(client);
    client.on('pong', () => vivants.add(client));

    // Premier message : l'état entier, marqué comme une synchronisation pour
    // que l'overlay se réaligne sans rejouer ses animations d'entrée.
    client.send(encoder(magasin.etat, magasin.sequence, 'synchronisation', magasin.maintenantMs()));

    client.on('message', (brut) => {
      let message: MessageClient;
      try {
        message = JSON.parse(brut.toString()) as MessageClient;
      } catch {
        console.warn('[temps-réel] message illisible, ignoré');
        return;
      }
      if (message.type !== 'intention') return;
      traiterIntention(message.intention);
    });

    client.on('error', (erreur) => {
      console.warn(`[temps-réel] client en erreur : ${String(erreur)}`);
    });
  });

  magasin.s_abonner((etat, sequence) => {
    const charge = encoder(etat, sequence, 'mise-a-jour', magasin.maintenantMs());
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(charge);
    }
  });

  const battement = setInterval(() => {
    for (const client of wss.clients) {
      if (!vivants.has(client)) {
        client.terminate();
        continue;
      }
      vivants.delete(client);
      client.ping();
    }
  }, PERIODE_BATTEMENT_MS);

  wss.on('close', () => clearInterval(battement));
  return wss;
}
