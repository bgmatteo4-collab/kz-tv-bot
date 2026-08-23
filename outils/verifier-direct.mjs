/**
 * Vérification en conditions réelles des cinq critères de sortie du jalon 1.
 *
 * Ce script ne vérifie pas la théorie : il lance le vrai serveur, ouvre les
 * deux vraies pages dans un vrai Chromium — celui qu'embarque OBS — clique,
 * tue le serveur, le relance, recharge l'overlay, et regarde ce qui se passe.
 *
 *   node outils/verifier-direct.mjs
 */
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

/**
 * On vise le Chromium complet, pas le shell headless : c'est le moteur
 * qu'embarque OBS, et le fond transparent comme les performances s'y
 * comportent différemment.
 */
const CHROMIUM_COMPLET = '/opt/pw-browsers/chromium';

const PORT = 4000;
const BASE = `http://localhost:${PORT}`;
const CAPTURES = 'captures';
const ETAT = 'donnees/verification.json';

const resultats = [];
let serveur = null;

function patienter(ms) {
  return new Promise((resoudre) => setTimeout(resoudre, ms));
}

async function refuserSiPortOccupe() {
  try {
    const reponse = await fetch(`${BASE}/regie/`, { signal: AbortSignal.timeout(1500) });
    if (reponse.ok) {
      throw new Error(
        `un serveur écoute déjà sur le port ${PORT}. Arrête-le avant de vérifier, ` +
          `sinon les mesures portent sur lui et pas sur ce qu’on vient d’écrire.`,
      );
    }
  } catch (erreur) {
    if (erreur instanceof Error && erreur.message.includes('écoute déjà')) throw erreur;
  }
}

async function lancerServeur() {
  serveur = spawn('npx', ['tsx', 'serveur/index.ts'], {
    env: { ...process.env, TOUCHLINE_ETAT: ETAT },
    stdio: ['ignore', 'pipe', 'pipe'],
    // Groupe de processus à part : npx enchaîne un shell puis deux node, et
    // tuer le seul wrapper laisserait le vrai serveur en vie — on croirait
    // alors avoir vérifié une coupure qui n'a pas eu lieu.
    detached: true,
  });
  serveur.stdout.on('data', () => {});
  serveur.stderr.on('data', (donnees) => process.stderr.write(`[serveur] ${donnees}`));

  for (let essai = 0; essai < 80; essai += 1) {
    try {
      const reponse = await fetch(`${BASE}/regie/`);
      if (reponse.ok) return;
    } catch {
      /* pas encore prêt */
    }
    await patienter(125);
  }
  throw new Error('le serveur n’a pas démarré');
}

async function tuerServeur() {
  if (!serveur) return;
  const mort = new Promise((resoudre) => serveur.on('exit', resoudre));
  try {
    process.kill(-serveur.pid, 'SIGKILL'); // tout le groupe, pas le seul wrapper
  } catch {
    serveur.kill('SIGKILL');
  }
  await mort;
  serveur = null;

  // On ne continue pas tant que le port n'est pas réellement rendu.
  for (let essai = 0; essai < 40; essai += 1) {
    try {
      await fetch(`${BASE}/regie/`, { signal: AbortSignal.timeout(300) });
    } catch {
      return;
    }
    await patienter(100);
  }
  throw new Error('le serveur refuse de mourir');
}

function noter(critere, reussi, detail) {
  resultats.push({ critere, reussi, detail });
  console.log(`${reussi ? '  OK  ' : ' ÉCHEC'}  ${critere}\n         ${detail}`);
}

