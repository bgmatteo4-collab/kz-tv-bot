/**
 * Déclare les commandes auprès de Discord.
 *
 *     node bot/enregistrer-commandes.js
 *
 * À relancer à chaque fois qu'une commande change de nom, d'options ou de description.
 * L'envoi remplace la liste entière : une commande retirée d'ici disparaît du serveur.
 * On les déclare sur le serveur et non globalement, parce que c'est immédiat là où une
 * déclaration globale met jusqu'à une heure à se propager.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from '../api.js';
import { serveur } from '../serveur.config.js';
import { commandes } from './commandes.js';

const ICI = dirname(fileURLToPath(import.meta.url));
if (existsSync(join(ICI, '..', '.env'))) {
  for (const l of readFileSync(join(ICI, '..', '.env'), 'utf8').split('\n')) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const moi = await api('GET', '/users/@me');
const application = process.env.APPLICATION_ID || serveur.application || moi.id;
const G = process.env.SERVEUR_ID || serveur.id;

const avant = await api('GET', `/applications/${application}/guilds/${G}/commands`).catch(() => []);
const resultat = await api('PUT', `/applications/${application}/guilds/${G}/commands`, commandes);

const noms = (l) => new Set(l.map((c) => c.name));
const ajoutees = [...noms(resultat)].filter((n) => !noms(avant).has(n));
const retirees = [...noms(avant)].filter((n) => !noms(resultat).has(n));

console.log(`\n  ${resultat.length} commandes déclarées sur « ${moi.username} ».`);
if (ajoutees.length) console.log('  nouvelles : ' + ajoutees.map((n) => '/' + n).join(' '));
if (retirees.length) console.log('  retirées  : ' + retirees.map((n) => '/' + n).join(' '));
console.log('');
