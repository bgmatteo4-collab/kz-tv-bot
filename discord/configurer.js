/**
 * L'assistant de configuration.
 *
 * Il pose deux questions, vérifie les réponses auprès de Discord, et écrit le fichier .env
 * à côté de lui. Le token ne quitte jamais la machine : il n'est ni envoyé ailleurs, ni
 * enregistré dans le dépôt (.env est ignoré par git).
 *
 *     node configurer.js
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { serveur } from './serveur.config.js';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const FICHIER = join(ICI, '.env');

const gras = (t) => `\x1b[1m${t}\x1b[0m`;
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const jaune = (t) => `\x1b[33m${t}\x1b[0m`;

/** Demande le token à Discord : c'est la seule façon de savoir s'il est bon. */
async function verifierToken(token) {
  const r = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bot ${token}` },
  });
  if (r.status === 401) return { ok: false, raison: 'Discord refuse ce token.' };
  if (!r.ok) return { ok: false, raison: `Discord a répondu ${r.status}.` };
  const bot = await r.json();
  return { ok: true, nom: `${bot.username}`, id: bot.id };
}

/** Vérifie que le bot est bien invité sur ce serveur, et qu'il y est administrateur. */
async function verifierServeur(token, idServeur) {
  const r = await fetch('https://discord.com/api/v10/guilds/' + idServeur, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (r.status === 404 || r.status === 403) {
    return { ok: false, raison: "Le bot n'est pas sur ce serveur, ou l'identifiant est faux." };
  }
  if (!r.ok) return { ok: false, raison: `Discord a répondu ${r.status}.` };
  const g = await r.json();
  return { ok: true, nom: g.name };
}

const lire = createInterface({ input: stdin, output: stdout });

async function demander(question, { secret = false, valider } = {}) {
  for (;;) {
    const reponse = (await lire.question(question)).trim();
    if (!reponse) { console.log(rouge('  Rien saisi. Recommence.\n')); continue; }
    if (secret) stdout.write('\x1b[1A\x1b[2K'); // efface la ligne du token de l'écran
    if (!valider) return reponse;
    process.stdout.write('  Vérification auprès de Discord… ');
    const v = await valider(reponse);
    if (v.ok) { console.log(vert('ok')); return { valeur: reponse, ...v }; }
    console.log(rouge('échec'));
    console.log(rouge('  ' + v.raison) + '\n');
  }
}

console.log(`
${gras('Configuration du bot Kayzx TV')}

  Une seule information à donner. Elle reste sur cet ordinateur.
`);

if (existsSync(FICHIER)) {
  const dejaLa = readFileSync(FICHIER, 'utf8').includes('DISCORD_TOKEN=');
  if (dejaLa) {
    const r = (await lire.question(jaune('  Une configuration existe déjà. La remplacer ? (o/N) '))).trim().toLowerCase();
    if (r !== 'o' && r !== 'oui') { console.log('\n  Rien n\'a été changé.\n'); lire.close(); process.exit(0); }
    console.log('');
  }
}

console.log(gras('  Une seule chose à donner : le token du bot.'));
console.log('     Portail Discord → ton application → onglet Bot → Reset Token.');
console.log('     Il ne s\'affiche qu\'une fois : copie-le avant de fermer la page.\n');
const token = await demander('  Colle le token ici : ', { secret: true, valider: verifierToken });
console.log(`  ${vert('✓')} Bot reconnu : ${gras(token.nom)}\n`);

const serveurVerifie = await (async () => {
  process.stdout.write(`  Vérification du serveur ${gras(serveur.nom)}… `);
  const v = await verifierServeur(token.valeur, serveur.id);
  if (v.ok) { console.log(vert('ok')); return v; }
  console.log(rouge('échec'));
  console.log(rouge('  ' + v.raison));
  console.log('  Le bot a-t-il bien été invité sur le serveur ?\n');
  lire.close();
  process.exit(1);
})();
console.log(`  ${vert('✓')} Serveur trouvé : ${gras(serveurVerifie.nom)}\n`);

console.log(gras('  Twitch') + ' (facultatif — pour annoncer tes lives)');
console.log('     dev.twitch.tv/console/apps → Register Your Application.');
console.log('     Laisse vide et appuie sur Entrée pour passer.\n');
const twitchId = (await lire.question('  Client ID Twitch : ')).trim();
const twitchSecret = twitchId ? (await lire.question('  Client Secret Twitch : ')).trim() : '';
const twitchChaine = twitchId ? (await lire.question('  Nom de ta chaîne Twitch : ')).trim() : '';

writeFileSync(FICHIER, [
  '# Écrit par configurer.js — ne jamais partager ce fichier, ni le mettre sur GitHub.',
  `DISCORD_TOKEN=${token.valeur}`,
  `SERVEUR_ID=${serveur.id}`,
  twitchId ? `TWITCH_CLIENT_ID=${twitchId}` : '',
  twitchSecret ? `TWITCH_CLIENT_SECRET=${twitchSecret}` : '',
  twitchChaine ? `TWITCH_CHAINE=${twitchChaine}` : '',
  '',
].filter(Boolean).join('\n'), { mode: 0o600 });

console.log(`
  ${vert('Tout est enregistré.')}

  Tu peux maintenant lancer le déploiement du serveur.
  ${gras('Double-clique sur « DÉPLOYER LE SERVEUR.command ».')}
`);
lire.close();
