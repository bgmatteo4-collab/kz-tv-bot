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
import {
  CADRE,
  CANEVAS,
  COULEURS,
  ESPACEMENTS,
  RAYON,
  SCENE,
  TAILLES_TEXTE,
} from '../outils/tokens-source.js';

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

/** Relève les paires `--token` … `valeur` du tableau de géométrie. */
function geometrieDuDocument(): Record<string, number> {
  const releve: Record<string, number> = {};
  const motif = /`--((?:cadre|scene)-[a-z]+)`\s*\|\s*`(\d+)`/g;
  for (const [, nom, valeur] of DOCUMENT.matchAll(motif)) {
    if (nom && valeur) releve[nom] = Number(valeur);
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

  it('reprend la géométrie du cadre et de la scène', () => {
    expect(geometrieDuDocument()).toEqual({
      'cadre-haut': CADRE.haut,
      'cadre-colonne': CADRE.colonne,
      'cadre-bas': CADRE.bas,
      'scene-x': SCENE.x,
      'scene-y': SCENE.y,
      'scene-largeur': SCENE.largeur,
      'scene-hauteur': SCENE.hauteur,
    });
  });
});

describe('le cadre borde la scène', () => {
  // Sans ça, ajuster la scène laisserait une bande orpheline — un liseré de
  // fond nu à l'antenne, que personne ne verrait avant le direct.
  it('ne laisse aucune bande orpheline en largeur', () => {
    expect(CADRE.colonne + SCENE.largeur + CADRE.colonne).toBe(CANEVAS.largeur);
  });

  it('ne laisse aucune bande orpheline en hauteur', () => {
    expect(CADRE.haut + SCENE.hauteur + CADRE.bas).toBe(CANEVAS.hauteur);
  });

  it('garde la scène en 16:9', () => {
    expect(SCENE.largeur / SCENE.hauteur).toBeCloseTo(16 / 9, 5);
  });
});