async function main() {
  await rm(CAPTURES, { recursive: true, force: true });
  await mkdir(CAPTURES, { recursive: true });
  await rm(ETAT, { force: true });

  await refuserSiPortOccupe();
  await lancerServeur();

  const navigateur = await chromium.launch({
    ...(existsSync(CHROMIUM_COMPLET)
      ? { executablePath: CHROMIUM_COMPLET }
      : { channel: 'chromium' }),
    // Sans ça, Chromium bride la page qui n'est pas au premier plan. OBS ne
    // fait jamais ça : sa source navigateur rend en continu. Mesurer avec le
    // bridage donnerait une latence qui n'existe pas chez le streamer.
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });
  const contexte = await navigateur.newContext({ viewport: { width: 1920, height: 1080 } });
  const regie = await contexte.newPage();
  const overlay = await contexte.newPage();

  await regie.goto(`${BASE}/regie/`);
  await overlay.goto(`${BASE}/overlay/`);
  await regie.waitForSelector('button:has-text("Afficher le bandeau")');
  // On ne chronomètre rien tant que l'overlay n'a pas reçu son premier état :
  // sinon on mesurerait l'établissement de la liaison, pas le produit.
  await overlay.waitForSelector('#canevas[data-synchronise="oui"]', { timeout: 10000 });
  await patienter(300);

  // Un match crédible, saisi comme le ferait le streamer.
  await regie.getByRole('textbox').first().fill('LIGUE 1 · J14');
  const champs = regie.locator('input[type="text"], input:not([type])');
  await champs.nth(1).fill('Paris');
  await champs.nth(2).fill('PAR');
  await champs.nth(3).fill('Marseille');
  await champs.nth(4).fill('MAR');
  await regie.getByRole('button', { name: 'Coup d’envoi' }).click();
  await patienter(200);

  // ---- Critère 1 : une action de régie se voit en moins de 100 ms ---------
  // La latence se mesure des deux côtés dans les pages elles-mêmes. Passer par
  // le chronomètre du script mesurerait aussi l'outil de test : son contrôle
  // d'actionnabilité ajoute à lui seul près de deux secondes.
  //
  // On chronomètre l'arrivée de la donnée — le module attaché au DOM — et non
  // la fin de son animation d'entrée, qui dure 340 ms par conception.
  // Une seule mesure ne dit rien : en direct, c'est le pire cas qui se voit.
  // On affiche et masque le bandeau plusieurs fois et on garde le maximum.
  const latences = [];
  for (let essai = 0; essai < 5; essai += 1) {
    const attendu = overlay.evaluate(
      () =>
        new Promise((resoudre) => {
          const observateur = new MutationObserver(() => {
            if (document.querySelector('[data-module="bandeau-score"]')) {
              observateur.disconnect();
              resoudre(Date.now());
            }
          });
          observateur.observe(document.body, { childList: true, subtree: true });
        }),
    );
    const clic = await regie.evaluate(() => {
      const bouton = [...document.querySelectorAll('button')].find((candidat) =>
        candidat.textContent?.includes('Afficher le bandeau'),
      );
      bouton?.click();
      return Date.now();
    });
    latences.push((await attendu) - clic);

    if (essai < 4) {
      await regie.evaluate(() => {
        const bouton = [...document.querySelectorAll('button')].find((candidat) =>
          candidat.textContent?.includes('Masquer le bandeau'),
        );
        bouton?.click();
      });
      await overlay.waitForSelector('[data-module="bandeau-score"]', {
        state: 'detached',
        timeout: 5000,
      });
    }
  }
  const latenceAffichage = Math.max(...latences);

  await overlay.waitForSelector('[data-module="bandeau-score"]', { timeout: 5000 });

  const debutBut = await regie.evaluate(() => {
    const bouton = [...document.querySelectorAll('button')].find((candidat) =>
      candidat.textContent?.trim() === 'Marquer',
    );
    bouton?.click();
    return Date.now();
  });
  await overlay.waitForFunction(
    () => document.querySelector('.scores')?.textContent?.includes('1') ?? false,
    { timeout: 5000 },
  );
  const latenceBut = Date.now() - debutBut;

  noter(
    '1. Une action de régie se voit sans rechargement',
    latenceAffichage < 100 && latenceBut < 100,
    `bandeau affiché : pire cas ${latenceAffichage} ms sur 5 essais (${latences.join(', ')}) ; ` +
      `but répercuté en ${latenceBut} ms — seuil 100 ms`,
  );

  await patienter(700);
  await overlay.screenshot({ path: `${CAPTURES}/overlay-fond-transparent.png`, omitBackground: true });

  // Lisibilité : le module doit tenir sur tout ce que produit un match.
  for (const [nom, fond] of Object.entries({
    pelouse: '#2E7D32',
    'maillot-blanc': '#F4F4F2',
    'ralenti-sombre': '#0B0B0C',
    'flash-stade': '#FFF6D8',
  })) {
    await overlay.evaluate((couleur) => {
      let banc = document.querySelector('#banc-essai');
      if (!banc) {
        banc = document.createElement('div');
        banc.id = 'banc-essai';
        banc.style.cssText = 'position:fixed;inset:0;z-index:-1';
        document.body.prepend(banc);
      }
      banc.style.background = couleur;
    }, fond);
    await overlay.screenshot({ path: `${CAPTURES}/lisibilite-${nom}.png`, clip: { x: 0, y: 0, width: 900, height: 200 } });
  }
  await overlay.evaluate(() => document.querySelector('#banc-essai')?.remove());

  // Le fond est-il réellement transparent ? OBS compose par-dessus la vidéo.
  const fondBody = await overlay.evaluate(() => getComputedStyle(document.body).backgroundColor);
  noter(
    'Fond réellement transparent',
    fondBody === 'rgba(0, 0, 0, 0)',
    `background-color du body : ${fondBody}`,
  );

  // ---- Critère 5 : une correction manuelle n’est pas écrasée -------------
  await regie.getByRole('button', { name: 'Démonstration' }).click();
  await patienter(1200);
  const scoreAvantCorrection = await regie.locator('output.valeur').first().textContent();
  await regie.getByRole('button', { name: 'Retirer' }).first().click();
  // La correction doit d'abord avoir fait l'aller-retour : lire le DOM trop
  // tôt mesurerait la vitesse du test, pas le comportement du produit.
  await regie.waitForFunction(
    (avant) => document.querySelector('output.valeur')?.textContent !== avant,
    scoreAvantCorrection,
    { timeout: 5000 },
  );
  const scoreCorrige = await regie.locator('output.valeur').first().textContent();
  await patienter(6000); // le provider republie plusieurs fois entre-temps
  const scoreApres = await regie.locator('output.valeur').first().textContent();
  noter(
    '5. Un score corrigé à la main reste corrigé',
    scoreCorrige === scoreApres,
    `corrigé à ${scoreCorrige}, toujours à ${scoreApres} après six secondes de provider actif`,
  );

  await regie.getByRole('button', { name: 'Saisie manuelle' }).click();
  await patienter(300);

  // ---- Critère 2 : serveur coupé, l’overlay garde son affichage ----------
  // On compare les données — le score — et non tout le bandeau : le chrono
  // continue d'avancer sur sa dernière référence, et c'est voulu. Un chrono
  // figé à l'antenne se voit tout de suite ; une donnée de dix secondes, non.
  const scoreAvantCoupure = await overlay.textContent('.scores');
  const chronoAvantCoupure = await overlay.textContent('.horloge');
  await tuerServeur();
  await patienter(2500);
  const scoreApresCoupure = await overlay.textContent('.scores');
  const chronoApresCoupure = await overlay.textContent('.horloge');
  const bandeauPresent = await overlay.locator('[data-module="bandeau-score"]').count();
  await overlay.screenshot({ path: `${CAPTURES}/serveur-coupe-overlay.png`, omitBackground: true });

  const messageRegie = await regie.textContent('header .libelle');
  await regie.screenshot({ path: `${CAPTURES}/serveur-coupe-regie.png` });

  noter(
    '2. Serveur coupé : l’overlay garde son affichage, la régie signale',
    bandeauPresent === 1 && scoreAvantCoupure === scoreApresCoupure && messageRegie !== 'Connecté',
    `bandeau toujours à l’antenne, score ${scoreApresCoupure?.trim()} conservé, ` +
      `chrono toujours vivant (${chronoAvantCoupure?.trim()} → ${chronoApresCoupure?.trim()}) ; ` +
      `la régie annonce « ${messageRegie} »`,
  );

  // ---- Critère 3 : serveur redémarré, les deux se réalignent seuls -------
  await lancerServeur();
  await regie.waitForFunction(
    () => document.querySelector('header .libelle')?.textContent === 'Connecté',
    { timeout: 15000 },
  );
  const bandeauApresRetour = await overlay.locator('[data-module="bandeau-score"]').count();
  const messageRetour = await regie.textContent('header .libelle');
  noter(
    '3. Serveur redémarré : les deux clients se réalignent seuls',
    bandeauApresRetour === 1 && messageRetour === 'Connecté',
    `aucune intervention ; la régie repasse à « ${messageRetour} », l’overlay a gardé son bandeau`,
  );

  // ---- Critère 4 : overlay rechargé en plein match -----------------------
  const scoreAvantRechargement = await overlay.textContent('.scores');
  await overlay.reload();
  await overlay.waitForSelector('[data-module="bandeau-score"]', { timeout: 5000 });
  const scoreApresRechargement = await overlay.textContent('.scores');
  // Une resynchronisation pose le module sans rejouer son entrée : il est
  // déjà visible et à sa place au premier rendu.
  const poseImmediate = await overlay.evaluate(() => {
    const module = document.querySelector('[data-module="bandeau-score"]');
    return module?.getAttribute('data-pose') === 'oui';
  });
  await overlay.screenshot({ path: `${CAPTURES}/overlay-apres-rechargement.png`, omitBackground: true });

  noter(
    '4. Overlay rechargé en plein match : il revient dans le bon état',
    scoreAvantRechargement === scoreApresRechargement && poseImmediate,
    `score ${scoreApresRechargement?.trim()} retrouvé, module posé sans rejouer l’entrée`,
  );

  await regie.screenshot({ path: `${CAPTURES}/regie.png` });

  await navigateur.close();
  await tuerServeur();
  await rm(ETAT, { force: true });

  const echecs = resultats.filter((resultat) => !resultat.reussi);
  console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passées`);
  process.exitCode = echecs.length === 0 ? 0 : 1;
}

main().catch(async (erreur) => {
  console.error(erreur);
  await tuerServeur();
  process.exitCode = 1;
});
