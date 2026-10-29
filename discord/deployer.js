/**
 * Construit le serveur Discord à partir de serveur.config.js.
 *
 *     node deployer.js --verifier   → montre ce qui serait fait, ne touche à rien
 *     node deployer.js              → applique
 *
 * Le script est rejouable : il retrouve ce qu'il a déjà créé grâce à etat.json et met à
 * jour au lieu de dupliquer. Renommer un salon à la main ne le casse pas.
 */
import { Client, Events, GatewayIntentBits, ChannelType, PermissionFlagsBits as P } from 'discord.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roles, rolesNotification, rolesInteret, categories, serveur, resume } from './serveur.config.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const ETAT = join(ICI, 'etat.json');
const SIMULATION = process.argv.includes('--verifier');

const gras = (t) => `\x1b[1m${t}\x1b[0m`;
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

/* ---- Lecture du .env, sans dépendance ---- */
for (const ligne of (existsSync(join(ICI, '.env')) ? readFileSync(join(ICI, '.env'), 'utf8') : '').split('\n')) {
  const m = ligne.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const TOKEN = process.env.DISCORD_TOKEN;
const ID_SERVEUR = process.env.SERVEUR_ID;
if (!TOKEN || !ID_SERVEUR) {
  console.error(rouge('\n  Configuration absente.\n') +
    '  Lance d\'abord « CONFIGURER.command » (ou : node configurer.js).\n');
  process.exit(1);
}

const etat = existsSync(ETAT) ? JSON.parse(readFileSync(ETAT, 'utf8')) : { roles: {}, categories: {}, salons: {} };
const enregistrer = () => SIMULATION || writeFileSync(ETAT, JSON.stringify(etat, null, 2));

/** Les pouvoirs nommés dans la configuration → les permissions Discord. */
const POUVOIRS = {
  administrateur: [P.Administrator],
  moderer:        [P.KickMembers, P.BanMembers, P.ModerateMembers, P.ViewAuditLog],
  gererSalons:    [P.ManageChannels, P.ManageThreads],
  gererRoles:     [P.ManageRoles, P.ManageNicknames],
  gererMessages:  [P.ManageMessages, P.ManageThreads],
  mentionnerTous: [P.MentionEveryone],
};

const BASE_MEMBRE = [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.AddReactions,
  P.AttachFiles, P.EmbedLinks, P.UseExternalEmojis, P.Connect, P.Speak, P.Stream];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/** Les rôles qui composent le staff, dans l'ordre d'autorité. */
const CLES_STAFF = ['proprietaire', 'administration', 'moderation', 'regie'];

function typeDiscord(salon) {
  switch (salon.type) {
    case 'annonce':    return ChannelType.GuildAnnouncement;
    case 'conference': return ChannelType.GuildStageVoice;
    case 'vocal':
    case 'hub':        return ChannelType.GuildVoice;
    default:           return ChannelType.GuildText;   // texte et journal
  }
}

/** Les exceptions de permission d'une catégorie. */
function permissionsCategorie(categorie, idRole, idEveryone) {
  const regles = [];
  if (categorie.acces === 'tous') {
    regles.push({ id: idEveryone, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages, P.CreatePublicThreads] });
  } else if (categorie.acces === 'membre') {
    regles.push({ id: idEveryone, deny: [P.ViewChannel] });
    regles.push({ id: idRole('membre'), allow: BASE_MEMBRE });
  } else if (categorie.acces === 'staff') {
    regles.push({ id: idEveryone, deny: [P.ViewChannel] });
    for (const cle of CLES_STAFF) regles.push({ id: idRole(cle), allow: BASE_MEMBRE });
  }
  return regles.filter((r) => r.id);
}

