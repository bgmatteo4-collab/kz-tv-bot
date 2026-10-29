/**
 * Pose les cartes en tête de chaque salon, et les met à jour sans en empiler.
 *
 *     node poser-cartes.js
 *
 * La carte d'un salon est un message du bot, épinglé. On retient son identifiant dans
 * etat.json : au passage suivant on modifie le message existant au lieu d'en poster un
 * second. C'est ce qui permet de corriger un texte sans que le salon se remplisse de
 * versions successives.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, apiFichier } from './api.js';
import { categories } from './serveur.config.js';
import { decouper } from './cartes/gabarit.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const ETAT = join(ICI, 'etat.json');
const RENDU = join(ICI, 'cartes', 'rendu');

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const jaune = (t) => `\x1b[33m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

if (existsSync(join(ICI, '.env'))) {
  for (const ligne of readFileSync(join(ICI, '.env'), 'utf8').split('\n')) {
    const m = ligne.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const etat = JSON.parse(readFileSync(ETAT, 'utf8'));
etat.cartes ??= {};
const enregistrer = () => writeFileSync(ETAT, JSON.stringify(etat, null, 2));

/** Le texte alternatif : ce que lira quelqu'un dont les images ne s'affichent pas. */
function texteAlternatif(salon) {
  const c = salon.carte;
  const bouts = [`Carte du salon ${decouper(salon.nom).nom}.`, c.intro.replace(/\*\*/g, '')];
  for (const r of c.regles ?? []) bouts.push(`${r.titre} : ${r.texte}`);
  for (const [cmd, titre, suite] of c.commandes ?? []) bouts.push(`${cmd} — ${titre} ${suite ?? ''}`);
  for (const [quoi, vers] of c.ailleurs ?? []) bouts.push(`${quoi} : ${vers}`);
  if (c.note) bouts.push(c.note.replace(/\*\*/g, ''));
  return bouts.join(' ').slice(0, 1024);
}

let posees = 0; let majs = 0; let ratees = 0;
console.log('');

for (const categorie of categories) {
  for (const salon of categorie.salons) {
    if (!salon.carte) continue;
    const idSalon = etat.salons[salon.cle];
    const chemin = join(RENDU, salon.cle + '.png');
    const nom = decouper(salon.nom).nom;

    if (!idSalon) { console.log(jaune(`  ? ${nom} — salon inconnu, lance d'abord le déploiement`)); ratees += 1; continue; }
    if (!existsSync(chemin)) { console.log(jaune(`  ? ${nom} — image absente, lance cartes/generer.js`)); ratees += 1; continue; }

    const donnees = readFileSync(chemin);
    const charge = {
      attachments: [{ id: 0, filename: salon.cle + '.png', description: texteAlternatif(salon) }],
    };
    const fichier = { nom: salon.cle + '.png', donnees };
    const idMessage = etat.cartes[salon.cle];

    try {
      if (idMessage) {
        await apiFichier('PATCH', `/channels/${idSalon}/messages/${idMessage}`, charge, fichier, 'Carte Kayzx TV');
        console.log(gris(`  ~ ${nom}`)); majs += 1;
      } else {
        const msg = await apiFichier('POST', `/channels/${idSalon}/messages`, charge, fichier, 'Carte Kayzx TV');
        etat.cartes[salon.cle] = msg.id;
        await api('PUT', `/channels/${idSalon}/pins/${msg.id}`, undefined, 'Carte Kayzx TV')
          .catch(() => console.log(gris('      (épinglage refusé)')));
        console.log(vert(`  + ${nom}`)); posees += 1;
        enregistrer();
      }
    } catch (e) {
      // Un message disparu : on oublie son identifiant, le prochain passage le reposera.
      if (e.statut === 404 && idMessage) { delete etat.cartes[salon.cle]; enregistrer(); }
      console.log(jaune(`  ✕ ${nom} — ${e.message}`)); ratees += 1;
    }
  }
}
enregistrer();
console.log(`\n  ${posees} posée(s) · ${majs} mise(s) à jour · ${ratees} en échec\n`);
