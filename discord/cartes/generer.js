/**
 * Fabrique les 29 cartes de salon en PNG, à partir de serveur.config.js.
 *
 *     node generer.js
 *
 * Le rendu passe par un navigateur sans interface : on garde les vraies polices, le motif
 * d'encre et les dégradés. Les images sont écrites dans rendu/ et versionnées, pour que la
 * machine qui les publie n'ait pas besoin de savoir dessiner.
 */
/* Playwright peut être installé dans le projet, ou fourni par la machine. On essaie les
   deux plutôt que d'imposer une installation : le rendu des cartes n'est pas quotidien. */
const { chromium } = await (async () => {
  const pistes = [process.env.PLAYWRIGHT_MODULE, 'playwright',
    '/opt/node-tools/node_modules/playwright/index.js'].filter(Boolean);
  for (const piste of pistes) {
    try {
      // Playwright est en CommonJS : selon la piste, l'export arrive à la racine ou sous .default.
      const m = await import(piste);
      if (m?.chromium) return m;
      if (m?.default?.chromium) return m.default;
    } catch { /* piste suivante */ }
  }
  console.error('\n  Playwright est introuvable.\n  Installe-le avec : npm install playwright\n');
  process.exit(1);
})();
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories } from '../serveur.config.js';
import { pageComplete, decouper } from './gabarit.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const RENDU = join(ICI, 'rendu');

rmSync(RENDU, { recursive: true, force: true });
mkdirSync(RENDU, { recursive: true });

const page = join(ICI, 'cartes.html');
writeFileSync(page, pageComplete(categories));

const aFaire = categories.flatMap((c) => c.salons.filter((s) => s.carte).map((s) => ({ s, c })));
console.log(`\n  ${aFaire.length} cartes à rendre.\n`);

const navigateur = await chromium.launch({ args: ['--no-sandbox'] });
const onglet = await navigateur.newPage({ viewport: { width: 1800, height: 1100 } });
await onglet.goto('file://' + page);
await onglet.evaluate(() => document.fonts.ready);
await onglet.waitForTimeout(800);

let debordent = 0;
for (const { s, c } of aFaire) {
  const selecteur = '#carte-' + s.cle;

  // Une carte qui déborde est illisible : on le signale plutôt que de livrer du texte coupé.
  const trop = await onglet.locator(selecteur + ' .corps').evaluate((el) => {
    const g = el.querySelector('.gauche');
    const d = el.querySelector('.droite');
    return Math.max(g.scrollHeight - g.clientHeight, d.scrollHeight - d.clientHeight);
  });
  if (trop > 2) { console.log(`  ⚠ ${decouper(s.nom).nom} déborde de ${trop}px`); debordent += 1; }

  await onglet.locator(selecteur).screenshot({ path: join(RENDU, s.cle + '.png'), omitBackground: true });
  console.log(`  ✓ ${decouper(s.nom).nom}`);
}
await navigateur.close();

console.log(debordent
  ? `\n  ${debordent} carte(s) à raccourcir dans serveur.config.js.\n`
  : '\n  Toutes les cartes tiennent dans leur cadre.\n');