/** Les exceptions propres à un salon, par-dessus celles de sa catégorie. */
function permissionsSalon(salon, categorie, idRole, idEveryone) {
  const regles = [];
  const cible = categorie.acces === 'tous' ? idEveryone : idRole('membre');

  if (salon.lectureSeule || salon.botSeul) {
    regles.push({ id: cible, deny: [P.SendMessages, P.CreatePublicThreads, P.SendMessagesInThreads],
      allow: [P.ViewChannel, P.ReadMessageHistory, P.AddReactions] });
  }
  if (salon.type === 'journal') {
    // Un journal qu'on peut éditer ne vaut rien : personne n'y écrit, pas même l'administration.
    for (const cle of CLES_STAFF) {
      const id = idRole(cle);
      if (id) regles.push({ id, deny: [P.SendMessages, P.ManageMessages, P.CreatePublicThreads],
        allow: [P.ViewChannel, P.ReadMessageHistory] });
    }
  }
  if (salon.type === 'conference') {
    // La communauté écoute et peut demander la parole ; seuls les intervenants parlent.
    regles.push({ id: cible, allow: [P.ViewChannel, P.Connect, P.RequestToSpeak], deny: [P.Speak] });
    const inter = idRole('intervenant');
    if (inter) regles.push({ id: inter, allow: [P.Speak] });
    const regie = idRole('regie');
    if (regie) regles.push({ id: regie, allow: [P.Speak, P.MuteMembers, P.MoveMembers] });
  }
  if (salon.type === 'hub') {
    // On s'y connecte une seconde, le bot déplace ailleurs : parler n'a pas de sens.
    regles.push({ id: cible, allow: [P.ViewChannel, P.Connect], deny: [P.Speak] });
  }
  if (salon.acces === 'staff' && categorie.acces !== 'staff') {
    regles.push({ id: cible, deny: [P.ViewChannel] });
    regles.push({ id: idEveryone, deny: [P.ViewChannel] });
    for (const cle of [...CLES_STAFF, 'intervenant']) {
      const id = idRole(cle);
      if (id) regles.push({ id, allow: BASE_MEMBRE });
    }
  }
  return regles.filter((r) => r.id);
}

/** Fusionne les exceptions qui visent le même rôle, sinon Discord ne garde que la dernière. */
function fusionner(regles) {
  const parId = new Map();
  for (const r of regles) {
    const dejaLa = parId.get(r.id) ?? { id: r.id, allow: [], deny: [] };
    dejaLa.allow = [...new Set([...dejaLa.allow, ...(r.allow ?? [])])];
    dejaLa.deny = [...new Set([...dejaLa.deny, ...(r.deny ?? [])])];
    // Une interdiction explicite l'emporte sur une autorisation héritée du même calcul.
    dejaLa.allow = dejaLa.allow.filter((p) => !dejaLa.deny.includes(p));
    parId.set(r.id, dejaLa);
  }
  return [...parId.values()];
}

