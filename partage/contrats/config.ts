/** Réglages partagés entre le serveur et les deux clients. */

/** Port du serveur. L'outil est local : tout tient sur la machine du streamer. */
export const PORT_SERVEUR = 4000;

export const CHEMIN_TEMPS_REEL = '/temps-reel';

/**
 * Adresse du WebSocket vue depuis un client.
 *
 * Le paramètre `?serveur=hote:port` permet de pointer ailleurs sans toucher au
 * code — utile le jour où la régie tournera sur une tablette du réseau local.
 */
export function adresseTempsReel(emplacement: Location): string {
  const parametre = new URLSearchParams(emplacement.search).get('serveur');
  const hote = parametre ?? `${emplacement.hostname}:${PORT_SERVEUR}`;
  const protocole = emplacement.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocole}//${hote}${CHEMIN_TEMPS_REEL}`;
}
