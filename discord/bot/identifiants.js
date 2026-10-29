/**
 * Le pont entre les clés de la configuration et les identifiants réels du serveur.
 * etat.json est écrit par le déploiement : le bot s'en sert pour savoir où écrire.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const CHEMIN = join(ICI, '..', 'etat.json');

if (!existsSync(CHEMIN)) {
  console.error('\n  etat.json est introuvable : lance d\'abord le déploiement du serveur.\n');
  process.exit(1);
}

const etat = JSON.parse(readFileSync(CHEMIN, 'utf8'));

export const salonDe = (cle) => etat.salons[cle];
export const roleDe = (cle) => etat.roles[cle];
export const carteDe = (cle) => etat.cartes?.[cle];
export const etatComplet = etat;