client.once(Events.ClientReady, async () => {
  const guild = await client.guilds.fetch(ID_SERVEUR).catch(() => null);
  if (!guild) {
    console.error(rouge(`\n  Serveur introuvable (${ID_SERVEUR}).\n  Le bot y est-il bien invité ?\n`));
    process.exit(1);
  }
  await guild.roles.fetch();
  await guild.channels.fetch();

  const r = resume();
  console.log(`\n${gras('Serveur : ' + guild.name)}`);
  console.log(gris(`  ${r.roles} rôles · ${r.categories} catégories · ${r.salons} salons`));
  if (SIMULATION) console.log(gras('\n  MODE VÉRIFICATION — rien ne sera modifié.\n'));
  else console.log('');

  /* ---------- 1. Les rôles ---------- */
  const idEveryone = guild.roles.everyone.id;
  const idsRoles = {};
  const idRole = (cle) => idsRoles[cle];

  const tousLesRoles = [
    ...roles,
    ...rolesNotification.map((x) => ({ ...x, mentionnable: true, affiche: false, pouvoirs: [] })),
    ...rolesInteret.map((x) => ({ ...x, mentionnable: false, affiche: false, pouvoirs: [] })),
  ];

  console.log(gras('Rôles'));
  for (const def of tousLesRoles) {
    const permissions = (def.pouvoirs ?? []).flatMap((p) => POUVOIRS[p] ?? []);
    let role = etat.roles[def.cle] ? guild.roles.cache.get(etat.roles[def.cle]) : null;
    if (!role) role = guild.roles.cache.find((x) => x.name === def.nom);

    if (role) {
      idsRoles[def.cle] = role.id;
      etat.roles[def.cle] = role.id;
      console.log(`  ${gris('=')} ${def.nom}`);
      continue;
    }
    console.log(`  ${vert('+')} ${def.nom}`);
    if (SIMULATION) { idsRoles[def.cle] = 'simulation-' + def.cle; continue; }
    const cree = await guild.roles.create({
      name: def.nom,
      color: def.couleur ?? null,
      hoist: def.affiche ?? false,
      mentionable: def.mentionnable ?? false,
      permissions,
      reason: 'Déploiement Kayzx TV',
    });
    idsRoles[def.cle] = cree.id;
    etat.roles[def.cle] = cree.id;
  }
  enregistrer();

  /* ---------- 2. Les catégories et les salons ---------- */
  for (const categorie of categories) {
    console.log(gras('\n' + categorie.nom));
    let cat = etat.categories[categorie.cle] ? guild.channels.cache.get(etat.categories[categorie.cle]) : null;
    if (!cat) cat = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === categorie.nom);

    const permsCat = fusionner(permissionsCategorie(categorie, idRole, idEveryone));
    if (cat) {
      console.log(`  ${gris('=')} catégorie`);
      if (!SIMULATION) await cat.permissionOverwrites.set(permsCat, 'Déploiement Kayzx TV');
    } else {
      console.log(`  ${vert('+')} catégorie`);
      if (!SIMULATION) {
        cat = await guild.channels.create({
          name: categorie.nom, type: ChannelType.GuildCategory,
          permissionOverwrites: permsCat, reason: 'Déploiement Kayzx TV',
        });
      }
    }
    if (cat) etat.categories[categorie.cle] = cat.id;

    for (const salon of categorie.salons) {
      const perms = fusionner([
        ...permissionsCategorie(categorie, idRole, idEveryone),
        ...permissionsSalon(salon, categorie, idRole, idEveryone),
      ]);
      let ch = etat.salons[salon.cle] ? guild.channels.cache.get(etat.salons[salon.cle]) : null;
      if (!ch) ch = guild.channels.cache.find((c) => c.parentId === cat?.id && c.name === salon.nom.toLowerCase());

      if (ch) {
        console.log(`    ${gris('=')} ${salon.nom}`);
        if (!SIMULATION) {
          await ch.permissionOverwrites.set(perms, 'Déploiement Kayzx TV');
          if (salon.sujet && 'setTopic' in ch) await ch.setTopic(salon.sujet).catch(() => {});
        }
      } else {
        console.log(`    ${vert('+')} ${salon.nom} ${gris('(' + salon.type + ')')}`);
        if (!SIMULATION) {
          ch = await guild.channels.create({
            name: salon.nom, type: typeDiscord(salon), parent: cat.id,
            topic: typeDiscord(salon) === ChannelType.GuildText ? salon.sujet : undefined,
            permissionOverwrites: perms, reason: 'Déploiement Kayzx TV',
          });
        }
      }
      if (ch) etat.salons[salon.cle] = ch.id;
    }
    enregistrer();
  }

  /* ---------- 3. Les réglages du serveur ---------- */
  if (!SIMULATION) {
    const idRegles = etat.salons[serveur.salonRegles];
    const idSysteme = etat.salons[serveur.salonSysteme];
    await guild.edit({
      rulesChannel: idRegles ?? undefined,
      systemChannel: idSysteme ?? undefined,
      reason: 'Déploiement Kayzx TV',
    }).catch((e) => console.log(gris('  (réglages du serveur ignorés : ' + e.message + ')')));
  }

  console.log(`\n${SIMULATION ? gras('Vérification terminée.') : vert(gras('Serveur déployé.'))}`);
  if (SIMULATION) console.log(gris('  Relance sans --verifier pour appliquer.\n'));
  else console.log(gris('  Les cartes de salon seront posées à l\'étape suivante.\n'));
  client.destroy();
});

client.login(TOKEN).catch((e) => {
  console.error(rouge('\n  Connexion refusée : ' + e.message));
  console.error('  Le token est peut-être invalide. Relance « CONFIGURER.command ».\n');
  process.exit(1);
});
