/**
 * La mémoire du bot : un fichier JSON, écrit de façon atomique.
 *
 * Pas de base de données : une communauté Discord tient dans quelques milliers de lignes,
 * et une dépendance native comme SQLite rendrait l'installation pénible sur un poste.
 * L'écriture passe par un fichier temporaire puis un renommage, pour qu'une coupure de
 * courant ne laisse jamais un fichier à moitié écrit.
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const FICHIER = join(ICI, 'donnees.json');

const VIDE = {
  sanctions: {},   // identifiant du membre → [{ type, motif, par, date, duree }]
  notes: {},       // identifiant du membre → [{ texte, par, date }]
  arrivees: {},    // identifiant du membre → date de première arrivée
  xp: {},          // identifiant du membre → { points, niveau, dernier }
  programme: [],   // [{ quoi, quand, categorie, par }]
  vocaux: {},      // identifiant du salon → identifiant de son créateur
  plateau: null,   // { titre, ouvertLe, par }
};

export const donnees = existsSync(FICHIER)
  ? { ...VIDE, ...JSON.parse(readFileSync(FICHIER, 'utf8')) }
  : structuredClone(VIDE);

let enAttente = null;

/** Regroupe les écritures rapprochées : un salon animé ne doit pas marteler le disque. */
export function sauver() {
  if (enAttente) return;
  enAttente = setTimeout(() => {
    enAttente = null;
    const temporaire = FICHIER + '.tmp';
    writeFileSync(temporaire, JSON.stringify(donnees, null, 2));
    renameSync(temporaire, FICHIER);
  }, 400);
}

export function ajouter(ou, cle, valeur) {
  (donnees[ou][cle] ??= []).push(valeur);
  sauver();
}

/** « 10m », « 2h », « 7j » → millisecondes. Rend null si la forme n'est pas reconnue. */
export function duree(texte) {
  const m = String(texte ?? '').trim().match(/^(\d+)\s*(m|min|h|j|d)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unite = m[2].toLowerCase();
  const ms = unite.startsWith('m') ? 60_000 : unite === 'h' ? 3_600_000 : 86_400_000;
  return n * ms;
}

export const leJour = (d = new Date()) => `<t:${Math.floor(d.getTime() / 1000)}:f>`;
