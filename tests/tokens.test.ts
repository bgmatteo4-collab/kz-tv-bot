/**
 * Le garde-fou entre le document et le code.
 *
 * `docs/DESIGN_SYSTEM.md` fait autorité pour un humain, `outils/tokens-source.ts`
 * pour le build. Ce test interdit qu'ils divergent : changer une couleur dans
 * le document sans la régénérer casse la suite, et inversement.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COULEURS, ESPACEMENTS, RAYON, TAILLES_TEXTE } from '../outils/tokens-source.js';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DOCUMENT = readFileSync(join(RACINE, 'docs', 'DESIGN_SYSTEM.md'), 'utf8');

/** Relève les paires `--nom` … `#HEX` déclarées dans les tableaux du document. */
function couleursDuDocument(): Record<string, string> {
  const releve: Record<string, string> = {};
  const motif = /`--([a-z-]+)`[^|]*\|\s*`(#[0-9A-Fa-f]{6})`/g;
  for (const [, nom, hex] of DOCUMENT.matchAll(motif)) {
    if (nom && hex) releve[nom] = hex.toUpperCase();
  }
  return releve;
}

/** Relève une échelle écrite « `4 · 8 · 12` » après une amorce donnée. */
function echelleDuDocument(amorce: RegExp): number[] {
  const ligne = DOCUMENT.match(amorce);
  if (!ligne?.[1]) throw new Error(`échelle introuvable dans le document : ${amorce}`);
  return ligne[1].split('·').map((valeur) => Number(valeur.trim()));
}

describe('les tokens ne dérivent pas du design system', () => {
  it('déclare exactement les couleurs du document', () => {
    const document = couleursDuDocument();
    const source = Object.fromEntries(
      Object.entries(COULEURS).map(([nom, hex]) => [nom, hex.toUpperCase()]),
    );
    expect(source).toEqual(document);
  });

  it('reprend la grille d’espacement', () => {
    expect([...ESPACEMENTS]).toEqual(echelleDuDocument(/multiples de 4px\.\*\* `([^`]+)`/));
  });

  it('reprend l’échelle typographique', () => {
    expect([...TAILLES_TEXTE]).toEqual(echelleDuDocument(/base 1920×1080 :\n`([^`]+)`/));
  });

  it('reprend le rayon d’angle', () => {
    const rayon = DOCUMENT.match(/\*\*Rayon d'angle : (\d+)px\.\*\*/);
    expect(Number(rayon?.[1])).toBe(RAYON);
  });
});
