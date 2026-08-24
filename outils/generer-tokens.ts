/**
 * Génère `partage/design/`. Ne jamais éditer les fichiers produits à la main :
 * une valeur visuelle écrite dans un composant devient dix exceptions en trois
 * semaines, et le produit perd sa cohérence.
 *
 *   npm run tokens
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CADRE,
  CANEVAS,
  COULEURS,
  COURBES,
  DUREES,
  ESPACEMENTS,
  LAME,
  OMBRE,
  OPACITE_SURFACE,
  RAYON,
  SCENE,
  TAILLES_TEXTE,
  ZONE_SURE,
} from './tokens-source.js';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SORTIE = join(RACINE, 'partage', 'design');

const AVERTISSEMENT = `/* Généré par « npm run tokens » depuis outils/tokens-source.ts.
   Ne pas éditer à la main : docs/DESIGN_SYSTEM.md fait autorité. */`;

function css(): string {
  const lignes: string[] = [AVERTISSEMENT, '', ':root {'];

  for (const [nom, valeur] of Object.entries(COULEURS)) {
    lignes.push(`  --${nom}: ${valeur};`);
  }
  lignes.push(`  --opacite-surface: ${OPACITE_SURFACE};`);
  lignes.push('');
  for (const valeur of ESPACEMENTS) lignes.push(`  --espace-${valeur}: ${valeur}px;`);
  lignes.push('');
  for (const valeur of TAILLES_TEXTE) lignes.push(`  --texte-${valeur}: ${valeur}px;`);
  lignes.push('');
  lignes.push(`  --cadre-haut: ${CADRE.haut}px;`);
  lignes.push(`  --cadre-colonne: ${CADRE.colonne}px;`);
  lignes.push(`  --cadre-bas: ${CADRE.bas}px;`);
  lignes.push(`  --scene-x: ${SCENE.x}px;`);
  lignes.push(`  --scene-y: ${SCENE.y}px;`);
  lignes.push(`  --scene-largeur: ${SCENE.largeur}px;`);
  lignes.push(`  --scene-hauteur: ${SCENE.hauteur}px;`);
  lignes.push('');
  lignes.push(`  --rayon: ${RAYON}px;`);
  lignes.push(`  --zone-sure: ${ZONE_SURE}px;`);
  lignes.push(`  --lame: ${LAME}px;`);
  lignes.push(`  --ombre: ${OMBRE};`);
  lignes.push('');
  for (const [nom, valeur] of Object.entries(DUREES)) lignes.push(`  --duree-${nom}: ${valeur}ms;`);
  lignes.push('');
  for (const [nom, valeur] of Object.entries(COURBES)) lignes.push(`  --courbe-${nom}: ${valeur};`);
  lignes.push('}');
  lignes.push('');
  return lignes.join('\n');
}

function ts(): string {
  const json = (valeur: unknown) => JSON.stringify(valeur, null, 2);
  return `${AVERTISSEMENT}

export const COULEURS = ${json(COULEURS)} as const;
export const ESPACEMENTS = ${json(ESPACEMENTS)} as const;
export const TAILLES_TEXTE = ${json(TAILLES_TEXTE)} as const;
export const RAYON = ${RAYON};
export const ZONE_SURE = ${ZONE_SURE};
export const LAME = ${LAME};
export const DUREES = ${json(DUREES)} as const;
export const COURBES = ${json(COURBES)} as const;
export const CANEVAS = ${json(CANEVAS)} as const;
export const SCENE = ${json(SCENE)} as const;
export const CADRE = ${json(CADRE)} as const;
`;
}

async function generer(): Promise<void> {
  await mkdir(SORTIE, { recursive: true });
  await writeFile(join(SORTIE, 'tokens.css'), css(), 'utf8');
  await writeFile(join(SORTIE, 'tokens.ts'), ts(), 'utf8');
  console.info(`[tokens] écrits dans ${SORTIE.replace(RACINE + '/', '')}`);
}

void generer().catch((erreur) => {
  console.error(`[tokens] échec : ${String(erreur)}`);
  process.exitCode = 1;
});
